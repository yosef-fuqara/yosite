import { Globe, MousePointerClick, ShoppingBag, LayoutDashboard, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import TextReveal from "./TextReveal";

export default function Services() {
  const servicesList = [
    {
      icon: Globe,
      title: "Websites",
      desc: "Premium, tailor-made digital storefronts built from the ground up for SEO authority, extreme speed, and luxury aesthetics.",
      sizeClass: "col-span-12 md:col-span-6",
      accent: "from-violet-600/20 to-purple-800/5",
      borderGlow: "group-hover:border-violet-500/30",
      iconColor: "text-violet-400",
    },
    {
      icon: ShoppingBag,
      title: "E-commerce Stores",
      desc: "Tactile, high-converting digital shops built with fluid catalog animations, rich layouts, and frictionless, high-velocity checkouts.",
      sizeClass: "col-span-12 md:col-span-6",
      accent: "from-fuchsia-600/20 to-pink-800/5",
      borderGlow: "group-hover:border-fuchsia-500/30",
      iconColor: "text-fuchsia-400",
    },
    {
      icon: LayoutDashboard,
      title: "Dashboards",
      desc: "Responsive web portals that unify complex data with elegant layout systems and custom, pixel-perfect visualization elements.",
      sizeClass: "col-span-12 md:col-span-4",
      accent: "from-cyan-600/20 to-blue-800/5",
      borderGlow: "group-hover:border-cyan-500/30",
      iconColor: "text-cyan-400",
    },
    {
      icon: MousePointerClick,
      title: "Landing Pages",
      desc: "Hyper-focused digital journeys featuring gorgeous scroll typography that turns traffic into committed users.",
      sizeClass: "col-span-12 md:col-span-4",
      accent: "from-pink-600/20 to-rose-800/5",
      borderGlow: "group-hover:border-pink-500/30",
      iconColor: "text-pink-400",
    },
    {
      icon: Sparkles,
      title: "Animated Web Experiences",
      desc: "High-fidelity animations and scroll narratives designed to tell immersive brand stories and make visitors scroll.",
      sizeClass: "col-span-12 md:col-span-4",
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
        ease: [0.16, 1, 0.3, 1], // Premium easing
      },
    }),
  };

  return (
    <section id="services" className="relative py-24 md:py-32 px-6 md:px-12 z-10 overflow-hidden">
      {/* Background glow shadow */}
      <div className="absolute bottom-[-10%] right-[10%] w-[50%] h-[40%] bg-violet-900/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 md:mb-24 gap-6">
          <div className="max-w-2xl">
            <TextReveal>
              <span className="text-xs font-bold tracking-widest text-violet-400 uppercase mb-3 block">
                Core Capabilities
              </span>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight font-heading">
                What We Architect
              </h2>
            </TextReveal>
            <TextReveal delay={0.1}>
              <p className="mt-4 text-base md:text-lg text-gray-400 font-light">
                We design and write code for bespoke web environments. We reject off-the-shelf templates to deliver custom products built for speed and visual luxury.
              </p>
            </TextReveal>
          </div>
          <TextReveal delay={0.2}>
            <a
              href="#cta"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-violet-400 group transition-colors duration-300 w-fit"
            >
              Request custom build
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </TextReveal>
        </div>

        {/* Services Asymmetric Grid */}
        <div className="grid grid-cols-12 gap-6 md:gap-8">
          {servicesList.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <motion.div
                key={service.title}
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={cardVariants}
                className={`${service.sizeClass} group`}
              >
                <div
                  className={`h-full glass-panel p-8 md:p-10 rounded-2xl flex flex-col justify-between relative overflow-hidden transition-all duration-500 border border-white/5 ${service.borderGlow} hover:shadow-[0_30px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(139,92,246,0.15)] hover:bg-[#0c0c0e]`}
                >
                  {/* Subtle Gradient Glow inside the Card */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${service.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none blur-3xl`}
                  />

                  <div className="relative z-10">
                    {/* Icon Container */}
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 group-hover:bg-white/10 transition-colors duration-300">
                      <IconComponent className={`w-5 h-5 ${service.iconColor}`} />
                    </div>

                    {/* Headline */}
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-4 font-heading group-hover:text-white transition-colors duration-300">
                      {service.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm md:text-base text-gray-400 leading-relaxed font-light">
                      {service.desc}
                    </p>
                  </div>

                  {/* Micro-interaction Line */}
                  <div className="w-full h-[1px] bg-white/5 mt-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
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
