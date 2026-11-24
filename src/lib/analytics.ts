/**
 * Аналитика Qrix.
 *
 * Считаем только действия, никогда — содержимое. Уходят имена событий и
 * служебные значения: тип содержимого, id монеты, формат экспорта, язык.
 * Не уходят: адреса, ссылки, тексты, пароли Wi-Fi, e-mail, телефоны,
 * загруженный логотип и сам QR-код.
 *
 * Почему Umami, а не «счётчик от рекламной сети»: без cookie, без
 * персональных данных, без согласия-баннера по GDPR и без сторонних
 * рекламных скриптов. Код MIT — при желании переносится на свой инстанс
 * одной переменной окружения.
 *
 * ID сайта вписан ниже, поэтому сборка работает сразу. Перекрывается
 * переменной VITE_UMAMI_SITE_ID (см. `.env.example`); значение `off`
 * выключает счётчик целиком.
 */

/** Служебные строки: буквы, цифры, точка, двоеточие, дефис, подчёркивание. */
const SAFE_VALUE = /^[A-Za-z0-9._:-]{1,40}$/;

/** Известные события и их допустимые поля. */
export type EventMap = {
  /** Открытие приложения: язык и пришёл ли пользователь по ссылке с настройками. */
  app_open: { lang: string; deep_link: boolean };
  /** Первый корректный код в сессии: размер содержимого и коррекция ошибок. */
  qr_ready: { size: string; ecc: string };
  /** Переключение типа содержимого. */
  content_type: { type: string };
  /** Выбор монеты. */
  coin_select: { coin: string };
  /** Применение цветового пресета. */
  palette_apply: { palette: string };
  /** Загрузка логотипа: удалась или отклонена по размеру. */
  logo_upload: { ok: boolean };
  /** Включение и выключение подписи. */
  caption_toggle: { on: boolean };
  /** Смена уровня коррекции ошибок. */
  ecc_change: { ecc: string };
  /** Успешный экспорт или копирование кода. */
  export: { format: "png" | "svg"; action: "download" | "copy" };
  /** Экспорт не удался. */
  export_error: { format: "png" | "svg" };
  /** Копирование содержимого кода. */
  payload_copy: Record<string, never>;
  /** Показано предупреждение о читаемости или контрасте. */
  warning_shown: { kind: string };
  /** Смена языка интерфейса. */
  lang_switch: { lang: string };
  /** Сброс настроек. */
  reset: Record<string, never>;
};

export type EventName = keyof EventMap;

type Data = Record<string, string | number | boolean>;

type Mode = "idle" | "loading" | "ready" | "off";

const OPTOUT_KEY = "qrix.analytics";
/** Сколько событий держим, пока грузится скрипт. */
const QUEUE_LIMIT = 32;

let mode: Mode = "idle";
const queue: Array<[string, Data]> = [];
const seen = new Set<string>();

declare global {
  interface Window {
    umami?: { track: (name: string, data?: Data) => void };
  }
}

/**
 * ID сайта в Umami. Это публичный идентификатор — он всё равно виден в
 * исходниках страницы, как и у любого счётчика, поэтому лежит здесь: сборка
 * на любой площадке работает без настройки переменных.
 *
 * Перекрыть можно через VITE_UMAMI_SITE_ID (другой сайт, свой инстанс).
 * «off» в переменной выключает аналитику совсем.
 */
const DEFAULT_SITE_ID = "24c76990-7bd3-4eea-a99d-967cb9783f67";

function siteId(): string {
  return (import.meta.env.VITE_UMAMI_SITE_ID ?? "").trim() || DEFAULT_SITE_ID;
}

/** Пользователь попросил не считать: DNT, GPC или собственный выключатель. */
function optedOut(): boolean {
  if (typeof navigator === "undefined") return true;

  const nav = navigator as Navigator & {
    globalPrivacyControl?: boolean;
    msDoNotTrack?: string;
    doNotTrack?: string | null;
  };
  if (nav.globalPrivacyControl === true) return true;

  const win = window as Window & { doNotTrack?: string | null };
  const dnt = nav.doNotTrack ?? win.doNotTrack ?? nav.msDoNotTrack;
  if (dnt === "1" || dnt === "yes") return true;

  try {
    if (window.localStorage.getItem(OPTOUT_KEY) === "off") return true;
  } catch {
    /* приватный режим — считаем, что возражений нет */
  }
  return false;
}

