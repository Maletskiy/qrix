/**
 * Клиент динамических QR.
 *
 * Серверная часть живёт в `src/server`, здесь только запросы и локальная
 * память браузера. Ключи доступа к своим кодам хранятся в localStorage:
 * аккаунтов нет, поэтому браузер — единственное место, где ключ и остаётся.
 * Сам ключ уходит на сервер только в заголовке, в адресной строке его нет.
 */

const STORAGE_KEY = "qrix.dynamic.codes";

export type DynamicCode = {
  slug: string;
  url: string;
  createdAt: number;
  updatedAt: number;
  scans: number;
  paused: boolean;
  shortUrl: string;
  /** Есть только у своего кода: без него менять ссылку нельзя. */
  key?: string;
};

export type DayStats = {
  scans: number;
  countries: Record<string, number>;
  devices: Record<string, number>;
};

export type DynamicStats = { total: number; days: Record<string, DayStats> };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

type Stored = { slug: string; key: string; url: string; createdAt: number };

function readStore(): Stored[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Stored[];
    return Array.isArray(parsed) ? parsed.filter((row) => row && row.slug && row.key) : [];
  } catch {
    return [];
  }
}

function writeStore(rows: Stored[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* приватный режим: коды продолжат работать, но после перезагрузки
       их не будет в списке — об этом честно сказано в подписи панели */
  }
}

/** Локальный список: слаг, ключ и адрес на момент сохранения. */
export function storedCodes(): Stored[] {
  return readStore();
}

export function forgetCode(slug: string): void {
  writeStore(readStore().filter((row) => row.slug !== slug));
}

function remember(code: DynamicCode, key: string): void {
  const rows = readStore().filter((row) => row.slug !== code.slug);
  rows.unshift({ slug: code.slug, key, url: code.url, createdAt: code.createdAt });
  writeStore(rows);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const text = await res.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!res.ok) {
    const code = typeof data.error === "string" ? data.error : "http";
    const message =
      typeof data.message === "string" ? data.message : `Ошибка ${res.status}`;
    throw new ApiError(res.status, code, message);
  }

  return data as T;
}

/** Создаёт код. Ключ приходит один раз — сразу сохраняем его локально. */
export async function createDynamicCode(input: {
  url: string;
  slug?: string;
  license?: string;
}): Promise<DynamicCode> {
  const body: Record<string, string> = { url: input.url };
  if (input.slug?.trim()) body.slug = input.slug.trim();

  const result = await request<{ code: DynamicCode; key: string }>("/api/codes", {
    method: "POST",
    headers: input.license ? { "x-qrix-license": input.license } : undefined,
    body: JSON.stringify(body),
  });

  const code = { ...result.code, key: result.key };
  remember(code, result.key);
  return code;
}

/** Обновляет адрес назначения или ставит код на паузу. */
export async function updateDynamicCode(
  slug: string,
  key: string,
  patch: { url?: string; paused?: boolean }
): Promise<DynamicCode> {
  const result = await request<{ code: DynamicCode }>(`/api/codes/${slug}`, {
    method: "PATCH",
    headers: { "x-qrix-key": key },
    body: JSON.stringify(patch),
  });
  return { ...result.code, key };
}

export async function deleteDynamicCode(slug: string, key: string): Promise<void> {
  await request(`/api/codes/${slug}`, { method: "DELETE", headers: { "x-qrix-key": key } });
  forgetCode(slug);
}

export async function dynamicStats(slug: string, key: string): Promise<DynamicStats> {
  return request<DynamicStats>(`/api/codes/${slug}/stats`, {
    headers: { "x-qrix-key": key },
  });
}

/**
 * Подтягивает актуальные данные по кодам из локального списка.
 * Удалённые на другом устройстве коды просто не попадут в ответ.
 */
export async function refreshDynamicCodes(): Promise<DynamicCode[]> {
  const rows = readStore();
  if (rows.length === 0) return [];

  const slugs = rows.map((row) => row.slug).join(",");
  const result = await request<{ codes: DynamicCode[] }>(
    `/api/codes?slugs=${encodeURIComponent(slugs)}`
  );

  const byKey = new Map(rows.map((row) => [row.slug, row.key]));
  const alive = new Set(result.codes.map((code) => code.slug));
  // записи об удалённых кодах больше не нужны: ключ от них бесполезен
  writeStore(rows.filter((row) => alive.has(row.slug)));
  return result.codes.map((code) => ({ ...code, key: byKey.get(code.slug) }));
}

/** Короткая дата для карточки: 26 ноя, без года — коды живут недолго. */
export function shortDate(time: number, lang: string): string {
  try {
    return new Date(time).toLocaleDateString(lang, { day: "numeric", month: "short" });
  } catch {
    return new Date(time).toISOString().slice(0, 10);
  }
}
