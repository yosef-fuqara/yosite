import {
  CatmullRomCurve3,
  CubicBezierCurve3,
  Matrix4,
  Quaternion,
  Vector3,
} from "three";

/** Meters of the flight plane visible across the viewport height. */
export const WORLD_HEIGHT = 0.7;

/** Desktop path scale. Mobile stays at 1. The filmed entrance uses this, not the perch size. */
export const DESKTOP_BUTTERFLY_SCALE = 1.5;

/**
 * Camera-facing perched silhouette at scale 1.
 * Feet sit on the bottom edge. Measured from the landing pose.
 */
export const PERCH_SILHOUETTE = { width: 0.07112, height: 0.06413 };

/** Perched wings overrun the W so the letter reads as occupied, not decorated. */
const W_COVER = 1.52;

export const BUTTERFLY_GLB_URL = "/models/butterfly-animated.glb?v=hero-warm";

/** Authored Blender clips. The hero does not invent this flight in the browser. */
export const HERO_CLIP = "HERO_ENTRY_H_LAND";
export const PERCH_CLIP = "PERCHED_IDLE_H";

/**
 * Foot contact on the landing frame, in Three.js meters.
 * Measured from the posed body in Blender (glTF Y-up).
 */
export const HERO_FOOT_LOCAL = { x: 0.000000, y: -0.010641, z: -0.016898 };

const ROUTE_LIMIT = 8;

export function butterflyDisplayScale(width, coarse) {
  if (coarse || width < 768) return 1;
  return DESKTOP_BUTTERFLY_SCALE;
}

/** Visual size. The flight path stays at `pathScale`; only the butterfly grows. */
export function butterflyCoverScale(widthPx, heightPx, viewportHeight, pathScale) {
  const unit = WORLD_HEIGHT / Math.max(viewportHeight, 1);
  const byWidth = (widthPx * unit * W_COVER) / PERCH_SILHOUETTE.width;
  const byHeight = (heightPx * unit * 0.92) / PERCH_SILHOUETTE.height;
  return Math.max(byWidth, byHeight, pathScale || 1);
}

