import { COINS, COIN_SCHEME, checkAddress, coinById } from "../lib/coins";
import type { ContactState, CryptoState, EmailState, QrConfig, WifiState } from "../lib/config";
import { CONTENT_TYPES } from "../lib/payload";
import { t } from "../lib/i18n";
import { formatPhone } from "../lib/phone";
import { useState } from "react";
import CoinSheet from "./CoinSheet";
import {
  ClearableInput,
  ClearableTextarea,
  Field,
  PasteButton,
  Section,
  Segmented,
  Toggle,
} from "./ui";

/**
 * Длинный адрес в нефокусе показываем укороченным: «начало ••• конец».
 * В фокусе возвращается полный вид, чтобы можно было править.
 */
function shortenMiddle(value: string, head = 4, tail = 4): string {
  const v = value.trim();
  if (v.length <= head + tail + 6) return v;
  return `${v.slice(0, head)} ••• ${v.slice(-tail)}`;
}

type Props = {
  config: QrConfig;
  onChange: (patch: Partial<QrConfig>) => void;
};

export default function ContentPanel({ config, onChange }: Props) {
  const [coinSheet, setCoinSheet] = useState(false);
  const [addressFocused, setAddressFocused] = useState(false);
  const coin = coinById(config.crypto.coinId);
  const addressState = checkAddress(coin, config.crypto.address);
  const schemeIsFixed = coin.uri === "none";

  const setCrypto = (patch: Partial<CryptoState>) =>
    onChange({ crypto: { ...config.crypto, ...patch } });
  const setWifi = (patch: Partial<WifiState>) => onChange({ wifi: { ...config.wifi, ...patch } });
  const setEmail = (patch: Partial<EmailState>) => onChange({ email: { ...config.email, ...patch } });
  const setContact = (patch: Partial<ContactState>) =>
    onChange({ contact: { ...config.contact, ...patch } });

  return (
    <Section title={t("content.title")}>
      <div className="stack">
        <Segmented
          value={config.type}
          options={CONTENT_TYPES.map((item) => ({ value: item.value, label: t(item.labelKey) }))}
          onChange={(v) => onChange({ type: v })}
          wrap
        />

        {config.type === "crypto" && (
          <div className="stack">
            <div className="field">
              <span className="field__label">{t("crypto.coin")}</span>

              {/* десктоп: сетка монет */}
              <div className="coins">
                {COINS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={"coin" + (c.id === coin.id ? " is-active" : "")}
                    onClick={() => setCrypto({ coinId: c.id })}
                    title={`${c.name} · ${c.network}`}
                  >
                    <img className="coin__logo" src={c.logo} alt="" width={22} height={22} />
                    <span className="coin__symbol">{c.symbol}</span>
                    <span className="coin__network">{c.network}</span>
                  </button>
                ))}
              </div>

              {/* мобильные: одно поле и нижняя модалка */}
              <button
                type="button"
                className="coin-select"
                onClick={() => setCoinSheet(true)}
                aria-haspopup="dialog"
              >
                <img className="coin-select__logo" src={coin.logo} alt="" width={30} height={30} />
                <span className="coin-select__body">
                  <span className="coin-select__symbol">{coin.symbol}</span>
                  <span className="coin-select__network">{coin.network}</span>
                </span>
                <svg
                  className="coin-select__chevron"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <Field
              label={t("crypto.address")}
              hint={t(coin.hintKey)}
              action={<PasteButton onValue={(v) => setCrypto({ address: v })} />}
            >
              <div className="input-with-state">
                <ClearableInput
                  className="input input--mono"
                  value={
                    addressFocused ? config.crypto.address : shortenMiddle(config.crypto.address)
                  }
                  placeholder={coin.placeholder}
                  spellCheck={false}
                  autoComplete="off"
                  onFocus={() => setAddressFocused(true)}
                  onBlur={() => setAddressFocused(false)}
                  onChange={(e) => setCrypto({ address: e.target.value })}
                />
                {addressState !== "empty" && (
                  <span className={"state state--" + addressState}>
                    {addressState === "valid" ? t("crypto.valid") : t("crypto.invalid")}
                  </span>
                )}
              </div>
            </Field>

            <div className="grid-2">
              <Field label={t("crypto.amount", { unit: coin.amountUnit })} hint={t("common.optional")}>
                <ClearableInput
                  className="input input--mono"
                  value={config.crypto.amount}
                  placeholder="0.00"
                  inputMode="decimal"
                  onChange={(e) => setCrypto({ amount: e.target.value })}
                />
              </Field>
              <Field label={t("crypto.label")} hint={t("common.optional")}>
                <ClearableInput
                  className="input"
                  value={config.crypto.label}
                  placeholder={t("crypto.labelPlaceholder")}
                  onChange={(e) => setCrypto({ label: e.target.value })}
                />
              </Field>
            </div>

            <Field label={t("crypto.message")} hint={t("common.optional")}>
              <ClearableInput
                className="input"
                value={config.crypto.message}
                placeholder={t("crypto.messagePlaceholder")}
                onChange={(e) => setCrypto({ message: e.target.value })}
              />
            </Field>

            <Toggle
              checked={config.crypto.uriMode && !schemeIsFixed}
              onChange={(v) => setCrypto({ uriMode: v })}
              label={t("crypto.standard")}
              hint={
                schemeIsFixed
                  ? t("crypto.standardFixed", { symbol: coin.symbol, network: coin.network })
                  : t("crypto.standardScheme", { scheme: COIN_SCHEME[coin.uri] })
              }
            />

            {schemeIsFixed && <p className="note">{t("crypto.tokenNote")}</p>}
          </div>
        )}

        {config.type === "link" && (
          <Field
            label={t("link.label")}
            hint={t("link.hint")}
            action={<PasteButton onValue={(v) => onChange({ link: v })} />}
          >
            <ClearableInput
              className="input input--mono"
              value={config.link}
              placeholder="https://example.com"
              spellCheck={false}
              onChange={(e) => onChange({ link: e.target.value })}
            />
          </Field>
        )}

        {config.type === "text" && (
          <Field
            label={t("text.label")}
            hint={t("text.hint")}
            action={<PasteButton onValue={(v) => onChange({ text: v })} />}
          >
            <ClearableTextarea
              className="input input--area"
              rows={5}
              value={config.text}
              placeholder={t("text.placeholder")}
              onChange={(e) => onChange({ text: e.target.value })}
            />
          </Field>
        )}

        {config.type === "wifi" && (
          <div className="stack">
            <div className="grid-2">
              <Field label={t("wifi.ssid")} action={<PasteButton onValue={(v) => setWifi({ ssid: v })} />}>
                <ClearableInput
                  className="input"
                  value={config.wifi.ssid}
                  placeholder="MyWiFi"
                  onChange={(e) => setWifi({ ssid: e.target.value })}
                />
              </Field>
              <Field label={t("wifi.password")} action={<PasteButton onValue={(v) => setWifi({ password: v })} />}>
                <ClearableInput
                  className="input input--mono"
                  value={config.wifi.password}
                  placeholder="••••••••"
                  onChange={(e) => setWifi({ password: e.target.value })}
                />
              </Field>
            </div>
            <div className="field">
              <span className="field__label">{t("wifi.encryption")}</span>
              <Segmented
                value={config.wifi.encryption}
                options={[
                  { value: "WPA", label: "WPA/WPA2" },
                  { value: "WEP", label: "WEP" },
                  { value: "nopass", label: t("wifi.nopass") },
                ]}
                onChange={(v) => setWifi({ encryption: v })}
              />
            </div>
            <Toggle
              checked={config.wifi.hidden}
              onChange={(v) => setWifi({ hidden: v })}
              label={t("wifi.hidden")}
            />
          </div>
        )}

        {config.type === "email" && (
          <div className="stack">
            <Field label={t("email.to")} action={<PasteButton onValue={(v) => setEmail({ to: v })} />}>
              <ClearableInput
                className="input input--mono"
                value={config.email.to}
                placeholder="hello@example.com"
                onChange={(e) => setEmail({ to: e.target.value })}
              />
            </Field>
            <Field label={t("email.subject")}>
              <ClearableInput
                className="input"
                value={config.email.subject}
                onChange={(e) => setEmail({ subject: e.target.value })}
              />
            </Field>
            <Field label={t("email.body")}>
              <ClearableTextarea
                className="input input--area"
                rows={4}
                value={config.email.body}
                onChange={(e) => setEmail({ body: e.target.value })}
              />
            </Field>
          </div>
        )}

        {config.type === "contact" && (
          <div className="stack">
            <div className="grid-2">
              <Field label={t("contact.name")}>
                <ClearableInput
                  className="input"
                  value={config.contact.name}
                  placeholder={t("contact.namePlaceholder")}
                  autoComplete="off"
                  onChange={(e) => setContact({ name: e.target.value })}
                />
              </Field>
              <Field label={t("contact.phone")} action={<PasteButton onValue={(v) => setContact({ phone: formatPhone(v) })} />}>
                <ClearableInput
                  className="input input--mono"
                  value={config.contact.phone}
                  placeholder="+7 999 888 77 66"
                  inputMode="tel"
                  autoComplete="off"
                  onChange={(e) => setContact({ phone: formatPhone(e.target.value) })}
                />
              </Field>
            </div>
            <div className="grid-2">
              <Field label={t("contact.email")} action={<PasteButton onValue={(v) => setContact({ email: v })} />}>
                <ClearableInput
                  className="input input--mono"
                  value={config.contact.email}
                  placeholder="hello@example.com"
                  inputMode="email"
                  autoComplete="off"
                  onChange={(e) => setContact({ email: e.target.value })}
                />
              </Field>
              <Field label={t("contact.company")}>
                <ClearableInput
                  className="input"
                  value={config.contact.company}
                  placeholder="Qrix"
                  autoComplete="off"
                  onChange={(e) => setContact({ company: e.target.value })}
                />
              </Field>
            </div>
          </div>
        )}
      </div>

      {coinSheet && (
        <CoinSheet
          current={coin}
          onSelect={(id) => setCrypto({ coinId: id })}
          onClose={() => setCoinSheet(false)}
        />
      )}
    </Section>
  );
}
