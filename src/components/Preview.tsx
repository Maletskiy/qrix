import { useMemo, useRef, useState } from "react";
import { contrastRatio } from "../lib/render";
import type { QrConfig } from "../lib/config";
import type { Payload } from "../lib/payload";
import { copyPng, copyText, downloadBlob, downloadSvg, svgToPngBlob } from "../lib/export";
import { isRisky } from "../lib/styles";
import { useI18n } from "../lib/i18n/useI18n";

type Props = {
  svg: string;
  payload: Payload;
  config: QrConfig;
  error: string | null;
};

export default function Preview({ svg, payload, config, error }: Props) {
  const { lang, t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; visible: boolean } | null>(null);
  const toastTimer = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const warnings = useMemo(() => {
    const list: string[] = [];
    const s = config.style;
    const risky = isRisky({
      dotStyle: s.dotStyle,
      eyeFrame: s.eyeFrame,
      eyeBall: s.eyeBall,
      shapeScale: s.shapeScale,
      payloadLength: payload.value.length,
    });
    if (risky) list.push(risky);
    if (!s.bgTransparent && contrastRatio(s.color1, s.bgColor) < 3.2) list.push(t("warn.contrast"));
    if (s.logo && s.ecc !== "Q" && s.ecc !== "H") list.push(t("warn.logoEcc"));
    if (s.logo && s.logoRatio > 0.3) list.push(t("warn.logoBig"));
    if (s.margin < 4) list.push(t("warn.margin"));
    if (s.bgTransparent) list.push(t("warn.transparent"));
    if (!payload.value.trim()) list.push(t("warn.empty"));
    return list;
  }, [config.style, payload.value, lang]);

  // плавно: монтируем в скрытом состоянии, через два кадра включаем видимость —
  // иначе браузер рисует тост сразу в конечном виде и transition не запускается
  const flash = (text: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ text, visible: false });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setToast((cur) => (cur ? { ...cur, visible: true } : cur));
      });
    });
    toastTimer.current = window.setTimeout(() => {
      setToast((cur) => (cur ? { ...cur, visible: false } : cur));
      toastTimer.current = window.setTimeout(() => setToast(null), 260);
    }, 1700);
  };

  const handlePng = async () => {
    try {
      setBusy("png");
      const blob = await svgToPngBlob(svg, config.style.size, 3);
      downloadBlob(blob, `qr-${config.type}-${Date.now()}.png`);
      flash(t("toast.pngSaved"));
    } catch {
      flash(t("toast.pngError"));
    } finally {
      setBusy(null);
    }
  };

  const handleCopyPng = async () => {
    try {
      setBusy("copy");
      const blob = await svgToPngBlob(svg, config.style.size, 3);
      const ok = await copyPng(blob);
      flash(ok ? t("toast.pngCopied") : t("toast.copyBlocked"));
    } catch {
      flash(t("toast.pngCopyError"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="preview">
      <div className="preview__stage" ref={stageRef}>
        {error ? (
          <div className="preview__error">
            <strong>{t("preview.errorTitle")}</strong>
            <span>{error}</span>
          </div>
        ) : payload.value.trim() ? (
          <div
            className="preview__canvas"
            style={config.style.bgTransparent ? { background: "var(--checker)" } : undefined}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="preview__empty">
            <span className="preview__empty-mark">QR</span>
            <span>{t("preview.empty")}</span>
          </div>
        )}
      </div>

      <div className="preview__payload">
        <span className="field__label">{t("preview.payload")}</span>
        <code>{payload.value || "—"}</code>
        <button
          type="button"
          className="btn btn--tiny"
          onClick={async () =>
            flash((await copyText(payload.value)) ? t("toast.copied") : t("toast.copyError"))
          }
        >
          {t("preview.copy")}
        </button>
      </div>

      <div className="preview__actions">
        <button
          type="button"
          className={"preview__jump" + (payload.value.trim() && !error ? "" : " is-empty")}
          aria-label={t("preview.jumpToCode")}
          title={t("preview.jumpToCode")}
          /* фон миниатюры = фон кода: иначе поля вокруг кода видны другим цветом */
          style={
            payload.value.trim() && !error
              ? config.style.bgTransparent
                ? { background: "var(--checker)" }
                : { backgroundColor: config.style.bgColor }
              : undefined
          }
          onClick={() => stageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
        >
          {payload.value.trim() && !error ? (
            <span className="preview__jump-canvas" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <span className="preview__jump-empty">QR</span>
          )}
        </button>
        <div className="preview__action-grid">
          <div className="preview__action-row">
            <span className="preview__action-label">{t("preview.groupDownload")}</span>
            <button
              type="button"
              className="btn btn--primary"
              title={t("preview.downloadPng")}
              aria-label={t("preview.downloadPng")}
              onClick={handlePng}
              disabled={!payload.value || !!error || busy === "png"}
            >
              {busy === "png" ? t("preview.busy") : "PNG"}
            </button>
            <button
              type="button"
              className="btn btn--white"
              title={t("preview.downloadSvg")}
              aria-label={t("preview.downloadSvg")}
              onClick={() => {
                downloadSvg(svg, `qr-${config.type}-${Date.now()}.svg`);
                flash(t("toast.svgSaved"));
              }}
              disabled={!payload.value || !!error}
            >
              SVG
            </button>
          </div>

          <div className="preview__action-row">
            <span className="preview__action-label">{t("preview.groupCopy")}</span>
            <button
              type="button"
              className="btn btn--ghost"
              title={t("preview.copyPng")}
              aria-label={t("preview.copyPng")}
              onClick={handleCopyPng}
              disabled={!payload.value || !!error || busy === "copy"}
            >
              {busy === "copy" ? t("preview.busy") : "PNG"}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              title={t("preview.copySvg")}
              aria-label={t("preview.copySvg")}
              onClick={async () =>
                flash((await copyText(svg)) ? t("toast.svgCopied") : t("toast.copyError"))
              }
              disabled={!payload.value || !!error}
            >
              SVG
            </button>
          </div>
        </div>
      </div>

      {warnings.length > 0 && (
        <ul className="warnings">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      {toast && <div className={"toast" + (toast.visible ? " is-visible" : "")}>{toast.text}</div>}
    </div>
  );
}
