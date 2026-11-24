/**
 * Превью для гайдов: обложка 1200×630 (og:image и картинка в карточке).
 *
 * Текст превращается в контуры через opentype.js — resvg не умеет наши
 * woff2 и без этого нарисовал бы пустоту. Тот же приём, что в
 * scripts/build-glyphs.mjs для подписи под кодом.
 */
import { readFileSync } from "node:fs";
import { decompress } from "wawoff2";
import opentype from "opentype.js";
import { Resvg } from "@resvg/resvg-js";

const SUBSETS = ["latin", "cyrillic", "latin-ext", "cyrillic-ext"];

type CharShape = { path: string; advance: number };
type Font = { unitsPerEm: number; chars: Map<string, CharShape> };

let cached: Font | null = null;

async function loadFont(): Promise<Font> {
  if (cached) return cached;

  const chars = new Map<string, CharShape>();
  let unitsPerEm = 1000;

  for (const name of SUBSETS) {
    const woff2 = readFileSync(`public/fonts/googlesans-${name}.woff2`);
    const ttf = await decompress(woff2);
    const buffer = ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength) as ArrayBuffer;
    const font = opentype.parse(buffer);
    unitsPerEm = font.unitsPerEm;

    for (const [code, glyphIndex] of Object.entries(font.tables.cmap.glyphIndexMap)) {
      const char = String.fromCodePoint(Number(code));
      if (chars.has(char)) continue;
      const glyph = font.glyphs.get(glyphIndex);
      if (!glyph || !glyph.path) continue;
      chars.set(char, {
        path: glyph.path.toPathData(2),
        advance: glyph.advanceWidth ?? unitsPerEm / 2,
      });
    }
  }

  cached = { unitsPerEm, chars };
  return cached;
}

/** Ширина строки в пикселях для данного кегля. */
function measure(font: Font, text: string, size: number): number {
  let units = 0;
  for (const char of text) {
    const shape = font.chars.get(char);
    units += shape ? shape.advance : font.unitsPerEm / 2;
  }
  return (units * size) / font.unitsPerEm;
}

/**
 * Строка в виде путей. Каждый глиф ставится в свою точку пера и
 * масштабируется отдельно: контуры шрифта идут в юнитах и с осью Y вверх,
 * поэтому нужен scale(s, -s) вокруг базовой линии.
 */
function textMarkup(font: Font, text: string, x: number, baseline: number, size: number): string {
  const s = size / font.unitsPerEm;
  let pen = x;
  const glyphs: string[] = [];

  for (const char of text) {
    const shape = font.chars.get(char);
    if (!shape) {
      pen += (font.unitsPerEm / 2) * s;
      continue;
    }
    if (shape.path) {
      glyphs.push(
        `<g transform="translate(${pen.toFixed(2)} ${baseline}) scale(${s.toFixed(6)} ${(-s).toFixed(
          6
        )})"><path d="${shape.path}"/></g>`
      );
    }
    pen += shape.advance * s;
  }

  return glyphs.join("");
}

/** Разбивает заголовок на строки не шире maxWidth; лишнее — в многоточие. */
function wrap(font: Font, text: string, size: number, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  let i = 0;

  for (; i < words.length; i++) {
    const candidate = current ? `${current} ${words[i]}` : words[i];
    if (measure(font, candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    // слово не влезает: фиксируем строку и начинаем новую с этого слова
    lines.push(current || words[i]);
    current = current ? words[i] : "";
    if (lines.length === maxLines) {
      i++;
      break;
    }
  }

  if (lines.length < maxLines && current) lines.push(current);

  if (i < words.length) {
    let last = lines[lines.length - 1] ?? "";
    while (last.length > 1 && measure(font, `${last}…`, size) > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = `${last.trimEnd()}…`;
  }

  return lines.slice(0, maxLines);
}

export type CoverArgs = {
  title: string;
  /** Надпись над заголовком, например «QRIX · ГАЙД» */
  eyebrow: string;
  /** Готовый SVG демонстрационного кода */
  qrSvg: string;
  /** Подпись внизу */
  footnote: string;
};

/** Собирает SVG обложки 1200×630. */
export async function coverSvg({ title, eyebrow, qrSvg, footnote }: CoverArgs): Promise<string> {
  const font = await loadFont();

  const qrPng = new Resvg(qrSvg, { fitTo: { mode: "width", value: 560 }, background: "white" })
    .render()
    .asPng();
  const qrHref = `data:image/png;base64,${Buffer.from(qrPng).toString("base64")}`;

  const titleSize = 58;
  const lines = wrap(font, title, titleSize, 640, 3);
  const lineHeight = titleSize * 1.18;
  const firstBaseline = 262;

  const linesMarkup = lines
    .map((line, i) => textMarkup(font, line, 80, firstBaseline + i * lineHeight, titleSize))
    .join("");
  const ruleY = Math.round(firstBaseline + (lines.length - 1) * lineHeight + 44);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0f1113"/>
  <rect x="0.5" y="0.5" width="1199" height="629" fill="none" stroke="#24262a"/>

  <g fill="#d1fe17">${textMarkup(font, eyebrow.toUpperCase(), 80, 168, 20)}</g>

  <g fill="#ffffff">${linesMarkup}</g>
  <rect x="80" y="${ruleY}" width="88" height="4" rx="2" fill="#d1fe17"/>

  <g fill="#74777c">${textMarkup(font, footnote, 80, 556, 22)}</g>

  <rect x="780" y="135" width="340" height="340" rx="28" fill="#ffffff"/>
  <image x="802" y="157" width="296" height="296" href="${qrHref}"/>
</svg>`;
}

/** Рендерит обложку в PNG. */
export async function coverPng(args: CoverArgs): Promise<Buffer> {
  const svg = await coverSvg(args);
  return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng());
}
