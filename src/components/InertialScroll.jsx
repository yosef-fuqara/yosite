import { useEffect } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import {
  INERTIAL_OPTIONS,
  INERTIAL_SCROLL_TO,
  applyScrollRestoration,
  consumeStartHash,
  isTopHash,
} from "../utils/inertialScroll";
import { onPageIntroReady } from "../utils/pageIntroGate";

function isIntroLocked() {
  return document.documentElement.classList.contains("yo-intro-locked");
}

/**
 * Page-level inertial scroll. Wheel input is lerped so discrete mouse ticks
 * coast to a stop; touch keeps native inertia. Stops while the cinematic
 * intro locks overflow.
 */
function sectionFromHash(hash) {
  if (isTopHash(hash)) return null;
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!id) return null;
  try {
    return document.getElementById(id);
  } catch {
    return null;
  }
}

function releaseToStartPosition(lenis) {
  const hash = consumeStartHash();
  if (hash === undefined) return;
  if (!hash) {
    lenis.scrollTo(0, { immediate: true });
    return;
  }

  history.replaceState(null, "", hash);
  const target = sectionFromHash(hash);
  if (target) {
    lenis.scrollTo(target, INERTIAL_SCROLL_TO);
    return;
  }

  lenis.scrollTo(0, { immediate: true });
}

function InertialScrollBridge() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return undefined;

    applyScrollRestoration();
    lenis.scrollTo(0, { immediate: true });

    const syncLock = () => {
      if (isIntroLocked()) {
        lenis.stop();
        lenis.scrollTo(0, { immediate: true });
        return;
      }
      lenis.start();
    };

    let cancelled = false;
    const releaseWhenOpen = () => {
      if (cancelled) return;
      if (isIntroLocked()) {
        requestAnimationFrame(releaseWhenOpen);
        return;
      }
      lenis.start();
      releaseToStartPosition(lenis);
    };

    syncLock();

    const observer = new MutationObserver(syncLock);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const unsubscribeIntro = onPageIntroReady(releaseWhenOpen);

    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const link = event.target.closest?.("a[href]");
      if (!link || link.target === "_blank") return;

      const href = link.getAttribute("href");
      if (!href?.startsWith("#")) return;

      event.preventDefault();

      if (isIntroLocked()) return;

      if (isTopHash(href)) {
        lenis.scrollTo(0, INERTIAL_SCROLL_TO);
      }
    };

    document.addEventListener("click", onClick);

    return () => {
      cancelled = true;
      observer.disconnect();
      unsubscribeIntro();
      document.removeEventListener("click", onClick);
    };
  }, [lenis]);

  return null;
}

export default function InertialScroll({ children }) {
  return (
    <ReactLenis root options={INERTIAL_OPTIONS}>
      <InertialScrollBridge />
      {children}
    </ReactLenis>
  );
}
