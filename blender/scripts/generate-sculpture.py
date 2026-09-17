# YoSite hero sculpture generator
# ---------------------------------
# Builds the layered "topographic" white sculpture from the hero reference:
# ~110 thin horizontal contour slices stacked vertically with an asymmetric,
# architectural silhouette (heavy base -> waist -> upper bulge -> twisted
# neck -> angular cap), a matte white PBR material, studio lighting, a
# preview camera and automatic GLB export.
#
# Run inside Blender (4.x):
#   blender --background --python generate-sculpture.py
# or paste into the scripting tab. Paths are configured below.

import bpy
import bmesh
import math
import random
import os

# ----------------------------------------------------------------------------
# Configuration
# ----------------------------------------------------------------------------
PROJECT_ROOT = os.environ.get(
    "YOSITE_ROOT",
    r"C:\Users\yosef\OneDrive\שולחן העבודה\projects\yo-site",
)
GLB_PATH = os.path.join(PROJECT_ROOT, "public", "models", "yosite-sculpture.glb")
BLEND_PATH = os.path.join(PROJECT_ROOT, "blender", "yosite-sculpture.blend")
PREVIEW_PATH = os.path.join(PROJECT_ROOT, "public", "previews", "yosite-sculpture-preview.webp")

SLICES = 112            # number of horizontal contour layers
RING_VERTS = 72         # vertices per contour ring
HEIGHT = 2.55           # total model height (metres)
MAX_RADIUS = 0.52       # nominal max radius before shaping
FILL = 0.80             # slice thickness as fraction of the vertical step
SEED = 7

random.seed(SEED)

# ----------------------------------------------------------------------------
# Silhouette definition
# ----------------------------------------------------------------------------
# Control curves are defined as (t, value) keys with smooth cosine
# interpolation. t runs 0 (floor) -> 1 (top).

def smooth_samples(keys, t):
    """Cosine-smoothed interpolation through (t, value) control points."""
    if t <= keys[0][0]:
        return keys[0][1]
    if t >= keys[-1][0]:
        return keys[-1][1]
    for i in range(len(keys) - 1):
        t0, v0 = keys[i]
        t1, v1 = keys[i + 1]
        if t0 <= t <= t1:
            f = (t - t0) / (t1 - t0)
            f = 0.5 - 0.5 * math.cos(math.pi * f)  # smooth ease
            return v0 + (v1 - v0) * f
    return keys[-1][1]

# Overall radial scale — heavy base, waist ~0.3, dominant bulge ~0.55,
# narrow neck ~0.84, compact cap.
SCALE_KEYS = [
    (0.00, 0.92), (0.04, 1.00), (0.10, 0.97), (0.16, 0.84),
    (0.22, 0.62), (0.28, 0.46), (0.34, 0.40), (0.40, 0.47),
    (0.46, 0.68), (0.52, 0.86), (0.58, 0.93), (0.64, 0.87),
    (0.70, 0.68), (0.76, 0.46), (0.82, 0.32), (0.88, 0.255),
    (0.93, 0.27), (1.00, 0.30),
]

# X-anisotropy (widen along screen-left axis at the base / bulge).
AX_KEYS = [
    (0.00, 0.30), (0.14, 0.24), (0.30, 0.04), (0.50, 0.10),
    (0.62, 0.08), (0.80, 0.00), (1.00, 0.05),
]

# Horizontal drift of the slice centres (negative X = screen left).
CX_KEYS = [
    (0.00, -0.08), (0.08, -0.12), (0.18, -0.09), (0.28, 0.00),
    (0.36, 0.05), (0.46, -0.02), (0.54, -0.08), (0.60, -0.10),
    (0.68, -0.06), (0.78, 0.02), (0.88, 0.06), (1.00, 0.02),
]
CY_KEYS = [
    (0.00, 0.02), (0.20, -0.02), (0.45, 0.04), (0.65, -0.03),
    (0.85, 0.02), (1.00, 0.00),
]

