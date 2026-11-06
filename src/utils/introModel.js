import { Box3, Vector3 } from "three";

export const INTRO_MODEL_URL = "/models/yosite-intro.glb";

/** Clip length in the delivery GLB — all actions share this window. */
export const INTRO_CLIP_DURATION = 1.883;

/** Base playback vs the baked clip (slower than realtime). */
export const INTRO_PLAYBACK_RATE = 0.5;

/** Jumps play this much faster than the current base rate. */
export const INTRO_JUMP_SPEED_BOOST = 1.5;

/** Clip time: second landing has settled and the mark has broken. */
export const INTRO_JUMP_END = 0.8;

/**
 * Opening in use.
 * "jump" is the original baked bounce — ball hops, letter splits, then the
 * mark rises. Frozen here, not deleted. Set this back to "jump" to play it.
 * "rise" holds one clip pose and brings it up from below the screen,
 * then the original rise into the nav plays unchanged.
 */
export const INTRO_ENTRANCE = "rise";

/** Clip time held during the rise entrance. 0 is the connected Y (center intact,
 *  ball at rest). 0.85 is the broken letter after the second landing. */
export const INTRO_HOLD_POSE = 0;

/** Clip time: arms have split, the center is gone, and the ball is back at rest. */
export const INTRO_BROKEN_POSE = 0.85;

/** Mark travels from below the viewport and settles in the center. */
export const INTRO_RISE_IN = 0.98;

/** Stillness in the center before the mark and the black field rise together. */
export const INTRO_RISE_SETTLE = 0.28;

/** Site accent. The intro ball keeps this color. */
export const INTRO_DOT_COLOR = "#ff334e";

/** Clip time: gaze has returned to center / looking forward. */
export const INTRO_GAZE_END = 1.217;

/** Extra wall-clock hold after looking forward again. */
export const INTRO_FORWARD_HOLD = 0;

export const INTRO_JUMP_RATE = INTRO_PLAYBACK_RATE * INTRO_JUMP_SPEED_BOOST;

export const INTRO_JUMP_WALL = INTRO_JUMP_END / INTRO_JUMP_RATE;
export const INTRO_GAZE_WALL =
  (INTRO_GAZE_END - INTRO_JUMP_END) / INTRO_PLAYBACK_RATE;
export const INTRO_TAIL_START_WALL =
  INTRO_JUMP_WALL + INTRO_GAZE_WALL + INTRO_FORWARD_HOLD;

/**
 * Second rise: the mark leaves the center for the nav on a fixed x,
 * and the black field lifts with it to uncover the page.
 */
export const INTRO_HANDOFF = 0.88;

/** Parked nav size vs matching the target 1:1. ~15% smaller than a full fit. */
export const INTRO_HANDOFF_SIZE = 0.85;

export const INTRO_HANDOFF_AT_WALL = INTRO_TAIL_START_WALL;

/** When the nav rise starts. The jump clock stays intact for the frozen opening. */
export function introHandoffAt() {
  if (INTRO_ENTRANCE === "rise") return INTRO_RISE_IN + INTRO_RISE_SETTLE;
  return INTRO_HANDOFF_AT_WALL;
}

const _markBox = new Box3();
const _markVec = new Vector3();

/**
 * Map wall-clock seconds onto baked clip time:
 * faster jumps, then current-rate gaze, then freeze looking forward.
 * The GLB curtain tail is not played — the DOM handoff replaces it.
 */
export function clipTimeFromElapsed(elapsed) {
  const t = Math.max(0, elapsed);

  if (t <= INTRO_JUMP_WALL) {
    return t * INTRO_JUMP_RATE;
  }

  if (t <= INTRO_JUMP_WALL + INTRO_GAZE_WALL) {
    return INTRO_JUMP_END + (t - INTRO_JUMP_WALL) * INTRO_PLAYBACK_RATE;
  }

  return INTRO_GAZE_END;
}

