import { useCallback, useEffect, useMemo, useState } from "react";
import ContentPanel from "./components/ContentPanel";
import StylePanel from "./components/StylePanel";
import Preview from "./components/Preview";
import { defaultConfig, configFromQuery } from "./lib/config";
import type { QrConfig } from "./lib/config";
import { encodeMatrix } from "./lib/qr";
import { renderSvg } from "./lib/render";
import { buildPayload } from "./lib/payload";
import { LANGS, t } from "./lib/i18n";
import { useI18n } from "./lib/i18n/useI18n";

export default function App() {
  const { lang, setLang } = useI18n();

  const [config, setConfig] = useState<QrConfig>(() => ({
    ...defaultConfig,
    ...configFromQuery(window.location.search),
  }));

  const onChange = useCallback((patch: Partial<QrConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  // пересобираем содержимое при смене языка: примечания и подсказки локализуются
  const payload = useMemo(() => buildPayload(config), [config, lang]);

  const encoded = useMemo(
    () => (payload.value.trim() ? encodeMatrix(payload.value, config.style.ecc) : null),
    [payload.value, config.style.ecc]
  );

  const svg = useMemo(() => {
    if (!encoded || !encoded.ok) return "";
    return renderSvg({
      matrix: encoded.matrix,
      size: config.style.size,
      margin: config.style.margin,
      dotStyle: config.style.dotStyle,
      eyeFrame: config.style.eyeFrame,
      eyeBall: config.style.eyeBall,
      fillMode: config.style.fillMode,
      gradientKind: config.style.gradientKind,
      color1: config.style.color1,
      color2: config.style.color2,
      bgColor: config.style.bgColor,
      bgTransparent: config.style.bgTransparent,
      logo: config.style.logo,
      logoRatio: config.style.logoRatio,
      logoPadding: config.style.logoPadding,
      logoRadius: config.style.logoRadius,
      // пока пользователь не ввёл свой текст, подпись следует за языком
      caption: {
        ...config.style.caption,
        text: config.style.caption.text.trim() || t("style.captionPlaceholder"),
      },
      shapeScale: config.style.shapeScale,
      dotRadius: config.style.dotRadius,
    });
  }, [encoded, config.style, lang]);

  const error = encoded && !encoded.ok ? encoded.error : null;

  useEffect(() => {
    document.title = `Qrix — ${t("app.tagline")}`;
  }, [lang]);

  return (
    <>
      <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <img className="topbar__mark" src="/qrix-logo.svg" alt="" aria-hidden="true" />
          <div>
            <h1>Qrix</h1>
            <p>{t("app.slogan")}</p>
          </div>
        </div>
        <div className="topbar__actions">
          <div className="lang" role="group" aria-label="Language">
            {LANGS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={"lang__item" + (item.value === lang ? " is-active" : "")}
                title={item.title}
                onClick={() => setLang(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setConfig(defaultConfig);
              window.history.replaceState(null, "", window.location.pathname);
            }}
          >
            {t("app.reset")}
          </button>
        </div>
      </header>

      <main className="layout">
        <div className="layout__controls">
          <ContentPanel config={config} onChange={onChange} />
          <StylePanel config={config} onChange={onChange} />
        </div>
        <aside className="layout__preview">
          <Preview svg={svg} payload={payload} config={config} error={error} />
        </aside>
      </main>

      <footer className="footer">
        <div className="footer__left">
          <span>{t("app.footerPrivacy")}</span>
          <span>{t("app.footerFormats")}</span>
        </div>
        <div className="footer__right">
          Built by{" "}
          <a
            className="footer__author"
            href="https://maletskiy-design.ru"
            target="_blank"
            rel="noopener noreferrer"
          >
            Maletskiy Design
            <span className="line" aria-hidden="true" />
          </a>
        </div>
      </footer>
      </div>
    </>
  );
}
