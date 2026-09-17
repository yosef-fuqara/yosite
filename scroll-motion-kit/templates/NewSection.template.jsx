import { motion } from "framer-motion";
import TextReveal from "../patterns/TextReveal";
import { benefitCardVariants, viewportPresets } from "../patterns/card-reveal-variants";

/**
 * Template: new scroll-animated section matching yo-site patterns.
 * Copy to src/components/ and customize content.
 */
export default function NewSection() {
  const items = [
    { id: 1, title: "Item one", desc: "Description" },
    { id: 2, title: "Item two", desc: "Description" },
    { id: 3, title: "Item three", desc: "Description" },
    { id: 4, title: "Item four", desc: "Description" },
  ];

  return (
    <section id="my-section" className="relative py-24 md:py-32 px-6 md:px-12 z-10 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Headings — TextReveal with staggered delay */}
        <TextReveal>
          <h2 className="text-3xl md:text-4xl font-bold text-white">Section Title</h2>
        </TextReveal>

        <TextReveal delay={0.15}>
          <p className="mt-4 text-gray-400 max-w-2xl">Section subtitle or description.</p>
        </TextReveal>

        {/* Cards — whileInView stagger */}
        <div className="grid grid-cols-12 gap-6 mt-12">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              custom={index}
              initial="hidden"
              whileInView="visible"
              viewport={viewportPresets.cards}
              variants={benefitCardVariants}
              className="col-span-12 md:col-span-6 lg:col-span-3"
            >
              <div className="glass-panel p-6 rounded-2xl border border-white/5">
                <h3 className="text-lg font-bold text-white">{item.title}</h3>
                <p className="text-sm text-gray-400 mt-2">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