# First-harmonic radial bias: pushes volume toward angle PHI1 (screen left).
A1_KEYS = [
    (0.00, 0.16), (0.10, 0.20), (0.22, 0.10), (0.34, 0.05),
    (0.48, 0.10), (0.58, 0.12), (0.66, 0.06), (0.80, 0.03),
    (1.00, 0.04),
]

# Superellipse exponent: 2 = ellipse, higher = squarer/architectural.
SQ_KEYS = [
    (0.00, 2.9), (0.10, 2.6), (0.30, 2.1), (0.55, 2.0),
    (0.78, 2.2), (0.88, 3.2), (1.00, 3.8),
]

# Cumulative twist (radians).
TW_KEYS = [
    (0.00, 0.00), (0.20, 0.06), (0.40, 0.16), (0.58, 0.30),
    (0.72, 0.55), (0.86, 0.80), (1.00, 0.95),
]


def contour(t, slice_index):
    """Return per-slice shaping parameters."""
    s = smooth_samples(SCALE_KEYS, t) * MAX_RADIUS
    ax = smooth_samples(AX_KEYS, t)
    cx = smooth_samples(CX_KEYS, t) * MAX_RADIUS * 2.0
    cy = smooth_samples(CY_KEYS, t) * MAX_RADIUS * 2.0
    a1 = smooth_samples(A1_KEYS, t)
    sq = smooth_samples(SQ_KEYS, t)
    tw = smooth_samples(TW_KEYS, t)

    # Angular cap: alternate slice rotation for the stacked look.
    if t > 0.86:
        tw += math.radians(8.0) * (1 if slice_index % 2 == 0 else -1) * ((t - 0.86) / 0.14)

    # Tiny organic jitter so layers don't read as CNC-perfect.
    jx = (random.random() - 0.5) * 0.006
    jy = (random.random() - 0.5) * 0.006
    return s, ax, cx + jx, cy + jy, a1, sq, tw


def ring_points(t, slice_index, z):
    s, ax, cx, cy, a1, sq, tw = contour(t, slice_index)
    phi1 = math.radians(196)  # bias direction: screen left / slightly front
    pts = []
    for k in range(RING_VERTS):
        th = 2.0 * math.pi * k / RING_VERTS
        # superellipse radius
        c, si = math.cos(th), math.sin(th)
        denom = (abs(c) ** sq + abs(si) ** sq) ** (1.0 / sq)
        r = s / max(denom, 1e-6)
        # anisotropy + first harmonic bias
        r *= (1.0 + ax * c * c * (1 if c < 0 else 0.35))
        r *= (1.0 + a1 * math.cos(th - phi1))
        x = r * math.cos(th + tw) + cx
        y = r * math.sin(th + tw) + cy
        pts.append((x, y, z))
    return pts


def build_sculpture():
    mesh = bpy.data.meshes.new("YoSiteSculpture")
    bm = bmesh.new()

    step = HEIGHT / SLICES
    thick = step * FILL

    for i in range(SLICES):
        t = i / (SLICES - 1)
        z0 = i * step
        z1 = z0 + thick
        bottom = [bm.verts.new(p) for p in ring_points(t, i, z0)]
        top = [bm.verts.new(p) for p in ring_points(t, i, z1)]
        n = RING_VERTS
        for k in range(n):
            k2 = (k + 1) % n
            bm.faces.new((bottom[k], bottom[k2], top[k2], top[k]))
        bm.faces.new(bottom[::-1])
        bm.faces.new(top)

    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("YoSiteSculpture", mesh)
    bpy.context.collection.objects.link(obj)

    # Rounded bevel on every exposed slice edge.
    bev = obj.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.0035
    bev.segments = 2
    bev.limit_method = "ANGLE"
    bev.angle_limit = math.radians(40)

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier="Bevel")
    bpy.ops.object.shade_smooth()
    if hasattr(mesh, "use_auto_smooth"):
        mesh.use_auto_smooth = True
        mesh.auto_smooth_angle = math.radians(35)
    else:
        try:
            bpy.ops.object.shade_auto_smooth(angle=math.radians(35))
        except Exception:
            pass
    return obj


