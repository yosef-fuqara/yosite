import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { markPageIntroReady } from "../utils/pageIntroGate";
import {
  setHeroEntranceActive,
  setLogoDotDetached,
} from "../utils/heroEntranceGate";

/** Existing global lock — Lenis watches this class and stops while it is set. */
const LOCK_CLASS = "yo-intro-locked";

/** Beat map, in seconds, matching the designed 0 → 2.3s entrance. */
const T = {
  mediaIn: 0,
  detach: 0.3,
  travel: 0.5,
  travelDur: 0.42,
  arrive: 0.92,
  foldReact: 1.14,
  titleA: 1.16,
  titleB: 1.32,
  foldOpen: 1.4,
  foldOpenDur: 0.52,
  support: 1.66,
  cta: 1.86,
  handoff: 2.12,
  settle: 2.3,
};

/** Closed fold sits this far past its final edge, as a share of media width. */
const FOLD_SHIFT_DESKTOP = 0.26;
const FOLD_SHIFT_MOBILE = 0.16;

/** Gap the route aims for when picking a corridor beside the type. */
const PATH_CLEARANCE = 40;
/** No-go band around every obstacle, widest first — the winning route hugs it. */
const PATH_SAFETY = [22, 14, 8];
const EDGE_MARGIN = 12;

/** Length of the wisp that follows the dot, in px. */
const TRAIL_TAIL = 110;

/** Set only after a full play — blocks replays on re-render and HMR. */
let heroEntrancePlayed = false;

export function isHeroEntrancePlayed() {
  return heroEntrancePlayed;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Deep links skip the entrance so the page can jump straight to the section. */
function hasDeepLink() {
  const hash = window.location.hash;
  return Boolean(hash) && hash !== "#" && hash !== "#top";
}

function centerOf(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 0.5 && r.height < 0.5) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Everything the route has to stay out of: the type, the peripheral marks and
 * the nav links. Measured live, so it holds for any viewport and language.
 */
const OBSTACLE_SELECTORS = [
  ".yo-hero__title-mask",
  ".yo-hero__support",
  ".yo-hero__cta",
  ".yo-hero__wordmark",
  ".yo-hero__year-mark",
  ".yo-hero__aside-body",
  ".yo-hero__audio",
  "[data-yo-nav-links]",
];

/**
 * Layout box with any in-flight entrance transform taken back out.
 *
 * The peripheral marks drift in from the edges while the dot is measuring its
 * route, so their live boxes are up to 80px away from where they will settle.
 * Only translation is subtracted, which is all these elements animate; the
 * wordmark's own centring lives in the CSS `translate` property, outside
 * `transform`, so it survives.
 */
function restingRect(el) {
  const r = el.getBoundingClientRect();
  const m = new DOMMatrixReadOnly(window.getComputedStyle(el).transform);
  return {
    left: r.left - m.m41,
    right: r.right - m.m41,
    top: r.top - m.m42,
    bottom: r.bottom - m.m42,
  };
}

function obstacleRects(root) {
  const rects = [];
  OBSTACLE_SELECTORS.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      const r = restingRect(el);
      if (r.right - r.left > 0.5 && r.bottom - r.top > 0.5) rects.push(r);
    });
  });
  return rects.length ? rects : [root.getBoundingClientRect()];
}

/**
 * Two cubics through one corner: a leg out of the logo along the free margin,
 * then a sweep into the fold tip. Tangents are continuous at the corner, so it
 * reads as a single unhurried gesture rather than an elbow.
 *
 * Returned as raw control points, because candidate routes are scored in plain
 * arithmetic — going through the SVG for each one costs whole frames.
 */
