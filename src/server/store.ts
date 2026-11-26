/**
 * Хранилище динамических кодов.
 *
 * Два адаптера с одним интерфейсом:
 * - `FileStore` — локальная разработка и проверки: один JSON-файл, без сети;
 * - `RedisStore` — прод: Upstash Redis по REST, бесплатного тарифа хватает
 *   на первые сотни кодов.
 *
 * Прод-адаптер говорит с Upstash по REST напрямую: команды уходят одним
 * POST, без клиентской библиотеки в горячем пути.
 */
import { redisConfig } from "../../lib/redis";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Code, DayStats } from "./schema";

export type RateLimit = { ok: boolean; remaining: number };

export interface Store {
  /** Какое хранилище подключено: видно в /api/health и в логах. */
  readonly kind: "file" | "redis";
  getCode(slug: string): Promise<Code | null>;
  putCode(code: Code): Promise<void>;
  deleteCode(slug: string): Promise<void>;
  /** Слаги, созданные этим владельцем (по хешу ключа). */
  ownedSlugs(keyHash: string): Promise<string[]>;
  addOwned(keyHash: string, slug: string): Promise<void>;
  removeOwned(keyHash: string, slug: string): Promise<void>;
  /** Атомарно увеличивает общий счётчик и возвращает новое значение. */
  incrScans(slug: string): Promise<number>;
  /** Записывает один уникальный визит в статистику дня: скан, страну, устройство. */
  recordDay(slug: string, day: string, country: string, device: string): Promise<void>;
  /** Дневная статистика за последние `days` дней. */
  days(slug: string, days: number): Promise<Record<string, DayStats>>;
  /** Счётчик с окном: защита от перебора и от накрутки сканов. */
  rateLimit(bucket: string, limit: number, windowSec: number): Promise<RateLimit>;
  /** Отметка «этот посетитель уже учтён сегодня», чтобы не считать повторно. */
  markVisit(slug: string, visitorId: string, ttlSec: number): Promise<boolean>;
}

/** Дата в виде 2026-11-26, по UTC — чтобы не зависеть от часового пояса. */
export function dayKey(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** Список дат за последние n дней, включая сегодняшнюю. */
export function lastDays(days: number, now = Date.now()): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(dayKey(now - i * 86400000));
  return out;
}

type FileState = {
  codes: Record<string, Code>;
  owned: Record<string, string[]>;
  days: Record<string, Record<string, DayStats>>;
  visits: Record<string, number>;
  limits: Record<string, { count: number; reset: number }>;
};

/**
 * Файловое хранилище для локальной разработки: всё в памяти процесса,
 * сброс на диск после каждой записи. Многопроцессность не поддерживается —
 * для проверок и `npm run dev` этого достаточно.
 */
