import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { useLenis } from "lenis/react";
import { useI18n } from "../i18n/I18nContext";
import { PROJECTS, PROJECT_COUNT } from "../data/projects";
import "../styles/selected-work.css";

const TOTAL_PADDED = String(PROJECT_COUNT).padStart(2, "0");
const HEADING_SETTLE_MS = 3733;
const START_HOLD = 0.04;
const END_HOLD = 0.05;
const RISE_DESKTOP = 0.32;
const RISE_MOBILE = 0.18;

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

function buildLetterPlan(text, lineIndex) {
  const chars = Array.from(text);
  const rand = mulberry32(0xb7e20c19 + lineIndex * 7919);
  const letterIndexes = [];

  chars.forEach((ch, index) => {
    if (ch.trim() !== "") letterIndexes.push(index);
  });

  const order = [...letterIndexes];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const delayByIndex = new Map();
  order.forEach((charIndex, rank) => {
    delayByIndex.set(
      charIndex,
      (0.12 + rank * (0.1 + rand() * 0.07) + rand() * 0.22) / 1.5,
    );
  });

  return chars.map((ch, index) => {
    const isSpace = ch.trim() === "";
    return {
      ch,
      isSpace,
      delay: delayByIndex.get(index) ?? 0,
      dur: (isSpace ? 0.4 : 1.15 + rand() * 0.7) / 1.5,
      blur: isSpace ? 0 : 0.12 + rand() * 0.14,
    };
  });
}

function FocusLine({ text, lineIndex, active, reduced }) {
  const plan = useMemo(() => buildLetterPlan(text, lineIndex), [text, lineIndex]);

  if (reduced) {
    return <span className="selected-work__heading-line">{text}</span>;
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
            "--dur": `${letter.dur}s`,
            "--blur": `${letter.blur}em`,
          }}
        >
          {letter.ch}
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
  const pinnedRef = useRef(true);
  const activeRef = useRef(0);
  const reducedMotion = useReducedMotion();
  const { t, dir } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const [headingSettled, setHeadingSettled] = useState(false);

  const pinned = !reducedMotion;
  pinnedRef.current = pinned;

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

    const range = section.offsetHeight - window.innerHeight;
    const raw = range <= 1 ? 0 : clamp01(-section.getBoundingClientRect().top / range);
    const progress = clamp01((raw - START_HOLD) / (1 - START_HOLD - END_HOLD));
    const panelW = panels[0]?.offsetWidth || 0;
    const isMobile = window.innerWidth < 768;
    const visible = isMobile ? 1 : 2;
    const steps = Math.max(1, panels.length - visible);
    const peelUnits = Number.parseFloat(
      getComputedStyle(section).getPropertyValue("--work-peel"),
    );
    const peelDistance = Number.isFinite(peelUnits) && peelUnits > 0 ? peelUnits : 1.44;
    const travelled = progress * (steps + peelDistance);
    const camera = Math.min(travelled, steps);
    const peelRaw = travelled <= steps ? 0 : clamp01((travelled - steps) / peelDistance);
    const peelHold = 0.1;
    const peel =
      peelRaw <= peelHold ? 0 : clamp01((peelRaw - peelHold) / (1 - peelHold));
    const x = -camera * panelW;
    const next = `translate3d(${x.toFixed(2)}px, 0, 0)`;

    if (track.style.transform !== next) {
      track.style.transform = next;
    }

    const peelX = -peel * (stage.offsetWidth + 160);
    const blanketNext =
      peelX > -0.5 ? "translate3d(0, 0, 0)" : `translate3d(${peelX.toFixed(2)}px, 0, 0)`;
    if (blanket.style.transform !== blanketNext) {
      blanket.style.transform = blanketNext;
    }
    blanket.classList.toggle("is-off", peel >= 0.995);
    stage.classList.toggle("is-peeling", peel > 0.002 && peel < 0.995);

    const rise = (isMobile ? RISE_MOBILE : RISE_DESKTOP) * window.innerHeight;
    for (let i = 0; i < panels.length; i += 1) {
      const el = panels[i];
      const y = incomingAmount(i - camera, visible) * rise;
      const panelNext =
        y < 0.04 ? "translate3d(0, 0, 0)" : `translate3d(0, ${y.toFixed(2)}px, 0)`;
      if (el.style.transform !== panelNext) {
        el.style.transform = panelNext;
      }
    }

    const workProgress = steps <= 0 ? 1 : camera / steps;
    const nextIndex = Math.round(workProgress * (PROJECT_COUNT - 1));
    if (activeRef.current !== nextIndex) {
      activeRef.current = nextIndex;
      setActiveIndex(nextIndex);
    }
  };

  useLayoutEffect(() => {
    applyTrack();
  }, [pinned, dir]);

  useLenis(() => {
    applyTrack();
  });

  useEffect(() => {
    const stage = stageRef.current;
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!stage || !section || !track) return undefined;

    const onWin = () => applyTrack();
    window.addEventListener("scroll", onWin, { passive: true });
    window.addEventListener("resize", onWin);

    const io = new IntersectionObserver(
      ([entry]) => {
        stage.classList.toggle("is-near", entry.isIntersecting);
        if (entry.isIntersecting) applyTrack();
      },
      { rootMargin: "30% 0px" },
    );
    io.observe(stage);

    const ro = new ResizeObserver(applyTrack);
    ro.observe(section);
    ro.observe(stage);
    ro.observe(track);
    if (blanketRef.current) ro.observe(blanketRef.current);

    applyTrack();

    return () => {
      window.removeEventListener("scroll", onWin);
      window.removeEventListener("resize", onWin);
      io.disconnect();
      ro.disconnect();
      stage.classList.remove("is-near");
    };
  }, [pinned]);

  useEffect(() => {
    if (!headingInView || reducedMotion) {
      if (reducedMotion) setHeadingSettled(true);
      return undefined;
    }

    const id = window.setTimeout(() => setHeadingSettled(true), HEADING_SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [headingInView, reducedMotion]);

  const heading = `${t("work.headingLine1")} ${t("work.headingLine2")}`;
  const line1 = t("work.headingLine1");
  const line2 = t("work.headingLine2");

  return (
    <section
      ref={sectionRef}
      id="selected-work"
      className={`selected-work${pinned ? "" : " is-stacked"}${
        headingSettled ? " is-settled" : ""
      }`}
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
                      text={line1}
                      lineIndex={0}
                      active={headingActive || headingSettled}
                      reduced={reducedMotion}
                    />
                    <FocusLine
                      text={line2}
                      lineIndex={1}
                      active={headingActive || headingSettled}
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

      <span className="selected-work__sr-only" aria-live="polite">
        {padIndex(activeIndex)} / {TOTAL_PADDED}
      </span>
    </section>
  );
}
