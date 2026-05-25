import { ArrowUp } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";

export default function Footer() {
  const { t } = useI18n();

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative z-10 border-t border-white/5 bg-black/30 backdrop-blur-sm py-12 px-6 md:px-12">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        
        <div className="flex flex-col items-center md:items-start text-center md:text-start gap-1">
          <a href="#" className="flex items-center gap-2 group">
            <span className="text-lg font-bold tracking-tight text-white font-heading">
              Yo<span className="text-violet-500">Site</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          </a>
          <p className="text-[10px] text-gray-500 font-light tracking-wide uppercase">
            {t("footer.tagline")}
          </p>
        </div>

        <div className="flex justify-center gap-8">
          <a href="#" className="text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-white transition-colors duration-300">{t("footer.home")}</a>
          <a href="#works" className="text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-white transition-colors duration-300">{t("footer.process")}</a>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <a
              href="https://wa.me/972505114896"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("footer.whatsappAria")}
              className="text-gray-500 hover:text-emerald-400 transition-colors duration-300 flex items-center justify-center"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.729-1.448L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.114-2.908-6.993-1.879-1.879-4.354-2.91-6.993-2.91-5.447 0-9.87 4.424-9.874 9.87-.001 1.716.463 3.39 1.34 4.877l-.994 3.634 3.74-.98zm11.387-5.464c-.307-.154-1.817-.897-2.1-.998-.282-.102-.489-.154-.694.154-.205.308-.795.998-.97 1.205-.175.205-.35.23-.658.077-1.854-.929-3.076-1.922-3.84-3.238-.205-.35.077-.325.325-.82.175-.35.088-.658-.043-.82-.132-.162-.694-1.67-.951-2.29-.25-.6-.532-.516-.694-.524l-.592-.008c-.205 0-.54.077-.82.385-.282.308-1.077 1.05-1.077 2.56 0 1.514 1.102 2.977 1.256 3.183.154.205 2.169 3.313 5.253 4.643.734.316 1.307.505 1.754.647.737.234 1.407.2 1.938.12.592-.09 1.817-.744 2.074-1.46.257-.718.257-1.332.18-1.46-.077-.128-.282-.205-.59-.359z"/>
              </svg>
            </a>
          </div>

          <button
            onClick={handleScrollToTop}
            className="p-2 bg-white/5 border border-white/10 rounded-full text-gray-400 hover:text-white hover:border-white/20 transition-all duration-300 cursor-pointer"
            aria-label={t("footer.backToTopAria")}
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start">
        <p className="text-[10px] text-gray-600 font-light uppercase tracking-wider">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </p>
        <p className="text-[10px] text-gray-600 font-light uppercase tracking-wider">
          {t("footer.studio")}
        </p>
      </div>
    </footer>
  );
}
