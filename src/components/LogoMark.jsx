import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import {
  isHeroEntranceActive,
  isLogoDotDetached,
  onHeroEntranceActive,
  onLogoDotDetached,
} from "../utils/heroEntranceGate";
import "../styles/logo-mark.css";

/** Premium ease. */
const EASE = [0.22, 1, 0.36, 1];
const EASE_IN_OUT = [0.45, 0, 0.55, 1];

/** Rightward hop travel — ~3× the original 12 / 8. */
const DOT_TRAVEL = 36;
const DOT_TRAVEL_SM = 24;

const INTERACTION_MS = 1500;
/** Preserve prior ~500ms gap and add an extra 1500ms. */
const BETWEEN_MS = 500 + 1500;
const LOOP_PAUSE_MS = 1750;
/** Wait after the logo becomes active before the first interaction. */
const INTRO_SETTLE_MS = 3000;
/** Short beat when resuming after leaving the hero — skip the long intro wait. */
const RESUME_SETTLE_MS = 280;
/** Brief beat after the dot reaches its destination before revealing the guest. */
const REVEAL_DELAY_MS = 200;

/**
 * Ordered sequence — humans separated by ≥3 non-human acts.
 * Bouncing escape sits mid-sequence (~#10); HOME / hamburger must recall it.
 */
const LOGO_MARK_INTERACTIONS = [
  "cursorPush",
  "magneticPull",
  "secondDotTap",
  "arrowHook",
  "circularCatch",
  "invisibleRail",
  "smallSquareBumper",
  "scanningLine",
  "magneticCirclePulse",
  "bouncingEscape",
  "fingertipTap",
  "minimalPersonKick",
  "rotatingRingGuide",
  "tinyHandWave",
  "slidingPlatform",
  "minimalPersonCatch",
  "foldingCorner",
  "verticalGate",
  "gentleStringPull",
  "minimalPersonPush",
  "dotOutsmartsY",
];

/** Gravity-like bounce easings */
const EASE_UP = [0.2, 0.85, 0.35, 1];
const EASE_DOWN = [0.75, 0, 0.95, 0.35];
const EASE_RETURN = [0.22, 1, 0.36, 1];

function getReturnTarget() {
  const desktop = window.matchMedia("(min-width: 768px)").matches;
  if (desktop) {
    return document.querySelector('[data-yo-dot-return="home"]');
  }
  return document.querySelector('[data-yo-dot-return="menu"]');
}

async function waitForVisibleReturnTarget(signal) {
  for (let i = 0; i < 30; i += 1) {
    const el = getReturnTarget();
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return el;
    }
    await wait(50, signal);
  }
  return getReturnTarget();
}

/**
 * Responsive max travel — scales with viewport and stops short of
 * HOME / hamburger / viewport edge.
 */
function measureBounceTravel(dotEl) {
  const vw = window.innerWidth;
  let factor = 0.21;
  let cap = 320;
  if (vw < 768) {
    factor = 0.3;
    cap = 220;
  } else if (vw < 1024) {
    factor = 0.25;
    cap = 280;
  }

  const vwBased = Math.min(Math.max(vw * factor, 90), cap);
  const dotRect = dotEl.getBoundingClientRect();
  const returnEl = getReturnTarget();
  let byReturn = vwBased;
  if (returnEl) {
    const r = returnEl.getBoundingClientRect();
    byReturn = Math.max(56, r.left - dotRect.right - 32);
  }
  const byViewport = Math.max(48, vw - dotRect.right - 20);
  return Math.min(vwBased, byReturn, byViewport);
}