export class FileStore implements Store {
  readonly kind = "file" as const;
  private state: FileState;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private path: string) {
    this.state = this.load();
  }

  private load(): FileState {
    try {
      const raw = readFileSync(this.path, "utf8");
      const parsed = JSON.parse(raw) as Partial<FileState>;
      return {
        codes: parsed.codes ?? {},
        owned: parsed.owned ?? {},
        days: parsed.days ?? {},
        visits: parsed.visits ?? {},
        limits: parsed.limits ?? {},
      };
    } catch {
      return { codes: {}, owned: {}, days: {}, visits: {}, limits: {} };
    }
  }

  /** Запись через очередь: параллельные запросы не затирают друг друга. */
  private flush(): Promise<void> {
    const snapshot = JSON.stringify(this.state);
    this.queue = this.queue.then(() => {
      try {
        this.write(snapshot, this.path);
      } catch {
        // на serverless каталог проекта только на чтение: уходим во временный,
        // чтобы предпросмотр не падал. Данные там живут до перезапуска.
        this.path = join(tmpdir(), "qrix-dynamic.json");
        this.write(snapshot, this.path);
      }
    });
    return this.queue as Promise<void>;
  }

  private write(snapshot: string, path: string): void {
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, snapshot, "utf8");
    renameSync(tmp, path);
  }

  async getCode(slug: string): Promise<Code | null> {
    return this.state.codes[slug] ?? null;
  }

  async putCode(code: Code): Promise<void> {
    this.state.codes[code.slug] = code;
    await this.flush();
  }

  async deleteCode(slug: string): Promise<void> {
    delete this.state.codes[slug];
    delete this.state.days[slug];
    await this.flush();
  }

  async ownedSlugs(keyHash: string): Promise<string[]> {
    return this.state.owned[keyHash] ?? [];
  }

  async addOwned(keyHash: string, slug: string): Promise<void> {
    const list = this.state.owned[keyHash] ?? [];
    if (!list.includes(slug)) list.push(slug);
    this.state.owned[keyHash] = list;
    await this.flush();
  }

  async removeOwned(keyHash: string, slug: string): Promise<void> {
    const list = this.state.owned[keyHash] ?? [];
    this.state.owned[keyHash] = list.filter((s) => s !== slug);
    await this.flush();
  }

  async incrScans(slug: string): Promise<number> {
    const code = this.state.codes[slug];
    if (!code) return 0;
    code.scans += 1;
    await this.flush();
    return code.scans;
  }

  async recordDay(slug: string, day: string, country: string, device: string): Promise<void> {
    const perSlug = (this.state.days[slug] ??= {});
    const dayStats = (perSlug[day] ??= { scans: 0, countries: {}, devices: {} });
    dayStats.scans += 1;
    dayStats.countries[country] = (dayStats.countries[country] ?? 0) + 1;
    dayStats.devices[device] = (dayStats.devices[device] ?? 0) + 1;
    await this.flush();
  }

  async days(slug: string, count: number): Promise<Record<string, DayStats>> {
    const perSlug = this.state.days[slug] ?? {};
    const out: Record<string, DayStats> = {};
    for (const day of lastDays(count)) {
      if (perSlug[day]) out[day] = perSlug[day];
    }
    return out;
  }

  async rateLimit(bucket: string, limit: number, windowSec: number): Promise<RateLimit> {
    const now = Date.now();
    const entry = this.state.limits[bucket];
    if (!entry || entry.reset < now) {
      this.state.limits[bucket] = { count: 1, reset: now + windowSec * 1000 };
      await this.flush();
      return { ok: true, remaining: limit - 1 };
    }
    entry.count += 1;
    await this.flush();
    return { ok: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
  }

  async markVisit(slug: string, visitorId: string, ttlSec: number): Promise<boolean> {
    const key = `${slug}:${visitorId}`;
    const now = Date.now();
    const until = this.state.visits[key] ?? 0;
    if (until > now) return false;
    this.state.visits[key] = now + ttlSec * 1000;
    // чистим просроченные, чтобы файл не рос бесконечно
    for (const [k, exp] of Object.entries(this.state.visits)) {
      if (exp < now) delete this.state.visits[k];
    }
    await this.flush();
    return true;
  }
}

/**
 * Upstash Redis по REST.
 *
 * Ключи:
 * - `code:<slug>` — хеш с полями записи;
 * - `owner:<keyHash>` — множество слагов владельца;
 * - `d:<slug>:<day>` — хеш разрезов (scans, c:XX, dev:phone);
 * - `v:<slug>:<visitor>` — отметка уникального визита на сутки;
 * - `rl:<bucket>` — счётчик окна.
 */
export class RedisStore implements Store {
  readonly kind = "redis" as const;

  constructor(
    private readonly url: string,
    private readonly token: string
  ) {}

