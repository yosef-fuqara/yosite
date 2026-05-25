import { Palette, Zap, Smartphone, Building2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import TextReveal from "./TextReveal";
import BuildTicker from "./BuildTicker";
import { useI18n } from "../i18n/I18nContext";

export default function Services() {
  const { t } = useI18n();

  const benefitCards = [
    {
      icon: Palette,
      key: "cleanDesign",
      sizeClass: "col-span-12 md:col-span-6 lg:col-span-3",
      accent: "from-violet-600/20 to-purple-800/5",
      borderGlow: "group-hover:border-violet-500/30",
      iconColor: "text-violet-400",
    },
    {
      icon: Zap,
      key: "fastLoading",
      sizeClass: "col-span-12 md:col-span-6 lg:col-span-3",
      accent: "from-fuchsia-600/20 to-pink-800/5",
      borderGlow: "group-hover:border-fuchsia-500/30",
      iconColor: "text-fuchsia-400",
    },
    {
      icon: Smartphone,
      key: "mobileFirst",
      sizeClass: "col-span-12 md:col-span-6 lg:col-span-3",
      accent: "from-cyan-600/20 to-blue-800/5",
      borderGlow: "group-hover:border-cyan-500/30",
      iconColor: "text-cyan-400",
    },
    {
      icon: Building2,
      key: "realBusiness",
      sizeClass: "col-span-12 md:col-span-6 lg:col-span-3",
      accent: "from-violet-600/20 to-cyan-800/5",
      borderGlow: "group-hover:border-violet-500/30",
      iconColor: "text-violet-400",
    },
  ];

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 60, 
      scale: 0.95,
      transformOrigin: "bottom center"
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

  return (
    <section id="services" className="relative py-24 md:py-32 px-6 md:px-12 z-10 overflow-hidden">
      <div className="absolute bottom-[-10%] right-[10%] w-[50%] h-[40%] bg-violet-900/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <TextReveal>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight font-heading">
                {t("services.title")}
              </h2>
            </TextReveal>
            <TextReveal delay={0.1}>
              <p className="mt-4 text-base md:text-lg text-gray-400 font-light">
                {t("services.subtitle")}
              </p>
            </TextReveal>
          </div>
          <TextReveal delay={0.2}>
            <a
              href="#cta"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-violet-400 group transition-colors duration-300 w-fit"
            >
              {t("services.cta")}
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
            </a>
          </TextReveal>
        </div>

        <BuildTicker />

        <TextReveal delay={0.15}>
          <h3 className="mt-16 md:mt-24 text-xs font-bold tracking-widest text-violet-400 uppercase">
            {t("services.benefitsHeading")}
          </h3>
        </TextReveal>

        <div className="grid grid-cols-12 gap-6 md:gap-6 lg:gap-5 mt-8 md:mt-10">
          {benefitCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <motion.div
                key={card.key}
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={cardVariants}
                className={`${card.sizeClass} group`}
              >
                <div
                  className={`h-full glass-panel p-6 md:p-8 rounded-2xl flex flex-col justify-between relative overflow-hidden transition-all duration-500 border border-white/5 ${card.borderGlow} hover:shadow-[0_30px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(139,92,246,0.15)] hover:bg-[#0c0c0e]`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none blur-3xl`}
                  />

                  <div className="relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-5 group-hover:bg-white/10 transition-colors duration-300">
                      <IconComponent className={`w-4 h-4 ${card.iconColor}`} />
                    </div>

                    <h3 className="text-lg md:text-xl font-bold text-white mb-2 font-heading group-hover:text-white transition-colors duration-300">
                      {t(`services.items.${card.key}.title`)}
                    </h3>

                    <p className="text-sm text-gray-400 leading-relaxed font-light">
                      {t(`services.items.${card.key}.desc`)}
                    </p>
                  </div>

                  <div className="w-full h-[1px] bg-white/5 mt-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 rtl:translate-x-full rtl:group-hover:translate-x-0" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
