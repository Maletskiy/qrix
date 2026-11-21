/**
 * Цвет акцента для эффекта: берём самый насыщенный непрозрачный пиксель
 * логотипа (у Qrix это лаймовый квадрат), а если логотипа нет — фирменный.
 */
export const BRAND_ACCENT = "#d1fe17";

const cache = new Map<string, string>();

function toHex(r: number, g: number, b: number): string {
  const h = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Достаёт акцент из логотипа. Возвращает брендовый цвет, если не вышло. */
export function accentFromLogo(dataUrl: string | null): Promise<string> {
  if (!dataUrl) return Promise.resolve(BRAND_ACCENT);
  const cached = cache.get(dataUrl);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const size = 24;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(BRAND_ACCENT);
        ctx.drawImage(image, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        let best = BRAND_ACCENT;
        let bestScore = -1;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 200) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          // насыщенность важнее яркости, но чистый белый/чёрный не берём
          const score = sat * (0.4 + 0.6 * (1 - Math.abs(lum - 0.5) * 1.4));
          if (score > bestScore) {
            bestScore = score;
            best = toHex(r, g, b);
          }
        }
        cache.set(dataUrl, best);
        resolve(best);
      } catch {
        resolve(BRAND_ACCENT);
      }
    };
    image.onerror = () => resolve(BRAND_ACCENT);
    image.src = dataUrl;
  });
}
