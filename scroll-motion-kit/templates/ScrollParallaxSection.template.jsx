import { motion } from "framer-motion";
import TextReveal from "../patterns/TextReveal";
import useScrollParallax from "../patterns/useScrollParallax";

/**
 * Template: CTA-style section with scroll-linked floating panels.
 * Desktop only parallax — mobile gets static layout.
 */
export default function ScrollParallaxSection() {
  const { sectionRef, leftY, rightY, isMobile } = useScrollParallax();

  return (
    <section
      ref={sectionRef}
      id="cta"
      className="relative z-10 overflow-x-hidden py-16 md:py-32 px-4 sm:px-6 md:px-12"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left floating panels — scroll down */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-6">
          <motion.div style={{ y: isMobile ? 0 : leftY }}>
            <div className="glass-panel p-4 rounded-xl border border-white/10">Panel A</div>
          </motion.div>
          <motion.div style={{ y: isMobile ? 0 : leftY }}>
            <div className="glass-panel p-4 rounded-xl border border-white/10">Panel B</div>
          </motion.div>
        </div>

        {/* Center content — viewport reveal, NOT scroll-linked */}
        <div className="lg:col-span-6">
          <TextReveal>
            <h2 className="text-3xl font-bold text-white text-center">Contact</h2>
          </TextReveal>
          <TextReveal delay={0.15}>
            <p className="text-gray-400 text-center mt-4">Main form or CTA content here.</p>
          </TextReveal>
        </div>

        {/* Right floating panels — scroll up */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-6">
          <motion.div style={{ y: isMobile ? 0 : rightY }}>
            <div className="glass-panel p-4 rounded-xl border border-white/10">Panel C</div>
          </motion.div>
          <motion.div style={{ y: isMobile ? 0 : rightY }}>
            <div className="glass-panel p-4 rounded-xl border border-white/10">Panel D</div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
