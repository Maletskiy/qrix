import { useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  createDynamicCode,
  deleteDynamicCode,
  dynamicStats,
  refreshDynamicCodes,
  shortDate,
  updateDynamicCode,
  type DynamicCode,
  type DynamicStats,
} from "../lib/dynamic";
import { track } from "../lib/analytics";
import { copyText } from "../lib/export";
import { plural, t } from "../lib/i18n";
import { useI18n } from "../lib/i18n/useI18n";
import { encodeMatrix } from "../lib/qr";
import { renderSvg, type RenderOptions } from "../lib/render";
import { AutoHeight, Field, Section } from "./ui";

/** Сколько кодов даётся без лицензии — столько же, сколько на сервере. */
const FREE_CODES = 3;

/** Миниатюра QR для карточки: короткий адрес в компактном стиле. */
function thumb(url: string): string {
  const encoded = encodeMatrix(url, "M");
  if (!encoded.ok) return "";
  const options: RenderOptions = {
    matrix: encoded.matrix,
    size: 240,
    margin: 3,
    dotStyle: "rounded",
    eyeFrame: "rounded",
    eyeBall: "rounded",
    fillMode: "solid",
    gradientKind: "vertical",
    color1: "#0b0c0e",
    color2: "#0b0c0e",
    bgColor: "#ffffff",
    bgTransparent: false,
    logo: null,
    logoPlateColor: "#ffffff",
    logoRatio: 0.22,
    logoPadding: 0.9,
    logoRadius: 0.5,
    caption: { enabled: false, text: "", color: "#0b0c0e", font: "Google Sans", scale: 1 },
    shapeScale: 0.98,
    dotRadius: 0.5,
  };
  return renderSvg(options);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function DynamicPanel({ onUseLink }: { onUseLink?: (url: string) => void }) {
  const { lang } = useI18n();

  const [codes, setCodes] = useState<DynamicCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draftUrl, setDraftUrl] = useState("");
  const [draftSlug, setDraftSlug] = useState("");
  const [slugOpen, setSlugOpen] = useState(false);

  /** Черновики адресов по слагам: правка карточки ещё не отправлена. */
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  /** Карточки, которые сейчас уезжают: держим их в DOM до конца анимации. */
  const [leaving, setLeaving] = useState<string[]>([]);

  const [statsOpen, setStatsOpen] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, DynamicStats>>({});

  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    refreshDynamicCodes()
      .then((list) => {
        if (alive) setCodes(list);
      })
      .catch(() => {
        /* нет бэкенда или база недоступна — панель просто пустая */
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    };
  }, []);

  const left = Math.max(0, FREE_CODES - codes.length);

  const create = async () => {
    if (creating || !draftUrl.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const code = await createDynamicCode({
        url: draftUrl,
        slug: draftSlug.trim() || undefined,
      });
      track("dyn_create", { custom_slug: Boolean(draftSlug.trim()) });
      setCodes((prev) => [code, ...prev]);
      setDraftUrl("");
      setDraftSlug("");
      setSlugOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.code === "limit_reached") track("dyn_limit", {});
      setError(err instanceof ApiError ? err.message : t("dyn.errorGeneric"));
    } finally {
      setCreating(false);
    }
  };

  const flash = (slug: string) => {
    setCopied(slug);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(null), 1400);
  };

  const copy = async (code: DynamicCode) => {
    const ok = await copyText(code.shortUrl);
    if (ok) flash(code.slug);
  };

  const saveTarget = async (code: DynamicCode) => {
    const key = code.key;
    const next = (targets[code.slug] ?? code.url).trim();
    if (!key || !next || next === code.url) return;
    setBusy(code.slug);
    setError(null);
    try {
      const updated = await updateDynamicCode(code.slug, key, { url: next });
      track("dyn_edit", {});
      setCodes((prev) => prev.map((row) => (row.slug === code.slug ? updated : row)));
      setTargets((prev) => {
        const copy = { ...prev };
        delete copy[code.slug];
        return copy;
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("dyn.errorGeneric"));
    } finally {
      setBusy(null);
    }
  };

  const togglePause = async (code: DynamicCode) => {
    if (!code.key) return;
    setBusy(code.slug);
    setError(null);
    try {
      const updated = await updateDynamicCode(code.slug, code.key, { paused: !code.paused });
      setCodes((prev) => prev.map((row) => (row.slug === code.slug ? updated : row)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("dyn.errorGeneric"));
    } finally {
      setBusy(null);
    }
  };

  /** Удаление с выходной анимацией: сначала уезжает, потом исчезает. */
  const remove = async (code: DynamicCode) => {
    if (!code.key) return;
    setConfirming(null);
    setBusy(code.slug);
    try {
      await deleteDynamicCode(code.slug, code.key);
      setLeaving((prev) => [...prev, code.slug]);
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      window.setTimeout(
        () => {
          setCodes((prev) => prev.filter((row) => row.slug !== code.slug));
          setLeaving((prev) => prev.filter((slug) => slug !== code.slug));
        },
        reduced ? 0 : 300
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("dyn.errorGeneric"));
    } finally {
      setBusy(null);
    }
  };

  const openStats = async (code: DynamicCode) => {
    if (statsOpen === code.slug) {
      setStatsOpen(null);
      return;
    }
    setStatsOpen(code.slug);
    if (stats[code.slug] || !code.key) return;
    try {
      const data = await dynamicStats(code.slug, code.key);
      setStats((prev) => ({ ...prev, [code.slug]: data }));
    } catch {
      /* статистика не критична: карточка просто останется без графика */
    }
  };

  return (
    <Section title={t("dyn.title")} hint={t("dyn.hint")} collapsible>
      <div className="stack">
        <Field label={t("dyn.urlLabel")} hint={t("dyn.urlHint")}>
          <input
            className="input input--mono"
            value={draftUrl}
            placeholder={t("dyn.urlPlaceholder")}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => setDraftUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
            }}
          />
        </Field>

        <div className="dyn-form__row">
          <button
            type="button"
            className="dyn-link"
            aria-expanded={slugOpen}
            onClick={() => setSlugOpen((open) => !open)}
          >
            {slugOpen ? t("dyn.customSlugHide") : t("dyn.customSlugShow")}
          </button>
          <span className="dyn-free" aria-live="polite">
            {t("dyn.freeCounter")
              .replace("{left}", String(left))
              .replace("{total}", String(FREE_CODES))}
          </span>
        </div>

        {/* обёртка нужна, чтобы пустой блок не добавлял двойной зазор стека */}
        <div className={"dyn-slug" + (slugOpen ? " is-open" : "")}>
          <AutoHeight>
          {slugOpen ? (
            <Field label={t("dyn.customSlug")} hint={t("dyn.customSlugHint")}>
              <span className="dyn-prefix">
                <span className="dyn-prefix__host">/d/</span>
                <input
                  className="input input--mono"
                  value={draftSlug}
                  placeholder={t("dyn.customSlugPlaceholder")}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(e) => setDraftSlug(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") create();
                  }}
                />
              </span>
            </Field>
          ) : null}
          </AutoHeight>
        </div>

        <div className="dyn-create">
          <button
            type="button"
            className="btn btn--primary"
            onClick={create}
            disabled={creating || !draftUrl.trim() || left === 0}
          >
            {creating ? t("dyn.creating") : t("dyn.create")}
          </button>
          {left === 0 ? (
            <span className="dyn-limit">{t("dyn.limitHint")}</span>
          ) : null}
        </div>

        {error ? (
          <p className="dyn-error" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? null : codes.length === 0 ? (
          <p className="dyn-empty">{t("dyn.empty")}</p>
        ) : (
          <ul className="dyn-list">
            {codes.map((code) => (
              <DynamicCard
                key={code.slug}
                code={code}
                lang={lang}
                leaving={leaving.includes(code.slug)}
                busy={busy === code.slug}
                copied={copied === code.slug}
                confirming={confirming === code.slug}
                statsOpen={statsOpen === code.slug}
                stats={stats[code.slug]}
                target={targets[code.slug] ?? code.url}
                onTarget={(value) => setTargets((prev) => ({ ...prev, [code.slug]: value }))}
                onSave={() => saveTarget(code)}
                onCopy={() => copy(code)}
                onPause={() => togglePause(code)}
                onStats={() => openStats(code)}
                onConfirm={() => setConfirming(code.slug)}
                onCancel={() => setConfirming(null)}
                onRemove={() => remove(code)}
                onUse={
                  onUseLink
                    ? () => {
                        track("dyn_use", {});
                        onUseLink(code.shortUrl);
                      }
                    : undefined
                }
              />
            ))}
          </ul>
        )}

        <p className="dyn-note">{t("dyn.keyNote")}</p>
      </div>
    </Section>
  );
}

