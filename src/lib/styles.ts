import { t } from "./i18n";
import type { DictKey } from "./i18n/ru";
import type { DotStyle, EyeBallStyle, EyeFrameStyle } from "./render";

export type Option<T extends string> = {
  value: T;
  labelKey: DictKey;
  /** Форма украшает код, но повышает риск, что сканер не сработает */
  risky?: boolean;
};

export const DOT_STYLES: Option<DotStyle>[] = [
  { value: "rounded", labelKey: "shape.rounded" },
  { value: "square", labelKey: "shape.square" },
  { value: "dots", labelKey: "shape.dots" },
  { value: "heart", labelKey: "shape.heart" },
  { value: "diamond", labelKey: "shape.diamond", risky: true },
  { value: "star", labelKey: "shape.star", risky: true },
];

export const EYE_FRAMES: Option<EyeFrameStyle>[] = [
  { value: "rounded", labelKey: "shape.rounded" },
  { value: "square", labelKey: "shape.square" },
  { value: "circle", labelKey: "shape.circle" },
  { value: "diamond", labelKey: "shape.diamond", risky: true },
];

export const EYE_BALLS: Option<EyeBallStyle>[] = [
  { value: "rounded", labelKey: "shape.rounded" },
  { value: "square", labelKey: "shape.square" },
  { value: "dot", labelKey: "shape.dot" },
  { value: "heart", labelKey: "shape.heart" },
  { value: "diamond", labelKey: "shape.diamond", risky: true },
  { value: "star", labelKey: "shape.star", risky: true },
];

/**
 * Минимальный масштаб, при котором форма остаётся читаемой.
 * Значения подобраны тестом: ниже порога jsQR перестаёт распознавать код.
 */
export const SAFE_SHAPE_SCALE: Partial<Record<DotStyle, number>> = {
  heart: 1.18,
  diamond: 1.3,
  star: 1.3,
};

export const DECORATIVE_DOTS: DotStyle[] = ["heart", "diamond", "star"];

/**
 * Минимальный безопасный масштаб круглых точек. Подобрано тестом:
 * при 0.96 и ниже jsQR перестаёт читать средние и длинные коды.
 */
export const DOTS_SAFE_SCALE = 0.98;

export function isRisky(opts: {
  dotStyle?: DotStyle;
  eyeFrame?: EyeFrameStyle;
  eyeBall?: EyeBallStyle;
  shapeScale?: number;
  payloadLength?: number;
}): string | null {
  const short = (opts.payloadLength ?? 100) < 30;
  const decorativeDots = opts.dotStyle === "diamond" || opts.dotStyle === "star";

  if (decorativeDots) return t("risk.decorativeDots");
  if (opts.eyeFrame === "diamond") return t("risk.diamondMarker");
  if (opts.eyeBall === "diamond" || opts.eyeBall === "star") return t("risk.oddCore");
  if (short && (opts.dotStyle === "dots" || opts.dotStyle === "heart")) return t("risk.shortCode");
  if (opts.dotStyle === "heart" && (opts.shapeScale ?? 1) < (SAFE_SHAPE_SCALE.heart ?? 1)) {
    return t("risk.smallHearts");
  }
  if (opts.dotStyle === "dots" && (opts.shapeScale ?? 1) < DOTS_SAFE_SCALE) {
    return t("risk.smallDots");
  }
  return null;
}
