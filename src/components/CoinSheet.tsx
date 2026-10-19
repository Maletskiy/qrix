import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { COINS } from "../lib/coins";
import type { Coin } from "../lib/coins";
import { t } from "../lib/i18n";

/** Нижняя модалка со списком монет и сетей: выезжает, закрывается свайпом вниз. */
export default function CoinSheet({
  current,
  onSelect,
  onClose,
}: {
  current: Coin;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  // закрытие с анимацией: сначала уводим панель вниз, потом размонтируем
  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, 260);
  };

  // обработчик Esc всегда смотрит на актуальную версию requestClose
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  // эффект без зависимостей: иначе смена closing в cleanup отменяла бы
  // таймер закрытия, и шторка оставалась бы висеть на экране
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      document.body.style.overflow = previous;
    };
  }, []);

  // Захватываем указатель только когда палец реально поехал: иначе захват
  // съедал клики у крестика и строк списка.
  const captured = useRef(false);
  const swiped = useRef(false);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    startY.current = e.clientY;
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (startY.current === null) return;
    const moved = e.clientY - startY.current;
    if (!captured.current && moved > 8) {
      captured.current = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (captured.current) setDragY(Math.max(0, moved));
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (startY.current === null) return;
    const moved = Math.max(0, e.clientY - startY.current);
    startY.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    captured.current = false;
    setDragging(false);
    if (moved > 90) {
      swiped.current = true;
      requestClose();
    } else {
      setDragY(0);
    }
  };

  return (
    <div className={"sheet" + (closing ? " is-closing" : "")} role="dialog" aria-modal="true" aria-label={t("crypto.coin")}>
      <button
        type="button"
        className="sheet__backdrop"
        onClick={requestClose}
        aria-label={t("aria.close")}
        tabIndex={-1}
      />
      <div
        className={"sheet__panel" + (dragging ? " is-dragging" : "")}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          if (swiped.current) {
            swiped.current = false;
            e.stopPropagation();
            e.preventDefault();
          }
        }}
      >
        <span className="sheet__handle" aria-hidden="true" />
        <div className="sheet__head">
          <h3 className="sheet__title">{t("crypto.coin")}</h3>
          <button
            type="button"
            className="sheet__close"
            onClick={requestClose}
            aria-label={t("aria.close")}
          >
            <svg width="1.05em" height="1.05em" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="coin-list">
          {COINS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={"coin-row" + (c.id === current.id ? " is-active" : "")}
              onClick={() => {
                onSelect(c.id);
                requestClose();
              }}
            >
              <img className="coin-row__logo" src={c.logo} alt="" width={34} height={34} />
              <span className="coin-row__body">
                <span className="coin-row__name">{c.name}</span>
                <span className="coin-row__meta">
                  {c.symbol} · {c.network}
                </span>
              </span>
              {c.id === current.id && (
                <svg
                  className="coin-row__check"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
