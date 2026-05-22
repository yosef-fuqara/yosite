import { useState, useRef, useEffect } from "react";
import { ArrowRight, CheckCircle2, Sparkles, Layout, BarChart2, ShoppingCart, Palette, Code } from "lucide-react";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import TextReveal from "./TextReveal";

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
      errors.name = "Please fill in your name.";
    }
    if (!trimmedEmail) {
      errors.email = "Please fill in your email.";
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = "Please enter a valid email address.";
    }
    if (!trimmedPhone) {
      errors.phone = "Please fill in your phone / WhatsApp number.";
    }
    if (!trimmedDetails) {
      errors.details = "Please share some details about your project.";
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
        setSubmitError(
          data.error || "We could not send your message. Please try again."
        );
        return;
      }

      setFieldErrors({ name: "", email: "", phone: "", details: "" });
      setSubmitted(true);
    } catch {
      setSubmitError(
        "Unable to reach the server. Check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section ref={sectionRef} id="cta" className="relative py-24 md:py-32 px-6 md:px-12 z-10 overflow-hidden">
      {/* Gaseous space glow */}
      <div className="absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%] w-[70%] h-[70%] bg-violet-600/5 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        {/* Large Premium Contact Block Container */}
        <div className="relative glass-panel rounded-[32px] border border-white/10 p-8 md:p-16 overflow-hidden bg-black/60 shadow-[0_50px_100px_rgba(0,0,0,0.9)]">
          {/* Inner Purple Nebula spot */}
          <div className="absolute -top-32 -right-32 w-[350px] h-[350px] rounded-full bg-violet-500/10 blur-[90px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-[350px] h-[350px] rounded-full bg-purple-500/8 blur-[90px] pointer-events-none" />

          {/* Staged Columns layout on Desktop */}
          <div className="grid grid-cols-12 gap-8 items-center relative z-10">
            
            {/* Column 1: Left Floating Cards (translate downward) */}
            <div className="hidden lg:col-span-3 lg:flex flex-col gap-6">
              <motion.div style={{ y: isMobile ? 0 : leftY }}>
                <MockupCard title="Websites" icon={Layout} className="w-[200px]">
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
                <MockupCard title="Code/Motion" icon={Code} className="w-[180px]">
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
            <div className="col-span-12 lg:col-span-6 flex flex-col items-center">
              <AnimatePresence mode="wait">
                {!submitted ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4 }}
                    className="w-full max-w-md mx-auto"
                  >
                    <div className="text-center mb-8">
                      <TextReveal>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-950/20 mb-4 text-[10px] font-bold text-violet-400 uppercase tracking-widest">
                          <Sparkles className="w-3 h-3" /> Partner with Us
                        </span>
                        <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight font-heading mb-2">
                          Have a project in mind?
                        </h2>
                      </TextReveal>
                      <TextReveal delay={0.15}>
                        <p className="text-sm text-gray-400 font-light">
                          Let’s build something people remember.
                        </p>
                      </TextReveal>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Name input */}
                      <div>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            clearFieldError("name");
                          }}
                          placeholder="Your Name"
                          className="w-full bg-white/5 border border-white/5 focus:border-violet-500/40 rounded-xl px-5 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors duration-300"
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
                          placeholder="your@email.com"
                          className="w-full bg-white/5 border border-white/5 focus:border-violet-500/40 rounded-xl px-5 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors duration-300"
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
                          placeholder="Phone / WhatsApp"
                          className="w-full bg-white/5 border border-white/5 focus:border-violet-500/40 rounded-xl px-5 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors duration-300"
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
                          placeholder="Tell us about your project..."
                          className="w-full bg-white/5 border border-white/5 focus:border-violet-500/40 rounded-xl px-5 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors duration-300 min-h-[100px] resize-none"
                        />
                        {fieldErrors.details && (
                          <p className="text-[11px] text-rose-400/90 mt-1 px-1">{fieldErrors.details}</p>
                        )}
                      </div>

                      {/* Submit Button with Purple Glow & Arrow */}
                      <div className="pt-2">
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
                          Send Message
                          <ArrowRight className="w-4 h-4" />
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
                    className="text-center py-10 flex flex-col items-center justify-center w-full"
                  >
                    <div className="w-14 h-14 rounded-full bg-violet-600/10 border border-violet-500/30 flex items-center justify-center mb-6">
                      <CheckCircle2 className="w-6 h-6 text-violet-400" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-white font-heading mb-2">
                      Message Sent
                    </h3>
                    <p className="text-xs md:text-sm text-gray-400 max-w-sm font-light leading-relaxed mb-6">
                      Thank you, <span className="text-white font-semibold">{name}</span>! We have received your project details and email (<span className="text-violet-400">{email}</span>). A studio director will contact you within 24 hours.
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
                      Send another message
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Column 3: Right Floating Cards (translate upward) */}
            <div className="hidden lg:col-span-3 lg:flex flex-col gap-6 items-end">
              <motion.div style={{ y: isMobile ? 0 : rightY }}>
                <MockupCard title="Dashboards" icon={BarChart2} className="w-[190px]">
                  <div className="flex gap-2 items-end h-12 pt-2">
                    <div className="w-3.5 h-[40%] bg-violet-500/50 rounded-sm" />
                    <div className="w-3.5 h-[80%] bg-violet-500 rounded-sm" />
                    <div className="w-3.5 h-[60%] bg-cyan-400/80 rounded-sm" />
                    <div className="w-3.5 h-[95%] bg-fuchsia-500 rounded-sm" />
                  </div>
                </MockupCard>
              </motion.div>

              <motion.div style={{ y: isMobile ? 0 : rightY }} className="mr-6">
                <MockupCard title="E-commerce" icon={ShoppingCart} className="w-[200px]">
                  <div className="space-y-2">
                    <div className="aspect-[4/3] bg-white/5 rounded border border-white/5 flex items-center justify-center text-[10px] text-gray-500">
                      Product Card
                    </div>
                    <div className="flex items-center justify-between text-[8px] text-gray-400">
                      <span>YoSite Store</span>
                      <span className="text-violet-400 font-bold">$99</span>
                    </div>
                  </div>
                </MockupCard>
              </motion.div>

              <motion.div style={{ y: isMobile ? 0 : rightY }}>
                <MockupCard title="UI Design" icon={Palette} className="w-[170px]">
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
