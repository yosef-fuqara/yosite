function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Card sequence occupies this portion of the services scroll timeline; remainder is hold on final frame. */
export const SHEET_START = 0.58;

export function sheetLift(progress) {
  return clamp01((progress - SHEET_START) / (1 - SHEET_START));
}

function yAt(amp, pull) {
  return (1 - amp * pull).toFixed(4);
}

export function sheetPath(lift, isMobile) {
  if (lift <= 0.0001) return "M0,-0.01 H1 V1.01 H0 Z";

  const shape = clamp01(lift / 0.28);
  if (isMobile) {
    const amp = 0.028 * shape;
    const y0 = yAt(amp, 0.35);
    const y1 = yAt(amp, 1);
    const y2 = yAt(amp, 0.4);
    return `M0,-0.01 H1 V${y2} C0.78,${y2} 0.7,${y1} 0.5,${y1} C0.3,${y1} 0.22,${y0} 0,${y0} Z`;
  }

  const amp = 0.048 * shape;
  const a = yAt(amp, 0.42);
  const b = yAt(amp, 0.95);
  const c = yAt(amp, 0.32);
  const d = yAt(amp, 1);
  const e = yAt(amp, 0.5);
  return `M0,-0.01 H1 V${a} C0.9,${a} 0.84,${b} 0.72,${b} C0.6,${b} 0.56,${c} 0.44,${c} C0.32,${c} 0.26,${d} 0.14,${d} C0.06,${d} 0.04,${e} 0,${e} Z`;
}
