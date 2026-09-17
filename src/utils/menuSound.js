/**
 * Subtle UI clicks for the fullscreen menu.
 *
 * Placeholder paths (replace with final assets if desired):
 *   /audio/menu-click.wav   — open
 *   /audio/menu-close.wav   — close
 *
 * If a file is missing or playback fails, a short Web Audio click is used.
 * Sound errors never throw — the menu stays fully functional.
 */

export const MENU_SOUND_STORAGE_KEY = "yosite-menu-sound";

/** PLACEHOLDER: open click */
const OPEN_SRC = "/audio/menu-click.wav";
/** PLACEHOLDER: softer reverse click */
const CLOSE_SRC = "/audio/menu-close.wav";

let audioContext = null;
let mutedMemory =
  typeof window !== "undefined"
    ? window.localStorage.getItem(MENU_SOUND_STORAGE_KEY) === "off"
    : false;

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

export function isMenuSoundMuted() {
  return mutedMemory;
}

export function setMenuSoundMuted(muted) {
  mutedMemory = Boolean(muted);
  try {
    window.localStorage.setItem(
      MENU_SOUND_STORAGE_KEY,
      mutedMemory ? "off" : "on",
    );
  } catch {
    /* private mode — keep the in-memory preference */
  }
}

function synthesizeClick(kind) {
  const ctx = getContext();
  if (!ctx) return;

  const resume = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
  void resume
    .then(() => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      const open = kind === "open";
      osc.type = "triangle";
      osc.frequency.setValueAtTime(open ? 2100 : 1480, now);
      osc.frequency.exponentialRampToValueAtTime(open ? 720 : 420, now + 0.045);

      filter.type = "highpass";
      filter.frequency.value = open ? 420 : 280;

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(open ? 0.055 : 0.034, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (open ? 0.07 : 0.09));

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
      osc.onended = () => {
        try {
          osc.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch {
          /* already torn down */
        }
      };
    })
    .catch(() => {});
}

function playFile(src, kind) {
  try {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = kind === "open" ? 0.28 : 0.2;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.catch(() => synthesizeClick(kind));
    }
  } catch {
    synthesizeClick(kind);
  }
}

export function playMenuSound(kind = "open") {
  if (mutedMemory) return;
  const src = kind === "close" ? CLOSE_SRC : OPEN_SRC;
  playFile(src, kind);
}
