import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "framer-motion";
import { useI18n } from "../i18n/I18nContext";
import { SERVICE_CARDS, SERVICE_CARD_KEYS } from "../data/serviceCards";
import { SHEET_START } from "../utils/servicesSheet";
import { PROCESS_STEPS } from "../data/processSteps";
import {
  bindProcess,
  measureProcess,
  restProcess,
} from "../utils/processSequence";
import "../styles/services.css";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const DESKTOP_QUERY = "(min-width: 768px)";
const MOBILE_QUERY = "(max-width: 767px)";

const MARKS = {
  frames: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.2" y="4.8" width="11.2" height="9.4" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9.4" y="9.4" width="11.2" height="9.4" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  brackets: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8.2 5.2 4.4 12l3.8 6.8" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M15.8 5.2 19.6 12l-3.8 6.8" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  bag: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.2 8.2h11.6l-1 11.2H7.2l-1-11.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9.1 8.2V7.1a2.9 2.9 0 0 1 5.8 0v1.1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  orbit: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="2.15" stroke="currentColor" strokeWidth="1.4" />
      <ellipse cx="12" cy="12" rx="8.4" ry="3.6" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  ),
  page: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6.2" y="4.2" width="11.6" height="15.6" rx="1.15" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 9.2h6.1M9 12.2h6.1M9 15.2h3.8" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  ),
  pulse: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.2 13.2h3.4l1.7-5.4 2.7 9.4 1.8-4h7.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

