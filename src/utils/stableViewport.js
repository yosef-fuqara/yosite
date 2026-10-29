let cachedWidth = 0;
let cachedHeight = 0;

/**
 * Phone browser chrome changes `innerHeight` while scrolling.
 * `--yo-lvh` (toolbar-collapsed height) is frozen in index.html so pinned
 * sections keep one height and always cover the screen.
 */
export function stableViewportHeight() {
  if (window.innerWidth > 767) return window.innerHeight;

  const width = window.innerWidth;
  if (cachedHeight > 0 && Math.abs(width - cachedWidth) <= 1) return cachedHeight;

  cachedWidth = width;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--yo-lvh");
  const parsed = Number.parseFloat(raw);
  cachedHeight = Number.isFinite(parsed) && parsed > 0 ? parsed : window.innerHeight;
  return cachedHeight;
}
