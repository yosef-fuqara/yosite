import { useState, useRef, useEffect } from "react";
import { ArrowRight, CheckCircle2, Layout, BarChart2, ShoppingCart, Palette, Code, Package } from "lucide-react";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import TextReveal from "./TextReveal";
import { useI18n } from "../i18n/I18nContext";

// Component for visual floaters
function MockupCard({ title, icon: Icon, children, className = "" }) {
  return (
    <div className={`glass-panel p-4 rounded-xl border border-white/10 bg-black/75 shadow-[0_15px_35px_rgba(0,0,0,0.8)] ${className}`}>
      <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
        <Icon className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</span>
      </div>
      {children}
    </div>
  );
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_API_URL = import.meta.env.VITE_CONTACT_API_URL || "/api/contact";

export default function CTA() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    email: "",
    phone: "",
    details: "",
  });

  const [isMobile, setIsMobile] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Track scroll position of the section
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 25,
  });

  // Scroll animations: Left moves down, Right moves up
  const leftY = useTransform(smoothProgress, [0, 1], [-60, 90]);
  const rightY = useTransform(smoothProgress, [0, 1], [90, -60]);

  const clearFieldError = (field) => {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: "" } : prev));
    if (submitError) setSubmitError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedDetails = details.trim();

    const errors = {
      name: "",
      email: "",
      phone: "",
      details: "",
    };

    if (!trimmedName) {
      errors.name = t("cta.errors.name");
    }
    if (!trimmedEmail) {
      errors.email = t("cta.errors.email");
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = t("cta.errors.emailInvalid");
    }
    if (!trimmedPhone) {
      errors.phone = t("cta.errors.phone");
    }
    if (!trimmedDetails) {
      errors.details = t("cta.errors.details");
    }

    const hasErrors = Object.values(errors).some(Boolean);
    if (hasErrors) {
      setFieldErrors(errors);
      return;
    }

    if (isSubmitting) return;

    setSubmitError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(CONTACT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          message: trimmedDetails,
        }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        // non-JSON error response
      }

      if (!response.ok) {
        setSubmitError(data.error || t("cta.errors.submit"));
        return;
      }

      setFieldErrors({ name: "", email: "", phone: "", details: "" });
      setSubmitted(true);
    } catch {
      setSubmitError(t("cta.errors.network"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="cta"
      ref={sectionRef}
      className="cta-section relative z-10 overflow-x-hidden py-16 max-md:min-h-0 md:overflow-hidden md:py-32 px-4 sm:px-6 md:px-12"
    >
      {/* Gaseous space glow — desktop only (avoids mobile overflow) */}
      <div className="cta-section-glow pointer-events-none absolute top-1/2 left-1/2 hidden h-[min(70%,28rem)] w-[min(70%,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/5 blur-[140px] md:block" />

      <div className="relative mx-auto max-w-6xl w-full min-w-0">
        {/* Large Premium Contact Block Container */}
        <div className="cta-panel relative glass-panel w-full min-w-0 min-h-0 rounded-2xl border border-white/10 bg-black/60 p-5 sm:p-6 shadow-[0_24px_48px_rgba(0,0,0,0.75)] max-md:overflow-x-hidden md:overflow-hidden md:rounded-[32px] md:p-16 md:shadow-[0_50px_100px_rgba(0,0,0,0.9)]">
          {/* Inner Purple Nebula spot — desktop only */}
          <div className="pointer-events-none absolute -top-32 -right-32 hidden h-[350px] w-[350px] rounded-full bg-violet-500/10 blur-[90px] md:block" />
          <div className="pointer-events-none absolute -bottom-32 -left-32 hidden h-[350px] w-[350px] rounded-full bg-purple-500/8 blur-[90px] md:block" />

          {/* Staged Columns layout on Desktop */}
          <div className="relative z-10 flex w-full min-w-0 flex-col gap-0 md:grid md:grid-cols-12 md:items-center md:gap-8">
            
            {/* Column 1: Left Floating Cards (translate downward) */}
            <div className="hidden lg:col-span-3 lg:flex flex-col gap-6">
              <motion.div style={{ y: isMobile ? 0 : leftY }}>
                <MockupCard title={t("cta.mockups.websites")} icon={Layout} className="w-[200px]">
                  <div className="space-y-2">
                    <div className="w-full h-8 bg-white/5 rounded-md border border-white/5 flex items-center justify-between px-2 text-[9px] text-gray-500">
                      <span>YoSite Studio</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500/70" />
                    </div>
                    <div className="w-12 h-2 bg-violet-500/40 rounded" />
                    <div className="w-full h-1 bg-white/10 rounded" />
                    <div className="w-4/5 h-1 bg-white/10 rounded" />
                  </div>
                </MockupCard>
              </motion.div>

              <motion.div style={{ y: isMobile ? 0 : leftY }} className="ml-4">
                <MockupCard title={t("cta.mockups.code")} icon={Code} className="w-[180px]">
                  <div className="font-mono text-[9px] text-violet-400 space-y-1">
                    <div><span className="text-gray-500">const</span> studio = &#123;</div>
                    <div className="pl-3">speed: <span className="text-cyan-400">"100%"</span>,</div>
                    <div className="pl-3">custom: <span className="text-fuchsia-400">true</span></div>
                    <div>&#125;;</div>
                  </div>
                </MockupCard>
              </motion.div>
            </div>

            {/* Column 2: Center Contact Form */}
            <div className="cta-form-column flex w-full min-w-0 flex-col items-stretch md:col-span-12 lg:col-span-6 lg:items-center">
              <AnimatePresence mode="wait">
                {!submitted ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4 }}
                    className="cta-form-wrap mx-auto w-full min-w-0 max-md:max-w-none md:max-w-md"
                  >
                    <div className="cta-form-header mb-8 max-md:mb-10 text-center max-md:px-1">
                      <TextReveal>
                        <h2 className="cta-title mb-2 font-extrabold tracking-tight text-white font-heading md:text-4xl">
                          {t("cta.title")}
                        </h2>
                      </TextReveal>
                      <TextReveal delay={0.15}>
                        <p className="text-sm font-light leading-relaxed text-gray-400 max-md:text-[0.9375rem] max-md:leading-6">
                          {t("cta.subtitle")}
                        </p>
                      </TextReveal>
                    </div>

                    <form onSubmit={handleSubmit} className="cta-form w-full min-w-0 space-y-4 max-md:space-y-5">
                      {/* Name input */}
                      <div>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            clearFieldError("name");
                          }}
                          placeholder={t("cta.name")}
                          className="box-border w-full max-w-full bg-white/5 border border-white/5 focus:border-violet-500/40 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors duration-300 max-md:px-4 sm:px-5"
                        />
                        {fieldErrors.name && (
                          <p className="text-[11px] text-rose-400/90 mt-1 px-1">{fieldErrors.name}</p>
                        )}
                      </div>

                      {/* Email input */}
                      <div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            clearFieldError("email");
                          }}
                          placeholder={t("cta.email")}
                          className="box-border w-full max-w-full bg-white/5 border border-white/5 focus:border-violet-500/40 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors duration-300 max-md:px-4 sm:px-5"
                        />
                        {fieldErrors.email && (
                          <p className="text-[11px] text-rose-400/90 mt-1 px-1">{fieldErrors.email}</p>
                        )}
                      </div>

                      {/* Phone / WhatsApp input */}
                      <div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            clearFieldError("phone");
                          }}
                          placeholder={t("cta.phone")}
                          className="box-border w-full max-w-full bg-white/5 border border-white/5 focus:border-violet-500/40 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors duration-300 max-md:px-4 sm:px-5"
                        />
                        {fieldErrors.phone && (
                          <p className="text-[11px] text-rose-400/90 mt-1 px-1">{fieldErrors.phone}</p>
                        )}
                      </div>

                      {/* Project details textarea */}
                      <div>
                        <textarea
                          value={details}
                          onChange={(e) => {
                            setDetails(e.target.value);
                            clearFieldError("details");
                          }}
                          placeholder={t("cta.message")}
                          className="box-border w-full max-w-full bg-white/5 border border-white/5 focus:border-violet-500/40 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors duration-300 min-h-[7.5rem] resize-y max-md:min-h-[6.5rem] max-md:resize-none sm:px-5"
                        />
                        {fieldErrors.details && (
                          <p className="text-[11px] text-rose-400/90 mt-1 px-1">{fieldErrors.details}</p>
                        )}
                      </div>

                      {/* Submit Button with Purple Glow & Arrow */}
                      <div className="pt-2 max-md:pt-3">
                        {submitError && (
                          <p className="text-[11px] text-rose-400/90 mb-2 px-1 text-center">
                            {submitError}
                          </p>
                        )}
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-[0_15px_30px_rgba(139,92,246,0.25)] hover:shadow-[0_20px_45px_rgba(139,92,246,0.45)] transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                          {t("cta.button")}
                          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                        </button>
                      </div>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex w-full min-w-0 flex-col items-center justify-center py-8 text-center max-md:px-1 md:py-10"
                  >
                    <div className="w-14 h-14 rounded-full bg-violet-600/10 border border-violet-500/30 flex items-center justify-center mb-6">
                      <CheckCircle2 className="w-6 h-6 text-violet-400" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-white font-heading mb-2">
                      {t("cta.successTitle")}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-400 max-w-sm font-light leading-relaxed mb-6">
                      {t("cta.successBody", { name })}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(false);
                        setName("");
                        setEmail("");
                        setPhone("");
                        setDetails("");
                        setFieldErrors({ name: "", email: "", phone: "", details: "" });
                        setSubmitError("");
                      }}
                      className="text-[10px] font-bold tracking-widest text-violet-400 hover:text-violet-300 uppercase underline transition-colors"
                    >
                      {t("cta.sendAnother")}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Column 3: Right Floating Cards (translate upward) */}
            <div className="hidden lg:col-span-3 lg:flex flex-col gap-6 items-end">
              <motion.div style={{ y: isMobile ? 0 : rightY }}>
                <MockupCard title={t("cta.mockups.dashboards")} icon={BarChart2} className="w-[190px]">
                  <div className="flex gap-2 items-end h-12 pt-2">
                    <div className="w-3.5 h-[40%] bg-violet-500/50 rounded-sm" />
                    <div className="w-3.5 h-[80%] bg-violet-500 rounded-sm" />
                    <div className="w-3.5 h-[60%] bg-cyan-400/80 rounded-sm" />
                    <div className="w-3.5 h-[95%] bg-fuchsia-500 rounded-sm" />
                  </div>
                </MockupCard>
              </motion.div>

              <motion.div style={{ y: isMobile ? 0 : rightY }} className="mr-6">
                <MockupCard title={t("cta.mockups.ecommerce")} icon={ShoppingCart} className="w-[200px]">
                  <div className="space-y-2">
                    <div className="rounded-lg border border-white/10 bg-[#08080a] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                      <div className="relative aspect-[4/3] bg-gradient-to-br from-violet-600/50 via-violet-900/40 to-cyan-600/30">
                        <div
                          aria-hidden
                          className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_15%,rgba(167,139,250,0.45),transparent_60%)]"
                        />
                        <span className="absolute top-1.5 start-1.5 text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-500/90 text-white">
                          {t("cta.mockups.productBadge")}
                        </span>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-xl bg-black/35 border border-white/10 flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                            <Package className="w-5 h-5 text-violet-300/90" strokeWidth={1.75} />
                          </div>
                        </div>
                      </div>
                      <div className="p-2 space-y-1.5 border-t border-white/5">
                        <p className="text-[10px] font-semibold text-white leading-tight truncate">
                          {t("cta.mockups.productCard")}
                        </p>
                        <div className="flex gap-0.5" aria-hidden>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`w-1.5 h-1.5 rounded-full ${star <= 4 ? "bg-amber-400/85" : "bg-white/15"}`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-violet-400">$99</span>
                          <span className="text-[8px] text-gray-600 line-through">$129</span>
                          <button
                            type="button"
                            tabIndex={-1}
                            aria-hidden
                            className="ms-auto w-5 h-5 rounded-full bg-violet-500/25 border border-violet-400/35 text-violet-200 text-[11px] font-bold leading-none flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[8px] text-gray-400">
                      <span>YoSite Store</span>
                      <span className="text-emerald-400/80 font-medium">{t("cta.mockups.inStock")}</span>
                    </div>
                  </div>
                </MockupCard>
              </motion.div>

              <motion.div style={{ y: isMobile ? 0 : rightY }}>
                <MockupCard title={t("cta.mockups.ui")} icon={Palette} className="w-[170px]">
                  <div className="flex gap-1.5 pt-1">
                    <div className="w-5 h-5 rounded-full bg-violet-500" />
                    <div className="w-5 h-5 rounded-full bg-fuchsia-500" />
                    <div className="w-5 h-5 rounded-full bg-cyan-400" />
                    <div className="w-5 h-5 rounded-full bg-gray-700" />
                  </div>
                </MockupCard>
              </motion.div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
