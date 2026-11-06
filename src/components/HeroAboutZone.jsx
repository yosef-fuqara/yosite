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
    delete zone.dataset.rotateLineCovered;
    return;
  }

  /* About sits on the fold, so progress hovers near 0 at rest.
     Arm late, disarm only when truly settled — avoids idle↔active flicker. */
  const wasActive = zone.dataset.transition === "active";
  const active = wasActive ? progress > 0.006 : progress > 0.04;
  zone.dataset.transition = active ? "active" : "idle";
  zone.dataset.transitionComplete = progress >= 0.995 ? "true" : "false";

  const vh = window.innerHeight || 1;
  // Begin while the headline is still visible, and restore the same pose
  // at the same scroll position when the user scrolls back up.
  const travelled = -zone.getBoundingClientRect().top;
  const exitT = Math.max(0, Math.min(1, (travelled - 16) / Math.max(vh * 0.55, 240)));

  zone.style.setProperty("--hero-exit-t", exitT === 0 ? "0" : exitT.toFixed(4));
  /* Same threshold as --line-exit on the rotating line: coverage starts
     once scroll passes that line's exit delay. */
  const rotateExit = zone.querySelector(".yo-hero__line--rotate .yo-hero__line-exit");
  const rotateDelay = Number.parseFloat(rotateExit?.style.getPropertyValue("--hero-line-exit-delay") ?? "");
  if (Number.isFinite(rotateDelay) && exitT > rotateDelay) zone.dataset.rotateLineCovered = "";
  else delete zone.dataset.rotateLineCovered;
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
    window.addEventListener("scroll", sync, { passive: true });

    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync);
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
