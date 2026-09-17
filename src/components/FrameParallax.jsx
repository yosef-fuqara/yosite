import { useRef } from "react";
import useFrameParallax from "../hooks/useFrameParallax";
import "../styles/frame-parallax.css";

/**
 * Clipped image window. The outer frame never moves; children inside
 * `frame-parallax__media` translate upward on scroll.
 */
export default function FrameParallax({
  className = "",
  children,
  target,
  offset,
  enabled = true,
}) {
  const frameRef = useRef(null);
  const mediaRef = useRef(null);
  const { reducedMotion } = useFrameParallax({
    frameRef,
    mediaRef,
    targetRef: target,
    offset,
    enabled,
  });

  return (
    <div
      ref={frameRef}
      className={`frame-parallax${reducedMotion ? " is-reduced" : ""}${className ? ` ${className}` : ""}`}
    >
      <div ref={mediaRef} className="frame-parallax__media">
        {children}
      </div>
    </div>
  );
}

/** Drop-in framed <img> with inner-scroll parallax. */
export function FrameParallaxImage({
  src,
  alt,
  className = "",
  imgClassName = "",
  sizes,
  eager = false,
  target,
  offset,
  enabled = true,
}) {
  return (
    <FrameParallax
      className={className}
      target={target}
      offset={offset}
      enabled={enabled}
    >
      <img
        src={src}
        alt={alt}
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable="false"
        className={`frame-parallax__img${imgClassName ? ` ${imgClassName}` : ""}`}
      />
    </FrameParallax>
  );
}
