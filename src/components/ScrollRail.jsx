import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import "../styles/scroll-rail.css";

/** Scroll must be quiet this long before fade-out begins. */
const IDLE_MS = 600;

/**
 * Fixed vertical scroll-progress rail, portaled to document.body so it stays
 * above every section (including Hero) and is never clipped by overflow or
 * section stacking contexts. Purely decorative — never intercepts clicks.
 *
 * Visible while scrolling; fades out after brief inactivity; fades back in
 * on the next scroll without jumping the progress dot.
 */
export default function ScrollRail() {
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const [isActive, setIsActive] = useState(false);
  const railRef = useRef(null);
  const idleTimerRef = useRef(null);
  const [trackHeight, setTrackHeight] = useState(0);

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: reducedMotion ? 1000 : 140,
    damping: reducedMotion ? 100 : 30,
    mass: 0.3,
  });

  // Pixel Y via transform (compositor-friendly); % top would thrash layout.
  const dotY = useTransform(smoothProgress, (progress) => progress * trackHeight);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;

    const measure = () => {
      setTrackHeight(el.getBoundingClientRect().height);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useMotionValueEvent(scrollYProgress, "change", () => {
    setIsActive(true);
    if (idleTimerRef.current != null) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = window.setTimeout(() => {
      setIsActive(false);
      idleTimerRef.current = null;
    }, IDLE_MS);
  });

  useEffect(() => {
    return () => {
      if (idleTimerRef.current != null) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  const active = isActive ? "true" : "false";
  const reduced = reducedMotion ? "true" : "false";

  return createPortal(
    <>
      <div
        ref={railRef}
        className="scroll-rail scroll-rail--line"
        aria-hidden="true"
        data-active={active}
        data-reduced-motion={reduced}
      >
        <span className="scroll-rail__track" />
      </div>
      <div
        className="scroll-rail scroll-rail--dot"
        aria-hidden="true"
        data-active={active}
        data-reduced-motion={reduced}
      >
        <motion.div
          className="scroll-rail__dot-wrap"
          style={{ y: dotY }}
        >
          <span className="scroll-rail__glow" />
          <span className="scroll-rail__dot" />
        </motion.div>
      </div>
    </>,
    document.body,
  );
}
