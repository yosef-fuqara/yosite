import gsap from "gsap";

export const PROCESS_OPEN = 1.85;
export const PROCESS_SETTLE = 0.18;
export const PROCESS_HOLD = 0.82;
export const PROCESS_FADE = 0.4;
export const PROCESS_HOW_SCALE = 0.205;
export const PROCESS_HOW_SCALE_MOBILE = 0.22;

export function processDuration() {
  const steps = 4;
  return PROCESS_OPEN + PROCESS_SETTLE + PROCESS_HOLD * steps + PROCESS_FADE * (steps - 1);
}

function navOffset(viewport) {
  const raw = getComputedStyle(viewport).getPropertyValue("--services-nav");
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed * 16 : 68;
}

export function measureProcess(viewport, nodes) {
  const { how, stage, frame, exit } = nodes;
  const viewH = viewport.clientHeight || window.innerHeight;
  const viewW = viewport.clientWidth || window.innerWidth;
  const compact = viewW < 900;
  const nav = navOffset(viewport);
  const howScale = compact ? PROCESS_HOW_SCALE_MOBILE : PROCESS_HOW_SCALE;
  const viewTop = viewport.getBoundingClientRect().top;
  const howY = Number(gsap.getProperty(how, "y")) || 0;
  const frameY = Number(gsap.getProperty(frame, "y")) || 0;
  const exitY = Number(gsap.getProperty(exit, "y")) || 0;
  const howTop = (how?.getBoundingClientRect().top || 0) - viewTop - howY;
  const howH = how?.offsetHeight || 1;
  const exitTop = (exit?.getBoundingClientRect().top || 0) - viewTop - exitY;
  const gapY = howTop + howH;

  const imgMaxW = compact ? Math.min(viewW - 40, viewW * 0.9) : Math.min(viewW * 0.52, 780);
  const imgMaxH = compact ? viewH * 0.4 : viewH * 0.54;
  const aspect = 1.62;
  let imgW = imgMaxW;
  let imgH = imgW / aspect;
  if (imgH > imgMaxH) {
    imgH = imgMaxH;
    imgW = imgH * aspect;
  }

  const howEndTop = nav + (compact ? 36 : 10);
  const frameToY = howEndTop + howH * howScale + (compact ? 14 : 22);

  if (stage) {
    stage.style.setProperty("--process-w", `${Math.round(imgW)}px`);
    stage.style.setProperty("--process-h", `${Math.round(imgH)}px`);
    stage.style.setProperty("--process-copy-top", `${Math.round(frameToY)}px`);
  }

  return {
    compact,
    howScale,
    howY: howEndTop - howTop,
    frameFromY: gapY - imgH * 0.04,
    frameToY,
    exitY: viewH - exitTop + Math.max(exit?.offsetHeight || 0, 40),
    how,
    stage,
    frame,
    exit,
    frameY,
  };
}

export function restProcess(metrics, imgs, copies) {
  const { how, frame, exit } = metrics;
  if (how) {
    gsap.set(how, {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      transformOrigin: "50% 0%",
      force3D: true,
    });
  }
  if (exit) gsap.set(exit, { x: 0, y: 0, rotation: 0, force3D: true });
  if (frame) {
    gsap.set(frame, {
      xPercent: -50,
      x: 0,
      y: metrics.frameFromY || 0,
      scale: 0.08,
      opacity: 0,
      rotation: 0,
      transformOrigin: "50% 0%",
      force3D: true,
    });
  }
  if (imgs?.length) gsap.set(imgs, { opacity: 0 });
  if (copies?.length) gsap.set(copies, { opacity: 0 });
}

export function bindProcess(tl, start, nodes, metricsRef, imgs, copies) {
  const { how, frame, exit } = nodes;
  const openAt = start;

  tl.fromTo(
    how,
    { y: 0, scale: 1, x: 0, rotation: 0 },
    {
      y: () => metricsRef.current.howY,
      scale: () => metricsRef.current.howScale,
      x: 0,
      rotation: 0,
      duration: PROCESS_OPEN,
      ease: "power3.inOut",
      immediateRender: false,
      force3D: true,
    },
    openAt,
  );

  tl.fromTo(
    frame,
    {
      y: () => metricsRef.current.frameFromY,
      scale: 0.08,
      opacity: 0,
      x: 0,
      xPercent: -50,
      rotation: 0,
    },
    {
      y: () => metricsRef.current.frameToY,
      scale: 1,
      opacity: 1,
      x: 0,
      xPercent: -50,
      rotation: 0,
      duration: PROCESS_OPEN,
      ease: "power3.inOut",
      immediateRender: false,
      force3D: true,
    },
    openAt,
  );

  tl.fromTo(
    exit,
    { y: 0, x: 0, rotation: 0 },
    {
      y: () => metricsRef.current.exitY,
      x: 0,
      rotation: 0,
      duration: PROCESS_OPEN,
      ease: "power3.inOut",
      immediateRender: false,
      force3D: true,
    },
    openAt + 0.05,
  );

  if (imgs[0]) {
    tl.fromTo(
      imgs[0],
      { opacity: 0 },
      { opacity: 1, duration: PROCESS_OPEN * 0.7, ease: "power3.inOut", immediateRender: false },
      openAt + PROCESS_OPEN * 0.06,
    );
  }

  if (copies[0]) {
    tl.fromTo(
      copies[0],
      { opacity: 0 },
      {
        opacity: 1,
        duration: PROCESS_OPEN * 0.32,
        ease: "power2.out",
        immediateRender: false,
      },
      openAt + PROCESS_OPEN * 0.78,
    );
  }

  let time = openAt + PROCESS_OPEN + PROCESS_SETTLE;
  for (let index = 0; index < imgs.length - 1; index += 1) {
    time += PROCESS_HOLD;
    const fromImg = imgs[index];
    const toImg = imgs[index + 1];
    const fromCopy = copies[index];
    const toCopy = copies[index + 1];

    if (fromImg && toImg) {
      tl.to(fromImg, { opacity: 0, duration: PROCESS_FADE, ease: "power2.inOut" }, time);
      tl.fromTo(
        toImg,
        { opacity: 0 },
        { opacity: 1, duration: PROCESS_FADE, ease: "power2.inOut", immediateRender: false },
        time,
      );
    }
    if (fromCopy && toCopy) {
      tl.to(fromCopy, { opacity: 0, duration: PROCESS_FADE, ease: "power2.inOut" }, time);
      tl.fromTo(
        toCopy,
        { opacity: 0 },
        { opacity: 1, duration: PROCESS_FADE, ease: "power2.inOut", immediateRender: false },
        time,
      );
    }
    time += PROCESS_FADE;
  }

  tl.to({}, { duration: PROCESS_HOLD }, time);
}
