import { useLayoutEffect, useRef } from "react";
import { pageTop } from "../utils/pageGeometry";

import gsap from "gsap";

import { ScrollTrigger } from "gsap/ScrollTrigger";

import { useReducedMotion } from "framer-motion";

import { useI18n } from "../i18n/I18nContext";

import { SERVICE_CARDS, SERVICE_CARD_KEYS } from "../data/serviceCards";
import { stableViewportHeight } from "../utils/stableViewport";
import { SHEET_START } from "../utils/servicesSheet";

import "../styles/services.css";



gsap.registerPlugin(ScrollTrigger);

ScrollTrigger.config({ ignoreMobileResize: true });



const DESKTOP_QUERY = "(min-width: 768px)";
const MOBILE_QUERY = "(max-width: 767px)";

const MARKS = {

  frames: (

    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">

      <rect x="3.2" y="4.8" width="11.2" height="9.4" rx="1.2" stroke="currentColor" strokeWidth="1.4" />

      <rect x="9.4" y="9.4" width="11.2" height="9.4" rx="1.2" stroke="currentColor" strokeWidth="1.4" />

    </svg>

  ),

  brackets: (

    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">

      <path d="M8.2 5.2 4.4 12l3.8 6.8" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />

      <path d="M15.8 5.2 19.6 12l-3.8 6.8" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />

    </svg>

  ),

  bag: (

    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">

      <path d="M6.2 8.2h11.6l-1 11.2H7.2l-1-11.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />

      <path d="M9.1 8.2V7.1a2.9 2.9 0 0 1 5.8 0v1.1" stroke="currentColor" strokeWidth="1.4" />

    </svg>

  ),

  orbit: (

    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">

      <circle cx="12" cy="12" r="2.15" stroke="currentColor" strokeWidth="1.4" />

      <ellipse cx="12" cy="12" rx="8.4" ry="3.6" stroke="currentColor" strokeWidth="1.35" />

    </svg>

  ),

  page: (

    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">

      <rect x="6.2" y="4.2" width="11.6" height="15.6" rx="1.15" stroke="currentColor" strokeWidth="1.4" />

      <path d="M9 9.2h6.1M9 12.2h6.1M9 15.2h3.8" stroke="currentColor" strokeWidth="1.35" />

    </svg>

  ),

  pulse: (

    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">

      <path

        d="M3.2 13.2h3.4l1.7-5.4 2.7 9.4 1.8-4h7.8"

        stroke="currentColor"

        strokeWidth="1.4"

        strokeLinejoin="round"

      />

    </svg>

  ),

};



function ServiceCard({ item, t }) {

  return (

    <article className="services-card" data-id={item.key} data-track={item.track}>

      <div className="services-card__head">

        <h3 className="services-card__title">{t(`services.cards.${item.key}.title`)}</h3>

        <span className="services-card__mark" aria-hidden="true">

          {MARKS[item.mark]}

        </span>

      </div>

      <p className="services-card__desc">{t(`services.cards.${item.key}.desc`)}</p>

    </article>

  );

}



const CORNER_TILT = 16;

/** How far a corner-rotated card swings back into the viewport. */
function cornerClearance(track) {
  const card = track?.querySelector?.(".services-card");
  const width = card?.offsetWidth || 0;
  const height = card?.offsetHeight || 0;
  if (!width) return 72;
  const rad = (CORNER_TILT * Math.PI) / 180;
  const lift = Math.sin(rad) * width - (1 - Math.cos(rad)) * height;
  return Math.ceil(Math.max(0, lift)) + 36;
}

