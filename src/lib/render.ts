export type DotStyle = "square" | "rounded" | "dots" | "heart" | "diamond" | "star";
export type EyeFrameStyle = "square" | "rounded" | "circle" | "diamond";
export type EyeBallStyle = "square" | "rounded" | "dot" | "heart" | "diamond" | "star";
export type FillMode = "solid" | "gradient";
export type GradientKind = "vertical" | "horizontal" | "diagonal" | "diagonalRev" | "radial";

export type CaptionOptions = {
  enabled: boolean;
  text: string;
  color: string;
  font: string;
  /** Множитель размера подписи: 1 — базовый */
  scale: number;
};

export type RenderOptions = {
  matrix: boolean[][];
  size: number;
  margin: number;
  dotStyle: DotStyle;
  eyeFrame: EyeFrameStyle;
  eyeBall: EyeBallStyle;
  fillMode: FillMode;
  gradientKind: GradientKind;
  color1: string;
  color2: string;
  bgColor: string;
  bgTransparent: boolean;
  logo: string | null;
  logoRatio: number;
  logoPadding: number;
  logoRadius: number;
  caption: CaptionOptions;
  /** Масштаб декоративных модулей: нужен, чтобы держать читаемость кода */
  shapeScale: number;
  /** Радиус круглых точек */
  dotRadius: number;
};

/**
 * Контуры глифов для подписи. Таблица большая (сотни символов), поэтому
 * грузится отдельным чанком по требованию, а не в основной сборке.
 */
type GlyphTable = {
  metrics: { unitsPerEm: number; ascender: number; descender: number };
  glyphs: Record<string, [number, string]>;
};

let glyphTable: GlyphTable | null = null;

/** Подгружает контуры глифов. Вызывается при старте приложения. */
export async function ensureCaptionGlyphs(): Promise<void> {
  if (glyphTable) return;
  try {
    const mod = await import("./captionGlyphs");
    glyphTable = { metrics: mod.CAPTION_FONT_METRICS, glyphs: mod.CAPTION_GLYPHS };
  } catch {
    glyphTable = null;
  }
}

/** Готовы ли контуры (если нет — подпись уйдёт тегом <text>). */
export function captionGlyphsReady(): boolean {
  return glyphTable !== null;
}

/**
 * Подпись вектором: собираем контуры глифов в пути.
 * Возвращает null, если шрифт не наш или не хватает какого-то символа.
 */
function vectorCaption(
  text: string,
  total: number,
  baselineY: number,
  fontUnits: number,
  color: string
): string | null {
  if (!glyphTable) return null;

  const { unitsPerEm } = glyphTable.metrics;
  const scale = fontUnits / unitsPerEm;

  let advance = 0;
  const parts: string[] = [];
  for (const char of text) {
    const glyph = glyphTable.glyphs[char];
    if (!glyph) return null; // незнакомый символ — откатываемся на <text>
    const [width, d] = glyph;
    if (d) parts.push(`<path d="${d}" transform="translate(${advance} 0)"/>`);
    advance += width;
  }

  const startX = total / 2 - (advance * scale) / 2;
  return `<g transform="translate(${r6(startX)} ${r6(baselineY)}) scale(${r6(
    scale
  )})" fill="${color}">${parts.join("")}</g>`;
}

/**
 * Подпись задаётся долей ширины кода, а не пикселями итогового файла:
 * иначе её размер зависел от настройки «Размер PNG» и от сложности кода.
 * 0.039 — исторические 28px на коде шириной 53 модуля при файле 720px.
 */
export const CAPTION_SIZE_RATIO = 0.039;
/** Зазор между кодом и подписью как доля её высоты. */
export const CAPTION_GAP_RATIO = 0.21;

/** Зазор между логотипом и первым модулем кода, в модулях. */
export const LOGO_SAFE_GAP = 0.7;

const r3 = (v: number) => Math.round(v * 1000) / 1000;
/** Масштаб глифов: три знака после запятой дают заметную ошибку размера */
const r6 = (v: number) => Math.round(v * 1e6) / 1e6;
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Radii = [number, number, number, number];

/**
 * Достаём содержимое SVG-логотипа, чтобы вставить его вектором.
 * Figma (и часть других редакторов) не отрисовывает <image> с data-URL,
 * а обычные пути из вложенного SVG читает нормально.
 */
