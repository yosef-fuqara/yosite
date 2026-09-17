import geometry from "../data/introLogoGeometry.json";

export const INTRO_LOGO = geometry;

const MAX_DENT = 50;
const DENT_SIGMA = 42;
const TWO_SIGMA_SQ = 2 * DENT_SIGMA * DENT_SIGMA;
const NEST = 7;

export const JUMP_TIMING = {
  ANTICIPATE: 0.12,
  TAKEOFF: 0.16,
  FALL: 0.2,
  IMPACT: 0.08,
  SEC_UP: 0.11,
  SEC_DOWN: 0.13,
  PLANTED: 0.1,
  RETURN: 0.42,
};

JUMP_TIMING.TOTAL =
  JUMP_TIMING.ANTICIPATE +
  JUMP_TIMING.TAKEOFF +
  JUMP_TIMING.FALL +
  JUMP_TIMING.IMPACT +
  JUMP_TIMING.SEC_UP +
  JUMP_TIMING.SEC_DOWN +
  JUMP_TIMING.PLANTED +
  JUMP_TIMING.RETURN;

export function pointsToPath(points) {
  const first = points[0];
  let d = `M${first[0].toFixed(2)} ${first[1].toFixed(2)}`;
  for (let i = 1; i < points.length; i += 1) {
    d += `L${points[i][0].toFixed(2)} ${points[i][1].toFixed(2)}`;
  }
  return `${d}Z`;
}

export function deformArmPoints(points, landing, dent) {
  if (Math.abs(dent) < 0.001) return points;

  const { x: lx, y: ly, nx, ny } = landing;
  const depthScale = MAX_DENT * dent;
  const next = new Array(points.length);

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const dx = point[0] - lx;
    const dy = point[1] - ly;
    const falloff = Math.exp(-(dx * dx + dy * dy) / TWO_SIGMA_SQ);
    if (falloff < 0.016) {
      next[i] = point;
      continue;
    }

    const along = dx * nx + dy * ny;
    const side = along <= 0 ? 1 : 0.3;
    const depth = depthScale * falloff * side;
    next[i] = [point[0] + nx * depth, point[1] + ny * depth];
  }

  return next;
}

export function landingCenters() {
  const { dot, landing } = geometry;
  const reach = dot.r - NEST;
  const landX = landing.x - landing.nx * reach;
  const landY = landing.y - landing.ny * reach;
  return {
    restX: dot.cx,
    restY: dot.cy,
    landX,
    landY,
    apexX: (dot.cx + landX) * 0.5 - 9,
    apexY: dot.cy - 34,
  };
}

function applyMark(state, armEl, dotEl, armPoints, armPath, landing) {
  if (Math.abs(state.dent) < 0.001) {
    armEl.setAttribute("d", armPath);
  } else {
    armEl.setAttribute(
      "d",
      pointsToPath(deformArmPoints(armPoints, landing, state.dent)),
    );
  }

  dotEl.setAttribute(
    "transform",
    `translate(${state.x} ${state.y}) scale(${state.sx} ${state.sy})`,
  );
}

export function addIntroLogoJump(timeline, { armEl, dotEl }, at) {
  const { armPoints, armPath, landing } = geometry;
  const pos = landingCenters();
  const state = {
    x: pos.restX,
    y: pos.restY,
    sx: 1,
    sy: 1,
    dent: 0,
  };

  const apply = () =>
    applyMark(state, armEl, dotEl, armPoints, armPath, landing);

  const impactAt =
    at + JUMP_TIMING.ANTICIPATE + JUMP_TIMING.TAKEOFF + JUMP_TIMING.FALL;
  const bounceAt = impactAt + JUMP_TIMING.IMPACT;
  const returnAt =
    bounceAt + JUMP_TIMING.SEC_UP + JUMP_TIMING.SEC_DOWN + JUMP_TIMING.PLANTED;
  const plantX = pos.landX + landing.nx * 9;
  const plantY = pos.landY + landing.ny * 15;

  timeline.set(state, { x: pos.restX, y: pos.restY, sx: 1, sy: 1, dent: 0 }, at);
  timeline.add(apply, at);

  timeline.to(
    state,
    {
      x: pos.restX - 1.2,
      y: pos.restY + 7,
      sx: 1.05,
      sy: 0.93,
      duration: JUMP_TIMING.ANTICIPATE,
      ease: "power2.inOut",
      overwrite: false,
      onUpdate: apply,
    },
    at,
  );

  timeline.to(
    state,
    {
      x: pos.apexX,
      y: pos.apexY,
      sx: 0.98,
      sy: 1.05,
      duration: JUMP_TIMING.TAKEOFF,
      ease: "power2.out",
      overwrite: false,
      onUpdate: apply,
    },
    at + JUMP_TIMING.ANTICIPATE,
  );

  timeline.to(
    state,
    {
      x: pos.landX,
      y: pos.landY,
      sx: 1,
      sy: 1,
      duration: JUMP_TIMING.FALL,
      ease: "power2.in",
      overwrite: false,
      onUpdate: apply,
    },
    at + JUMP_TIMING.ANTICIPATE + JUMP_TIMING.TAKEOFF,
  );

  timeline.to(
    state,
    {
      x: plantX,
      y: plantY,
      sx: 1.12,
      sy: 0.8,
      dent: 1,
      duration: JUMP_TIMING.IMPACT,
      ease: "power3.out",
      overwrite: false,
      onUpdate: apply,
    },
    impactAt,
  );

  timeline.to(
    state,
    {
      x: pos.landX,
      y: pos.landY - 13,
      sx: 1,
      sy: 1,
      dent: -0.15,
      duration: JUMP_TIMING.SEC_UP,
      ease: "power2.out",
      overwrite: false,
      onUpdate: apply,
    },
    bounceAt,
  );

  timeline.to(
    state,
    {
      x: pos.landX,
      y: pos.landY,
      duration: JUMP_TIMING.SEC_DOWN,
      ease: "power2.in",
      overwrite: false,
      onUpdate: apply,
    },
    bounceAt + JUMP_TIMING.SEC_UP,
  );

  timeline.to(
    state,
    {
      dent: 0,
      duration: 0.36,
      ease: "power2.inOut",
      overwrite: false,
      onUpdate: apply,
    },
    bounceAt + JUMP_TIMING.SEC_UP,
  );

  timeline.to(
    state,
    {
      x: pos.restX,
      y: pos.restY,
      sx: 1,
      sy: 1,
      dent: 0,
      duration: JUMP_TIMING.RETURN,
      ease: "power2.inOut",
      overwrite: false,
      onUpdate: apply,
    },
    returnAt,
  );

  timeline.add(() => {
    state.x = pos.restX;
    state.y = pos.restY;
    state.sx = 1;
    state.sy = 1;
    state.dent = 0;
    apply();
  }, at + JUMP_TIMING.TOTAL);

  return JUMP_TIMING.TOTAL;
}

export function resetIntroLogo({ armEl, dotEl }) {
  const { armPath, dot } = geometry;
  armEl?.setAttribute("d", armPath);
  dotEl?.setAttribute("transform", `translate(${dot.cx} ${dot.cy})`);
}
