import { createPortal } from "react-dom";

/**
 * Stand-in for the "y." period while it is away from the logo, plus the hairline
 * it draws on the way to the fold.
 *
 * Portaled to `document.body` and fixed, so the dot can cross the whole viewport
 * without any hero overflow clipping it. The `difference` blend matches the
 * navbar chrome, which is how the hand-off reads as the same object and how the
 * dot stays legible over the dark image. Unmounted once the entrance settles.
 */
export default function HeroDotJourney({ layerRef }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div ref={layerRef} className="yo-hero-journey" aria-hidden="true">
      <svg className="yo-hero-journey__trail" focusable="false">
        <path className="yo-hero-journey__trail-path" d="" />
      </svg>
      <span className="yo-hero-journey__dot" />
    </div>,
    document.body,
  );
}
