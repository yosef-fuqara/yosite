import { useEffect, useRef, useState } from "react";

export const WORDS = ["THINK.", "FEEL.", "EXPLORE.", "SMILE.", "STAY."];

const INTERVAL_MS = 1800;

/** Repeating cycle: flip → cube → fall → magnetic → scan */
const MOTIONS = [
  { id: "flip", ms: 720, mode: "letters" },
  { id: "cube", ms: 800, property: "transform", target: "cube" },
  { id: "fall", ms: 780, mode: "letters" },
  { id: "magnetic", ms: 680, property: "transform", target: "next" },
  { id: "scan", ms: 760, property: "clip-path", target: "next" },
];

const FADE_MS = 280;

function renderWordText(word, useLetters) {
  if (!word) return null;
  const hasPeriod = word.endsWith(".");
  const text = hasPeriod ? word.slice(0, -1) : word;
  const chars = hasPeriod ? `${text}.` : text;

  if (useLetters) {
    return [...chars].map((char, index) => (
      <span
        key={`${word}-${index}`}
        className={`yo-hero__word-rotate-letter${
          char === "." ? " yo-hero__word-rotate-period" : ""
        }`}
        style={{ "--i": index }}
        aria-hidden="true"
      >
        {char}
      </span>
    ));
  }

  if (!hasPeriod) return word;

  return (
    <>
      {text}
      <span className="yo-hero__word-rotate-period" aria-hidden="true">
        .
      </span>
    </>
  );
}

export default function HeroRotatingWord({ heroRef, reducedMotion }) {
  const sceneRef = useRef(null);
  const cubeRef = useRef(null);
  const currentRef = useRef(null);
  const nextRef = useRef(null);
  const indexRef = useRef(0);
  const cycleRef = useRef(0);
  const motionRef = useRef(null);

  const [index, setIndex] = useState(0);
  const [motion, setMotion] = useState(null);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    motionRef.current = motion;
  }, [motion]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return undefined;

    const measure = () => {
      const height = scene.getBoundingClientRect().height;
      if (height > 0) scene.style.setProperty("--cube-half", `${height / 2}px`);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scene);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!motion || motion.run || motion.id === "fade") return undefined;

    let first = 0;
    let second = 0;
    first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        setMotion((current) => (current && !current.run ? { ...current, run: true } : current));
      });
    });

    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [motion]);

  useEffect(() => {
    if (!motion?.run && motion?.phase !== "out" && motion?.phase !== "in") return undefined;

    const ms = motion.id === "fade" ? FADE_MS : MOTIONS.find((item) => item.id === motion.id)?.ms;
    const token = motion;
    const timer = window.setTimeout(() => {
      if (motionRef.current !== token) return;
      if (token.id === "fade" && token.phase === "out") {
        setIndex(token.to);
        setMotion({ ...token, phase: "in" });
        return;
      }
      setIndex(token.to);
      setMotion(null);
    }, (ms ?? FADE_MS) + 90);

    return () => window.clearTimeout(timer);
  }, [motion]);

  useEffect(() => {
    const hero = heroRef?.current;
    if (!hero) return undefined;

    let cancelled = false;
    let timer = 0;
    let running = false;

    const step = () => {
      if (cancelled || motionRef.current) return;
      const to = (indexRef.current + 1) % WORDS.length;
      if (reducedMotion) {
        setMotion({ id: "fade", to, phase: "out" });
        return;
      }
      const next = MOTIONS[cycleRef.current % MOTIONS.length];
      cycleRef.current += 1;
      setMotion({ id: next.id, to, run: false });
    };

    const begin = () => {
      if (running || cancelled) return;
      running = true;
      timer = window.setInterval(step, INTERVAL_MS);
    };

    let observer;
    if (hero.dataset.entrance === "done") {
      begin();
    } else {
      observer = new MutationObserver(() => {
        if (hero.dataset.entrance === "done") {
          observer.disconnect();
          begin();
        }
      });
      observer.observe(hero, { attributes: true, attributeFilter: ["data-entrance"] });
    }

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      observer?.disconnect();
    };
  }, [heroRef, reducedMotion]);

  const finishSpatial = (event) => {
    const current = motionRef.current;
    if (!current?.run || current.id === "fade") return;
    const spec = MOTIONS.find((item) => item.id === current.id);
    if (spec?.mode === "letters") return;
    const target = spec?.target === "cube" ? cubeRef.current : nextRef.current;
    if (event.target !== target || event.propertyName !== spec.property) return;
    motionRef.current = null;
    setIndex(current.to);
    setMotion(null);
  };

  const finishFade = (event) => {
    const current = motionRef.current;
    if (!current || current.id !== "fade" || event.target !== currentRef.current) return;
    if (event.propertyName !== "opacity") return;
    if (current.phase === "out") {
      const next = { ...current, phase: "in" };
      motionRef.current = next;
      setIndex(current.to);
      setMotion(next);
      return;
    }
    if (current.phase === "in") {
      motionRef.current = null;
      setMotion(null);
    }
  };

  const useLetters = motion?.id === "flip" || motion?.id === "fall";
  const currentWord = WORDS[index];
  const nextWord = motion ? WORDS[motion.to] : "";

  const className = [
    "yo-hero__word-rotate",
    motion?.run ? "is-run" : "",
    motion?.phase === "out" ? "is-out" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={className}
      data-fx={motion?.id || undefined}
      aria-hidden="true"
    >
      <span className="yo-hero__word-rotate-sizer">
        {WORDS.map((word) => (
          <span key={word}>{word}</span>
        ))}
      </span>
      <span ref={sceneRef} className="yo-hero__word-rotate-scene">
        <span ref={cubeRef} className="yo-hero__word-rotate-cube" onTransitionEnd={finishSpatial}>
          <span ref={currentRef} className="yo-hero__word-rotate-panel is-current" onTransitionEnd={finishFade}>
            {renderWordText(currentWord, useLetters)}
          </span>
          <span ref={nextRef} className="yo-hero__word-rotate-panel is-next" onTransitionEnd={finishSpatial}>
            {renderWordText(nextWord, useLetters)}
          </span>
        </span>
      </span>
    </span>
  );
}
