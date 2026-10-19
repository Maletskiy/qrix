import {
  circle,
  circleCCW,
  diamondCCW,
  diamondCW,
  heartPath,
  rectCCW,
  rectCW,
  starPath,
} from "../lib/render";
import type { DotStyle, EyeBallStyle, EyeFrameStyle } from "../lib/render";

/** Иконка показывает сам узор: для модулей — ритм из 3×3 фигур, для маркеров — сам маркер. */
export default function ShapeIcon({
  kind,
  value,
  size = 26,
}: {
  kind: "dot" | "frame" | "ball";
  value: DotStyle | EyeFrameStyle | EyeBallStyle;
  size?: number;
}) {
  let viewBox = "0 0 3 3";
  const d: string[] = [];

  if (kind === "dot") {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const x = c;
        const y = r;
        const solid = r !== 1 || c !== 1; // центр пустой — так рисунок читается
        if (!solid) continue;
        switch (value) {
          case "square":
            d.push(rectCW(x + 0.04, y + 0.04, 0.92, 0.92, [0, 0, 0, 0]));
            break;
          case "dots":
            d.push(circle(x + 0.5, y + 0.5, 0.42));
            break;
          case "heart":
            d.push(heartPath(x + 0.02, y + 0.02, 0.96));
            break;
          case "diamond":
            d.push(diamondCW(x + 0.5, y + 0.5, 0.46));
            break;
          case "star":
            d.push(starPath(x + 0.02, y + 0.02, 0.96, 0.62));
            break;
          default:
            d.push(rectCW(x + 0.03, y + 0.03, 0.94, 0.94, [0.3, 0.3, 0.3, 0.3]));
        }
      }
    }
  } else if (kind === "frame") {
    viewBox = "0 0 7 7";
    if (value === "circle") {
      d.push(circle(3.5, 3.5, 3.2), circleCCW(3.5, 3.5, 2.3));
    } else if (value === "diamond") {
      d.push(diamondCW(3.5, 3.5, 3.3), diamondCCW(3.5, 3.5, 2.3));
    } else {
      const outer: [number, number, number, number] = value === "rounded" ? [2.1, 2.1, 2.1, 2.1] : [0.2, 0.2, 0.2, 0.2];
      const inner: [number, number, number, number] = value === "rounded" ? [1.1, 1.1, 1.1, 1.1] : [0, 0, 0, 0];
      d.push(rectCW(0.25, 0.25, 6.5, 6.5, outer), rectCCW(1.25, 1.25, 4.5, 4.5, inner));
    }
  } else {
    viewBox = "0 0 3 3";
    switch (value) {
      case "dot":
        d.push(circle(1.5, 1.5, 1.35));
        break;
      case "diamond":
        d.push(diamondCW(1.5, 1.5, 1.45));
        break;
      case "heart":
        d.push(heartPath(0.05, 0.05, 2.9));
        break;
      case "star":
        d.push(starPath(0.05, 0.05, 2.9, 0.62));
        break;
      case "rounded":
        d.push(rectCW(0.15, 0.15, 2.7, 2.7, [0.85, 0.85, 0.85, 0.85]));
        break;
      default:
        d.push(rectCW(0.15, 0.15, 2.7, 2.7, [0, 0, 0, 0]));
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="currentColor"
      fillRule="nonzero"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d.join("")} />
    </svg>
  );
}
