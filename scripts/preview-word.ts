/**
 * Обложки гайдов: слово из белых модулей на хаотичном поле зелёных.
 *
 * Как собирается:
 *  1. слово разбирается шрифтом Google Sans в контуры и растеризуется в маску
 *     с шагом сетки модулей;
 *  2. маска чистится: точки над «i» приводятся к одному виду, потому что на
 *     этом кегле шрифт отдаёт их то шире, то без точки вовсе;
 *  3. по полю рассыпаются фоновые модули: случайный сдвиг, случайный оттенок,
 *     часть пропущена — решётки не видно;
 *  4. рядом со словом фон гаснет, чтобы контраст с белым был максимальным;
 *  5. слово красится градиентом слева направо, от фирменного зелёного к белому.
 *
 * Всё детерминировано: одинаковый результат на любой машине и в CI.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { decompress } from "wawoff2";
import opentype from "opentype.js";
import { Resvg } from "@resvg/resvg-js";
import { PNG } from "pngjs";

const W = 1200;
const H = 630;

/** Шаг сетки, по которой ставятся модули слова. */
const WORD_STEP = 16;
/** Размер модуля: одинаковый у фона и у слова. */
const MODULE = 13;
const RADIUS = 4.4;
/** Зазор между модулями фона. */
const BG_GAP = 5;

/** Утолщение букв: вариативный Medium через opentype.js недоступен. */
const STROKE = 7;

const DARK = [0x0b, 0x0d, 0x0f];
const ACCENT = [0xd1, 0xfe, 0x17];

export type CoverWord = "Wi-Fi" | "Logo" | "Bitcoin" | "SVG";

/* ---------- шрифт ---------- */

const SUBSETS = ["latin", "cyrillic", "latin-ext", "cyrillic-ext"];
let cachedFont: opentype.Font | null = null;

async function loadFont(): Promise<opentype.Font> {
  if (cachedFont) return cachedFont;

  for (const name of SUBSETS) {
    try {
      const woff2 = readFileSync(`public/fonts/googlesans-${name}.woff2`);
      const ttf = await decompress(woff2);
      const buffer = ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength) as ArrayBuffer;
      cachedFont = opentype.parse(buffer);
      return cachedFont;
    } catch {
      // сабсета нет — берём следующий
    }
  }
  throw new Error("не удалось загрузить шрифт");
}

/* ---------- маска слова ---------- */

/**
 * Кегль одинаковый для всех слов: масштаб задают буквы, а не длина слова.
 * Длинное слово при необходимости ужимается, но не наоборот — иначе
 * «Logo» из четырёх букв выходил крупнее «Bitcoin» из семи.
 */
const BASE_SIZE = 330;
/** Предел, дальше которого слово упирается в поля кадра. */
const MAX_WIDTH_RATIO = 0.86;

function fitSize(font: opentype.Font, text: string): number {
  const box = font.getPath(text, 0, 0, BASE_SIZE).getBoundingBox();
  const width = box.x2 - box.x1;
  const limit = W * MAX_WIDTH_RATIO;
  return width > limit ? Math.round((BASE_SIZE * limit) / width) : BASE_SIZE;
}

/** Путь слова, вписанный в кадр по центру. */
function wordPath(font: opentype.Font, text: string, size: number): string {
  const path = font.getPath(text, 0, 0, size);
  const box = path.getBoundingBox();
  const dx = (W - (box.x2 - box.x1)) / 2 - box.x1;
  const dy = (H - (box.y2 - box.y1)) / 2 - box.y1;

  // обводка той же краской утолщает буквы до плотности Medium
  return `<g transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)})"><path d="${path.toPathData(2)}" stroke="#fff" stroke-width="${STROKE}" stroke-linejoin="round"/></g>`;
}

