import { readFileSync } from "node:fs";

globalThis.self = globalThis;
if (!globalThis.document) {
  globalThis.document = { createElementNS: () => ({}) };
}

const { Box3, Vector3, AnimationMixer } = await import("three");
const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");

const buf = readFileSync(new URL("../public/models/butterfly-animated.glb", import.meta.url));
const loader = new GLTFLoader();

const gltf = await new Promise((resolve, reject) => {
  loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "", resolve, reject);
});

const { scene, animations } = gltf;
console.log("ANIM", animations.map((clip) => clip.name));
const hero = animations.find((clip) => clip.name === "HERO_ENTRY_H_LAND");
const perch = animations.find((clip) => clip.name === "PERCHED_IDLE_H");
console.log(
  "HERO TRACKS",
  hero.tracks.map((track) => `${track.name} ${track.ValueTypeName} keys=${track.times.length} interp=${track.getInterpolation?.() ?? track.createInterpolant().constructor.name}`),
);

function dumpHierarchy(obj, depth = 0) {
  const p = obj.position;
  console.log(
    `${"  ".repeat(depth)}${obj.type} ${obj.name} pos=${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`,
  );
  for (const child of obj.children) dumpHierarchy(child, depth + 1);
}
dumpHierarchy(scene);

const mixer = new AnimationMixer(scene);
const action = mixer.clipAction(hero);
action.play();

const skinned = [];
scene.traverse((obj) => {
  if (obj.isSkinnedMesh) skinned.push(obj);
});
const vertex = new Vector3();

function skinnedBox() {
  const box = new Box3();
  for (const mesh of skinned) {
    const position = mesh.geometry.attributes.position;
    mesh.skeleton.update();
    for (let i = 0; i < position.count; i += 1) {
      vertex.fromBufferAttribute(position, i);
      mesh.applyBoneTransform(i, vertex);
      vertex.applyMatrix4(mesh.matrixWorld);
      box.expandByPoint(vertex);
    }
  }
  return box;
}

function poseAt(time) {
  action.time = time;
  mixer.update(0);
  scene.updateMatrixWorld(true);
  const box = skinnedBox();
  const size = box.getSize(new Vector3());
  const root = scene.getObjectByName("Root");
  const rootWorld = root.getWorldPosition(new Vector3());
  return {
    time,
    root: root.position.toArray().map((n) => +n.toFixed(5)),
    rootWorld: rootWorld.toArray().map((n) => +n.toFixed(5)),
    size: size.toArray().map((n) => +n.toFixed(5)),
    min: box.min.toArray().map((n) => +n.toFixed(5)),
    max: box.max.toArray().map((n) => +n.toFixed(5)),
    aboveRootY: +(box.max.y - rootWorld.y).toFixed(5),
    belowRootY: +(rootWorld.y - box.min.y).toFixed(5),
    halfWidth: +((box.max.x - box.min.x) / 2).toFixed(5),
  };
}

for (const time of [0, 2.15, 4.35, 6.5, 7.55, 8.7]) {
  console.log("POSE", JSON.stringify(poseAt(time)));
}

const perchAction = mixer.clipAction(perch);
action.stop();
perchAction.play();
perchAction.time = 2.2;
mixer.update(0);
scene.updateMatrixWorld(true);
const box = skinnedBox();
const size = box.getSize(new Vector3());
const root = scene.getObjectByName("Root");
const rootWorld = root.getWorldPosition(new Vector3());
console.log(
  "PERCH",
  JSON.stringify({
    size: size.toArray().map((n) => +n.toFixed(5)),
    min: box.min.toArray().map((n) => +n.toFixed(5)),
    max: box.max.toArray().map((n) => +n.toFixed(5)),
    root: root.position.toArray(),
    aboveRootY: +(box.max.y - rootWorld.y).toFixed(5),
    belowRootY: +(rootWorld.y - box.min.y).toFixed(5),
    footLocal: [0, -0.010641, -0.016898],
    spanAboveFoot: +(box.max.y - -0.010641).toFixed(5),
    spanBelowFoot: +(-0.010641 - box.min.y).toFixed(5),
    halfWidth: +((box.max.x - box.min.x) / 2).toFixed(5),
  }),
);
