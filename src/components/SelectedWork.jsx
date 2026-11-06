import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { useI18n } from "../i18n/I18nContext";
import { PROJECTS, PROJECT_COUNT } from "../data/projects";
import { isMobileViewport, snapTransformPx } from "../utils/mobileViewport";
import { pageTop } from "../utils/pageGeometry";
import { stableViewportHeight } from "../utils/stableViewport";
import "../styles/selected-work.css";

const TOTAL_PADDED = String(PROJECT_COUNT).padStart(2, "0");
const HEADING_STAGGER_SECONDS = 0.038;
const HEADING_SETTLE_BUFFER_MS = 160;
const START_HOLD = 0.04;
const END_HOLD = 0.05;
const RISE_DESKTOP = 0.32;
const PEEL_HOLD = 0.1;
/** Phone only: how far past the last project the white sheet keeps rising. */
const CURTAIN_PEEL = 1.08;

function sheetHem(progress) {
  const hang = Math.sin(Math.min(progress, 1) * Math.PI) * 26;
  if (hang < 1.5) return "";
  const h = hang.toFixed(1);
  const a = (hang * 0.72).toFixed(1);
  const b = (hang * 0.28).toFixed(1);
  return `polygon(0 0, 100% 0, 100% calc(100% - ${h}px), 84% calc(100% - ${a}px), 68% calc(100% - ${b}px), 50% 100%, 32% calc(100% - ${b}px), 16% calc(100% - ${a}px), 0 calc(100% - ${h}px))`;
}

