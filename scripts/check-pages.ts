/**
 * Проверка собранных страниц: dist/<lang>/<slug>/index.html.
 *
 * Что проверяем:
 *  - код на странице действительно декодируется в заявленную строку;
 *  - canonical, hreflang и html lang указывают туда, куда должны;
 *  - мета-длины не выходят за пределы, при которых поиск обрезает сниппет;
 *  - структура контента на месте: один h1, все секции, все вопросы.
 *
 * Запуск: npm run check:pages (после сборки).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { BUNDLES, LANGS, PAGE_COUNT, SITE } from "../src/landing";
import { COVER_KINDS } from "../src/landing/types";
import type { Lang } from "../src/landing/types";

const OUT = "dist";

type Fail = { page: string; message: string };
const fails: Fail[] = [];
let checks = 0;

function fail(page: string, message: string): void {
  fails.push({ page, message });
}

function ok(condition: boolean, page: string, message: string): boolean {
  checks++;
  if (!condition) fail(page, message);
  return condition;
}

function unescapeHtml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function decodeSvg(svg: string): string | null {
  // инлайновый SVG может быть без xmlns — resvg требует его явно
  const standalone = /<svg[^>]*\sxmlns=/.test(svg)
    ? svg
    : svg.replace(/<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');

  const png = new Resvg(standalone, { fitTo: { mode: "width", value: 900 }, background: "white" })
    .render()
    .asPng();
  const img = PNG.sync.read(Buffer.from(png));
  const result = jsQR(new Uint8ClampedArray(img.data), img.width, img.height, {
    inversionAttempts: "attemptBoth",
  });
  return result?.data ?? null;
}

function attr(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);
  return match ? match[1] : null;
}


/** Ссылки на другие гайды и на список — для проверки перелинковки. */
function guideLinks(html: string): string[] {
  return [...html.matchAll(/<li><a href="([^"]+)"/g)].map((m) => m[1]);
}

