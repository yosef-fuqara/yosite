# YoSite butterfly

Editable, monochrome swallowtail-inspired real-time asset. Created in Blender 5.2 LTS.

## Deliverables

- `butterfly.blend` — editable quad-dominant geometry, packed textures, material nodes, neutral studio and inspection camera.
- `../../public/models/butterfly.glb` — self-contained glTF 2.0 binary for the website; 3,530,680 bytes.
- `textures/` — the source image maps, also embedded in both deliverables.
- `previews/` — five Blender inspection renders and black/white Three.js screenshots.
- `preview.html` — local, interactive GLB inspector with orbit, named views, background and wireframe controls.

The GLB contains **23,464 triangles**, **eight mesh primitives**, and **two shared PBR materials**. No rig, skin, morph targets, animation clips, cameras or lights are exported. No decoder, external image request, Blender procedural shader, alpha blending or custom shader is needed.

## Hierarchy and future rigging

```text
Butterfly
├── Body
├── Head
├── Left_Forewing
├── Left_Hindwing
├── Right_Forewing
├── Right_Hindwing
├── Antenna_L
└── Antenna_R
```

Each wing is a closed thin shell with separate dorsal/ventral UV islands and a narrow rim island. Thickness is approximately 0.045 mm distally and 0.110 mm at the root. Camber and subtle edge fluting are modeled. The front and rear wings overlap naturally at different heights; they are independent meshes. The source has `WingRoot` and `WingFlex` vertex groups for later weighting, without an armature or deformation modifier.

The thorax and segmented abdomen are continuous. Six low-poly legs have welded junctions to the body, with the internal attachment caps removed. The head has integrated lateral eye lobes; each antenna is a curved, continuous tube with a small clubbed end.

- **Units:** meters. Wingspan approximately **106.6 mm**; overall fore/aft extent 77.7 mm.
- **Blender:** X left/right, +Y forward, +Z up.
- **GLB / Three.js:** X left/right, −Z forward, +Y up.
- Root is at the thorax/world origin. All mesh scales are one and rotations are identity; component translations position their anatomical origins.
- Wing origins are at the thoracic attachment. The hinge axis is local Y in Blender, corresponding to local Z in the GLB. A positive local-Z rotation lifts the right wings; a negative rotation lifts the left wings.
- Forewing pivots in GLB meters: `(±0.0016, 0.00105, −0.0024)`.
- Hindwing pivots in GLB meters: `(±0.0016, −0.00010, 0.0014)`.
- Preserve the component nodes and their local geometry when introducing a rig. The current open-wing pose is the modeling/rest pose.

## Materials and textures

| Map | Resolution | Purpose |
| --- | --- | --- |
| `wing_basecolor.png` | 2048² | Monochrome scale pattern, dorsal and softer ventral markings |
| `wing_orm.png` | 1024² | R=1, G=roughness, B=0 metallic |
| `wing_normal.png` | 1024² | Raised veins and restrained scale relief, tangent-space OpenGL convention |
| `wing_transmission.png` | 1024² | Small transmission amount in pale cells; dark veins/borders remain opaque |
| `body_normal.png` | 256² | Repeating fine chitin detail |

Base color uses sRGB; data maps are linear/non-color. Left/right wings reuse the same atlas. Dorsal and ventral patterns occupy different atlas rows, with padding. Slight geometric camber asymmetry is intentional. Body UVs tile the reusable micro-normal texture; tiny caps have non-degenerate planar UVs.

The two materials are nonmetallic, with no clearcoat. Wing roughness is roughly 0.65–0.75. The GLB uses `KHR_materials_transmission`, `KHR_materials_sheen` and `KHR_materials_ior`, which Three.js GLTFLoader maps to its physical material. Sheen intensity is encoded in the exported tint to avoid a Blender sheen-weight interchange mismatch. The transmission texture contains at most about 6% transmission, rather than a glass-like surface.

The standard Three.js renderer measured **12 draw calls** for this asset with transmission enabled: eight visible primitives and four opaque objects rendered to the transmission buffer. Disable the wing material's `transmission` at runtime only if a future mobile performance budget needs to eliminate that extra pass. This is an optional integration tradeoff, not applied to the delivered asset.

Use neutral soft environment lighting with a modest rim light to reveal the black silhouette on black pages. Both backgrounds were tested with the same light setup. Rendering is lighting-dependent; the asset contains no baked illumination. The inspector renders on demand rather than running a permanent animation loop. Browser verification used desktop Chrome with software WebGL; no physical-phone performance benchmark is claimed.

## Verification

- `validation.json`: counts, signed volumes, component transforms, zero non-manifold edges and zero degenerate mesh faces.
- `topology-validation.json`: each part is one connected closed shell; zero duplicate faces, loose vertices, n-gons, zero-area UV faces or inverted dorsal/ventral wing faces.
- `gltf-validation.json`: official Khronos glTF Validator — **zero errors and zero warnings**.
- `webgl-validation.json`: Three.js load, dimensions, node names, materials, draw calls, unchanged hinge positions during temporary rotation checks, and browser errors.
- Top, front, side, three-quarter and underside were inspected. A small-scale browser render is included. Temporary pivot checks are not saved as animation.

## Rebuild and preview

From the repository root, with Pillow and NumPy available in system Python:

```powershell
python blender/butterfly/make_textures.py
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python blender/butterfly/build_butterfly.py
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python blender/butterfly/inspect_source.py
```

The build recreates only the butterfly deliverables. Add `-- --skip-renders` to skip the five Cycles preview renders. `anatomy.py` contains the outline, curvature and atlas mapping shared by the texture and mesh generators. This is a designed swallowtail-inspired asset, not a scan or a species-specific scientific reconstruction.

For the local inspector, use the repository's installed Three.js package:

```powershell
python -m http.server 8876 --bind 127.0.0.1
```

Open `http://127.0.0.1:8876/blender/butterfly/preview.html`. `node blender/butterfly/verify_webgl.mjs` repeats the browser screenshots/checks using the locally installed Chrome and Puppeteer. The inspector is an asset-review utility, not part of the site's production UI. The model has not been added to the live website.
