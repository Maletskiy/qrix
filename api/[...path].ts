/**
 * Serverless-функция: все маршруты динамических кодов.
 *
 * Один файл-ловушка `api/[...path].ts` вместо десятка отдельных функций:
 * так у API один холодный старт, одно место для лимитов и одна реализация
 * (`src/server/router.ts`), которую можно проверить локально.
 *
 * В vercel.json маршрут `/d/:slug` переписывается на `/api/d/:slug`,
 * чтобы короткий адрес не воевал со статическими страницами гайдов.
 *
 * Обработчик собирается лениво, при первом запросе: если инициализация
 * падает, функция отвечает кодом причины (`init_failed: <CODE>`), а не
 * глухим FUNCTION_INVOCATION_FAILED. Наружу уходит только код ошибки —
 * без путей, стека и текста, чтобы не раскрывать устройство сервера.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { createHandler } from "../src/server/router";

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

let ready: Handler | null = null;
let failure: string | null = null;

function build(): Handler | null {
  if (ready) return ready;
  if (failure) return null;

  try {
    ready = createHandler({
      QR_DB_URL: process.env.QR_DB_URL,
      QR_DB_TOKEN: process.env.QR_DB_TOKEN,
      QR_DB_FILE: process.env.QR_DB_FILE,
      QR_LICENSE_SECRET: process.env.QR_LICENSE_SECRET,
      QR_IP_SALT: process.env.QR_IP_SALT,
      QR_BASE_URL: process.env.QR_BASE_URL,
    });
    return ready;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : error instanceof Error
          ? error.name
          : "unknown";
    failure = code;
    console.error(`qrix api: init failed (${code})`);
    return null;
  }
}

export default async function entry(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const handler = build();

  if (!handler) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "init_failed", code: failure ?? "unknown" }));
    return;
  }

  try {
    await handler(req, res);
  } catch (error) {
    const code = error instanceof Error ? error.name : "unknown";
    console.error(`qrix api: request failed (${code})`);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "request_failed", code }));
    }
  }
}
