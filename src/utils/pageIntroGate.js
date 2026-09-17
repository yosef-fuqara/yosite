/** Hero peripheral chrome (nav, year, aside, audio) share this beat after intro. */
export const HERO_MARKS_START_MS = 0;

/** One-shot signal: splash / page intro has finished (or started revealing). */
let ready = false;
const listeners = new Set();

let marksReady = false;
const marksListeners = new Set();
let marksTimer = 0;

/** Sticky chrome (nav, audio, right rail) can appear before the intro overlay drops. */
let stickyReady = false;
const stickyListeners = new Set();

/** After the 3D intro handoff, keep the intro mark in the nav instead of "y." */
let introNavMark = false;
const introNavMarkListeners = new Set();

export function isPageIntroReady() {
  return ready;
}

export function markHeroMarksReady() {
  if (marksReady) return;
  marksReady = true;
  window.clearTimeout(marksTimer);
  document.documentElement.classList.remove("yo-hero-chrome-hold");
  marksListeners.forEach((fn) => fn());
  marksListeners.clear();
}

export function isHeroMarksReady() {
  return marksReady;
}

/** @returns unsubscribe */
export function onHeroMarksReady(fn) {
  if (marksReady) {
    fn();
    return () => {};
  }
  marksListeners.add(fn);
  return () => marksListeners.delete(fn);
}

export function markPageIntroReady() {
  if (ready) return;
  ready = true;
  markStickyChromeReady();
  markHeroMarksReady();
  listeners.forEach((fn) => fn());
  listeners.clear();
}

/** @returns unsubscribe */
export function onPageIntroReady(fn) {
  if (ready) {
    fn();
    return () => {};
  }
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isStickyChromeReady() {
  return stickyReady;
}

export function markStickyChromeReady() {
  if (stickyReady) return;
  stickyReady = true;
  stickyListeners.forEach((fn) => fn());
  stickyListeners.clear();
}

/** @returns unsubscribe */
export function onStickyChromeReady(fn) {
  if (stickyReady) {
    fn();
    return () => {};
  }
  stickyListeners.add(fn);
  return () => stickyListeners.delete(fn);
}

export function isIntroNavMarkSettled() {
  return introNavMark;
}

export function markIntroNavMarkSettled() {
  if (introNavMark) return;
  introNavMark = true;
  introNavMarkListeners.forEach((fn) => fn());
  introNavMarkListeners.clear();
}

/** @returns unsubscribe */
export function onIntroNavMarkSettled(fn) {
  if (introNavMark) {
    fn();
    return () => {};
  }
  introNavMarkListeners.add(fn);
  return () => introNavMarkListeners.delete(fn);
}

