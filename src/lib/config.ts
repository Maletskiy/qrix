import type {
  CaptionOptions,
  DotStyle,
  EyeBallStyle,
  EyeFrameStyle,
  FillMode,
  GradientKind,
} from "./render";
import type { Ecc } from "./qr";
import { COINS } from "./coins";
import { formatPhone } from "./phone";
import type { DictKey } from "./i18n/ru";

export type ContentType = "crypto" | "link" | "text" | "wifi" | "email" | "contact";

export type CryptoState = {
  coinId: string;
  address: string;
  amount: string;
  label: string;
  message: string;
  uriMode: boolean;
};

export type WifiState = {
  ssid: string;
  password: string;
  encryption: "WPA" | "WEP" | "nopass";
  hidden: boolean;
};

export type EmailState = { to: string; subject: string; body: string };

export type ContactState = { name: string; phone: string; email: string; company: string };

export type StyleState = {
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
  size: number;
  margin: number;
  ecc: Ecc;
  shapeScale: number;
  dotRadius: number;
  caption: CaptionOptions;
};

export type QrConfig = {
  type: ContentType;
  link: string;
  text: string;
  crypto: CryptoState;
  wifi: WifiState;
  email: EmailState;
  contact: ContactState;
  style: StyleState;
};

/** Шрифты подписи — только системные: так текст корректно попадает и в PNG. */
export const CAPTION_FONTS = [
  {
    /* Sans в интерфейсе — это Google Sans, с системным фолбэком */
    value:
      '"Google Sans", "Google Sans Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    label: "Sans",
  },
  { value: 'Georgia, "Times New Roman", serif', label: "Serif" },
  { value: '"SF Mono", ui-monospace, Menlo, Consolas, monospace', label: "Mono" },
];

export type Palette = { nameKey: DictKey; c1: string; c2: string; bg: string };

export const PALETTES: Palette[] = [
  { nameKey: "palette.graphite", c1: "#0e0e10", c2: "#3a3a40", bg: "#ffffff" },
  { nameKey: "palette.lime", c1: "#5d7300", c2: "#a8cc0d", bg: "#ffffff" },
  { nameKey: "palette.amber", c1: "#e8b04b", c2: "#b5740c", bg: "#0d0b08" },
  { nameKey: "palette.indigo", c1: "#5b6cff", c2: "#8f3bff", bg: "#ffffff" },
  { nameKey: "palette.ocean", c1: "#0ea5b7", c2: "#1d4ed8", bg: "#f7fbfd" },
  { nameKey: "palette.emerald", c1: "#14b866", c2: "#0b7a52", bg: "#f6fdf9" },
  { nameKey: "palette.sunset", c1: "#ff7a45", c2: "#e5387a", bg: "#fff8f5" },
  { nameKey: "palette.night", c1: "#f5f5f1", c2: "#c9c9c2", bg: "#0b0b0c" },
];

export const defaultConfig: QrConfig = {
  type: "crypto",
  link: "",
  text: "",
  crypto: {
    coinId: "btc",
    address: "",
    amount: "",
    label: "",
    message: "",
    uriMode: true,
  },
  wifi: { ssid: "", password: "", encryption: "WPA", hidden: false },
  email: { to: "", subject: "", body: "" },
  contact: { name: "", phone: "", email: "", company: "" },
  style: {
    dotStyle: "dots",
    eyeFrame: "circle",
    eyeBall: "dot",
    fillMode: "gradient",
    gradientKind: "diagonal",
    color1: "#0e0e10",
    color2: "#3a3a40",
    bgColor: "#ffffff",
    bgTransparent: false,
    logo: null,
    logoRatio: 0.22,
    logoPadding: 0.9,
    logoRadius: 0.5,
    size: 720,
    margin: 4,
    ecc: "Q",
    shapeScale: 0.98,
    dotRadius: 0.5,
    caption: {
      enabled: false,
      text: "",
      color: "#0e0e10",
      font: CAPTION_FONTS[0].value,
      scale: 1,
    },
  },
};

const TYPES: ContentType[] = ["crypto", "link", "text", "wifi", "email", "contact"];

/**
 * Начальное состояние из ссылки: ?type=crypto&coin=btc&address=…&amount=…
 * Позволяет делиться готовой заготовкой — например, ссылкой на оплату.
 */
export function configFromQuery(search: string): Partial<QrConfig> {
  const p = new URLSearchParams(search);
  const patch: Partial<QrConfig> = {};

  const type = p.get("type") as ContentType | null;
  if (type && TYPES.includes(type)) patch.type = type;

  const coinId = p.get("coin");
  const address = p.get("address");
  const amount = p.get("amount");
  const label = p.get("label");
  const message = p.get("message");
  if (coinId || address || amount || label || message) {
    patch.crypto = {
      ...defaultConfig.crypto,
      ...(coinId && COINS.some((c) => c.id === coinId) ? { coinId } : {}),
      ...(address ? { address } : {}),
      ...(amount ? { amount } : {}),
      ...(label ? { label } : {}),
      ...(message ? { message } : {}),
    };
  }

  const link = p.get("link");
  if (link) patch.link = link;
  const text = p.get("text");
  if (text) patch.text = text;

  const ssid = p.get("ssid");
  const password = p.get("password");
  if (ssid || password) {
    patch.wifi = {
      ...defaultConfig.wifi,
      ...(ssid ? { ssid } : {}),
      ...(password ? { password } : {}),
    };
  }

  const contactName = p.get("name");
  const phone = p.get("phone");
  const contactEmail = p.get("email");
  const company = p.get("company");
  if (contactName || phone || contactEmail || company) {
    patch.contact = {
      ...defaultConfig.contact,
      ...(contactName ? { name: contactName } : {}),
      ...(phone ? { phone: formatPhone(phone) } : {}),
      ...(contactEmail ? { email: contactEmail } : {}),
      ...(company ? { company } : {}),
    };
  }

  return patch;
}
