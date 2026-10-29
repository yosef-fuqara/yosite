export const MOBILE_MAX_WIDTH = 767;

export function isMobileViewport(
  width = typeof window !== "undefined" ? window.innerWidth : MOBILE_MAX_WIDTH + 1,
) {
  return width <= MOBILE_MAX_WIDTH;
}

/** Whole-pixel transforms reduce sticky + translate jitter on iOS. */
export function snapTransformPx(value) {
  return Math.round(value);
}
