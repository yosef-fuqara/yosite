import { useRef, useState, useEffect } from "react";
import { ArrowUpRight, ArrowDown, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";

export default function Hero() {
  const sectionRef = useRef(null);
  const [glowState, setGlowState] = useState("turningOn");

  useEffect(() => {
    const timer = setTimeout(() => setGlowState("breathing"), 3000);
    return () => clearTimeout(timer);
  }, []);

  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
  };
  const item = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
  };

  const innerGlowVariants = {
    off: { opacity: 0, scale: 0.4 },
    turningOn: { opacity: 1, scale: 1.25, transition: { duration: 3.0, ease: "easeOut" } },
    breathing: {
      opacity: [1, 0.45, 1],
      scale: [1.25, 1.4, 1.25],
      transition: { duration: 5.0, repeat: Infinity, ease: "easeInOut" },
    },
  };

  const outerGlowVariants = {
    off: { opacity: 0, scale: 0.4 },
    turningOn: { opacity: 1, scale: 1.35, transition: { duration: 3.0, ease: "easeOut" } },
    breathing: {
      opacity: [1, 0.4, 1],
      scale: [1.35, 1.55, 1.35],
      transition: { duration: 5.0, repeat: Infinity, ease: "easeInOut" },
    },
  };

  const bulbVariants = {
    off: {
      color: "rgba(167, 139, 250, 0.2)",
      filter: "drop-shadow(0 0 0px rgba(167, 139, 250, 0))",
    },
    turningOn: {
      color: "rgb(255, 255, 255)",
      filter: "drop-shadow(0 0 28px rgba(196, 181, 253, 1)) drop-shadow(0 0 12px rgba(255, 255, 255, 0.9))",
      transition: { duration: 3.0, ease: "easeOut" },
    },
    breathing: {
      color: ["rgb(255, 255, 255)", "rgb(196, 181, 253)", "rgb(255, 255, 255)"],
      filter: [
        "drop-shadow(0 0 32px rgba(196, 181, 253, 1)) drop-shadow(0 0 14px rgba(255, 255, 255, 1))",
        "drop-shadow(0 0 6px rgba(167, 139, 250, 0.35))",
        "drop-shadow(0 0 32px rgba(196, 181, 253, 1)) drop-shadow(0 0 14px rgba(255, 255, 255, 1))",
      ],
      transition: { duration: 5.0, repeat: Infinity, ease: "easeInOut" },
    },
  };

  const taglineTextVariants = {
    off: {
      color: "rgba(167, 139, 250, 0.3)",
      textShadow: "0 0 0px rgba(167, 139, 250, 0)",
    },
    turningOn: {
      color: "rgb(255, 255, 255)",
      textShadow: "0 0 20px rgba(167, 139, 250, 0.95), 0 0 8px rgba(255, 255, 255, 0.5)",
      transition: { duration: 3.0, ease: "easeOut" },
    },
    breathing: {
      color: ["rgb(255, 255, 255)", "rgba(196, 181, 253, 0.85)", "rgb(255, 255, 255)"],
      textShadow: [
        "0 0 22px rgba(167, 139, 250, 1), 0 0 10px rgba(255, 255, 255, 0.6)",
        "0 0 4px rgba(167, 139, 250, 0.25), 0 0 0px rgba(255, 255, 255, 0)",
        "0 0 22px rgba(167, 139, 250, 1), 0 0 10px rgba(255, 255, 255, 0.6)",
      ],
      transition: { duration: 5.0, repeat: Infinity, ease: "easeInOut" },
    },
  };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col justify-center overflow-hidden z-10 pt-28 pb-16 px-6 md:px-12"
    >
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center text-center relative z-20">
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center w-full"
        >
          <motion.div
            variants={item}
            className="mb-4 flex items-center justify-center gap-2 text-[10px] font-extrabold tracking-[0.2em] text-violet-500 uppercase select-none relative"
          >
            <motion.span
              variants={taglineTextVariants}
              initial="off"
              animate={glowState}
              className="z-20 relative transition-all duration-300"
            >
              Your idea
            </motion.span>

            <span className="relative flex items-center justify-center w-6 h-6 mx-1">
              <motion.span
                variants={innerGlowVariants}
                initial="off"
                animate={glowState}
                className="absolute w-14 h-14 rounded-full blur-[10px] z-10 pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  background:
                    "radial-gradient(circle, rgba(221, 214, 254, 0.95) 0%, rgba(167, 139, 250, 0.65) 45%, rgba(139, 92, 246, 0.25) 70%, transparent 85%)",
                }}
              />
              <motion.span
                variants={outerGlowVariants}
                initial="off"
                animate={glowState}
                className="absolute w-28 h-28 rounded-full blur-[22px] z-10 pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  background:
                    "radial-gradient(circle, rgba(167, 139, 250, 0.85) 0%, rgba(139, 92, 246, 0.5) 50%, rgba(109, 40, 217, 0.2) 75%, transparent 90%)",
                }}
              />
              <motion.div
                variants={bulbVariants}
                initial="off"
                animate={glowState}
                className="relative z-20 flex items-center justify-center"
              >
                <Lightbulb className="w-4 h-4 stroke-[2.2]" />
              </motion.div>
            </span>

            <motion.span
              variants={taglineTextVariants}
              initial="off"
              animate={glowState}
              className="z-20 relative transition-all duration-300"
            >
              live on the web
            </motion.span>
          </motion.div>

          <motion.h1
            variants={item}
            className="font-heading font-extrabold tracking-tight leading-[1.05] text-white mb-5 text-[clamp(2.2rem,5vw,3.75rem)]"
          >
            We build digital experiences that{" "}
            <span className="bg-gradient-to-r from-violet-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">
              move your brand
            </span>{" "}
            forward.
          </motion.h1>

          <motion.p
            variants={item}
            className="text-sm md:text-base text-gray-400 font-light leading-relaxed mb-8 max-w-xl mx-auto"
          >
            Websites, e-commerce, dashboards and immersive web experiences that drive results.
          </motion.p>

          <motion.div variants={item} className="flex justify-center w-full">
            <a
              href="#cta"
              className="group inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-white
                         bg-gradient-to-r from-violet-600 via-violet-500 to-cyan-600
                         hover:from-violet-500 hover:via-violet-400 hover:to-cyan-500
                         rounded-full pl-6 pr-2 py-2
                         border border-violet-400/25
                         shadow-[0_0_28px_rgba(139,92,246,0.35)]
                         hover:shadow-[0_0_44px_rgba(139,92,246,0.55)]
                         transition-all duration-300"
            >
              Start a Project
              <span
                className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center
                               transition-transform duration-300 group-hover:scale-105"
              >
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              </span>
            </a>
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none select-none">
        <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-[0.22em]">
          Scroll to explore
        </span>
        <div className="relative flex flex-col items-center">
          <div className="w-px h-10 bg-gradient-to-b from-violet-500/70 to-transparent" />
          <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-violet-400/80 shadow-[0_0_6px_rgba(167,139,250,0.8)]" />
        </div>
      </div>

      <div className="absolute bottom-6 right-6 lg:right-12 z-30">
        <button
          onClick={() =>
            document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })
          }
          aria-label="Scroll Down"
          className="group w-14 h-14 rounded-full bg-white/5 border border-white/10
                     hover:border-violet-500/35 hover:text-violet-400 text-white
                     flex items-center justify-center
                     shadow-[0_10px_30px_rgba(0,0,0,0.5)]
                     transition-all duration-300 cursor-pointer"
        >
          <ArrowDown className="w-5 h-5 transition-transform duration-300 group-hover:translate-y-1" />
        </button>
      </div>
    </section>
  );
}
