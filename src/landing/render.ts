/**
 * Сборка страницы в HTML.
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

function pageUrl(site: string, lang: Lang, bundles: Record<Lang, LandingBundle>, index: number): string {
  return `${site}/${lang}/${bundles[lang].pages[index].slug}/`;
}

function renderLangs(
  site: string,
  lang: Lang,
  bundles: Record<Lang, LandingBundle>,
  index: number
): string {
  const links = ORDER.map((code) => {
    const bundle = bundles[code];
    const current = code === lang;
    // код языка, а не первые буквы названия: «Русский» превращался в «РУ»,
    // что в латинице читается как «PY»
    return `        <a href="${pageUrl(site, code, bundles, index)}" hreflang="${code}" title="${esc(
      bundle.chrome.langName
    )}"${current ? ' aria-current="page"' : ""}>${code.toUpperCase()}</a>`;
  });
  return `      <nav class="langs" aria-label="${esc(bundles[lang].chrome.langSwitchLabel)}">\n${links.join(
    "\n"
  )}\n      </nav>`;
}

function renderAlternates(
  site: string,
  bundles: Record<Lang, LandingBundle>,
  index: number
): string {
  const lines = ORDER.map(
    (code) =>
      `  <link rel="alternate" hreflang="${code}" href="${pageUrl(site, code, bundles, index)}">`
  );
  lines.push(`  <link rel="alternate" hreflang="x-default" href="${pageUrl(site, "en", bundles, index)}">`);
  return lines.join("\n");
}

function renderGuides(
  chrome: LandingBundle["chrome"],
  site: string,
  lang: Lang,
  bundles: Record<Lang, LandingBundle>,
  index: number
): string {
  const items = bundles[lang].pages
    .map((other, i) => ({ other, i }))
    .filter(({ i }) => i !== index)
    .map(
      ({ other, i }) =>
        `          <li><a href="${pageUrl(site, lang, bundles, i)}"><strong>${esc(
          other.title
        )}</strong><span>${esc(short(other.lede, 160))}</span></a></li>`
    );

  return `      <section class="guides" aria-labelledby="guides-title">
        <h2 id="guides-title">${esc(chrome.guidesTitle)}</h2>
        <ul class="guides__list">
${items.join("\n")}
        </ul>
      </section>`;
}

/** Одна страница целиком. */
export function renderPage({ index, lang, bundles, site, qrSvg }: RenderArgs): string {
  const bundle = bundles[lang];
  const page = bundle.pages[index];
  const chrome = bundle.chrome;

  const url = pageUrl(site, lang, bundles, index);
  const home = `${site}/`;

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
          { "@type": "ListItem", position: 2, name: page.title, item: url },
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
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="theme-color" content="#030304">
  <title>${esc(page.title)}</title>
  <meta name="description" content="${esc(page.description)}">
  <link rel="canonical" href="${url}">
${renderAlternates(site, bundles, index)}
  <link rel="icon" type="image/svg+xml" href="/qrix-logo.svg">
  <link rel="stylesheet" href="/landing.css">
  <link rel="preload" href="/fonts/medeo/MedeoSansVariable.woff2" as="font" type="font/woff2" crossorigin>

  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Qrix">
  <meta property="og:url" content="${url}">
  <meta property="og:locale" content="${OG_LOCALE[lang]}">
  <meta property="og:title" content="${esc(page.title)}">
  <meta property="og:description" content="${esc(page.description)}">
  <meta property="og:image" content="${site}/og.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(page.title)}">
  <meta name="twitter:description" content="${esc(page.description)}">
  <meta name="twitter:image" content="${site}/og.png">

  <script type="application/ld+json">${ld(jsonLd)}</script>
</head>
<body>
  <a class="skip" href="#main">${esc(chrome.openApp)}</a>

  <header class="bar">
    <div class="wrap bar__inner">
      <a class="brand" href="/">
        <img src="/qrix-logo.svg" alt="" width="26" height="26" aria-hidden="true">
        <b>Qrix</b>
        <span>${esc(chrome.tagline)}</span>
      </a>
${renderLangs(site, lang, bundles, index)}
    </div>
  </header>

  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb">
      <a href="/">${esc(chrome.breadcrumbHome)}</a>
      <span class="crumbs__sep" aria-hidden="true">·</span>
      <span class="crumbs__current">${esc(page.title)}</span>
    </nav>

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

${renderGuides(chrome, site, lang, bundles, index)}
    </main>

    <footer class="footer">
      <p>${esc(chrome.footerNote)}</p>
      <a href="/">${esc(chrome.footerAuthor)}</a>
    </footer>
  </div>
</body>
</html>
`;
}

export { ORDER };
