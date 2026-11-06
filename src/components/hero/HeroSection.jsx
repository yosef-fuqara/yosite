import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { useReducedMotion } from "framer-motion";
import { useI18n } from "../../i18n/I18nContext";
import { onPageIntroComplete } from "../../utils/pageIntroGate";
import HeroLiquidHeadline from "./HeroLiquidHeadline";
import HeroRotatingWord, { WORDS } from "./HeroRotatingWord";
import "../../styles/hero.css";


function splitLetters(word, kind) {
  return word.split("").map((ch, i) => {
    const isSpace = ch === " ";
    // The landing butterfly still measures the W through data-hero-char="line1".
    const heroChar = !isSpace && ch.toUpperCase() === "W" ? "line1" : kind;

    return (
      <span
        key={`${kind}-${i}`}
        className={`yo-hero__char-clip${isSpace ? " is-space" : ""}`}
      >
        <span className="yo-hero__char" data-hero-char={heroChar}>
          {isSpace ? (
            "\u00A0"
          ) : (
            <span className="yo-hero__glyph" data-hero-glyph="">
              {ch}
            </span>
          )}
        </span>
      </span>
    );
  });
}

export default function HeroSection() {
  const { t, dir } = useI18n();
  const rootRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const entrancePlayed = useRef(false);

  const lines = [1, 2, 3].flatMap((n) => {
    const key = `hero.headlineLine${n}`;
    const value = t(key);
    return value && value !== key ? [value] : [];
  });
  const headlineKey = `${lines.join("|")}|${WORDS[0]}`;
  const aria = t("hero.headlineAria");

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const lines = root.querySelectorAll(".yo-hero__line-reveal");
    if (!lines.length) return undefined;

    let anim;
    let sideAnim;
    let sideMarks = [];
    const finish = () => {
      entrancePlayed.current = true;
      root.dataset.entrance = "done";
      gsap.set(lines, { clearProps: "transform,visibility" });
    };
    root.dataset.entrance = "pending";
    gsap.set(lines, { yPercent: 120, visibility: "hidden" });
    const unsubscribe = onPageIntroComplete(() => {
      if (reducedMotion || entrancePlayed.current) {
        finish();
        return;
      }
      root.dataset.entrance = "playing";
      gsap.set(lines, { visibility: "visible" });
      const year = root.querySelector(".yo-hero__year-mark");
      const scrollCue = root.querySelector(".yo-hero__scroll-cue");
      const audio = document.querySelector(".yo-hero__audio");
      const aside = document.querySelector(".yo-hero__aside-body");
      sideMarks = [year, scrollCue, audio, aside].filter(Boolean);
      if (sideMarks.length) {
        sideAnim = gsap.fromTo(
          sideMarks,
          { y: 16, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1.05,
            stagger: 0.07,
            ease: "power2.out",
            clearProps: "transform,opacity",
            overwrite: true,
          },
        );
      }
      anim = gsap.to(lines, {
        yPercent: 0,
        duration: 1.28,
        stagger: 0.1,
        ease: "power3.out",
        onComplete: finish,
      });
    });

    return () => {
      unsubscribe();
      anim?.kill();
      sideAnim?.kill();
      gsap.set(lines, { clearProps: "transform,visibility" });
      if (sideMarks.length) gsap.set(sideMarks, { clearProps: "transform,opacity" });
    };
  }, [reducedMotion]);

  return (
    <section ref={rootRef} id="hero" className="yo-hero" aria-label="Hero">
      <div className="yo-hero__content">
        <HeroLiquidHeadline
          heroRef={rootRef}
          contentKey={headlineKey}
          className="yo-hero__title"
          aria-label={aria}
          dir={dir}
        >
          {lines.map((line, index) => {
            const exitDelay = (index / 3 * 0.14).toFixed(2);

            return (
              <span className="yo-hero__line" aria-hidden="true" key={`${index}-${line}`}>
                <span
                  className="yo-hero__line-exit"
                  style={index > 0 ? { "--hero-line-exit-delay": exitDelay } : undefined}
                >
                  <span className="yo-hero__line-reveal">
                    {splitLetters(line, `line${index + 1}`)}
                  </span>
                </span>
              </span>
            );
          })}
          <span className="yo-hero__line yo-hero__line--rotate" aria-hidden="true">
            <span className="yo-hero__line-exit" style={{ "--hero-line-exit-delay": "0.14" }}>
              <span className="yo-hero__line-reveal">
                <HeroRotatingWord heroRef={rootRef} reducedMotion={reducedMotion} />
              </span>
            </span>
          </span>
        </HeroLiquidHeadline>

        <div className="yo-hero__scroll-cue" aria-hidden="true">
          <span className="yo-hero__scroll-line" />
          <span className="yo-hero__scroll-dot" />
        </div>
      </div>

      <aside className="yo-hero__year" aria-label="Established 2026">
        <div className="yo-hero__year-inner">
          <span className="yo-hero__year-mark" aria-hidden="true">
            <span>2</span>
            <span>0</span>
            <span>2</span>
            <span>6</span>
          </span>
        </div>
      </aside>
    </section>
  );
}
