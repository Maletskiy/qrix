/**
 * Обложки гайдов: рендер в dist/covers/.
 *
 * Картинки не хранятся в репозитории, а собираются кодом при каждом билде:
 * слово из белых модулей на хаотичном зелёном поле. Поэтому обложка весит
 * десятки килобайт вместо сотен, масштабируется без потерь и гарантированно
 * одинакова по стилю у всех четырёх тем.
 *
 * Размеры: 1200×630 для og:image, 600×315 для карточек в списках.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { coverPng } from "./preview-word";

const OUT = join("dist", "covers");

/** Тема обложки и слово, которое на ней выложено. */
const COVERS: { kind: string; word: string }[] = [
  { kind: "wifi", word: "Wi-Fi" },
  { kind: "logo", word: "Logo" },
  { kind: "bitcoin", word: "Bitcoin" },
  { kind: "svg", word: "SVG" },
];

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });

  for (const { kind, word } of COVERS) {
    const big = await coverPng(word, 1200);
    const small = await coverPng(word, 600);

    writeFileSync(join(OUT, `${kind}.png`), big);
    writeFileSync(join(OUT, `${kind}-sm.png`), small);

    console.log(
      `${kind}: ${Math.round(big.length / 1024)} КБ, компактная ${Math.round(small.length / 1024)} КБ`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
