import { useEffect, useRef } from "react";
import { useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { useLenis } from "lenis/react";

const DEFAULT_OFFSET = ["start end", "end start"];

/** Vertical travel as % of the inner media box. Must stay within overflow. */
const TRAVEL_Y = {
  mobile: -20,
  tablet: -24,
  desktop: -28,
};

function travelForWidth(width) {
  if (width < 768) return TRAVEL_Y.mobile;
  if (width < 1024) return TRAVEL_Y.tablet;
  return TRAVEL_Y.desktop;
}

function applyParallax(media, progress, travelY, enabled) {
  if (!media) return;
  const next = enabled
    ? `translate3d(0, ${(progress * travelY).toFixed(3)}%, 0)`
    : "translate3d(0, 0, 0)";
  if (media.style.transform === next) return;
  media.style.transform = next;
}

/**
 * Scroll-linked inner-image parallax. The frame stays still; only `mediaRef`
 * translates upward as the target moves through the viewport.
 */
export default function useFrameParallax({
  frameRef,
  mediaRef,
  targetRef,
  offset = DEFAULT_OFFSET,
  enabled = true,
}) {
  const reducedMotion = useReducedMotion();
  const active = Boolean(enabled) && !reducedMotion;
  const travelRef = useRef(
    typeof window === "undefined" ? TRAVEL_Y.desktop : travelForWidth(window.innerWidth),
  );
  const progressRef = useRef(0);
  const activeRef = useRef(active);

  const { scrollYProgress } = useScroll({
    target: targetRef ?? frameRef,
    offset,
  });

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    progressRef.current = progress;
    applyParallax(
      mediaRef.current,
      progress,
      travelRef.current,
      activeRef.current,
    );
  });

  useLenis(() => {
    if (!frameRef.current?.classList.contains("is-near")) return;
    const progress = scrollYProgress.get();
    progressRef.current = progress;
    applyParallax(
      mediaRef.current,
      progress,
      travelRef.current,
      activeRef.current,
    );
  });

  useEffect(() => {
    const frame = frameRef.current;
    const media = mediaRef.current;
    if (!frame || !media) return undefined;

    const syncTravel = () => {
      travelRef.current = travelForWidth(window.innerWidth);
      applyParallax(
        media,
        progressRef.current,
        travelRef.current,
        activeRef.current,
      );
    };

    syncTravel();
    window.addEventListener("resize", syncTravel);

    const io = new IntersectionObserver(
      ([entry]) => {
        frame.classList.toggle("is-near", entry.isIntersecting);
        if (entry.isIntersecting) {
          applyParallax(
            media,
            progressRef.current,
            travelRef.current,
            activeRef.current,
          );
        }
      },
      { rootMargin: "30% 0px" },
    );
    io.observe(frame);

    return () => {
      window.removeEventListener("resize", syncTravel);
      io.disconnect();
      frame.classList.remove("is-near");
      media.style.willChange = "auto";
    };
  }, [frameRef, mediaRef, active]);

  return { reducedMotion: !active };
}