function routeSegments(start, target, corner, vh) {
  const dx1 = corner.x - start.x;
  const dy1 = corner.y - start.y;
  const dx2 = target.x - corner.x;
  const dy2 = target.y - corner.y;
  /* Leave the logo along whichever axis the corner mostly lies on. */
  const vertical = Math.abs(dy1) >= Math.abs(dx1);
  const bottom = vh - 2;

  return [
    [
      start,
      vertical
        ? { x: start.x, y: start.y + dy1 * 0.55 }
        : { x: start.x + dx1 * 0.55, y: start.y },
      { x: corner.x, y: corner.y - dy1 * 0.18 },
      corner,
    ],
    [
      corner,
      { x: corner.x, y: Math.min(corner.y + dy2 * 0.45, bottom) },
      { x: corner.x + dx2 * 0.55, y: Math.min(target.y, bottom) },
      target,
    ],
  ];
}

function cubicAt([p0, p1, p2, p3], t) {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

const ROUTE_SAMPLES = 90;

/**
 * A cubic does not pass through its control points, so clearance applied to
 * those alone can still let the curve graze the type. Walk the real curve
 * instead, rejecting anything that enters an obstacle or leaves the viewport.
 *
 * @returns the route's approximate length, or `null` if it is not clear.
 */
function measureRoute(segments, rects, vw, vh, safety) {
  let length = 0;
  let prev = null;

  for (const seg of segments) {
    for (let i = 0; i <= ROUTE_SAMPLES; i += 1) {
      const pt = cubicAt(seg, i / ROUTE_SAMPLES);
      if (pt.x < 0 || pt.x > vw || pt.y < 0 || pt.y > vh) return null;
      for (const r of rects) {
        if (
          pt.x > r.left - safety &&
          pt.x < r.right + safety &&
          pt.y > r.top - safety &&
          pt.y < r.bottom + safety
        ) {
          return null;
        }
      }
      if (prev) length += Math.hypot(pt.x - prev.x, pt.y - prev.y);
      prev = pt;
    }
  }
  return length;
}

function segmentsToPath(segments) {
  const [first] = segments;
  return segments
    .reduce(
      (d, [, p1, p2, p3]) =>
        `${d} C ${round(p1.x)} ${round(p1.y)}, ${round(p2.x)} ${round(p2.y)}, ${round(p3.x)} ${round(p3.y)}`,
      `M ${round(first[0].x)} ${round(first[0].y)}`,
    )
    .trim();
}

/**
 * Picks the shortest route from the logo to the fold tip that provably clears
 * every obstacle, by trying corners in the gaps the layout actually leaves:
 * one clearance outside each obstacle edge, plus the margins and the tip's own
 * band. Writes the winner onto the path.
 *
 * @returns whether a clear route was found. If not, the caller keeps the line
 *   hidden and lets the dot travel alone — the narrow-viewport case, where the
 *   type leaves no free corridor to route through.
 */
function wordmarkRect() {
  const el = document.querySelector(".yo-hero__wordmark");
  return el ? restingRect(el) : null;
}

function copyBlockBottom(root) {
  const els = root.querySelectorAll(
    ".yo-hero__title-mask, .yo-hero__support, .yo-hero__cta",
  );
  let bottom = 0;
  els.forEach((el) => {
    const r = restingRect(el);
    if (r.bottom > bottom) bottom = r.bottom;
  });
  return bottom;
}

/**
 * Shorter is better, but routes that drop under the wordmark or hug the
 * viewport floor read as a second composition line. Penalise those so the
 * wisp stays in the empty band between the copy and the fold tip.
 */
function scoreRoute(length, segments, vh, wordmark) {
  let score = length;
  const floor = vh * 0.9;
  const under = wordmark ? wordmark.bottom : floor;
  for (const seg of segments) {
    for (let i = 0; i <= 24; i += 1) {
      const pt = cubicAt(seg, i / 24);
      if (pt.y > floor) score += 80;
      if (pt.y > under) score += 64;
    }
  }
  return score;
}

function isMostlyUnderWordmark(segments, wordmark) {
  if (!wordmark) return false;
  let under = 0;
  let n = 0;
  for (const seg of segments) {
    for (let i = 0; i <= 20; i += 1) {
      n += 1;
      if (cubicAt(seg, i / 20).y > wordmark.bottom - 6) under += 1;
    }
  }
  return n > 0 && under / n > 0.28;
}

function fallbackPath(start, target) {
  return segmentsToPath([
    [
      start,
      { x: start.x, y: start.y + (target.y - start.y) * 0.58 },
      { x: start.x + (target.x - start.x) * 0.42, y: target.y },
      target,
    ],
  ]);
}

function fitJourneyPath(pathEl, start, target, rects, { hideTrail, root } = {}) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampX = gsap.utils.clamp(EDGE_MARGIN, vw - EDGE_MARGIN);
  const clampY = gsap.utils.clamp(EDGE_MARGIN, vh - EDGE_MARGIN);
  /* Rounded, so near-identical corridors collapse into one candidate. */
  const snap = (n) => Math.round(n / 4) * 4;
  const wordmark = wordmarkRect();

  if (hideTrail) {
    pathEl.setAttribute("d", fallbackPath(start, target));
    return false;
  }

  const xs = new Set([snap(clampX(start.x)), snap(clampX(target.x))]);
  const ys = new Set([snap(clampY(target.y))]);
  rects.forEach((r) => {
    xs.add(snap(clampX(r.left - PATH_CLEARANCE)));
    xs.add(snap(clampX(r.right + PATH_CLEARANCE)));
    ys.add(snap(clampY(r.bottom + PATH_CLEARANCE)));
    ys.add(snap(clampY(r.top - PATH_CLEARANCE)));
  });

  /* Seed the empty band between the copy block and the studio wordmark. */
  const bandTop = copyBlockBottom(root ?? document);
  const bandBottom = wordmark ? wordmark.top : vh * 0.82;
  if (bandBottom > bandTop + 24) {
    ys.add(snap(clampY((bandTop + bandBottom) / 2)));
    ys.add(snap(clampY(bandTop + PATH_CLEARANCE)));
    ys.add(snap(clampY(bandBottom - PATH_CLEARANCE)));
  }

  /* Prefer a generous gap; settle for a tighter one before giving up. */
  let best = null;
  for (const safety of PATH_SAFETY) {
    ys.forEach((y) => {
      xs.forEach((x) => {
        const segments = routeSegments(start, target, { x, y }, vh);
        const length = measureRoute(segments, rects, vw, vh, safety);
        if (length === null) return;
        const score = scoreRoute(length, segments, vh, wordmark);
        if (!best || score < best.score) {
          best = { segments, score };
        }
      });
    });
    if (best) break;
  }

  if (!best) {
    pathEl.setAttribute("d", fallbackPath(start, target));
    return false;
  }

  pathEl.setAttribute("d", segmentsToPath(best.segments));
  if (isMostlyUnderWordmark(best.segments, wordmark)) return false;
  return true;
}