function placeTether(tether, fromEl, toEl) {
  if (!tether || !fromEl || !toEl) return 0;
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  const x1 = a.left + a.width * 0.5;
  const y1 = a.top + a.height * 0.5;
  const x2 = b.left + b.width * 0.5;
  const y2 = b.top + b.height * 0.5;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  tether.style.left = `${x1}px`;
  tether.style.top = `${y1}px`;
  tether.style.width = `${len}px`;
  tether.style.transform = `rotate(${angle}deg)`;
  return len;
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function isAbortError(err) {
  return err?.name === "AbortError";
}

function createAnimator(signal, running) {
  const play = (el, keyframes, options) => {
    if (!el) return Promise.resolve();
    if (signal.aborted) {
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    }
    const controls = animate(el, keyframes, options);
    running.add(controls);
    const done = Promise.resolve(controls).finally(() => {
      running.delete(controls);
    });
    signal.addEventListener(
      "abort",
      () => {
        controls.stop();
      },
      { once: true }
    );
    return done;
  };

  const all = (...jobs) => Promise.all(jobs);

  return { play, all };
}

function resetVisuals(els) {
  const instant = { duration: 0 };
  const {
    letterY,
    dot,
    cursor,
    magnetLine,
    secondaryDot,
    arrow,
    catchCircle,
    rail,
    bumper,
    scanLine,
    pulse,
    fingertip,
    person,
    personArm,
    ring,
    hand,
    platform,
    corner,
    gateL,
    gateR,
    stringLine,
    stringHandle,
    tether,
  } = els;

  if (letterY) animate(letterY, { x: 0, y: 0 }, instant);
  if (dot) animate(dot, { x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }, instant);
  if (cursor) animate(cursor, { x: 14, y: 0, opacity: 0 }, instant);
  if (magnetLine) animate(magnetLine, { scaleX: 0, opacity: 0 }, instant);
  if (secondaryDot) animate(secondaryDot, { x: 16, opacity: 0 }, instant);
  if (arrow) animate(arrow, { x: 16, opacity: 0 }, instant);
  if (catchCircle)
    animate(catchCircle, { x: 0, scale: 1.35, opacity: 0, rotate: 0 }, instant);
  if (rail) animate(rail, { scaleX: 0, opacity: 0 }, instant);
  if (bumper) animate(bumper, { x: 18, opacity: 0 }, instant);
  if (scanLine) animate(scanLine, { x: 18, opacity: 0 }, instant);
  if (pulse) animate(pulse, { scale: 0.35, opacity: 0 }, instant);
  if (fingertip) animate(fingertip, { x: 16, y: 0, opacity: 0, rotate: 0 }, instant);
  if (person) animate(person, { x: 18, y: 0, opacity: 0, rotate: 0 }, instant);
  if (personArm) animate(personArm, { rotate: 0, y: 0 }, instant);
  if (ring)
    animate(ring, { x: 0, opacity: 0, rotate: 0, scale: 1 }, instant);
  if (hand) animate(hand, { x: 16, y: 0, opacity: 0, rotate: 0 }, instant);
  if (platform) animate(platform, { x: 18, opacity: 0 }, instant);
  if (corner)
    animate(corner, { x: 14, opacity: 0, rotate: 0, scaleX: 1, scaleY: 1 }, instant);
  if (gateL) animate(gateL, { x: 0, opacity: 0 }, instant);
  if (gateR) animate(gateR, { x: 0, opacity: 0 }, instant);
  if (stringLine) animate(stringLine, { scaleX: 0, opacity: 0 }, instant);
  if (stringHandle) animate(stringHandle, { x: 0, opacity: 0 }, instant);
  if (tether) {
    tether.style.opacity = "0";
    tether.style.width = "0px";
  }
}

/** HOME / hamburger can be mid-shove when the loop aborts — snap them home. */
function resetReturnTargets() {
  document.querySelectorAll("[data-yo-dot-return]").forEach((el) => {
    el.style.transform = "";
    el.style.color = "";
    el.style.opacity = "";
    el.querySelectorAll("[data-yo-burger-line]").forEach((line) => {
      line.style.transform = "";
      line.style.opacity = "";
    });
  });
}

function createInteractions(els, travel, anim) {
  const {
    letterY,
    dot,
    cursor,
    magnetLine,
    secondaryDot,
    arrow,
    catchCircle,
    rail,
    bumper,
    scanLine,
    pulse,
    fingertip,
    person,
    personArm,
    ring,
    hand,
    platform,
    corner,
    gateL,
    gateR,
    stringLine,
    stringHandle,
  } = els;
  const { play, all } = anim;

  const HOP_H = 12;
  const HOP_D = 0.36;

  async function bounceStep(toX, height, duration) {
    await play(
      dot,
      { x: toX, y: [0, -height, 0] },
      {
        x: { duration, ease: [0, 0, 1, 1] },
        y: {
          duration,
          times: [0, 0.48, 1],
          ease: [EASE_UP, EASE_DOWN],
        },
      }
    );
  }

  /**
   * Even hops toward toX — same height, same pace, like a ball fleeing.
   * Optional onLast overlaps the catcher with the final landing.
   */
  async function hopToward(toX, signal, { count = 3, onLast } = {}) {
    for (let i = 0; i < count; i += 1) {
      if (signal.aborted) return;
      const x = ((i + 1) / count) * toX;
      const job = bounceStep(x, HOP_H, HOP_D);
      if (i === count - 1 && onLast) {
        await all(job, onLast());
      } else {
        await job;
      }
    }
  }

  return {
    /**
     * Mid-sequence bouncing escape. Dot never returns on its own —
     * HOME (desktop) or the three hamburger lines (mobile) physically
     * move in, push the ball home with their body, then return to place.
     * No tether / pull line.
     */
    async bouncingEscape(signal) {
      await wait(400, signal);
      const maxX = Math.max(80, measureBounceTravel(dot));
      const returnElPromise = waitForVisibleReturnTarget(signal);

      const hops = [maxX * 0.5, maxX * 0.9];

      for (const x of hops) {
        if (signal.aborted) return;
        await bounceStep(x, HOP_H, HOP_D);
      }

      const returnEl = await returnElPromise;
      if (!returnEl) {
        play(dot, { x: 0, y: 0 }, { duration: 0 });
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        return;
      }

      const isMenu = returnEl.getAttribute("data-yo-dot-return") === "menu";
      const lines = isMenu
        ? returnEl.querySelectorAll("[data-yo-burger-line]")
        : null;

      const landX = maxX * 0.9;
      const dotRect = dot.getBoundingClientRect();
      const retRect = returnEl.getBoundingClientRect();
      const remaining = landX - hops[hops.length - 1];
      const gap = retRect.left - (dotRect.right + remaining);
      const meetX = -Math.max(12, gap + 6);
      const shoveX = meetX - 14;

      let catcherReady = false;
      const catcherApproach = (async () => {
        if (!isMenu) {
          await play(
            returnEl,
            { color: "#ffffff" },
            { duration: 0.16, ease: EASE }
          );
        } else if (lines) {
          for (const line of lines) {
            if (signal.aborted) return;
            await play(line, { opacity: 1 }, { duration: 0.07, ease: EASE });
          }
        }
        await play(returnEl, { x: meetX }, { duration: 0.5, ease: EASE });
        catcherReady = true;
      })();

      await bounceStep(landX, HOP_H, HOP_D);

      let guard = 0;
      while (!catcherReady && guard < 8) {
        if (signal.aborted) return;
        guard += 1;
        await bounceStep(landX, HOP_H, HOP_D);
      }
      await catcherApproach;

      await all(
        play(dot, { x: 0, y: 0 }, { duration: 0.85, ease: EASE_RETURN }),
        play(returnEl, { x: shoveX }, { duration: 0.4, ease: EASE })
      );

      await play(returnEl, { x: 0 }, { duration: 0.55, ease: EASE_RETURN });

      if (!isMenu) {
        await play(
          returnEl,
          { color: "rgba(255, 255, 255, 0.55)" },
          { duration: 0.2, ease: EASE }
        );
        returnEl.style.color = "";
        returnEl.style.opacity = "";
      }
      returnEl.style.transform = "";

      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    },

    async cursorPush(signal) {
      await hopToward(travel, signal, {
        onLast: () =>
          play(
            cursor,
            { opacity: 0.9, x: travel + 5 },
            { duration: 0.32, ease: EASE }
          ),
      });
      await all(
        play(dot, { x: 0, y: 0 }, { duration: 0.48, ease: EASE }),
        play(cursor, { x: 3 }, { duration: 0.48, ease: EASE })
      );
      await play(cursor, { opacity: 0, x: 12 }, { duration: 0.26, ease: EASE });
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    },

    async magneticPull(signal) {
      await hopToward(travel, signal, {
        onLast: () =>
          play(
            magnetLine,
            { scaleX: 1, opacity: 0.45 },
            { duration: 0.28, ease: EASE }
          ),
      });
      await wait(80, signal);
      await all(
        play(dot, { x: 0, y: 0 }, { duration: 0.5, ease: EASE }),
        play(
          magnetLine,
          { scaleX: 0.08, opacity: 0.2 },
          { duration: 0.5, ease: EASE }
        )
      );
      await play(
        magnetLine,
        { scaleX: 0, opacity: 0 },
        { duration: 0.2, ease: EASE }
      );
    },

    async secondDotTap(signal) {
      const dest = travel * 0.85;
      await hopToward(dest, signal, {
        onLast: () =>
          play(
            secondaryDot,
            { opacity: 0.7, x: dest + 6 },
            { duration: 0.3, ease: EASE }
          ),
      });
      await play(secondaryDot, { x: dest + 1 }, { duration: 0.2, ease: EASE });
      await play(dot, { x: 0, y: 0 }, { duration: 0.45, ease: EASE });
      await play(secondaryDot, { opacity: 0 }, { duration: 0.14, ease: EASE });
      play(secondaryDot, { x: 16 }, { duration: 0 });
    },

    async arrowHook(signal) {
      await hopToward(travel, signal, {
        onLast: () =>
          play(
            arrow,
            { opacity: 0.85, x: travel + 6 },
            { duration: 0.3, ease: EASE }
          ),
      });
      await all(
        play(dot, { x: 0, y: 0 }, { duration: 0.48, ease: EASE }),
        play(arrow, { x: 4 }, { duration: 0.48, ease: EASE })
      );
      await play(arrow, { opacity: 0, x: 16 }, { duration: 0.28, ease: EASE });
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    },

    async circularCatch(signal) {
      const dest = travel * 0.9;
      await hopToward(dest, signal, {
        onLast: () =>
          play(
            catchCircle,
            { opacity: 0.7, scale: 1.2, x: dest },
            { duration: 0.28, ease: EASE }
          ),
      });
      await play(catchCircle, { scale: 1 }, { duration: 0.24, ease: EASE });
      await all(
        play(dot, { x: 0, y: 0 }, { duration: 0.48, ease: EASE }),
        play(catchCircle, { x: 0 }, { duration: 0.48, ease: EASE })
      );
      await play(
        catchCircle,
        { opacity: 0, scale: 1.15 },
        { duration: 0.18, ease: EASE }
      );
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    },

    async invisibleRail(signal) {
      await play(rail, { scaleX: 1, opacity: 0.4 }, { duration: 0.28, ease: EASE });
      await hopToward(travel, signal);
      await play(dot, { x: 0, y: 0 }, { duration: 0.5, ease: EASE });
      await play(
        rail,
        { opacity: 0, scaleX: 0.2 },
        { duration: 0.26, ease: EASE }
      );
      play(rail, { scaleX: 0 }, { duration: 0 });
    },

    async smallSquareBumper(signal) {
      const dest = travel * 0.75;
      await hopToward(dest, signal, {
        onLast: () =>
          play(
            bumper,
            { opacity: 0.85, x: dest + 7 },
            { duration: 0.32, ease: EASE }
          ),
      });
      await play(bumper, { x: dest + 4 }, { duration: 0.18, ease: EASE });
      await play(dot, { x: 0, y: 0 }, { duration: 0.48, ease: EASE });
      await wait(160, signal);
      await play(bumper, { opacity: 0, x: 18 }, { duration: 0.28, ease: EASE });
    },

    async scanningLine(signal) {
      const dest = travel * 0.85;
      await hopToward(dest, signal, {
        onLast: () =>
          play(
            scanLine,
            { opacity: 0.65, x: travel + 10 },
            { duration: 0.2, ease: EASE }
          ),
      });
      await play(scanLine, { x: dest }, { duration: 0.36, ease: EASE_IN_OUT });
      await all(
        play(dot, { x: 0, y: 0 }, { duration: 0.45, ease: EASE }),
        play(scanLine, { x: -4, opacity: 0.35 }, { duration: 0.45, ease: EASE })
      );
      await play(scanLine, { opacity: 0 }, { duration: 0.2, ease: EASE });
      play(scanLine, { x: 18 }, { duration: 0 });
    },

    async magneticCirclePulse(signal) {
      await hopToward(travel * 0.9, signal, {
        onLast: () =>
          play(
            pulse,
            { opacity: 0.5, scale: 0.55 },
            { duration: 0.22, ease: EASE }
          ),
      });
      await play(
        pulse,
        { scale: 1.65, opacity: 0.28 },
        { duration: 0.5, ease: EASE_IN_OUT }
      );
      await all(
        play(dot, { x: 0, y: 0 }, { duration: 0.48, ease: EASE }),
        play(pulse, { scale: 1.85, opacity: 0 }, { duration: 0.42, ease: EASE })
      );
      play(pulse, { scale: 0.35 }, { duration: 0 });
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    },

    async fingertipTap(signal) {
      const dest = travel * 0.7;
      await hopToward(dest, signal, {
        onLast: () =>
          play(
            fingertip,
            { opacity: 0.9, x: dest + 6, y: 0 },
            { duration: 0.3, ease: EASE }
          ),
      });
      await play(fingertip, { x: dest + 1 }, { duration: 0.18, ease: EASE });
      await all(
        play(dot, { x: 0, y: 0 }, { duration: 0.48, ease: EASE }),
        play(fingertip, { x: dest + 4 }, { duration: 0.48, ease: EASE })
      );
      await play(fingertip, { opacity: 0, x: 16 }, { duration: 0.26, ease: EASE });
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    },

    async minimalPersonKick(signal) {
      const dest = travel * 0.85;
      await hopToward(dest, signal, {
        onLast: () =>
          play(
            person,
            { opacity: 0.85, x: travel + 8 },
            { duration: 0.32, ease: EASE }
          ),
      });
      await play(person, { x: dest + 5 }, { duration: 0.2, ease: EASE });
      await play(person, { rotate: -8 }, { duration: 0.14, ease: EASE });
      await all(
        play(dot, { x: 0, y: 0 }, { duration: 0.48, ease: EASE }),
        play(person, { rotate: 0, x: dest + 7 }, { duration: 0.48, ease: EASE })
      );
      await play(person, { opacity: 0, x: 18 }, { duration: 0.28, ease: EASE });
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    },

    async minimalPersonCatch(signal) {
      await hopToward(travel, signal, {
        onLast: () =>
          play(
            person,
            { opacity: 0.85, x: travel + 9 },
            { duration: 0.32, ease: EASE }
          ),
      });
      await play(person, { x: travel + 3 }, { duration: 0.24, ease: EASE });
      await all(
        play(person, { y: 2, rotate: 6 }, { duration: 0.22, ease: EASE }),
        play(personArm, { rotate: -25, y: 1 }, { duration: 0.22, ease: EASE })
      );
      await all(
        play(dot, { x: 0, y: 0 }, { duration: 0.52, ease: EASE }),
        play(person, { x: 4, y: 0, rotate: 0 }, { duration: 0.52, ease: EASE }),
        play(personArm, { rotate: 0, y: 0 }, { duration: 0.52, ease: EASE })
      );
      await wait(100, signal);
      await play(person, { opacity: 0, x: 18 }, { duration: 0.28, ease: EASE });
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    },

    async rotatingRingGuide(signal) {
      await hopToward(travel, signal, {
        onLast: () =>
          play(
            ring,
            { opacity: 0.7, x: travel, rotate: 0, scale: 1 },
            { duration: 0.26, ease: EASE }
          ),
      });
      await play(ring, { rotate: 90 }, { duration: 0.5, ease: EASE_IN_OUT });
      await all(
        play(dot, { x: 0, y: 0 }, { duration: 0.48, ease: EASE }),
        play(ring, { x: 0 }, { duration: 0.48, ease: EASE })
      );
      await play(ring, { opacity: 0 }, { duration: 0.16, ease: EASE });
      play(ring, { rotate: 0, x: 0 }, { duration: 0 });
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    },

    async tinyHandWave(signal) {
      const dest = travel * 0.8;
      await hopToward(dest, signal, {
        onLast: () =>
          play(
            hand,
            { opacity: 0.9, x: travel + 6, rotate: 0 },
            { duration: 0.28, ease: EASE }
          ),
      });
      await play(hand, { rotate: -18 }, { duration: 0.2, ease: EASE });
      await play(hand, { rotate: 8 }, { duration: 0.2, ease: EASE });
      await play(hand, { rotate: -6 }, { duration: 0.16, ease: EASE });
      await all(
        play(dot, { x: 0, y: 0 }, { duration: 0.48, ease: EASE }),
        play(hand, { rotate: 0, x: travel + 4 }, { duration: 0.48, ease: EASE })
      );
      await play(hand, { opacity: 0, x: 16 }, { duration: 0.26, ease: EASE });
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    },

    async slidingPlatform(signal) {
      await play(
        platform,
        { opacity: 0.55, x: travel * 0.2 },
        { duration: 0.32, ease: EASE }
      );
      await all(
        hopToward(travel, signal),
        play(platform, { x: travel }, { duration: 1.08, ease: EASE_IN_OUT })
      );
      await all(
        play(dot, { x: 0, y: 0 }, { duration: 0.5, ease: EASE }),
        play(platform, { x: 0 }, { duration: 0.5, ease: EASE })
      );
      await play(platform, { opacity: 0, x: 14 }, { duration: 0.26, ease: EASE });
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    },

    async minimalPersonPush(signal) {
      await hopToward(travel, signal, {
        onLast: () =>
          play(
            person,
            { opacity: 0.85, x: travel + 10 },
            { duration: 0.32, ease: EASE }
          ),
      });
      await play(person, { x: travel + 6 }, { duration: 0.18, ease: EASE });
      await play(person, { x: travel + 3 }, { duration: 0.18, ease: EASE });
      await play(personArm, { rotate: -35 }, { duration: 0.2, ease: EASE });
      await all(
        play(dot, { x: 0, y: 0 }, { duration: 0.48, ease: EASE }),
        play(personArm, { rotate: -10 }, { duration: 0.48, ease: EASE }),
        play(person, { x: 5 }, { duration: 0.48, ease: EASE })
      );
      await wait(140, signal);
      await play(personArm, { rotate: 0 }, { duration: 0.14, ease: EASE });
      await play(person, { opacity: 0, x: 18 }, { duration: 0.28, ease: EASE });
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    },

    async foldingCorner(signal) {
      await hopToward(travel, signal, {
        onLast: () =>
          play(
            corner,
            { opacity: 0.75, x: travel + 4, rotate: 0, scaleX: 1, scaleY: 1 },
            { duration: 0.28, ease: EASE }
          ),
      });
      await play(
        corner,
        { rotate: -18, scaleX: 0.92, scaleY: 0.92 },
        { duration: 0.26, ease: EASE }
      );
      await play(dot, { x: 0, y: 0 }, { duration: 0.48, ease: EASE });
      await play(
        corner,
        { rotate: 0, scaleX: 1, scaleY: 1, opacity: 0 },
        { duration: 0.26, ease: EASE }
      );
      play(corner, { x: 14 }, { duration: 0 });
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    },

    async verticalGate(signal) {
      const leftAt = travel * 0.15;
      const rightAt = travel * 0.95;
      await hopToward(travel * 0.55, signal, {
        onLast: () =>
          all(
            play(gateL, { opacity: 0.55, x: leftAt }, { duration: 0.26, ease: EASE }),
            play(gateR, { opacity: 0.55, x: rightAt }, { duration: 0.26, ease: EASE })
          ),
      });
      await all(
        play(gateR, { x: travel * 0.4 }, { duration: 0.42, ease: EASE }),
        play(dot, { x: 0, y: 0 }, { duration: 0.48, ease: EASE })
      );
      await all(
        play(gateL, { opacity: 0 }, { duration: 0.22, ease: EASE }),
        play(gateR, { opacity: 0 }, { duration: 0.22, ease: EASE })
      );
      play(gateL, { x: 0 }, { duration: 0 });
      play(gateR, { x: 0 }, { duration: 0 });
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    },

    async gentleStringPull(signal) {
      await hopToward(travel, signal, {
        onLast: () =>
          all(
            play(
              stringLine,
              { scaleX: 1, opacity: 0.5 },
              { duration: 0.3, ease: EASE }
            ),
            play(
              stringHandle,
              { opacity: 0.85, x: travel + 2 },
              { duration: 0.3, ease: EASE }
            )
          ),
      });
      await all(
        play(stringHandle, { x: 2 }, { duration: 0.5, ease: EASE }),
        play(stringLine, { scaleX: 0.12 }, { duration: 0.5, ease: EASE }),
        play(dot, { x: 0, y: 0 }, { duration: 0.5, ease: EASE })
      );
      await all(
        play(stringHandle, { opacity: 0 }, { duration: 0.18, ease: EASE }),
        play(stringLine, { opacity: 0, scaleX: 0 }, { duration: 0.18, ease: EASE })
      );
      play(stringHandle, { x: 0 }, { duration: 0 });
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    },

    /**
     * Dot escapes left alone; only then does “y” follow, get to its left,
     * and gently push it home.
     */
    async dotOutsmartsY(signal) {
      const escape = Math.max(8, travel * 0.85);
      const yLead = escape + Math.max(5, travel * 0.55);

      await play(dot, { x: -escape }, { duration: 0.55, ease: EASE_IN_OUT });
      await wait(REVEAL_DELAY_MS, signal);
      await play(letterY, { x: -yLead }, { duration: 0.42, ease: EASE });
      await wait(100, signal);
      await play(letterY, { x: -escape - 2 }, { duration: 0.2, ease: EASE });
      await all(
        play(dot, { x: 0 }, { duration: 0.52, ease: EASE }),
        play(letterY, { x: 0 }, { duration: 0.52, ease: EASE })
      );
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    },
  };
}

/**
 * Upper-left hero/nav “y.” — period micro-interactions.
 * Letter “y” is static except during “dotOutsmartsY”.
 * Plays only while the hero is in view; pauses when scrolling into later sections.
 */
let logoMarkHasSettled = false;

export default function LogoMark({ active }) {
  const reducedMotion = useReducedMotion();
  const [inHero, setInHero] = useState(true);
  /* The hero entrance borrows this period; hold the loop while it is away. */
  const [dotDetached, setDotDetached] = useState(isLogoDotDetached);
  const [entranceActive, setEntranceActive] = useState(isHeroEntranceActive);

  const letterYRef = useRef(null);
  const dotRef = useRef(null);
  const cursorRef = useRef(null);
  const magnetLineRef = useRef(null);
  const secondaryDotRef = useRef(null);
  const arrowRef = useRef(null);
  const catchCircleRef = useRef(null);
  const railRef = useRef(null);
  const bumperRef = useRef(null);
  const scanLineRef = useRef(null);
  const pulseRef = useRef(null);
  const fingertipRef = useRef(null);
  const personRef = useRef(null);
  const personArmRef = useRef(null);
  const ringRef = useRef(null);
  const handRef = useRef(null);
  const platformRef = useRef(null);
  const cornerRef = useRef(null);
  const gateLRef = useRef(null);
  const gateRRef = useRef(null);
  const stringLineRef = useRef(null);
  const stringHandleRef = useRef(null);
  const tetherRef = useRef(null);

  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry.intersectionRatio;
        setInHero((wasInHero) =>
          wasInHero ? ratio >= 0.18 : ratio >= 0.32
        );
      },
      { threshold: [0, 0.18, 0.32, 0.5, 0.75, 1] }
    );

    observer.observe(hero);

    const rect = hero.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    const ratio = Math.max(0, visible) / Math.max(rect.height, 1);
    setInHero(ratio >= 0.32);

    return () => observer.disconnect();
  }, []);

  useEffect(() => onLogoDotDetached(setDotDetached), []);
  useEffect(() => onHeroEntranceActive(setEntranceActive), []);

  const playLoop = false;

  useEffect(() => {
    if (!playLoop) return undefined;

    const els = {
      letterY: letterYRef.current,
      dot: dotRef.current,
      cursor: cursorRef.current,
      magnetLine: magnetLineRef.current,
      secondaryDot: secondaryDotRef.current,
      arrow: arrowRef.current,
      catchCircle: catchCircleRef.current,
      rail: railRef.current,
      bumper: bumperRef.current,
      scanLine: scanLineRef.current,
      pulse: pulseRef.current,
      fingertip: fingertipRef.current,
      person: personRef.current,
      personArm: personArmRef.current,
      ring: ringRef.current,
      hand: handRef.current,
      platform: platformRef.current,
      corner: cornerRef.current,
      gateL: gateLRef.current,
      gateR: gateRRef.current,
      stringLine: stringLineRef.current,
      stringHandle: stringHandleRef.current,
      tether: tetherRef.current,
    };

    if (!els.dot || !els.letterY) return undefined;

    const mq = window.matchMedia("(max-width: 767px)");
    const travel = mq.matches ? DOT_TRAVEL_SM : DOT_TRAVEL;
    const controller = new AbortController();
    const { signal } = controller;
    const running = new Set();
    const anim = createAnimator(signal, running);
    const interactions = createInteractions(els, travel, anim);

    resetVisuals(els);

    const loop = async () => {
      try {
        await wait(
          logoMarkHasSettled ? RESUME_SETTLE_MS : INTRO_SETTLE_MS,
          signal
        );
        if (!signal.aborted) logoMarkHasSettled = true;

        while (!signal.aborted) {
          for (const key of LOGO_MARK_INTERACTIONS) {
            if (signal.aborted) return;
            resetVisuals(els);
            const started = performance.now();
            await interactions[key](signal);
            const elapsed = performance.now() - started;
            /* Long feature interactions skip the short-duration pad */
            const targetMs =
              key === "bouncingEscape" ? 0 : INTERACTION_MS;
            const pad = Math.max(0, targetMs - elapsed);
            if (pad > 0) await wait(pad, signal);
            await wait(BETWEEN_MS, signal);
          }
          await wait(LOOP_PAUSE_MS, signal);
        }
      } catch (err) {
        if (!isAbortError(err)) {
          // eslint-disable-next-line no-console
          console.error("[LogoMark] interaction loop error", err);
        }
      }
    };

    loop();

    return () => {
      controller.abort();
      running.forEach((controls) => {
        try {
          controls.stop();
        } catch {
          /* ignore */
        }
      });
      running.clear();
      resetVisuals(els);
      resetReturnTargets();
    };
  }, [playLoop]);

  return (
    <span className="yo-logo-mark" aria-hidden="true">
      <span
        ref={tetherRef}
        className="yo-logo-mark__tether"
        aria-hidden="true"
      />

      <span className="yo-logo-mark__y-wrap">
        <span ref={pulseRef} className="yo-logo-mark__pulse" />
        <span ref={letterYRef} className="yo-logo-mark__y" data-yo-logo-y="">
          y
        </span>
      </span>

      <span className="yo-logo-mark__stage">
        <span
          ref={magnetLineRef}
          className="yo-logo-mark__line yo-logo-mark__line--magnet"
        />
        <span
          ref={stringLineRef}
          className="yo-logo-mark__line yo-logo-mark__line--string"
        />
        <span ref={railRef} className="yo-logo-mark__rail" />
        <span ref={platformRef} className="yo-logo-mark__platform" />

        <span
          ref={dotRef}
          className="yo-logo-mark__dot"
          data-yo-logo-dot
          data-detached={dotDetached ? "true" : "false"}
        >
          .
        </span>

        <span ref={catchCircleRef} className="yo-logo-mark__catch" />
        <span ref={ringRef} className="yo-logo-mark__ring" />
        <span ref={stringHandleRef} className="yo-logo-mark__string-handle" />
        <span ref={gateLRef} className="yo-logo-mark__gate yo-logo-mark__gate--l" />
        <span ref={gateRRef} className="yo-logo-mark__gate yo-logo-mark__gate--r" />
        <span ref={cornerRef} className="yo-logo-mark__corner" />

        <span ref={cursorRef} className="yo-logo-mark__cursor">
          <svg width="10" height="14" viewBox="0 0 9 13" fill="none" aria-hidden="true">
            <path
              d="M1 1L1 11.5L3.6 9.1L5.4 12.4L6.9 11.7L5.1 8.4L8.2 8.1L1 1Z"
              fill="currentColor"
            />
          </svg>
        </span>

        <span ref={secondaryDotRef} className="yo-logo-mark__secondary" />

        <span ref={arrowRef} className="yo-logo-mark__arrow">
          <svg width="11" height="9" viewBox="0 0 10 8" fill="none" aria-hidden="true">
            <path
              d="M9 4H1.5M1.5 4L4.2 1.3M1.5 4L4.2 6.7"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <span ref={bumperRef} className="yo-logo-mark__bumper" />
        <span ref={scanLineRef} className="yo-logo-mark__scan" />

        <span ref={fingertipRef} className="yo-logo-mark__fingertip">
          <svg width="11" height="13" viewBox="0 0 10 12" fill="none" aria-hidden="true">
            <path
              d="M5 1.2c-.7 0-1.2.5-1.2 1.2V6.5M5 1.2c.7 0 1.2.5 1.2 1.2V5.8M3.8 4.2V7M6.2 3.6V7M2.6 5.2v2.2c0 1.6 1.1 2.8 2.4 2.8s2.4-1.2 2.4-2.8V5.6"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <span ref={handRef} className="yo-logo-mark__hand">
          <svg width="13" height="12" viewBox="0 0 12 11" fill="none" aria-hidden="true">
            <path
              d="M3.2 5.2V3.1c0-.5.4-.9.9-.9s.9.4.9.9v1.4M5 4.6V2.2c0-.5.4-.9.9-.9s.9.4.9.9v2.6M6.8 4.8V2.8c0-.5.4-.9.9-.9s.9.4.9.9v3.2M8.6 5.5V4.2c0-.4.3-.8.8-.8.4 0 .7.3.7.8v2.6c0 1.7-1.2 3-2.8 3H5.2C3.6 9.8 2.2 8.6 2.2 7V5.8c0-.5.4-.9.9-.9.3 0 .5.1.7.3l.4.5"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <span ref={personRef} className="yo-logo-mark__person">
          <svg width="9" height="15" viewBox="0 0 8 14" fill="none" aria-hidden="true">
            <circle cx="4" cy="1.6" r="1.15" fill="currentColor" />
            <path
              d="M4 3.1V7.4M4 7.4L1.8 12.2M4 7.4L6.2 12.2"
              stroke="currentColor"
              strokeWidth="1.05"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <g
              ref={personArmRef}
              className="yo-logo-mark__person-arm"
              style={{ transformOrigin: "4px 4.4px" }}
            >
              <path
                d="M4 4.4L1.5 6.2"
                stroke="currentColor"
                strokeWidth="1.05"
                strokeLinecap="round"
              />
            </g>
            <path
              d="M4 4.4L6.5 6.2"
              stroke="currentColor"
              strokeWidth="1.05"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </span>
    </span>
  );
}
