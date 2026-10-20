import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import type { Option } from "../lib/styles";
import { t } from "../lib/i18n";
import { readClipboard } from "../lib/export";
import ColorPicker from "./ColorPicker";
import SquishSwitch from "./SquishSwitch";

/** Ряд иконок с подсказкой при наведении. */
export function IconPicker<T extends string>({
  value,
  options,
  onChange,
  render,
}: {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  render: (v: T) => ReactNode;
}) {
  return (
    <div className="icon-picker">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={
            "icon-btn" +
            (o.value === value ? " is-active" : "") +
            (o.risky ? " is-risky" : "")
          }
          onClick={() => onChange(o.value)}
          data-tip={t(o.labelKey)}
          aria-label={t(o.labelKey)}
        >
          {render(o.value)}
        </button>
      ))}
    </div>
  );
}

/** Шеврон для сворачиваемых секций. */
function Chevron() {
  return (
    <svg className="section__chevron" width="1.1em" height="1.1em" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Section({
  title,
  hint,
  children,
  aside,
  collapsible = false,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  aside?: ReactNode;
  /** на телефоне заголовок становится кнопкой сворачивания */
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [animating, setAnimating] = useState(false);
  const collapsed = collapsible && !open;

  const toggle = () => {
    setAnimating(true);
    setOpen((was) => !was);
    window.setTimeout(() => setAnimating(false), 360);
  };

  return (
    <section
      className={
        "section" +
        (collapsible ? " section--collapsible" : "") +
        (collapsed ? " is-collapsed" : "") +
        (animating ? " is-animating" : "")
      }
    >
      <header className="section__head">
        {collapsible ? (
          <button
            type="button"
            className="section__toggle"
            aria-expanded={open}
            onClick={toggle}
          >
            <h2 className="section__title">{title}</h2>
            <Chevron />
          </button>
        ) : (
          <div>
            <h2 className="section__title">{title}</h2>
          </div>
        )}
        {aside}
      </header>
      {/* grid-template-rows 1fr → 0fr даёт плавное сворачивание при auto-высоте */}
      <div className="section__body-wrap">
        <div className="section__body-clip">
          <div className="section__body">
            {collapsible && hint ? <p className="section__hint section__hint--inside">{hint}</p> : null}
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Кнопка «Вставить»: подставляет текст из буфера обмена в поле. */
export function PasteButton({ onValue }: { onValue: (text: string) => void }) {
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const fieldInput = () =>
    btnRef.current?.closest(".field")?.querySelector("input, textarea") as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;

  const paste = async () => {
    const text = await readClipboard();

    if (text) {
      onValue(text.trim());
      // фокус нужен, чтобы поле показало полный вид значения, а не сокращённый
      fieldInput()?.focus();
      return;
    }

    // Браузер не дал прочитать буфер (iOS всегда спрашивает разрешение на это).
    // Ставим курсор и выделяем содержимое: системная «Вставить» заменит его целиком.
    const input = fieldInput();
    input?.focus();
    input?.select();
  };

  return (
    <button ref={btnRef} type="button" className="field__paste" onClick={paste}>
      {t("field.paste")}
    </button>
  );
}

export function Field({
  label,
  hint,
  action,
  children,
}: {
  label: string;
  hint?: string;
  /** кнопка справа от заголовка поля */
  action?: ReactNode;
  children: ReactNode;
}) {
  // Поле с кнопкой действия не оборачиваем в <label>: кнопка внутри метки
  // становится её контролом, и браузер подсвечивает её как :hover, когда
  // курсор находится в любой точке поля (а клик по тексту нажимал бы кнопку).
  const Tag = action ? "div" : "label";

  return (
    <Tag className="field">
      {action ? (
        <span className="field__head">
          <span className="field__label">{label}</span>
          {action}
        </span>
      ) : (
        <span className="field__label">{label}</span>
      )}
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </Tag>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  columns,
  wrap,
  stack,
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  columns?: number;
  wrap?: boolean;
  /** на узких экранах переключатель становится вертикальным */
  stack?: boolean;
}) {
  return (
    <div
      className={
        "segmented" + (wrap ? " segmented--wrap" : "") + (stack ? " segmented--stack" : "")
      }
      style={
        columns && !wrap
          ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
          : undefined
      }
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          className={"segmented__item" + (o.value === value ? " is-active" : "")}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Деления внутри слайдера — каждые 10% (как в reactbits scrubber). */
const TICKS = [10, 20, 30, 40, 50, 60, 70, 80, 90];

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
  hint,
}: {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  /** единица измерения: строка или функция от значения — для склонений */
  suffix?: string | ((value: number) => string);
  hint?: string;
}) {
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const [active, setActive] = useState(false);
  const suffixText = typeof suffix === "function" ? suffix(value) : suffix;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  // Считаем значение по координате пальца/курсора: на мобилке это даёт
  // привычное «нажал и тянешь», а не только тап по точке.
  const valueFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return value;
    const rect = el.getBoundingClientRect();
    const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    const raw = min + Math.min(1, Math.max(0, ratio)) * (max - min);
    const stepped = Math.round((raw - min) / step) * step + min;
    return Math.min(max, Math.max(min, Number(stepped.toFixed(4))));
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    setActive(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(valueFromClientX(e.clientX));
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    onChange(valueFromClientX(e.clientX));
  };

  const stopDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    setActive(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div className="scrubber">
      <div
        className="scrubber__track"
        ref={trackRef}
        data-active={active}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        <div className="scrubber__fill" style={{ width: `${percent}%` }} />
        <div className="scrubber__ticks" aria-hidden="true">
          {TICKS.map((p) => (
            <div key={p} className="scrubber__tick" style={{ left: `${p}%` }} />
          ))}
        </div>
        <div className="scrubber__thumb-wrap" style={{ left: `${percent}%` }}>
          <div className="scrubber__thumb" />
        </div>
        {label ? <div className="scrubber__label">{label}</div> : null}
        <div className="scrubber__value">
          {value}
          {suffixText ? ` ${suffixText}` : ""}
        </div>
        <input
          className="scrubber__input"
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
      {hint ? <span className="field__hint">{hint}</span> : null}
    </div>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    if (!open) return;
    // pointerdown вместо mousedown: на телефоне тап не всегда рождает mousedown,
    // из-за чего палитра могла остаться открытой
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const commitDraft = (raw: string) => {
    setDraft(raw);
    const clean = raw.trim().replace(/^#?/, "#");
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) onChange(clean.toLowerCase());
  };

  return (
    <div className="color" ref={wrapRef}>
      <span className="field__label">{label}</span>
      <div className="color__control">
        <button
          type="button"
          className={"color__swatch" + (open ? " is-open" : "")}
          style={{ backgroundColor: value }}
          onClick={() => setOpen((wasOpen) => !wasOpen)}
          aria-label={t("aria.openPalette", { label })}
          aria-expanded={open}
          title={value}
        />
        <input
          className="input input--mono color__hex"
          value={draft}
          spellCheck={false}
          maxLength={7}
          aria-label={label}
          onChange={(e) => commitDraft(e.target.value)}
          onBlur={() => setDraft(value)}
        />
      </div>
      {open && <ColorPicker value={value} onChange={onChange} />}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  // Где началось нажатие. Строка слушает pointerup, а не click: на тач-
  // устройствах браузер присылает click с задержкой, и если из-за
  // переключения макет уже съехал, click прилетает по строке — получалось
  // второе срабатывание, и тумблер «не выключался».
  const fromSwitch = useRef(false);

  return (
    <div
      className="toggle"
      onPointerDown={(e) => {
        fromSwitch.current = !!(e.target as HTMLElement).closest(".toggle__switch");
      }}
      onPointerUp={() => {
        if (fromSwitch.current) {
          fromSwitch.current = false;
          return;
        }
        onChange(!checked);
      }}
    >
      <span className="toggle__switch">
        <SquishSwitch
          checked={checked}
          onChange={onChange}
          width={56}
          height={32}
          radius={16}
          trackColor="#15181d"
          trackOnColor="rgba(209, 254, 23, 0.12)"
          thumbColor="#3a3d41"
          thumbOnColor="#d1fe17"
          hoverScale={1.05}
          ariaLabel={label}
        />
      </span>
      <span className="toggle__text">
        <span className="toggle__label">{label}</span>
        {hint ? <span className="toggle__hint">{hint}</span> : null}
      </span>
    </div>
  );
}
