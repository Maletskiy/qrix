/**
 * Локальный сервер динамических кодов.
 *
 * Нужен, чтобы проверять API без Vercel CLI и без внешней базы: тот же
 * обработчик (`src/server/router.ts`), файловое хранилище в `.qrix/`.
 *
 *   npm run dev:api        # отдельным процессом, порт 8787
 *
 * Vite проксирует на него `/api` и `/d`, поэтому в браузере адреса
 * остаются относительными и одинаковыми с продом.
 */
import { createServer } from "node:http";
import { createHandler } from "../src/server/router";

const port = Number(process.env.QR_DEV_PORT || 8787);
const file = process.env.QR_DB_FILE || ".qrix/dynamic.json";

const handler = createHandler({
  ...process.env,
  QR_DB_FILE: file,
  QR_BASE_URL: process.env.QR_BASE_URL || `http://127.0.0.1:${port}`,
  QR_IP_SALT: process.env.QR_IP_SALT || "qrix-dev-salt",
  QR_LICENSE_SECRET: process.env.QR_LICENSE_SECRET || "qrix-dev-license",
});

const server = createServer((req, res) => {
  handler(req, res).catch((error) => {
    console.error(error);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`динамические QR: http://127.0.0.1:${port}  (файл ${file})`);
});
