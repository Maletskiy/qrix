/**
 * Генерирует контуры глифов для подписи: `src/lib/captionGlyphs.ts`.
 *
 * Нужно затем, чтобы подпись в экспортированном SVG была настоящим вектором,
 * а не тегом <text> с font-family: внешние редакторы (Figma, Illustrator)
 * подставляют свой шрифт или теряют текст.
 *
 * Запуск: node scripts/build-glyphs.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { decompress } from "wawoff2";
import opentype from "opentype.js";

const SUBSETS = ["latin", "cyrillic", "latin-ext", "cyrillic-ext"];

/** @type {Record<string, [number, string]>} */
const glyphs = {};
let metrics = null;

for (const name of SUBSETS) {
  const file = `public/fonts/googlesans-${name}.woff2`;
  const woff2 = readFileSync(file);
  const ttf = await decompress(woff2);
  const buffer = ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength);
  const font = opentype.parse(buffer);

  metrics ??= {
    unitsPerEm: font.unitsPerEm,
    ascender: font.ascender,
    descender: font.descender,
  };

  const cmap = font.tables.cmap.glyphIndexMap;
  for (const [code, glyphIndex] of Object.entries(cmap)) {
    const char = String.fromCodePoint(Number(code));
    if (char in glyphs) continue;

    const glyph = font.glyphs.get(glyphIndex);
    if (!glyph || !glyph.path) continue;

    const advance = Math.round(glyph.advanceWidth);
    // у пробела и подобных символов контура нет — храним только ширину
    const d = glyph.path ? glyph.getPath(0, 0, font.unitsPerEm).toPathData(0) : "";
    if (!d && advance <= 0) continue;

    glyphs[char] = [advance, d];
  }
}

const count = Object.keys(glyphs).length;
const body = Object.entries(glyphs)
  .map(([char, [adv, d]]) => `  ${JSON.stringify(char)}: [${adv}, ${JSON.stringify(d)}],`)
  .join("\n");

const out = `/**
 * СГЕНЕРИРОВАНО scripts/build-glyphs.mjs — руками не править.
 *
 * Контуры глифов Google Sans в единицах шрифта (unitsPerEm = ${metrics.unitsPerEm}),
 * baseline в нуле, ось Y вниз как в SVG. Используется, чтобы подпись в экспорте
 * была вектором, а не текстом с font-family.
 */
export const CAPTION_FONT_METRICS = {
  unitsPerEm: ${metrics.unitsPerEm},
  ascender: ${metrics.ascender},
  descender: ${metrics.descender},
} as const;

/** Символ → [ширина знака, путь] в единицах шрифта. */
export const CAPTION_GLYPHS: Record<string, [number, string]> = {
${body}
};
`;

writeFileSync("src/lib/captionGlyphs.ts", out);
console.log(`глифов: ${count}, файл: src/lib/captionGlyphs.ts, размер: ${Math.round(out.length / 1024)} КБ`);
