/** Shared intro → hero sequence state (survives PageIntro unmount). */

export const INTRO_PHASE = {
  IDLE: "idle",
  PLAYING: "playing",
  HANDOFF: "handoff",
  SETTLED: "settled",
};

let phase = INTRO_PHASE.IDLE;
const phaseListeners = new Set();

let stageEl = null;
let boundsApi = null;
let invertMaterials = false;

export function getIntroPhase() {
  return phase;
}

export function setIntroPhase(next) {
  if (phase === next) return;
  phase = next;
  phaseListeners.forEach((fn) => fn(next));
}

/** @returns unsubscribe */
export function onIntroPhase(fn) {
  phaseListeners.add(fn);
  fn(phase);
  return () => phaseListeners.delete(fn);
}

export function bindIntroLogoStage(el, api) {
  stageEl = el;
  boundsApi = api;
}

export function clearIntroLogoStage() {
  stageEl = null;
  boundsApi = null;
}

export function getIntroLogoStage() {
  return stageEl;
}

export function readIntroMarkBounds() {
  return boundsApi?.() ?? null;
}

export function shouldInvertIntroMaterials() {
  return invertMaterials;
}

export function setInvertIntroMaterials(next) {
  invertMaterials = Boolean(next);
}

let modelReadyHandler = null;
let modelErrorHandler = null;

export function setIntroModelReadyHandler(fn) {
  modelReadyHandler = fn;
}

export function setIntroModelErrorHandler(fn) {
  modelErrorHandler = fn;
}

export function notifyIntroModelReady() {
  modelReadyHandler?.();
}

export function notifyIntroModelError() {
  modelErrorHandler?.();
}