function trackRange(viewport, track, upward, syncTrackH) {

  const viewH = window.innerWidth <= 767
    ? stableViewportHeight()
    : (viewport.clientHeight || window.innerHeight);

  const trackH = syncTrackH ?? track.scrollHeight ?? viewH;

  const pad = Math.round(viewH * 0.16);
  const hide = cornerClearance(track);

  if (upward) {

    return { from: viewH + pad + hide, to: -(trackH + pad) };

  }

  return { from: -(trackH + pad + hide), to: viewH + pad };

}

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function smoothstep(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

/** public/flower/magnolia.webp — width / height. */
const FLOWER_ASPECT = 568 / 915;

function flowerMetrics(vw, vh) {
  const tall = vh > vw * 1.02;
  let dw = vw * (tall ? 1 : 0.62);
  let dh = dw / FLOWER_ASPECT;
  const minH = vh * (tall ? 1.34 : 1.58);
  if (dh < minH) {
    dh = minH;
    dw = dh * FLOWER_ASPECT;
  }
  if (!tall && dw > vw * 0.7) {
    dw = vw * 0.7;
    dh = dw / FLOWER_ASPECT;
  }
  return { dw, dh };
}

/** Full branch, left aligned, at the size the pinned pan used to paint. */
function sizeFlower(img, viewport) {
  if (!img) return;
  const vw = viewport?.clientWidth || window.innerWidth;
  const vh = window.innerWidth <= 767
    ? stableViewportHeight()
    : (viewport?.clientHeight || window.innerHeight);
  const { dw } = flowerMetrics(vw, vh);
  img.style.width = `${dw}px`;
  img.style.height = "auto";
  img.style.transform = "none";
  img.style.opacity = "1";
  img.style.visibility = "visible";

  const headline = viewport?.querySelector(".services-headline");
  const pad = headline ? parseFloat(getComputedStyle(headline).paddingBottom) || 0 : 0;
  if (img.parentElement) {
    img.parentElement.style.marginTop = pad ? `${-Math.round(pad)}px` : "0px";
    img.parentElement.style.setProperty("--magnolia-w", `${Math.round(dw)}px`);
  }
}

function clearFlower(img) {
  if (!img) return;
  img.style.width = "";
  img.style.height = "";
  img.style.transform = "";
  img.style.opacity = "";
  img.style.visibility = "";
  if (img.parentElement) {
    img.parentElement.style.marginTop = "";
    img.parentElement.style.removeProperty("--magnolia-w");
  }
}

function MagnoliaCaption() {
  return (
    <div className="services-magnolia__aside" dir="ltr">
      <figure className="services-magnolia__caption">
        <blockquote className="services-magnolia__quote">
          Not everything grows in a <strong>garden.</strong>
        </blockquote>
        <figcaption className="services-magnolia__attribution">
          <cite>Yosef Fuqara</cite>
        </figcaption>
      </figure>
    </div>
  );
}

function measureTrack(viewport, track) {
  const viewH = viewport?.clientHeight || window.innerHeight;
  const cards = [];
  for (const card of track.querySelectorAll(".services-card")) {
    cards.push({
      card,
      top: card.offsetTop,
      height: card.offsetHeight || 1,
    });
  }
  return { viewH, cards };
}

function applyCorner(track, corner, metrics) {
  if (!metrics?.cards?.length) return;
  const { viewH, cards } = metrics;
  const trackY = Number(gsap.getProperty(track, "y")) || 0;
  const fromRight = corner.includes("right");
  const fromTop = corner.startsWith("top");
  const reach = Math.min(window.innerWidth * 0.28, viewH * 0.34, 320);
  const tilt = fromRight ? CORNER_TILT : -CORNER_TILT;
  const origin = fromTop
    ? fromRight
      ? "right top"
      : "left top"
    : fromRight
      ? "right bottom"
      : "left bottom";

  for (const { card, top, height } of cards) {
    let amount = 0;
    const center = trackY + top + height * 0.5;

    if (fromTop) {
      const settle = viewH * 0.46;
      amount = clamp01((settle - center) / (settle + height * 1.15));
    } else {
      const settle = viewH * 0.54;
      amount = clamp01((center - settle) / (viewH - settle + height * 1.15));
    }

    const k = smoothstep(amount);
    gsap.set(card, {
      x: (fromRight ? reach : -reach) * k,
      y: 0,
      rotation: tilt * k,
      transformOrigin: origin,
      force3D: true,
      lazy: false,
    });
  }
}

/** How much scroll (× viewport height) completes the headline line-exit. Lower = faster vs scroll. */
const HEADLINE_EXIT_SCROLL_VH = 0.34;

function headlineExitScrollPx() {
  const vh = stableViewportHeight();
  return Math.max(120, Math.round(vh * HEADLINE_EXIT_SCROLL_VH));
}

/**
 * The line-exit plays while the pin itself leaves the screen, so the sentence
 * keeps its current rise-and-clip and the page scrolls instead of holding it.
 */
function bindHeadlineExit(pin, headlineVisual) {
  if (!pin || !headlineVisual) return () => {};

  const tween = gsap.fromTo(
    headlineVisual,
    { "--services-headline-exit-t": 0 },
    {
      "--services-headline-exit-t": 1.12,
      ease: "none",
      immediateRender: false,
      scrollTrigger: {
        trigger: pin,
        start: "bottom bottom",
        end: () => `bottom+=${headlineExitScrollPx()} bottom`,
        scrub: true,
        invalidateOnRefresh: true,
        fastScrollEnd: false,
      },
    },
  );

  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
  };
}

