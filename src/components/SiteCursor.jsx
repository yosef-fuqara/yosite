import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "../styles/site-cursor.css";

const CURSOR_MEDIA = "(any-hover: hover) and (any-pointer: fine)";

export default function SiteCursor() {
  const cursorRef = useRef(null);

  useEffect(() => {
    const media = window.matchMedia(CURSOR_MEDIA);
    const cursor = cursorRef.current;
    if (!media.matches || !cursor) return undefined;

    document.documentElement.classList.add("yo-custom-cursor");

    const onMove = (event) => {
      if (event.pointerType === "touch") return;
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
      cursor.dataset.visible = "true";
    };
    const hide = () => {
      cursor.dataset.visible = "false";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", hide);
    window.addEventListener("blur", hide);

    return () => {
      document.documentElement.classList.remove("yo-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", hide);
      window.removeEventListener("blur", hide);
    };
  }, []);

  return createPortal(
    <span ref={cursorRef} className="yo-site-cursor" aria-hidden="true" />,
    document.body,
  );
}
