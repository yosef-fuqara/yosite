import { motion } from "framer-motion";

export default function TextReveal({ children, className = "", delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40, scale: 0.97 }}
      whileInView={{ opacity: 1, x: 0, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{
        duration: 0.9,
        delay,
        ease: [0.16, 1, 0.3, 1], // Custom premium deceleration curve
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