/**
 * Drives the one-shot hero entrance.
 *
 * CSS holds the *final* hero as its default state, so no-JS, reduced-motion and
 * already-played renders are correct with nothing applied. This hook writes the
 * opening state with `gsap.set` inside a layout effect (before paint) and only
 * when it is actually going to animate.
 */
export default function useHeroEntrance({ rootRef, journeyRef, isRtl, onDone }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const isRtlRef = useRef(isRtl);
  isRtlRef.current = isRtl;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const q = gsap.utils.selector(root);
    const foldGroup = q(".yo-hero__fold-group")[0];
    const curl = q(".yo-hero__fold-curl")[0];
    const curlShadow = q(".yo-hero__fold-curl-shadow")[0];
    const marker = q(".yo-hero__fold-marker")[0];
    const mediaInner = q(".yo-hero__media-inner")[0];
    const titleMasks = q(".yo-hero__title-mask");
    const support = q(".yo-hero__support")[0];
    const cta = q(".yo-hero__cta")[0];

    const journey =
      journeyRef.current ?? document.querySelector(".yo-hero-journey");
    const dot = journey?.querySelector(".yo-hero-journey__dot") ?? null;
    const trail = journey?.querySelector(".yo-hero-journey__trail-path") ?? null;

    const animated = [
      foldGroup,
      curl,
      curlShadow,
      marker,
      mediaInner,
      ...titleMasks,
      support,
      cta,
      dot,
      trail,
    ].filter(Boolean);

    let completed = false;

    /** Drop every inline style so the designed CSS state is what remains. */
    const applyFinalState = () => {
      setLogoDotDetached(false);
      setHeroEntranceActive(false);
      if (animated.length) gsap.set(animated, { clearProps: "all" });
      root.dataset.entrance = "done";
      document.documentElement.classList.remove(LOCK_CLASS);
      markPageIntroReady();
      delete window.__yoHeroT0;
    };

    /** Terminal path: entrance is over for this page load. */
    const complete = () => {
      if (completed) return;
      completed = true;
      heroEntrancePlayed = true;
      applyFinalState();
      onDoneRef.current?.();
    };

    const skip = prefersReducedMotion() || heroEntrancePlayed || hasDeepLink();
    if (skip || !foldGroup || !mediaInner || !titleMasks.length) {
      complete();
      return undefined;
    }

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const foldShift =
      mediaInner.getBoundingClientRect().width *
      (isMobile ? FOLD_SHIFT_MOBILE : FOLD_SHIFT_DESKTOP);
    const wipeFrom = isRtlRef.current
      ? "inset(0% 0% 0% 100%)"
      : "inset(0% 100% 0% 0%)";

    root.dataset.entrance = "playing";
    document.documentElement.classList.add(LOCK_CLASS);
    setHeroEntranceActive(true);
    window.__yoHeroT0 = performance.now();

    /* Opening state, written before the first paint. */
    gsap.set(foldGroup, { x: foldShift, rotate: 0.22, transformOrigin: "100% 0%" });
    gsap.set(curl, { y: 3, scale: 0.98, transformOrigin: "50% 100%" });
    gsap.set(curlShadow, { opacity: 0 });
    gsap.set(marker, { opacity: 0, scale: 0.6 });
    gsap.set(mediaInner, { opacity: 0, y: 10 });
    gsap.set(titleMasks, { clipPath: wipeFrom });
    gsap.set(support, { opacity: 0, y: 8 });
    gsap.set(cta, { opacity: 0, y: 6 });
    if (dot) gsap.set(dot, { opacity: 0, scale: 0.7, xPercent: -50, yPercent: -50 });

    let pathLength = 0;
    const travel = { p: 0 };
    const tl = gsap.timeline({ onComplete: complete });

    /* PHASE 1 — image settles in behind the still-closed fold. */
    tl.to(mediaInner, { opacity: 1, duration: 0.55, ease: "power2.out" }, T.mediaIn);

    /* PHASE 2 — the logo period hands off to the travelling dot, then flies. */
    if (dot && trail) {
      tl.call(
        () => {
          const start = centerOf(document.querySelector("[data-yo-logo-dot]"));
          if (!start) return;

          gsap.set(dot, { x: start.x, y: start.y });
          setLogoDotDetached(true);

          const target = centerOf(marker);
          if (!target) return;

          /* Only a provably clear route gets drawn; otherwise the dot flies
             alone. Mobile always hides the wisp so it cannot cross the type. */
          const clear = fitJourneyPath(
            trail,
            start,
            target,
            obstacleRects(root),
            { hideTrail: isMobile, root },
          );
          pathLength = trail.getTotalLength();

          /*
           * One dash of TRAIL_TAIL with a gap longer than the path, so exactly
           * one wisp exists. Offset `tail` hides it at the start and
           * `tail - length` leaves it sitting on the final stretch.
           */
          gsap.set(trail, {
            opacity: clear ? 1 : 0,
            strokeDasharray: `${TRAIL_TAIL} ${pathLength + TRAIL_TAIL}`,
            strokeDashoffset: TRAIL_TAIL,
          });
        },
        null,
        T.detach,
      );
      tl.to(dot, { opacity: 1, scale: 1, duration: 0.16, ease: "power2.out" }, T.detach);

      /* Sampling the path each frame keeps the dot and the line tip together. */
      tl.to(
        travel,
        {
          p: 1,
          duration: T.travelDur,
          ease: "sine.inOut",
          onUpdate: () => {
            if (!pathLength) return;
            const pt = trail.getPointAtLength(travel.p * pathLength);
            gsap.set(dot, { x: pt.x, y: pt.y });
          },
        },
        T.travel,
      );
      tl.to(
        trail,
        {
          strokeDashoffset: () => TRAIL_TAIL - pathLength,
          duration: T.travelDur,
          ease: "sine.inOut",
        },
        T.travel,
      );

      /* Arrival: a small grip, then a held beat before the fold answers. */
      tl.to(dot, { scale: 1.08, duration: 0.16, ease: "power2.out" }, T.arrive);
      tl.to(dot, { scale: 1, duration: 0.18, ease: "sine.inOut" }, T.arrive + 0.16);
    }

    /* PHASE 3 — the tip lifts as if pulled, and the fold cracks open. */
    tl.to(curl, { y: -2, scale: 1.03, duration: 0.36, ease: "power2.out" }, T.foldReact);
    tl.to(curlShadow, { opacity: 1, duration: 0.42, ease: "power2.out" }, T.foldReact);
    tl.to(
      foldGroup,
      { x: foldShift * 0.72, duration: 0.4, ease: "power2.out" },
      T.foldReact,
    );

    /* PHASE 4 — masked wipe per line; the glyphs themselves never move. */
    tl.to(
      titleMasks[0],
      { clipPath: "inset(0% 0% 0% 0%)", duration: 0.52, ease: "power3.out" },
      T.titleA,
    );
    if (titleMasks[1]) {
      tl.to(
        titleMasks[1],
        { clipPath: "inset(0% 0% 0% 0%)", duration: 0.52, ease: "power3.out" },
        T.titleB,
      );
    }

    /* PHASE 5 — fold completes its travel, uncovering more of the image. */
    tl.to(
      foldGroup,
      { x: 0, rotate: 0, duration: T.foldOpenDur, ease: "power2.out" },
      T.foldOpen,
    );
    tl.to(curl, { y: 0, scale: 1, duration: 0.5, ease: "power2.out" }, T.foldOpen);
    tl.to(
      mediaInner,
      { y: 0, duration: T.foldOpenDur, ease: "power2.out" },
      T.foldOpen,
    );

    /* PHASE 6 — supporting line, then the CTA. */
    tl.to(support, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, T.support);
    tl.to(cta, { opacity: 1, y: 0, duration: 0.38, ease: "power2.out" }, T.cta);

    /* PHASE 7 — the dot becomes the permanent marker on the fold tip. */
    tl.to(marker, { opacity: 1, scale: 1, duration: 0.24, ease: "power2.out" }, T.handoff);
    if (dot) {
      tl.to(dot, { opacity: 0, duration: 0.22, ease: "power1.inOut" }, T.handoff);
    }
    if (trail) {
      tl.to(trail, { opacity: 0, duration: 0.3, ease: "power1.inOut" }, T.handoff);
    }
    /* The logo reads "y." again while its period stays on the fold. */
    tl.call(() => setLogoDotDetached(false), null, T.handoff + 0.06);

    /* Holds the timeline open to the designed settle point. */
    tl.to({}, { duration: 0.01 }, T.settle);

    /*
     * A width change invalidates the measured dot path, so land on the final
     * hero instead of finishing with stale geometry. Height-only changes
     * (mobile URL bar) are ignored.
     */
    let lastWidth = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      tl.kill();
      complete();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      tl.kill();
      setLogoDotDetached(false);
      setHeroEntranceActive(false);
      document.documentElement.classList.remove(LOCK_CLASS);
      /* Not `complete()` — an unmount must stay replayable (Strict Mode, HMR).
         Do not mark the intro ready or the played flag here, or Lenis would
         start and the remount would skip the sequence. */
      if (!completed && animated.length) gsap.set(animated, { clearProps: "all" });
    };
  }, [rootRef, journeyRef]);
}
