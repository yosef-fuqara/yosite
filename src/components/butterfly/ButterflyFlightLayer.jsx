import { Component, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Canvas } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { AgXToneMapping, SRGBColorSpace } from "three";
import ButterflyFlightController from "./ButterflyFlightController";
import { onPageIntroComplete } from "../../utils/pageIntroGate";
import { hasWebGL } from "../../utils/introModel";
import { BUTTERFLY_GLB_URL, measureHeroPerch } from "../../utils/butterflyFlight";
import "../../styles/butterfly-flight.css";

const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const HERO_HOLD_MS = 480;
const FLIGHT_CAMERA = { position: [0, 0, 4], zoom: 800, near: 0.01, far: 20 };
const CANVAS_STYLE = {
  position: "fixed",
  inset: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  zIndex: 9200,
  background: "transparent",
  overflow: "hidden",
};

function isCoarsePointer() {
  return typeof window !== "undefined" && !window.matchMedia(FINE_POINTER).matches;
}

function whenHeroSettled(onReady) {
  const hero = document.getElementById("hero");
  if (hero?.dataset.entrance === "done") {
    onReady();
    return () => {};
  }

  const obs = new MutationObserver(() => {
    if (document.getElementById("hero")?.dataset.entrance === "done") {
      obs.disconnect();
      onReady();
    }
  });
  obs.observe(hero || document.documentElement, {
    attributes: true,
    attributeFilter: ["data-entrance"],
    subtree: !hero,
  });
  return () => obs.disconnect();
}

function cueHeroEntrance(destinationRef) {
  const destination = destinationRef.current;
  const perch = measureHeroPerch();
  if (!perch) return false;

  destination.authored = true;
  destination.hero = true;
  destination.perch = true;
  destination.visible = true;
  destination.route = null;
  destination.place = false;
  destination.track = null;
  destination.nx = perch.nx;
  destination.ny = perch.ny;
  destination.version += 1;
  return true;
}

function ButterflyErrorBoundary({ children, onError }) {
  return <ButterflyErrorCatch onError={onError}>{children}</ButterflyErrorCatch>;
}

class ButterflyErrorCatch extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function ButterflyFlightStage({ destinationRef, motionRef, modeLabelRef, reduced }) {
  const [glConfig] = useState(() => {
    const coarse = isCoarsePointer();
    return {
      dpr: [1, coarse ? 1.15 : 1.6],
      gl: {
        antialias: !coarse,
        alpha: true,
        premultipliedAlpha: true,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
        failIfMajorPerformanceCaveat: false,
      },
    };
  });

  return (
    <>
      <Canvas
        className="yo-butterfly-canvas"
        style={CANVAS_STYLE}
        orthographic
        camera={FLIGHT_CAMERA}
        dpr={glConfig.dpr}
        gl={glConfig.gl}
        frameloop={reduced ? "demand" : "always"}
        onCreated={({ gl: renderer }) => {
          renderer.setClearColor(0x000000, 0);
          renderer.toneMapping = AgXToneMapping;
          renderer.toneMappingExposure = 1.02;
          renderer.outputColorSpace = SRGBColorSpace;
          renderer.domElement.tabIndex = -1;
          renderer.domElement.setAttribute("aria-hidden", "true");
        }}
      >
        <ButterflyErrorBoundary>
          <ButterflyFlightController
            destinationRef={destinationRef}
            motionRef={motionRef}
            modeLabelRef={modeLabelRef}
            reducedMotion={reduced}
          />
        </ButterflyErrorBoundary>
      </Canvas>
    </>
  );
}

export default function ButterflyFlightLayer() {
  const destinationRef = useRef({
    nx: -0.2,
    ny: 0.64,
    version: 0,
    route: null,
    authored: true,
    hero: true,
    perch: true,
    place: false,
    visible: false,
    track: null,
  });
  const motionRef = useRef({ reduced: false, coarse: false });
  const modeLabelRef = useRef(null);
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION).matches,
  );
  const [cued, setCued] = useState(false);
  const [webgl] = useState(() => (typeof window !== "undefined" ? hasWebGL() : false));

  useEffect(() => {
    motionRef.current.reduced = reduced;
    motionRef.current.coarse = isCoarsePointer();
  }, [reduced]);

  useEffect(() => {
    if (!webgl) return undefined;

    const reducedQuery = window.matchMedia(REDUCED_MOTION);
    const fineQuery = window.matchMedia(FINE_POINTER);
    const sync = () => {
      const nextReduced = reducedQuery.matches;
      motionRef.current.reduced = nextReduced;
      motionRef.current.coarse = !fineQuery.matches;
      setReduced(nextReduced);
    };
    sync();
    reducedQuery.addEventListener("change", sync);
    fineQuery.addEventListener("change", sync);
    return () => {
      reducedQuery.removeEventListener("change", sync);
      fineQuery.removeEventListener("change", sync);
    };
  }, [webgl]);

  useEffect(() => {
    if (!webgl) return undefined;

    let timer = 0;
    let retry = 0;
    let stopHero = () => {};
    let cancelled = false;

    const arm = () => {
      useGLTF.preload(BUTTERFLY_GLB_URL);
      timer = window.setTimeout(() => {
        if (cancelled) return;
        const tryCue = () => {
          if (cancelled) return;
          if (cueHeroEntrance(destinationRef)) {
            setCued(true);
            return;
          }
          retry = window.setTimeout(tryCue, 120);
        };
        tryCue();
      }, HERO_HOLD_MS);
    };

    const stopIntro = onPageIntroComplete(() => {
      stopHero = whenHeroSettled(() => {
        if (!cancelled) arm();
      });
    });

    return () => {
      cancelled = true;
      stopIntro();
      stopHero();
      window.clearTimeout(timer);
      window.clearTimeout(retry);
    };
  }, [webgl]);

  if (!webgl || !cued) return null;

  return createPortal(
    <ButterflyFlightStage
      destinationRef={destinationRef}
      motionRef={motionRef}
      modeLabelRef={modeLabelRef}
      reduced={reduced}
    />,
    document.body,
  );
}
