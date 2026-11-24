import { useRef } from "react";
import type { QrConfig, StyleState } from "../lib/config";
import { readFileAsDataUrl } from "../lib/export";
import { t } from "../lib/i18n";
import { track } from "../lib/analytics";
import { Section, Slider } from "./ui";

type Props = {
  config: QrConfig;
  onChange: (patch: Partial<QrConfig>) => void;
};

/** Блок логотипа вынесен отдельно: он стоит сразу после «Содержимого». */
export default function LogoPanel({ config, onChange }: Props) {
  const style = config.style;
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<StyleState>) => onChange({ style: { ...style, ...patch } });

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      track("logo_upload", { ok: false });
      alert(t("style.logoTooBig"));
      return;
    }
    set({ logo: await readFileAsDataUrl(file) });
    // сам файл и его содержимое не отправляем — только факт загрузки
    track("logo_upload", { ok: true });
  };

  return (
    <Section title={t("style.logoTitle")} collapsible>
      <div className="stack">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          hidden
          onChange={(e) => pickLogo(e.target.files?.[0])}
        />
        <div className="logo-row">
          <div className="logo-preview">
            {style.logo ? (
              <img src={style.logo} alt={t("style.logoAlt")} />
            ) : (
              <span className="logo-preview__empty">{t("style.logoNone")}</span>
            )}
          </div>
          <div className="logo-actions">
            <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
              {t("style.logoUpload")}
            </button>
            {style.logo && (
              <button type="button" className="btn btn--ghost" onClick={() => set({ logo: null })}>
                {t("style.logoRemove")}
              </button>
            )}
          </div>
        </div>

        {style.logo && (
          <>
            <Slider
              label={t("style.logoSize")}
              value={Math.round(style.logoRatio * 100)}
              min={12}
              max={32}
              onChange={(v) => set({ logoRatio: v / 100 })}
              suffix="%"
            />
            <Slider
              label={t("style.logoGap")}
              value={style.logoPadding}
              min={0.4}
              max={2.4}
              step={0.1}
              onChange={(v) => set({ logoPadding: v })}
            />
            <Slider
              label={t("style.logoRadius")}
              value={Math.round(style.logoRadius * 100)}
              min={0}
              max={100}
              onChange={(v) => set({ logoRadius: v / 100 })}
              suffix="%"
            />
          </>
        )}
      </div>
    </Section>
  );
}
