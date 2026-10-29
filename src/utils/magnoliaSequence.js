/**
 * Magnolia branch — scroll-driven frame sequence.
 *
 * The vertical clip (public/flower/flower.mp4, 720x1280) is pre-sampled into
 * still frames (public/flower-sequence/flower_0001..0240.webp). Scrubbing
 * pre-decoded stills is the project's established, decode-safe alternative to
 * seeking a <video> by currentTime: every frame is already decoded, so fast
 * scrolling always lands on the exact frame and the last frame is always
 * reachable.
 *
 * One controller owns the canvas. A single caller feeds it a 0..1 progress;
 * there is no competing timer, no video.play(), and no second source of truth.
 */

const FRAME_COUNT = 240;

const framePath = (oneBased) =>
  `/flower-sequence/flower_${String(oneBased).padStart(4, "0")}.webp`;

/**
 * Keep the original top-left of the frame. The branch originates at the
 * top-left of the clip; cropping Y/X there sliced the wood and made it look
 * like a stub entering from the left instead of the real origin.
 * Only trim empty black on the right and bottom so flowers stay intact.
 */
const SRC = { x: 0, y: 0, w: 680, h: 1140 };
const SRC_ASPECT = SRC.w / SRC.h;

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function createMagnoliaSequence(canvas) {
  const ctx = canvas.getContext("2d", { alpha: true });
  const frames = new Array(FRAME_COUNT);

  let mobile = false;
  let dpr = 1;
  let lastIndex = 0;
  let lastProgress = 0;

  for (let i = 0; i < FRAME_COUNT; i += 1) {
    const img = new Image();
    img.decoding = "async";
    img.src = framePath(i + 1);
    frames[i] = img;
  }

  /**
   * Where the cropped branch lands on screen.
   *
   * Sized from viewport width (~50vw) so the branch itself reads large, not
   * like a small inset. The portrait source is then taller than the viewport,
   * which is intentional: as scroll progress advances we pan down the cascade
   * so the rest of the bloom comes into view instead of being clipped.
   */
  function destRect(progress) {
    const vw = canvas.clientWidth || 1;
    const vh = canvas.clientHeight || 1;
    const t = clamp01(progress);

    const widthShare = mobile ? 0.94 : 0.60;
    const dw = vw * widthShare;
    const dh = dw / SRC_ASPECT;
    const dx = 0; // flush with the left edge — do not crop the origin

    // Branch enters from the left edge at about mid-screen. The portrait
    // source is taller than the viewport, so as the user keeps scrolling the
    // view travels down the cascade and the rest of the bloom comes into view
    // instead of being clipped at the bottom-right.
    const tipY = vh * 0.42;
    const overflow = Math.max(0, tipY + dh - vh * 0.96);
    // Keep the branch at mid-left for the whole entry. Pan down only after
    // the headline has left, so the start position actually holds.
    const panT = t <= 0.5 ? 0 : (t - 0.5) / 0.5;
    const pan = overflow * panT;

    return { dx, dy: tipY - pan, dw, dh };
  }

  function render(index, progress) {
    const vw = canvas.clientWidth || 1;
    const vh = canvas.clientHeight || 1;
    ctx.clearRect(0, 0, vw, vh);

    const img = frames[index];
    if (!img || !img.complete || !img.naturalWidth) return;

    const { dx, dy, dw, dh } = destRect(progress);
    ctx.drawImage(img, SRC.x, SRC.y, SRC.w, SRC.h, dx, dy, dw, dh);
  }

  function draw(progress) {
    lastProgress = clamp01(progress);
    const index = Math.round(lastProgress * (FRAME_COUNT - 1));
    lastIndex = index;

    const img = frames[index];
    if (img && !img.complete) {
      // Fast scroll can land on a not-yet-decoded frame; paint it on arrival.
      img.onload = () => {
        if (lastIndex === index) render(index, lastProgress);
      };
    }
    render(index, lastProgress);
  }

  function resize(isMobile) {
    if (typeof isMobile === "boolean") mobile = isMobile;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    const vw = canvas.clientWidth || 1;
    const vh = canvas.clientHeight || 1;
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    render(lastIndex, lastProgress);
  }

  function destroy() {
    for (const img of frames) {
      if (img) {
        img.onload = null;
        img.src = "";
      }
    }
    ctx.clearRect(0, 0, canvas.clientWidth || 0, canvas.clientHeight || 0);
  }

  return { draw, resize, destroy, FRAME_COUNT };
}
