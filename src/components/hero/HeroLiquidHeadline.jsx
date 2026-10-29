import { useEffect, useId, useRef } from "react";

const DESKTOP_MOUSE =
  "(min-width: 768px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const MAX_DISPLACEMENT = 18;
const NEUTRAL_BIAS = -1 / 510;
let displacementTexture;

function makeDisplacementTexture() {
  if (displacementTexture) return displacementTexture;

  // One small, reusable normal map. R/G bend the ink; B carries cursor momentum.
  // A smooth falloff confines the displacement to a small cursor-centered lens.
  const size = 192;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const pixels = context.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = (x / (size - 1)) * 2 - 1;
      const ny = (y / (size - 1)) * 2 - 1;
      const radius = Math.hypot(nx, ny);
      const envelope = Math.max(0, 1 - radius * radius) ** 3;
      const wave = Math.sin(radius * Math.PI * 2.5) * envelope;
      const normal = radius > 0 ? (wave * 100) / radius : 0;
      const offset = (y * size + x) * 4;
      pixels.data[offset] = Math.round(128 + nx * normal);
      pixels.data[offset + 1] = Math.round(128 + ny * normal);
      pixels.data[offset + 2] = Math.round(255 * envelope);
      pixels.data[offset + 3] = 255;
    }
  }

  context.putImageData(pixels, 0, 0);
  displacementTexture = canvas.toDataURL();
  return displacementTexture;
}

