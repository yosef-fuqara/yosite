import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb } from "lucide-react";

/* ─── respect prefers-reduced-motion ─────────────────────────────────────── */
function usePrefersReducedMotion() {
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

export default function EntranceSplash() {
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (reduced) {
      // Respect reduced motion — very brief flash then exit
      const t = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(t);
    }

    // Stay visible until the page has fully loaded AND at least 900ms has passed
    // so the animation always gets to play through.
    let pageLoaded = false;
    let minTimePassed = false;

    const tryExit = () => {
      if (pageLoaded && minTimePassed) setVisible(false);
    };

    // Minimum display time — 2 seconds so users can read the tagline
    const minTimer = setTimeout(() => {
      minTimePassed = true;
      tryExit();
    }, 2000);

    // Wait for all resources (videos, images, fonts, etc.)
    if (document.readyState === "complete") {
      pageLoaded = true;
      tryExit();
    } else {
      const onLoad = () => {
        pageLoaded = true;
        tryExit();
      };
      window.addEventListener("load", onLoad, { once: true });
      return () => {
        clearTimeout(minTimer);
        window.removeEventListener("load", onLoad);
      };
    }

    return () => clearTimeout(minTimer);
  }, [reduced]);

  /* ── variants ─────────────────────────────────────────────────────────── */
  const overlay = {
    initial: { opacity: 1 },
    exit: {
      opacity: 0,
      transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] },
    },
  };

  const logo = {
    initial: { opacity: 0, y: 14, filter: "blur(8px)" },
    animate: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.05 },
    },
  };

  const tagline = {
    initial: { opacity: 0, y: 8 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 },
    },
  };

  const sweep = {
    initial: { scaleX: 0, opacity: 0 },
    animate: {
      scaleX: 1,
      opacity: [0, 1, 1, 0],
      transition: {
        scaleX: { duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.5 },
        opacity: { duration: 0.55, times: [0, 0.1, 0.7, 1], delay: 0.5 },
      },
    },
  };

  // The dot pulse — loops while loading, then stops
  const dotPulse = {
    animate: {
      color: [
        "#a78bfa",  // violet-400
        "#c084fc",  // purple-400
        "#d8b4fe",  // purple-300
        "#c084fc",
        "#a78bfa",  // back to violet-400
      ],
      textShadow: [
        "0 0 0px rgba(167,139,250,0)",
        "0 0 18px rgba(167,139,250,0.9), 0 0 38px rgba(192,132,252,0.5)",
        "0 0 26px rgba(216,180,254,1),   0 0 55px rgba(167,139,250,0.6)",
        "0 0 18px rgba(167,139,250,0.9), 0 0 38px rgba(192,132,252,0.5)",
        "0 0 0px rgba(167,139,250,0)",
      ],
      transition: {
        duration: 1.6,
        delay: 0.15,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 0.3,
      },
    },
  };

  // Lightbulb glow and color animations
  const innerGlowVariants = {
    off: { opacity: 0, scale: 0.4 },
    animate: {
      opacity: [0.65, 1, 0.65],
      scale: [1.1, 1.35, 1.1],
      transition: { duration: 2.0, repeat: Infinity, ease: "easeInOut" },
    },
  };

  const outerGlowVariants = {
    off: { opacity: 0, scale: 0.4 },
    animate: {
      opacity: [0.5, 0.95, 0.5],
      scale: [1.2, 1.45, 1.2],
      transition: { duration: 2.0, repeat: Infinity, ease: "easeInOut" },
    },
  };

  const bulbVariants = {
    off: {
      color: "rgba(167, 139, 250, 0.2)",
      filter: "drop-shadow(0 0 0px rgba(167, 139, 250, 0))",
    },
    animate: {
      color: ["rgb(255, 255, 255)", "rgb(196, 181, 253)", "rgb(255, 255, 255)"],
      filter: [
        "drop-shadow(0 0 24px rgba(196, 181, 253, 1)) drop-shadow(0 0 10px rgba(255, 255, 255, 0.9))",
        "drop-shadow(0 0 4px rgba(167, 139, 250, 0.35))",
        "drop-shadow(0 0 24px rgba(196, 181, 253, 1)) drop-shadow(0 0 10px rgba(255, 255, 255, 0.9))",
      ],
      transition: { duration: 2.0, repeat: Infinity, ease: "easeInOut" },
    },
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          variants={overlay}
          initial="initial"
          exit="exit"
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center"
          style={{ background: "#020203", pointerEvents: "none" }}
          aria-hidden="true"
        >
          {/* ── Logo ── */}
          <motion.div
            {...(reduced ? {} : { variants: logo, initial: "initial", animate: "animate" })}
            className="flex items-center gap-0.5"
          >
            <span className="text-[3.5rem] font-bold tracking-tight text-white font-heading select-none leading-none">
              y
            </span>

            {/* The dot — purple/violet glow, loops while loading */}
            <motion.span
              className="text-[3.5rem] font-extrabold font-sans leading-none select-none"
              style={{ color: "#a78bfa" }}
              {...(reduced ? {} : dotPulse)}
            >
              .
            </motion.span>
          </motion.div>

          {/* ── Tagline + sweep line ── */}
          <motion.div
            className="relative mt-3 flex flex-col items-center gap-1.5"
            {...(reduced ? {} : { variants: tagline, initial: "initial", animate: "animate" })}
          >
            <div className="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.22em] text-gray-500 uppercase select-none">
              <span>Your idea</span>

              {/* The pulsing lamp/lightbulb */}
              <span className="relative flex items-center justify-center w-6 h-6 mx-0.5">
                <motion.span
                  variants={innerGlowVariants}
                  initial="off"
                  animate="animate"
                  className="absolute w-12 h-12 rounded-full blur-[8px] z-10 pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(221, 214, 254, 0.95) 0%, rgba(167, 139, 250, 0.65) 45%, rgba(139, 92, 246, 0.25) 70%, transparent 85%)",
                  }}
                />
                <motion.span
                  variants={outerGlowVariants}
                  initial="off"
                  animate="animate"
                  className="absolute w-24 h-24 rounded-full blur-[18px] z-10 pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(167, 139, 250, 0.85) 0%, rgba(139, 92, 246, 0.5) 50%, rgba(109, 40, 217, 0.2) 75%, transparent 90%)",
                  }}
                />
                <motion.div
                  variants={bulbVariants}
                  initial="off"
                  animate="animate"
                  className="relative z-20 flex items-center justify-center"
                >
                  <Lightbulb className="w-3.5 h-3.5 stroke-[2.2]" />
                </motion.div>
              </span>

              <span>live on the web</span>
            </div>

            {/* Thin light sweep */}
            <motion.span
              className="block h-[1.5px] w-full origin-left rounded-full mt-0.5"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.85) 35%, rgba(139,92,246,0.9) 65%, transparent 100%)",
              }}
              {...(reduced ? {} : { variants: sweep, initial: "initial", animate: "animate" })}
            />
          </motion.div>

          {/* ── Subtle loading dots for slow connections ── */}
          {!reduced && (
            <motion.div
              className="absolute bottom-12 flex gap-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.4 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1 h-1 rounded-full bg-violet-500/50"
                  animate={{ opacity: [0.3, 1, 0.3], scaleY: [0.7, 1.3, 0.7] }}
                  transition={{
                    duration: 0.9,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

