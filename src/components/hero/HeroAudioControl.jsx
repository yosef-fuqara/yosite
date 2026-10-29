import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const AUDIO_SRC = "/audio/hero-song.mp3";
const INITIAL_VOLUME = 0.32;

/** Survives Strict Mode remounts and HMR so only one Audio exists. */
let heroAudioSingleton = null;

function getHeroAudio() {
  if (typeof Audio === "undefined") return null;
  if (!heroAudioSingleton) {
    const audio = new Audio(AUDIO_SRC);
    audio.preload = "metadata";
    audio.volume = INITIAL_VOLUME;
    heroAudioSingleton = audio;
  }
  return heroAudioSingleton;
}

/**
 * Four thin bars — paused heights are calm & uneven.
 * Playing: independent scaleY ranges / durations / phase offsets.
 */
const BARS = [
  {
    id: "1",
    paused: 0.34,
    keyframes: [0.34, 0.52, 0.28, 0.48, 0.34],
    duration: 0.52,
    delay: 0.04,
  },
  {
    id: "2",
    paused: 0.58,
    keyframes: [0.58, 0.38, 0.78, 0.48, 0.58],
    duration: 0.68,
    delay: 0.16,
  },
  {
    id: "3",
    paused: 0.88,
    keyframes: [0.88, 0.55, 0.95, 0.42, 0.88],
    duration: 0.78,
    delay: 0,
  },
  {
    id: "4",
    paused: 0.42,
    keyframes: [0.42, 0.68, 0.36, 0.62, 0.42],
    duration: 0.58,
    delay: 0.26,
  },
];

const WAVE_EASE = "easeInOut";
const SETTLE_EASE = [0.22, 1, 0.36, 1];

export default function HeroAudioControl({ visible = true }) {
  const reducedMotion = useReducedMotion();
  const [playing, setPlaying] = useState(
    () => Boolean(heroAudioSingleton && !heroAudioSingleton.paused && !heroAudioSingleton.ended),
  );
  const ownedRef = useRef(false);
  const playingRef = useRef(false);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    const audio = getHeroAudio();
    if (!audio) return undefined;

    ownedRef.current = true;

    const onEnded = () => {
      audio.currentTime = 0;
      setPlaying(false);
    };
    const onPause = () => {
      if (!audio.ended && playingRef.current && audio.paused) {
        setPlaying(false);
      }
    };
    const onPlay = () => {
      if (!playingRef.current) setPlaying(true);
    };

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);

    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
      if (ownedRef.current && !audio.paused) {
        audio.pause();
      }
      ownedRef.current = false;
    };
  }, []);

  const toggle = async () => {
    const audio = getHeroAudio();
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      setPlaying(false);
      return;
    }

    try {
      audio.volume = INITIAL_VOLUME;
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      void toggle();
    }
  };

  const onClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    void toggle();
  };

  const label = playing ? "Pause background music" : "Play background music";
  const animateWave = playing && !reducedMotion;

  return (
    <div
      className="yo-hero__audio yo-chrome-invert"
      data-hero-chrome="audio"
      data-entrance={visible ? "done" : "pending"}
      style={{ pointerEvents: visible ? "auto" : "none" }}
      aria-hidden={!visible}
    >
      <button
        type="button"
        className={`yo-hero__audio-btn${playing ? " is-playing" : ""}`}
        aria-label={label}
        aria-pressed={playing}
        tabIndex={visible ? 0 : -1}
        onClick={onClick}
        onKeyDown={onKeyDown}
      >
        <span className="yo-hero__audio-bars" aria-hidden="true">
          {BARS.map((bar) => (
            <motion.span
              key={bar.id}
              className="yo-hero__audio-bar"
              initial={false}
              animate={
                animateWave
                  ? { scaleY: bar.keyframes }
                  : { scaleY: bar.paused }
              }
              transition={
                animateWave
                  ? {
                      duration: bar.duration,
                      ease: WAVE_EASE,
                      delay: bar.delay,
                      repeat: Infinity,
                      repeatType: "loop",
                    }
                  : {
                      duration: reducedMotion ? 0 : 0.4,
                      ease: SETTLE_EASE,
                    }
              }
            />
          ))}
        </span>
      </button>
    </div>
  );
}