type CardProps = {
  code: DynamicCode;
  lang: string;
  leaving: boolean;
  busy: boolean;
  copied: boolean;
  confirming: boolean;
  statsOpen: boolean;
  stats?: DynamicStats;
  target: string;
  onTarget: (value: string) => void;
  onSave: () => void;
  onCopy: () => void;
  onPause: () => void;
  onStats: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onRemove: () => void;
  /** Подставить короткий адрес в генератор, чтобы стилизовать код. */
  onUse?: () => void;
};

function DynamicCard({
  code,
  lang,
  leaving,
  busy,
  copied,
  confirming,
  statsOpen,
  stats,
  target,
  onTarget,
  onSave,
  onCopy,
  onPause,
  onStats,
  onConfirm,
  onCancel,
  onRemove,
  onUse,
}: CardProps) {
  const svg = useMemo(() => thumb(code.shortUrl), [code.shortUrl]);
  const short = code.shortUrl.replace(/^https?:\/\//, "");
  const dirty = target.trim() && target.trim() !== code.url;

  return (
    <li className={"dyn-card" + (leaving ? " is-leaving" : "") + (code.paused ? " is-paused" : "")}>
      <div className="dyn-card__qr" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />

      <div className="dyn-card__body">
        <div className="dyn-card__head">
          <code className="dyn-card__short">{short}</code>
          <span className="dyn-card__scans">
            {code.scans} {plural(code.scans, t("dyn.scansUnit"))}
          </span>
        </div>

        <div className="dyn-card__target">
          <input
            className="input input--mono dyn-card__target-input"
            value={target}
            spellCheck={false}
            autoComplete="off"
            aria-label={t("dyn.target")}
            onChange={(e) => onTarget(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave();
            }}
          />
          <button
            type="button"
            className="btn btn--ghost dyn-card__save"
            onClick={onSave}
            disabled={!dirty || busy}
          >
            {busy ? t("dyn.saving") : t("dyn.save")}
          </button>
        </div>

        <div className="dyn-card__meta">
          <span>{hostOf(code.url)}</span>
          <span className="dyn-card__dot" aria-hidden="true" />
          <span>{shortDate(code.updatedAt, lang)}</span>
          {code.paused ? (
            <>
              <span className="dyn-card__dot" aria-hidden="true" />
              <span className="dyn-card__badge">{t("dyn.paused")}</span>
            </>
          ) : null}
        </div>

        <div className="dyn-card__actions">
          <button type="button" className="btn btn--tiny" onClick={onCopy}>
            {copied ? t("dyn.copied") : t("dyn.copy")}
          </button>
          <a className="btn btn--tiny" href={code.shortUrl} target="_blank" rel="noreferrer noopener">
            {t("dyn.open")}
          </a>
          {onUse ? (
            <button type="button" className="btn btn--tiny" onClick={onUse}>
              {t("dyn.useInGenerator")}
            </button>
          ) : null}
          <button type="button" className="btn btn--tiny" onClick={onStats} aria-expanded={statsOpen}>
            {t("dyn.stats")}
          </button>
          <button type="button" className="btn btn--tiny" onClick={onPause} disabled={busy}>
            {code.paused ? t("dyn.resume") : t("dyn.pause")}
          </button>
          {confirming ? (
            <span className="dyn-confirm">
              <span>{t("dyn.removeConfirm")}</span>
              <button type="button" className="btn btn--tiny dyn-danger" onClick={onRemove}>
                {t("dyn.remove")}
              </button>
              <button type="button" className="btn btn--tiny" onClick={onCancel}>
                {t("dyn.cancel")}
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn--tiny dyn-muted" onClick={onConfirm}>
              {t("dyn.remove")}
            </button>
          )}
        </div>

        <AutoHeight>
          {statsOpen ? (
            <div className="dyn-stats">
              {stats ? (
                stats.total === 0 ? (
                  <span className="dyn-stats__empty">{t("dyn.statsEmpty")}</span>
                ) : (
                  <>
                    <div className="dyn-stats__head">
                      <span>{t("dyn.days14")}</span>
                      <span className="dyn-stats__total">
                        {stats.total} {plural(stats.total, t("dyn.scansUnit"))}
                      </span>
                    </div>
                    <Sparkline days={stats.days} />
                    <div className="dyn-stats__legend">
                      {Object.entries(devicesOf(stats)).map(([name, count]) => (
                        <span key={name}>
                          {deviceLabel(name)} · {count}
                        </span>
                      ))}
                    </div>
                  </>
                )
              ) : (
                <span className="dyn-stats__empty">…</span>
              )}
            </div>
          ) : null}
        </AutoHeight>
      </div>
    </li>
  );
}

/** Последние 14 дней по порядку, с нулями там, где сканов не было. */
function Sparkline({ days }: { days: DynamicStats["days"] }) {
  const values = useMemo(() => {
    const out: number[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
      out.push(days[date]?.scans ?? 0);
    }
    return out;
  }, [days]);

  const max = Math.max(1, ...values);

  return (
    <div className="dyn-spark" aria-hidden="true">
      {values.map((value, index) => (
        <span
          key={index}
          className={"dyn-spark__bar" + (value ? "" : " is-empty")}
          style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function devicesOf(stats: DynamicStats): Record<string, number> {
  const all: Record<string, number> = {};
  for (const day of Object.values(stats.days)) {
    for (const [name, count] of Object.entries(day.devices)) {
      all[name] = (all[name] ?? 0) + count;
    }
  }
  return all;
}

function deviceLabel(name: string): string {
  if (name === "phone") return t("dyn.devicePhone");
  if (name === "tablet") return t("dyn.deviceTablet");
  return t("dyn.deviceDesktop");
}
