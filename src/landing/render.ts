/**
 * Сборка страниц в HTML.
 *
 * Никакого React и гидратации: страница отдаётся готовой, поэтому краулер
 * видит текст сразу, а браузер не грузит 440 КБ приложения ради статьи.
 * QR-код на странице — настоящий: его рисует тот же renderSvg, что и в
 * генераторе, и он декодируется (проверяется в scripts/check-pages.ts).
 */
import type { Lang, LandingBundle } from "./types";

export type RenderArgs = {
  index: number;
  lang: Lang;
  bundles: Record<Lang, LandingBundle>;
  /** Абсолютный адрес сайта без завершающего слэша */
  site: string;
  /** Готовый SVG демонстрационного кода */
  qrSvg: string;
};

const OG_LOCALE: Record<Lang, string> = {
  ru: "ru_RU",
  en: "en_US",
  fr: "fr_FR",
  de: "de_DE",
  es: "es_ES",
};

const ORDER: Lang[] = ["en", "ru", "fr", "de", "es"];

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** JSON-LD не должен уметь закрыть <script> содержимым. */
function ld(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/** Короткая подпись для перелинковки: целое предложение, если оно помещается. */
function short(text: string, limit = 120): string {
  if (text.length <= limit) return text;
  const sentence = text.slice(0, limit).match(/^[\s\S]*?[.!?](?=\s|$)/);
  if (sentence && sentence[0].length >= 40) return sentence[0];
  const cut = text.slice(0, limit);
  const space = cut.lastIndexOf(" ");
  return (space > 40 ? cut.slice(0, space) : cut).replace(/[.,;:—-]$/, "") + "…";
}

function pageUrl(
  site: string,
  bundles: Record<Lang, LandingBundle>,
  lang: Lang,
  index: number
): string {
  return `${site}/${lang}/${bundles[lang].pages[index].slug}/`;
}

/** Обложка гайда: относительный путь для <img>, абсолютный — для og:image. */
function coverPath(lang: Lang, slug: string): string {
  return `/covers/${lang}-${slug}.png`;
}

/** Та же обложка вдвое меньше — её показывают карточки в списках. */
function coverThumb(lang: Lang, slug: string): string {
  return `/covers/${lang}-${slug}-sm.png`;
}

function hubUrl(site: string, lang: Lang): string {
  return `${site}/${lang}/`;
}

/** Набор адресов одной сущности на всех языках — для hreflang и переключателя. */
function urlsByLang(build: (lang: Lang) => string): Record<Lang, string> {
  return ORDER.reduce((acc, code) => {
    acc[code] = build(code);
    return acc;
  }, {} as Record<Lang, string>);
}

function alternates(urls: Record<Lang, string>): string {
  const lines = ORDER.map(
    (code) => `  <link rel="alternate" hreflang="${code}" href="${urls[code]}">`
  );
  lines.push(`  <link rel="alternate" hreflang="x-default" href="${urls.en}">`);
  return lines.join("\n");
}

function head(args: {
  lang: Lang;
  title: string;
  description: string;
  canonical: string;
  urls: Record<Lang, string>;
  jsonLd: unknown;
  type: "article" | "website";
  image: string;
}): string {
  const { lang, title, description, canonical, urls, jsonLd, type, image } = args;
  return `<meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="theme-color" content="#030304">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${canonical}">
${alternates(urls)}
  <link rel="icon" type="image/svg+xml" href="/qrix-logo.svg">
  <link rel="stylesheet" href="/landing.css">
  <link rel="preload" href="/fonts/googlesans-latin.woff2" as="font" type="font/woff2" crossorigin>

  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="Qrix">
  <meta property="og:url" content="${canonical}">
  <meta property="og:locale" content="${OG_LOCALE[lang]}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${image}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${image}">

  <script type="application/ld+json">${ld(jsonLd)}</script>`;
}

function bar(args: {
  lang: Lang;
  bundles: Record<Lang, LandingBundle>;
  urls: Record<Lang, string>;
}): string {
  const { lang, bundles, urls } = args;
  const chrome = bundles[lang].chrome;

  // код языка, а не первые буквы названия: «Русский» превращался в «РУ»,
  // что в латинице читается как «PY»
  const links = ORDER.map((code) => {
    const current = code === lang;
    return `        <a href="${urls[code]}" hreflang="${code}" title="${esc(
      bundles[code].chrome.langName
    )}"${current ? ' aria-current="page"' : ""}>${code.toUpperCase()}</a>`;
  }).join("\n");

  return `<header class="bar">
    <div class="wrap bar__inner">
      <a class="brand" href="/">
        <img src="/qrix-logo.svg" alt="" width="26" height="26" aria-hidden="true">
        <b>Qrix</b>
        <span>${esc(chrome.tagline)}</span>
      </a>
      <nav class="langs" aria-label="${esc(chrome.langSwitchLabel)}" style="--active: ${
        ORDER.indexOf(lang)
      }">
        <span class="langs__thumb" aria-hidden="true"></span>
${links}
      </nav>
    </div>
  </header>`;
}

/** Хлебные крошки: генератор → список гайдов → текущая страница. */
function crumbs(
  chrome: LandingBundle["chrome"],
  hub: string,
  current: string,
  showHub: boolean
): string {
  const hubItem = showHub
    ? `\n      <span class="crumbs__sep" aria-hidden="true">·</span>\n      <a href="${hub}">${esc(
        chrome.hubTitle
      )}</a>`
    : "";
  return `<nav class="crumbs" aria-label="Breadcrumb">
      <a href="/">${esc(chrome.breadcrumbHome)}</a>${hubItem}
      <span class="crumbs__sep crumbs__sep--tail" aria-hidden="true">·</span>
      <span class="crumbs__current">${esc(current)}</span>
    </nav>`;
}

function footer(chrome: LandingBundle["chrome"]): string {
  return `<footer class="footer">
      <p>${esc(chrome.footerNote)}</p>
      <a href="/">${esc(chrome.footerAuthor)}</a>
    </footer>`;
}

function guideCards(
  site: string,
  lang: Lang,
  bundles: Record<Lang, LandingBundle>,
  skipIndex: number | null
): string {
  return bundles[lang].pages
    .map((page, index) => ({ page, index }))
    .filter(({ index }) => index !== skipIndex)
    .map(
      ({ page, index }) =>
        `          <li><a href="${pageUrl(site, bundles, lang, index)}"><img src="${coverThumb(
          lang,
          page.slug
        )}" alt="" width="600" height="315" loading="lazy" decoding="async"><strong><span>${esc(
          page.title
        )}</span></strong><span class="guides__note">${esc(short(page.lede, 160))}</span></a></li>`
    )
    .join("\n");
}

/** Одна страница-гайд. */
export function renderPage({ index, lang, bundles, site, qrSvg }: RenderArgs): string {
  const bundle = bundles[lang];
  const page = bundle.pages[index];
  const chrome = bundle.chrome;

  const urls = urlsByLang((code) => pageUrl(site, bundles, code, index));
  const url = urls[lang];
  const home = `${site}/`;
  const hub = hubUrl(site, lang);

  const sections = page.sections
    .map(
      (section) => `        <section>
          <h2>${esc(section.heading)}</h2>
${section.paragraphs.map((text) => `          <p>${esc(text)}</p>`).join("\n")}
        </section>`
    )
    .join("\n");

  const faq = page.faq
    .map(
      (item) => `          <div class="faq__item">
            <h3>${esc(item.q)}</h3>
            <p>${esc(item.a)}</p>
          </div>`
    )
    .join("\n");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: page.title,
        description: page.description,
        inLanguage: lang,
        isPartOf: { "@type": "WebSite", "@id": home, name: "Qrix", url: home },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: chrome.breadcrumbHome, item: home },
          { "@type": "ListItem", position: 2, name: chrome.hubTitle, item: hub },
          { "@type": "ListItem", position: 3, name: page.title, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: page.faq.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };

  return `<!doctype html>
<html lang="${esc(chrome.htmlLang)}">
<head>
  ${head({
    lang,
    title: page.title,
    description: page.description,
    canonical: url,
    urls,
    jsonLd,
    type: "article",
    image: `${site}${coverPath(lang, page.slug)}`,
  })}
</head>
<body>
  <a class="skip" href="#main">${esc(chrome.openApp)}</a>

  ${bar({ lang, bundles, urls })}

  <div class="wrap">
    ${crumbs(chrome, hub, page.title, true)}

    <main id="main">
      <section class="hero">
        <div class="hero__text">
          <h1>${esc(page.h1)}</h1>
          <p class="lede">${esc(page.lede)}</p>
          <a class="btn" href="${esc(page.ctaHref)}">${esc(page.cta)}</a>
        </div>

        <figure class="card">
          <div class="card__qr">${qrSvg}</div>
          <div class="card__meta">
            <span class="card__label">${esc(chrome.demoTitle)}</span>
            <code class="card__value">${esc(page.demo.value)}</code>
          </div>
          <figcaption>${esc(page.demo.label)}</figcaption>
        </figure>
      </section>

      <article class="prose">
${sections}
      </article>

      <div class="cta-end">
        <a class="btn" href="${esc(page.ctaHref)}">${esc(page.cta)}</a>
        <a class="btn btn--ghost" href="/">${esc(chrome.openApp)}</a>
      </div>

      <section class="faq" aria-labelledby="faq-title">
        <h2 id="faq-title">${esc(chrome.faqTitle)}</h2>
        <div class="faq__grid">
${faq}
        </div>
      </section>

      <section class="guides" aria-labelledby="guides-title">
        <h2 id="guides-title">${esc(chrome.guidesTitle)}</h2>
        <ul class="guides__list">
${guideCards(site, lang, bundles, index)}
        </ul>
      </section>
    </main>

    ${footer(chrome)}
  </div>
</body>
</html>
`;
}

