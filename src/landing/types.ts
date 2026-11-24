/**
 * Страницы под длинный хвост.
 *
 * Контент — это данные, а не React: страницы собираются на этапе сборки в
 * готовый HTML (scripts/build-pages.ts), потому что краулеру нужен текст в
 * разметке, а не пустой `<div id="root">`. Сам генератор остаётся на `/`.
 */

export type Lang = "ru" | "en" | "fr" | "de" | "es";

/** Что именно зашито в демонстрационный код — показываем честно, строкой. */
export type LandingDemo = {
  /** Техническое содержимое кода. Из него же строится настоящий QR. */
  value: string;
  /** Подпись под строкой: что это за данные человеческим языком. */
  label: string;
};

export type LandingSection = {
  heading: string;
  paragraphs: string[];
};

export type LandingFaq = {
  q: string;
  a: string;
};

export type LandingPage = {
  /** Адрес внутри языка: /ru/<slug>/ */
  slug: string;
  /** <title> — до 60 символов, иначе поиск обрежет */
  title: string;
  /** meta description — 120-160 символов */
  description: string;
  h1: string;
  /** Первый абзац под заголовком: 1-2 предложения */
  lede: string;
  demo: LandingDemo;
  sections: LandingSection[];
  faq: LandingFaq[];
  /** Надпись на кнопке, ведущей в генератор */
  cta: string;
  /** Путь в приложении с заготовкой: /?type=wifi */
  ctaHref: string;
};

/** Общие подписи каркаса страницы — по одному набору на язык. */
export type LandingChrome = {
  /** Значение атрибута <html lang> */
  htmlLang: string;
  /** Название языка для переключателя */
  langName: string;
  /** Короткая строка под логотипом */
  tagline: string;
  openApp: string;
  demoTitle: string;
  faqTitle: string;
  guidesTitle: string;
  /** Заголовок страницы-списка всех гайдов: /<lang>/ */
  hubTitle: string;
  /** Подзаголовок списка гайдов */
  hubLede: string;
  footerNote: string;
  breadcrumbHome: string;
  langSwitchLabel: string;
  /** Подпись у ссылки на генератор в подвале */
  footerAuthor: string;
};

export type LandingBundle = {
  chrome: LandingChrome;
  pages: LandingPage[];
};
