import { useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "../i18n/I18nContext";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();

  const navLinks = [
    { name: t("nav.home"), href: "#" },
    { name: t("nav.process"), href: "#works" },
  ];

  /* ── Pill bar animation: drop down then expand ── */
  const pillVariants = {
    hidden: {
      y: -50,
      opacity: 0,
      width: "72px",
    },
    visible: {
      y: 0,
      opacity: 1,
      width: "82vw",
      transition: {
        y:       { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: 0.6, ease: "easeOut" },
        width:   { duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: 0.55 },
      },
    },
  };

  /* ── Inner content fades in after expansion ── */
  const contentVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.8, ease: "easeOut", delay: 1.5 },
    },
  };

  return (
    <header>
      {/* Fixed centering wrapper */}
      <div
        className="fixed inset-x-0 flex justify-center pointer-events-none"
        style={{ top: "28px", zIndex: 9999 }}
      >
        {/* The pill navbar */}
        <motion.nav
          variants={pillVariants}
          initial="hidden"
          animate="visible"
          className="pointer-events-auto flex items-center justify-between rounded-full px-4 sm:px-6 lg:px-8 relative overflow-hidden"
          style={{
            maxWidth: "1440px",
            height: "72px",
            background:
              "linear-gradient(135deg, rgba(15, 15, 20, 0.38) 0%, rgba(20, 18, 30, 0.32) 50%, rgba(12, 12, 18, 0.38) 100%)",
            backdropFilter: "blur(28px) saturate(1.3)",
            WebkitBackdropFilter: "blur(28px) saturate(1.3)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: [
              "0 0 50px rgba(160, 90, 255, 0.14)",
              "0 8px 32px rgba(0, 0, 0, 0.35)",
              "inset 0 1px 0 rgba(255, 255, 255, 0.12)",
              "inset 0 -1px 0 rgba(255, 255, 255, 0.04)",
            ].join(", "),
            transformOrigin: "center",
          }}
        >
          {/* Top edge highlight for liquid glass feel */}
          <div
            className="absolute inset-x-0 top-0 h-[1px] pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.18) 30%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.18) 70%, transparent 90%)",
            }}
          />

          {/* Subtle purple glow at bottom */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[1px] w-[40%] pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.4), transparent)",
            }}
          />

          {/* Inner content */}
          <motion.div
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            className="w-full flex items-center justify-between gap-2 relative min-w-0"
          >
            {/* Logo */}
            <a href="#" className="flex items-center gap-0.5 group shrink-0" aria-label={t("nav.logoAria")}>
              <span className="text-2xl font-bold tracking-tight text-white font-heading">
                y
                <span className="text-violet-500 font-extrabold font-sans">
                  .
                </span>
              </span>
            </a>

            {/* Desktop nav links – centered */}
            <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-10">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors duration-300 relative py-1 group"
                >
                  {link.name}
                  <span className="absolute bottom-0 start-0 w-0 h-[1.5px] bg-violet-500 transition-all duration-300 group-hover:w-full" />
                </a>
              ))}
            </nav>

            {/* Desktop: language + CTA */}
            <div className="hidden lg:flex items-center gap-3 shrink-0">
              <LanguageSwitcher />
              <a
                href="#cta"
                className="group inline-flex items-center gap-3 text-xs font-semibold text-white
                           bg-white/[0.06] hover:bg-white/[0.12] transition-all duration-300
                           border border-white/10 hover:border-white/20 rounded-full ps-5 pe-1.5 py-1.5
                           shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
              >
                {t("nav.cta")}
                <span className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[3] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:group-hover:-translate-x-0.5 rtl:group-hover:translate-y-0.5" />
                </span>
              </a>
            </div>

            {/* Mobile: compact lang + menu */}
            <div className="flex lg:hidden items-center gap-2 shrink-0">
              <LanguageSwitcher compact />
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full border border-white/10 bg-white/5 text-gray-400 hover:text-white transition-all cursor-pointer"
                aria-label={t("nav.menuToggle")}
              >
                {isOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </motion.div>
        </motion.nav>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-x-6 lg:hidden flex flex-col gap-6 p-6 rounded-2xl"
            style={{
              top: "112px",
              zIndex: 9998,
              background: "rgba(11, 11, 12, 0.88)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              border: "1px solid rgba(255, 255, 255, 0.10)",
              boxShadow:
                "0 30px 60px rgba(0,0,0,0.85), 0 0 24px rgba(139,92,246,0.1)",
            }}
          >
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-semibold uppercase tracking-wider text-gray-300 hover:text-white transition-colors duration-200"
                >
                  {link.name}
                </a>
              ))}
            </nav>
            <a
              href="#cta"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-white bg-violet-600 hover:bg-violet-700 transition-all rounded-full py-3"
            >
              {t("nav.cta")}
              <ArrowUpRight className="w-4 h-4 rtl:rotate-180" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
