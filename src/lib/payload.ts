import { buildCryptoPayload, coinById } from "./coins";
import { phoneToPayload } from "./phone";
import { t } from "./i18n";
import type { DictKey } from "./i18n/ru";
import type { QrConfig } from "./config";

export type Payload = { value: string; scheme: string; note?: string };

/** Экранирование спецсимволов в формате WIFI: \\ ; , : " */
const wifiEscape = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");

/** В MECARD разделители полей экранируются обратной косой чертой. */
const mecardEscape = (s: string) => s.trim().replace(/([\\;:,])/g, "\\$1");

export function buildPayload(config: QrConfig): Payload {
  switch (config.type) {
    case "crypto": {
      const coin = coinById(config.crypto.coinId);
      return buildCryptoPayload(coin, {
        address: config.crypto.address,
        amount: config.crypto.amount,
        label: config.crypto.label,
        message: config.crypto.message,
        uriMode: config.crypto.uriMode,
      });
    }
    case "link": {
      const value = config.link.trim();
      const complete =
        /^https?:\/\/[^\s/]+\.[^\s]+/i.test(value) || /^[^\s/]+\.[a-z]{2,}(\/|$)/i.test(value);
      return {
        value: complete ? value : "",
        scheme: "link",
        note: complete ? undefined : t("note.linkIncomplete"),
      };
    }
    case "text":
      return { value: config.text.trim() ? config.text : "", scheme: "text" };
    case "wifi": {
      const { ssid, password, encryption, hidden } = config.wifi;
      if (!ssid.trim()) {
        return { value: "", scheme: "Wi-Fi", note: t("note.wifiSsid") };
      }
      const parts = [`T:${encryption}`, `S:${wifiEscape(ssid)}`];
      if (encryption !== "nopass") parts.push(`P:${wifiEscape(password)}`);
      if (hidden) parts.push("H:true");
      return { value: `WIFI:${parts.join(";")};;`, scheme: "Wi-Fi", note: t("note.wifiFormat") };
    }
    case "email": {
      const to = config.email.to.trim();
      if (!to) {
        return { value: "", scheme: "e-mail", note: t("note.emailEmpty") };
      }
      const params: string[] = [];
      if (config.email.subject.trim()) params.push(`subject=${encodeURIComponent(config.email.subject)}`);
      if (config.email.body.trim()) params.push(`body=${encodeURIComponent(config.email.body)}`);
      const query = params.length ? `?${params.join("&")}` : "";
      return { value: `mailto:${to}${query}`, scheme: "e-mail" };
    }
    case "contact": {
      const { name, phone, email, company } = config.contact;
      const fields: string[] = [];
      const cleanPhone = phoneToPayload(phone);
      if (name.trim()) fields.push(`N:${mecardEscape(name)}`);
      if (cleanPhone) fields.push(`TEL:${mecardEscape(cleanPhone)}`);
      if (email.trim()) fields.push(`EMAIL:${mecardEscape(email)}`);
      if (company.trim()) fields.push(`ORG:${mecardEscape(company)}`);
      if (!fields.length) {
        return { value: "", scheme: "contact", note: t("note.contactEmpty") };
      }
      return {
        value: `MECARD:${fields.join(";")};;`,
        scheme: "contact",
        note: t("note.contactFormat"),
      };
    }
    default:
      return { value: "", scheme: "" };
  }
}

export const CONTENT_TYPES: { value: QrConfig["type"]; labelKey: DictKey }[] = [
  { value: "crypto", labelKey: "content.type.crypto" },
  { value: "link", labelKey: "content.type.link" },
  { value: "text", labelKey: "content.type.text" },
  { value: "wifi", labelKey: "content.type.wifi" },
  { value: "email", labelKey: "content.type.email" },
  { value: "contact", labelKey: "content.type.contact" },
];
