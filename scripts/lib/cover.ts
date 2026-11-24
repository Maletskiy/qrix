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

/** Тема гайда: от неё зависит графический мотив обложки. */
export type CoverKind = "wifi" | "logo" | "bitcoin" | "svg";

export type CoverArgs = {
  title: string;
  /** Надпись над заголовком, например «QRIX · GUIDE» */
  eyebrow: string;
  /** Готовый SVG демонстрационного кода */
  qrSvg: string;
  /** Подпись внизу */
  footnote: string;
  /** Номер гайда в серии, с единицы */
  index: number;
  /** Сколько всего гайдов в серии */
  total: number;
  kind: CoverKind;
};

const W = 1200;
const H = 630;

/** Тонкая сетка на фоне — даёт фактуру, не мешая тексту. */
function grid(): string {
  const lines: string[] = [];
  for (let x = 30; x < W; x += 30) {
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`);
  }
  for (let y = 30; y < H; y += 30) {
    lines.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`);
  }
  return `<g stroke="#191c20" stroke-width="1">${lines.join("")}</g>`;
}

/** Мотив темы поверх карточки кода. */
function art(kind: CoverKind, badgeHref: string, coinHref: string): string {
  switch (kind) {
    // Wi-Fi: волны, расходящиеся от угла карточки
    case "wifi":
      return `<g fill="none" stroke="#d1fe17" stroke-linecap="round">
      <path d="M1112 168 A 74 74 0 0 1 1186 94" stroke-width="13" opacity="0.95"/>
      <path d="M1050 168 A 136 136 0 0 1 1186 32" stroke-width="13" opacity="0.55"/>
      <path d="M988 168 A 198 198 0 0 1 1186 -30" stroke-width="13" opacity="0.28"/>
    </g>
    <circle cx="1120" cy="160" r="13" fill="#d1fe17"/>`;

    // Логотип: знак Qrix лежит на карточке, чуть повёрнут
    case "logo":
      return `<g transform="rotate(-6 860 360)">
      <rect x="712" y="300" width="212" height="212" rx="26" fill="#ffffff" opacity="0.10"/>
      <image x="726" y="314" width="184" height="184" href="${badgeHref}"/>
    </g>`;

    // Биткоин: монета на краю карточки и лаймовое кольцо
    case "bitcoin":
      return `<circle cx="884" cy="352" r="196" fill="none" stroke="#d1fe17" stroke-width="2" opacity="0.35" stroke-dasharray="6 10"/>
    <g transform="rotate(14 806 470)">
      <circle cx="806" cy="470" r="74" fill="#0f1113"/>
      <image x="732" y="396" width="148" height="148" href="${coinHref}"/>
    </g>`;

    // SVG: кривая с опорными точками, как в векторном редакторе
    case "svg":
      return `<g fill="none">
      <!-- тёмная подложка: по белой карточке лаймовая линия иначе пропадает -->
      <path d="M700 486 C 820 486 872 214 1016 214 S 1140 300 1200 300" stroke="#0f1113" stroke-width="11"/>
      <path d="M700 486 C 820 486 872 214 1016 214 S 1140 300 1200 300" stroke="#d1fe17" stroke-width="5"/>
      <path d="M700 486 L 806 486 M 1016 214 L 1120 214" stroke="#d1fe17" stroke-width="1.5" opacity="0.5" stroke-dasharray="4 6"/>
    </g>
    <g fill="#d1fe17">
      <rect x="692" y="478" width="16" height="16" rx="3"/>
      <rect x="1008" y="206" width="16" height="16" rx="3"/>
    </g>
    <g fill="#0f1113" stroke="#d1fe17" stroke-width="3">
      <circle cx="806" cy="486" r="7"/>
      <circle cx="1120" cy="214" r="7"/>
    </g>`;
  }
}

/** Собирает SVG обложки 1200×630. */
export async function coverSvg(args: CoverArgs): Promise<string> {
  const { title, eyebrow, qrSvg, footnote, index, total, kind } = args;
  const font = await loadFont();

  const qrPng = new Resvg(qrSvg, { fitTo: { mode: "width", value: 620 }, background: "white" })
    .render()
    .asPng();
  const qrHref = `data:image/png;base64,${Buffer.from(qrPng).toString("base64")}`;
  const badgeHref = `data:image/svg+xml;base64,${readFileSync("public/qrix-badge.svg").toString(
    "base64"
  )}`;
  const coinHref = `data:image/svg+xml;base64,${readFileSync("public/coins/btc.svg").toString(
    "base64"
  )}`;

  const titleSize = 56;
  const lines = wrap(font, title, titleSize, 600, 3);
  const lineHeight = titleSize * 1.16;
  const firstBaseline = 268;

  const linesMarkup = lines
    .map((line, i) => textMarkup(font, line, 72, firstBaseline + i * lineHeight, titleSize))
    .join("");
  const ruleY = Math.round(firstBaseline + (lines.length - 1) * lineHeight + 40);

  const series = `${String(index).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0f1113"/>
  ${grid()}

  <!-- карточка кода: повёрнута, с тёмной подложкой для глубины -->
  <g transform="rotate(-7 986 316)">
    <rect x="846" y="176" width="280" height="280" rx="26" fill="#050607" opacity="0.55"/>
    <rect x="838" y="168" width="296" height="296" rx="26" fill="#ffffff"/>
    <image x="860" y="190" width="252" height="252" href="${qrHref}"/>
  </g>

  ${art(kind, badgeHref, coinHref)}

  <g fill="#d1fe17">${textMarkup(font, eyebrow.toUpperCase(), 72, 152, 20)}</g>
  <g fill="#4a4e54">${textMarkup(font, series, 72, 182, 18)}</g>

  <g fill="#ffffff">${linesMarkup}</g>
  <rect x="72" y="${ruleY}" width="80" height="4" rx="2" fill="#d1fe17"/>

  <g fill="#74777c">${textMarkup(font, footnote, 72, 560, 22)}</g>
</svg>`;
}

/**
 * Рендерит обложку в PNG. Ширина задаётся: 1200 — для og:image, 600 — для
 * карточек в списках, где картинка показывается вдвое мельче.
 */
export async function coverPng(args: CoverArgs, width = 1200): Promise<Buffer> {
  const svg = await coverSvg(args);
  return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng());
}