/** Список всех гайдов на языке: /<lang>/ */
export function renderHub(args: {
  lang: Lang;
  bundles: Record<Lang, LandingBundle>;
  site: string;
}): string {
  const { lang, bundles, site } = args;
  const chrome = bundles[lang].chrome;
  const urls = urlsByLang((code) => hubUrl(site, code));
  const url = urls[lang];
  const home = `${site}/`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": url,
        url,
        name: chrome.hubTitle,
        description: chrome.hubLede,
        inLanguage: lang,
        isPartOf: { "@type": "WebSite", "@id": home, name: "Qrix", url: home },
        hasPart: bundles[lang].pages.map((page, index) => ({
          "@type": "Article",
          headline: page.title,
          url: pageUrl(site, bundles, lang, index),
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: chrome.breadcrumbHome, item: home },
          { "@type": "ListItem", position: 2, name: chrome.hubTitle, item: url },
        ],
      },
    ],
  };

  return `<!doctype html>
<html lang="${esc(chrome.htmlLang)}">
<head>
  ${head({
    lang,
    title: `${chrome.hubTitle} — Qrix`,
    description: chrome.hubLede,
    canonical: url,
    urls,
    jsonLd,
    type: "website",
    image: `${site}/og.png`,
  })}
</head>
<body>
  <a class="skip" href="#main">${esc(chrome.openApp)}</a>

  ${bar({ lang, bundles, urls })}

  <div class="wrap">
    ${crumbs(chrome, url, chrome.hubTitle, false)}

    <main id="main">
      <section class="hub">
        <h1>${esc(chrome.hubTitle)}</h1>
        <p class="lede">${esc(chrome.hubLede)}</p>
        <a class="btn" href="/">${esc(chrome.openApp)}</a>
      </section>

      <ul class="guides__list">
${guideCards(site, lang, bundles, null)}
      </ul>
    </main>

    ${footer(chrome)}
  </div>
</body>
</html>
`;
}

export { ORDER };
