/**
 * Обложки гайдов из исходных картинок.
 *
 * Исходники лежат в assets/covers/<тема>.png и нарисованы внешней моделью.
 * Скрипт приводит их к виду, пригодному для сайта:
 *
 *  1. дуотон — вся картинка перекрашивается в палитру бренда: фон #0F1113,
 *     акцент #D1FE17, блик #EAFFB4. Поэтому четыре разные генерации выглядят
 *     как одна серия, даже если модель чуть увела цвет;
 *  2. нормализация контраста по перцентилям: каждая картинка растягивается
 *     в один и тот же диапазон, иначе одна будет ярче другой;
 *  3. кроп по центру до пропорции 1.9:1 (1200×630) и два размера на выходе.
 *
 * Размеры: 1200×630 для og:image, 600×315 для карточек в списках.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { Resvg } from "@resvg/resvg-js";

const W = 1200;
const H = 630;
const RATIO = W / H;

const SOURCE = "assets/covers";
const OUT = join("dist", "covers");

/** Палитра: тень → акцент → блик. */
const SHADOW = [0x0f, 0x11, 0x13];
const ACCENT = [0xd1, 0xfe, 0x17];
const HIGHLIGHT = [0xea, 0xff, 0xb4];

/** Точка перехода от тени к акценту внутри шкалы 0..1. */
const MID = 0.62;

/** Сколько ступеней яркости оставляем после дуотона. */
const LEVELS = 72;

/** Простое усреднение по квадрату: убирает шум генерации. */
function boxBlur(src: Float64Array, width: number, height: number, radius: number): Float64Array {
  const out = new Float64Array(src.length);
  const side = radius * 2 + 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          sum += src[yy * width + xx];
          n++;
        }
      }
      out[y * width + x] = sum / n;
    }
  }
  return out;
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/** Цвет палитры для нормализованной яркости t в диапазоне 0..1. */
function duotone(t: number): [number, number, number] {
  if (t <= MID) {
    const k = t / MID;
    return [
      lerp(SHADOW[0], ACCENT[0], k),
      lerp(SHADOW[1], ACCENT[1], k),
      lerp(SHADOW[2], ACCENT[2], k),
    ];
  }
  const k = (t - MID) / (1 - MID);
  return [
    lerp(ACCENT[0], HIGHLIGHT[0], k),
    lerp(ACCENT[1], HIGHLIGHT[1], k),
    lerp(ACCENT[2], HIGHLIGHT[2], k),
  ];
}

/** Значение яркости по перцентилю — для нормализации контраста. */
function percentile(sorted: Float64Array, p: number): number {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[index];
}

type Processed = { png: Buffer; width: number; height: number };

function process(file: string, levels: number): Processed {
  const png = PNG.sync.read(readFileSync(file));
  const { width, height, data } = png;

  // 1. яркость всех пикселей
  const lum = new Float64Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    lum[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }

  // 2. границы нормализации: 1% и 99.5% — выбросы не должны задавать диапазон
  const sorted = Float64Array.from(lum).sort();
  const lo = percentile(sorted, 0.01);
  const hi = percentile(sorted, 0.995);
  const span = Math.max(1, hi - lo);

  // 3. лёгкое размытие: у генераций шум в тенях, он мешает и сжатию, и виду
  const smooth = boxBlur(lum, width, height, 1);

  // 4. уровни: тени сажаем в ноль, света растягиваем. Объект на всех
  //    генерациях занимает разную площадь, поэтому границы берём по
  //    перцентилям, а не по абсолютной яркости.
  const pBlack = percentile(sorted, 0.32);
  const pWhite = percentile(sorted, 0.995);
  const range = Math.max(1, pWhite - pBlack);

  const normalized = Float64Array.from(smooth, (v) =>
    Math.min(1, Math.max(0, (v - pBlack) / range))
  );

  // 4. дуотон с квантованием: после него оттенков десятки, а не тысячи,
  //    поэтому PNG сжимается в разы
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    // мягкая S-кривая по середине и компрессия светов: без неё ближние
    // кубики выгорают в белое пятно
    const v = normalized[p];
    const s0 = v * v * (3 - 2 * v);
    const shaped = s0 > 0.8 ? 0.8 + (s0 - 0.8) * 0.55 : s0;
    const t = Math.round(shaped * levels) / levels;
    const [r, g, b] = duotone(t);
    // виньетка: у генераций свет падает по-разному, общее затемнение к краям
    // приводит их к одному виду и добавляет глубины
    const cx = (i / 4) % width;
    const cy = Math.floor(i / 4 / width);
    const dx = (cx - width / 2) / (width / 2);
    const dy = (cy - height / 2) / (height / 2);
    const vignette = 1 - Math.pow(Math.min(1, Math.hypot(dx, dy) / 1.5), 2.2) * 0.55;

    data[i] = Math.round(r * vignette);
    data[i + 1] = Math.round(g * vignette);
    data[i + 2] = Math.round(b * vignette);
    data[i + 3] = 255;
  }

  return { png: PNG.sync.write(png, { colorType: 6, deflateLevel: 9 }), width, height };
}

