/**
 * HTTP-роутер динамических кодов.
 *
 * Один и тот же обработчик работает и в serverless-функции Vercel, и в
 * локальном сервере (`npm run dev:api`), поэтому весь разбор запроса живёт
 * здесь, а не в платформенной обёртке.
 */
import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  ApiError,
  codeStats,
  createCode,
  deleteCode,
  handleScan,
  normalizeUrl,
  publicCode,
  requireOwner,
  updateCode,
} from "./codes";
import { verifyLicense, type LicensePayload } from "./license";
import { createStore, dayKey, type Store } from "./store";

type Env = Record<string, string | undefined>;

export type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

/** Заголовок с ключом владельца. */
const KEY_HEADER = "x-qrix-key";
/** Заголовок с лицензией. */
const LICENSE_HEADER = "x-qrix-license";

/** Сколько кодов можно создать за час с одного адреса. */
const CREATE_LIMIT = 20;
/** Сколько запросов к API допускается за минуту. */
const API_LIMIT = 120;

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    // API не должен попадать в сниппеты и не должен индексироваться
    "X-Robots-Tag": "noindex",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    // тела больше 8 КБ здесь быть не может
    if (size > 8192) throw new ApiError(413, "too_large", "Слишком большое тело запроса");
    chunks.push(buf);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "bad_json", "Тело запроса — не JSON");
  }
}