function main(): void {
  for (let index = 0; index < PAGE_COUNT; index++) {
    for (const lang of LANGS) {
      const page = BUNDLES[lang].pages[index];
      const where = `/${lang}/${page.slug}/`;
      const file = join(OUT, lang, page.slug, "index.html");

      let html: string;
      try {
        html = readFileSync(file, "utf8");
      } catch {
        fail(where, "файл страницы не найден");
        continue;
      }

      // --- метаданные ---
      ok(
        new RegExp(`<html lang="${BUNDLES[lang].chrome.htmlLang}"`).test(html),
        where,
        "неверный атрибут lang у <html>"
      );

      const canonical = attr(html, /<link rel="canonical" href="([^"]+)"/);
      ok(canonical === `${SITE}${where}`, where, `canonical: ${canonical ?? "нет"}`);

      const title = attr(html, /<title>([^<]+)<\/title>/) ?? "";
      ok(title.length > 0 && title.length <= 70, where, `длина title ${title.length}`);

      const description = attr(html, /<meta name="description" content="([^"]*)"/) ?? "";
      ok(
        description.length >= 90 && description.length <= 180,
        where,
        `длина description ${description.length}`
      );

      const alternates = [...html.matchAll(/hreflang="([a-z-]+)" href="([^"]+)"/g)];
      const hreflangs = alternates.map((m) => m[1]);
      for (const code of [...LANGS, "x-default"]) {
        ok(hreflangs.includes(code), where, `нет hreflang ${code}`);
      }
      const selfAlt = alternates.find((m) => m[1] === lang)?.[2];
      ok(selfAlt === `${SITE}${where}`, where, `hreflang ${lang} ведёт на ${selfAlt ?? "ничего"}`);

      // --- структура контента ---
      ok((html.match(/<h1>/g) ?? []).length === 1, where, "должен быть ровно один h1");
      ok((html.match(/<section>/g) ?? []).length >= page.sections.length, where, "не хватает секций");
      ok(
        (html.match(/class="faq__item"/g) ?? []).length === page.faq.length,
        where,
        "число вопросов не совпадает"
      );
      ok(html.includes('type="application/ld+json"'), where, "нет JSON-LD");
      ok(html.includes("FAQPage"), where, "нет разметки FAQPage");

      // --- код на странице действительно читается ---
      const svgStart = html.indexOf('<div class="card__qr">');
      const svgEnd = html.indexOf("</div>", svgStart);
      const svg = svgStart >= 0 ? html.slice(svgStart + '<div class="card__qr">'.length, svgEnd) : "";
      ok(svg.startsWith("<svg"), where, "не найден SVG кода");

      if (svg.startsWith("<svg")) {
        const decoded = decodeSvg(svg);
        ok(
          decoded === page.demo.value,
          where,
          decoded === null
            ? "код не декодируется"
            : `код декодируется в «${decoded}», ожидалось «${page.demo.value}»`
        );
      }

      const shown = attr(html, /<code class="card__value">([\s\S]*?)<\/code>/);
      ok(
        shown !== null && unescapeHtml(shown) === page.demo.value,
        where,
        "строка под кодом не совпадает с содержимым кода"
      );

      // --- обложка: файл на месте и указан в og:image ---
      const cover = `/covers/${COVER_KINDS[index]}.png`;
      ok(existsSync(join(OUT, cover)), where, `нет обложки ${cover}`);
      const thumb = `/covers/${COVER_KINDS[index]}-sm.png`;
      ok(existsSync(join(OUT, thumb)), where, `нет компактной обложки ${thumb}`);
      const ogImage = attr(html, /<meta property="og:image" content="([^"]+)"/);
      ok(ogImage === `${SITE}${cover}`, where, `og:image: ${ogImage ?? "нет"}`);

      // --- карточки других гайдов: у каждой есть картинка ---
      const cardImgs = [...html.matchAll(/<li><a href="[^"]+"><img src="([^"]+)"/g)].map((m) => m[1]);
      ok(cardImgs.length >= 1, where, "в карточках нет превью");
      for (const src of cardImgs) {
        ok(src.endsWith("-sm.png"), where, `карточка грузит полную обложку: ${src}`);
      }
      for (const src of cardImgs) {
        ok(existsSync(join(OUT, src)), where, `нет файла превью ${src}`);
      }

      // --- внутренние ссылки не должны вести в пустоту ---
      for (const href of guideLinks(html)) {
        const [, code, slug] = href.replace(SITE, "").split("/");
        const known = LANGS.includes(code as (typeof LANGS)[number]);
        // /<lang>/ — список гайдов, /<lang>/<slug>/ — сама страница
        const exists = known && (slug === "" || BUNDLES[code as Lang].pages.some((p) => p.slug === slug));
        ok(exists, where, `ссылка на несуществующую страницу ${href}`);
      }
    }
  }

  // --- списки гайдов: /<lang>/ ---
  for (const lang of LANGS) {
    const where = `/${lang}/`;
    const file = join(OUT, lang, "index.html");
    let html: string;
    try {
      html = readFileSync(file, "utf8");
    } catch {
      fail(where, "список гайдов не собран");
      continue;
    }

    ok(
      new RegExp(`<html lang="${BUNDLES[lang].chrome.htmlLang}"`).test(html),
      where,
      "неверный атрибут lang у <html>"
    );
    const canonical = attr(html, /<link rel="canonical" href="([^"]+)"/);
    ok(canonical === `${SITE}${where}`, where, `canonical: ${canonical ?? "нет"}`);
    ok((html.match(/<h1>/g) ?? []).length === 1, where, "должен быть ровно один h1");

    const hreflangs = [...html.matchAll(/hreflang="([a-z-]+)" href="/g)].map((m) => m[1]);
    for (const code of [...LANGS, "x-default"]) {
      ok(hreflangs.includes(code), where, `нет hreflang ${code}`);
    }

    const hubImgs = [...html.matchAll(/<li><a href="[^"]+"><img src="([^"]+)"/g)].map((m) => m[1]);
    ok(hubImgs.length === PAGE_COUNT, where, `превью в списке: ${hubImgs.length}`);
    for (const src of hubImgs) {
      ok(existsSync(join(OUT, src)), where, `нет файла превью ${src}`);
    }

    const links = guideLinks(html);
    ok(links.length === PAGE_COUNT, where, `карточек гайдов ${links.length}, ожидалось ${PAGE_COUNT}`);
    for (const href of links) {
      const exists = LANGS.some((code) =>
        BUNDLES[code].pages.some((page) => href === `${SITE}/${code}/${page.slug}/`)
      );
      ok(exists, where, `ссылка на несуществующую страницу ${href}`);
    }
  }

  // --- sitemap ---
  try {
    const sitemap = readFileSync(join(OUT, "sitemap.xml"), "utf8");
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    ok(urls.length === PAGE_COUNT * LANGS.length + LANGS.length + 1, "sitemap", `ссылок ${urls.length}`);
    ok(sitemap.includes(SITE + "/"), "sitemap", "нет главной страницы");
    for (const url of urls) {
      ok(url.startsWith(SITE), "sitemap", `чужой домен в sitemap: ${url}`);
    }
  } catch {
    fail("sitemap", "sitemap.xml не найден");
  }

  try {
    const robots = readFileSync(join(OUT, "robots.txt"), "utf8");
    ok(robots.includes(`Sitemap: ${SITE}/sitemap.xml`), "robots.txt", "нет ссылки на sitemap");
  } catch {
    fail("robots.txt", "файл не найден");
  }

  // --- итог ---
  console.log(`проверок: ${checks}, страниц: ${PAGE_COUNT * LANGS.length + LANGS.length}`);
  if (fails.length > 0) {
    for (const f of fails) console.log(`  ✗ ${f.page} — ${f.message}`);
    console.log(`\nПровалов: ${fails.length}`);
    process.exit(1);
  }
  console.log("Провалов: 0");
}

main();
