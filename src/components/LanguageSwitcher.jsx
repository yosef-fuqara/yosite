import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n/I18nContext";
import { LANG_CODES, LANGUAGES } from "../i18n/config";

export default function LanguageSwitcher({
  className = "",
  compact = false,
  light = false,
  variant = "pills",
}) {
  const { lang, setLang, t } = useI18n();
  const menuId = useId();
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return undefined;

    const place = () => {
      const r = rootRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 8, left: r.right });
    };

    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointer = (event) => {
      const target = event.target;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (variant === "nav") {
    const menu = open ? (
      <ul
        ref={menuRef}
        id={menuId}
        className="yo-lang__menu"
        role="listbox"
        aria-label={t("nav.languagesAria")}
        style={{ top: menuPos.top, left: menuPos.left }}
      >
        {LANG_CODES.map((code) => {
          const active = lang === code;
          return (
            <li key={code} role="none">
              <button
                type="button"
                role="option"
                aria-selected={active}
                className="yo-lang__option"
                data-active={active ? "true" : "false"}
                onClick={() => {
                  setLang(code);
                  setOpen(false);
                }}
              >
                {LANGUAGES[code].label}
              </button>
            </li>
          );
        })}
      </ul>
    ) : null;

    return (
      <div ref={rootRef} className={`yo-lang ${className}`.trim()}>
        <button
          type="button"
          className="yo-lang__btn"
          aria-expanded={open}
          aria-controls={menuId}
          aria-haspopup="listbox"
          aria-label={t("nav.languagesAria")}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span>{LANGUAGES[lang].label}</span>
          <svg
            className="yo-lang__chevron"
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1 1.15L5 4.85L9 1.15"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {typeof document !== "undefined" && menu
          ? createPortal(menu, document.body)
          : null}
      </div>
    );
  }

  const shell = light
    ? "border-black/10 bg-black/[0.03]"
    : "border-white/10 bg-white/[0.04]";

  return (
    <div
      role="group"
      aria-label={t("nav.languagesAria")}
      className={`inline-flex items-center gap-0.5 rounded-full border p-0.5 shrink-0 ${shell} ${className}`}
    >
      {LANG_CODES.map((code) => {
        const active = lang === code;
        const activeClass = light
          ? "bg-black text-white"
          : "bg-white/90 text-black shadow-[0_0_12px_rgba(255,255,255,0.35)]";
        const idleClass = light
          ? "text-neutral-400 hover:text-black hover:bg-black/[0.05]"
          : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.06]";

        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            aria-label={LANGUAGES[code].label}
            className={`
              ${compact ? "min-w-[1.65rem] px-1 py-0.5 text-[9px]" : "min-w-[1.85rem] px-1.5 py-1 text-[10px]"}
              font-bold tracking-wide rounded-full transition-all duration-200 cursor-pointer
              ${active ? activeClass : idleClass}
            `}
          >
            {LANGUAGES[code].label}
          </button>
        );
      })}
    </div>
  );
}