function buildDesktopSequence(root, viewport, leftTrack, rightTrack, headlineVisual, headlineReveal, flowerImg) {
  if (!leftTrack || !rightTrack) return undefined;

  let leftMetrics;
  let rightMetrics;
  const layout = () => {
    syncServicesPinHeight(root, viewport, {
      isMobile: false,
      leftTrack,
      rightTrack,
    });
    leftMetrics = measureTrack(viewport, leftTrack);
    rightMetrics = measureTrack(viewport, rightTrack);
  };
  const pose = () => {
    applyCorner(leftTrack, "bottom-left", leftMetrics);
    applyCorner(rightTrack, "top-right", rightMetrics);
  };

  layout();
  gsap.set(leftTrack, { y: trackRange(viewport, leftTrack, true).from, force3D: true });
  gsap.set(rightTrack, { y: trackRange(viewport, rightTrack, false).from, force3D: true });
  pose();

  const tl = gsap.timeline({
    defaults: { ease: "none", lazy: false },
    scrollTrigger: {
      trigger: root,
      start: () => `top+=${servicesStartOffset(root)} top`,
      end: "bottom bottom",
      scrub: true,
      invalidateOnRefresh: true,
      fastScrollEnd: false,
      onUpdate: () => pose(),
      onToggle: (self) => {
        viewport.classList.toggle("is-pinned", self.isActive);
      },
      onRefresh: () => {
        layout();
        pose();
        sizeFlower(flowerImg, viewport);
      },
    },
  });

  tl.fromTo(
    leftTrack,
    { y: () => trackRange(viewport, leftTrack, true).from },
    { y: () => trackRange(viewport, leftTrack, true).to, duration: SHEET_START * SEQ_SCALE },
    0,
  );
  tl.fromTo(
    rightTrack,
    { y: () => trackRange(viewport, rightTrack, false).from },
    { y: () => trackRange(viewport, rightTrack, false).to, duration: SHEET_START * SEQ_SCALE },
    0,
  );

  const revealStart = SHEET_START * SEQ_SCALE;
  const revealDuration = QUICK_REVEAL_FRACTION * SEQ_SCALE;

  if (headlineVisual) {
    tl.fromTo(
      headlineVisual,
      { y: () => parseFloat(getComputedStyle(headlineVisual).fontSize) * 0.18 },
      { y: 0, duration: revealDuration },
      revealStart,
    );
  }

  tl.to({}, { duration: revealDuration }, revealStart);

  const releaseExit = bindHeadlineExit(root, headlineVisual);
  sizeFlower(flowerImg, viewport);

  return () => {
    releaseExit();
    viewport.classList.remove("is-pinned");
    root.style.removeProperty("height");
    clearFlower(flowerImg);
    gsap.set(
      [
        leftTrack,
        rightTrack,
        headlineVisual,
        headlineReveal,
        flowerImg,
        ...leftTrack.querySelectorAll(".services-card"),
        ...rightTrack.querySelectorAll(".services-card"),
      ].filter(Boolean),
      { clearProps: "transform,x,y,rotation,transformOrigin,opacity,visibility,height,--services-headline-exit-t" },
    );
    tl.scrollTrigger?.kill();
    tl.kill();
  };
}