export default function HeroLiquidHeadline({ heroRef, contentKey, children, ...props }) {
  const id = `hero-liquid-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const titleRef = useRef(null);
  const filterRef = useRef(null);
  const imageRef = useRef(null);
  const vectorRef = useRef(null);
  const displacementRef = useRef(null);

  useEffect(() => {
    const title = titleRef.current;
    const hero = heroRef.current;
    if (!title || !hero || !("SVGFEDisplacementMapElement" in window)) return undefined;

    const media = window.matchMedia(DESKTOP_MOUSE);
    const filter = filterRef.current;
    const image = imageRef.current;
    const vector = vectorRef.current;
    const displacement = displacementRef.current;
    const zone = hero.closest(".hero-about-zone");
    let disposeInteraction = () => {};

    function configure() {
      disposeInteraction();
      disposeInteraction = () => {};
      if (!media.matches) return;

      const texture = makeDisplacementTexture();
      if (!texture) return;
      image.setAttribute("href", texture);

      let frame = 0;
      let lastFrame = 0;
      let lastMove = 0;
      let inside = false;
      let seeded = false;
      let strength = 0;
      let speed = 0;
      let velocityX = 0;
      let velocityY = 0;
      let flowX = 0;
      let flowY = 0;
      let x = 0;
      let y = 0;
      let targetX = 0;
      let targetY = 0;
      let baseRadius = 110;
      let radius = baseRadius;
      let bounds;

      function reset() {
        if (!frame && strength === 0) return;
        cancelAnimationFrame(frame);
        frame = 0;
        lastFrame = 0;
        inside = false;
        seeded = false;
        strength = 0;
        flowX = flowY = 0;
        displacement.setAttribute("scale", "0");
        // Removing the filter restores the exact original font rendering at rest.
        title.style.removeProperty("filter");
      }

      function tick(now) {
        if (now - lastFrame < 1000 / 60 - 1) {
          frame = requestAnimationFrame(tick);
          return;
        }
        const dt = Math.min((now - lastFrame) / 1000 || 1 / 60, 0.05);
        lastFrame = now;
        const motion = inside ? Math.exp(-Math.max(0, now - lastMove - 35) / 100) : 0;
        const targetStrength = (0.35 + speed * 0.65) * motion;
        const ease = 1 - Math.exp(-dt / (targetStrength > strength ? 0.075 : 0.28));
        strength += (targetStrength - strength) * ease;

        if (strength < 0.003 && motion < 0.01) {
          reset();
          return;
        }

        const follow = 1 - Math.exp(-dt / 0.065);
        const settle = 1 - Math.exp(-dt / 0.12);
        x += (targetX - x) * follow;
        y += (targetY - y) * follow;
        flowX += (velocityX * motion - flowX) * settle;
        flowY += (velocityY * motion - flowY) * settle;
        const targetRadius = baseRadius * (1 + 0.13 * (1 - motion));
        radius += (targetRadius - radius) * (1 - Math.exp(-dt / 0.22));

        image.setAttribute("x", (x - radius).toFixed(2));
        image.setAttribute("y", (y - radius).toFixed(2));
        image.setAttribute("width", (radius * 2).toFixed(2));
        image.setAttribute("height", (radius * 2).toFixed(2));
        // Center the normal map around the displacement filter's neutral 0.5.
        vector.setAttribute("values", [
          `1 0 ${flowX.toFixed(4)} 0 ${NEUTRAL_BIAS}`,
          `0 1 ${flowY.toFixed(4)} 0 ${NEUTRAL_BIAS}`,
          "0 0 0 0 0",
          "0 0 0 1 0",
        ].join(" "));
        displacement.setAttribute("scale", (strength * MAX_DISPLACEMENT).toFixed(3));
        frame = requestAnimationFrame(tick);
      }

      function onMove(event) {
        if (
          event.pointerType !== "mouse" ||
          hero.dataset.entrance !== "done" ||
          zone?.dataset.transition === "active"
        ) return;

        const now = performance.now();
        if (!frame) {
          bounds = title.getBoundingClientRect();
          baseRadius = Math.max(88, Math.min(140, bounds.width * 0.115));
          radius = baseRadius;
          filter.setAttribute("width", String(bounds.width + 32));
          filter.setAttribute("height", String(bounds.height + 32));
        }
        const nextX = event.clientX - bounds.left;
        const nextY = event.clientY - bounds.top;

        if (seeded) {
          const elapsed = Math.max(8, now - lastMove);
          const dx = nextX - targetX;
          const dy = nextY - targetY;
          const distance = Math.hypot(dx, dy);
          speed = Math.min(1, distance / elapsed / 1.4);
          velocityX = distance ? (dx / distance) * speed * -0.16 : 0;
          velocityY = distance ? (dy / distance) * speed * -0.16 : 0;
        } else {
          if (!frame) {
            x = nextX;
            y = nextY;
          }
          speed = 0.15;
          velocityX = velocityY = 0;
          seeded = true;
        }

        targetX = nextX;
        targetY = nextY;
        lastMove = now;
        inside = true;
        if (!frame) {
          title.style.filter = `url("#${id}")`;
          lastFrame = now;
          frame = requestAnimationFrame(tick);
        }
      }

      function onLeave() {
        inside = false;
        seeded = false;
      }

      function onVisibility() {
        if (document.hidden) reset();
      }

      const resize = new ResizeObserver(reset);
      resize.observe(title);
      title.addEventListener("pointerenter", onMove, { passive: true });
      title.addEventListener("pointermove", onMove, { passive: true });
      title.addEventListener("pointerleave", onLeave);
      title.addEventListener("pointercancel", reset);
      window.addEventListener("scroll", reset, { passive: true });
      window.addEventListener("resize", reset, { passive: true });
      window.addEventListener("blur", reset);
      document.addEventListener("visibilitychange", onVisibility);

      disposeInteraction = () => {
        reset();
        resize.disconnect();
        title.removeEventListener("pointerenter", onMove);
        title.removeEventListener("pointermove", onMove);
        title.removeEventListener("pointerleave", onLeave);
        title.removeEventListener("pointercancel", reset);
        window.removeEventListener("scroll", reset);
        window.removeEventListener("resize", reset);
        window.removeEventListener("blur", reset);
        document.removeEventListener("visibilitychange", onVisibility);
      };
    }

    configure();
    media.addEventListener("change", configure);
    return () => {
      media.removeEventListener("change", configure);
      disposeInteraction();
    };
  }, [heroRef, id, contentKey]);

  return (
    <>
      <h1 ref={titleRef} {...props}>
        {children}
      </h1>
      <svg className="yo-hero__liquid-filter" aria-hidden="true" focusable="false">
        <defs>
          <filter
            ref={filterRef}
            id={id}
            filterUnits="userSpaceOnUse"
            primitiveUnits="userSpaceOnUse"
            x="-16"
            y="-16"
            width="1"
            height="1"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodColor="rgb(128, 128, 0)" result="neutral" />
            <feImage
              ref={imageRef}
              x="0"
              y="0"
              width="220"
              height="220"
              preserveAspectRatio="none"
              result="ripple"
            />
            <feMerge result="field">
              <feMergeNode in="neutral" />
              <feMergeNode in="ripple" />
            </feMerge>
            <feColorMatrix ref={vectorRef} in="field" type="matrix" result="directional-field" />
            <feDisplacementMap
              ref={displacementRef}
              in="SourceGraphic"
              in2="directional-field"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
    </>
  );
}
