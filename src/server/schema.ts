/**
 * Схема динамического QR.
 *
 * Статический код хранит данные в себе: перепечатал — значит заново.
 * Динамический хранит короткий адрес, а сервер по нему редиректит на
 * настоящую ссылку. Поэтому ссылку можно менять после печати и считать сканы.
 *
 * Что здесь важно:
 * - у кода нет «аккаунта»: при создании выдаётся ключ, на сервере лежит
 *   только его SHA-256. Потерял ключ — код продолжает работать, но менять
 *   ссылку больше нельзя;
 * - IP сканирующего не храним: только хеш с суточной солью, чтобы не
 *   считать один и тот же телефон сто раз за день.
 */

/** Версия записи. Меняется, если поля перестанут быть совместимыми. */
export const SCHEMA_VERSION = 1;

/** Сколько кодов даёт бесплатный режим без лицензии. */
export const FREE_CODES = 3;

/** Длина машинного слага: 7 символов ≈ 3,5 трлн комбинаций. */
export const SLUG_LENGTH = 7;

/** Алфавит без похожих символов: 0/O, 1/l/I не нужны в адресе. */
export const SLUG_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

/** Предельная длина адреса назначения. */
export const MAX_URL_LENGTH = 2048;

/** Сканы храним по дням; сколько дней держим статистику. */
export const STATS_RETENTION_DAYS = 90;

export type Code = {
  v: number;
  slug: string;
  /** Куда ведёт редирект. Меняется владельцем когда угодно. */
  url: string;
  /** SHA-256 ключа владельца: сам ключ сервер не хранит. */
  keyHash: string;
  createdAt: number;
  updatedAt: number;
  /** Всего переходов. Счётчик увеличивается при каждом скане. */
  scans: number;
  /** Отпечаток лицензии, если код создан в платном режиме. */
  license?: string;
  /** Выключенный код отдаёт страницу «код отключён», а не 404. */
  paused?: boolean;
};

/** Один день статистики: без IP и без полных user-agent. */
export type DayStats = {
  /** Сканы за день. */
  scans: number;
  /** Код страны из заголовка Vercel; пусто, если его нет. */
  countries: Record<string, number>;
  /** Телефон или компьютер — грубая группа, не модель устройства. */
  devices: Record<string, number>;
};

export type CreateInput = {
  url: string;
  /** Свой слаг вместо случайного. */
  slug?: string;
};

export type UpdateInput = {
  url?: string;
  paused?: boolean;
};

export type PublicCode = {
  slug: string;
  url: string;
  createdAt: number;
  updatedAt: number;
  scans: number;
  paused: boolean;
  shortUrl: string;
};
