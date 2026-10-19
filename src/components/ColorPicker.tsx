import { useEffect, useRef, useState } from "react";
import {
  PRESET_COLORS,
  hexToRgb,
  hsvToRgb,
  rgbToHex,
  rgbToHsv,
  type Hsv,
} from "../lib/color";
import { t } from "../lib/i18n";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const hexOf = (hsv: Hsv) => rgbToHex(hsvToRgb(hsv));
const hueColor = (h: number) => hexOf({ h, s: 1, v: 1 });
const isHex = (s: string) => /^#[0-9a-f]{6}$/i.test(s);

/** Всплывающая палитра: поле насыщенности, шкала тона, готовые цвета и HEX. */
export default function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [hsv, setHsv] = useState<Hsv>(() => rgbToHsv(hexToRgb(value) ?? { r: 0, g: 0, b: 0 }));
  const [draft, setDraft] = useState(value);
  const emitted = useRef(value.toLowerCase());
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  // внешнее изменение цвета (например, выбор пресета) подхватываем, своё — игнорируем
  useEffect(() => {
    if (value.toLowerCase() === emitted.current) return;
    const rgb = hexToRgb(value);
    if (rgb) setHsv(rgbToHsv(rgb));
    emitted.current = value.toLowerCase();
    setDraft(value);
  }, [value]);

  const apply = (next: Hsv) => {
    const clamped: Hsv = {
      h: clamp(next.h, 0, 360),
      s: clamp(next.s, 0, 1),
      v: clamp(next.v, 0, 1),
    };
    setHsv(clamped);
    const hex = hexOf(clamped);
    emitted.current = hex;
    setDraft(hex);
    onChange(hex);
  };

  const moveSv = (clientX: number, clientY: number) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    apply({
      ...hsv,
      s: clamp((clientX - rect.left) / rect.width, 0, 1),
      v: 1 - clamp((clientY - rect.top) / rect.height, 0, 1),
    });
  };

  const moveHue = (clientX: number) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    apply({ ...hsv, h: clamp((clientX - rect.left) / rect.width, 0, 1) * 360 });
  };

  return (
    <div className="picker" role="dialog" aria-label={t("aria.colorPicker")}>
      <div
        className="picker__sv"
        ref={svRef}
        style={{ backgroundColor: hueColor(hsv.h) }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          moveSv(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons !== 1) return;
          moveSv(e.clientX, e.clientY);
        }}
      >
        <span className="picker__sv-white" />
        <span className="picker__sv-black" />
        <span
          className="picker__sv-handle"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
        />
      </div>

      <div
        className="picker__hue"
        ref={hueRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          moveHue(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons !== 1) return;
          moveHue(e.clientX);
        }}
      >
        <span className="picker__hue-handle" style={{ left: `${(hsv.h / 360) * 100}%` }} />
      </div>

      <div className="picker__presets">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={"picker__chip" + (c.toLowerCase() === value.toLowerCase() ? " is-active" : "")}
            style={{ backgroundColor: c }}
            title={c}
            aria-label={c}
            onClick={() => {
              const rgb = hexToRgb(c);
              if (!rgb) return;
              emitted.current = c.toLowerCase();
              setHsv(rgbToHsv(rgb));
              setDraft(c);
              onChange(c);
            }}
          />
        ))}
      </div>

      <div className="picker__foot">
        <span className="picker__preview" style={{ backgroundColor: value }} />
        <input
          className="input input--mono picker__hex"
          value={draft}
          spellCheck={false}
          maxLength={7}
          aria-label={t("aria.pickerHex")}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            const clean = raw.trim().startsWith("#") ? raw.trim() : `#${raw.trim()}`;
            if (!isHex(clean)) return;
            const rgb = hexToRgb(clean);
            if (!rgb) return;
            const hex = clean.toLowerCase();
            emitted.current = hex;
            setHsv(rgbToHsv(rgb));
            onChange(hex);
          }}
          onBlur={() => setDraft(value)}
        />
      </div>
    </div>
  );
}
