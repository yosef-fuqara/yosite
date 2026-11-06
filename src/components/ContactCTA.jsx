import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "framer-motion";
import "../styles/contact-cta.css";

gsap.registerPlugin(ScrollTrigger);

const PHRASES = [
  "TELL ME ABOUT IT.",
  "LET'S TALK.",
  "COFFEE'S ON ME.",
  "LET'S MAKE SOMETHING.",
  "SAY HELLO.",
  "DON'T BE SHY.",
];
const WA_NUMBER = "972505114896";

function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function ContactCTA() {
  const sectionRef = useRef(null);
  const introRef = useRef(null);
  const introTextRef = useRef(null);
  const contactRef = useRef(null);
  const contentRef = useRef(null);
  const headlineRef = useRef(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const phone = window.matchMedia("(max-width: 640px)").matches;
      gsap.fromTo(introTextRef.current,
        { autoAlpha: 0, y: reduced ? 0 : 12, filter: reduced ? "none" : "blur(5px)", "--intro-tracking": reduced ? .34 : .46 },
        { autoAlpha: 1, y: 0, filter: "blur(0px)", "--intro-tracking": .34, duration: reduced ? .4 : phone ? .7 : 1.6, ease: "power2.out",
          scrollTrigger: { trigger: introRef.current, start: phone ? "top 72%" : "top 35%", toggleActions: "play none none none" } });
      gsap.fromTo(contentRef.current, { autoAlpha: 0, y: reduced ? 0 : 26 }, {
        autoAlpha: 1, y: 0, duration: reduced ? .4 : 1.1, ease: "power2.out",
        scrollTrigger: { trigger: contactRef.current, start: "top 65%", toggleActions: "play none none reverse" },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, [reduced]);

  useLayoutEffect(() => {
    const headline = headlineRef.current;
    const panels = [...headline.querySelectorAll(".cta-contact__phrase")];
    let current = 0;
    let visible = false;
    let delay;
    let transition;
    let disposed = false;
    const schedule = () => {
      if (disposed) return;
      delay = gsap.delayedCall(3.6, changePhrase);
      if (!visible || document.hidden) delay.pause();
    };
    const changePhrase = () => {
      const next = (current + 1) % panels.length;
      const outgoing = panels[current];
      const incoming = panels[next];
      const outLetters = shuffled(outgoing.querySelectorAll(".cta-contact__letter"));
      const inLetters = shuffled(incoming.querySelectorAll(".cta-contact__letter"));
      const distance = window.innerWidth < 640 ? 34 : 64;
      transition = gsap.timeline({ onComplete: () => {
        gsap.set(outgoing, { autoAlpha: 0 });
        gsap.set([...outLetters, ...inLetters], { clearProps: "transform,opacity,willChange" });
        current = next;
        transition = null;
        schedule();
      } });
      if (reduced) {
        transition.to(outgoing, { autoAlpha: 0, duration: .35 }, 0)
          .fromTo(incoming, { autoAlpha: 0 }, { autoAlpha: 1, duration: .45 }, .2);
      } else {
        gsap.set(incoming, { autoAlpha: 1 });
        gsap.set([...outLetters, ...inLetters], { willChange: "transform,opacity" });
        outLetters.forEach((letter, rank) => {
          const at = rank / Math.max(1, outLetters.length - 1) * .28;
          const duration = .48 + Math.random() * .16;
          transition.to(letter, { y: distance * (1.1 + Math.random() * .35), rotation: (Math.random() - .5) * 12, duration, ease: "power2.in" }, at)
            .to(letter, { opacity: 0, duration: duration * .35, ease: "none" }, at + duration * .65);
        });
        inLetters.forEach((letter, rank) => {
          const at = .3 + rank / Math.max(1, inLetters.length - 1) * .25;
          transition.fromTo(letter,
            { y: -distance, rotation: (Math.random() - .5) * 9, opacity: 0 },
            { y: 0, rotation: 0, opacity: 1, duration: .52 + Math.random() * .12, ease: "power2.out" }, at);
        });
      }
    };
    const ctx = gsap.context(() => {
      gsap.set(panels, { autoAlpha: 0 });
      gsap.set(panels[0], { autoAlpha: 1 });
    }, headline);
    const syncPlayback = () => {
      const running = visible && !document.hidden;
      if (running && !delay && !transition) schedule();
      delay?.paused(!running);
      transition?.paused(!running);
    };
    const resetToFirst = () => {
      delay?.kill();
      transition?.kill();
      delay = null;
      transition = null;
      gsap.set(headline.querySelectorAll(".cta-contact__letter"), {
        clearProps: "transform,opacity,willChange",
      });
      gsap.set(panels, { autoAlpha: 0 });
      gsap.set(panels[0], { autoAlpha: 1 });
      current = 0;
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.intersectionRatio >= .8;
      if (!entry.isIntersecting) resetToFirst();
      syncPlayback();
    }, { threshold: [0, .8] });
    observer.observe(headline);
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      delay?.kill();
      transition?.kill();
      gsap.set(headline.querySelectorAll(".cta-contact__letter"), { clearProps: "transform,opacity,willChange" });
      ctx.revert();
    };
  }, [reduced]);

  const send = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const name = String(values.get("name")).trim();
    const projectDetails = String(values.get("projectDetails")).trim();
    const message = `Hi, my name is ${name}.\n\nHere’s what my project is about:\n${projectDetails}`;
    window.open(
      `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <section ref={sectionRef} className="cta-contact" id="cta" dir="ltr" aria-label="Contact">
      <div ref={introRef} className="cta-contact__intro">
        <div className="cta-contact__intro-stage">
          <div ref={introTextRef} className="cta-contact__intro-eyebrow">
            <p className="cta-contact__eyebrow">So ...</p>
            <p className="cta-contact__eyebrow">HAVE SOMETHING IN MIND?</p>
          </div>
        </div>
      </div>
      <div ref={contactRef} id="contact-screen" className="cta-contact__main">
        <div ref={contentRef} className="cta-contact__content">
          <h2 ref={headlineRef} className="cta-contact__headline" aria-label="Let's talk about your project.">
            {PHRASES.map((phrase, index) => (
              <span key={phrase} className="cta-contact__phrase" aria-hidden="true"
                style={{ "--phrase-size": `${Math.min(12, 148 / phrase.length)}vw`, visibility: index ? "hidden" : "visible" }}>
                {phrase.split(" ").map((word, wordIndex) => (
                  <span className="cta-contact__word" key={`${index}-${wordIndex}`}>
                    {[...word].map((letter, letterIndex) => <span className="cta-contact__letter" key={letterIndex}>{letter}</span>)}
                    {wordIndex < phrase.split(" ").length - 1 && <span className="cta-contact__space"> </span>}
                  </span>
                ))}
              </span>
            ))}
          </h2>
          <form id="contact-form" className="cta-contact__form" onSubmit={send} noValidate>
            <label className="cta-contact__field" htmlFor="contact-name">
              <span>NAME</span>
              <input
                id="contact-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                maxLength={120}
                required
              />
            </label>
            <label className="cta-contact__field" htmlFor="contact-project-details">
              <span>PROJECT DETAILS</span>
              <textarea
                id="contact-project-details"
                name="projectDetails"
                rows={2}
                maxLength={5000}
                placeholder="Tell me about your project"
                required
              />
            </label>
            <p id="contact-privacy-notice" className="cta-contact__notice">
              These details are voluntary. YoSite uses them only to reply to you. The button opens WhatsApp with them filled in, and WhatsApp may receive them before you send.{" "}
              <a href="/privacy-policy#whatsapp-contact">Privacy Policy</a>
            </p>
            <button type="submit" className="cta-contact__send" aria-describedby="contact-privacy-notice">
              LET&apos;S MAKE IT REAL{" "}
              <span className="cta-contact__send-arrow" aria-hidden="true">
                ↗
              </span>
            </button>
            <p className="cta-contact__delivery">One click away from bringing your idea to life.</p>
          </form>
        </div>
      </div>
    </section>
  );
}
