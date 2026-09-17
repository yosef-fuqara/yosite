import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "framer-motion";
import gsap from "gsap";
import HeroAudioControl from "./HeroAudioControl";
import { useI18n } from "../../i18n/I18nContext";
import { isHeroMarksReady, isPageIntroReady, onHeroMarksReady } from "../../utils/pageIntroGate";
import "../../styles/hero.css";

const CHROME_EASE = "power3.out";
const CHROME_FROM_X = 96;
const CHROME_DURATION = 0.55;

/** Set when the chrome timeline starts — blocks Strict Mode / remount replays. */
let chromeEntrancePlayed = false;

function exitStyle(delay) {
  return { "--hero-exit-delay": delay };
}

function splitLetters(word, kind, exitStart = 0) {
  return word.split("").map((ch, i) => {
    const isSpace = ch === " ";

    return (
      <span
        key={`${kind}-${exitStart}-${i}`}
        className={`yo-hero__char-clip${isSpace ? " is-space" : ""}`}
        style={exitStyle((exitStart + i) * 0.022)}
      >
        <span className="yo-hero__char" data-hero-char={kind} data-hero-exit="">
          {isSpace ? (
            "\u00A0"
          ) : (
            <span className="yo-hero__glyph" data-hero-glyph="">
              {ch}
            </span>
          )}
        </span>
      </span>
    );
  });
}

export default function HeroSection() {
  const { t, dir } = useI18n();
  const reducedMotion = useReducedMotion();
  const rootRef = useRef(null);

  const line1 = t("hero.headlineLine1");
  const line2 = t("hero.headlineLine2");
  const aria = t("hero.headlineAria");

  const [chromeVisible, setChromeVisible] = useState(
    () => Boolean(reducedMotion) || isHeroMarksReady() || isPageIntroReady(),
  );

  useEffect(() => {
    if (reducedMotion || isHeroMarksReady() || isPageIntroReady()) {
      setChromeVisible(true);
      return undefined;
    }
    return onHeroMarksReady(() => setChromeVisible(true));
  }, [reducedMotion]);

  useLayoutEffect(() => {
    const aside = document.querySelector(".yo-hero__aside");
    const audio = document.querySelector(".yo-hero__audio");
    const chrome = [aside, audio].filter(Boolean);
    if (!chrome.length) return undefined;

    const applyDone = () => {
      chrome.forEach((el) => {
        gsap.set(el, {
          clearProps: "transform,opacity,x,autoAlpha",
        });
        el.dataset.entrance = "done";
      });
    };

    if (reducedMotion || chromeEntrancePlayed) {
      applyDone();
      return undefined;
    }

    if (!chromeVisible) {
      chrome.forEach((el) => {
        el.dataset.entrance = "pending";
      });
      return undefined;
    }

    const leftChrome = [audio].filter(Boolean);
    const rightChrome = [aside].filter(Boolean);

    chromeEntrancePlayed = true;
    chrome.forEach((el) => {
      el.dataset.entrance = "playing";
    });

    if (leftChrome.length) {
      gsap.set(leftChrome, {
        x: -CHROME_FROM_X,
        autoAlpha: 0,
        force3D: true,
      });
    }
    if (rightChrome.length) {
      gsap.set(rightChrome, {
        x: CHROME_FROM_X,
        autoAlpha: 0,
        force3D: true,
      });
    }

    const tl = gsap.timeline({ onComplete: applyDone });

    if (leftChrome.length) {
      tl.to(
        leftChrome,
        {
          x: 0,
          autoAlpha: 1,
          duration: CHROME_DURATION,
          ease: CHROME_EASE,
        },
        0,
      );
    }
    if (rightChrome.length) {
      tl.to(
        rightChrome,
        {
          x: 0,
          autoAlpha: 1,
          duration: CHROME_DURATION,
          ease: CHROME_EASE,
        },
        0,
      );
    }

    return () => {
      tl.kill();
    };
  }, [chromeVisible, reducedMotion]);

  return (
    <section ref={rootRef} id="hero" className="yo-hero" aria-label="Hero">
      <div className="yo-hero__content">
        <h1 className="yo-hero__title" aria-label={aria} dir={dir}>
          <span className="yo-hero__line" aria-hidden="true">
            {splitLetters(line1, "line1")}
          </span>
          <span className="yo-hero__line yo-hero__line--soul" aria-hidden="true">
            {splitLetters(line2, "line2", line1.length)}
          </span>
        </h1>
      </div>

      <aside className="yo-hero__year" aria-label="Established 2026">
        <div className="yo-hero__year-inner">
          <span className="yo-hero__year-mark" aria-hidden="true">
            <span>2</span>
            <span>0</span>
            <span>2</span>
            <span>6</span>
          </span>
        </div>
      </aside>

      {typeof document !== "undefined" &&
        createPortal(
          <>
            <aside className="yo-hero__aside" aria-label="Web experiences">
              <div className="yo-hero__aside-body">
                <span className="yo-hero__aside-track" aria-hidden="true">
                  <span className="yo-hero__aside-rule" />
                  <span className="yo-hero__aside-dot" />
                </span>

                <div className="yo-hero__aside-label-clip">
                  <span className="yo-hero__aside-label-motion">
                    <span className="yo-hero__aside-label">Web experiences</span>
                  </span>
                </div>
              </div>
            </aside>

            <HeroAudioControl visible={chromeVisible} />
          </>,
          document.body,
        )}
    </section>
  );
}