/**
 * Центр масс ярких пикселей: у генераций объект стоит не по центру,
 * и при кропе композиция уезжает вбок.
 */
function centreOfMass(png: PNG): { x: number; y: number } {
  const { data, width, height } = png;
  let sumW = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (l < 45) continue;
      const w = l - 45;
      sumW += w;
      sumX += x * w;
      sumY += y * w;
    }
  }
  return sumW > 0 ? { x: sumX / sumW, y: sumY / sumW } : { x: width / 2, y: height / 2 };
}

/**
 * Собирает окно нужной пропорции, ставя центр масс объекта в центр кадра.
 *
 * Окно не выходит за границы картинки: если объект смещён, окно
 * уменьшается вокруг него, а не сдвигается за край. Иначе пришлось бы
 * заполнять пустоту, и шов был бы заметнее, чем смещение.
 */
function compose(src: Processed, offsetX: number, offsetY: number, cropW: number, cropH: number): Buffer {
  const original = PNG.sync.read(src.png);
  const { width: sw, data } = original;
  const out = new PNG({ width: cropW, height: cropH });

  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const from = ((y + offsetY) * sw + (x + offsetX)) * 4;
      const to = (y * cropW + x) * 4;
      out.data[to] = data[from];
      out.data[to + 1] = data[from + 1];
      out.data[to + 2] = data[from + 2];
      out.data[to + 3] = 255;
    }
  }

  return PNG.sync.write(out, { colorType: 6, deflateLevel: 9 });
}

/** Кроп с центрированием и рендер в нужной ширине. */
function render(src: Processed, width: number): Buffer {
  const { width: sw, height: sh } = src;
  const centre = centreOfMass(PNG.sync.read(src.png));

  // базовое окно — во всю ширину
  let cropW = sw;
  let cropH = Math.round(sw / RATIO);
  if (cropH > sh) {
    cropH = sh;
    cropW = Math.round(sh * RATIO);
  }

  // центрируем только те картинки, где объект заметно уехал от середины.
  // Мелкое смещение — это композиция автора, её трогать не нужно.
  const shift = Math.abs(centre.x - sw / 2);
  const OFF_CENTRE = sw * 0.15;

  const roomLeft = Math.max(0, centre.x - cropW / 2);
  const roomRight = Math.max(0, sw - centre.x - cropW / 2);
  const slack = Math.min(roomLeft, roomRight);

  if (shift > OFF_CENTRE && slack < 1) {
    // объекта не сдвинуть — уменьшаем окно вокруг него, пока не влезет
    const maxHalf = Math.min(centre.x, sw - centre.x);
    const maxHalfV = Math.min(centre.y, sh - centre.y);
    cropW = Math.floor(Math.min(maxHalf * 2, sw, maxHalfV * 2 * RATIO));
    cropH = Math.round(cropW / RATIO);
    if (cropH > sh) {
      cropH = sh;
      cropW = Math.round(sh * RATIO);
    }
  }

  const targetX = shift > OFF_CENTRE ? centre.x : sw / 2;
  const offsetX = Math.round(Math.min(sw - cropW, Math.max(0, targetX - cropW / 2)));
  const offsetY = Math.round(
    Math.min(sh - cropH, Math.max(0, centre.y - cropH / 2))
  );

  const framed = compose(src, offsetX, offsetY, cropW, cropH);
  const href = `data:image/png;base64,${framed.toString("base64")}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.round(
    width / RATIO
  )}" viewBox="0 0 ${cropW} ${cropH}">
    <image x="0" y="0" width="${cropW}" height="${cropH}" href="${href}" preserveAspectRatio="none"/>
  </svg>`;

  return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng());
}

function main(): void {
  mkdirSync(OUT, { recursive: true });

  const kinds = ["wifi", "logo", "bitcoin", "svg"];
  for (const kind of kinds) {
    const source = join(SOURCE, `${kind}.png`);
    // большую версию квантуем мелко, маленькую — грубее: на 600px ступеней не видно
    const big = render(process(source, LEVELS), W);
    const small = render(process(source, 28), 600);

    writeFileSync(join(OUT, `${kind}.png`), big);
    writeFileSync(join(OUT, `${kind}-sm.png`), small);

    console.log(
      `${kind}: ${Math.round(big.length / 1024)} КБ, ${Math.round(small.length / 1024)} КБ`
    );
  }
}

main();
