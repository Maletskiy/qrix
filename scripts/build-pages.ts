/**
 * Сборка статических страниц-гайдов: dist/<lang>/<slug>/index.html,
 * плюс sitemap.xml и robots.txt.
 *
 * Запускается после vite build (`npm run build`), потому что Vite очищает
 * dist/ и перезаписал бы готовые страницы.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { BUNDLES, LANGS, PAGE_COUNT, SITE } from "../src/landing";
import { renderHub, renderPage } from "../src/landing/render";
import { coverPng } from "./lib/cover";
import { encodeMatrix } from "../src/lib/qr";
import { renderSvg } from "../src/lib/render";
import type { RenderOptions } from "../src/lib/render";

const OUT = "dist";

/**
 * Логотип для страницы «код с логотипом»: тот же знак Qrix, вшитый в код
 * настоящими путями. Читается из public/ и не зависит от сборки приложения.
 */
const LOGO =
  "data:image/svg+xml;base64," +
  readFileSync(join("public", "qrix-logo.svg")).toString("base64");

function makeQr(value: string, index: number): string {
  // у страницы с логотипом — H и вырезанная область, как в самом генераторе
  const withLogo = index === 1;

  const encoded = encodeMatrix(value, withLogo ? "H" : "Q");
  if (!encoded.ok) {
    throw new Error(`не удалось закодировать демо для «${value}»: ${encoded.error}`);
  }

  const options: RenderOptions = {
    matrix: encoded.matrix,
    size: 512,
    margin: 4,
    dotStyle: "rounded",
    eyeFrame: "rounded",
    eyeBall: "rounded",
    fillMode: "solid",
    gradientKind: "vertical",
    color1: "#0b0c0e",
    color2: "#0b0c0e",
    bgColor: "#ffffff",
    bgTransparent: false,
    logo: withLogo ? LOGO : null,
    logoPlateColor: "#ffffff",
    logoRatio: 0.26,
    logoPadding: 0.12,
    logoRadius: 0.24,
    caption: { enabled: false, text: "", color: "#000000", font: "", scale: 1 },
    shapeScale: 1,
    dotRadius: 0.5,
  };

  return renderSvg(options);
}

function write(file: string, content: string): void {
  const path = join(OUT, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function sitemap(): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls: string[] = [];

  const block = (loc: string, alternates: Record<string, string> | null): string => {
    const links = alternates
      ? Object.entries(alternates)
          .map(([code, href]) => `    <xhtml:link rel="alternate" hreflang="${code}" href="${href}"/>`)
          .join("\n") + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${alternates.en}"/>\n`
      : "";
    const priority = loc === `${SITE}/` ? "1.0" : "0.8";
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${priority}</priority>\n${links}  </url>`;
  };

  // главная — сам генератор
  urls.push(block(`${SITE}/`, null));

  // списки гайдов на каждом языке
  const hubs: Record<string, string> = {};
  for (const lang of LANGS) hubs[lang] = `${SITE}/${lang}/`;
  for (const lang of LANGS) urls.push(block(hubs[lang], hubs));

  // сами гайды
  for (let index = 0; index < PAGE_COUNT; index++) {
    const pages: Record<string, string> = {};
    for (const lang of LANGS) pages[lang] = `${SITE}/${lang}/${BUNDLES[lang].pages[index].slug}/`;
    for (const lang of LANGS) urls.push(block(pages[lang], pages));
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    `${urls.join("\n")}\n</urlset>\n`
  );
}

async function main(): Promise<void> {
  let written = 0;

  // списки гайдов: /<lang>/
  for (const lang of LANGS) {
    write(join(lang, "index.html"), renderHub({ lang, bundles: BUNDLES, site: SITE }));
    written++;
  }

  for (let index = 0; index < PAGE_COUNT; index++) {
    for (const lang of LANGS) {
      const page = BUNDLES[lang].pages[index];
      const html = renderPage({
        index,
        lang,
        bundles: BUNDLES,
        site: SITE,
        qrSvg: makeQr(page.demo.value, index),
      });
      write(join(lang, page.slug, "index.html"), html);

      // обложка: og:image и картинка в карточках списка
      const cover = await coverPng({
        title: page.title,
        eyebrow: "Qrix · guide",
        qrSvg: makeQr(page.demo.value, index),
        footnote: "qr-ix.com",
      });
      const coverFile = join("covers", `${lang}-${page.slug}.png`);
      const coverPath = join(OUT, coverFile);
      mkdirSync(dirname(coverPath), { recursive: true });
      writeFileSync(coverPath, cover);

      written++;
    }
  }

  write("sitemap.xml", sitemap());
  write(
    "robots.txt",
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`
  );

  console.log(`страниц собрано: ${written} (${PAGE_COUNT} × ${LANGS.length} + ${LANGS.length} списков)`);
  console.log(`sitemap.xml и robots.txt обновлены`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