/**
 * Настроена ли аналитика — для строки в подвале.
 *
 * Специально не зависит от DNT и GPC: подвал раскрывает, что счётчик на
 * сайте есть, а не отчитывается о текущем браузере. Иначе строка исчезала бы
 * ровно у тех, кто включил приватные сигналы, — у самых внимательных.
 */
export function isAnalyticsConfigured(): boolean {
  return siteId() !== "off";
}

/** Выключатель для отдельной кнопки в интерфейсе, если она понадобится. */
export function optOutAnalytics(): void {
  try {
    window.localStorage.setItem(OPTOUT_KEY, "off");
  } catch {
    /* не смогли запомнить — на этот раз просто не считаем */
  }
  mode = "off";
  queue.length = 0;
}

/** Подключаем счётчик. Вызывается один раз до рендера приложения. */
export function initAnalytics(): void {
  if (mode !== "idle") return;

  if (siteId() === "off") {
    mode = "off";
    return;
  }
  // в dev по умолчанию молчим, чтобы не засорять статистику своими же прогонами
  if (import.meta.env.DEV && import.meta.env.VITE_ANALYTICS_DEV !== "1") {
    mode = "off";
    return;
  }
  if (optedOut()) {
    mode = "off";
    return;
  }

  const host = (import.meta.env.VITE_UMAMI_HOST ?? "").trim().replace(/\/+$/, "") || "https://cloud.umami.is";
  mode = "loading";

  const script = document.createElement("script");
  script.defer = true;
  script.src = `${host}/script.js`;
  script.dataset.websiteId = siteId();
  // скрипт сам уважает DNT — дублируем свою проверку выше его настройкой
  script.dataset.doNotTrack = "true";
  // Ссылки-заготовки несут в query само содержимое: ?address=, ?password=,
  // ?link=. Без этого Umami записал бы их вместе с просмотром страницы.
  script.dataset.excludeSearch = "true";
  script.dataset.excludeHash = "true";
  script.onload = () => {
    mode = "ready";
    flush();
  };
  script.onerror = () => {
    // скрипт не загрузился (блокировщик, сеть) — тихо живём без аналитики
    mode = "off";
    queue.length = 0;
  };
  document.head.appendChild(script);
}

/**
 * Проверяет значения перед отправкой. Строка, не похожая на служебный
 * идентификатор, — это почти наверняка попытка отправить пользовательские
 * данные, поэтому событие отбрасывается целиком, а не «чистится».
 */
function sanitize(name: string, data: Data): Data | null {
  const out: Data = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "boolean" || typeof value === "number") {
      out[key] = value;
      continue;
    }
    if (typeof value === "string" && SAFE_VALUE.test(value)) {
      out[key] = value;
      continue;
    }
    if (import.meta.env.DEV) {
      console.warn(
        `[analytics] событие «${name}» не отправлено: поле «${key}» не похоже на служебное значение`
      );
    }
    return null;
  }
  return out;
}

function flush(): void {
  const api = window.umami;
  if (!api || mode !== "ready") return;
  while (queue.length > 0) {
    const [name, data] = queue.shift()!;
    try {
      api.track(name, data);
    } catch {
      /* сеть отвалилась — не мешаем работе генератора */
    }
  }
}

/** Отправить событие. До загрузки скрипта копится в очереди. */
export function track<E extends EventName>(name: E, data: EventMap[E]): void {
  const clean = sanitize(name, data as Data);
  if (!clean) return;

  if (mode === "ready" && window.umami) {
    try {
      window.umami.track(name, clean);
    } catch {
      /* см. flush */
    }
    return;
  }
  if (mode !== "loading" && mode !== "idle") return;
  if (queue.length >= QUEUE_LIMIT) return;
  queue.push([name, clean]);
}

/** Событие не чаще одного раза за загрузку страницы. */
export function trackOnce<E extends EventName>(key: string, name: E, data: EventMap[E]): void {
  if (seen.has(key)) return;
  seen.add(key);
  track(name, data);
}

/**
 * Размер содержимого по «корзинам»: точная длина пароля Wi-Fi или суммы —
 * уже подсказка, а для решений по продукту хватает порядка величины.
 */
export function payloadBucket(length: number): string {
  if (length <= 0) return "empty";
  if (length <= 30) return "1-30";
  if (length <= 80) return "31-80";
  if (length <= 200) return "81-200";
  return "200+";
}
