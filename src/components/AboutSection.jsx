import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "framer-motion";
import { useI18n } from "../i18n/I18nContext";
import "../styles/about.css";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const DESKTOP_QUERY = "(min-width: 768px)";
const MOBILE_QUERY = "(max-width: 767px)";

const HEADLINE_LEFT = "WE TURN";
const HEADLINE_RIGHT = ["IDEAS INTO", "EXPERIENCES"];

const IMAGE_INTERVAL_MS = 700;

const ABOUT_IMAGES = [
  {
    src: "/about/about-01-vision.webp",
    altKey: "about.images.vision",
    position: "center 42%",
  },
  {
    src: "/about/about-02-structure.webp",
    altKey: "about.images.structure",
    position: "center",
  },
  {
    src: "/about/about-03-detail.webp",
    altKey: "about.images.detail",
    position: "center",
  },
  {
    src: "/about/about-04-interaction.webp",
    altKey: "about.images.interaction",
    position: "center 38%",
  },
  {
    src: "/about/about-05-experience.webp",
    altKey: "about.images.experience",
    position: "center 58%",
  },
];

function clearAboutProps(targets) {
  gsap.set(targets, {
    clearProps:
      "transform,x,y,xPercent,scale,opacity,clipPath,transformOrigin",
  });
}

const FRAME_RADIUS_PX = 10;

function roundedHoleMask(width, height, radius) {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const r = Math.min(radius, w / 2, h / 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" rx="${r}" fill="#000"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function getStageScale(stage) {
  const fromGsap = Number(gsap.getProperty(stage, "scale"));
  if (Number.isFinite(fromGsap) && fromGsap > 0.001) return fromGsap;
  const transform = getComputedStyle(stage).transform;
  if (!transform || transform === "none") return 1;
  const matrix = new DOMMatrix(transform);
  return Math.max(Math.abs(matrix.a), 0.001);
}

function syncHeadlineKnockout(viewport, stage) {
  if (!viewport || !stage) return;
  const view = viewport.getBoundingClientRect();
  const hole = stage.getBoundingClientRect();
  const width = Math.max(0, hole.width);
  const height = Math.max(0, hole.height);
  const radius = FRAME_RADIUS_PX * getStageScale(stage);
  viewport.style.setProperty("--about-hole-x", `${(hole.left - view.left).toFixed(2)}px`);
  viewport.style.setProperty("--about-hole-y", `${(hole.top - view.top).toFixed(2)}px`);
  viewport.style.setProperty("--about-hole-w", `${width.toFixed(2)}px`);
  viewport.style.setProperty("--about-hole-h", `${height.toFixed(2)}px`);
  viewport.style.setProperty("--about-hole-r", `${radius.toFixed(2)}px`);
  viewport.style.setProperty("--about-view-w", `${view.width.toFixed(2)}px`);
  viewport.style.setProperty("--about-view-h", `${view.height.toFixed(2)}px`);
  viewport.style.setProperty("--about-hole-mask", roundedHoleMask(width, height, radius));
}

function AboutHeadlineMark({ className }) {
  return (
    <div className={className} aria-hidden="true" dir="ltr">
      <p className="about-headline__left">{HEADLINE_LEFT}</p>
      <p className="about-headline__right">
        {HEADLINE_RIGHT.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </p>
    </div>
  );
}

function buildScrollTimeline(root, viewport, mode) {
  const headline = viewport.querySelector(".about-headline--solid");
  const cut = viewport.querySelector(".about-headline--cut");
  const left = viewport.querySelectorAll(".about-headline__left");
  const right = viewport.querySelectorAll(".about-headline__right");
  const copy = viewport.querySelector(".about-copy");
  const cluster = viewport.querySelector(".about-frames__cluster");
  const stage = viewport.querySelector(".about-frames__stage");
  const media = viewport.querySelector(".about-frame__media");
  if (
    !headline ||
    !cut ||
    !left.length ||
    !right.length ||
    !copy ||
    !cluster ||
    !stage ||
    !media
  ) {
    return undefined;
  }

  const compact = mode === "mobile";
  const yStart = "4vh";
  const ySettled = compact ? "1vh" : "0vh";
  const scaleStart = compact ? 0.22 : 0.2;
  const scaleMid = compact ? 0.52 : 0.48;
  const scaleEnd = 1;
  const imageScaleStart = compact ? 1.48 : 1.55;
  const imageScaleMid = compact ? 1.14 : 1.18;
  const imageScaleEnd = 1;
  const leftStart = compact ? "-56vw" : "-52vw";
  const leftEnd = compact ? "4vw" : "2vw";
  const rightStart = compact ? "58vw" : "62vw";
  const rightEnd = compact ? "-2vw" : "-2vw";

  gsap.set(left, { x: leftStart, force3D: true });
  gsap.set(right, { x: rightStart, force3D: true });
  gsap.set(copy, { opacity: 1, force3D: true });
  gsap.set(cluster, {
    xPercent: -50,
    y: yStart,
    force3D: true,
  });
  gsap.set(stage, {
    scale: scaleStart,
    transformOrigin: "50% 100%",
    force3D: true,
  });
  gsap.set(media, {
    scale: imageScaleStart,
    transformOrigin: "50% 100%",
    force3D: true,
  });

  const punch = () => syncHeadlineKnockout(viewport, stage);
  punch();

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    onUpdate: punch,
    scrollTrigger: {
      trigger: root,
      start: compact ? "top bottom" : "top 95%",
      end: compact ? "top 14%" : "top 8%",
      scrub: compact ? 0.35 : true,
      invalidateOnRefresh: true,
      fastScrollEnd: false,
      onRefresh: punch,
    },
  });

  tl.to(left, { x: leftEnd, duration: 0.92, force3D: true }, 0);
  tl.to(right, { x: rightEnd, duration: 0.88, force3D: true }, 0);
  tl.to(cluster, { y: ySettled, duration: 0.82, force3D: true }, 0);
  tl.to(stage, { scale: scaleMid, duration: 0.36, force3D: true }, 0);
  tl.to(
    media,
    { scale: imageScaleMid, duration: 0.4, force3D: true },
    0.04,
  );
  tl.to(stage, { scale: scaleEnd, duration: 0.46, force3D: true }, 0.36);
  tl.to(
    media,
    { scale: imageScaleEnd, duration: 0.5, force3D: true },
    0.38,
  );
  tl.set(stage, { scale: scaleEnd }, 0.82);
  tl.set(media, { scale: imageScaleEnd }, 0.88);

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
    [
      "--about-hole-x",
      "--about-hole-y",
      "--about-hole-w",
      "--about-hole-h",
      "--about-hole-r",
      "--about-hole-mask",
      "--about-view-w",
      "--about-view-h",
    ].forEach((prop) => viewport.style.removeProperty(prop));
    clearAboutProps([...left, ...right, copy, cluster, stage, media]);
  };
}

