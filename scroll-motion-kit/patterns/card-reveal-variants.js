/**
 * Yo-site card reveal variants for whileInView + custom={index}.
 *
 * Usage:
 *   <motion.div custom={index} initial="hidden" whileInView="visible"
 *     viewport={{ once: true, margin: "-50px" }} variants={benefitCardVariants} />
 */

/** Services-style benefit cards — larger rise, scale from bottom */
export const benefitCardVariants = {
  hidden: {
    opacity: 0,
    y: 60,
    scale: 0.95,
    transformOrigin: "bottom center",
  },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.12,
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

/** Process-style step cards — subtle rise */
export const processStepVariants = {
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

/** Viewport presets */
export const viewportPresets = {
  text: { once: true, margin: "-100px" },
  cards: { once: true, margin: "-50px" },
  steps: { once: true, margin: "-40px" },
};

/** Standard easing — use everywhere */
export const PREMIUM_EASE = [0.16, 1, 0.3, 1];