function ServiceCard({ item, t }) {
  return (
    <article className="services-card" data-id={item.key} data-track={item.track}>
      <div className="services-card__head">
        <h3 className="services-card__title">{t(`services.cards.${item.key}.title`)}</h3>
        <span className="services-card__mark" aria-hidden="true">
          {MARKS[item.mark]}
        </span>
      </div>
      <p className="services-card__desc">{t(`services.cards.${item.key}.desc`)}</p>
    </article>
  );
}

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function smoothstep(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function trackRange(viewport, track, upward) {
  const viewH = viewport.clientHeight || window.innerHeight;
  const trackH = track.scrollHeight || viewH;
  const pad = Math.round(viewH * 0.16);
  if (upward) {
    return { from: viewH + pad, to: -(trackH + pad) };
  }
  return { from: -(trackH + pad), to: viewH + pad };
}

function applyCorner(track, corner, compact, viewport) {
  const viewH = viewport?.clientHeight || window.innerHeight;
  const trackY = Number(gsap.getProperty(track, "y")) || 0;
  const fromRight = corner.includes("right");
  const fromTop = corner.startsWith("top");
  const reach = compact
    ? Math.min((viewport?.clientWidth || window.innerWidth) * 0.14, 52)
    : Math.min(window.innerWidth * 0.28, viewH * 0.34, 320);
  const tilt = fromRight ? (compact ? 12 : 16) : compact ? -12 : -16;
  const origin = fromTop
    ? fromRight
      ? "right top"
      : "left top"
    : fromRight
      ? "right bottom"
      : "left bottom";

  for (const card of track.querySelectorAll(".services-card")) {
    const height = card.offsetHeight || 1;
    const center = trackY + card.offsetTop + height * 0.5;
    let amount = 0;

    if (fromTop) {
      const settle = viewH * 0.46;
      amount = clamp01((settle - center) / (settle + height * 1.15));
    } else {
      const settle = viewH * 0.54;
      amount = clamp01((center - settle) / (viewH - settle + height * 1.15));
    }

    const k = smoothstep(amount);
    gsap.set(card, {
      x: (fromRight ? reach : -reach) * k,
      y: 0,
      rotation: tilt * k,
      transformOrigin: origin,
      force3D: true,
    });
  }
}

function syncMobileZipper(leftTrack, rightTrack, enabled, viewport) {
  if (!enabled) {
    leftTrack.style.gap = "";
    rightTrack.style.gap = "";
    rightTrack.style.paddingTop = "";
    return;
  }

  const cards = [
    ...leftTrack.querySelectorAll(".services-card"),
    ...rightTrack.querySelectorAll(".services-card"),
  ];
  const height = cards.reduce((max, card) => Math.max(max, card.offsetHeight), 0);
  const viewH = viewport?.clientHeight || window.innerHeight;
  const gutter = 24;
  const stackGap = Math.round(Math.max(viewH * 0.58, height + gutter * 2) * 1.5);
  const nextGap = `${stackGap}px`;
  const nextPad = `${height + gutter}px`;
  if (leftTrack.style.gap !== nextGap) leftTrack.style.gap = nextGap;
  if (rightTrack.style.gap !== nextGap) rightTrack.style.gap = nextGap;
  if (rightTrack.style.paddingTop !== nextPad) rightTrack.style.paddingTop = nextPad;
}

const LEAD_TRAVEL = 180;
const SEQ_SCALE = 4.4;

const LEAD_REST = {
  x: 0,
  y: 0,
  xPercent: 0,
  scale: 1,
  rotation: 0,
  opacity: 1,
  visibility: "visible",
  clipPath: "none",
  webkitClipPath: "none",
  mask: "none",
  webkitMask: "none",
  filter: "none",
};

function leadChars(slot, which) {
  if (!slot) return [];
  return [...slot.querySelectorAll(`[data-lead="${which}"] .services-headline__lead-char`)];
}

function leadLayers(slot) {
  return slot?.querySelector(".services-headline__lead-layers") || null;
}

function restLeadChars(chars, yPercent) {
  if (!chars.length) return;
  gsap.set(chars, {
    ...LEAD_REST,
    yPercent,
    force3D: false,
  });
}

function resetLeadSwap(slot) {
  restLeadChars(leadChars(slot, "from"), 0);
  restLeadChars(leadChars(slot, "to"), LEAD_TRAVEL);
  gsap.set(leadChars(slot, "to"), { visibility: "hidden" });
  const layers = leadLayers(slot);
  if (layers) {
    layers.style.overflow = "visible";
    layers.style.clipPath = "none";
    layers.style.mask = "none";
    layers.style.webkitMask = "none";
  }
}

function settleLead(slot, time) {
  if (!slot) return;
  const from = leadChars(slot, "from");
  const to = leadChars(slot, "to");
  const layers = leadLayers(slot);
  const span = (1 - SHEET_START) * SEQ_SCALE;
  const swapStart = SHEET_START * SEQ_SCALE;
  const local = span <= 0 ? (time >= swapStart ? 1 : 0) : clamp01((time - swapStart) / span);

  if (local <= 0.001) {
    resetLeadSwap(slot);
    return;
  }

  if (local >= 0.999) {
    restLeadChars(from, -LEAD_TRAVEL);
    gsap.set(from, { visibility: "hidden" });
    restLeadChars(to, 0);
    if (layers) layers.style.overflow = "visible";
    return;
  }

  gsap.set([...from, ...to], {
    visibility: "visible",
    opacity: 1,
    clipPath: "none",
    webkitClipPath: "none",
    mask: "none",
    webkitMask: "none",
    filter: "none",
  });
  if (layers) layers.style.overflow = "hidden";
}

function bindLeadSwap(tl, slot) {
  const fromChars = leadChars(slot, "from");
  const toChars = leadChars(slot, "to");
  if (!fromChars.length || !toChars.length) return;

  resetLeadSwap(slot);

  const span = (1 - SHEET_START) * SEQ_SCALE;
  const stagger = 0.12 * span;
  const duration = 0.54 * span;
  const swapStart = SHEET_START * SEQ_SCALE;

  fromChars.forEach((el, index) => {
    tl.fromTo(
      el,
      { yPercent: 0, ...LEAD_REST },
      {
        yPercent: -LEAD_TRAVEL,
        ...LEAD_REST,
        duration,
        ease: "none",
        immediateRender: false,
      },
      swapStart + index * stagger,
    );
  });
  toChars.forEach((el, index) => {
    tl.fromTo(
      el,
      { yPercent: LEAD_TRAVEL, ...LEAD_REST },
      {
        yPercent: 0,
        ...LEAD_REST,
        duration,
        ease: "none",
        immediateRender: false,
      },
      swapStart + index * stagger,
    );
  });
}

function servicesStartOffset(root) {
  const work = document.getElementById("selected-work");
  const beat = Math.round(window.innerHeight * 0.22);
  if (!work) return beat;

  const holdPx = Math.max(
    0,
    work.getBoundingClientRect().bottom - window.innerHeight - root.getBoundingClientRect().top,
  );
  return holdPx + beat;
}

function processNodes(viewport) {
  return {
    visual: viewport.querySelector(".services-headline__visual"),
    how: viewport.querySelector("[data-process='how']"),
    stage: viewport.querySelector("[data-process='stage']"),
    frame: viewport.querySelector("[data-process='frame']"),
    exit: viewport.querySelector("[data-process='exit']"),
    imgs: [...viewport.querySelectorAll("[data-process-img]")],
    copies: [...viewport.querySelectorAll("[data-process-copy]")],
  };
}

function buildSequence(root, viewport, sheet, leftTrack, rightTrack, mode) {
  if (!leftTrack || !rightTrack || !sheet) return undefined;
  const isMobile = mode === "mobile";
  const leadSlot = viewport.querySelector(".services-headline__lead");
  const nodes = processNodes(viewport);
  const metricsRef = { current: measureProcess(viewport, nodes) };

  const layout = () => syncMobileZipper(leftTrack, rightTrack, isMobile, viewport);
  const pose = () => {
    applyCorner(leftTrack, "bottom-left", isMobile, viewport);
    applyCorner(rightTrack, "top-right", isMobile, viewport);
  };
  const measure = () => {
    metricsRef.current = measureProcess(viewport, nodes);
  };

  layout();
  measure();
  gsap.set(leftTrack, { y: trackRange(viewport, leftTrack, true).from, force3D: true });
  gsap.set(rightTrack, {
    y: trackRange(viewport, rightTrack, false).from,
    force3D: true,
  });
  resetLeadSwap(leadSlot);
  restProcess(metricsRef.current, nodes.imgs, nodes.copies);
  pose();

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: root,
      start: () => `top+=${servicesStartOffset(root)} top`,
      end: "bottom bottom",
      scrub: true,
      invalidateOnRefresh: true,
      fastScrollEnd: false,
      onUpdate: () => {
        pose();
        settleLead(leadSlot, tl.time());
      },
      onRefresh: () => {
        layout();
        measure();
        pose();
        settleLead(leadSlot, tl.time());
      },
      onToggle: (self) => {
        viewport.classList.toggle("is-pinned", self.isActive);
      },
    },
  });

  tl.fromTo(
    leftTrack,
    { y: () => trackRange(viewport, leftTrack, true).from },
    { y: () => trackRange(viewport, leftTrack, true).to, duration: SHEET_START * SEQ_SCALE },
    0,
  );
  tl.fromTo(
    rightTrack,
    { y: () => trackRange(viewport, rightTrack, false).from },
    { y: () => trackRange(viewport, rightTrack, false).to, duration: SHEET_START * SEQ_SCALE },
    0,
  );
  bindLeadSwap(tl, leadSlot);
  tl.to({}, { duration: (1 - SHEET_START) * SEQ_SCALE }, SHEET_START * SEQ_SCALE);
  bindProcess(tl, SEQ_SCALE, nodes, metricsRef, nodes.imgs, nodes.copies);

  return () => {
    viewport.classList.remove("is-pinned");
    syncMobileZipper(leftTrack, rightTrack, false, viewport);
    resetLeadSwap(leadSlot);
    restProcess(measureProcess(viewport, nodes), nodes.imgs, nodes.copies);
    gsap.set(
      [
        leftTrack,
        rightTrack,
        ...leftTrack.children,
        ...rightTrack.children,
        nodes.how,
        nodes.stage,
        nodes.frame,
        nodes.exit,
        nodes.visual,
      ].filter(Boolean),
      {
        clearProps:
          "transform,x,y,rotation,rotateX,transformOrigin,opacity,visibility,height,paddingTop,marginBottom,scale",
      },
    );
    tl.scrollTrigger?.kill();
    tl.kill();
  };
}

