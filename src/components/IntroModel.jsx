import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { AnimationMixer, LoopOnce, MeshBasicMaterial } from "three";
import {
  INTRO_MODEL_URL,
  clipTimeFromElapsed,
  fitIntroCamera,
  isIntroCurtainName,
  measureIntroMarkScreen,
} from "../utils/introModel";
import { shouldInvertIntroMaterials } from "../utils/introSequence";

useGLTF.preload(INTRO_MODEL_URL);

const WHITE = new MeshBasicMaterial({
  color: 0xffffff,
  toneMapped: false,
});
const WHITE_MORPH = new MeshBasicMaterial({
  color: 0xffffff,
  toneMapped: false,
  morphTargets: true,
});
const BLACK = new MeshBasicMaterial({
  color: 0x000000,
  toneMapped: false,
});
const BLACK_MORPH = new MeshBasicMaterial({
  color: 0x000000,
  toneMapped: false,
  morphTargets: true,
});

function isCurtainName(name) {
  return isIntroCurtainName(name);
}

function isBallFaceName(name) {
  return /^(?:Face_|Left_eye$|Right_eye$|Mouth_)/i.test(name || "");
}

function isBlackMaterial(material) {
  const hex = material?.color?.getHexString?.();
  return hex === "000000" || /black/i.test(material?.name || "");
}

function prepareIntroRoot(scene) {
  const root = scene.clone(true);

  root.traverse((obj) => {
    if (obj.isCamera) {
      obj.visible = false;
    }

    if (isCurtainName(obj.name)) {
      obj.visible = false;
      return;
    }

    if (isBallFaceName(obj.name)) {
      obj.visible = false;
      return;
    }

    if (!obj.isMesh) return;

    obj.castShadow = false;
    obj.receiveShadow = false;
    obj.raycast = () => {};

    const morph = Boolean(obj.morphTargetInfluences?.length);
    if (isBlackMaterial(obj.material)) {
      obj.userData.introInk = "black";
      obj.material = morph ? BLACK_MORPH : BLACK;
    } else {
      obj.userData.introInk = "white";
      obj.material = morph ? WHITE_MORPH : WHITE;
    }
  });

  return root;
}

function applyIntroInk(root, invert) {
  root.traverse((obj) => {
    if (!obj.isMesh || isCurtainName(obj.name)) return;
    const morph = Boolean(obj.morphTargetInfluences?.length);
    const black = invert || obj.userData.introInk === "black";
    obj.material = black
      ? morph
        ? BLACK_MORPH
        : BLACK
      : morph
        ? WHITE_MORPH
        : WHITE;
  });
}

function FitCamera() {
  const { camera, size, gl } = useThree();
  const lockedRef = useRef(false);

  useLayoutEffect(() => {
    if (lockedRef.current) return;
    const parent = gl?.domElement?.parentElement;
    const w = parent?.clientWidth || size.width;
    const h = parent?.clientHeight || size.height;
    fitIntroCamera(camera, w, h);
    if (document.documentElement.classList.contains("yo-intro-handoff")) {
      lockedRef.current = true;
    }
  }, [camera, size.width, size.height, gl]);

  return null;
}

function IntroRig({ playing, onReady, boundsApiRef }) {
  const { camera, gl } = useThree();
  const { scene, animations } = useGLTF(INTRO_MODEL_URL);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const root = useMemo(() => prepareIntroRoot(scene), [scene]);
  const mixerRef = useRef(null);
  const actionsRef = useRef([]);
  const startedAtRef = useRef(0);
  const invertedRef = useRef(false);

  useLayoutEffect(() => {
    const mixer = new AnimationMixer(root);
    const actions = animations.map((clip) => {
      const action = mixer.clipAction(clip);
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      action.paused = true;
      action.play();
      return action;
    });

    mixer.update(0);
    mixerRef.current = mixer;
    actionsRef.current = actions;
    onReadyRef.current?.();

    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
      mixerRef.current = null;
      actionsRef.current = [];
    };
  }, [root, animations]);

  useLayoutEffect(() => {
    if (!boundsApiRef) return undefined;
    boundsApiRef.current = () => measureIntroMarkScreen(root, camera, gl);
    return () => {
      boundsApiRef.current = null;
    };
  }, [boundsApiRef, root, camera, gl]);

  useEffect(() => {
    const mixer = mixerRef.current;
    const actions = actionsRef.current;
    if (!mixer || !actions.length) return;

    mixer.setTime(0);
    actions.forEach((action) => {
      action.reset();
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      action.paused = !playing;
      action.play();
    });
    mixer.setTime(0);
    startedAtRef.current = playing ? performance.now() : 0;
  }, [playing]);

  useFrame(() => {
    const invert = shouldInvertIntroMaterials();
    if (invert !== invertedRef.current) {
      invertedRef.current = invert;
      applyIntroInk(root, invert);
    }

    const mixer = mixerRef.current;
    if (!playing || !mixer || !startedAtRef.current) return;
    const elapsed = (performance.now() - startedAtRef.current) / 1000;
    mixer.setTime(clipTimeFromElapsed(elapsed));
  });

  return <primitive object={root} />;
}

class IntroErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export default function IntroModel({ playing, onReady, onError, boundsApiRef }) {
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  return (
    <IntroErrorBoundary onError={onError}>
      <Canvas
        className="yo-intro__canvas"
        orthographic
        camera={{ position: [0, 0, 8], near: 0.1, far: 1000, zoom: 1 }}
        dpr={[1, 2]}
        resize={{ offsetSize: true }}
        gl={{
          antialias: true,
          alpha: true,
          premultipliedAlpha: true,
          powerPreference: "high-performance",
          failIfMajorPerformanceCaveat: false,
        }}
        flat
        frameloop="always"
        style={{ pointerEvents: "none", display: "block", background: "transparent" }}
        onCreated={({ gl, camera, size }) => {
          try {
            gl.setClearColor(0x000000, 0);
            fitIntroCamera(camera, size.width, size.height);
          } catch {
            onErrorRef.current?.();
          }
        }}
      >
        <FitCamera />
        <Suspense fallback={null}>
          <IntroRig
            playing={playing}
            onReady={onReady}
            boundsApiRef={boundsApiRef}
          />
        </Suspense>
      </Canvas>
    </IntroErrorBoundary>
  );
}
