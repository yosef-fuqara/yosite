import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Dialedweb-style architectural light rays.
 * Focal source sits off-canvas at the lower-left; a rotated wrapper
 * fans elongated soft beams left → right across the hero.
 */

const DESKTOP_RAYS = [
  { id: 1, opacity: 0.78, duration: 9.5, delay: 0, rotate: -18, scale: 1, width: 35, accent: false },
  { id: 2, opacity: 0.7, duration: 8.2, delay: 1.1, rotate: -12, scale: 1, width: 35, accent: false },
  { id: 3, opacity: 0.55, duration: 11, delay: 2.4, rotate: -5, scale: 0.9, width: 20, accent: true },
  { id: 4, opacity: 0.28, duration: 7.4, delay: 0.6, rotate: -3, scale: 1, width: 15, accent: false },
  { id: 5, opacity: 0.48, duration: 10.2, delay: 1.8, rotate: 0, scale: 0.79, width: 40, accent: false },
  { id: 6, opacity: 0.42, duration: 7.8, delay: 3.2, rotate: 6, scale: 1, width: 20, accent: true },
  { id: 7, opacity: 0.62, duration: 9.8, delay: 0.4, rotate: 9, scale: 0.83, width: 35, accent: false },
  { id: 8, opacity: 0.85, duration: 8.8, delay: 2.1, rotate: 14, scale: 0.9, width: 35, accent: false },
];

const MOBILE_RAY_IDS = new Set([1, 2, 3, 5, 7, 8]);

function useIsMobile(breakpoint = 767) {
  const [mobile, setMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = (e) => setMobile(e.matches);
    setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint]);

  return mobile;
}

export default function HeroLightRays() {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const rays = (isMobile
    ? DESKTOP_RAYS.filter((r) => MOBILE_RAY_IDS.has(r.id))
    : DESKTOP_RAYS
  ).map((ray) => ({
    ...ray,
    opacity: isMobile ? ray.opacity * 0.72 : ray.opacity,
  }));

  return (
    <div
      className={`yo-hero-rays${isMobile ? " is-mobile" : ""}${
        reducedMotion ? " is-reduced" : ""
      }`}
      aria-hidden="true"
    >
      <div className="yo-hero-rays__grid" />
      <div className="yo-hero-rays__source" />

      <div className="yo-hero-rays__wrapper">
        {rays.map((ray) => (
          <div
            key={ray.id}
            className={`yo-hero-rays__ray yo-hero-rays__ray--${ray.id}${
              ray.accent ? " is-accent" : ""
            }`}
            style={{
              "--ray-opacity": String(ray.opacity),
              "--ray-duration": reducedMotion ? "0s" : `${ray.duration}s`,
              "--ray-delay": reducedMotion ? "0s" : `${ray.delay}s`,
              "--ray-rotate": `${ray.rotate}deg`,
              "--ray-scale": String(ray.scale),
              width: `${ray.width}px`,
              left: `calc(50% - ${ray.width / 2}px)`,
              animation: reducedMotion
                ? "none"
                : `yo-hero-ray-pulse var(--ray-duration) ease-in-out var(--ray-delay) infinite both`,
              opacity: ray.opacity,
              transform: `scale(${ray.scale}) rotate(${ray.rotate}deg)`,
            }}
          />
        ))}

        <div className="yo-hero-rays__glow yo-hero-rays__glow--1" />
        <div className="yo-hero-rays__glow yo-hero-rays__glow--2" />
        <div className="yo-hero-rays__glow yo-hero-rays__glow--3" />
      </div>
    </div>
  );
}