def make_material():
    mat = bpy.data.materials.new("MatteWhiteResin")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.941, 0.929, 0.906, 1.0)  # ~#F5F3EF
    bsdf.inputs["Roughness"].default_value = 0.62
    bsdf.inputs["Metallic"].default_value = 0.0
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.32
    return mat


def setup_studio(target):
    scene = bpy.context.scene

    # Key: large warm area light, upper front-left.
    key = bpy.data.lights.new("Key", "AREA")
    key.energy = 420
    key.size = 4.5
    key.color = (1.0, 0.965, 0.92)
    key_obj = bpy.data.objects.new("Key", key)
    key_obj.location = (-3.2, -3.4, 3.6)
    key_obj.rotation_euler = (math.radians(52), 0, math.radians(-40))
    bpy.context.collection.objects.link(key_obj)

    # Fill from the right.
    fill = bpy.data.lights.new("Fill", "AREA")
    fill.energy = 130
    fill.size = 4.0
    fill.color = (1.0, 0.985, 0.965)
    fill_obj = bpy.data.objects.new("Fill", fill)
    fill_obj.location = (3.4, -2.2, 1.8)
    fill_obj.rotation_euler = (math.radians(68), 0, math.radians(55))
    bpy.context.collection.objects.link(fill_obj)

    # Rim behind.
    rim = bpy.data.lights.new("Rim", "AREA")
    rim.energy = 90
    rim.size = 2.5
    rim_obj = bpy.data.objects.new("Rim", rim)
    rim_obj.location = (0.6, 3.2, 2.6)
    rim_obj.rotation_euler = (math.radians(-55), 0, math.radians(170))
    bpy.context.collection.objects.link(rim_obj)

    # Soft warm world.
    world = bpy.data.worlds.new("Studio")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.93, 0.905, 0.87, 1.0)
    bg.inputs[1].default_value = 0.55
    scene.world = world

    # Camera: mild telephoto, three-quarter front, slightly above base centre.
    cam_data = bpy.data.cameras.new("HeroCam")
    cam_data.lens = 65
    cam = bpy.data.objects.new("HeroCam", cam_data)
    cam.location = (-0.55, -6.4, 1.55)
    bpy.context.collection.objects.link(cam)
    scene.camera = cam

    track = cam.constraints.new("TRACK_TO")
    empty = bpy.data.objects.new("CamTarget", None)
    empty.location = (0.0, 0.0, HEIGHT * 0.48)
    bpy.context.collection.objects.link(empty)
    track.target = empty
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"

    scene.render.resolution_x = 1200
    scene.render.resolution_y = 1500
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 96
    scene.render.film_transparent = True


def export_all(obj):
    os.makedirs(os.path.dirname(GLB_PATH), exist_ok=True)
    os.makedirs(os.path.dirname(BLEND_PATH), exist_ok=True)
    os.makedirs(os.path.dirname(PREVIEW_PATH), exist_ok=True)

    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    kwargs = dict(
        filepath=GLB_PATH,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
    )
    try:
        bpy.ops.export_scene.gltf(**kwargs, export_draco_mesh_compression_enable=True)
    except Exception:
        bpy.ops.export_scene.gltf(**kwargs)

    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)

    scene = bpy.context.scene
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.quality = 88
    scene.render.filepath = PREVIEW_PATH
    bpy.ops.render.render(write_still=True)


def main():
    # Clean scene
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block_list in (bpy.data.meshes, bpy.data.lights, bpy.data.cameras, bpy.data.materials):
        for block in list(block_list):
            if block.users == 0:
                block_list.remove(block)

    obj = build_sculpture()
    obj.data.materials.append(make_material())
    setup_studio(obj)
    export_all(obj)
    print("YoSite sculpture generated and exported:")
    print("  GLB:    ", GLB_PATH)
    print("  BLEND:  ", BLEND_PATH)
    print("  PREVIEW:", PREVIEW_PATH)


if __name__ == "__main__":
    main()
