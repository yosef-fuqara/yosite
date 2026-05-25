import { useCallback, useMemo, useRef } from "react";
import {
  ShoppingBag,
  Building2,
  Layout,
  Calendar,
  Scissors,
  UtensilsCrossed,
  Rocket,
  LayoutDashboard,
  Code2,
  Settings,
  Package,
  User,
  Briefcase,
  Home,
  Stethoscope,
  GraduationCap,
} from "lucide-react";
import { useI18n } from "../i18n/I18nContext";

const TICKER_ICONS = [
  ShoppingBag,
  Building2,
  Layout,
  Calendar,
  Scissors,
  UtensilsCrossed,
  Rocket,
  LayoutDashboard,
  Code2,
  Settings,
  Package,
  User,
  Briefcase,
  Home,
  Stethoscope,
  GraduationCap,
];

const TICKER_FONT_CLASS = {
  he: "build-ticker-font-he",
  ar: "build-ticker-font-ar",
};

function TickerChip({ label, Icon, lang }) {
  return (
    <span
      data-lang={lang}
      className={`build-ticker-chip inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-gray-300 md:px-4 md:py-2 md:text-sm ${TICKER_FONT_CLASS[lang] || ""}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-violet-400 md:h-4 md:w-4" aria-hidden />
      <span className="whitespace-nowrap font-light">{label}</span>
    </span>
  );
}

export default function BuildTicker() {
  const { tm, lang } = useI18n();
  const viewportRef = useRef(null);

  const handlePointerDown = useCallback((e) => {
    const el = viewportRef.current;
    if (!el || e.button !== 0) return;

    const startX = e.clientX;
    const startScroll = el.scrollLeft;
    el.setPointerCapture(e.pointerId);
    el.classList.add("build-ticker-dragging");

    const onMove = (ev) => {
      el.scrollLeft = startScroll - (ev.clientX - startX);
    };

    const onUp = () => {
      el.releasePointerCapture(e.pointerId);
      el.classList.remove("build-ticker-dragging");
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  }, []);

  const items = useMemo(() => {
    const list = tm("services.tickerItems");
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }, [lang, tm]);

  if (!items.length) return null;

  const loop = [...items, ...items];

  return (
    <div
      key={lang}
      className={`build-ticker-mask build-ticker-lang-${lang} mt-6 w-full min-w-0 max-w-full overflow-hidden`}
      aria-hidden
    >
      <div className="group/build-ticker glass-panel overflow-hidden rounded-xl border border-white/5 py-2 md:py-2.5">
        {/* dir=ltr keeps the infinite loop seamless for all UI languages (he/ar/ru/en) */}
        <div
          ref={viewportRef}
          className="build-ticker-viewport overflow-x-auto no-scrollbar overscroll-x-contain cursor-grab touch-pan-x active:cursor-grabbing"
          dir="ltr"
          onPointerDown={handlePointerDown}
          onWheel={(e) => {
            if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
            e.preventDefault();
            viewportRef.current.scrollLeft += e.deltaY;
          }}
        >
          <div className="build-ticker-track flex w-max items-center gap-3 px-3 md:gap-4 md:px-4">
            {loop.map((label, index) => {
              const Icon = TICKER_ICONS[index % TICKER_ICONS.length] ?? Layout;
              return (
                <TickerChip
                  key={`${lang}-${index}-${label}`}
                  label={label}
                  Icon={Icon}
                  lang={lang}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
