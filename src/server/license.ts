/**
 * Лицензии Qrix.
 *
 * Смысл: платить можно без аккаунта. Провайдер оплаты (Lemon Squeezy,
 * Paddle, Gumroad) выдаёт ключ, мы превращаем его в подписанный токен:
 *
 *   qr1.<payload>.<signature>
 *
 * Токен проверяется офлайн по HMAC-SHA256 — серверу не нужно ходить к
 * платёжному провайдеру на каждый запрос. Секрет живёт только в окружении
 * (`QR_LICENSE_SECRET`), поэтому подделать токен из браузера нельзя.
 *
 * Токен не содержит почты и имени: только номер заказа, тариф и срок.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export type Plan = "pro";

export type LicensePayload = {
  v: 1;
  /** Идентификатор покупки у платёжного провайдера. */
  id: string;
  plan: Plan;
  /** Когда выдан, unix-время в секундах. */
  issued: number;
  /** Пока действует; отсутствует — бессрочная (lifetime). */
  until?: number;
};

export type LicenseCheck =
  | { ok: true; payload: LicensePayload }
  | { ok: false; reason: "format" | "signature" | "expired" };

const PREFIX = "qr1";

function b64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(secret: string, data: string): string {
  return b64url(createHmac("sha256", secret).update(data).digest());
}

/** Собирает токен. Используется вебхуком оплаты и ручной выдачей. */
export function issueLicense(payload: LicensePayload, secret: string): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${PREFIX}.${body}.${sign(secret, `${PREFIX}.${body}`)}`;
}

/** Проверяет подпись и срок. */
export function verifyLicense(token: string, secret: string, now = Date.now()): LicenseCheck {
  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX) return { ok: false, reason: "format" };

  const [, body, signature] = parts;
  const expected = sign(secret, `${PREFIX}.${body}`);
  // сравнение с постоянным временем: длина подписи фиксирована
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "signature" };

  let payload: LicensePayload;
  try {
    payload = JSON.parse(fromB64url(body).toString("utf8")) as LicensePayload;
  } catch {
    return { ok: false, reason: "format" };
  }

  if (!payload || payload.v !== 1 || typeof payload.id !== "string") {
    return { ok: false, reason: "format" };
  }
  if (payload.until && payload.until * 1000 < now) return { ok: false, reason: "expired" };

  return { ok: true, payload };
}

/**
 * Короткий отпечаток лицензии для хранения в записи кода: сам токен
 * в базе не нужен, достаточно понять, что код создан по лицензии.
 */
export function licenseFingerprint(payload: LicensePayload): string {
  return createHmac("sha256", "qrix-license").update(payload.id).digest("hex").slice(0, 12);
}
