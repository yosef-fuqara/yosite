import { useEffect, useRef } from "react";

/**
 * Lazy-load Lottie when element nears viewport.
 * Yo-site pattern from ImageSequenceSection.
 */
export default function LazyLottie({ path, ariaLabel, className = "" }) {
  const containerRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || cancelled) return;
        observer.disconnect();
        initAnimation();
      },
      { rootMargin: "120px" }
    );

    observer.observe(container);

    async function initAnimation() {
      try {
        const mod = await import("lottie-web/build/player/lottie_light");
        const lottie = mod.default ?? mod;
        if (cancelled || !containerRef.current) return;

        animationRef.current = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: true,
          autoplay: true,
          path,
        });
      } catch {
        // Lottie optional — fail silently
      }
    }

    return () => {
      cancelled = true;
      observer.disconnect();
      animationRef.current?.destroy?.();
    };
  }, [path]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={ariaLabel}
      className={className}
    />
  );
}
