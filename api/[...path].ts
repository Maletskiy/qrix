/**
 * Serverless-функция: все маршруты динамических кодов.
 *
 * Один файл-ловушка `api/[...path].ts` вместо десятка отдельных функций:
 * так у API один холодный старт, одно место для лимитов и одна реализация
 * (`src/server/router.ts`), которую можно проверить локально.
 *
 * В vercel.json маршрут `/d/:slug` переписывается на `/api/d/:slug`,
 * чтобы короткий адрес не воевал со статическими страницами гайдов.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { createHandler } from "../src/server/router";

const handler = createHandler({
  QR_DB_URL: process.env.QR_DB_URL,
  QR_DB_TOKEN: process.env.QR_DB_TOKEN,
  QR_DB_FILE: process.env.QR_DB_FILE,
  QR_LICENSE_SECRET: process.env.QR_LICENSE_SECRET,
  QR_IP_SALT: process.env.QR_IP_SALT,
  QR_BASE_URL: process.env.QR_BASE_URL,
});

export default function entry(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return handler(req, res);
}
