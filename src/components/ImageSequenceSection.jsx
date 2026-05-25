import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "../i18n/I18nContext";

const LOTTIE_PATH = "/animations/responsive%20website%20design.json";

const STEP_KEYS = ["understand", "build", "launch"];

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.65,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

function ProcessLottie({ ariaLabel }) {
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
      aria-label={ariaLabel}
      className="relative w-full h-full opacity-[0.88]"
    />
  );
}

export default function ImageSequenceSection() {
  const { t } = useI18n();

  return (
    <section
      id="works"
      className="relative border-t border-b border-white/5 bg-transparent py-20 md:py-28 lg:py-32 overflow-hidden"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] rounded-full blur-[140px]"
        style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.06) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-[1380px] mx-auto px-6 md:px-12 lg:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 xl:gap-20 items-center">
          <div className="flex flex-col items-start text-start max-w-xl lg:max-w-none mx-auto lg:mx-0 w-full min-w-0">
            <div className="flex items-start gap-3 mb-3 w-full min-w-0">
              <div
                className="relative shrink-0 w-12 h-12 sm:hidden rounded-full border border-violet-500/20 overflow-hidden
                           shadow-[0_0_20px_rgba(139,92,246,0.15)] bg-violet-950/30 p-1.5"
              >
                <ProcessLottie ariaLabel={t("process.lottieAria")} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold tracking-[0.2em] text-violet-500 uppercase mb-3 select-none block">
                  {t("process.eyebrow")}
                </span>
                <h2 className="font-heading font-extrabold tracking-tight leading-[1.1] text-white text-[clamp(1.6rem,2.8vw,2.4rem)]">
                  {t("process.title")}
                </h2>
              </div>
            </div>
            <p className="text-[13px] md:text-sm text-gray-400 font-light leading-relaxed mb-8 max-w-[520px]">
              {t("process.subtitle")}
            </p>

            <div className="relative w-full min-w-0 mb-8">
              <div
                aria-hidden
                className="hidden md:block absolute top-6 bottom-6 w-px start-[1.125rem] bg-gradient-to-b from-transparent via-violet-500/50 to-transparent"
                style={{
                  boxShadow: "0 0 12px rgba(139, 92, 246, 0.45), 0 0 24px rgba(139, 92, 246, 0.2)",
                }}
              />

              <ul className="space-y-4 w-full min-w-0">
                {STEP_KEYS.map((key, index) => {
                  const stepNum = String(index + 1).padStart(2, "0");
                  return (
                    <motion.li
                      key={key}
                      custom={index}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, margin: "-40px" }}
                      variants={cardVariants}
                      className="relative min-w-0"
                    >
                      <div
                        aria-hidden
                        className="hidden md:block absolute top-1/2 -translate-y-1/2 start-[0.875rem] w-2 h-2 rounded-full bg-violet-500 z-10"
                        style={{
                          boxShadow:
                            "0 0 10px rgba(139, 92, 246, 0.9), 0 0 20px rgba(139, 92, 246, 0.4)",
                        }}
                      />

                      <div
                        className="group glass-panel relative rounded-2xl border border-white/10 p-5 md:p-6 ps-8 md:ps-10
                                   transition-all duration-500
                                   hover:border-violet-500/25 hover:shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_30px_rgba(139,92,246,0.12)]"
                      >
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700
                                     bg-gradient-to-br from-violet-600/10 via-transparent to-transparent"
                        />

                        <div className="relative z-10 min-w-0">
                          <p className="text-[10px] font-bold tracking-[0.14em] text-violet-400/90 uppercase mb-2">
                            {t("process.cardPrefix")} {stepNum}
                          </p>
                          <h3 className="text-base md:text-lg font-bold text-white font-heading mb-1.5">
                            {t(`process.steps.${key}.title`)}
                          </h3>
                          <p className="text-[13px] text-gray-400 font-light leading-relaxed">
                            {t(`process.steps.${key}.desc`)}
                          </p>
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </div>

            <a
              href="#cta"
              className="group inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-white
                         bg-violet-600 hover:bg-violet-700 rounded-full ps-6 pe-2 py-2
                         border border-violet-500/30
                         shadow-[0_0_24px_rgba(139,92,246,0.25)]
                         hover:shadow-[0_0_40px_rgba(139,92,246,0.5)]
                         transition-all duration-300"
            >
              {t("process.cta")}
              <span
                className="w-8 h-8 rounded-full bg-black flex items-center justify-center
                               transition-transform duration-300 group-hover:scale-105"
              >
                <ArrowUpRight className="w-4 h-4 stroke-[2.5] rtl:rotate-180" />
              </span>
            </a>
          </div>

          <div className="relative hidden sm:flex justify-center lg:justify-end items-center min-h-0 pointer-events-none">
            <motion.div
              className="relative w-[200px] md:w-[240px] lg:w-[280px] aspect-square lg:-translate-x-28 rtl:lg:translate-x-28"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            >
              <div
                className="absolute -inset-4 md:-inset-6 rounded-full blur-[70px] opacity-50"
                style={{
                  background:
                    "radial-gradient(circle, rgba(139,92,246,0.4) 0%, rgba(88,28,135,0.15) 45%, transparent 70%)",
                }}
              />

              <div
                className="glass-panel relative w-full h-full rounded-full border border-violet-500/20
                           shadow-[0_0_60px_rgba(139,92,246,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]
                           p-6 md:p-8 overflow-hidden"
              >
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-full opacity-60"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 40%, rgba(139,92,246,0.12) 0%, transparent 65%)",
                  }}
                />
                <div className="relative w-full h-full aspect-square">
                  <ProcessLottie ariaLabel={t("process.lottieAria")} />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
