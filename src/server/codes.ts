/**
 * Логика динамических кодов: создание, правка, скан.
 *
 * Здесь нет HTTP — только чистые операции над хранилищем, поэтому всё
 * проверяется обычным скриптом, без поднятия сервера.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { LicensePayload } from "./license";
import {
  FREE_CODES,
  MAX_URL_LENGTH,
  SCHEMA_VERSION,
  SLUG_ALPHABET,
  SLUG_LENGTH,
  type Code,
  type CreateInput,
  type DayStats,
  type PublicCode,
  type UpdateInput,
} from "./schema";
import { dayKey, type Store } from "./store";

/** Ошибка уровня API: код и HTTP-статус задаются здесь, а не в роутере. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

/** Слова, которые нельзя занимать под код: они уже заняты сайтом. */
const RESERVED = new Set([
  "api",
  "d",
  "ru",
  "en",
  "fr",
  "de",
  "es",
  "admin",
  "app",
  "new",
  "edit",
  "stats",
  "login",
  "billing",
  "pro",
  "about",
  "help",
]);

/** Ключ владельца: 24 случайных байта. Сервер его не хранит, только хеш. */
export function randomKey(): string {
  return randomBytes(24).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function hashKey(key: string): string {
  return createHash("sha256").update(`qrix:${key}`).digest("hex");
}

/** Сравнение ключей без утечки времени. */
export function sameKey(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function randomSlug(): string {
  const bytes = randomBytes(SLUG_LENGTH);
  let out = "";
  for (let i = 0; i < SLUG_LENGTH; i++) out += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  return out;
}

/** Пользовательский слаг: строчные латинские буквы, цифры и дефис. */
export function validateSlug(value: string): string {
  const slug = value.trim().toLowerCase();
  if (slug.length < 3 || slug.length > 32) {
    throw new ApiError(400, "slug_length", "Слаг должен быть от 3 до 32 символов");
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) {
    throw new ApiError(400, "slug_symbols", "Только латинские буквы, цифры и дефис");
  }
  if (RESERVED.has(slug)) throw new ApiError(409, "slug_reserved", "Этот адрес занят");
  return slug;
}

/**
 * Проверяет адрес назначения. Разрешены только http и https:
 * `javascript:` и `data:` в редиректе — дыра, а не ссылка.
 */
export function normalizeUrl(input: string, selfHost = "qr-ix.com"): string {
  const raw = input.trim();
  if (!raw) throw new ApiError(400, "url_empty", "Нужен адрес, куда вести код");

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    // без схемы считаем, что человек имел в виду https
    try {
      parsed = new URL(`https://${raw}`);
    } catch {
      throw new ApiError(400, "url_invalid", "Это не похоже на адрес");
    }
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ApiError(400, "url_scheme", "Поддерживаются только http и https");
  }
  if (parsed.href.length > MAX_URL_LENGTH) {
    throw new ApiError(400, "url_long", `Адрес длиннее ${MAX_URL_LENGTH} символов`);
  }
  // код на себя — это петля редиректов
  if (parsed.hostname === selfHost || parsed.hostname.endsWith(`.${selfHost}`)) {
    if (parsed.pathname.startsWith("/d/")) {
      throw new ApiError(400, "url_loop", "Нельзя вести динамический код на другой динамический код");
    }
  }

  return parsed.href;
}

/** Грубая группа устройства: телефон, планшет, компьютер. */
export function deviceClass(userAgent: string): "phone" | "tablet" | "desktop" {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(ua)) return "phone";
  return "desktop";
}

export type CreateContext = {
  /** Ключ владельца, если клиент его уже имеет. */
  key?: string;
  /** Проверенная лицензия. */
  license?: LicensePayload;
  /** Код страны из заголовков хостинга — только для статистики. */
  now?: number;
  baseUrl: string;
  selfHost?: string;
};

export type CreateResult = { code: Code; key: string };

/**
 * Создаёт код. Ключ возвращается один раз: если клиент не прислал свой,
 * сервер генерирует новый и запоминает только хеш.
 */
