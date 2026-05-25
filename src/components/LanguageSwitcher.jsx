import { useI18n } from "../i18n/I18nContext";
import { LANG_CODES, LANGUAGES } from "../i18n/config";

export default function LanguageSwitcher({ className = "", compact = false }) {
  const { lang, setLang } = useI18n();

  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.04] p-0.5 shrink-0 ${className}`}
    >
      {LANG_CODES.map((code) => {
        const active = lang === code;
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
              ${
                active
                  ? "bg-violet-600/90 text-white shadow-[0_0_12px_rgba(139,92,246,0.35)]"
                  : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.06]"
              }
            `}
          >
            {LANGUAGES[code].label}
          </button>
        );
      })}
    </div>
  );
}
