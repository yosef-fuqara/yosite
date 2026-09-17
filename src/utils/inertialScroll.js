/** Gentle exponential-out — long, quiet coast after the last input. */
export function inertialEase(t) {
  return 1 - (1 - t) ** 3.2;
}

export const INERTIAL_SCROLL_TO = {
  duration: 1.45,
  easing: inertialEase,
};

/** Refresh starts at the hero. Hash deep-links wait until the intro unlocks. */
export const SCROLL_RESTORATION = "manual";

export function applyScrollRestoration() {
  if (!("scrollRestoration" in history)) return;
  history.scrollRestoration = SCROLL_RESTORATION;
}

export function isTopHash(href) {
  return !href || href === "#" || href === "#top";
}

let resolvedStartHash;
let startHashReleased = false;

function readStartHash() {
  if (resolvedStartHash !== undefined) return resolvedStartHash;
  const stored = window.__yoStartHash;
  if (stored) {
    resolvedStartHash = stored;
    return stored;
  }
  const hash = window.location.hash;
  resolvedStartHash = isTopHash(hash) ? null : hash;
  return resolvedStartHash;
}

/** null = home, string = section hash, undefined = already applied */
export function consumeStartHash() {
  if (startHashReleased) return undefined;
  startHashReleased = true;
  const hash = readStartHash();
  window.__yoStartHash = undefined;
  return hash;
}

export const INERTIAL_OPTIONS = {
  autoRaf: true,
  autoToggle: true,
  lerp: 0.068,
  wheelMultiplier: 0.88,
  syncTouch: false,
  overscroll: true,
  anchors: INERTIAL_SCROLL_TO,
  prevent: (node) =>
    Boolean(
      node?.classList?.contains("build-ticker-viewport") ||
        node?.hasAttribute?.("data-lenis-prevent"),
    ),
};