function buildStackedSequence(root, viewport, stack, headlineVisual, headlineReveal, flowerImg) {
  if (!stack) return undefined;

  const layout = () => {
    syncServicesPinHeight(root, viewport, {
      isMobile: true,
      leftTrack: stack,
      rightTrack: stack,
    });
  };

  layout();

  const stackFrom = () => Math.round(trackRange(viewport, stack, true).from);
  const stackTo = () => Math.round(trackRange(viewport, stack, true).to);

  gsap.set(stack, {
    y: stackFrom(),
    force3D: true,
    autoAlpha: 0,
  });

  const isMobileLayout = () => (viewport.clientWidth || window.innerWidth) <= 767;

  const tl = gsap.timeline({
    defaults: { ease: "none", lazy: false },
    scrollTrigger: {
      trigger: root,
      start: () => `top+=${servicesStartOffset(root)} top`,
      end: "bottom bottom",
      scrub: true,
      invalidateOnRefresh: true,
      fastScrollEnd: false,
      onToggle: (self) => {
        viewport.classList.toggle("is-pinned", self.isActive);
        gsap.set(stack, { autoAlpha: self.isActive ? 1 : 0 });
      },
      onRefresh: () => {
        layout();
        if (isMobileLayout()) {
          if (headlineVisual) gsap.set(headlineVisual, { y: 0, force3D: true });
          if (headlineReveal) gsap.set(headlineReveal, { height: "0.82em" });
        }
        sizeFlower(flowerImg, viewport);
      },
    },
  });

  tl.fromTo(
    stack,
    { y: stackFrom },
    {
      y: stackTo,
      duration: SHEET_START * SEQ_SCALE,
      modifiers: {
        y: (value) => `${Math.round(parseFloat(value))}px`,
      },
    },
    0,
  );

  const revealStart = SHEET_START * SEQ_SCALE;
  const revealDuration = QUICK_REVEAL_FRACTION * SEQ_SCALE;

  if (headlineVisual) {
    if (isMobileLayout()) {
      gsap.set(headlineVisual, { y: 0, force3D: true });
    } else {
      tl.fromTo(
        headlineVisual,
        { y: () => parseFloat(getComputedStyle(headlineVisual).fontSize) * 0.18 },
        { y: 0, duration: revealDuration },
        revealStart,
      );
    }
  }

  if (headlineReveal && isMobileLayout()) {
    gsap.set(headlineReveal, { height: "auto" });
  }

  tl.to({}, { duration: revealDuration }, revealStart);

  const releaseExit = bindHeadlineExit(root, headlineVisual);
  sizeFlower(flowerImg, viewport);

  return () => {
    releaseExit();
    viewport.classList.remove("is-pinned");
    root.style.removeProperty("height");
    clearFlower(flowerImg);
    gsap.set([stack, headlineVisual, headlineReveal, flowerImg].filter(Boolean), {
      clearProps: "transform,x,y,rotation,opacity,visibility,height,--services-headline-exit-t",
    });
    tl.scrollTrigger?.kill();
    tl.kill();
  };
}



const SEQ_SCALE = 4.4;

const QUICK_REVEAL_FRACTION = 0.06;

/** Cards and the short reveal. The sentence exit rides the pin's release, not extra stuck scroll. */
const PINNED_SCROLL_FRACTION = SHEET_START + QUICK_REVEAL_FRACTION;

/** Same stagger as the hero sentence: line index / 3 * 0.14. */
function servicesLineExitDelay(index) {
  return (index / 3 * 0.14).toFixed(2);
}

