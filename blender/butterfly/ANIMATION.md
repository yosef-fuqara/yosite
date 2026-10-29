# YoSite butterfly — animation handoff

## Files

- **Website asset:** `../../public/models/butterfly-animated.glb`
- **Editable source:** `butterfly-animated.blend`
- **Interactive Three.js inspector:** `animation-preview.html`
- **Inspection images:** `animation-previews/`

The original `butterfly.blend` and `butterfly.glb` are unchanged; their SHA-256 checksums are recorded in `rig-validation.json`. The animated model retains the original 23,464 triangles, eight mesh components, two PBR materials, all UVs and packed textures, real-world scale, and all four authored wing origins. The GLB is approximately 4.08 MB and requires no geometry decoder or external texture files.

## Clips

| Clip | Duration | Motion |
| --- | --- | --- |
| `IDLE` | 4 seconds | Slow, gentle wing opening; small body pitch and breathing motion |
| `FLY` | 2 seconds | Same six wingbeats retimed to half speed, slightly faster downstroke, delayed hindwings, minute bilateral variation, body pitch and vertical recoil |
| `GLIDE` | 3 seconds | Mostly open wings with a small stabilization movement |

Every clip is in place. There is no forward translation, flight path or scroll behavior. The Root has no animation channels. The Body's local vertical motion is at most approximately 0.28 mm in FLY, 0.075 mm in IDLE and 0.05 mm in GLIDE, around zero. Body pitch reaches approximately two degrees in FLY.

FLY forewings sweep approximately −34° to +62° relative to the authored pose, with slight cyclic modulation. Hindwings have a small phase delay, slightly lower amplitude and a lower average elevation. A subtle difference in forewing/hindwing stroke planes maintains clearance at the thorax. Mirrored movement and sub-degree variation preserve bilateral balance.

All glTF animation channels use **CUBICSPLINE** interpolation with matching first/last values and first/last tangents. Clips repeat without a pose or velocity jump. The Blender actions also have matching endpoint handles and Cycles modifiers.

## Rig

```text
Root
└── Body
    ├── Left_Forewing
    ├── Left_Hindwing
    ├── Right_Forewing
    └── Right_Hindwing
```

One armature, six bones, one shared exported skin. Each vertex has one normalized influence. Body, head, legs and antennae follow Body. Each wing follows its own wing bone. The wings' modeled curvature, thin shell thickness and rim shape remain intact throughout the motion; there are no bend shapes, extra mesh subdivisions or helper-bone dependencies. Organic motion comes from stroke timing, phase differences, small changes in stroke plane, and the body's reaction.

Wing bone heads coincide with the four original anatomical pivots. Their rest axes follow Blender's +Y hinge axis. The Blender component origins and transforms remain unchanged. The GLB uses the same world orientation as the static export: meters, +Y up, −Z forward. The exported Root's constant rotation converts Blender's coordinate basis; it is not animated root rotation.

The Blender source retains the original object names. Exported mesh nodes have the `_Mesh` suffix to distinguish them from same-named bones and make AnimationMixer binding unambiguous. Each mesh also carries `original_component`, `skin_bone` and `original_pivot_blender_m` metadata.

Skinned mesh nodes sit at the glTF scene root, while the skeleton remains under `Butterfly / Butterfly_Rig`. This follows the glTF skin transform rules and avoids validator warnings. Keep the complete `gltf.scene` as the asset container for future placement or flight. The Root bone remains available as an unanimated control.

## Verification

- Official Khronos glTF Validator: **zero errors, zero warnings**.
- Reopened both `.blend` files and compared every vertex, face, UV coordinate, smoothing flag, mesh transform, material assignment and packed image. All original authored data matches.
- The animated and static GLBs have identical material definitions, texture definitions and embedded image bytes.
- Three.js bind-pose vertex positions match the static asset within approximately **2 nanometers**, consistent with floating-point conversion.
- All three named clips load and play through AnimationMixer.
- Loop endpoint positions, normalized rotations and cubic tangents match. Repeating each clip 100 times produces no measurable drift; the Root stays exactly at the origin.
- Checked **1,383 animation poses**: FLY at 480 samples/second, IDLE and GLIDE at 60 samples/second, including each endpoint.
- Triangle-based collision checks cover all wing pairs, the thorax/legs, head and antennae. No new collisions were found outside the original wing-to-thorax attachment region. That pre-existing attachment overlap is measured from the unchanged bind pose, with a 0.1 mm numerical/attachment margin; it is not treated as an animation defect.
- Checked deformed triangle areas and orientation: no collapsed or flipped faces. Normal alignment remains above 0.99999999 and triangle area changes stay within floating-point tolerance.
- Captured the upstroke, downstroke and extrema of each clip, with additional top, side and underside inspections. Black and white inspection backgrounds use the same neutral lighting.

Reports: `rig-validation.json`, `animated-source-validation.json`, `animated-gltf-validation.json`, `animation-webgl-validation.json`, and `animation-retime-validation.json`.

Validation uses desktop Chrome with software WebGL. It confirms export correctness and playback behavior; it is not a physical-phone performance benchmark.

## Blender editing

Select `Butterfly_Rig` and choose IDLE, FLY or GLIDE in the Action Editor. Actions are authored at 120 fps. Unique playback frames are 0–479 for IDLE, 0–239 for FLY and 0–359 for GLIDE. Each action also has the duplicated closing endpoint at frame 480, 240 or 360 respectively. The saved Blender timeline is set to IDLE's unique frames, so that endpoint is not held twice during viewport looping.

The source's original geometry and wing preparation groups remain editable. No armature modifiers have been applied destructively.

## Preview and rebuild

From the repository root:

```powershell
python -m http.server 8876 --bind 127.0.0.1
```

Open `http://127.0.0.1:8876/blender/butterfly/animation-preview.html` for clip selection, real-time/slow playback, pause, scrubbing, five inspection angles and background switching. This is a separate asset inspector; no website components have been changed.

Rebuild from the unchanged source:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python blender/butterfly/rig_butterfly.py
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python blender/butterfly/inspect_animated_source.py
node blender/butterfly/verify_animation.mjs
```

`smooth_animation_glb.py` is part of the export pipeline: it converts sampled channels to periodic cubic splines and normalizes the skinned-node hierarchy. Running only Blender's stock exporter does not perform that final step.

`retime_fly.py` retimes the existing FLY action and GLB data by scaling FLY time to two seconds and its cubic tangents by the inverse factor; pose values and the IDLE/GLIDE clips are unchanged.

For future Three.js integration, use GLTFLoader and AnimationMixer with the named clips and `LoopRepeat`. The inspector disables per-mesh frustum culling so changing wing poses cannot be cut off by stale skinned bounds; a future integration should use conservative animated bounds or the same setting. Use `SkeletonUtils.clone` if multiple independently animated instances are needed. No production flight or scroll integration is included in this phase.
