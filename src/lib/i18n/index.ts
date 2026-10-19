import { ru, type Dict, type DictKey } from "./ru";
import { en } from "./en";
import { fr } from "./fr";
import { de } from "./de";
import { es } from "./es";

export type Lang = "ru" | "en" | "fr" | "de" | "es";

/** Все языки проекта — переводы в fr.ts, de.ts, es.ts остаются на месте. */
const ALL_LANGS: { value: Lang; label: string; title: string }[] = [
  { value: "ru", label: "RU", title: "Русский" },
  { value: "en", label: "EN", title: "English" },
  { value: "fr", label: "FR", title: "Français" },
  { value: "de", label: "DE", title: "Deutsch" },
  { value: "es", label: "ES", title: "Español" },
];

/**
 * Порядок в переключателе: EN первым, RU сразу за ним, затем остальные.
 * Язык по умолчанию — английский: проект международный, а переключатель
 * всегда под рукой.
 */
const VISIBLE_LANGS: Lang[] = ["en", "ru", "fr", "de", "es"];

const DEFAULT_LANG: Lang = "en";

export const LANGS = VISIBLE_LANGS.map(
  (value) => ALL_LANGS.find((l) => l.value === value)!
).filter(Boolean);

const DICTS: Record<Lang, Dict> = { ru, en, fr, de, es };
const STORAGE_KEY = "qrstudio.lang";

function isLang(value: string | null): value is Lang {
  return !!value && LANGS.some((l) => l.value === value);
}

function detectLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;

  const fromUrl = new URLSearchParams(window.location.search).get("lang");
  if (isLang(fromUrl)) return fromUrl;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    /* приватный режим — просто идём дальше */
  }

  return DEFAULT_LANG;
}

let current: Lang = detectLang();
const listeners = new Set<() => void>();

if (typeof document !== "undefined") {
  document.documentElement.lang = current;
}

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang) {
  if (lang === current) return;
  current = lang;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ничего страшного */
  }
  if (typeof document !== "undefined") document.documentElement.lang = lang;
  listeners.forEach((fn) => fn());
}

export function subscribeLang(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Перевод по ключу. Работает и вне React — с текущим выбранным языком. */
export function t(key: DictKey, params?: Record<string, string | number>): string {
  const dict = DICTS[current] ?? ru;
  let value = dict[key] ?? ru[key] ?? key;
  if (params) {
    for (const [name, replacement] of Object.entries(params)) {
      value = value.split(`{${name}}`).join(String(replacement));
    }
  }
  return value;
}

/**
 * Формы множественного числа через «|»: «модуль|модуля|модулей».
 * one / few / many — как в русском; для языков с двумя формами
 * вторая и третья просто совпадают.
 */
export function plural(count: number, forms: string): string {
  const parts = forms.split("|");
  const one = parts[0] ?? forms;
  const few = parts[1] ?? one;
  const many = parts[2] ?? few;

  const abs = Math.abs(count);
  const tail100 = abs % 100;
  if (tail100 >= 11 && tail100 <= 14) return many;

  const tail10 = abs % 10;
  if (tail10 === 1) return one;
  if (tail10 >= 2 && tail10 <= 4) return few;
  return many;
}
