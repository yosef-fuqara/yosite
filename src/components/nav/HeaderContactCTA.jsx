import { useEffect, useRef } from "react";

const LABEL = "DON’T LEAVE IT AN IDEA";
const MOTION_QUERY =
  "(any-hover: hover) and (any-pointer: fine) and (prefers-reduced-motion: no-preference)";
const REST = "translateY(0px) rotate(0deg)";

export default function HeaderContactCTA({ onClick }) {
  const buttonRef = useRef(null);
  const running = useRef(new Set());
  const previousSelection = useRef("");

  useEffect(() => {
    const media = window.matchMedia(MOTION_QUERY);
    const animations = running.current;
    const reset = () => {
      animations.forEach(animation => animation.cancel());
      animations.clear();
    };
    const onPreferenceChange = () => {
      if (!media.matches) reset();
    };
    media.addEventListener("change", onPreferenceChange);
    return () => {
      media.removeEventListener("change", onPreferenceChange);
      reset();
    };
  }, []);

  function playDrop() {
    if (running.current.size || !window.matchMedia(MOTION_QUERY).matches) return;
    const letters = [...buttonRef.current.querySelectorAll("[data-drop-letter]")];
    if (!letters.length || typeof letters[0].animate !== "function") return;

    const candidates = letters.map((_, index) => index);
    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const count = Math.min(letters.length, 2 + Math.floor(Math.random() * 3));
    const selected = candidates.slice(0, count);
    const signature = () => [...selected].sort((a, b) => a - b).join(",");
    // Every new entry gets a visibly different set, even after a random repeat.
    if (signature() === previousSelection.current && candidates.length > count) {
      selected[0] = candidates[count];
    }
    previousSelection.current = signature();

    let delay = 0;
    selected.forEach(index => {
      const distance = 10 + Math.random() * 4;
      const rotation = (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 3);
      const dropped = `translateY(${distance}px) rotate(${rotation}deg)`;
      const animation = letters[index].animate([
        { transform: REST, opacity: 1, offset: 0, easing: "cubic-bezier(.4, 0, .65, 1)" },
        { transform: dropped, opacity: 1, offset: 0.34, easing: "linear" },
        { transform: dropped, opacity: 1, offset: 0.42, easing: "cubic-bezier(.16, 1, .3, 1)" },
        { transform: "translateY(-1.2px) rotate(0deg)", opacity: 1, offset: 0.86, easing: "ease-out" },
        { transform: REST, opacity: 1, offset: 1 },
      ], {
        duration: 620 + Math.random() * 90,
        delay,
        fill: "none",
      });
      running.current.add(animation);
      animation.onfinish = () => {
        running.current.delete(animation);
        animation.cancel();
      };
      delay += 40 + Math.random() * 60;
    });
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className="yo-nav__contact-link"
      aria-label={LABEL}
      onClick={onClick}
      onPointerEnter={event => {
        if (event.pointerType === "mouse") playDrop();
      }}
      onFocus={event => {
        if (event.currentTarget.matches(":focus-visible")) playDrop();
      }}
    >
      <span className="yo-nav__contact-label" aria-hidden="true">
        {[...LABEL].map((character, index) => (
          <span
            key={index}
            className="yo-nav__contact-char"
            data-drop-letter={/\p{L}/u.test(character) ? "" : undefined}
          >
            {character === " " ? "\u00A0" : character}
          </span>
        ))}
      </span>
      <span className="yo-nav__contact-arrow" aria-hidden="true">↘</span>
    </button>
  );
}