/**
 * World units mapped to the shorter viewport edge.
 * Larger = smaller mark. 7.6 keeps it near ~26vmin instead of filling the view.
 */
export const INTRO_FRUSTUM = 7.6;

export const INTRO_PULSE = 0.36;

export const INTRO_LOAD_TIMEOUT_MS = 8000;

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") || canvas.getContext("webgl"),
    );
  } catch {
    return false;
  }
}

export function fitIntroCamera(camera, width, height) {
  if (!camera?.isOrthographicCamera) return;
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  camera.position.set(0, 0, 8);
  camera.near = 0.1;
  camera.far = 1000;
  camera.zoom = Math.min(w, h) / INTRO_FRUSTUM;
  camera.updateProjectionMatrix();
}

export function isIntroCurtainName(name) {
  return /curtain/i.test(name || "");
}

export function fallbackIntroMarkRect() {
  const vmin = Math.min(window.innerWidth, window.innerHeight);
  const size = Math.min(Math.max(vmin * 0.26, 140), 200);
  return {
    left: (window.innerWidth - size) / 2,
    top: (window.innerHeight - size) / 2,
    width: size,
    height: size,
  };
}

/** Project the visible intro meshes into a viewport rect. */
export function measureIntroMarkScreen(root, camera, gl) {
  if (!root || !camera || !gl?.domElement) return null;

  _markBox.makeEmpty();
  root.updateWorldMatrix(true, true);
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.visible) return;
    if (isIntroCurtainName(obj.name)) return;
    _markBox.expandByObject(obj);
  });

  if (_markBox.isEmpty()) return null;

  const rect = gl.domElement.getBoundingClientRect();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < 8; i += 1) {
    _markVec
      .set(
        i & 1 ? _markBox.max.x : _markBox.min.x,
        i & 2 ? _markBox.max.y : _markBox.min.y,
        i & 4 ? _markBox.max.z : _markBox.min.z,
      )
      .project(camera);
    const x = rect.left + (_markVec.x * 0.5 + 0.5) * rect.width;
    const y = rect.top + (-_markVec.y * 0.5 + 0.5) * rect.height;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  const width = maxX - minX;
  const height = maxY - minY;
  if (width < 4 || height < 4) return null;

  return { left: minX, top: minY, width, height };
}

/**
 * Move the mark from viewport center to the nav "y."
 * Scale around the stage center (50% 50%). The wrapper stays viewport-centered;
 * GSAP x/y place the mark on the nav slot so it does not snap at the end.
 */
export function measureIntroHandoff(markRect, targetEl, stageEl) {
  const mark =
    markRect && markRect.width > 4 && markRect.height > 4
      ? markRect
      : fallbackIntroMarkRect();
  const target = targetEl?.getBoundingClientRect();
  const stage = stageEl?.getBoundingClientRect();

  if (!target || target.width < 1 || target.height < 1) return null;

  const markCx = mark.left + mark.width * 0.5;
  const markCy = mark.top + mark.height * 0.5;
  const toCx = target.left + target.width * 0.5;
  const toCy = target.top + target.height * 0.5;
  const stageW = stage?.width || window.innerWidth;
  const stageH = stage?.height || window.innerHeight;
  const originX = stage ? stage.left + stageW * 0.5 : window.innerWidth * 0.5;
  const originY = stage ? stage.top + stageH * 0.5 : window.innerHeight * 0.5;
  const scale = Math.min(
    Math.max((target.height / mark.height) * INTRO_HANDOFF_SIZE, 0.04),
    1,
  );

  const x = toCx - (originX + (markCx - originX) * scale);
  let y = toCy - (originY + (markCy - originY) * scale);

  /* Protect the visible mark, not the transparent canvas around it. */
  const visualTop = originY + y + (mark.top - originY) * scale;
  if (visualTop < 8) {
    y += 8 - visualTop;
  }

  return {
    x,
    y,
    scale,
    originX,
    originY,
    originXPercent: 50,
    originYPercent: 50,
    shiftX: 0,
  };
}
