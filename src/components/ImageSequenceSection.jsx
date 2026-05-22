import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

const LOTTIE_PATH = "/animations/responsive%20website%20design.json";

function ProcessLottie() {
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
          path: LOTTIE_PATH,
        });
      } catch (err) {
        console.error("Production Process Lottie failed to load:", err);
      }
    }

    return () => {
      cancelled = true;
      observer.disconnect();
      animationRef.current?.destroy();
      animationRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Responsive website design animation — YoSite production process | עיצוב אתר רספונסיבי — תהליך הפקה | تصميم موقع متجاوب — عملية الإنتاج"
      className="relative w-full h-full opacity-[0.88]"
    />
  );
}

export default function ImageSequenceSection() {
  return (
    <section
      id="works"
      className="relative border-t border-b border-white/5 bg-transparent py-20 md:py-28 lg:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] rounded-full blur-[140px]"
        style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.06) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-[1380px] mx-auto px-6 md:px-12 lg:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 xl:gap-20 items-center">
          <div className="flex flex-col items-start text-left max-w-xl lg:max-w-none mx-auto lg:mx-0 w-full">
            <span className="text-[10px] font-extrabold tracking-[0.2em] text-violet-500 uppercase mb-3 select-none">
              Production Process
            </span>
            <h2 className="font-heading font-extrabold tracking-tight leading-[1.1] text-white mb-3 text-[clamp(1.6rem,2.8vw,2.4rem)]">
              From idea to launch — every frame matters.
            </h2>
            <p className="text-[13px] md:text-[14px] leading-relaxed text-gray-400 font-light mb-5 max-w-[580px]">
              We transform your vision into a fast, modern, animated website built to impress and convert.
            </p>
            <a
              href="#cta"
              className="group inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-white
                         bg-violet-600 hover:bg-violet-700 rounded-full pl-6 pr-2 py-2
                         border border-violet-500/30
                         shadow-[0_0_24px_rgba(139,92,246,0.25)]
                         hover:shadow-[0_0_40px_rgba(139,92,246,0.5)]
                         transition-all duration-300"
            >
              Start a Project
              <span className="w-8 h-8 rounded-full bg-black flex items-center justify-center
                               transition-transform duration-300 group-hover:scale-105">
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              </span>
            </a>
          </div>

          <div className="relative flex justify-center lg:justify-end items-center min-h-[180px] md:min-h-[220px] pointer-events-none">
            <motion.div
              className="relative w-[220px] sm:w-[240px] md:w-[260px] lg:w-[280px] aspect-square lg:-translate-x-28"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            >
              <div
                className="absolute inset-0 rounded-full blur-[60px] opacity-40"
                style={{ background: "radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)" }}
              />
              <ProcessLottie />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
