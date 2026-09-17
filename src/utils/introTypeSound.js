/**
 * Quiet typewriter ticks for the page intro.
 * No typewriter asset exists in /public/audio, so this synthesizes a soft click.
 * Autoplay blocks are ignored; the first user gesture unlocks later ticks.
 */

let audioContext = null;
let noiseBuffer = null;
let gestureBound = false;
let armed = false;

function getContext() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioContext) {
    try {
      audioContext = new AC();
    } catch {
      return null;
    }
  }
  return audioContext;
}

function ensureNoiseBuffer(ctx) {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const length = Math.max(32, Math.floor(ctx.sampleRate * 0.04));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.16));
  }
  noiseBuffer = buffer;
  return noiseBuffer;
}

function unlock() {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
}

function onGesture() {
  unlock();
}

export function armIntroTypeSound() {
  armed = true;
  unlock();

  if (!gestureBound) {
    gestureBound = true;
    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("keydown", onGesture);
  }

  return () => {
    armed = false;
    if (!gestureBound) return;
    window.removeEventListener("pointerdown", onGesture);
    window.removeEventListener("keydown", onGesture);
    gestureBound = false;
  };
}

export function playIntroTypeTick() {
  if (!armed) return;
  const ctx = getContext();
  if (!ctx || ctx.state !== "running") return;

  try {
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = ensureNoiseBuffer(ctx);
    src.playbackRate.value = 0.92 + Math.random() * 0.22;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1640 + Math.random() * 720;
    filter.Q.value = 0.95;

    const gain = ctx.createGain();
    const peak = 0.016 + Math.random() * 0.006;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.034);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.045);
    src.onended = () => {
      try {
        src.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {
        /* already torn down */
      }
    };
  } catch {
    /* sound must never interrupt the animation */
  }
}
