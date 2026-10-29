import { Suspense, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { LoopOnce, LoopRepeat, PMREMGenerator, Vector3 } from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  BUTTERFLY_GLB_URL,
  HERO_CLIP,
  PERCH_CLIP,
  WORLD_HEIGHT,
  butterflyCoverScale,
  butterflyDisplayScale,
  createFlightState,
  heroAnchor,
  landingRetarget,
  measureHeroFlightAnchor,
  measureHeroPerch,
  metricToWorld,
  orientFlight,
  stepFlight,
} from "../../utils/butterflyFlight";

const CLIPS = ["IDLE", "FLY", "GLIDE"];
const HEMI_ARGS = ["#f6f6f6", "#cfcfcf", 0.5];
const KEY_POS = [-0.35, 0.72, 1.05];
const FILL_POS = [0.55, 0.2, 0.85];
const RIM_POS = [-0.15, 0.35, -0.9];
const BOUNCE_POS = [0.05, -0.85, 0.45];

function mountRoomEnvironment(gl, scene) {
  const pmrem = new PMREMGenerator(gl);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.46;
  room.dispose();
  pmrem.dispose();

  return () => {
    env.texture.dispose();
    if (scene.environment === env.texture) scene.environment = null;
  };
}

function prepareModel(model) {
  model.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.frustumCulled = false;
    obj.castShadow = false;
    obj.receiveShadow = false;
    obj.raycast = () => {};
  });
}

function stopActions(actions) {
  for (const action of Object.values(actions)) {
    if (!action) continue;
    action.stop();
    action.setEffectiveWeight(0);
    action.enabled = false;
  }
}

function playAuthoredHero(actions, mixer) {
  const hero = actions[HERO_CLIP];
  const perch = actions[PERCH_CLIP];
  if (!hero || !perch) return false;
  stopActions(actions);
  hero.enabled = true;
  hero.setLoop(LoopOnce, 1);
  hero.clampWhenFinished = true;
  hero.paused = false;
  hero.timeScale = 1;
  hero.reset();
  hero.setEffectiveWeight(1);
  hero.play();
  mixer.update(0);
  return true;
}

function playAuthoredPerch(actions, mixer, hold) {
  const perch = actions[PERCH_CLIP];
  const hero = actions[HERO_CLIP];
  if (!perch) return false;
  if (hero) {
    hero.setEffectiveWeight(0);
    hero.stop();
    hero.enabled = false;
  }
  perch.enabled = true;
  perch.setLoop(LoopRepeat, Infinity);
  perch.clampWhenFinished = false;
  perch.paused = false;
  perch.timeScale = hold ? 0 : 1;
  perch.reset();
  perch.setEffectiveWeight(1);
  perch.play();
  mixer.update(0);
  return true;
}

function startClips(actions, mixer) {
  for (const name of CLIPS) {
    const action = actions[name];
    if (!action) continue;
    action.setLoop(LoopRepeat, Infinity);
    action.clampWhenFinished = false;
    action.enabled = true;
    action.reset();
    action.play();
    action.setEffectiveWeight(name === "IDLE" ? 1 : 0);
  }
  mixer.update(0);
}

function syncCamera(camera, width, height) {
  const zoom = height / WORLD_HEIGHT;
  if (camera.zoom === zoom && camera.top === height / 2 && camera.right === width / 2) return;
  camera.left = -width / 2;
  camera.right = width / 2;
  camera.top = height / 2;
  camera.bottom = -height / 2;
  camera.near = 0.01;
  camera.far = 20;
  camera.zoom = zoom;
  camera.position.set(0, 0, 4);
  camera.rotation.set(0, 0, 0);
  camera.updateProjectionMatrix();
}

function applyTimeScale(mixer, reduced) {
  mixer.timeScale = reduced ? 0 : 1;
}

function clipGoal(name, mode) {
  if (mode === "REST") return name === "GLIDE" ? 1 : 0;
  if (mode === "IDLE") return name === "IDLE" ? 1 : 0;
  return name === mode ? 1 : 0;
}

function blendClips(actions, weights, mode, blend) {
  for (const name of CLIPS) {
    const action = actions[name];
    if (!action) continue;
    const goal = clipGoal(name, mode);
    weights[name] += (goal - weights[name]) * blend;
    action.setEffectiveWeight(weights[name]);
  }
}

function setWingIntensity(actions, mode, approaching) {
  const fly = actions.FLY;
  const glide = actions.GLIDE;
  const idle = actions.IDLE;
  if (fly) fly.setEffectiveTimeScale(approaching ? 0.82 : 1);
  if (glide) glide.setEffectiveTimeScale(mode === "REST" ? 0.42 : approaching ? 0.78 : 1);
  if (idle) idle.setEffectiveTimeScale(1);
}