/** Растеризует слово и читает центр каждой ячейки сетки. */
function wordMask(font: opentype.Font, text: string): boolean[][] {
  const size = fitSize(font, text);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#000"/>
    <g fill="#fff">${wordPath(font, text, size)}</g>
  </svg>`;

  const png = PNG.sync.read(
    Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng())
  );

  const cols = Math.ceil(W / WORD_STEP);
  const rows = Math.ceil(H / WORD_STEP);
  const mask: boolean[][] = [];

  for (let r = 0; r < rows; r++) {
    const line: boolean[] = [];
    for (let c = 0; c < cols; c++) {
      const x = Math.min(W - 1, Math.round(c * WORD_STEP + WORD_STEP / 2));
      const y = Math.min(H - 1, Math.round(r * WORD_STEP + WORD_STEP / 2));
      line.push(png.data[(y * W + x) * 4] > 127);
    }
    mask.push(line);
  }
  return mask;
}

type Region = { r1: number; r2: number; c1: number; c2: number; n: number; cells: [number, number][] };

/** Связные области маски — это отдельные буквы и их точки. */
function regions(mask: boolean[][]): Region[] {
  const seen = mask.map((line) => line.map(() => false));
  const out: Region[] = [];

  for (let r = 0; r < mask.length; r++) {
    for (let c = 0; c < mask[0].length; c++) {
      if (!mask[r][c] || seen[r][c]) continue;

      const stack: [number, number][] = [[r, c]];
      seen[r][c] = true;
      const cells: [number, number][] = [];
      let r1 = r, r2 = r, c1 = c, c2 = c;

      while (stack.length) {
        const [cr, cc] = stack.pop()!;
        cells.push([cr, cc]);
        r1 = Math.min(r1, cr); r2 = Math.max(r2, cr);
        c1 = Math.min(c1, cc); c2 = Math.max(c2, cc);

        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr < 0 || nc < 0 || nr >= mask.length || nc >= mask[0].length) continue;
          if (mask[nr][nc] && !seen[nr][nc]) {
            seen[nr][nc] = true;
            stack.push([nr, nc]);
          }
        }
      }
      out.push({ r1, r2, c1, c2, n: cells.length, cells });
    }
  }
  return out;
}

/**
 * Точки над «i» приводим к одному виду: две колонки на три строки,
 * выровнены по левому краю столбика. На этом кегле шрифт отдаёт их
 * то шире, то вообще без точки.
 */
function fixDots(mask: boolean[][]): void {
  const all = regions(mask);
  const stems = all.filter((r) => r.c2 - r.c1 <= 1 && r.r2 - r.r1 >= 8);

  for (const stem of stems) {
    const dot = all.find(
      (r) => Math.abs(r.c1 - stem.c1) <= 2 && r.r2 < stem.r1 - 1 && r.n <= 12
    );
    if (dot) for (const [r, c] of dot.cells) mask[r][c] = false;

    const top = stem.r1 - 4;
    for (let r = top; r < top + 3; r++) {
      for (let c = stem.c1; c < stem.c1 + 2; c++) {
        if (r >= 0 && c >= 0 && r < mask.length && c < mask[0].length) mask[r][c] = true;
      }
    }
  }
}

/* ---------- геометрия фона ---------- */

function hash(x: number, y: number, salt = 0): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Сид из самого слова: у каждой темы своё поле. Без него шум зависел только
 * от координат, а сетка у всех слов одна — обложки выходили одинаковыми.
 */
function seedFrom(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 100000;
  return h / 97;
}

function mix(a: number[], b: number[], t: number): string {
  const k = Math.max(0, Math.min(1, t));
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Расстояние от точки до ближайшего модуля слова. */
function wordDistance(mask: boolean[][], x: number, y: number): number {
  const c0 = Math.round(x / WORD_STEP);
  const r0 = Math.round(y / WORD_STEP);
  let best = Infinity;

  for (let r = Math.max(0, r0 - 16); r <= Math.min(mask.length - 1, r0 + 16); r++) {
    for (let c = Math.max(0, c0 - 16); c <= Math.min(mask[0].length - 1, c0 + 16); c++) {
      if (!mask[r][c]) continue;
      const d = Math.hypot(c * WORD_STEP - x, r * WORD_STEP - y);
      if (d < best) best = d;
    }
  }
  return best;
}

function moduleRect(x: number, y: number, size: number, fill: string): string {
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size}" height="${size}" rx="${RADIUS.toFixed(
    1
  )}" fill="${fill}"/>`;
}

/* ---------- сборка ---------- */

export async function coverSvg(text: string): Promise<string> {
  const font = await loadFont();
  const mask = wordMask(font, text);
  fixDots(mask);

  // смещение для шума: своё у каждого слова
  const seed = seedFrom(text);

  const background: string[] = [];
  const word: string[] = [];

  // фон: модули в узлах сетки со случайным сдвигом и случаным оттенком
  for (let y = -MODULE; y < H + MODULE; y += MODULE + BG_GAP) {
    for (let x = -MODULE; x < W + MODULE; x += MODULE + BG_GAP) {
      if (hash(x, y, 3 + seed) < 0.12) continue;

      const px = x + (hash(x, y, 1 + seed) - 0.5) * 6;
      const py = y + (hash(x, y, 2 + seed) - 0.5) * 6;

      // 90% модулей тусклые, 10% ярких
      const roll = hash(x, y, 4 + seed);
      const base = roll < 0.9 ? 0.03 + roll * 0.16 : 0.62 + (roll - 0.9) * 3.6;

      // рядом со словом гасим: белое должно читаться максимально контрастно
      const near = wordDistance(mask, px, py);
      const ease = Math.min(1, Math.max(0, (near - 10) / 190));
      const shade = 0.18 + 0.82 * (ease * ease * (3 - 2 * ease));

      const t = base * shade;
      if (t < 0.02) continue;

      background.push(moduleRect(px, py, MODULE, mix(DARK, ACCENT, t)));
    }
  }

  // слово: те же модули, без сдвига — иначе буквы расплываются
  for (let r = 0; r < mask.length; r++) {
    for (let c = 0; c < mask[r].length; c++) {
      if (!mask[r][c]) continue;
      word.push(moduleRect(c * WORD_STEP, r * WORD_STEP, MODULE, "url(#wordShade)"));
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <!-- userSpaceOnUse: цвет зависит от места модуля, а не от его собственной рамки -->
    <linearGradient id="wordShade" gradientUnits="userSpaceOnUse" x1="300" y1="0" x2="690" y2="${H}">
      <stop offset="0" stop-color="#d1fe17"/>
      <stop offset="0.45" stop-color="#e6ff8f"/>
      <stop offset="1" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#08090b"/>
  <g>${background.join("")}</g>
  <g>${word.join("")}</g>
</svg>`;
}

/** Рендерит обложку в PNG нужной ширины. */
export async function coverPng(text: string, width = W): Promise<Buffer> {
  const svg = await coverSvg(text);
  return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng());
}

/* ---------- запуск из консоли ---------- */

if (process.argv[1]?.endsWith("preview-word.mjs")) {
  const run = async () => {
    mkdirSync(".shot", { recursive: true });
    for (const word of ["Wi-Fi", "Logo", "Bitcoin", "SVG"] as CoverWord[]) {
      const svg = await coverSvg(word);
      const png = await coverPng(word);
      const slug = word.toLowerCase().replace(/[^a-z0-9]/g, "");
      writeFileSync(join(".shot", `w-${slug}.svg`), svg);
      writeFileSync(join(".shot", `w-${slug}.png`), png);
      console.log(`${word}: PNG ${Math.round(png.length / 1024)} КБ, SVG ${Math.round(svg.length / 1024)} КБ`);
    }
  };
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