function inlineSvgLogo(dataUrl: string): { inner: string; w: number; h: number } | null {
  if (!/^data:image\/svg\+xml/i.test(dataUrl)) return null;
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;

  const meta = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  let text: string;
  try {
    text = /;base64/i.test(meta) ? atob(payload) : decodeURIComponent(payload);
  } catch {
    return null;
  }

  const open = text.match(/<svg\b[^>]*>/i);
  const close = text.lastIndexOf("</svg>");
  if (!open || close < 0) return null;

  const tag = open[0];
  let w = 0;
  let h = 0;

  const vb = tag.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (vb) {
    const parts = vb[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      w = parts[2];
      h = parts[3];
    }
  }
  if (!w || !h) {
    const wm = tag.match(/\swidth\s*=\s*["']([\d.]+)/i);
    const hm = tag.match(/\sheight\s*=\s*["']([\d.]+)/i);
    if (wm && hm) {
      w = Number(wm[1]);
      h = Number(hm[1]);
    }
  }
  if (!w || !h) return null;

  // логотип попадает в разметку страницы, поэтому скрипты и обработчики убираем
  const inner = text
    .slice(open.index! + tag.length, close)
    .replace(/<script[\s\S]*?<\/script/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .trim();

  return inner ? { inner, w, h } : null;
}

/** Прямоугольник по часовой стрелке — для заливки. */
export function rectCW(x: number, y: number, w: number, h: number, radii: Radii): string {
  const [tl, tr, br, bl] = radii.map(r3) as Radii;
  const x1 = r3(x);
  const y1 = r3(y);
  const x2 = r3(x + w);
  const y2 = r3(y + h);
  const p = [`M${r3(x1 + tl)} ${y1}`, `H${r3(x2 - tr)}`];
  if (tr) p.push(`A${tr} ${tr} 0 0 1 ${x2} ${r3(y1 + tr)}`);
  p.push(`V${r3(y2 - br)}`);
  if (br) p.push(`A${br} ${br} 0 0 1 ${r3(x2 - br)} ${y2}`);
  p.push(`H${r3(x1 + bl)}`);
  if (bl) p.push(`A${bl} ${bl} 0 0 1 ${x1} ${r3(y2 - bl)}`);
  p.push(`V${r3(y1 + tl)}`);
  if (tl) p.push(`A${tl} ${tl} 0 0 1 ${r3(x1 + tl)} ${y1}`);
  p.push("Z");
  return p.join("");
}

/**
 * Тот же прямоугольник против часовой стрелки — для внутреннего контура.
 * При fill-rule="nonzero" встречное направление даёт отверстие,
 * поэтому рамка маркера остаётся частью одного вектора.
 */
export function rectCCW(x: number, y: number, w: number, h: number, radii: Radii): string {
  const [tl, tr, br, bl] = radii.map(r3) as Radii;
  const x1 = r3(x);
  const y1 = r3(y);
  const x2 = r3(x + w);
  const y2 = r3(y + h);
  const p = [`M${x1} ${r3(y1 + tl)}`, `V${r3(y2 - bl)}`];
  if (bl) p.push(`A${bl} ${bl} 0 0 0 ${r3(x1 + bl)} ${y2}`);
  p.push(`H${r3(x2 - br)}`);
  if (br) p.push(`A${br} ${br} 0 0 0 ${x2} ${r3(y2 - br)}`);
  p.push(`V${r3(y1 + tr)}`);
  if (tr) p.push(`A${tr} ${tr} 0 0 0 ${r3(x2 - tr)} ${y1}`);
  p.push(`H${r3(x1 + tl)}`);
  if (tl) p.push(`A${tl} ${tl} 0 0 0 ${x1} ${r3(y1 + tl)}`);
  p.push("Z");
  return p.join("");
}

export function diamondCW(cx: number, cy: number, d: number): string {
  return `M${r3(cx)} ${r3(cy - d)}L${r3(cx + d)} ${r3(cy)}L${r3(cx)} ${r3(cy + d)}L${r3(cx - d)} ${r3(cy)}Z`;
}

export function diamondCCW(cx: number, cy: number, d: number): string {
  return `M${r3(cx)} ${r3(cy - d)}L${r3(cx - d)} ${r3(cy)}L${r3(cx)} ${r3(cy + d)}L${r3(cx + d)} ${r3(cy)}Z`;
}

export function circle(cx: number, cy: number, r: number): string {
  return `M${r3(cx - r)} ${r3(cy)}a${r3(r)} ${r3(r)} 0 1 0 ${r3(r * 2)} 0a${r3(r)} ${r3(
    r
  )} 0 1 0 ${r3(-r * 2)} 0Z`;
}

export function circleCCW(cx: number, cy: number, r: number): string {
  return `M${r3(cx - r)} ${r3(cy)}a${r3(r)} ${r3(r)} 0 1 1 ${r3(r * 2)} 0a${r3(r)} ${r3(
    r
  )} 0 1 1 ${r3(-r * 2)} 0Z`;
}

/** Сердце в квадрате (x, y, s). */
export function heartPath(x: number, y: number, s: number): string {
  const p = (ux: number) => r3(x + ux * s);
  const q = (uy: number) => r3(y + uy * s);
  return [
    `M${p(0.5)} ${q(0.96)}`,
    `C${p(0.5)} ${q(0.96)} ${p(0.02)} ${q(0.64)} ${p(0.02)} ${q(0.34)}`,
    `C${p(0.02)} ${q(0.14)} ${p(0.16)} ${q(0.02)} ${p(0.32)} ${q(0.02)}`,
    `C${p(0.43)} ${q(0.02)} ${p(0.48)} ${q(0.1)} ${p(0.5)} ${q(0.17)}`,
    `C${p(0.52)} ${q(0.1)} ${p(0.57)} ${q(0.02)} ${p(0.68)} ${q(0.02)}`,
    `C${p(0.84)} ${q(0.02)} ${p(0.98)} ${q(0.14)} ${p(0.98)} ${q(0.34)}`,
    `C${p(0.98)} ${q(0.64)} ${p(0.5)} ${q(0.96)} ${p(0.5)} ${q(0.96)}`,
    "Z",
  ].join("");
}

/** Четырёхконечная звезда. waist ближе к 0 — лучи тоньше, ближе к 1 — ромбовиднее. */
export function starPath(x: number, y: number, s: number, waist = 0.55): string {
  const P = (u: number) => r3(x + u * s);
  const Q = (v: number) => r3(y + v * s);
  const pt = (u: number, v: number) => `${P(u)} ${Q(v)}`;
  return [
    `M${pt(0.5, 0)}`,
    `Q${pt(0.5 + 0.25 * waist, 0.5 - 0.25 * waist)} ${pt(1, 0.5)}`,
    `Q${pt(0.5 + 0.25 * waist, 0.5 + 0.25 * waist)} ${pt(0.5, 1)}`,
    `Q${pt(0.5 - 0.25 * waist, 0.5 + 0.25 * waist)} ${pt(0, 0.5)}`,
    `Q${pt(0.5 - 0.25 * waist, 0.5 - 0.25 * waist)} ${pt(0.5, 0)}`,
    "Z",
  ].join("");
}

function gradientDefs(id: string, kind: GradientKind, c1: string, c2: string): string {
  if (kind === "radial") {
    return `<radialGradient id="${id}" cx="0.5" cy="0.5" r="0.75"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>`;
  }
  const coords: Record<string, [number, number, number, number]> = {
    vertical: [0, 0, 0, 1],
    horizontal: [0, 0, 1, 0],
    diagonal: [0, 0, 1, 1],
    diagonalRev: [1, 0, 0, 1],
  };
  const [x1, y1, x2, y2] = coords[kind] ?? coords.diagonal;
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`;
}

export function renderSvg(o: RenderOptions): string {
  const n = o.matrix.length;
  if (!n) return "";

  const uid = "q" + Math.random().toString(36).slice(2, 8);
  const fill = o.fillMode === "gradient" ? `url(#${uid})` : o.color1;

  const inFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

  const isDark = (r: number, c: number) => r >= 0 && c >= 0 && r < n && c < n && o.matrix[r][c];

  const total = n + o.margin * 2;
  const hasCaption = o.caption.enabled && o.caption.text.trim().length > 0;
  // размер кегля — доля ширины кода, поэтому от «Размер PNG» не зависит
  const fontUnits = total * CAPTION_SIZE_RATIO * (o.caption.scale ?? 1);
  const gapUnits = fontUnits * CAPTION_GAP_RATIO;
  // снизу оставляем такой же отступ, как поля вокруг самого кода
  const bottomPad = o.margin;
  const vbH = total + (hasCaption ? gapUnits + fontUnits * 1.05 + bottomPad : 0);

  const ox = o.margin;
  const oy = o.margin;

  // --- зона логотипа: модули под ним не рисуем, а вырезаем ---
  let logoSize = 0;
  let plateSize = 0;
  let excHalf = -1;
  if (o.logo) {
    logoSize = Math.max(2, n * o.logoRatio);
    plateSize = logoSize + o.logoPadding * 2;
    excHalf = plateSize / 2 + LOGO_SAFE_GAP;
  }
  const cxAll = ox + n / 2;
  const cyAll = oy + n / 2;
  const insideLogo = (r: number, c: number) => {
    if (excHalf < 0) return false;
    return Math.abs(ox + c + 0.5 - cxAll) < excHalf && Math.abs(oy + r + 0.5 - cyAll) < excHalf;
  };

  // --- всё содержимое кода собираем в один путь ---
  const d: string[] = [];

  const roundRect = (x: number, y: number, w: number, radii: Radii) => rectCW(x, y, w, w, radii);
  const shapeScale = o.shapeScale;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!o.matrix[r][c] || inFinder(r, c) || insideLogo(r, c)) continue;
      const x = ox + c;
      const y = oy + r;

      switch (o.dotStyle) {
        case "square":
          d.push(roundRect(x, y, 1, [0, 0, 0, 0]));
          break;
        case "dots":
          d.push(circle(x + 0.5, y + 0.5, o.dotRadius * shapeScale));
          break;
        case "diamond": {
          const k = shapeScale;
          d.push(diamondCW(x + 0.5, y + 0.5, 0.5 * k));
          break;
        }
        case "heart": {
          const k = shapeScale;
          const inset = (1 - k) / 2;
          d.push(heartPath(x + inset, y + inset, k));
          break;
        }
        case "star": {
          const k = shapeScale;
          const inset = (1 - k) / 2;
          d.push(starPath(x + inset, y + inset, k));
          break;
        }
        default: {
          // скругление: радиус только у свободных углов, чтобы модули сливались
          const radius = 0.34;
          const up = isDark(r - 1, c) && !inFinder(r - 1, c);
          const down = isDark(r + 1, c) && !inFinder(r + 1, c);
          const left = isDark(r, c - 1) && !inFinder(r, c - 1);
          const right = isDark(r, c + 1) && !inFinder(r, c + 1);
          d.push(
            roundRect(x, y, 1, [
              !up && !left ? radius : 0,
              !up && !right ? radius : 0,
              !down && !right ? radius : 0,
              !down && !left ? radius : 0,
            ])
          );
        }
      }
    }
  }

  // --- маркеры позиционирования: кольцо как контур наружу + контур внутрь ---
  const eyePositions: [number, number][] = [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ];

  for (const [r, c] of eyePositions) {
    const x = ox + c;
    const y = oy + r;
    const cx = x + 3.5;
    const cy = y + 3.5;

    if (o.eyeFrame === "circle") {
      d.push(circle(cx, cy, 3.5));
      d.push(circleCCW(cx, cy, 2.5));
    } else if (o.eyeFrame === "diamond") {
      d.push(diamondCW(cx, cy, 3.5));
      d.push(diamondCCW(cx, cy, 2.5));
    } else {
      const outer: Radii =
        o.eyeFrame === "rounded" ? [2.2, 2.2, 2.2, 2.2] : [0, 0, 0, 0];
      const inner: Radii =
        o.eyeFrame === "rounded" ? [1.2, 1.2, 1.2, 1.2] : [0, 0, 0, 0];
      d.push(rectCW(x, y, 7, 7, outer));
      d.push(rectCCW(x + 1, y + 1, 5, 5, inner));
    }

    // ядро маркера
    const bx = x + 2;
    const by = y + 2;
    switch (o.eyeBall) {
      case "dot":
        d.push(circle(cx, cy, 1.5));
        break;
      case "diamond":
        d.push(diamondCW(cx, cy, 1.65));
        break;
      case "heart":
        d.push(heartPath(bx - 0.15, by - 0.15, 3.3));
        break;
      case "star":
        d.push(starPath(bx - 0.15, by - 0.15, 3.3, 0.6));
        break;
      case "rounded":
        d.push(rectCW(bx, by, 3, 3, [0.95, 0.95, 0.95, 0.95]));
        break;
      default:
        d.push(rectCW(bx, by, 3, 3, [0, 0, 0, 0]));
    }
  }

  // --- логотип ---
  let logoMarkup = "";
  if (o.logo) {
    const px = cxAll - plateSize / 2;
    const py = cyAll - plateSize / 2;
    const plateR = (plateSize / 2) * o.logoRadius;
    const imgR = (logoSize / 2) * o.logoRadius;
    const clipId = `${uid}-clip`;
    const plateColor = o.bgTransparent ? "#ffffff" : o.bgColor;
    const imgX = cxAll - logoSize / 2;
    const imgY = cyAll - logoSize / 2;
    const clipPath =
      `<clipPath id="${clipId}"><path d="${rectCW(imgX, imgY, logoSize, logoSize, [
        imgR,
        imgR,
        imgR,
        imgR,
      ])}"/></clipPath>`;

    const vector = inlineSvgLogo(o.logo);
    let logoBody: string;

    if (vector) {
      // SVG-логотип вставляем путями: так он виден в Figma и остаётся вектором
      const scale = Math.min(logoSize / vector.w, logoSize / vector.h);
      const dx = imgX + (logoSize - vector.w * scale) / 2;
      const dy = imgY + (logoSize - vector.h * scale) / 2;
      logoBody =
        `<g transform="translate(${r3(dx)} ${r3(dy)}) scale(${r3(scale)})">${vector.inner}</g>`;
    } else {
      logoBody =
        `<image href="${o.logo}" x="${r3(imgX)}" y="${r3(imgY)}" width="${r3(logoSize)}" height="${r3(
          logoSize
        )}" preserveAspectRatio="xMidYMid meet"/>`;
    }

    logoMarkup =
      `<path d="${rectCW(px, py, plateSize, plateSize, [plateR, plateR, plateR, plateR])}" fill="${plateColor}"/>` +
      clipPath +
      `<g clip-path="url(#${clipId})">${logoBody}</g>`;
  }

  const captionBaseline = total + gapUnits + fontUnits * 0.78;
  const vector =
    hasCaption && /google sans/i.test(o.caption.font)
      ? vectorCaption(o.caption.text, total, captionBaseline, fontUnits, o.caption.color)
      : null;

  const captionMarkup = !hasCaption
    ? ""
    : vector
      ? vector
      : `<text x="${r3(total / 2)}" y="${r3(captionBaseline)}" text-anchor="middle" ` +
        `font-family="${esc(o.caption.font)}" font-size="${r3(fontUnits)}" font-weight="500" ` +
        `fill="${o.caption.color}">${esc(o.caption.text)}</text>`;

  const defs = o.fillMode === "gradient" ? gradientDefs(uid, o.gradientKind, o.color1, o.color2) : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${o.size}" height="${Math.round(
    (o.size * vbH) / total
  )}" viewBox="0 0 ${r3(total)} ${r3(vbH)}" shape-rendering="geometricPrecision">
  ${defs ? `<defs>${defs}</defs>` : ""}
  <g id="qr">
    ${
      o.bgTransparent
        ? ""
        : `<rect x="0" y="0" width="${r3(total)}" height="${r3(vbH)}" fill="${o.bgColor}"/>`
    }
    <path d="${d.join("")}" fill="${fill}" fill-rule="nonzero"/>
    ${logoMarkup}
    ${captionMarkup}
  </g>
</svg>`;
}

/** Относительная яркость по WCAG — для проверки контраста кода и фона. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const clean = hex.replace("#", "");
    const full =
      clean.length === 3
        ? clean
            .split("")
            .map((ch) => ch + ch)
            .join("")
        : clean;
    const rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
    const [r, g, bl] = rgb.map((v) =>
      v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const l1 = lum(a);
  const l2 = lum(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