function header(req: IncomingMessage, name: string): string {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/** Адрес клиента из заголовков прокси. Сам адрес нигде не сохраняется. */
function clientIp(req: IncomingMessage): string {
  const forwarded = header(req, "x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = header(req, "x-real-ip");
  if (real) return real;
  return req.socket.remoteAddress ?? "0.0.0.0";
}

/**
 * Хеш адреса с суточной солью: одного и того же человека можно отличить
 * в пределах дня, но восстановить адрес из базы нельзя.
 */
function visitorId(ip: string, salt: string, now = Date.now()): string {
  return createHash("sha256").update(`${salt}|${dayKey(now)}|${ip}`).digest("hex").slice(0, 24);
}

function baseUrlOf(req: IncomingMessage, env: Env): string {
  if (env.QR_BASE_URL) return env.QR_BASE_URL.replace(/\/+$/, "");
  const host = header(req, "x-forwarded-host") || header(req, "host") || "qr-ix.com";
  // локально схема http: иначе ссылка в разработке получится нерабочей
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  const proto = header(req, "x-forwarded-proto") || (local ? "http" : "https");
  return `${proto}://${host}`;
}

function hostOf(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return "qr-ix.com";
  }
}

/** Проверенная лицензия из заголовка, если секрет настроен. */
function readLicense(req: IncomingMessage, env: Env): LicensePayload | undefined {
  const token = header(req, LICENSE_HEADER);
  if (!token) return undefined;
  const secret = env.QR_LICENSE_SECRET;
  // без секрета лицензии не проверяются: значит, платный режим ещё не включён
  if (!secret) return undefined;
  const check = verifyLicense(token, secret);
  if (!check.ok) {
    if (check.reason === "expired") {
      throw new ApiError(402, "license_expired", "Срок лицензии истёк");
    }
    throw new ApiError(402, "license_invalid", "Лицензия не подходит");
  }
  return check.payload;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Собирает обработчик с привязанным хранилищем. Вызывается один раз на
 * холодный старт функции.
 */
export function createHandler(env: Env): Handler {
  const store: Store = createStore(env);
  const salt = env.QR_IP_SALT || "qrix-dev-salt";
  const selfHost = hostOf(env.QR_BASE_URL || "https://qr-ix.com");

  return async function handler(req, res) {
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", "http://local");
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      // --- редирект динамического кода ---------------------------------
      const scan = path.match(/^\/(?:api\/d|d)\/([A-Za-z0-9-]{1,64})$/);
      if (scan && method === "GET") {
        const slug = scan[1].toLowerCase();
        const limit = await store.rateLimit(`scan:${visitorId(clientIp(req), salt)}`, 120, 60);
        if (!limit.ok) {
          res.writeHead(429, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Too many requests");
          return;
        }

        const result = await handleScan(store, slug, {
          visitorId: visitorId(clientIp(req), salt),
          country: header(req, "x-vercel-ip-country") || undefined,
          userAgent: header(req, "user-agent"),
        });

        if (result.kind === "redirect") {
          res.writeHead(302, {
            Location: result.url,
            // сканы не кешируем: иначе счётчик врёт, а смену ссылки не видно
            "Cache-Control": "no-store, max-age=0",
            "X-Robots-Tag": "noindex, nofollow",
          });
          res.end();
          return;
        }
        if (result.kind === "paused") {
          res.writeHead(410, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
          res.end(pausedPage());
          return;
        }
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
        res.end(notFoundPage());
        return;
      }

      // --- API ----------------------------------------------------------
      if (path.startsWith("/api/")) {
        const ip = clientIp(req);
        const limit = await store.rateLimit(`api:${visitorId(ip, salt)}`, API_LIMIT, 60);
        if (!limit.ok) throw new ApiError(429, "rate_limited", "Слишком много запросов, подождите минуту");

        if (path === "/api/health" && method === "GET") {
          json(res, 200, { ok: true, store: store.kind });
          return;
        }

        // POST /api/codes — создать
        if (path === "/api/codes" && method === "POST") {
          const body = await readJson(req);
          const url = str(body.url);
          if (!url) throw new ApiError(400, "url_required", "Нужен адрес назначения");

          const createLimit = await store.rateLimit(
            `create:${visitorId(ip, salt)}`,
            CREATE_LIMIT,
            3600
          );
          if (!createLimit.ok) {
            throw new ApiError(429, "create_limited", "Слишком много новых кодов за час");
          }

          const key = header(req, KEY_HEADER) || undefined;
          const license = readLicense(req, env);
          const result = await createCode(
            store,
            { url, slug: str(body.slug) },
            { key, license, baseUrl: baseUrlOf(req, env), selfHost }
          );

          // ключ отдаётся один раз — сохранить его должен клиент
          json(res, 201, {
            code: publicCode(result.code, baseUrlOf(req, env)),
            key: result.key,
            licensed: Boolean(license),
          });
          return;
        }

        // GET /api/codes?slugs=a,b,c — список по известным адресам
        if (path === "/api/codes" && method === "GET") {
          const raw = url.searchParams.get("slugs") ?? "";
          const slugs = raw
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter((s) => /^[a-z0-9-]{1,64}$/.test(s))
            .slice(0, 100);
          const base = baseUrlOf(req, env);
          const out: unknown[] = [];
          for (const slug of slugs) {
            const code = await store.getCode(slug);
            // чужие коды не раскрываем: только те, что реально существуют
            if (code) out.push(publicCode(code, base));
          }
          json(res, 200, { codes: out });
          return;
        }

        const single = path.match(/^\/api\/codes\/([A-Za-z0-9-]{1,64})(\/stats)?$/);
        if (single) {
          const slug = single[1].toLowerCase();
          const wantsStats = Boolean(single[2]);
          const key = header(req, KEY_HEADER);
          const base = baseUrlOf(req, env);

          if (wantsStats && method === "GET") {
            if (!key) throw new ApiError(401, "key_required", "Нужен ключ владельца");
            const stats = await codeStats(store, slug, key);
            json(res, 200, stats);
            return;
          }

          if (method === "GET") {
            const code = await store.getCode(slug);
            if (!code) throw new ApiError(404, "not_found", "Код не найден");
            // без ключа отдаём только адрес и счётчик: этого хватает превью
            const owned = key ? await requireOwner(store, slug, key) : null;
            json(res, 200, {
              code: publicCode(owned ?? code, base),
              owner: Boolean(owned),
            });
            return;
          }

          if (method === "PATCH" || method === "DELETE") {
            if (!key) throw new ApiError(401, "key_required", "Нужен ключ владельца");
            if (method === "DELETE") {
              await deleteCode(store, slug, key);
              json(res, 200, { ok: true });
              return;
            }
            const body = await readJson(req);
            const patch: { url?: string; paused?: boolean } = {};
            if (typeof body.url === "string") patch.url = normalizeUrl(body.url, selfHost);
            if (typeof body.paused === "boolean") patch.paused = body.paused;
            const code = await updateCode(store, slug, key, patch, selfHost);
            json(res, 200, { code: publicCode(code, base) });
            return;
          }

          throw new ApiError(405, "method", "Метод не поддерживается");
        }

        throw new ApiError(404, "no_route", "Нет такого маршрута");
      }

      throw new ApiError(404, "no_route", "Нет такого маршрута");
    } catch (error) {
      if (error instanceof ApiError) {
        json(res, error.status, { error: error.code, message: error.message });
        return;
      }
      console.error("[dynamic]", error);
      json(res, 500, { error: "server", message: "Внутренняя ошибка" });
    }
  };
}

function shell(title: string, text: string): string {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} — Qrix</title>
<style>
  html,body{margin:0;height:100%}
  body{display:grid;place-items:center;background:#030304;color:#f4f5f6;
    font:16px/1.5 "Google Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  main{max-width:28rem;padding:2rem;text-align:center}
  h1{font-size:1.5rem;font-weight:500;margin:0 0 .75rem}
  p{color:#9aa0a6;margin:0 0 1.5rem}
  a{display:inline-block;padding:.8rem 1.6rem;border-radius:.9rem;background:#d1fe17;
    color:#0b0c0e;text-decoration:none;font-weight:500}
</style></head>
<body><main><h1>${title}</h1><p>${text}</p><a href="https://qr-ix.com/">Qrix</a></main></body></html>`;
}

function notFoundPage(): string {
  return shell("Код не найден", "Возможно, он удалён или в адресе опечатка.");
}

function pausedPage(): string {
  return shell("Код отключён", "Владелец временно остановил этот код.");
}