export async function createCode(
  store: Store,
  input: CreateInput,
  ctx: CreateContext
): Promise<CreateResult> {
  const now = ctx.now ?? Date.now();
  const url = normalizeUrl(input.url, ctx.selfHost);
  const key = ctx.key?.trim() || randomKey();
  const keyHash = hashKey(key);

  if (!ctx.license) {
    const owned = await store.ownedSlugs(keyHash);
    // считаем только живые коды: удалённые не должны держать лимит
    let alive = 0;
    for (const slug of owned) {
      if (await store.getCode(slug)) alive += 1;
    }
    if (alive >= FREE_CODES) {
      throw new ApiError(
        402,
        "limit_reached",
        `Бесплатно можно держать ${FREE_CODES} динамических кода`
      );
    }
  }

  let slug: string;
  if (input.slug) {
    slug = validateSlug(input.slug);
    if (await store.getCode(slug)) {
      throw new ApiError(409, "slug_taken", "Этот адрес уже занят");
    }
  } else {
    // 6 попыток: вероятность коллизии на 7 символах ничтожна
    for (let i = 0; i < 6; i++) {
      const candidate = randomSlug();
      if (!(await store.getCode(candidate))) {
        slug = candidate;
        break;
      }
    }
    if (!slug!) throw new ApiError(500, "slug_failed", "Не удалось подобрать адрес");
  }

  const code: Code = {
    v: SCHEMA_VERSION,
    slug,
    url,
    keyHash,
    createdAt: now,
    updatedAt: now,
    scans: 0,
    paused: false,
    ...(ctx.license ? { license: ctx.license.id } : {}),
  };

  await store.putCode(code);
  await store.addOwned(keyHash, slug);

  return { code, key };
}

/** Загружает код и проверяет, что ключ принадлежит владельцу. */
export async function requireOwner(store: Store, slug: string, key: string): Promise<Code> {
  const code = await store.getCode(slug);
  if (!code) throw new ApiError(404, "not_found", "Код не найден");
  if (!sameKey(hashKey(key), code.keyHash)) {
    throw new ApiError(403, "forbidden", "Этот код создан с другим ключом");
  }
  return code;
}

export async function updateCode(
  store: Store,
  slug: string,
  key: string,
  patch: UpdateInput,
  selfHost?: string
): Promise<Code> {
  const code = await requireOwner(store, slug, key);
  if (patch.url !== undefined) code.url = normalizeUrl(patch.url, selfHost);
  if (patch.paused !== undefined) code.paused = Boolean(patch.paused);
  code.updatedAt = Date.now();
  await store.putCode(code);
  return code;
}

export async function deleteCode(store: Store, slug: string, key: string): Promise<void> {
  const code = await requireOwner(store, slug, key);
  await store.deleteCode(slug);
  await store.removeOwned(code.keyHash, slug);
}

export function publicCode(code: Code, baseUrl: string): PublicCode {
  return {
    slug: code.slug,
    url: code.url,
    createdAt: code.createdAt,
    updatedAt: code.updatedAt,
    scans: code.scans,
    paused: Boolean(code.paused),
    shortUrl: `${baseUrl.replace(/\/+$/, "")}/d/${code.slug}`,
  };
}

export type ScanContext = {
  /** Хеш IP с суточной солью: сам адрес не хранится. */
  visitorId: string;
  country?: string;
  userAgent?: string;
  now?: number;
};

export type ScanResult =
  | { kind: "redirect"; url: string }
  | { kind: "paused" }
  | { kind: "missing" };

/**
 * Обрабатывает скан: считает переход и говорит, куда вести.
 * Повторный скан того же человека в те же сутки не раздувает статистику,
 * но общий счётчик растёт всегда — это число сканов, а не людей.
 */
export async function handleScan(
  store: Store,
  slug: string,
  ctx: ScanContext
): Promise<ScanResult> {
  const code = await store.getCode(slug);
  if (!code) return { kind: "missing" };
  if (code.paused) return { kind: "paused" };

  const now = ctx.now ?? Date.now();
  await store.incrScans(slug);

  const fresh = await store.markVisit(slug, ctx.visitorId, 60 * 60 * 24);
  if (fresh) {
      await store.recordDay(
      slug,
      dayKey(now),
      ctx.country || "??",
      deviceClass(ctx.userAgent ?? "")
    );
  }

  return { kind: "redirect", url: code.url };
}

export type Stats = {
  total: number;
  days: Record<string, DayStats>;
};

export async function codeStats(
  store: Store,
  slug: string,
  key: string,
  days = 30
): Promise<Stats> {
  const code = await requireOwner(store, slug, key);
  return { total: code.scans, days: await store.days(slug, days) };
}
