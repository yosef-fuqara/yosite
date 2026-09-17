import { useEffect, useRef, useState } from "react";
import { useScroll, useTransform, useSpring } from "framer-motion";

const MOBILE_BREAKPOINT = 1024;

/**
 * Yo-site CTA-style scroll-linked parallax.
 * Left column moves down, right column moves up as section scrolls through viewport.
 * Disabled on mobile.
 */
export default function useScrollParallax(options = {}) {
  const {
    leftRange = [-60, 90],
    rightRange = [90, -60],
    spring = { stiffness: 60, damping: 25 },
    scrollOffset = ["start end", "end start"],
    mobileBreakpoint = MOBILE_BREAKPOINT,
  } = options;

  const sectionRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < mobileBreakpoint);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [mobileBreakpoint]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: scrollOffset,
  });

  const smoothProgress = useSpring(scrollYProgress, spring);

  const leftY = useTransform(smoothProgress, [0, 1], leftRange);
  const rightY = useTransform(smoothProgress, [0, 1], rightRange);

  return { sectionRef, leftY, rightY, isMobile, scrollYProgress: smoothProgress };
}