function sampleRootPosition(clip, time, out) {
  const track = clip?.tracks.find((item) => item.name === "Root.position");
  if (!track) {
    out.set(0, 0, 0);
    return out;
  }
  if (!track.__flightInterpolant) track.__flightInterpolant = track.createInterpolant();
  const duration = clip.duration || 0;
  const value = track.__flightInterpolant.evaluate(Math.min(Math.max(time, 0), duration));
  out.set(value[0], value[1], value[2]);
  return out;
}

function ButterflyEnvironment() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useLayoutEffect(() => mountRoomEnvironment(gl, scene), [gl, scene]);

  return (
    <>
      <hemisphereLight args={HEMI_ARGS} />
      <directionalLight position={KEY_POS} intensity={1.65} />
      <directionalLight position={FILL_POS} intensity={0.55} />
      <directionalLight position={RIM_POS} intensity={0.72} />
      <directionalLight position={BOUNCE_POS} intensity={0.32} />
    </>
  );
}

function KickFrame() {
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    invalidate();
  }, [invalidate]);
  return null;
}

function ButterflyRig({ destinationRef, motionRef, modeLabelRef, reducedMotion }) {
  const group = useRef(null);
  const flight = useRef(null);
  const weights = useRef({ IDLE: 1, FLY: 0, GLIDE: 0 });
  const modeWritten = useRef("IDLE");
  const oriented = useRef(false);
  const playedVersion = useRef(-1);
  const authoredPhase = useRef("entry");
  const showingAuthored = useRef(false);
  const anchor = useRef(new Vector3());
  const pathAnchor = useRef(new Vector3());
  const rootSample = useRef(new Vector3());
  const { scene, animations } = useGLTF(BUTTERFLY_GLB_URL);
  const { actions, mixer } = useAnimations(animations, scene);

  useLayoutEffect(() => {
    prepareModel(scene);
    const destination = destinationRef.current;
    if (destination?.authored) {
      const hold = Boolean(motionRef.current?.reduced);
      const started = hold
        ? playAuthoredPerch(actions, mixer, true)
        : playAuthoredHero(actions, mixer);
      if (started) {
        playedVersion.current = destination.version;
        authoredPhase.current = hold ? "perch" : "entry";
        showingAuthored.current = true;
      }
      return;
    }
    startClips(actions, mixer);
  }, [actions, destinationRef, mixer, motionRef, scene]);

  useLayoutEffect(() => {
    applyTimeScale(mixer, reducedMotion);
  }, [mixer, reducedMotion]);

  // A stalled frame must not skip the filmed entry. Cap that step only.
  useFrame((_, delta) => {
    if (reducedMotion || !destinationRef.current?.authored || authoredPhase.current !== "entry") {
      if (!reducedMotion) mixer.timeScale = 1;
      return;
    }
    const cap = 0.12;
    mixer.timeScale = delta > cap ? cap / Math.max(delta, 1e-4) : 1;
  }, -2);

  useFrame((state, delta) => {
    const destination = destinationRef.current;
    const motion = motionRef.current;
    const rig = group.current;
    const width = state.size.width;
    const height = state.size.height;
    if (width < 2 || height < 2 || !rig) return;
    if (width < window.innerWidth * 0.8 || height < window.innerHeight * 0.8) {
      rig.visible = false;
      return;
    }

    if (!destination.visible) {
      rig.visible = false;
      return;
    }

    if (flight.current === null) flight.current = createFlightState();
    const sim = flight.current;
    rig.visible = true;

    syncCamera(state.camera, width, height);

    const aspect = width / height;
    const reduced = Boolean(motion.reduced);
    const pathScale = butterflyDisplayScale(width, motion.coarse);

    if (destination.authored) {
      if (!actions[HERO_CLIP] || !actions[PERCH_CLIP]) {
        rig.visible = false;
        return;
      }
      const letter = measureHeroPerch();
      const flightMark = measureHeroFlightAnchor() || letter;
      if (!letter || !flightMark) {
        rig.visible = false;
        return;
      }
      const visualScale = butterflyCoverScale(letter.width, letter.height, height, pathScale);
      heroAnchor(letter.nx, letter.ny, aspect, visualScale, anchor.current);
      heroAnchor(flightMark.nx, flightMark.ny, aspect, pathScale, pathAnchor.current);

      if (!showingAuthored.current || destination.version !== playedVersion.current) {
        playedVersion.current = destination.version;
        showingAuthored.current = true;
        if (reduced) {
          playAuthoredPerch(actions, mixer, true);
          authoredPhase.current = "perch";
        } else {
          playAuthoredHero(actions, mixer);
          authoredPhase.current = "entry";
        }
      }

      const hero = actions[HERO_CLIP];
      if (
        authoredPhase.current === "entry" &&
        hero &&
        hero.time >= hero.getClip().duration - 0.02
      ) {
        playAuthoredPerch(actions, mixer, reduced);
        authoredPhase.current = "perch";
      }

      rig.quaternion.identity();
      rig.scale.setScalar(visualScale);
      const perchedNow = reduced || authoredPhase.current === "perch";
      let aim = perchedNow ? 1 : 0;
      if (perchedNow) {
        rig.position.copy(anchor.current);
      } else {
        const heroClip = hero.getClip();
        const root = rootSample.current;
        // This callback runs before the mixer. Sample the pose the mixer is about to draw.
        sampleRootPosition(heroClip, hero.time + delta * mixer.timeScale, root);
        const gap = pathAnchor.current.x - anchor.current.x;
        const retarget = landingRetarget(root.x, pathScale, gap);
        aim = retarget.aim;
        const shift = pathScale - visualScale;
        rig.position.set(
          pathAnchor.current.x + (anchor.current.x - pathAnchor.current.x) * retarget.aim + root.x * shift,
          pathAnchor.current.y + (anchor.current.y - pathAnchor.current.y) * retarget.aim + retarget.arc + root.y * shift,
          root.z * shift,
        );
      }

      const labelName = authoredPhase.current === "entry" ? "HERO" : "PERCHED";
      if (import.meta.env.DEV) {
        const clip = actions[labelName === "HERO" ? HERO_CLIP : PERCH_CLIP];
        window.__bf = {
          mode: labelName,
          t: clip?.time ?? 0,
          x: rig.position.x,
          y: rig.position.y,
          scale: visualScale,
          aim,
          letter: letter.letter,
          running: Boolean(clip?.isRunning()),
        };
      }
      const label = modeLabelRef.current;
      if (label && labelName !== modeWritten.current) {
        modeWritten.current = labelName;
        label.textContent = labelName;
      }
      return;
    }

    if (showingAuthored.current) {
      showingAuthored.current = false;
      startClips(actions, mixer);
      flight.current = createFlightState();
      oriented.current = false;
    }
    rig.scale.setScalar(pathScale);

    if (sim.settled && sim.perch && destination.track) destination.track();

    stepFlight(sim, delta, destination, {
      aspect,
      simple: Boolean(motion.coarse),
      reduced,
    });

    metricToWorld(sim.visual.x, sim.visual.y, aspect, sim.world);
    rig.position.set(sim.world.x, sim.world.y, 0);
    const perched = sim.mode === "REST";
    const lock = window.__bfLock;
    if (lock) {
      rig.quaternion.set(lock[0], lock[1], lock[2], lock[3]);
    } else {
      orientFlight(
        rig.quaternion,
        sim.heading.x,
        sim.heading.y,
        sim.bank,
        sim.pitch,
        delta,
        !oriented.current,
        perched,
      );
    }
    oriented.current = true;

    const approaching = sim.hero && sim.carrotT > 0.68 && !perched;
    const blend = 1 - Math.exp(-3.1 * Math.min(delta, 0.05));
    blendClips(actions, weights.current, reduced ? "REST" : sim.mode, reduced ? 1 : blend);
    setWingIntensity(actions, reduced ? "REST" : sim.mode, approaching);

    if (import.meta.env.DEV) {
      window.__bf = {
        mode: sim.mode,
        nx: aspect > 0 ? sim.visual.x / aspect : 0,
        ny: 1 - sim.visual.y,
        t: sim.carrotT,
        pitch: sim.pitch,
        hx: sim.heading.x,
        hy: sim.heading.y,
      };
    }

    const label = modeLabelRef.current;
    if (label && sim.mode !== modeWritten.current) {
      modeWritten.current = sim.mode;
      label.textContent = sim.mode;
    }
  }, -1);

  return (
    <group ref={group} visible={false}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}

/**
 * One butterfly. Wing and body clips stay inside the GLB.
 * `destinationRef.current` is `{ nx, ny, version }` in viewport fractions (origin top-left).
 * Increment `version` to send a new destination. The rig flies there and never teleports.
 */
export default function ButterflyFlightController({
  destinationRef,
  motionRef,
  modeLabelRef,
  reducedMotion,
}) {
  return (
    <Suspense fallback={null}>
      <KickFrame />
      <ButterflyEnvironment />
      <ButterflyRig
        destinationRef={destinationRef}
        motionRef={motionRef}
        modeLabelRef={modeLabelRef}
        reducedMotion={reducedMotion}
      />
    </Suspense>
  );
}
