/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** ID сайта в Umami. Пусто — аналитика не подключается. */
  readonly VITE_UMAMI_SITE_ID?: string;
  /** Свой инстанс Umami вместо облака (без завершающего слэша). */
  readonly VITE_UMAMI_HOST?: string;
  /** «1» — считать события и в dev-режиме. */
  readonly VITE_ANALYTICS_DEV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
