/**
 * The hero entrance borrows the period from the nav "y." logo: it hides the
 * real glyph and flies a stand-in dot to the fold tip. LogoMark lives in the
 * navbar, so the two components talk through this module rather than props.
 */
let detached = false;
const listeners = new Set();

let entranceActive = false;
const activeListeners = new Set();

export function isLogoDotDetached() {
  return detached;
}

export function setLogoDotDetached(next) {
  const value = Boolean(next);
  if (detached === value) return;
  detached = value;
  listeners.forEach((fn) => fn(value));
}

/** @returns unsubscribe */
export function onLogoDotDetached(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isHeroEntranceActive() {
  return entranceActive;
}

export function setHeroEntranceActive(next) {
  const value = Boolean(next);
  if (entranceActive === value) return;
  entranceActive = value;
  activeListeners.forEach((fn) => fn(value));
}

/** @returns unsubscribe */
export function onHeroEntranceActive(fn) {
  activeListeners.add(fn);
  return () => activeListeners.delete(fn);
}
