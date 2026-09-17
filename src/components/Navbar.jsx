import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "../i18n/I18nContext";
import { isHeroMarksReady, onHeroMarksReady } from "../utils/pageIntroGate";
import LogoMark from "./LogoMark";
import LanguageSwitcher from "./LanguageSwitcher";
import FullscreenMenu from "./nav/FullscreenMenu";
import "../styles/logo-mark.css";

/** Prevent duplicate entrance playback (React Strict Mode). */
let navEntrancePlayed = false;

export default function Navbar() {
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const [entered, setEntered] = useState(
    () => navEntrancePlayed || isHeroMarksReady(),
  );
  const playedRef = useRef(navEntrancePlayed);

  useEffect(() => {
    if (playedRef.current || navEntrancePlayed) {
      setEntered(true);
      return undefined;
    }

    if (reducedMotion || isHeroMarksReady()) {
      navEntrancePlayed = true;
      playedRef.current = true;
      setEntered(true);
      return undefined;
    }

    return onHeroMarksReady(() => {
      if (playedRef.current || navEntrancePlayed) return;
      navEntrancePlayed = true;
      playedRef.current = true;
      setEntered(true);
    });
  }, [reducedMotion]);

  const showFinal = entered || reducedMotion || navEntrancePlayed;

  return (
    <header>
      <motion.div
        className="yo-sticky-chrome fixed inset-x-0 top-0 z-[9999] overflow-visible bg-transparent"
        initial={false}
        animate={{ y: 0, opacity: 1, scaleX: 1 }}
        style={{
          pointerEvents: showFinal ? "auto" : "none",
          transformOrigin: "50% 0%",
        }}
        transition={{ duration: 0 }}
      >
        <nav
          className="yo-nav mx-auto grid h-[4.25rem] max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-5 sm:px-8 lg:px-10"
          aria-label="Primary"
          dir="ltr"
        >
          <div className="yo-nav__start justify-self-start">
            <FullscreenMenu />
          </div>

          <span className="yo-nav__logo-slot" aria-hidden="true" />

          <div className="yo-nav__end justify-self-end">
            <LanguageSwitcher variant="nav" />
          </div>

          <a href="#" className="yo-nav__logo" aria-label={t("nav.logoAria")}>
            <span
              className="yo-nav__logo-inner font-heading"
              data-intro-logo-target=""
            >
              <LogoMark active={showFinal && !reducedMotion} />
            </span>
          </a>
        </nav>
      </motion.div>
    </header>
  );
}
