import { useEffect, useMemo, useRef, useState } from "react";
import { contrastRatio } from "../lib/render";
import type { QrConfig } from "../lib/config";
import type { Payload } from "../lib/payload";
import { copyPng, copyText, downloadBlob, downloadSvg, svgToPngBlob } from "../lib/export";
import { isRisky } from "../lib/styles";
import type { Scene } from "../lib/render";
import QrCanvas from "./QrCanvas";
import { AutoHeight } from "./ui";
import { useI18n } from "../lib/i18n/useI18n";
import { track, trackOnce } from "../lib/analytics";

type Props = {
  svg: string;
  scene: Scene | null;
  accent: string;
  payload: Payload;
  config: QrConfig;
  error: string | null;
};

export default function Preview({ svg, scene, accent, payload, config, error }: Props) {
  const { lang, t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; visible: boolean } | null>(null);
  const toastTimer = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  // высота сцены: меряем холст и задаём её явно, чтобы включение подписи
  // анимировалось, а не прыгало
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [stageHeight, setStageHeight] = useState<number | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const [barVisible, setBarVisible] = useState(false);

  // kind — стабильный идентификатор для аналитики, text — то, что видит человек
  const warnings = useMemo(() => {
    const list: { kind: string; text: string }[] = [];
    const s = config.style;
    const risky = isRisky({
      dotStyle: s.dotStyle,
      eyeFrame: s.eyeFrame,
      eyeBall: s.eyeBall,
      shapeScale: s.shapeScale,
      payloadLength: payload.value.length,
    });
    if (risky) list.push({ kind: "risky", text: risky });
    if (!s.bgTransparent && contrastRatio(s.color1, s.bgColor) < 3.2)
      list.push({ kind: "contrast", text: t("warn.contrast") });
    if (s.logo && s.ecc !== "Q" && s.ecc !== "H")
      list.push({ kind: "logo_ecc", text: t("warn.logoEcc") });
    if (s.logo && s.logoRatio > 0.3) list.push({ kind: "logo_big", text: t("warn.logoBig") });
    if (s.margin < 4) list.push({ kind: "margin", text: t("warn.margin") });
    if (s.bgTransparent) list.push({ kind: "transparent", text: t("warn.transparent") });
    if (!payload.value.trim()) list.push({ kind: "empty", text: t("warn.empty") });
    return list;
  }, [config.style, payload.value, lang]);

  // какие предупреждения реально увидели: по одному разу на тип за сессию.
  // «empty» не считаем — оно висит у всех до первого ввода и ничего не значит
  useEffect(() => {
    for (const w of warnings) {
      if (w.kind === "empty") continue;
      trackOnce(`warn:${w.kind}`, "warning_shown", { kind: w.kind });
    }
  }, [warnings]);

  // плашка нужна только когда кнопок под кодом не видно
  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // плашка нужна только когда кнопки ушли ВВЕРХ (прокрутили дальше них).
        // Если они просто ниже экрана — пользователь до них ещё не дошёл.
        const scrolledPast = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        setBarVisible(scrolledPast);
      },
      { rootMargin: "0px 0px -4px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) {
      setStageHeight(null);
      return;
    }

    const sync = () => {
      const h = el.getBoundingClientRect().height;
      setStageHeight(h > 0 ? h : null);
    };

    const observer = new ResizeObserver(sync);
    observer.observe(el);
    sync();
    return () => observer.disconnect();
  }, [svg]);

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
      const blob = await svgToPngBlob(svg, config.style.size);
      downloadBlob(blob, `qr-${config.type}-${Date.now()}.png`);
      track("export", { format: "png", action: "download" });
      flash(t("toast.pngSaved"));
    } catch {
      track("export_error", { format: "png" });
      flash(t("toast.pngError"));
    } finally {
      setBusy(null);
    }
  };

  const handleCopyPng = async () => {
    try {
      setBusy("copy");
      const blob = await svgToPngBlob(svg, config.style.size);
      const ok = await copyPng(blob);
      if (ok) track("export", { format: "png", action: "copy" });
      else track("export_error", { format: "png" });
      flash(ok ? t("toast.pngCopied") : t("toast.copyBlocked"));
    } catch {
      track("export_error", { format: "png" });
      flash(t("toast.pngCopyError"));
    } finally {
      setBusy(null);
    }
  };

  /** Четыре действия: и в блоке превью, и в нижней плашке. */
  const renderActions = () => (
    <>
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
            {busy === "png" ? (
            t("preview.busy")
            ) : (
            <>
              <span className="btn-label btn-label--short">PNG</span>
              <span className="btn-label btn-label--full">{t("preview.downloadPng")}</span>
            </>
            )}
          </button>
          <button
            type="button"
            className="btn btn--white"
            title={t("preview.downloadSvg")}
            aria-label={t("preview.downloadSvg")}
            onClick={() => {
            downloadSvg(svg, `qr-${config.type}-${Date.now()}.svg`);
            track("export", { format: "svg", action: "download" });
            flash(t("toast.svgSaved"));
            }}
            disabled={!payload.value || !!error}
          >
            <span className="btn-label btn-label--short">SVG</span>
            <span className="btn-label btn-label--full">{t("preview.downloadSvg")}</span>
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
            {busy === "copy" ? (
            t("preview.busy")
            ) : (
            <>
              <span className="btn-label btn-label--short">PNG</span>
              <span className="btn-label btn-label--full">{t("preview.copyPng")}</span>
            </>
            )}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            title={t("preview.copySvg")}
            aria-label={t("preview.copySvg")}
            onClick={async () => {
            const ok = await copyText(svg);
            if (ok) track("export", { format: "svg", action: "copy" });
            else track("export_error", { format: "svg" });
            flash(ok ? t("toast.svgCopied") : t("toast.copyError"));
            }}
            disabled={!payload.value || !!error}
          >
            <span className="btn-label btn-label--short">SVG</span>
            <span className="btn-label btn-label--full">{t("preview.copySvg")}</span>
          </button>
        </div>
    </>
  );

  return (
    <div className="preview">
      <div
        className={"preview__stage" + (payload.value.trim() && !error ? "" : " preview__stage--empty")}
        ref={stageRef}
        style={stageHeight ? { height: stageHeight } : undefined}
      >
        {error ? (
          <div className="preview__error">
            <strong>{t("preview.errorTitle")}</strong>
            <span>{error}</span>
          </div>
        ) : payload.value.trim() ? (
          <div
            ref={canvasRef}
            className="preview__canvas"
            style={config.style.bgTransparent ? { background: "var(--checker)" } : undefined}
          >
            {scene ? <QrCanvas scene={scene} accent={accent} label={payload.value} /> : null}
          </div>
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
          onClick={async () => {
            const ok = await copyText(payload.value);
            if (ok) track("payload_copy", {});
            flash(ok ? t("toast.copied") : t("toast.copyError"));
          }}
        >
          {t("preview.copy")}
        </button>
      </div>

      <div className="preview__actions" ref={actionsRef}>
        <div className="preview__action-grid">
          {renderActions()}
        </div>
      </div>

      {/* Плашка появляется, когда кнопки в блоке уходят из вида */}
      <div className={"preview__bar" + (barVisible ? " is-visible" : "")}>
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
          {renderActions()}
        </div>
      </div>

      <AutoHeight>
        {warnings.length > 0 && (
          <ul className="warnings">
            {warnings.map((w) => (
              <li key={w.kind}>{w.text}</li>
            ))}
          </ul>
        )}
      </AutoHeight>

      {toast && <div className={"toast" + (toast.visible ? " is-visible" : "")}>{toast.text}</div>}
    </div>
  );
}
