import { createPortal } from "react-dom";
import HeroAudioControl from "./hero/HeroAudioControl";

/** Viewport controls stay outside the scrolling page and the hiding header. */
export default function PersistentSideChrome() {
  return createPortal(
    <>
      <aside className="yo-hero__aside yo-chrome-invert" data-entrance="done" aria-label="Web Experiment">
        <div className="yo-hero__aside-body">
          <span className="yo-hero__aside-track" aria-hidden="true">
            <span className="yo-hero__aside-rule" />
            <span className="yo-hero__aside-dot" />
          </span>
          <span className="yo-hero__aside-label-clip">
            <span className="yo-hero__aside-label-motion">
              <span className="yo-hero__aside-label">WEB EXPERIMENT</span>
            </span>
          </span>
        </div>
      </aside>
      <HeroAudioControl />
    </>,
    document.body,
  );
}