export default function Services() {
  const { t, tm, lang, dir } = useI18n();
  const reduced = useReducedMotion();
  const rootRef = useRef(null);
  const viewportRef = useRef(null);
  const sheetRef = useRef(null);
  const leftTrackRef = useRef(null);
  const rightTrackRef = useRef(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const viewport = viewportRef.current;
    const sheet = sheetRef.current;
    if (!root || !viewport || !sheet) return undefined;

    if (reduced) return undefined;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add(DESKTOP_QUERY, () =>
        buildSequence(
          root,
          viewport,
          sheet,
          leftTrackRef.current,
          rightTrackRef.current,
          "desktop",
        ),
      );
      mm.add(MOBILE_QUERY, () =>
        buildSequence(
          root,
          viewport,
          sheet,
          leftTrackRef.current,
          rightTrackRef.current,
          "mobile",
        ),
      );
    }, root);

    const refresh = () => ScrollTrigger.refresh();
    const onScroll = () => ScrollTrigger.update();
    let lastWidth = window.innerWidth;
    const onResize = () => {
      const width = window.innerWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      refresh();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    const fontsReady = document.fonts?.ready?.then(refresh);
    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(refresh);
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(raf);
      fontsReady?.catch?.(() => {});
      resetLeadSwap(viewport.querySelector(".services-headline__lead"));
      ctx.revert();
    };
  }, [reduced, lang, dir]);

  const titleWords = t("services.titleWords");
  const titleMark = t("services.titleMark");
  const titleLeadAlt = t("services.titleLeadAlt");
  const words = Array.isArray(titleWords) ? titleWords : [t("services.title")];
  const leadFrom = words[0] || "";
  const leadTo = typeof titleLeadAlt === "string" && titleLeadAlt ? titleLeadAlt : leadFrom;
  const fromChars = Array.from(leadFrom);
  const toChars = Array.from(leadTo);
  const exitWords = words.slice(1);
  const processCopy = tm("services.processSteps");
  const processSteps = PROCESS_STEPS.map((step, index) => ({
    ...step,
    title: processCopy?.[index]?.title || "",
    caption: processCopy?.[index]?.caption || "",
  }));
  const leftCards = SERVICE_CARDS.filter((item) => item.track === "left");
  const rightCards = SERVICE_CARDS.filter((item) => item.track === "right");

  return (
    <section
      ref={rootRef}
      id="services"
      className={`services-scroll${reduced ? " is-static" : ""}`}
      aria-labelledby="services-heading"
    >
      <div ref={viewportRef} className="services-viewport">
        <div ref={sheetRef} className="services-sheet">
          <h2 id="services-heading" className="services-headline">
            <span className="services-headline__sr">{t("services.title")}</span>
            <div className="process-stage" data-process="stage">
              <div className="process-stage__cluster" data-process="frame">
                <div className="process-stage__media">
                  {processSteps.map((step, index) => (
                    <img
                      key={step.key}
                      className="process-stage__img"
                      data-process-img={step.key}
                      src={step.src}
                      alt=""
                      width="1600"
                      height="1000"
                      decoding="async"
                      draggable="false"
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                  ))}
                </div>
              </div>
              <div className="process-stage__copy">
                {processSteps.map((step) => (
                  <div
                    key={`copy-${step.key}`}
                    className="process-stage__step"
                    data-process-copy={step.key}
                  >
                    <p className="process-stage__kicker">
                      <span>{step.num}</span>
                      <span aria-hidden="true"> — </span>
                      <span>{step.title}</span>
                    </p>
                    <p className="process-stage__caption">{step.caption}</p>
                  </div>
                ))}
              </div>
            </div>
            <span className="services-headline__visual" aria-hidden="true">
              <span className="services-headline__line" data-process="how">
                <span className="services-headline__lead">
                  <span className="services-headline__lead-sizer">{leadFrom}</span>
                  <span className="services-headline__lead-layers">
                    <span className="services-headline__lead-layer" data-lead="from">
                      {fromChars.map((char, charIndex) => (
                        <span key={`from-${charIndex}`} className="services-headline__lead-char">
                          {char}
                        </span>
                      ))}
                    </span>
                    <span className="services-headline__lead-layer" data-lead="to">
                      {toChars.map((char, charIndex) => (
                        <span key={`to-${charIndex}`} className="services-headline__lead-char">
                          {char}
                        </span>
                      ))}
                    </span>
                  </span>
                </span>
              </span>
              <span className="services-headline__exit" data-process="exit">
                {exitWords.map((word, index) => (
                  <span key={`${word}-${index}`} className="services-headline__line">
                    {word}
                    {index === exitWords.length - 1 ? (
                      <span className="services-headline__mark">{titleMark}</span>
                    ) : null}
                  </span>
                ))}
              </span>
            </span>
          </h2>
          {reduced ? (
            <div className="services-static">
              {SERVICE_CARDS.map((item) => (
                <ServiceCard key={`static-${item.key}`} item={item} t={t} />
              ))}
              <div className="process-static">
                {processSteps.map((step) => (
                  <figure key={`static-${step.key}`} className="process-static__item">
                    <img src={step.src} alt="" />
                    <figcaption>
                      <strong>
                        {step.num} — {step.title}
                      </strong>
                      <span>{step.caption}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {reduced ? null : (
          <>
            <div className="services-col services-col--left">
              <div ref={leftTrackRef} className="services-col__track">
                {leftCards.map((item) => (
                  <ServiceCard key={item.key} item={item} t={t} />
                ))}
              </div>
            </div>
            <div className="services-col services-col--right">
              <div ref={rightTrackRef} className="services-col__track services-col__track--offset">
                {rightCards.map((item) => (
                  <ServiceCard key={item.key} item={item} t={t} />
                ))}
              </div>
            </div>
          </>
        )}

        <ul className="services-sr">
          {SERVICE_CARD_KEYS.map((key) => (
            <li key={key}>{t(`services.cards.${key}.title`)}</li>
          ))}
          {processSteps.map((step) => (
            <li key={`sr-${step.key}`}>
              {step.num} — {step.title}. {step.caption}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
