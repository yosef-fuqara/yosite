import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import IntroModel from "./IntroModel";
import {
  markHeroMarksReady,
  markPageIntroComplete,
  markPageIntroReady,
  markStickyChromeReady,
} from "../utils/pageIntroGate";
import {
  INTRO_ENTRANCE,
  INTRO_HANDOFF,
  INTRO_HANDOFF_SIZE,
  INTRO_LOAD_TIMEOUT_MS,
  INTRO_PULSE,
  INTRO_RISE_IN,
  hasWebGL,
  introHandoffAt,
  measureIntroHandoff,
  prefersReducedMotion,
} from "../utils/introModel";
import { setInvertIntroMaterials } from "../utils/introSequence";
import "../styles/page-intro.css";

const LOCK_CLASS = "yo-intro-locked";
const ACTIVE_CLASS = "yo-intro-active";
const PENDING_CLASS = "yo-intro-pending";
const LIGHT_CLASS = "yo-intro-light";
const LOGO_LIVE_CLASS = "yo-intro-logo-live";
const STICKY_LIVE_CLASS = "yo-intro-sticky-live";
const NAV_LIVE_CLASS = "yo-intro-nav-live";
const HANDOFF_CLASS = "yo-intro-handoff";
const NAV_CHROME_DUR = 0.92;

const TIMING = {
  PULSE: INTRO_PULSE,
  LOGO: INTRO_HANDOFF,
  CURTAIN_AT: 0.1,
  /** White sheet rising over the black field — GSAP duration (seconds). */
  CURTAIN: 0.92,
  /* ~80% through the logo rise (LOGO = 0.82), before the object lead. */
  UI_AT: 0.66,
  REDUCED_HOLD: 0.2,
  REDUCED_EXIT: 0.36,
};

/** Hero, nav, and side chrome keep their motion and start this much sooner.
 *  The rise eases out, so a short clock lead still lands the logo.
 *  Larger value = peripheral UI (year, rail, audio, nav) enters earlier vs the handoff/closing beat. */
const OBJECTS_LEAD = 0.78;

const PULSE_EASE = "power2.out";
const HANDOFF_EASE = "power3.out";
const EXIT_EASE = "power2.inOut";

/** Survives Strict Mode remounts so the sequence plays once per load. */
let introPlayed = false;
let navChromePlayed = false;
let navChromeParked = false;

function hasDeepLink() {
  const hash = window.location.hash;
  return Boolean(hash) && hash !== "#" && hash !== "#top";
}

function removeBoot() {
  document.getElementById("yo-intro-boot")?.remove();
  document.documentElement.classList.remove(PENDING_CLASS);
}

function nextFrame(signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }

    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(resolve);
    });

    signal?.addEventListener(
      "abort",
      () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
        resolve();
      },
      { once: true },
    );
  });
}

function logoTarget() {
  return document.querySelector("[data-intro-logo-target]");
}

function readStageScale(stage) {
  const raw = getComputedStyle(stage).transform;
  if (!raw || raw === "none") return Number(gsap.getProperty(stage, "scale")) || 1;
  const matrix = new DOMMatrix(raw);
  return Math.hypot(matrix.a, matrix.b) || 1;
}

function readTranslateY(el) {
  const raw = getComputedStyle(el).transform;
  if (!raw || raw === "none") return 0;
  return new DOMMatrix(raw).f || 0;
}

function placeParkedStage(stage, scale) {
  const baseW = Number(stage.dataset.baseWidth);
  const baseH = Number(stage.dataset.baseHeight);
  const parkScale = Number(stage.dataset.parkScale) || scale;
  const shiftX = Number(stage.dataset.markShiftX) || 0;
  const shiftY = Number(stage.dataset.markShiftY) || 0;
  const w = Math.max(1, Math.round(baseW * scale));
  const h = Math.max(1, Math.round(baseH * scale));
  const grow = parkScale ? scale / parkScale : 1;
  const target = logoTarget();
  if (target) {
    const chrome = target.closest(".yo-sticky-chrome");
    const headerShift = chrome ? readTranslateY(chrome) : 0;
    const rect = target.getBoundingClientRect();
    stage.style.setProperty("left", `${rect.left + rect.width / 2}px`, "important");
    stage.style.setProperty("top", `${rect.top + rect.height / 2 - headerShift}px`, "important");
  }
  stage.style.setProperty("width", `${w}px`, "important");
  stage.style.setProperty("height", `${h}px`, "important");
  stage.style.setProperty("margin-left", `${-Math.round(w / 2 + shiftX * grow)}px`, "important");
  stage.style.setProperty("margin-top", `${-Math.round(h / 2 + shiftY * grow)}px`, "important");
}

