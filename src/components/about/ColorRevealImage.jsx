import { useEffect, useRef } from "react";

const HOLD_AFTER_TOUCH_MS = 2000;

export default function ColorRevealImage({
  src,
  alt,
  className = "",
  sizes,
  reducedMotion = false,
  eager = false,
}) {
  const wrapRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || reducedMotion) return undefined;

    let holdTimer = 0;

    const activate = () => {
      window.clearTimeout(holdTimer);
      wrap.classList.add("is-active");
    };

    const release = (delay = 0) => {
      window.clearTimeout(holdTimer);
      if (delay <= 0) {
        wrap.classList.remove("is-active");
        return;
      }
      holdTimer = window.setTimeout(() => {
        wrap.classList.remove("is-active");
      }, delay);
    };

    const onPointerEnter = (event) => {
      if (event.pointerType === "touch") return;
      activate();
    };

    const onPointerDown = () => {
      activate();
    };

    const onPointerUp = (event) => {
      if (event.pointerType === "touch" || event.pointerType === "pen") {
        release(HOLD_AFTER_TOUCH_MS);
      }
    };

    const onPointerLeave = (event) => {
      if (event.pointerType === "touch") return;
      release(0);
    };

    const onPointerCancel = () => {
      release(0);
    };

    wrap.addEventListener("pointerenter", onPointerEnter);
    wrap.addEventListener("pointerdown", onPointerDown);
    wrap.addEventListener("pointerup", onPointerUp);
    wrap.addEventListener("pointerleave", onPointerLeave);
    wrap.addEventListener("pointercancel", onPointerCancel);

    return () => {
      window.clearTimeout(holdTimer);
      wrap.removeEventListener("pointerenter", onPointerEnter);
      wrap.removeEventListener("pointerdown", onPointerDown);
      wrap.removeEventListener("pointerup", onPointerUp);
      wrap.removeEventListener("pointerleave", onPointerLeave);
      wrap.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <div className={`about-reveal is-reduced ${className}`.trim()}>
        <img
          src={src}
          alt={alt}
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          draggable="false"
          className="about-reveal__full"
        />
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={`about-reveal ${className}`.trim()}>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable="false"
        className="about-reveal__gray"
      />
      <img
        src={src}
        alt={alt}
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable="false"
        className="about-reveal__color"
      />
    </div>
  );
}
