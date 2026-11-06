import { stableViewportHeight } from "./stableViewport";

/** Document Y of an element — stable while scrolling (unlike getBoundingClientRect). */
export function pageTop(element) {
  let top = 0;
  let node = element;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent;
  }
  return top;
}

/**
 * Scroll position of the services intro frame ("WHAT WE BUILD?"),
 * after the last project card has left and before the service cards rise.
 * Measured live so a stale anchor cannot stop on the project reel.
 */
export function servicesIntroScrollY() {
  const work = document.getElementById("selected-work");
  if (!work) return window.scrollY || 0;

  const scroll = window.scrollY || document.documentElement.scrollTop || 0;
  const vh = window.innerHeight;
  const workBottom = work.getBoundingClientRect().bottom + scroll;

  if (window.innerWidth <= 767) {
    // The project sheet has finished rising; the services frame is the screen.
    return Math.round(workBottom - stableViewportHeight());
  }

  // The work stage stays stuck over the services pin until it peels away.
  // Stopping at the pin itself still shows the last two project cards.
  return Math.round(workBottom - vh * 0.78);
}

/**
 * Contact frame: the "LET'S MAKE SOMETHING." headline and the form.
 * Stops early enough that the footer stays below the fold.
 */
export function contactScreenScrollY() {
  const screen = document.getElementById("contact-screen");
  const scroll = window.scrollY || document.documentElement.scrollTop || 0;
  if (!screen) return scroll;

  const vh = window.innerHeight;
  const screenTop = screen.getBoundingClientRect().top + scroll;
  const footer = document.querySelector(".site-footer");
  if (!footer) return Math.round(screenTop);

  const footerTop = footer.getBoundingClientRect().top + scroll;
  const aboveFooter = footerTop - vh - 16;
  return Math.round(Math.max(0, Math.min(screenTop, aboveFooter)));
}