const RISE_ENTRANCE = INTRO_ENTRANCE === "rise";

/** Push the centered mark fully below the viewport before it rises. */
function offscreenRiseY() {
  const vmin = Math.min(window.innerWidth, window.innerHeight);
  const mark = Math.min(Math.max(vmin * 0.3, 160), 260);
  return Math.round(window.innerHeight * 0.5 + mark * 0.7 + 80);
}

function navChrome() {
  return [".yo-menu-trigger", ".yo-lang", ".yo-nav__contact-link"]
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);
}

function resetNavChrome() {
  const items = navChrome();
  if (!items.length) return;
  gsap.killTweensOf(items);
  gsap.set(items, {
    clearProps: "transform,opacity,visibility,y,x,yPercent,pointerEvents",
  });
}

function parkNavChrome() {
  const items = navChrome();
  if (!items.length) return;
  gsap.killTweensOf(items);
  gsap.set(items, {
    yPercent: 0,
    y: -18,
    opacity: 0,
    pointerEvents: "none",
    force3D: true,
  });
}

export default function PageIntro() {
  const rootRef = useRef(null);
  const startPlaybackRef = useRef(null);
  const failPlaybackRef = useRef(null);
  const boundsApiRef = useRef(null);
  const stageHostRef = useRef(null);
  if (stageHostRef.current == null) {
    const el = document.createElement("div");
    el.className = "yo-intro__stage";
    el.setAttribute("data-intro-stage", "");
    stageHostRef.current = el;
  }
  const [mounted, setMounted] = useState(() => !introPlayed);
  const [useModel, setUseModel] = useState(false);
  const [playing, setPlaying] = useState(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const html = document.documentElement;
    const pageRoot = document.getElementById("root");
    let completed = false;
    let started = false;
    let tl = null;
    let cancelled = false;
    let loadTimer = 0;
    const abort = new AbortController();
    const { signal } = abort;
    const curtain = root.querySelector("[data-intro-curtain]");
    const stage = stageHostRef.current;
    const logoMount = root.querySelector("[data-intro-logo]");
    if (
      stage &&
      logoMount &&
      stage.dataset.parked !== "true" &&
      stage.parentElement !== logoMount
    ) {
      logoMount.appendChild(stage);
    }
    let handoffLive = false;
    let parkObserver = null;

    const syncParkedStage = () => {
      if (!stage || stage.dataset.parked !== "true") return;
      const target = logoTarget();
      const markH = Number(stage.dataset.markHeight);
      if (!target || !markH) return;
      const targetH = target.getBoundingClientRect().height;
      if (targetH < 1) return;
      const scale = Math.min(
        Math.max((targetH / markH) * INTRO_HANDOFF_SIZE, 0.04),
        1,
      );
      placeParkedStage(stage, scale);
    };

    const adoptStageIntoNav = () => {
      if (!stage || stage.dataset.parked === "true") return true;
      const target = logoTarget();
      if (!target) return false;
      const scale = readStageScale(stage);
      if (scale > 0.92) return false;

      const baseW = stage.offsetWidth || window.innerWidth;
      const baseH = stage.offsetHeight || window.innerHeight;
      const visual = boundsApiRef.current?.();
      const stageRect = stage.getBoundingClientRect();
      const markH = visual?.height ? visual.height / scale : baseH * 0.28;
      const markCx = visual ? visual.left + visual.width / 2 : stageRect.left + stageRect.width / 2;
      const markCy = visual ? visual.top + visual.height / 2 : stageRect.top + stageRect.height / 2;
      const shiftX = markCx - (stageRect.left + stageRect.width / 2);
      const shiftY = markCy - (stageRect.top + stageRect.height / 2);

      gsap.killTweensOf(stage);
      stage.dataset.parked = "true";
      stage.dataset.baseWidth = String(baseW);
      stage.dataset.baseHeight = String(baseH);
      stage.dataset.markHeight = String(markH);
      stage.dataset.markShiftX = String(shiftX);
      stage.dataset.markShiftY = String(shiftY);
      stage.dataset.parkScale = String(scale);
      stage.classList.add("is-parked");
      placeParkedStage(stage, scale);
      document.body.appendChild(stage);
      root.dataset.parked = "true";
      handoffLive = true;

      parkObserver?.disconnect();
      parkObserver = new ResizeObserver(syncParkedStage);
      parkObserver.observe(target);
      return true;
    };

    const parkLogo = () => {
      setInvertIntroMaterials(RISE_ENTRANCE);
      if (stage && stage.dataset.parked !== "true") {
        gsap.set(stage, {
          filter: RISE_ENTRANCE ? "none" : "brightness(0)",
          mixBlendMode: "normal",
          lazy: false,
        });
      }
      html.classList.add(LOGO_LIVE_CLASS);
    };

    const revealHeroLayer = () => {
      parkLogo();
      gsap.set(root, { backgroundColor: "transparent" });
      if (curtain) gsap.set(curtain, { autoAlpha: 0, pointerEvents: "none" });
      root.dataset.state = "done";
      html.classList.add(STICKY_LIVE_CLASS, LIGHT_CLASS);
      html.classList.remove(LOCK_CLASS);
      pageRoot?.removeAttribute("inert");
    };

    const finish = ({ keepLogo = false } = {}) => {
      if (completed) return;
      completed = true;
      started = true;
      introPlayed = true;
      window.clearTimeout(loadTimer);
      html.classList.remove(ACTIVE_CLASS, PENDING_CLASS);
      html.classList.add(LIGHT_CLASS);
      if (!keepLogo) {
        html.classList.remove(HANDOFF_CLASS);
        root.dataset.handoff = "false";
        if (stage) gsap.set(stage, { autoAlpha: 0 });
      } else {
        parkLogo();
        html.classList.add(LOGO_LIVE_CLASS);
      }
      if (curtain) gsap.set(curtain, { autoAlpha: 0, pointerEvents: "none" });
      root.dataset.state = "done";
      html.classList.remove(LOCK_CLASS);
      html.classList.add(STICKY_LIVE_CLASS, NAV_LIVE_CLASS);
      pageRoot?.removeAttribute("inert");
      removeBoot();
      markStickyChromeReady();
      markPageIntroReady();
      if (!keepLogo || handoffLive) markPageIntroComplete();
      if (!navChromePlayed) {
        navChromePlayed = true;
        resetNavChrome();
      }
    };

    const skip = introPlayed || hasDeepLink();
    if (skip) {
      finish();
      markHeroMarksReady();
      return undefined;
    }

    html.classList.add(LOCK_CLASS, ACTIVE_CLASS);
    pageRoot?.setAttribute("inert", "");
    parkNavChrome();
    removeBoot();

    if (!curtain) {
      finish();
      return undefined;
    }

    const ctx = gsap.context(() => {}, root);
    const reduced = prefersReducedMotion();
    const webgl = hasWebGL();

    gsap.set(curtain, {
      x: 0,
      xPercent: 0,
      y: 0,
      yPercent: reduced || !webgl || RISE_ENTRANCE ? 0 : 100,
      opacity: 1,
      force3D: true,
    });
      if (stage) {
        gsap.set(stage, {
          opacity: 0,
          x: 0,
          y: 0,
          scale: 1,
          transformOrigin: "50% 50%",
          force3D: true,
        });
      }

    const lightOn = () => {
      html.classList.add(LIGHT_CLASS);
    };

    const cueHeroUi = () => {
      html.classList.add(STICKY_LIVE_CLASS);
      markStickyChromeReady();
      markPageIntroReady();
    };

    const revealNavChrome = () => {
      if (navChromePlayed) return;
      navChromePlayed = true;
      const items = navChrome();
      html.classList.add(STICKY_LIVE_CLASS, NAV_LIVE_CLASS);

      if (!items.length) return;

      if (reduced) {
        gsap.set(items, {
          clearProps: "transform,opacity,visibility,y,x,yPercent,pointerEvents",
        });
        return;
      }

      gsap.killTweensOf(items);
      gsap.set(items, {
        yPercent: 0,
        y: -18,
        opacity: 0,
        pointerEvents: "none",
        force3D: true,
      });
      gsap.to(items, {
        y: 0,
        opacity: 1,
        duration: NAV_CHROME_DUR,
        ease: "power2.out",
        overwrite: true,
        onComplete: () => {
          gsap.set(items, {
            pointerEvents: "auto",
            clearProps: "transform,opacity,y,yPercent",
          });
        },
      });
    };

    const playReducedExit = () => {
      if (cancelled || completed || started) return;
      started = true;
      window.clearTimeout(loadTimer);
      setUseModel(false);
      setPlaying(false);
      if (stage) gsap.set(stage, { opacity: 0 });
      if (RISE_ENTRANCE) {
        gsap.set(curtain, { y: 0, yPercent: 0, opacity: 1, force3D: true });
        tl?.kill();
        tl = gsap.timeline({ onComplete: () => finish({ keepLogo: false }) });
        tl.add(lightOn, TIMING.REDUCED_HOLD);
        tl.to(
          root,
          { backgroundColor: "transparent", duration: TIMING.REDUCED_EXIT, ease: EXIT_EASE },
          TIMING.REDUCED_HOLD,
        );
        tl.to(
          curtain,
          { opacity: 0, duration: TIMING.REDUCED_EXIT, ease: EXIT_EASE },
          TIMING.REDUCED_HOLD,
        );
        return;
      }
      gsap.set(curtain, { y: 0, yPercent: 0, opacity: 0, force3D: true });
      tl?.kill();
      tl = gsap.timeline({ onComplete: () => finish({ keepLogo: false }) });
      tl.add(lightOn, TIMING.REDUCED_HOLD);
      tl.to(
        curtain,
        {
          opacity: 1,
          duration: TIMING.REDUCED_EXIT,
          ease: EXIT_EASE,
        },
        TIMING.REDUCED_HOLD,
      );
    };

    const readHandoff = () =>
      measureIntroHandoff(boundsApiRef.current?.(), logoTarget(), stage);

    const applyHandoffPose = () => {
      if (!stage) return;
      /* Already parked — do not remasure or the mark jumps / resizes. */
      if (handoffLive) return;
      const prevY = Number(gsap.getProperty(stage, "y")) || 0;
      const prevX = Number(gsap.getProperty(stage, "x")) || 0;
      const prevScale = Number(gsap.getProperty(stage, "scale")) || 1;
      const prevVis = stage.style.visibility;
      stage.style.visibility = "hidden";
      gsap.set(stage, {
        x: 0,
        y: 0,
        scale: 1,
        transformOrigin: "50% 50%",
        force3D: true,
        lazy: false,
      });
      const handoff = readHandoff();
      const nextX = handoff?.x ?? prevX;
      const nextY = handoff?.y ?? prevY;
      const nextScale = handoff?.scale ?? prevScale;
      const settled =
        Math.abs(nextX - prevX) < 0.5 &&
        Math.abs(nextY - prevY) < 0.5 &&
        Math.abs(nextScale - prevScale) < 0.002;
      gsap.set(stage, {
        x: settled ? prevX : nextX,
        y: settled ? prevY : nextY,
        scale: settled ? prevScale : nextScale,
        force3D: true,
        lazy: false,
      });
      stage.style.visibility = prevVis;
    };

    const syncHandoffPose = () => {
      if (!stage || !handoffLive || RISE_ENTRANCE) return;
      applyHandoffPose();
    };

    const featherPx = () => {
      const raw = getComputedStyle(root).getPropertyValue("--yo-intro-feather").trim();
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const value = Number.parseFloat(raw);
      if (!Number.isFinite(value)) return 7.5 * rem;
      return raw.endsWith("rem") ? value * rem : value;
    };

    /** Logo stays white on the black field, then inks once the field has passed it. */
    const inkWhenVeilPasses = () => {
      const mark = boundsApiRef.current?.();
      if (!mark || !curtain) return;
      const solidEdge = curtain.getBoundingClientRect().bottom - featherPx();
      const flipLine = mark.top + mark.height * 0.68;
      if (flipLine > solidEdge) setInvertIntroMaterials(true);
    };

    const playRiseSequence = async () => {
      if (stage) {
        gsap.set(stage, {
          opacity: 0,
          x: 0,
          y: 0,
          scale: 1,
          transformOrigin: "50% 50%",
          force3D: true,
        });
      }
      gsap.set(curtain, {
        x: 0,
        xPercent: 0,
        y: 0,
        yPercent: 0,
        opacity: 1,
        force3D: true,
      });

      let previous = null;
      let mark = null;
      for (let i = 0; i < 24; i += 1) {
        if (cancelled || signal.aborted) return;
        const next = boundsApiRef.current?.();
        if (
          next &&
          previous &&
          next.width > 8 &&
          Math.abs(next.left - previous.left) < 0.5 &&
          Math.abs(next.width - previous.width) < 0.5
        ) {
          mark = next;
          break;
        }
        previous = next;
        await nextFrame(signal);
      }
      if (cancelled || completed || !root.isConnected) return;
      mark = mark || boundsApiRef.current?.() || null;

      const stageRect = stage?.getBoundingClientRect();
      let origin = "50% 50%";
      if (mark && stageRect && stageRect.width > 1 && stageRect.height > 1) {
        const ox = ((mark.left + mark.width / 2 - stageRect.left) / stageRect.width) * 100;
        const oy = ((mark.top + mark.height / 2 - stageRect.top) / stageRect.height) * 100;
        origin = `${ox}% ${oy}%`;
      }

      const targetRect = logoTarget()?.getBoundingClientRect();
      const markCx = mark ? mark.left + mark.width / 2 : window.innerWidth / 2;
      const toCx =
        targetRect && targetRect.width > 1
          ? targetRect.left + targetRect.width / 2
          : window.innerWidth / 2;
      const lockX = toCx - markCx;

      let destY = -(window.innerHeight * 0.5 - 40);
      let destScale = 0.09;
      if (mark && targetRect && targetRect.height > 1 && mark.height > 1) {
        const markCy = mark.top + mark.height / 2;
        const toCy = targetRect.top + targetRect.height / 2;
        destScale = Math.min(
          Math.max((targetRect.height / mark.height) * INTRO_HANDOFF_SIZE, 0.04),
          1,
        );
        destY = toCy - markCy;
        const visualTop = markCy + destY - (mark.height * destScale) / 2;
        if (visualTop < 8) destY += 8 - visualTop;
      }

      const startY = mark
        ? Math.round(window.innerHeight * 0.5 + mark.height * 0.55 + 36)
        : offscreenRiseY();

      if (stage) {
        gsap.set(stage, {
          opacity: 1,
          x: lockX,
          y: startY,
          scale: 1,
          transformOrigin: origin,
          force3D: true,
        });
      }

      const handoffAt = introHandoffAt();
      const handoffDur = TIMING.LOGO;
      const veilDelay = 0.08;
      const veilAt = handoffAt + veilDelay;

      const beginLift = () => {
        if (cancelled) return;
        lightOn();
        html.classList.add(LOGO_LIVE_CLASS);
        gsap.set(root, { backgroundColor: "transparent" });
      };

      tl?.kill();
      tl = gsap.timeline();
      if (stage) {
        tl.to(
          stage,
          {
            y: 0,
            duration: INTRO_RISE_IN,
            ease: "power3.out",
            force3D: true,
            overwrite: false,
          },
          0,
        );
        tl.to(
          stage,
          {
            y: destY,
            scale: destScale,
            duration: handoffDur,
            ease: "power2.inOut",
            force3D: true,
            overwrite: false,
          },
          handoffAt,
        );
      }
      tl.add(beginLift, handoffAt);
      tl.to(
        curtain,
        {
          yPercent: -100,
          duration: handoffDur,
          ease: "power2.inOut",
          force3D: true,
          onUpdate: inkWhenVeilPasses,
        },
        veilAt,
      );
      tl.add(() => {
        if (cancelled) return;
        cueHeroUi();
        markPageIntroComplete();
      }, veilAt + handoffDur * 0.4);
      tl.add(revealNavChrome, veilAt + handoffDur * 0.66);
      tl.add(() => {
        if (cancelled) return;
        setInvertIntroMaterials(true);
        html.classList.add(HANDOFF_CLASS);
        root.dataset.handoff = "true";
        const parked = adoptStageIntoNav();
        if (!parked) {
          requestAnimationFrame(() => {
            if (!adoptStageIntoNav()) requestAnimationFrame(adoptStageIntoNav);
          });
        }
        revealHeroLayer();
        finish({ keepLogo: true });
        handoffLive = true;
      }, veilAt + handoffDur);
    };

    const playModelSequence = () => {
      if (cancelled || completed || started) return;
      started = true;
      window.clearTimeout(loadTimer);
      setPlaying(true);
      setInvertIntroMaterials(false);
      markStickyChromeReady();
      parkNavChrome();

      if (RISE_ENTRANCE) {
        playRiseSequence();
        return;
      }

      const handoffAt = introHandoffAt();
      const curtainEnd = TIMING.CURTAIN_AT + TIMING.CURTAIN;
      /** Don’t cut the curtain tween short; stay synced when the sheet outlasts the logo. */
      const handoffComplete = Math.max(TIMING.LOGO, curtainEnd);
      const startY = RISE_ENTRANCE ? offscreenRiseY() : 0;

      /* GSAP x that puts the mark on the nav slot's x while scale is still 1.
         Call only from an untransformed stage (x = 0, scale = 1). */
      const readAlignX = () => {
        const mark = boundsApiRef.current?.();
        const target = logoTarget()?.getBoundingClientRect();
        if (!mark || !target || target.width < 1 || mark.width < 1) return 0;
        return target.left + target.width / 2 - (mark.left + mark.width / 2);
      };

      if (stage) {
        gsap.set(stage, {
          opacity: RISE_ENTRANCE ? 1 : 0.5,
          x: 0,
          y: startY,
          scale: 1,
          transformOrigin: "50% 50%",
          force3D: true,
        });
        /* Line the mark up with the nav before it is on screen, so the
           rise stays vertical instead of sliding right as it lands. */
        const aligned = readAlignX();
        gsap.set(stage, { x: aligned });
        if (!boundsApiRef.current?.()) {
          requestAnimationFrame(() => {
            if (cancelled || stage.dataset.parked === "true") return;
            gsap.set(stage, { x: 0, scale: 1 });
            gsap.set(stage, { x: readAlignX() });
          });
        }
      }
      gsap.set(curtain, {
        x: 0,
        xPercent: 0,
        y: 0,
        yPercent: 100,
        opacity: 1,
        force3D: true,
      });

      const inkLogoWhenWhiteMeets = () => {
        const mark = boundsApiRef.current?.();
        if (!mark || !curtain) return;
        const rem = Number.parseFloat(
          getComputedStyle(document.documentElement).fontSize,
        ) || 16;
        const whiteTop = curtain.getBoundingClientRect().top + 4.5 * rem;
        const logoBottom = mark.top + mark.height;
        if (logoBottom >= whiteTop - 24) {
          setInvertIntroMaterials(true);
        }
      };

      const startHandoff = () => {
        if (cancelled || completed || !stage) return;
        lightOn();
        html.classList.add(HANDOFF_CLASS, LOGO_LIVE_CLASS);
        root.dataset.handoff = "true";
        void html.offsetHeight;

        /* Measure from identity. Scaling around the stage center would drag
           the mark sideways; x runs from alignX to destX so its screen x stays put. */
        const prevVis = stage.style.visibility;
        stage.style.visibility = "hidden";
        gsap.set(stage, {
          x: 0,
          y: 0,
          scale: 1,
          transformOrigin: "50% 50%",
          force3D: true,
          lazy: false,
        });
        const handoff = readHandoff();
        const alignX = readAlignX();
        stage.style.visibility = prevVis;

        const destX = handoff?.x ?? alignX;
        const destY = handoff?.y ?? -(window.innerHeight * 0.5 - 40);
        const destScale = handoff?.scale ?? 0.09;

        gsap.fromTo(
          stage,
          { x: alignX, y: 0, scale: 1, opacity: 1 },
          {
            x: destX,
            y: destY,
            scale: destScale,
            opacity: 1,
            duration: TIMING.LOGO,
            ease: HANDOFF_EASE,
            force3D: true,
            overwrite: false,
            immediateRender: true,
            lazy: false,
            onUpdate: inkLogoWhenWhiteMeets,
            onComplete: () => {
              handoffLive = true;
              if (completed) markPageIntroComplete();
            },
          },
        );
      };

      tl?.kill();
      tl = gsap.timeline();
      if (stage && RISE_ENTRANCE) {
        tl.to(
          stage,
          {
            y: 0,
            duration: INTRO_RISE_IN,
            ease: "power3.out",
            overwrite: false,
            force3D: true,
          },
          0,
        );
      } else if (stage) {
        tl.to(
          stage,
          {
            opacity: 1,
            duration: TIMING.PULSE,
            ease: PULSE_EASE,
            overwrite: false,
          },
          0,
        );
      }
      tl.add(startHandoff, handoffAt);
      tl.to(
        curtain,
        {
          yPercent: 0,
          duration: TIMING.CURTAIN,
          ease: HANDOFF_EASE,
          force3D: true,
          onUpdate: inkLogoWhenWhiteMeets,
        },
        handoffAt + TIMING.CURTAIN_AT,
      );
      tl.add(cueHeroUi, handoffAt + Math.max(0, TIMING.UI_AT - OBJECTS_LEAD));
      /** Nav drop + transparent intro root — early so chrome can animate while the sheet still reads. */
      const startPeripheralUi = () => {
        if (cancelled) return;
        gsap.set(root, { backgroundColor: "transparent" });
        revealNavChrome();
      };
      /** Curtain off + intro complete — after the white sheet motion finishes. */
      const endIntroOverlay = () => {
        if (cancelled) return;
        if (curtain) gsap.set(curtain, { autoAlpha: 0, pointerEvents: "none" });
        markPageIntroComplete();
      };
      tl.add(
        startPeripheralUi,
        handoffAt + Math.max(0, TIMING.LOGO - OBJECTS_LEAD),
      );
      tl.add(
        endIntroOverlay,
        handoffAt +
          Math.max(Math.max(0, TIMING.LOGO - OBJECTS_LEAD), curtainEnd),
      );
      tl.add(() => {
        const parked = adoptStageIntoNav();
        if (!parked) {
          requestAnimationFrame(() => {
            if (!adoptStageIntoNav()) requestAnimationFrame(adoptStageIntoNav);
          });
        }
      }, handoffAt + handoffComplete);
      tl.add(revealHeroLayer, handoffAt + handoffComplete);
      tl.add(() => {
        finish({ keepLogo: true });
        handoffLive = true;
      }, handoffAt + handoffComplete);
    };

    startPlaybackRef.current = playModelSequence;
    failPlaybackRef.current = playReducedExit;

    const start = async () => {
      await nextFrame(signal);
      if (cancelled || completed) return;

      if (reduced || !webgl) {
        playReducedExit();
        return;
      }

      setUseModel(true);
      loadTimer = window.setTimeout(() => {
        playReducedExit();
      }, INTRO_LOAD_TIMEOUT_MS);
    };

    start().catch(() => {
      if (!cancelled) playReducedExit();
    });

    let lastViewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const onViewportChange = () => {
      if (cancelled || !handoffLive) return;
      if (stage?.dataset.parked === "true") {
        syncParkedStage();
        return;
      }
      const nextWidth = window.visualViewport?.width ?? window.innerWidth;
      if (Math.abs(nextWidth - lastViewportWidth) <= 1) return;
      lastViewportWidth = nextWidth;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled || !handoffLive) return;
          syncHandoffPose();
        });
      });
    };
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);

    return () => {
      cancelled = true;
      abort.abort();
      window.clearTimeout(loadTimer);
      parkObserver?.disconnect();
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
      tl?.kill();
      startPlaybackRef.current = null;
      failPlaybackRef.current = null;
      if (!completed) {
        navChromePlayed = false;
        navChromeParked = false;
        ctx.revert();
        gsap.killTweensOf(
          [curtain, stage, root, ...navChrome()].filter(Boolean),
        );
        resetNavChrome();
        setPlaying(false);
        setUseModel(false);
        html.classList.remove(
          LOCK_CLASS,
          ACTIVE_CLASS,
          LIGHT_CLASS,
          HANDOFF_CLASS,
          LOGO_LIVE_CLASS,
          STICKY_LIVE_CLASS,
          NAV_LIVE_CLASS,
        );
        pageRoot?.removeAttribute("inert");
      }
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      ref={rootRef}
      className="yo-intro"
      data-state="playing"
      data-handoff="false"
      data-entrance={INTRO_ENTRANCE}
      role="presentation"
      aria-hidden="true"
    >
      <div className="yo-intro__logo" data-intro-logo="" />
      {createPortal(
        useModel ? (
          <IntroModel
            playing={playing}
            boundsApiRef={boundsApiRef}
            onReady={() => startPlaybackRef.current?.()}
            onError={() => failPlaybackRef.current?.()}
          />
        ) : null,
        stageHostRef.current,
      )}
      <div className="yo-intro__curtain" data-intro-curtain="" />
    </div>
  );
}