function servicesStartOffset(root) {
  const work = document.getElementById("selected-work");
  const vh = stableViewportHeight();
  const beat = Math.round(vh * 0.22);
  if (!work) return beat;

  const workBottom = pageTop(work) + work.offsetHeight;
  const rootTop = pageTop(root);
  if (window.innerWidth <= 767) {
    // Last stacked project must leave the screen before the service cards rise.
    return Math.max(0, workBottom - rootTop) + beat;
  }
  const holdPx = Math.max(0, workBottom - vh - rootTop);
  return holdPx + beat;
}

function pairedTrackSpan(leftTrack, rightTrack) {
  if (!leftTrack || !rightTrack) return 0;
  return Math.max(leftTrack.scrollHeight || 0, rightTrack.scrollHeight || 0);
}

function mobileScrollSpanScale(viewport, leftTrack, rightTrack) {
  const span = pairedTrackSpan(leftTrack, rightTrack);
  if (!span) return 1;

  const viewH = window.innerWidth <= 767
    ? stableViewportHeight()
    : (viewport.clientHeight || window.innerHeight);
  const referenceSpan = viewH * 2.12;
  return Math.max(1, span / referenceSpan);
}

function syncServicesPinHeight(root, viewport, { isMobile = false, leftTrack, rightTrack } = {}) {
  const viewportHeight = window.innerWidth <= 767
    ? stableViewportHeight()
    : (viewport.clientHeight || window.innerHeight);
  const configuredPinVh = parseFloat(getComputedStyle(root).getPropertyValue("--services-pin-vh")) || 560;
  const originalPinHeight = (configuredPinVh / 100) * viewportHeight;
  const startOffset = servicesStartOffset(root);
  const originalScrollRange = Math.max(0, originalPinHeight - startOffset - viewportHeight);
  let shortenedScrollRange = originalScrollRange * PINNED_SCROLL_FRACTION;
  if (isMobile) {
    shortenedScrollRange *= mobileScrollSpanScale(viewport, leftTrack, rightTrack);
  }

  root.style.height = `${startOffset + viewportHeight + shortenedScrollRange}px`;
}