  /** Выполняет несколько команд одним запросом — так быстрее и дешевле. */
  private async pipeline(commands: unknown[][]): Promise<unknown[]> {
    const res = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    });
    if (!res.ok) throw new Error(`redis: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { result: unknown }[];
    return data.map((row) => row.result);
  }

  private async single(command: unknown[]): Promise<unknown> {
    const [result] = await this.pipeline([command]);
    return result;
  }

  async getCode(slug: string): Promise<Code | null> {
    const rows = (await this.single(["HGETALL", `code:${slug}`])) as string[] | null;
    if (!rows || rows.length === 0) return null;
    const map: Record<string, string> = {};
    for (let i = 0; i < rows.length; i += 2) map[rows[i]] = rows[i + 1];
    return {
      v: Number(map.v ?? 1),
      slug,
      url: map.url,
      keyHash: map.keyHash,
      createdAt: Number(map.createdAt ?? 0),
      updatedAt: Number(map.updatedAt ?? 0),
      scans: Number(map.scans ?? 0),
      license: map.license || undefined,
      paused: map.paused === "1",
    };
  }

  async putCode(code: Code): Promise<void> {
    await this.pipeline([
      [
        "HSET",
        `code:${code.slug}`,
        "v",
        String(code.v),
        "url",
        code.url,
        "keyHash",
        code.keyHash,
        "createdAt",
        String(code.createdAt),
        "updatedAt",
        String(code.updatedAt),
        "scans",
        String(code.scans),
        "paused",
        code.paused ? "1" : "0",
        ...(code.license ? ["license", code.license] : []),
      ],
      ["SADD", `owner:${code.keyHash}`, code.slug],
    ]);
  }

  async deleteCode(slug: string): Promise<void> {
    const code = await this.getCode(slug);
    const commands: unknown[][] = [["DEL", `code:${slug}`]];
    if (code) commands.push(["SREM", `owner:${code.keyHash}`, slug]);
    await this.pipeline(commands);
  }

  async ownedSlugs(keyHash: string): Promise<string[]> {
    const rows = (await this.single(["SMEMBERS", `owner:${keyHash}`])) as string[] | null;
    return rows ?? [];
  }

  async addOwned(keyHash: string, slug: string): Promise<void> {
    await this.single(["SADD", `owner:${keyHash}`, slug]);
  }

  async removeOwned(keyHash: string, slug: string): Promise<void> {
    await this.single(["SREM", `owner:${keyHash}`, slug]);
  }

  async incrScans(slug: string): Promise<number> {
    return Number(await this.single(["HINCRBY", `code:${slug}`, "scans", 1]));
  }

  async recordDay(slug: string, day: string, country: string, device: string): Promise<void> {
    const key = `d:${slug}:${day}`;
    await this.pipeline([
      ["HINCRBY", key, "scans", 1],
      ["HINCRBY", key, `c:${country}`, 1],
      ["HINCRBY", key, `dev:${device}`, 1],
      ["EXPIRE", key, 60 * 60 * 24 * 120],
    ]);
  }

  async days(slug: string, count: number): Promise<Record<string, DayStats>> {
    const keys = lastDays(count);
    const rows = (await this.pipeline(keys.map((day) => ["HGETALL", `d:${slug}:${day}`]))) as
      | (string[] | null)[]
      | null;
    const out: Record<string, DayStats> = {};
    keys.forEach((day, index) => {
      const raw = rows?.[index];
      if (!raw || raw.length === 0) return;
      const stats: DayStats = { scans: 0, countries: {}, devices: {} };
      for (let i = 0; i < raw.length; i += 2) {
        const field = raw[i];
        const value = Number(raw[i + 1]);
        if (field === "scans") stats.scans = value;
        else if (field.startsWith("c:")) stats.countries[field.slice(2)] = value;
        else if (field.startsWith("dev:")) stats.devices[field.slice(4)] = value;
      }
      out[day] = stats;
    });
    return out;
  }

  async rateLimit(bucket: string, limit: number, windowSec: number): Promise<RateLimit> {
    const key = `rl:${bucket}`;
    const count = Number(await this.single(["INCR", key]));
    if (count === 1) await this.single(["EXPIRE", key, windowSec]);
    return { ok: count <= limit, remaining: Math.max(0, limit - count) };
  }

  async markVisit(slug: string, visitorId: string, ttlSec: number): Promise<boolean> {
    const result = await this.single(["SET", `v:${slug}:${visitorId}`, "1", "NX", "EX", ttlSec]);
    return result === "OK";
  }
}

/** Выбор адаптера по окружению: есть Redis — используем его, иначе файл. */
export function createStore(env: Record<string, string | undefined>): Store {
  // имена берём через redisConfig: он понимает и UPSTASH_*, и старые QR_DB_*
  const config = redisConfig(env);
  if (config) return new RedisStore(config.url.replace(/\/+$/, ""), config.token);
  return new FileStore(env.QR_DB_FILE || ".qrix/dynamic.json");
}
