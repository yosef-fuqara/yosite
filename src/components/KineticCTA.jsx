import { useRef, useEffect, useState, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "../styles/kinetic-cta.css";

gsap.registerPlugin(ScrollTrigger);

/* ─── Config ──────────────────────────────────────────────────────── */
const PHRASES = ["LET'S TALK", "START A PROJECT", "BUILD WITH SOUL"];
const SCROLL_MULTIPLIER = 6; // viewport-heights of total scroll distance

/* ─── Helpers ─────────────────────────────────────────────────────── */
function splitToLetters(text) {
  return text.split("").map((ch, i) => ({
    char: ch,
    isSpace: ch === " ",
    key: `${ch}-${i}`,
  }));
}

/* Random in range */
const rand = (lo, hi) => lo + Math.random() * (hi - lo);

/* ─── Component ───────────────────────────────────────────────────── */
export default function KineticCTA() {
  const sectionRef = useRef(null);
  const viewportRef = useRef(null);
  const eyebrowRef = useRef(null);
  const stageRef = useRef(null);
  const ctaLinkRef = useRef(null);
  const phraseRefs = useRef([]);
  const letterGroups = useRef([]); // [phraseIndex][letterIndex] => DOM node

  const [mounted, setMounted] = useState(false);

  /* Store DOM refs for letters */
  const setLetterRef = useCallback(
    (phraseIndex, letterIndex, el) => {
      if (!letterGroups.current[phraseIndex])
        letterGroups.current[phraseIndex] = [];
      letterGroups.current[phraseIndex][letterIndex] = el;
    },
    []
  );

  /* Build the scroll-driven timeline once DOM is ready */
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const section = sectionRef.current;
    const viewport = viewportRef.current;
    const eyebrow = eyebrowRef.current;
    const ctaLink = ctaLinkRef.current;
    if (!section || !viewport) return;

    const ctx = gsap.context(() => {
      /* ── Set initial states ────────────────────────────────────── */

      // Eyebrow: fade in at the start
      gsap.set(eyebrow, { opacity: 0, y: -12 });

      // All phrase letters start hidden
      PHRASES.forEach((_, pi) => {
        const letters = letterGroups.current[pi];
        if (!letters) return;
        letters.forEach((el) => {
          if (!el) return;
          gsap.set(el, { opacity: 0, y: 60, rotation: rand(-6, 6) });
        });
      });

      // CTA link
      gsap.set(ctaLink, { opacity: 0, y: 20 });

      /* ── Master timeline pinned to scroll ──────────────────────── */

      // Each phrase gets an equal share of the scroll distance
      const phraseDuration = 1 / PHRASES.length; // normalised
      const revealDur = phraseDuration * 0.3;
      const holdDur = phraseDuration * 0.4;
      const exitDur = phraseDuration * 0.3;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: `+=${window.innerHeight * SCROLL_MULTIPLIER}`,
          pin: viewport,
          scrub: 0.8,
          anticipatePin: 1,
        },
      });

      /* Eyebrow reveal */
      tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.04, ease: "power2.out" }, 0);

      PHRASES.forEach((_, pi) => {
        const letters = letterGroups.current[pi] || [];
        const phraseStart = pi * phraseDuration;
        const isLast = pi === PHRASES.length - 1;
        const count = letters.filter(Boolean).length;

        /* ── REVEAL: letters rise in with stagger ──────────────── */
        letters.forEach((el, li) => {
          if (!el) return;
          const stagger = (li / Math.max(count - 1, 1)) * revealDur * 0.7;
          tl.to(
            el,
            {
              opacity: 1,
              y: 0,
              rotation: 0,
              duration: revealDur * 0.6,
              ease: "power3.out",
            },
            phraseStart + stagger
          );
        });

        /* ── EXIT: gravity-fall letters (skip for last phrase) ─── */
        if (!isLast) {
          const exitStart = phraseStart + revealDur + holdDur;
          letters.forEach((el, li) => {
            if (!el) return;
            const stagger = (li / Math.max(count - 1, 1)) * exitDur * 0.65;
            const fallY = rand(220, 420);
            const fallRot = rand(-12, 12);
            tl.to(
              el,
              {
                opacity: 0,
                y: fallY,
                rotation: fallRot,
                duration: exitDur * 0.7,
                ease: "power2.in",
              },
              exitStart + stagger
            );
          });

          /* Reset letters for next scroll-back (set back to initial hidden above) */
          letters.forEach((el) => {
            if (!el) return;
            tl.set(el, { y: 60, rotation: rand(-6, 6) }, phraseStart + phraseDuration - 0.001);
          });
        }

        /* ── LAST PHRASE: reveal CTA link ──────────────────────── */
        if (isLast) {
          const ctaStart = phraseStart + revealDur + holdDur * 0.6;
          tl.to(
            ctaLink,
            {
              opacity: 1,
              y: 0,
              duration: holdDur * 0.35,
              ease: "power2.out",
            },
            ctaStart
          );
        }
      });
    }, section);

    return () => ctx.revert();
  }, [mounted]);

  return (
    <section ref={sectionRef} className="kinetic-cta" id="cta">
      <div
        className="kinetic-cta__scroll-spacer"
        style={{ height: `${100 * SCROLL_MULTIPLIER}vh` }}
      >
        <div ref={viewportRef} className="kinetic-cta__viewport">
          {/* ── Eyebrow ─────────────────────────────────────────── */}
          <span ref={eyebrowRef} className="kinetic-cta__eyebrow">
            Got Project?
          </span>

          {/* ── Phrase stage ─────────────────────────────────────── */}
          <div ref={stageRef} className="kinetic-cta__stage">
            {PHRASES.map((phrase, pi) => (
              <div
                key={phrase}
                ref={(el) => (phraseRefs.current[pi] = el)}
                className="kinetic-cta__phrase"
                aria-label={phrase}
              >
                {splitToLetters(phrase).map((l, li) =>
                  l.isSpace ? (
                    <span
                      key={l.key}
                      className="kinetic-cta__letter kinetic-cta__letter--space"
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      key={l.key}
                      ref={(el) => setLetterRef(pi, li, el)}
                      className="kinetic-cta__letter"
                    >
                      {l.char}
                    </span>
                  )
                )}
              </div>
            ))}
          </div>

          {/* ── Bottom CTA ──────────────────────────────────────── */}
          <div ref={ctaLinkRef} className="kinetic-cta__link-wrap">
            <a href="#cta" className="kinetic-cta__link">
              Start a Project{" "}
              <span className="kinetic-cta__link-arrow">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
