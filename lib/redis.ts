/**
 * Клиент Upstash Redis для динамических QR.
 *
 * Клиент один на процесс: на serverless холодный старт один раз создаёт
 * соединение, дальше запросы переиспользуют его. Создание ленивое —
 * модуль импортируется и там, где Redis не настроен (локальный файловый
 * режим), тогда клиент просто не понадобится.
 *
 * Переменные читаются в двух вариантах: стандартные для Upstash
 * (UPSTASH_REDIS_REST_URL/TOKEN) и исторические QR_DB_* этого проекта.
 */
import { Redis } from "@upstash/redis";

let client: Redis | null = null;

type Env = Record<string, string | undefined>;

function read(env: Env, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = env[name];
    if (value && value.trim()) return value.trim();
  }
  return undefined;
}

/** Адрес и токен базы. Пусто, если Redis не настроен. */
export function redisConfig(env: Env = process.env): { url: string; token: string } | null {
  const url = read(env, "UPSTASH_REDIS_REST_URL", "QR_DB_URL");
  const token = read(env, "UPSTASH_REDIS_REST_TOKEN", "QR_DB_TOKEN");
  return url && token ? { url, token } : null;
}

/** Настроен ли Redis: от этого зависит выбор хранилища. */
export function hasRedis(env: Env = process.env): boolean {
  return redisConfig(env) !== null;
}

/**
 * Клиент Redis. Возвращает null, если переменные не заданы — вызывающая
 * сторона сама решает, что делать (в проекте это файловый адаптер).
 */
export function getRedis(env: Env = process.env): Redis | null {
  if (client) return client;

  const config = redisConfig(env);
  if (!config) return null;

  client = new Redis({
    url: config.url,
    token: config.token,
    // ответы в JSON: клиент сам разбирает строки и числа
    automaticDeserialization: true,
    retry: {
      retries: 2,
      backoff: (attempt) => Math.min(200 * 2 ** attempt, 2000),
    },
  });
  return client;
}

/** Сбрасывает клиент — нужно проверкам, которые меняют переменные. */
export function resetRedis(): void {
  client = null;
}
