import { useEffect, useState } from "react";

/**
 * Hook: respect prefers-reduced-motion.
 * Yo-site pattern from EntranceSplash.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

/**
 * Pointer drag for horizontal scroll containers (BuildTicker pattern).
 */
export function useHorizontalDrag(viewportRef) {
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const handlePointerDown = (e) => {
      if (e.button !== 0) return;

      const startX = e.clientX;
      const startScroll = el.scrollLeft;
      el.setPointerCapture(e.pointerId);
      el.classList.add("build-ticker-dragging");

      const onMove = (ev) => {
        el.scrollLeft = startScroll - (ev.clientX - startX);
      };

      const onUp = () => {
        el.releasePointerCapture(e.pointerId);
        el.classList.remove("build-ticker-dragging");
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", onUp);
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);
    };

    el.addEventListener("pointerdown", handlePointerDown);
    return () => el.removeEventListener("pointerdown", handlePointerDown);
  }, [viewportRef]);
}

/** Vertical wheel → horizontal scroll (BuildTicker pattern) */
export function useWheelHorizontal(viewportRef) {
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [viewportRef]);
}
