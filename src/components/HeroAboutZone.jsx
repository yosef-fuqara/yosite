import { useRef, useState, useEffect } from "react";
import {
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import HeroSection from "./hero/HeroSection";
import AboutSection from "./AboutSection";
import { HeroAboutContext } from "./heroAboutContext";
import "../styles/hero-about-transition.css";

function applyHeroExit(zone, progress, reducedMotion) {
  if (!zone) return;

  if (reducedMotion) {
    zone.style.removeProperty("--hero-exit-t");
    zone.style.removeProperty("--hero-exit-y");
    zone.style.removeProperty("--hero-exit-opacity");
    zone.dataset.transition = "idle";
    zone.dataset.transitionComplete = "true";
    return;
  }

  /* About sits on the fold, so progress hovers near 0 at rest.
     Arm late, disarm only when truly settled — avoids idle↔active flicker. */
  const wasActive = zone.dataset.transition === "active";
  const active = wasActive ? progress > 0.006 : progress > 0.04;
  zone.dataset.transition = active ? "active" : "idle";
  zone.dataset.transitionComplete = progress >= 0.995 ? "true" : "false";

  const title = zone.querySelector(".yo-hero__title");
  const hero = zone.querySelector(".yo-hero");
  const vh = window.innerHeight || 1;
  const prevT = Number.parseFloat(zone.style.getPropertyValue("--hero-exit-t")) || 0;
  const heroPullPx = active ? prevT * vh * 0.06 : 0;

  let exitT = 0;
  if (title && hero) {
    const naturalTop =
      hero.getBoundingClientRect().bottom + heroPullPx - title.offsetHeight;
    const start = Math.max(vh * 0.2, 128);
    const span = Math.max(vh * 0.36, 240);
    const raw = (start - naturalTop) / span;
    const linear = raw <= 0 ? 0 : Math.min(1, raw);
    exitT = linear * linear;
  }

  zone.style.setProperty("--hero-exit-t", exitT === 0 ? "0" : exitT.toFixed(4));
  zone.style.setProperty(
    "--hero-exit-opacity",
    exitT === 0 ? "1" : String(Math.max(0, 1 - exitT * 0.94)),
  );
  zone.style.removeProperty("--hero-exit-y");
}

function applySheet(sheet, rise) {
  if (!sheet || !rise) return;
  sheet.style.opacity = "0";
  rise.style.transform = "translate3d(0, 100%, 0)";
}

function applyAboutEnter(aboutEl) {
  if (!aboutEl) return;
  aboutEl.style.setProperty("--about-enter", "1");
}

export default function HeroAboutZone() {
  const zoneRef = useRef(null);
  const sheetRef = useRef(null);
  const riseRef = useRef(null);
  const aboutRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [transitionComplete, setTransitionComplete] = useState(false);

  const { scrollYProgress } = useScroll({
    target: aboutRef,
    offset: ["start end", "start start"],
  });

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    setTransitionProgress(progress);
    setTransitionComplete(progress >= 0.995);

    applyHeroExit(zoneRef.current, progress, reducedMotion);
    applySheet(sheetRef.current, riseRef.current);
    applyAboutEnter(aboutRef.current);
  });

  useEffect(() => {
    const sync = () => {
      const progress = scrollYProgress.get();
      setTransitionProgress(progress);
      setTransitionComplete(progress >= 0.995);
      applyHeroExit(zoneRef.current, progress, reducedMotion);
      applySheet(sheetRef.current, riseRef.current);
      applyAboutEnter(aboutRef.current);
    };

    sync();
    window.addEventListener("resize", sync);

    return () => {
      window.removeEventListener("resize", sync);
    };
  }, [reducedMotion, scrollYProgress]);

  return (
    <HeroAboutContext.Provider
      value={{ transitionProgress, transitionComplete }}
    >
      <div
        ref={zoneRef}
        className={`hero-about-zone${reducedMotion ? " is-reduced" : ""}`}
        data-transition="idle"
      >
        <HeroSection />

        <div
          className="hero-about-sheet-layer"
          aria-hidden="true"
          ref={sheetRef}
        >
          <div className="hero-about-sheet-rise" ref={riseRef}>
            <div className="hero-about-sheet-ink" />
            <div className="hero-about-sheet-fill" />
          </div>
        </div>

        <AboutSection sectionRef={aboutRef} />
      </div>
    </HeroAboutContext.Provider>
  );
}
