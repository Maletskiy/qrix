/**
 * Обложки гайдов: только графика, без текста.
 *
 * Вся композиция собрана из модулей QR на одной сетке, у каждой темы своя
 * фигура. Края фигур рассыпаются: часть модулей выпадает по детерминированному
 * «шуму», поэтому граница не векторная, а цифровая. Ядро фигуры белое,
 * остальное — лаймовое, так появляется глубина без второго цвета.
 *
 * Текста на обложке нет намеренно: заголовок есть в карточке и на странице,
 * а картинка должна работать как изображение, в том числе в соцсетях.
 */
import { Resvg } from "@resvg/resvg-js";
import type { CoverKind } from "../../src/landing/types";

const W = 1200;
const H = 630;
const CELL = 20;
const GAP = 3;

/** Детерминированный «шум»: одинаковые картинки на любой машине и в CI. */
function hash(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/** Расстояние до скруглённого прямоугольника: отрицательное — внутри. */
function roundRect(
  x: number,
  y: number,
  cx: number,
  cy: number,
  w: number,
  h: number,
  r: number
): number {
  const dx = Math.abs(x - cx) - w / 2 + r;
  const dy = Math.abs(y - cy) - h / 2 + r;
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - r;
}

type Sample = { cover: number; core: number };

/** Кривая Безье для темы про SVG: точки считаются один раз. */
const curve: [number, number][] = (() => {
  const pts: [number, number][] = [];
  for (let t = 0; t <= 1; t += 0.015) {
    const mt = 1 - t;
    const x = mt ** 3 * 90 + 3 * mt ** 2 * t * 260 + 3 * mt * t ** 2 * 840 + t ** 3 * 1110;
    const y = mt ** 3 * 540 + 3 * mt ** 2 * t * 540 + 3 * mt * t ** 2 * 120 + t ** 3 * 190;
    pts.push([x, y]);
  }
  return pts;
})();

function sample(kind: CoverKind, x: number, y: number): Sample {
  switch (kind) {
    // три волны от нижнего края кадра: композиция симметричная и заполняет поле
    case "wifi": {
      const d = Math.hypot(x - 600, y - 720);
      if (d < 40) return { cover: 1, core: 1 };
      let cover = 0;
      let core = 0;
      for (const radius of [240, 390, 540]) {
        const delta = Math.abs(d - radius);
        if (delta < 40) {
          cover = Math.max(cover, 1 - delta / 40);
          core = Math.max(core, 1 - delta / 14);
        }
      }
      return { cover, core };
    }

    // знак внутри кода: рамка с белой кромкой и точкой в центре
    case "logo": {
      const d = Math.hypot(x - 600, y - 315);
      if (d < 58) return { cover: 1, core: 1 };
      const outer = roundRect(x, y, 600, 315, 440, 440, 112);
      const inner = roundRect(x, y, 600, 315, 208, 208, 54);
      if (outer > 0 || inner < 0) return { cover: 0, core: 0 };
      const depth = Math.min(-outer, inner);
      return { cover: Math.min(1, depth / 12), core: 1 - Math.min(1, depth / 20) };
    }

    // монета: лаймовое тело, белый обод и белое ядро
    case "bitcoin": {
      const d = Math.hypot(x - 600, y - 315);
      if (d > 250) return { cover: 0, core: 0 };
      if (d > 232) return { cover: 1, core: 1 };
      if (d < 112) return { cover: 1, core: 1 };
      return { cover: 1, core: 0 };
    }

    // кривая как в векторном редакторе: тело с белой осевой и опорные точки
    case "svg": {
      // опорные точки на концах — плотные квадраты
      if (Math.hypot(x - 90, y - 540) < 40) return { cover: 1, core: 1 };
      if (Math.hypot(x - 1110, y - 190) < 40) return { cover: 1, core: 1 };

      let best = Infinity;
      for (const [px, py] of curve) {
        const d = Math.hypot(x - px, y - py);
        if (d < best) best = d;
      }
      if (best > 62) return { cover: 0, core: 0 };
      if (best < 26) return { cover: 1, core: best < 10 ? 1 : 0 };
      return { cover: 1 - (best - 26) / 36, core: 0 };
    }
  }
}

/** Собирает SVG обложки: сетка модулей, растворение по краям фигуры. */
export function coverSvg(kind: CoverKind): string {
  const cols = Math.ceil(W / CELL);
  const rows = Math.ceil(H / CELL);
  const cells: string[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * CELL + CELL / 2;
      const y = r * CELL + CELL / 2;
      const { cover, core } = sample(kind, x, y);
      if (cover <= 0.03) continue;

      // рассыпание: ближе к краю фигуры модулей остаётся меньше
      if (hash(c, r) > 0.22 + 0.78 * cover) continue;

      // у самой кромки кадра гасим, чтобы не было резкого обрыва
      const edge = Math.min(x, y, W - x, H - y);
      const edgeFade = Math.min(1, Math.max(0, edge / 40));
      if (edgeFade <= 0.02) continue;

      const alpha = edgeFade * (0.22 + 0.78 * cover);
      const fill = core > 0.55 ? "#ffffff" : "#d1fe17";
      cells.push(
        `<rect x="${c * CELL}" y="${r * CELL}" width="${CELL - GAP}" height="${CELL - GAP}" rx="2" fill="${fill}" opacity="${alpha.toFixed(2)}"/>`
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0f1113"/>
  <g>${cells.join("")}</g>
</svg>`;
}

/** Рендерит обложку в PNG. 1200 — для og:image, 600 — для карточек. */
export function coverPng(kind: CoverKind, width = 1200): Buffer {
  return Buffer.from(new Resvg(coverSvg(kind), { fitTo: { mode: "width", value: width } }).render().asPng());
}