export default function Services() {

  const { t, lang, dir } = useI18n();

  const reduced = useReducedMotion();

  const pinRef = useRef(null);

  const viewportRef = useRef(null);

  const sheetRef = useRef(null);

  const stackRef = useRef(null);

  const leftTrackRef = useRef(null);

  const rightTrackRef = useRef(null);

  const headlineVisualRef = useRef(null);

  const headlineRevealRef = useRef(null);

  const flowerRef = useRef(null);

  useLayoutEffect(() => {

    const pin = pinRef.current;

    const viewport = viewportRef.current;

    const sheet = sheetRef.current;

    if (!pin || !viewport || !sheet) return undefined;



    if (reduced) return undefined;



    const mm = gsap.matchMedia();

    mm.add(DESKTOP_QUERY, () =>
      buildDesktopSequence(
        pin,
        viewport,
        leftTrackRef.current,
        rightTrackRef.current,
        headlineVisualRef.current,
        headlineRevealRef.current,
        flowerRef.current,
      ),
    );

    mm.add(MOBILE_QUERY, () =>
      buildStackedSequence(
        pin,
        viewport,
        stackRef.current,
        headlineVisualRef.current,
        headlineRevealRef.current,
        flowerRef.current,
      ),
    );



    const refresh = () => {
      ScrollTrigger.refresh();
    };

    let lastWidth = window.innerWidth;

    const onResize = () => {

      const width = window.innerWidth;

      if (width === lastWidth) return;

      lastWidth = width;

      refresh();

    };

    window.addEventListener("resize", onResize);

    const fontsReady = document.fonts?.ready?.then(refresh);

    const raf = window.requestAnimationFrame(() => {

      window.requestAnimationFrame(refresh);

    });



    return () => {

      window.removeEventListener("resize", onResize);

      window.cancelAnimationFrame(raf);

      fontsReady?.catch?.(() => {});

      mm.revert();

    };

  }, [reduced, lang, dir]);



  const titleWords = t("services.titleWords");

  const titleMark = t("services.titleMark");

  const words = Array.isArray(titleWords) ? titleWords : [t("services.title")];

  const leadWord = words[0] || "";

  const exitWords = words.slice(1);



  return (

    <section

      id="services"

      className={`services-scroll${reduced ? " is-static" : ""}`}

      aria-labelledby="services-heading"

    >

      <div ref={pinRef} className="services-pin">

        <div ref={viewportRef} className="services-viewport">

          <div ref={sheetRef} className="services-sheet">

            <h2 id="services-heading" className="services-headline">

              <span className="services-headline__sr">{t("services.title")}</span>

              <span className="services-subtitle">OUR SERVICES</span>

              <span ref={headlineVisualRef} className="services-headline__visual" aria-hidden="true">

                <span className="services-headline__line" style={{ "--services-line-exit-delay": servicesLineExitDelay(0) }}>

                  <span className="services-headline__line-exit">

                    <span className="services-headline__lead-word services-headline__word--gradient">{leadWord}</span>

                  </span>

                </span>

                <span className="services-headline__exit">
                  {exitWords.map((word, index) => {
                    const isLast = index === exitWords.length - 1;
                    return (
                      <span
                        key={`${word}-${index}`}
                        className="services-headline__line"
                        style={{ "--services-line-exit-delay": servicesLineExitDelay(index + 1) }}
                      >
                        <span className="services-headline__line-exit">
                          {isLast ? (
                            <span className="services-headline__final-line">
                              <span ref={headlineRevealRef} className="services-headline__final-reveal">
                                <span className="services-headline__word--gradient">
                                  {word}
                                  <span className="services-headline__mark">{titleMark}</span>
                                </span>
                              </span>
                            </span>
                          ) : (
                            <span className="services-headline__word--gradient">{word}</span>
                          )}
                        </span>
                      </span>
                    );
                  })}
                </span>

              </span>

            </h2>

            {reduced ? (

              <div className="services-static">

                {SERVICE_CARDS.map((item) => (

                  <ServiceCard key={`static-${item.key}`} item={item} t={t} />

                ))}

              </div>

            ) : null}

            {reduced ? (
              <div className="services-magnolia">
                <img
                  className="services-magnolia__img"
                  src="/flower/magnolia.webp"
                  alt=""
                  width={568}
                  height={915}
                  draggable="false"
                  decoding="async"
                />
                <MagnoliaCaption />
              </div>
            ) : null}

          </div>



          {reduced ? null : (

            <>

              <div className="services-col services-col--left">

                <div ref={leftTrackRef} className="services-col__track">

                  {SERVICE_CARDS.filter((item) => item.track === "left").map((item) => (

                    <ServiceCard key={item.key} item={item} t={t} />

                  ))}

                </div>

              </div>

              <div className="services-col services-col--right">

                <div ref={rightTrackRef} className="services-col__track services-col__track--offset">

                  {SERVICE_CARDS.filter((item) => item.track === "right").map((item) => (

                    <ServiceCard key={item.key} item={item} t={t} />

                  ))}

                </div>

              </div>

              <div ref={stackRef} className="services-stack">

                {SERVICE_CARDS.map((item) => (

                  <ServiceCard key={item.key} item={item} t={t} />

                ))}

              </div>

            </>

          )}



          <ul className="services-sr">

            {SERVICE_CARD_KEYS.map((key) => (

              <li key={key}>{t(`services.cards.${key}.title`)}</li>

            ))}

          </ul>

        </div>

      </div>

      {reduced ? null : (
        <div className="services-magnolia">
          <img
            ref={flowerRef}
            className="services-magnolia__img"
            src="/flower/magnolia.webp"
            alt=""
            width={568}
            height={915}
            draggable="false"
            decoding="async"
          />
          <MagnoliaCaption />
        </div>
      )}

    </section>

  );

}

