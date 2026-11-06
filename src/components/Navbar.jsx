import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLenis } from "lenis/react";
import { useI18n } from "../i18n/I18nContext";
import { isHeroMarksReady, onHeroMarksReady } from "../utils/pageIntroGate";
import { INERTIAL_SCROLL_TO } from "../utils/inertialScroll";
import PageIntro from "./PageIntro";
import LogoMark from "./LogoMark";
import FullscreenMenu from "./nav/FullscreenMenu";
import HeaderContactCTA from "./nav/HeaderContactCTA";
import "../styles/logo-mark.css";

/** Prevent duplicate entrance playback (React Strict Mode). */
let navEntrancePlayed = false;

export default function Navbar() {
  const { t } = useI18n();
  const lenis = useLenis();
  const reducedMotion = useReducedMotion();
  const [entered, setEntered] = useState(
    () => navEntrancePlayed || isHeroMarksReady(),
  );
  const playedRef = useRef(navEntrancePlayed);
  const barRef = useRef(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const bar = barRef.current;
    const hero = document.getElementById("hero");
    let lastY = window.scrollY;
    let travel = 0;
    let direction = 0;
    let heroEnd = 0;
    const measure = () => {
      heroEnd = hero ? hero.getBoundingClientRect().bottom + window.scrollY : window.innerHeight;
    };
    const applyShift = (isHidden) => {
      const height = bar?.offsetHeight || 0;
      document.documentElement.style.setProperty(
        "--yo-header-shift",
        isHidden ? `${-height}px` : "0px",
      );
    };
    const onScroll = () => {
      const y = Math.max(0, Math.min(window.scrollY, document.documentElement.scrollHeight - window.innerHeight));
      const delta = y - lastY;
      lastY = y;
      if (delta > 0) {
        window.dispatchEvent(new Event("yo:header-scroll-down"));
      }
      const focused = bar?.querySelector(":focus-visible");
      if (y < heroEnd || focused) {
        travel = 0;
        direction = 0;
        applyShift(false);
        setHidden(false);
        return;
      }
      if (!delta) return;
      const nextDirection = Math.sign(delta);
      if (nextDirection !== direction) travel = 0;
      direction = nextDirection;
      travel += Math.abs(delta);
      if (travel >= 12) {
        const nextHidden = direction > 0;
        applyShift(nextHidden);
        setHidden(nextHidden);
        travel = 0;
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (hero) observer.observe(hero);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, []);

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
  const scrollToContact = () => {
    const target = document.getElementById("contact-form");
    if (!target) return;
    if (lenis) lenis.scrollTo(target, INERTIAL_SCROLL_TO);
    else target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header>
      <motion.div
        ref={barRef}
        className="yo-sticky-chrome fixed inset-x-0 top-0 z-[9999] overflow-visible"
        data-hidden={hidden}
        onFocusCapture={() => {
          document.documentElement.style.setProperty("--yo-header-shift", "0px");
          setHidden(false);
        }}
        initial={false}
        animate={{ y: hidden ? "-100%" : "0%" }}
        style={{
          pointerEvents: showFinal ? "auto" : "none",
          transformOrigin: "50% 0%",
        }}
        transition={{ duration: reducedMotion ? 0 : 0.52, ease: [0.22, 1, 0.36, 1] }}
      >
        <PageIntro />
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
            <HeaderContactCTA onClick={scrollToContact} />
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