function smootherstep01(value) {
  const t = clamp(value, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Bend only the ending onto the W.
 * `rootX` is the filmed translation (negative while still approaching).
 * `gap` is the world distance from the original H landing to the W.
 * The opening of the clip stays on the filmed path. The aim eases in
 * before the butterfly reaches the W, then the filmed settle finishes the landing.
 */
export function landingRetarget(rootX, pathScale, gap) {
  const distance = Math.max(0, gap);
  const remaining = Math.max(0, -rootX * pathScale);
  const lead = 0.24;
  const commit = 0.07;
  const start = distance + lead;
  const span = Math.max(0.0001, start - commit);
  const aim = smootherstep01(1 - (remaining - commit) / span);
  const arc = Math.sin(Math.PI * aim) * clamp(distance * 0.1, 0, 0.018);
  return { aim, arc };
}

const _x = new Vector3();
const _y = new Vector3();
const _z = new Vector3();
const _head = new Vector3();
const _basis = new Quaternion();
const _targetQ = new Quaternion();
const _basisM = new Matrix4();
const _metric = new Vector3();

function smoothstep(edge0, edge1, value) {
  const span = edge1 - edge0;
  if (span === 0) return value >= edge1 ? 1 : 0;
  const t = Math.min(1, Math.max(0, (value - edge0) / span));
  return t * t * (3 - 2 * t);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function carrotSpeed(t, hero) {
  const fadeIn = smoothstep(0, hero ? 0.06 : 0.1, t);
  if (!hero) {
    const fadeOut = 1 - smoothstep(0.82, 1, t);
    const burst = smoothstep(0.04, 0.14, t) * (1 - smoothstep(0.28, 0.44, t));
    return (0.58 + burst * 0.3) * Math.max(0.42, fadeIn) * Math.max(0.38, fadeOut);
  }

  const fade = 1 - smoothstep(0.52, 0.96, t);
  return (0.075 + 0.56 * fade) * Math.max(0.5, fadeIn);
}

/**
 * Screen fractions, origin top-left, into flight space.
 * X is scaled by aspect so one unit matches the viewport height on both axes.
 */
export function screenPointToMetric(nx, ny, aspect, out) {
  out.x = nx * aspect;
  out.y = 1 - ny;
  out.z = 0;
  return out;
}

export function metricToWorld(x, y, aspect, out) {
  const nx = aspect > 0 ? x / aspect : 0.5;
  out.x = (nx - 0.5) * WORLD_HEIGHT * aspect;
  out.y = (y - 0.5) * WORLD_HEIGHT;
  out.z = 0;
  return out;
}

export function createFlightState() {
  const routePoints = Array.from({ length: ROUTE_LIMIT }, () => new Vector3());
  return {
    curve: new CubicBezierCurve3(new Vector3(), new Vector3(), new Vector3(), new Vector3()),
    routeCurve: new CatmullRomCurve3(routePoints.slice(0, 2), false, "catmullrom", 0.42),
    routePoints,
    routeCount: 0,
    usingRoute: false,
    pos: new Vector3(),
    vel: new Vector3(),
    target: new Vector3(),
    carrot: new Vector3(),
    heading: new Vector3(1, 0, 0),
    visual: new Vector3(),
    world: new Vector3(),
    carrotT: 1,
    length: 1,
    version: -1,
    mode: "IDLE",
    modeHold: 0,
    settled: true,
    ready: false,
    aspect: 1,
    overshoot: false,
    hero: false,
    perch: false,
    bank: 0,
    pitch: 0.2,
    phase: Math.random() * Math.PI * 2,
    phase2: Math.random() * Math.PI * 2,
    prevSpeed: 0,
    prevHeading: 0,
    elapsed: 0,
  };
}

function buildCurve(state, simple) {
  const from = state.pos;
  const to = state.target;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 0.0001;
  const inv = 1 / dist;
  const dirX = dx * inv;
  const dirY = dy * inv;
  const perpX = -dirY;
  const perpY = dirX;
  const sign = Math.random() < 0.5 ? -1 : 1;
  const bow = sign * dist * (simple ? 0.13 : 0.17 + Math.random() * 0.1);
  const lift = (Math.random() - 0.5) * dist * (simple ? 0.025 : 0.055);
  state.overshoot = !simple && Math.random() < 0.42;
  state.usingRoute = false;
  state.hero = false;
  state.perch = false;

  const curve = state.curve;
  curve.v0.copy(from);
  curve.v3.copy(to);
  curve.v1.set(from.x + dx * 0.3 + perpX * bow, from.y + dy * 0.3 + perpY * bow + lift, 0);
  if (state.overshoot) {
    curve.v2.set(to.x + dirX * dist * 0.05 + perpX * bow * 0.12, to.y + dirY * dist * 0.05 + perpY * bow * 0.12, 0);
  } else {
    curve.v2.set(
      from.x + dx * 0.68 + perpX * bow * 0.42,
      from.y + dy * 0.68 + perpY * bow * 0.42 + lift * 0.3,
      0,
    );
  }

  curve.needsUpdate = true;
  state.length = Math.max(curve.getLength(), 0.0001);
  state.carrotT = 0;
  curve.getPointAt(0, state.carrot);
  state.settled = false;
  state.modeHold = 0;
}

function buildRoute(state, points, aspect, hero, perch) {
  const count = Math.max(2, Math.min(ROUTE_LIMIT, points.length));
  state.routeCount = count;
  state.usingRoute = true;
  state.hero = Boolean(hero);
  state.perch = Boolean(perch);
  state.overshoot = false;

  for (let i = 0; i < count; i += 1) {
    screenPointToMetric(points[i].nx, points[i].ny, aspect, state.routePoints[i]);
  }

  const curve = state.routeCurve;
  curve.points = state.routePoints.slice(0, count);
  curve.tension = hero ? 0.46 : 0.4;
  curve.curveType = "catmullrom";
  curve.needsUpdate = true;
  state.length = Math.max(curve.getLength(), 0.0001);
  state.pos.copy(state.routePoints[0]);
  state.target.copy(state.routePoints[count - 1]);
  state.vel.set(0, 0, 0);
  state.carrotT = 0;
  curve.getPointAt(0, state.carrot);
  state.settled = false;
  state.modeHold = hero ? 0.15 : 0;
  if (hero) state.mode = "FLY";

  const next = state.routePoints[1];
  const hx = next.x - state.pos.x;
  const hy = next.y - state.pos.y;
  const hm = Math.hypot(hx, hy);
  if (hm > 0.0001) {
    state.heading.set(hx / hm, hy / hm, 0);
    state.prevHeading = Math.atan2(state.heading.y, state.heading.x);
  }
}

function placeOnScreen(state, destination, aspect) {
  screenPointToMetric(destination.nx, destination.ny, aspect, state.pos);
  state.target.copy(state.pos);
  state.carrot.copy(state.pos);
  state.vel.set(0, 0, 0);
  state.aspect = aspect;
  state.carrotT = 1;
  state.settled = true;
  state.usingRoute = false;
  state.hero = Boolean(destination.hero);
  state.perch = Boolean(destination.perch);
  state.ready = true;
  if (state.perch) {
    state.heading.set(1, 0.05, 0);
    state.pitch = 0.34;
    state.bank = 0.08;
    state.mode = "REST";
  }
}

function updateMode(state, dt, speed, accel, turnRate) {
  let desired = "GLIDE";

  if (state.hero) {
    if (state.settled && speed < 0.1) desired = "REST";
    else if (state.carrotT < 0.6 && speed > 0.1) desired = "FLY";
    else desired = "GLIDE";
  } else {
    const active =
      speed > 0.62 ||
      (state.carrotT < 0.46 && speed > 0.18 && accel > 0.4) ||
      (speed > 0.24 && Math.abs(turnRate) > 2.1);
    if (active && !state.settled) desired = "FLY";
    if (!state.settled && accel < -0.22 && speed < 0.72) desired = "GLIDE";
    if (state.settled && speed < 0.12) desired = "IDLE";
  }

  state.modeHold -= dt;
  if (desired !== state.mode && state.modeHold <= 0) {
    state.mode = desired;
    state.modeHold = state.hero ? 0.36 : 0.42;
  }
}

function sampleCurve(state) {
  if (state.usingRoute) state.routeCurve.getPointAt(state.carrotT, state.carrot);
  else state.curve.getPointAt(state.carrotT, state.carrot);
}

/**
 * Advance the in-place flight sim. Mutates `state` only.
 * `destination` is `{ nx, ny, version, route, hero, perch }`.
 * Screen fractions use a top-left origin. Increment `version` to dispatch a new path.
 */
export function stepFlight(state, dt, destination, options) {
  const aspect = options.aspect;
  const simple = options.simple;
  const reduced = options.reduced;

  if (!(aspect > 0)) return;

  if (!state.ready) {
    state.aspect = aspect;
    state.ready = true;
    state.version = destination.version - 1;
  }

  if (reduced) {
    if (destination.version !== state.version) {
      state.version = destination.version;
      placeOnScreen(state, destination, aspect);
    }
    state.vel.set(0, 0, 0);
    state.mode = state.perch ? "REST" : "IDLE";
    state.settled = true;
    state.bank += ((state.perch ? 0.08 : 0) - state.bank) * (1 - Math.exp(-4 * dt));
    state.pitch += ((state.perch ? 0.34 : 0.16) - state.pitch) * (1 - Math.exp(-4 * dt));
    state.visual.copy(state.pos);
    return;
  }

  const step = Math.min(Math.max(dt, 0), 0.05);

  if (Math.abs(aspect - state.aspect) > 0.001) {
    const nx = state.aspect > 0 ? state.pos.x / state.aspect : 0.5;
    const nyUp = state.pos.y;
    state.aspect = aspect;
    state.pos.set(nx * aspect, nyUp, 0);
    if (destination.route?.length && !state.settled) {
      buildRoute(state, destination.route, aspect, destination.hero, destination.perch);
      state.version = destination.version;
    } else {
      screenPointToMetric(destination.nx, destination.ny, aspect, state.target);
      if (state.settled) {
        state.pos.copy(state.target);
        state.carrot.copy(state.target);
        state.vel.set(0, 0, 0);
      }
    }
  }

  if (destination.version !== state.version) {
    state.version = destination.version;
    state.hero = Boolean(destination.hero);
    state.perch = Boolean(destination.perch);
    if (destination.route?.length) {
      buildRoute(state, destination.route, aspect, destination.hero, destination.perch);
    } else if (destination.place) {
      placeOnScreen(state, destination, aspect);
    } else {
      screenPointToMetric(destination.nx, destination.ny, aspect, state.target);
      const dx = state.target.x - state.pos.x;
      const dy = state.target.y - state.pos.y;
      if (Math.hypot(dx, dy) > 0.03) buildCurve(state, simple);
    }
  }

  if (state.settled && state.perch) {
    screenPointToMetric(destination.nx, destination.ny, aspect, state.target);
  }

  if (!state.settled && state.carrotT < 1) {
    const leadX = state.carrot.x - state.pos.x;
    const leadY = state.carrot.y - state.pos.y;
    const lead = Math.hypot(leadX, leadY);
    const maxLead = state.hero && state.carrotT > 0.72 ? 0.07 : 0.16;
    if (lead < maxLead) {
      const leadScale = 1 - smoothstep(maxLead * 0.45, maxLead, lead);
      const advance = (carrotSpeed(state.carrotT, state.hero) * Math.max(leadScale, 0.2) * step) / state.length;
      state.carrotT = Math.min(1, state.carrotT + advance);
      sampleCurve(state);
    }
  } else if (state.carrotT >= 1) {
    state.carrot.copy(state.target);
  }

  const dx = state.carrot.x - state.pos.x;
  const dy = state.carrot.y - state.pos.y;
  const dist = Math.hypot(dx, dy);
  const arriving = state.carrotT >= 0.999;
  const delicate = state.hero && state.carrotT > 0.74;
  const scheduled = arriving ? 0 : carrotSpeed(state.carrotT, state.hero);
  let desiredVx = 0;
  let desiredVy = 0;
  if (dist > 0.00001 && !(state.settled && state.perch)) {
    const catchUp = Math.min(dist * (delicate ? 3.4 : 2.4), delicate ? 0.16 : 0.3);
    const desiredSpeed = Math.min(1, scheduled + catchUp);
    desiredVx = (dx / dist) * desiredSpeed;
    desiredVy = (dy / dist) * desiredSpeed;
  }

  const accelRate = delicate ? 1.45 : arriving ? 2.35 : 5.6;
  let ax = (desiredVx - state.vel.x) * accelRate;
  let ay = (desiredVy - state.vel.y) * accelRate;
  const aMag = Math.hypot(ax, ay);
  const maxA = delicate ? 1.15 : arriving ? 2.2 : 3.3;
  if (aMag > maxA) {
    ax = (ax / aMag) * maxA;
    ay = (ay / aMag) * maxA;
  }

  state.vel.x += ax * step;
  state.vel.y += ay * step;

  const speedBefore = Math.hypot(state.vel.x, state.vel.y);
  const cap = delicate ? 0.42 : 1;
  if (speedBefore > cap) {
    state.vel.x = (state.vel.x / speedBefore) * cap;
    state.vel.y = (state.vel.y / speedBefore) * cap;
  }

  state.pos.x += state.vel.x * step;
  state.pos.y += state.vel.y * step;

  const speed = Math.hypot(state.vel.x, state.vel.y);
  const accel = (speed - state.prevSpeed) / (step || 1);
  state.prevSpeed = speed;

  let turnRate = 0;
  if (speed > 0.035 && !(state.settled && state.perch)) {
    const headingNow = Math.atan2(state.vel.y, state.vel.x);
    let turn = headingNow - state.prevHeading;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    turnRate = turn / (step || 1);
    state.prevHeading = headingNow;

    const aimX = state.vel.x / speed;
    const aimY = state.vel.y / speed;
    let hx = aimX;
    let hy = aimY;
    if (dist > 0.02) {
      hx = aimX * 0.74 + (dx / dist) * 0.26;
      hy = aimY * 0.74 + (dy / dist) * 0.26;
    }
    const k = 1 - Math.exp(-5.5 * step);
    state.heading.x += (hx - state.heading.x) * k;
    state.heading.y += (hy - state.heading.y) * k;
    const hm = Math.hypot(state.heading.x, state.heading.y) || 1;
    state.heading.x /= hm;
    state.heading.y /= hm;
  }

  const flare = state.hero ? smoothstep(0.62, 0.9, state.carrotT) : 0;
  if (flare > 0 && !state.settled) {
    state.heading.x += (1 - state.heading.x) * flare;
    state.heading.y += (0.05 - state.heading.y) * flare;
    const hm = Math.hypot(state.heading.x, state.heading.y) || 1;
    state.heading.x /= hm;
    state.heading.y /= hm;
  }

  const toTarget = Math.hypot(state.target.x - state.pos.x, state.target.y - state.pos.y);
  if (state.carrotT >= 1 && toTarget < (state.hero ? 0.028 : 0.018) && speed < (state.hero ? 0.04 : 0.032)) {
    state.settled = true;
  }

  if (state.settled && state.perch) {
    const stick = 1 - Math.exp(-14 * step);
    state.pos.x += (state.target.x - state.pos.x) * stick;
    state.pos.y += (state.target.y - state.pos.y) * stick;
    state.vel.x *= Math.exp(-12 * step);
    state.vel.y *= Math.exp(-12 * step);
    const hk = 1 - Math.exp(-4 * step);
    state.heading.x += (1 - state.heading.x) * hk;
    state.heading.y += (0.05 - state.heading.y) * hk;
    const hm = Math.hypot(state.heading.x, state.heading.y) || 1;
    state.heading.x /= hm;
    state.heading.y /= hm;
  } else if (state.settled && toTarget < 0.006 && speed < 0.02) {
    const settle = 1 - Math.exp(-7 * step);
    state.pos.x += (state.target.x - state.pos.x) * settle;
    state.pos.y += (state.target.y - state.pos.y) * settle;
    state.vel.x *= Math.exp(-8 * step);
    state.vel.y *= Math.exp(-8 * step);
  }

  updateMode(state, step, speed, accel, turnRate);

  const breathe = Math.sin(state.elapsed * 1.2 + state.phase) * 0.02;
  const bankTarget =
    state.mode === "REST"
      ? 0.1 + Math.sin(state.elapsed * 0.65 + state.phase2) * 0.018
      : (speed > 0.045 ? clamp(-turnRate * 0.2, -0.42, 0.42) : 0) * (1 - flare * 0.85);
  const climb = clamp(state.vel.y * 0.32, -0.28, 0.2);
  const pitchTarget = state.mode === "REST" ? 0.36 + breathe : climb * (1 - flare) + flare * 0.5;

  const pitchLerp = 1 - Math.exp(-3.6 * step);
  const bankEase = 1 - Math.exp((state.mode === "REST" ? -3 : -5) * step);
  state.bank += (bankTarget - state.bank) * bankEase;
  state.pitch += (pitchTarget - state.pitch) * pitchLerp;

  state.elapsed += step;
  if (state.mode === "REST") {
    state.visual.x = state.pos.x;
    state.visual.y = state.pos.y + Math.sin(state.elapsed * 1.15 + state.phase2) * 0.0014;
  } else {
    const amp = state.settled ? 0.004 : 0.0022;
    const floatAmp = delicate ? 0.002 : state.settled ? 0.008 : 0.0035;
    state.visual.x = state.pos.x + Math.sin(state.elapsed * 0.62 + state.phase) * amp;
    state.visual.y =
      state.pos.y +
      Math.sin(state.elapsed * 1.05 + state.phase2) * floatAmp +
      (simple ? 0 : Math.sin(state.elapsed * 0.37 + state.phase) * amp * 0.35);
  }
  state.visual.z = 0;
}

/**
 * Side / three-quarter orientation.
 * Local -Z (head) follows the heading. Local +X (the butterfly's right) faces the camera,
 * so the body reads in profile instead of as a flat top view.
 */
export function orientFlight(quaternion, headingX, headingY, bank, pitch, dt, snap, perched) {
  const hm = Math.hypot(headingX, headingY) || 1;
  const hx = headingX / hm;
  const hy = headingY / hm;
  const nose = clamp(pitch, -0.55, 0.72);
  const yaw = perched ? 0.36 : 0.24;
  const c = Math.cos(nose);
  const s = Math.sin(nose);

  _head.set(hx * c * Math.cos(yaw), hy * c * Math.cos(yaw) + s, Math.sin(yaw)).normalize();
  _z.copy(_head).multiplyScalar(-1);

  _x.set(0.04, -0.16 - bank * 0.85, 1);
  _x.addScaledVector(_z, -_x.dot(_z));
  if (_x.lengthSq() < 1e-6) _x.set(0, 0, 1);
  _x.normalize();
  if (_x.z < 0) _x.multiplyScalar(-1);

  _y.crossVectors(_z, _x).normalize();
  if (_y.y < 0) {
    _x.multiplyScalar(-1);
    _y.crossVectors(_z, _x).normalize();
  }

  _basisM.makeBasis(_x, _y, _z);
  _basis.setFromRotationMatrix(_basisM);
  _targetQ.copy(_basis);
  if (snap) {
    quaternion.copy(_targetQ);
    return;
  }
  quaternion.slerp(_targetQ, 1 - Math.exp(-6.5 * Math.min(dt, 0.05)));
}

function measureLineGlyph(letter) {
  if (typeof document === "undefined") return null;
  const glyphs = document.querySelectorAll('[data-hero-char="line1"] .yo-hero__glyph');
  const target = letter.toUpperCase();
  let glyph = null;
  for (const el of glyphs) {
    if ((el.textContent || "").trim().toUpperCase() === target) glyph = el;
  }
  if (!glyph) return null;

  const rect = glyph.getBoundingClientRect();
  const vw = window.innerWidth || 1;
  const vh = window.innerHeight || 1;
  if (rect.width < 2 || rect.height < 2) return null;
  return { rect, vw, vh };
}

/**
 * The W in "WITH". Feet sit on the baseline of that letter so the raised
 * wings cover it. Inter's baseline is 86% down the 1em glyph box; 0.80
 * plants the legs in the lower strokes instead of in the empty space below.
 */
export function measureHeroPerch() {
  const found = measureLineGlyph("W");
  if (!found) return null;
  const { rect, vw, vh } = found;
  return {
    nx: (rect.left + rect.width * 0.5) / vw,
    ny: (rect.top + rect.height * 0.8) / vh,
    width: rect.width,
    height: rect.height,
    letter: "W",
  };
}

/**
 * Original landing used by the filmed entrance: feet near the top of the H.
 * The opening of the flight is still posed against this point.
 */
export function measureHeroFlightAnchor() {
  const found = measureLineGlyph("H");
  if (!found) return null;
  const { rect, vw, vh } = found;
  return {
    nx: (rect.left + rect.width * 0.5) / vw,
    ny: (rect.top + rect.height * 0.16) / vh,
    letter: "H",
  };
}

/** Place the landing frame so the measured feet sit on the letter. */
export function heroAnchor(nx, ny, aspect, scale, out) {
  screenPointToMetric(nx, ny, aspect, _metric);
  metricToWorld(_metric.x, _metric.y, aspect, out);
  out.x -= HERO_FOOT_LOCAL.x * scale;
  out.y -= HERO_FOOT_LOCAL.y * scale;
  out.z = 0;
  return out;
}
