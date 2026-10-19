import { useRef } from "react";
import { CAPTION_FONTS, PALETTES } from "../lib/config";
import type { QrConfig, StyleState } from "../lib/config";
import type { DotStyle, EyeBallStyle, EyeFrameStyle, GradientKind } from "../lib/render";
import { DECORATIVE_DOTS, DOTS_SAFE_SCALE, DOT_STYLES, EYE_BALLS, EYE_FRAMES, SAFE_SHAPE_SCALE } from "../lib/styles";
import { readFileAsDataUrl } from "../lib/export";
import { plural, t } from "../lib/i18n";
import ShapeIcon from "./ShapeIcon";
import DirIcon from "./DirIcon";
import { ColorField, Field, IconPicker, Section, Segmented, Slider, Toggle } from "./ui";

type Props = {
  config: QrConfig;
  onChange: (patch: Partial<QrConfig>) => void;
};

export default function StylePanel({ config, onChange }: Props) {
  const style = config.style;
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<StyleState>) => onChange({ style: { ...style, ...patch } });
  const setCaption = (patch: Partial<StyleState["caption"]>) =>
    set({ caption: { ...style.caption, ...patch } });

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert(t("style.logoTooBig"));
      return;
    }
    set({ logo: await readFileAsDataUrl(file) });
  };

  const decorative = DECORATIVE_DOTS.includes(style.dotStyle);
  const isDots = style.dotStyle === "dots";
  const minScale = SAFE_SHAPE_SCALE[style.dotStyle] ?? 1;

  return (
    <>
      <Section title={t("style.title")} collapsible>
        <div className="stack">
          <div className="field">
            <span className="field__label">{t("style.modules")}</span>
            <IconPicker<DotStyle>
              value={style.dotStyle}
              options={DOT_STYLES}
              onChange={(v) => {
                const scale = SAFE_SHAPE_SCALE[v] ?? 1;
                set({ dotStyle: v, shapeScale: scale });
              }}
              render={(v) => <ShapeIcon kind="dot" value={v} />}
            />
          </div>

          {(decorative || isDots) && (
            <Slider
              label={t("style.shapeSize")}
              hint={t("style.shapeSizeHint", { value: (isDots ? DOTS_SAFE_SCALE : minScale).toFixed(2) })}
              value={style.shapeScale}
              min={isDots ? 0.6 : 0.9}
              max={isDots ? 1 : 1.4}
              step={0.02}
              onChange={(v) => set({ shapeScale: v })}
            />
          )}

          <div className="field">
            <span className="field__label">{t("style.markerOutline")}</span>
            <IconPicker<EyeFrameStyle>
              value={style.eyeFrame}
              options={EYE_FRAMES}
              onChange={(v) => set({ eyeFrame: v })}
              render={(v) => <ShapeIcon kind="frame" value={v} />}
            />
          </div>

          <div className="field">
            <span className="field__label">{t("style.markerCore")}</span>
            <IconPicker<EyeBallStyle>
              value={style.eyeBall}
              options={EYE_BALLS}
              onChange={(v) => set({ eyeBall: v })}
              render={(v) => <ShapeIcon kind="ball" value={v} />}
            />
          </div>
        </div>
      </Section>

      <Section title={t("style.colorTitle")} collapsible>
        <div className="stack">
          <div className="field">
            <Segmented
              value={style.fillMode}
              options={[
                { value: "solid", label: t("style.fillSolid") },
                { value: "gradient", label: t("style.fillGradient") },
              ]}
              onChange={(v) => set({ fillMode: v })}
            />
          </div>

          {style.fillMode === "gradient" ? (
            <>
              {/* слева — готовые пресеты, справа — направление градиента */}
              <div className="gradient-grid">
                <div className="field">
                  <span className="field__label">{t("style.presets")}</span>
                  <div className="palettes">
                    {PALETTES.map((p) => {
                      const active =
                        p.c1.toLowerCase() === style.color1.toLowerCase() &&
                        p.bg.toLowerCase() === style.bgColor.toLowerCase();
                      return (
                        <button
                          key={p.nameKey}
                          type="button"
                          className={"palette" + (active ? " is-active" : "")}
                          title={t(p.nameKey)}
                          aria-label={t(p.nameKey)}
                          onClick={() =>
                            set({
                              color1: p.c1,
                              color2: p.c2,
                              bgColor: p.bg,
                              bgTransparent: false,
                            })
                          }
                        >
                          <span
                            className="palette__chip"
                            style={{
                              background: `linear-gradient(135deg, ${p.c1}, ${p.c2})`,
                              borderColor: p.bg,
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="field">
                  <span className="field__label">{t("style.direction")}</span>
                  <Segmented<GradientKind>
                    value={style.gradientKind}
                    columns={5}
                    options={[
                      { value: "vertical", label: <DirIcon kind="vertical" />, title: t("style.dir.vertical") },
                      { value: "horizontal", label: <DirIcon kind="horizontal" />, title: t("style.dir.horizontal") },
                      { value: "diagonal", label: <DirIcon kind="diagonal" />, title: t("style.dir.diagonal") },
                      { value: "diagonalRev", label: <DirIcon kind="diagonalRev" />, title: t("style.dir.diagonalRev") },
                      { value: "radial", label: <DirIcon kind="radial" />, title: t("style.dir.radial") },
                    ]}
                    onChange={(v) => set({ gradientKind: v })}
                  />
                </div>
              </div>

              <div className="grid-3">
                <ColorField
                  label={t("style.color1")}
                  value={style.color1}
                  onChange={(v) => set({ color1: v })}
                />
                <ColorField
                  label={t("style.color2")}
                  value={style.color2}
                  onChange={(v) => set({ color2: v })}
                />
                <ColorField
                  /* перемонтируется при включении прозрачности, чтобы открытая
                     палитра не оставалась висеть поверх тумблера */
                  key={style.bgTransparent ? "bg-transparent" : "bg-solid"}
                  label={t("style.background")}
                  value={style.bgColor}
                  onChange={(v) => set({ bgColor: v })}
                />
              </div>
            </>
          ) : (
            <div className="grid-2">
              <ColorField
                label={t("style.colorCode")}
                value={style.color1}
                onChange={(v) => set({ color1: v })}
              />
              <ColorField
                key={style.bgTransparent ? "bg-transparent" : "bg-solid"}
                label={t("style.background")}
                value={style.bgColor}
                onChange={(v) => set({ bgColor: v })}
              />
            </div>
          )}
          <Toggle
            checked={style.bgTransparent}
            onChange={(v) => set({ bgTransparent: v })}
            label={t("style.transparent")}
          />
        </div>
      </Section>

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

      <Section title={t("style.captionTitle")} collapsible>
        <div className="stack">
          <Toggle
            checked={style.caption.enabled}
            onChange={(v) => setCaption({ enabled: v })}
            label={t("style.captionShow")}
          />
          {style.caption.enabled && (
            <>
              <Field label={t("style.captionText")}>
                <input
                  className="input"
                  value={style.caption.text}
                  placeholder={t("style.captionPlaceholder")}
                  onChange={(e) => setCaption({ text: e.target.value })}
                />
              </Field>
              <div className="field">
                <span className="field__label">{t("style.captionFont")}</span>
                <Segmented
                  value={style.caption.font}
                  columns={3}
                  options={CAPTION_FONTS.map((f) => ({ value: f.value, label: f.label }))}
                  onChange={(v) => setCaption({ font: v })}
                />
              </div>
              <ColorField
                label={t("style.captionColor")}
                value={style.caption.color}
                onChange={(v) => setCaption({ color: v })}
              />
            </>
          )}
        </div>
      </Section>

      <Section title={t("style.paramsTitle")} collapsible>
        <div className="stack">
          <Slider
            label={t("style.pngSize")}
            value={style.size}
            min={256}
            max={2048}
            step={32}
            onChange={(v) => set({ size: v })}
            suffix="px"
          />
          <Slider
            label={t("style.margin")}
            hint={t("style.marginHint")}
            value={style.margin}
            min={0}
            max={10}
            onChange={(v) => set({ margin: v })}
            suffix={(v) => plural(v, t("style.marginUnit"))}
          />
          <div className="field">
            <span className="field__label">{t("style.ecc")}</span>
            <Segmented
              value={style.ecc}
              stack
              options={[
                { value: "L", label: t("style.ecc.L"), title: t("style.ecc.L.title") },
                { value: "M", label: t("style.ecc.M"), title: t("style.ecc.M.title") },
                { value: "Q", label: t("style.ecc.Q"), title: t("style.ecc.Q.title") },
                { value: "H", label: t("style.ecc.H"), title: t("style.ecc.H.title") },
              ]}
              onChange={(v) => set({ ecc: v })}
            />
          </div>
        </div>
      </Section>
    </>
  );
}
