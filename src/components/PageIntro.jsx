import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import IntroModel from "./IntroModel";
import {
  markHeroMarksReady,
  markPageIntroComplete,
  markPageIntroReady,
  markStickyChromeReady,
} from "../utils/pageIntroGate";
import {
  INTRO_HANDOFF,
  INTRO_HANDOFF_AT_WALL,
  INTRO_LOAD_TIMEOUT_MS,
  INTRO_PULSE,
  hasWebGL,
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
const NAV_CHROME_DUR = 0.82;

const TIMING = {
  PULSE: INTRO_PULSE,
  HANDOFF_AT: INTRO_HANDOFF_AT_WALL,
  LOGO: INTRO_HANDOFF,
  CURTAIN_AT: 0.1,
  CURTAIN: 0.5,
  /* ~80% through the logo rise (LOGO = 0.82). */
  UI_AT: 0.66,
  REDUCED_HOLD: 0.2,
  REDUCED_EXIT: 0.36,
};

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
    yPercent: -140,
    y: 0,
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
    const stage = root.querySelector("[data-intro-stage]");
    let handoffLive = false;

    const parkLogo = () => {
      setInvertIntroMaterials(false);
      if (stage) {
        gsap.set(stage, {
          filter: "brightness(0)",
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
      yPercent: reduced || !webgl ? 0 : 100,
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
        yPercent: -140,
        y: 0,
        opacity: 0,
        pointerEvents: "none",
        force3D: true,
      });
      gsap.to(items, {
        yPercent: 0,
        opacity: 1,
        duration: NAV_CHROME_DUR,
        ease: "power3.out",
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
      if (!stage || !handoffLive) return;
      applyHandoffPose();
    };

    const playModelSequence = () => {
      if (cancelled || completed || started) return;
      started = true;
      window.clearTimeout(loadTimer);
      setPlaying(true);
      setInvertIntroMaterials(false);
      markStickyChromeReady();
      parkNavChrome();

      if (stage) {
        gsap.set(stage, {
          opacity: 0.5,
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

        const handoff = readHandoff();
        const destX = handoff?.x ?? 0;
        const destY = handoff?.y ?? -(window.innerHeight * 0.5 - 40);
        const destScale = handoff?.scale ?? 0.09;

        gsap.fromTo(
          stage,
          { x: 0, y: 0, scale: 1, opacity: 1 },
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
      if (stage) {
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
      tl.add(startHandoff, TIMING.HANDOFF_AT);
      tl.to(
        curtain,
        {
          yPercent: 0,
          duration: TIMING.CURTAIN,
          ease: HANDOFF_EASE,
          force3D: true,
          onUpdate: inkLogoWhenWhiteMeets,
        },
        TIMING.HANDOFF_AT + TIMING.CURTAIN_AT,
      );
      tl.add(cueHeroUi, TIMING.HANDOFF_AT + TIMING.UI_AT);
      tl.add(revealHeroLayer, TIMING.HANDOFF_AT + TIMING.LOGO);
      tl.add(revealNavChrome, TIMING.HANDOFF_AT + TIMING.LOGO);
      tl.add(() => {
        finish({ keepLogo: true });
        handoffLive = true;
      }, TIMING.HANDOFF_AT + TIMING.LOGO);
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
      role="presentation"
      aria-hidden="true"
    >
      <div className="yo-intro__logo" data-intro-logo="">
        <div
          className="yo-intro__stage"
          data-intro-stage=""
          data-intro-playing={playing ? "true" : "false"}
        >
          {useModel ? (
            <IntroModel
              playing={playing}
              boundsApiRef={boundsApiRef}
              onReady={() => startPlaybackRef.current?.()}
              onError={() => failPlaybackRef.current?.()}
            />
          ) : null}
        </div>
      </div>
      <div className="yo-intro__curtain" data-intro-curtain="" />
    </div>
  );
}