function incomingAmount(slot, visible) {
  const incoming = slot - (visible - 1);
  if (incoming <= 0) return 0;
  if (incoming >= 1) return 1;
  return incoming;
}

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function padIndex(index) {
  return String(index + 1).padStart(2, "0");
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildHeadingPlan(lines) {
  const rand = mulberry32(0xb7e20c19);
  const letters = lines.map((text, lineIndex) =>
    Array.from(text).map((ch, charIndex) => ({
      ch,
      charIndex,
      lineIndex,
      isSpace: ch.trim() === "",
    })),
  );
  const order = letters.flat().filter((letter) => !letter.isSpace);

  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const rankByLetter = new Map();
  order.forEach((letter, rank) => {
    rankByLetter.set(`${letter.lineIndex}-${letter.charIndex}`, rank);
  });

  let latestEnd = 0;
  const plan = letters.map((line) =>
    line.map((letter) => {
      const rank = rankByLetter.get(`${letter.lineIndex}-${letter.charIndex}`) ?? 0;
      const delay = letter.isSpace ? 0 : rank * HEADING_STAGGER_SECONDS;
      const duration = letter.isSpace ? 0 : 0.5 + rand() * 0.16;
      const direction = rand() > 0.5 ? 1 : -1;
      const distance = 0.1 + rand() * 0.045;
      latestEnd = Math.max(latestEnd, delay + duration);

      return {
        ...letter,
        delay,
        duration,
        offset: `${(direction * distance).toFixed(3)}em`,
      };
    }),
  );

  return {
    lines: plan,
    settleMs: Math.ceil(latestEnd * 1000) + HEADING_SETTLE_BUFFER_MS,
  };
}

function FocusLine({ plan, lineIndex, active, reduced }) {
  if (reduced) {
    return (
      <span className="selected-work__heading-line">
        {plan.map((letter, index) =>
          letter.ch === "&" ? (
            <span key={`${lineIndex}-${index}-&`} className="selected-work__glyph--accent">
              &
            </span>
          ) : (
            letter.ch
          ),
        )}
      </span>
    );
  }

  return (
    <span className="selected-work__heading-line">
      {plan.map((letter, index) => (
        <span
          key={`${lineIndex}-${index}-${letter.ch}`}
          className={`selected-work__char${letter.isSpace ? " is-space" : ""}${
            active ? " is-in" : ""
          }`}
          style={{
            "--delay": `${letter.delay}s`,
            "--dur": `${letter.duration}s`,
            "--enter-x": letter.offset,
          }}
        >
          <span className="selected-work__char-motion">
            <span
            className={`selected-work__glyph${
              letter.ch === "&" ? " selected-work__glyph--accent" : ""
            }`}
          >
            {letter.ch}
          </span>
          </span>
        </span>
      ))}
    </span>
  );
}

function ProjectPanel({ project, title, description, index, dir }) {
  const hasImage = Boolean(project.image);

  return (
    <article
      className="selected-work__panel selected-work__panel--project"
      aria-label={title}
      data-project-index={index}
      dir={dir}
    >
      <div className="selected-work__frame">
        {hasImage ? (
          <img
            src={project.image}
            alt={title}
            className="selected-work__img"
            sizes="(max-width: 767px) 100vw, 50vw"
            loading={index === 0 ? "eager" : "lazy"}
            decoding="async"
            draggable="false"
          />
        ) : null}
      </div>

      <div className="selected-work__meta">
        <span className="selected-work__index" aria-hidden="true">
          {padIndex(index)}
          <span className="selected-work__index-total"> / {TOTAL_PADDED}</span>
        </span>
        <h3 className="selected-work__title">{title}</h3>
        <p className="selected-work__desc">{description}</p>
      </div>
    </article>
  );
}

export default function SelectedWork() {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const blanketRef = useRef(null);
  const trackRef = useRef(null);
  const headingRef = useRef(null);
  const liveRef = useRef(null);
  const pinnedRef = useRef(true);
  const activeRef = useRef(0);
  const scrollRafRef = useRef(0);
  const metricsRef = useRef({
    top: 0,
    height: 0,
    width: 0,
    vh: 0,
    panelW: 0,
    stageW: 0,
    isMobile: false,
    peelDistance: 1.44,
    scrollY: 0,
  });
  const pageWidthRef = useRef(typeof window === "undefined" ? 0 : window.innerWidth);
  const reducedMotion = useReducedMotion();
  const { t, dir } = useI18n();
  const [headingSettled, setHeadingSettled] = useState(false);
  const [mobileLayout, setMobileLayout] = useState(() =>
    typeof window !== "undefined" ? isMobileViewport() : false,
  );

  /** Desktop: pinned horizontal reel. Phone: vertical stack, then the stack rises like a sheet. */
  const pinned = !reducedMotion && !mobileLayout;
  const curtain = mobileLayout && !reducedMotion;

  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setMobileLayout(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const headingInView = useInView(headingRef, { amount: 0.4, once: true });
  const headingActive = Boolean(headingInView && !reducedMotion);

  const applyTrack = () => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const blanket = blanketRef.current;
    const track = trackRef.current;
    if (!section || !stage || !blanket || !track) return;

    const panels = track.children;

    if (!pinnedRef.current) {
      if (track.style.transform) track.style.transform = "translate3d(0, 0, 0)";
      if (blanket.style.transform) blanket.style.transform = "translate3d(0, 0, 0)";
      blanket.classList.remove("is-off");
      stage.classList.remove("is-peeling");
      for (let i = 0; i < panels.length; i += 1) {
        const el = panels[i];
        if (el.style.transform) el.style.transform = "translate3d(0, 0, 0)";
      }
      return;
    }

    const { top, height, vh, panelW, stageW, isMobile, peelDistance, scrollY } =
      metricsRef.current;
    const range = height - vh;
    const raw = range <= 1 ? 0 : clamp01((scrollY - top) / range);
    const progress = clamp01((raw - START_HOLD) / (1 - START_HOLD - END_HOLD));
    const visible = isMobile ? 1 : 2;
    const steps = Math.max(1, panels.length - visible);
    const travelled = progress * (steps + peelDistance);
    const camera = Math.min(travelled, steps);
    const peelRaw = travelled <= steps ? 0 : clamp01((travelled - steps) / peelDistance);
    const peel =
      peelRaw <= PEEL_HOLD ? 0 : clamp01((peelRaw - PEEL_HOLD) / (1 - PEEL_HOLD));

    blanket.classList.toggle("is-off", peel >= 0.995);
    stage.classList.toggle("is-peeling", peel > 0.002 && peel < 0.995);
    syncActiveIndex(steps <= 0 ? 1 : camera / steps);

    const x = isMobile ? -snapTransformPx(camera * panelW) : -camera * panelW;
    const next = isMobile
      ? `translate3d(${x}px, 0, 0)`
      : `translate3d(${x.toFixed(2)}px, 0, 0)`;

    if (track.style.transform !== next) {
      track.style.transform = next;
    }

    const peelX = isMobile
      ? -snapTransformPx(peel * (stageW + 160))
      : -peel * (stageW + 160);
    const blanketNext =
      peelX > -0.5
        ? "translate3d(0, 0, 0)"
        : isMobile
          ? `translate3d(${peelX}px, 0, 0)`
          : `translate3d(${peelX.toFixed(2)}px, 0, 0)`;
    if (blanket.style.transform !== blanketNext) {
      blanket.style.transform = blanketNext;
    }

    const rise = isMobile ? 0 : RISE_DESKTOP * vh;
    for (let i = 0; i < panels.length; i += 1) {
      const el = panels[i];
      const y = incomingAmount(i - camera, visible) * rise;
      const yPx = isMobile ? snapTransformPx(y) : y;
      const panelNext =
        yPx < 1
          ? "translate3d(0, 0, 0)"
          : isMobile
            ? `translate3d(0, ${yPx}px, 0)`
            : `translate3d(0, ${y.toFixed(2)}px, 0)`;
      if (el.style.transform !== panelNext) {
        el.style.transform = panelNext;
      }
    }
  };

  const syncActiveIndex = (workProgress) => {
    const nextIndex = Math.round(workProgress * (PROJECT_COUNT - 1));
    if (activeRef.current !== nextIndex) {
      activeRef.current = nextIndex;
      if (liveRef.current) {
        liveRef.current.textContent = `${padIndex(nextIndex)} / ${TOTAL_PADDED}`;
      }
    }
  };

  // Layout reads stay out of the scroll path so each scroll frame only reads scrollY.
  const measureSection = () => {
    const section = sectionRef.current;
    if (!section) return;
    const metrics = metricsRef.current;
    const isMobile = window.innerWidth < 768;
    const peelUnits = Number.parseFloat(
      getComputedStyle(section).getPropertyValue("--work-peel"),
    );
    metrics.top = pageTop(section);
    metrics.height = section.offsetHeight;
    metrics.width = section.offsetWidth;
    metrics.isMobile = isMobile;
    metrics.vh = isMobile ? stableViewportHeight() : window.innerHeight;
    metrics.panelW = trackRef.current?.children[0]?.offsetWidth || 0;
    metrics.stageW = stageRef.current?.offsetWidth || 0;
    metrics.peelDistance = Number.isFinite(peelUnits) && peelUnits > 0 ? peelUnits : 1.44;
    metrics.scrollY = window.scrollY;
  };

  useLayoutEffect(() => {
    pinnedRef.current = pinned;
    measureSection();
    applyTrack();
  }, [pinned, dir]);

  useEffect(() => {
    if (!pinned) return undefined;

    const stage = stageRef.current;
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!stage || !section || !track) return undefined;

    const scheduleTrack = () => {
      if (scrollRafRef.current) return;
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = 0;
        metricsRef.current.scrollY = window.scrollY;
        applyTrack();
      });
    };
    const onResize = () => {
      const width = window.innerWidth;
      if (width < 768 && Math.abs(width - pageWidthRef.current) <= 1) return;
      pageWidthRef.current = width;
      measureSection();
      applyTrack();
    };
    window.addEventListener("scroll", scheduleTrack, { passive: true });
    window.addEventListener("resize", onResize);

    const io = new IntersectionObserver(
      ([entry]) => {
        stage.classList.toggle("is-near", entry.isIntersecting);
        if (entry.isIntersecting) {
          measureSection();
          applyTrack();
        }
      },
      { rootMargin: "30% 0px" },
    );
    io.observe(stage);

    // Sizes are frozen px on phones, so re-measuring here never follows the toolbar.
    // The body is observed because content above can move the section's top.
    const ro = new ResizeObserver(() => {
      if (isMobileViewport() && Math.abs(section.offsetWidth - metricsRef.current.width) <= 1) {
        return;
      }
      measureSection();
      applyTrack();
    });
    ro.observe(section);
    if (!isMobileViewport()) {
      ro.observe(stage);
      ro.observe(track);
      if (blanketRef.current) ro.observe(blanketRef.current);
    }

    measureSection();
    applyTrack();

    return () => {
      window.removeEventListener("scroll", scheduleTrack);
      window.removeEventListener("resize", onResize);
      if (scrollRafRef.current) window.cancelAnimationFrame(scrollRafRef.current);
      io.disconnect();
      ro.disconnect();
      stage.classList.remove("is-near");
    };
  }, [pinned]);

  // After the last project, the white stack sticks and lifts off like a bedsheet.
  // Services are already composed underneath: cards up top, sentence at the bottom.
  useEffect(() => {
    if (!curtain) return undefined;

    const section = sectionRef.current;
    const stage = stageRef.current;
    const blanket = blanketRef.current;
    if (!section || !stage || !blanket) return undefined;

    let raf = 0;
    const metrics = { stageH: 0, stickStart: 0, peelPx: 1, vh: 1 };

    const measure = () => {
      const vh = stableViewportHeight();
      const stageH = blanket.offsetHeight;
      const peelUnits = Number.parseFloat(
        getComputedStyle(section).getPropertyValue("--work-peel"),
      );
      const peel = Number.isFinite(peelUnits) && peelUnits > 0 ? peelUnits : CURTAIN_PEEL;
      metrics.vh = vh;
      metrics.stageH = stageH;
      metrics.peelPx = peel * vh;
      metrics.stickStart = pageTop(section) + stageH - vh;
    };

    const releaseSheet = () => {
      section.classList.remove("is-lift-hold");
      section.style.removeProperty("--work-hold");
      section.style.removeProperty("--work-sheet-h");
      blanket.style.transform = "";
      blanket.style.clipPath = "";
    };

    const apply = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const p =
        metrics.peelPx <= 1 ? 0 : clamp01((scrollY - metrics.stickStart) / metrics.peelPx);

      if (p <= 0 || p >= 0.995) {
        releaseSheet();
        stage.classList.toggle("is-off", p >= 0.995);
        stage.classList.remove("is-peeling");
        return;
      }

      section.classList.add("is-lift-hold");
      section.style.setProperty("--work-hold", `${metrics.stageH}px`);
      section.style.setProperty("--work-sheet-h", `${metrics.vh}px`);
      stage.classList.add("is-peeling");
      stage.classList.remove("is-off");

      // Freeze the screen that was showing, then lift that slice. Content
      // above the fold stays clipped instead of scrolling in.
      const base = Math.max(0, metrics.stageH - metrics.vh);
      const y = snapTransformPx(base + p * (metrics.vh + 28));
      const next = `translate3d(0, ${-y}px, 0)`;
      if (blanket.style.transform !== next) blanket.style.transform = next;

      const hem = sheetHem(p);
      if ((blanket.style.clipPath || "") !== hem) blanket.style.clipPath = hem;
    };

    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        apply();
      });
    };

    const onResize = () => {
      if (Math.abs(window.innerWidth - pageWidthRef.current) > 1) {
        pageWidthRef.current = window.innerWidth;
      }
      measure();
      apply();
    };

    measure();
    apply();

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(blanket);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
      section.classList.remove("is-lift-hold");
      section.style.removeProperty("--work-hold");
      section.style.removeProperty("--work-sheet-h");
      stage.classList.remove("is-off", "is-peeling");
      blanket.style.transform = "";
      blanket.style.clipPath = "";
    };
  }, [curtain]);

  const heading = `${t("work.headingLine1")} ${t("work.headingLine2")}`;
  const line1 = t("work.headingLine1");
  const line2 = t("work.headingLine2");
  const headingPlan = useMemo(() => buildHeadingPlan([line1, line2]), [line1, line2]);

  useEffect(() => {
    if (!headingInView || reducedMotion) return undefined;

    const id = window.setTimeout(
      () => setHeadingSettled(true),
      headingPlan.settleMs,
    );
    return () => window.clearTimeout(id);
  }, [headingInView, headingPlan.settleMs, reducedMotion]);

  const headingIsSettled = headingSettled || reducedMotion;

  return (
    <section
      ref={sectionRef}
      id="selected-work"
      className={`selected-work${pinned ? "" : " is-stacked"}${
        curtain ? " is-curtain" : ""
      }${headingIsSettled ? " is-settled" : ""}`}
      aria-labelledby="selected-work-heading"
    >
      <div ref={stageRef} className="selected-work__stage">
        <div className="selected-work__underlayer" aria-hidden="true" />

        <div ref={blanketRef} className="selected-work__blanket">
          <div ref={trackRef} className="selected-work__track" dir="ltr">
            <header className="selected-work__panel selected-work__panel--intro" dir={dir}>
              <div className="selected-work__intro-body">
                <h2
                  id="selected-work-heading"
                  ref={headingRef}
                  className="selected-work__heading"
                >
                  <span className="selected-work__sr-only">{heading}</span>
                  <span className="selected-work__heading-visual" aria-hidden="true">
                    <FocusLine
                      plan={headingPlan.lines[0]}
                      lineIndex={0}
                      active={headingActive || headingIsSettled}
                      reduced={reducedMotion}
                    />
                    <FocusLine
                      plan={headingPlan.lines[1]}
                      lineIndex={1}
                      active={headingActive || headingIsSettled}
                      reduced={reducedMotion}
                    />
                  </span>
                </h2>
              </div>
              <div className="selected-work__intro-foot" aria-hidden="true" />
            </header>

            {PROJECTS.map((project, index) => (
              <ProjectPanel
                key={project.id}
                project={project}
                title={t(`work.projects.${project.id}.title`)}
                description={t(`work.projects.${project.id}.description`)}
                index={index}
                dir={dir}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="selected-work__lift" aria-hidden="true" />

      <span ref={liveRef} className="selected-work__sr-only" aria-live="polite">
        {padIndex(0)} / {TOTAL_PADDED}
      </span>
    </section>
  );
}
