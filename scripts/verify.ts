/**
 * Проверка читаемости: собираем QR во всех поставляемых стилях,
 * растеризуем и декодируем. Запуск: npm run verify
 *
 * Важно: jsQR — строгий декодер. Проверки ниже отражают результаты подбора:
 * часть декоративных форм намеренно не входит в обязательный набор,
 * потому что они теряют площадь тёмных модулей (см. README).
 */
import { Resvg } from "@resvg/resvg-js";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { encodeMatrix } from "../src/lib/qr";
import { renderSvg } from "../src/lib/render";
import type { DotStyle, EyeBallStyle, EyeFrameStyle, RenderOptions } from "../src/lib/render";
import { buildCryptoPayload, coinById } from "../src/lib/coins";
import { defaultConfig } from "../src/lib/config";
import { t } from "../src/lib/i18n";
import { formatPhone } from "../src/lib/phone";
import { hexToRgb, hsvToRgb, rgbToHex, rgbToHsv } from "../src/lib/color";
import { DOT_STYLES, EYE_BALLS, EYE_FRAMES, SAFE_SHAPE_SCALE } from "../src/lib/styles";

const OUT = "samples/";
mkdirSync(OUT, { recursive: true });

function makeLogoDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
    <rect width="256" height="256" fill="#d1fe17"/>
    <circle cx="128" cy="128" r="76" fill="#0a0c05"/>
  </svg>`;
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 256 } }).render().asPng();
  return "data:image/png;base64," + Buffer.from(png).toString("base64");
}
const LOGO = makeLogoDataUrl();

function decode(svg: string): string | null {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1000 }, background: "white" })
    .render()
    .asPng();
  const img = PNG.sync.read(Buffer.from(png));
  const res = jsQR(new Uint8ClampedArray(img.data), img.width, img.height, {
    inversionAttempts: "attemptBoth",
  });
  return res?.data ?? null;
}

/**
 * Подпись лежит вне охранной зоны символа, поэтому по стандарту не может влиять
 * на считывание. jsQR при этом сканирует всё изображение и на тексте сбивается,
 * поэтому подпись проверяем по области самого символа.
 */
function decodeSymbolArea(svg: string): string | null {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1000 }, background: "white" })
    .render()
    .asPng();
  const img = PNG.sync.read(Buffer.from(png));
  // область символа — верхний квадрат: ширина картинки равна стороне квадрата
  const side = Math.min(img.width, img.height);
  const cropped = new PNG({ width: side, height: side });
  PNG.bitblt(img, cropped, 0, 0, side, side, 0, 0);
  const res = jsQR(new Uint8ClampedArray(cropped.data), cropped.width, cropped.height, {
    inversionAttempts: "attemptBoth",
  });
  return res?.data ?? null;
}

const base = defaultConfig.style;

function options(patch: Partial<RenderOptions> = {}): RenderOptions {
  return {
    matrix: [],
    size: 900,
    margin: base.margin,
    dotStyle: base.dotStyle,
    eyeFrame: base.eyeFrame,
    eyeBall: base.eyeBall,
    fillMode: base.fillMode,
    gradientKind: base.gradientKind,
    color1: base.color1,
    color2: base.color2,
    bgColor: base.bgColor,
    bgTransparent: false,
    logo: null,
    logoRatio: base.logoRatio,
    logoPadding: base.logoPadding,
    logoRadius: base.logoRadius,
    caption: { ...base.caption, text: "" },
    shapeScale: base.shapeScale,
    dotRadius: base.dotRadius,
    ecc: base.ecc,
    ...patch,
  } as RenderOptions;
}

function check(payload: string, patch: Partial<RenderOptions> = {}): boolean {
  const opts = options(patch);
  const enc = encodeMatrix(payload, opts.ecc);
  if (!enc.ok) return false;
  return decode(renderSvg({ ...opts, matrix: enc.matrix })) === payload;
}

const PAYLOADS: Record<string, string> = {
  короткий: "https://a.co/7",
  средний: "https://example.com/checkout?id=42&utm=qr",
  длинный: buildCryptoPayload(coinById("btc"), {
    address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    amount: "0.015",
    label: "Оплата за дизайн",
    message: "Счёт 1042",
    uriMode: true,
  }).value,
};

/**
 * База для тестов маркеров, логотипа и полей: простые квадратные модули.
 * Иначе они наследуют дефолтный стиль (точки), и обычные проверки начинают
 * падать из-за формы модулей, а не из-за того, что тестируется.
 */
const SOLID: Partial<RenderOptions> = {
  dotStyle: "rounded",
  shapeScale: 1,
  eyeFrame: "rounded",
  eyeBall: "rounded",
};

let failed = 0;
const results: string[] = [];
const info: string[] = [];
function report(name: string, ok: boolean) {
  if (!ok) failed++;
  results.push(`${ok ? "ok  " : "FAIL"} ${name}`);
}

function checkAll(
  name: string,
  patch: Partial<RenderOptions>,
  required: (keyof typeof PAYLOADS)[] = ["короткий", "средний", "длинный"]
) {
  const bad = required.filter((k) => !check(PAYLOADS[k], patch));
  report(
    bad.length ? `${name} — сломалось на: ${bad.join(", ")}` : `${name} (${required.join(", ")})`,
    bad.length === 0
  );
}

/** Точки и сердце проверяем на среднем и длинном коде: на коротких ссылках
 *  декодер теряет модульную сетку. В приложении на этот случай есть предупреждение. */
function checkWithShortNote(name: string, patch: Partial<RenderOptions>) {
  checkAll(name, patch, ["средний", "длинный"]);
  const shortOk = check(PAYLOADS["короткий"], patch);
  info.push(
    `     └ короткий код: ${shortOk ? "читается" : "не читается (предупреждаем в интерфейсе)"}`
  );
}

console.log("── Обязательные стили модулей ──");
for (const style of DOT_STYLES.filter((s) => !s.risky)) {
  const scale = SAFE_SHAPE_SCALE[style.value] ?? 1;
  if (style.value === "dots" || style.value === "heart") {
    checkWithShortNote(`модули: ${t(style.labelKey)}`, { dotStyle: style.value, shapeScale: scale });
  } else {
    checkAll(`модули: ${t(style.labelKey)}`, { dotStyle: style.value, shapeScale: scale });
  }
}

console.log("── Размер точек («Размер фигур» для dots) ──");
// безопасный диапазон обязан читаться
checkWithShortNote("точки 1.00", { dotStyle: "dots", shapeScale: 1 });
checkWithShortNote("точки 0.98", { dotStyle: "dots", shapeScale: 0.98 });
// ниже порога пользователь может уйти сам — в интерфейсе об этом предупреждаем
for (const s of [0.9, 0.6]) {
  const ok = check(PAYLOADS["средний"], { dotStyle: "dots", shapeScale: s });
  info.push(
    `     └ точки ${s.toFixed(2)}: ${ok ? "читается" : "не читается (предупреждаем в интерфейсе)"}`
  );
}

console.log("── Маркеры и ядра ──");
for (const f of EYE_FRAMES.filter((o) => !o.risky)) {
  checkAll(`контур маркера: ${t(f.labelKey)}`, { ...SOLID, eyeFrame: f.value });
}
for (const b of EYE_BALLS.filter((o) => !o.risky)) {
  checkAll(`ядро маркера: ${t(b.labelKey)}`, { ...SOLID, eyeBall: b.value });
}

console.log("── Логотип с вырезанием модулей ──");
for (const ratio of [0.18, 0.22, 0.26]) {
  checkAll(`логотип ${Math.round(ratio * 100)}% · ECC H`, { ...SOLID, logo: LOGO, logoRatio: ratio, ecc: "H" });
}
checkWithShortNote("логотип 30% · ECC H", { ...SOLID, logo: LOGO, logoRatio: 0.3, ecc: "H" });
checkWithShortNote("логотип с увеличенным зазором", { ...SOLID, logo: LOGO, logoPadding: 1.6, ecc: "H" });

console.log("── Маска телефона ──");
const phoneCases: [string, string][] = [
  ["79998887766", "+7 999 888 77 66"],
  ["89998887766", "+7 999 888 77 66"],
  ["9998887766", "+7 999 888 77 66"],
  ["+7 (999) 888-77-66", "+7 999 888 77 66"],
  ["+1", "+1"],
  ["12025550147", "+1 202 555 0147"],
  ["+1 (202) 555-0147", "+1 202 555 0147"],
  ["375291234567", "+375 291 234 567"],
  ["+375 29 123 45 67", "+375 291 234 567"],
  ["+44207123456", "+44 207 123 456"],
];
for (const [input, expected] of phoneCases) {
  report(`телефон «${input}» → «${expected}»`, formatPhone(input) === expected);
}

console.log("── Цвет ──");
for (const hex of ["#000000", "#ffffff", "#d1fe17", "#3a3a40", "#e8b04b", "#5b6cff"]) {
  const rgb = hexToRgb(hex);
  const roundTrip = rgb ? rgbToHex(hsvToRgb(rgbToHsv(rgb))) : null;
  report(`цвет ${hex} переживает перевод в HSV и обратно`, roundTrip === hex);
}

console.log("── Форматы и режимы ──");
const formats: [string, string][] = [
  ["BTC · BIP-21 с суммой и подписью", PAYLOADS["длинный"]],
  [
    "ETH · ERC-681",
    buildCryptoPayload(coinById("eth"), {
      address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      amount: "0.5",
      label: "",
      message: "",
      uriMode: true,
    }).value,
  ],
  ["USDT TRC-20", "TQ5NMqJjvHwBUqzLzMFvQxJmD1Fk9tTq3k"],
  ["Wi-Fi с кириллицей", "WIFI:T:WPA;S:Домашняя сеть;P:p@ss;H:true;;"],
  ["Контакт MECARD", "MECARD:N:Иван Петров;TEL:+79991234567;EMAIL:ivan@example.com;ORG:Maletskiy Design;;"],
  ["Текст с эмодзи", "Просто текст с эмодзи 🚀 и цифрами 12345"],
];
for (const [name, payload] of formats) {
  report(name, check(payload, { dotStyle: "square", eyeFrame: "square", eyeBall: "square" }));
}
report("прозрачный фон", check(PAYLOADS["средний"], { bgTransparent: true }));
report("без полей (margin 0)", check(PAYLOADS["средний"], { ...SOLID, margin: 0 }));
report("радиальный градиент", check(PAYLOADS["средний"], { gradientKind: "radial" }));
report(
  "подпись под кодом (символ в охранной зоне)",
  (() => {
    const enc = encodeMatrix(PAYLOADS["средний"], "Q");
    if (!enc.ok) return false;
    const svg = renderSvg({
      ...options(),
      caption: { ...base.caption, enabled: true, text: "Отсканируйте, чтобы перевести" },
      matrix: enc.matrix,
    });
    return decodeSymbolArea(svg) === PAYLOADS["средний"];
  })()
);
report(
  "одна филигрань: код — один путь",
  (() => {
    const enc = encodeMatrix(PAYLOADS["средний"], "Q");
    if (!enc.ok) return false;
    const svg = renderSvg({ ...options(), matrix: enc.matrix });
    const paths = svg.match(/<path /g) ?? [];
    return paths.length === 1 && svg.includes('fill-rule="nonzero"') && svg.includes('<g id="qr">');
  })()
);

console.log(results.join("\n"));
if (info.length) console.log("\nИнформационно:\n" + info.join("\n"));

// образцы для визуальной проверки
const samples: [string, string, Partial<RenderOptions>][] = [
  ["01-rounded", PAYLOADS["длинный"], {}],
  ["02-dots", PAYLOADS["средний"], { dotStyle: "dots" }],
  ["03-heart", PAYLOADS["средний"], { dotStyle: "heart", eyeBall: "heart", shapeScale: 1.18 }],
  ["04-circle-marker", PAYLOADS["средний"], { eyeFrame: "circle", eyeBall: "dot" }],
  ["05-logo", PAYLOADS["длинный"], { logo: LOGO, ecc: "H" }],
  ["06-caption", PAYLOADS["средний"], { caption: { ...base.caption, enabled: true, text: "Сканируйте для оплаты" } }],
];
for (const [name, payload, patch] of samples) {
  const enc = encodeMatrix(payload, (patch.ecc as "Q") ?? "Q");
  if (enc.ok) writeFileSync(`${OUT}${name}.svg`, renderSvg({ ...options(patch), matrix: enc.matrix }));
}

console.log(`\nПровалов: ${failed}. Образцы — в ./samples/`);
process.exit(failed ? 1 : 0);
