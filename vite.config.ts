import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Адрес локального сервера динамических кодов (`npm run dev:api`). */
const API_TARGET = process.env.QR_DEV_API || "http://127.0.0.1:8787";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    // в браузере адреса те же, что на проде: /api/... и /d/<slug>
    proxy: {
      // changeOrigin выключен намеренно: сервер собирает короткий адрес
      // из заголовка Host, и в разработке он должен быть адресом страницы
      "/api": { target: API_TARGET, changeOrigin: false },
      "/d/": { target: API_TARGET, changeOrigin: false },
    },
  },
});