export default function AboutSection({ sectionRef: sectionRefProp }) {
  const internalRef = useRef(null);
  const sectionRef = sectionRefProp ?? internalRef;
  const viewportRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const { t } = useI18n();
  const [frameIndex, setFrameIndex] = useState(0);
  const cycleTimerRef = useRef(null);

  useEffect(() => {
    ABOUT_IMAGES.forEach(({ src }) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    if (reducedMotion) return undefined;

    const root = sectionRef.current;
    if (!root) return undefined;

    const stopCycle = () => {
      if (cycleTimerRef.current != null) {
        window.clearInterval(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
    };

    const startCycle = () => {
      if (cycleTimerRef.current != null || document.hidden) return;
      cycleTimerRef.current = window.setInterval(() => {
        setFrameIndex((index) => (index + 1) % ABOUT_IMAGES.length);
      }, IMAGE_INTERVAL_MS);
    };

    const syncCycle = (active) => {
      if (active && !document.hidden) startCycle();
      else stopCycle();
    };

    const cycleTrigger = ScrollTrigger.create({
      trigger: root,
      start: "top bottom",
      end: "bottom top",
      onEnter: () => syncCycle(true),
      onEnterBack: () => syncCycle(true),
      onLeave: () => syncCycle(false),
      onLeaveBack: () => syncCycle(false),
    });

    const onVisibility = () => syncCycle(cycleTrigger.isActive);
    document.addEventListener("visibilitychange", onVisibility);
    syncCycle(cycleTrigger.isActive);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      cycleTrigger.kill();
      stopCycle();
    };
  }, [reducedMotion, sectionRef]);

  useLayoutEffect(() => {
    if (reducedMotion) return undefined;

    const root = sectionRef.current;
    const viewport = viewportRef.current;
    if (!root || !viewport) return undefined;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add(DESKTOP_QUERY, () => buildScrollTimeline(root, viewport, "desktop"));
      mm.add(MOBILE_QUERY, () => buildScrollTimeline(root, viewport, "mobile"));
    }, root);

    const refresh = () => ScrollTrigger.refresh();
    const onScroll = () => {
      if (window.innerWidth > 767) ScrollTrigger.update();
    };
    let lastWidth = window.innerWidth;
    const onResize = () => {
      const width = window.innerWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      refresh();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    const images = [...viewport.querySelectorAll("img")];
    images.forEach((img) => {
      if (img.complete) return;
      img.addEventListener("load", refresh, { once: true });
    });

    const fontsReady = document.fonts?.ready?.then(refresh);
    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(refresh);
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(raf);
      fontsReady?.catch?.(() => {});
      ctx.revert();
    };
  }, [reducedMotion, sectionRef]);

  const heading = t("about.heading");
  const activeImage = ABOUT_IMAGES[frameIndex];

  return (
    <section
      ref={sectionRef}
      id="about"
      className={`about-section${reducedMotion ? " is-reduced" : ""}`}
      aria-labelledby="about-heading"
    >
      <div ref={viewportRef} className="about-viewport">
        <h2 id="about-heading" className="about-heading">
          {heading}
        </h2>

        <AboutHeadlineMark className="about-headline about-headline--solid" />

        {reducedMotion ? (
          <>
            <p className="about-copy">{t("about.body")}</p>
            <ul className="about-gallery">
              {ABOUT_IMAGES.map((image) => (
                <li key={image.src} className="about-gallery__item">
                  <img
                    src={image.src}
                    alt={t(image.altKey)}
                    width={819}
                    height={1024}
                    sizes="(max-width: 767px) 86vw, 430px"
                    decoding="async"
                    style={{ objectPosition: image.position }}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="about-frames">
            <div className="about-frames__cluster">
              <div className="about-frames__grow">
                <div className="about-frames__stage">
                  <figure className="about-frame">
                    <div className="about-frame__media">
                      <img
                        src={activeImage.src}
                        alt={t(activeImage.altKey)}
                        width={819}
                        height={1024}
                        sizes="(max-width: 767px) 62vw, 24vw"
                        decoding="async"
                        fetchPriority="high"
                        style={{ objectPosition: activeImage.position }}
                      />
                    </div>
                  </figure>
                </div>
              </div>
              <p className="about-copy">{t("about.body")}</p>
            </div>
          </div>
        )}

        {reducedMotion ? null : (
          <div className="about-knockout" aria-hidden="true">
            <AboutHeadlineMark className="about-headline about-headline--cut" />
          </div>
        )}
      </div>
    </section>
  );
}
