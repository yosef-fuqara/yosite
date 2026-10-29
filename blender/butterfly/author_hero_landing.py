"""Author the cinematic Hero entry and the perched idle on the existing rig.

Opens butterfly-animated.blend, adds two actions, and exports
public/models/butterfly-animated.glb. Mesh, materials, UVs and the
in-place IDLE / FLY / GLIDE clips stay in the file.

HERO_ENTRY_H_LAND
    One shot. Root carries the flight. Wings and body are keyed poses.
    Frame 0 is off the left of the hero. The last pose is the landing.

PERCHED_IDLE_H
    Loops on that landing pose: wings raised, face toward the viewer,
    a small living drift. Feet stay planted.

Run from the repo root:
    blender --background --factory-startup --python blender/butterfly/author_hero_landing.py
"""
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "butterfly-animated.blend"
GLB = HERE.parents[1] / "public" / "models" / "butterfly-animated.glb"
PREVIEW = HERE / "hero-previews"
FPS = 120
HERO_NAME = "HERO_ENTRY_H_LAND"
PERCH_NAME = "PERCHED_IDLE_H"
HERO_DURATION = 8.7
PERCH_DURATION = 5.0
WINGS = ["Left_Forewing", "Left_Hindwing", "Right_Forewing", "Right_Hindwing"]
MESHES = ["Body", "Head", "Antenna_L", "Antenna_R", *WINGS]

# Landing pose, seen by the website camera (Blender -Y).
# Yaw -180 faces the viewer. Pitch ~24 lays the wing surfaces toward
# that camera, so a raised V still shows the pattern instead of the
# wing edges. Lift near 42° is up, not flat and not closed.
LAND_YAW = -180.0
LAND_PITCH = 24.0
LAND_FORE = (42.0, 45.0)
LAND_HIND = (34.0, 37.0)

# t, x (right), z (up), y (depth, -Y is toward the camera), yaw, pitch, roll
ROOT_KEYS = [
    (0.00, -0.860, 0.022, 0.030, -62, 6, 14),
    (1.05, -0.640, 0.058, 0.006, -76, 12, 18),
    (2.15, -0.400, 0.084, -0.020, -94, 3, 6),
    (3.25, -0.220, 0.046, 0.018, -82, -7, -15),
    (4.35, -0.112, 0.072, -0.006, -108, 11, 12),
    (5.45, -0.052, 0.040, 0.008, -126, 16, 6),
    (6.50, -0.018, 0.014, 0.002, -134, 22, 3),
    (6.95, -0.008, 0.006, 0.000, -140, 23, 2),
    (7.28, -0.002, 0.001, 0.000, -176, 24, 0),
    (8.05, -0.0003, 0.0003, 0.000, -179, 24, 0),
    (8.45, 0.000, 0.000, 0.000, LAND_YAW, LAND_PITCH, 0),
    (HERO_DURATION, 0.000, 0.000, 0.000, LAND_YAW, LAND_PITCH, 0),
]

# t, left fore, right fore. Downstrokes are the short gaps.
FORE_KEYS = [
    (0.00, 44, 39),
    (0.11, 6, 14),
    (0.18, -21, -27),
    (0.36, 33, 27),
    (0.50, 63, 57),
    (0.60, 28, 35),
    (0.72, -16, -9),
    (0.94, 41, 47),
    (1.08, 59, 52),
    (1.20, 18, 11),
    (1.34, -6, -13),
    (1.62, 16, 21),
    (1.98, 27, 22),
    (2.28, 18, 24),
    (2.48, 12, 16),
    (2.60, 46, 40),
    (2.72, 8, 16),
    (2.84, -18, -24),
    (3.06, 34, 40),
    (3.22, 61, 55),
    (3.34, 20, 13),
    (3.48, -4, 3),
    (3.62, 18, 24),
    (3.86, 42, 36),
    (4.04, 14, 20),
    (4.22, 2, -4),
    (4.52, 32, 27),
    (4.78, 20, 25),
    (5.08, 40, 35),
    (5.42, 26, 30),
    (5.90, 38, 34),
    (6.45, 30, 33),
    (7.05, 37, 40),
    (7.55, 41, 43),
    (8.05, 41.6, 44.4),
    (8.15, *LAND_FORE),
    (HERO_DURATION, *LAND_FORE),
]

TORSION_KEYS = [
    (0.00, 0.8),
    (0.50, 3.2),
    (0.72, -1.4),
    (1.08, 2.4),
    (1.80, 0.3),
    (2.84, 3.6),
    (3.22, -0.6),
    (3.86, 2.0),
    (4.74, 1.1),
    (6.20, 0.4),
    (8.15, 0.0),
    (HERO_DURATION, 0.0),
]

SWEEP_KEYS = [
    (0.00, 1.2),
    (1.40, -1.8),
    (2.50, 2.2),
    (3.30, -1.4),
    (4.60, 0.9),
    (6.40, 0.2),
    (8.15, 0.0),
    (HERO_DURATION, 0.0),
]

# t, pitch, roll, yaw, bob meters
BODY_KEYS = [
    (0.00, 1.4, 0.3, 0.2, 0.0003),
    (0.18, 3.4, -0.5, -0.3, 0.0011),
    (0.50, 0.2, 0.7, 0.4, -0.0002),
    (0.72, 3.1, -0.2, 0.1, 0.0010),
    (1.08, 0.6, 0.4, -0.2, 0.0001),
    (1.34, 2.2, -0.3, 0.2, 0.0007),
    (1.90, 0.4, 0.15, 0.0, 0.00015),
    (2.40, 0.2, -0.1, 0.1, 0.00005),
    (2.84, 3.6, 0.5, -0.4, 0.0012),
    (3.22, 0.3, -0.6, 0.3, -0.0001),
    (3.48, 1.8, 0.2, -0.1, 0.0004),
    (4.04, 2.4, -0.2, 0.2, 0.0006),
    (4.74, 1.2, 0.15, 0.0, 0.00025),
    (5.60, 0.8, 0.1, 0.1, 0.00012),
    (6.70, 0.4, 0.05, 0.05, 0.00005),
    (7.60, 0.15, 0.0, 0.0, 0.0),
    (8.15, 0.0, 0.0, 0.0, 0.0),
    (HERO_DURATION, 0.0, 0.0, 0.0, 0.0),
]

HIND_DELAY_KEYS = [
    (0.0, 0.030),
    (1.2, 0.046),
    (2.4, 0.022),
    (3.6, 0.040),
    (5.2, 0.026),
    (6.6, 0.010),
    (8.15, 0.0),
    (HERO_DURATION, 0.0),
]

# Local bumps so the hindwings are not a perfect copy of the forewings.
HIND_NUDGE = [
    (0.40, 0.10, 2.4, -1.2),
    (1.05, 0.08, -1.8, 2.6),
    (2.55, 0.09, 1.5, -2.2),
    (3.40, 0.12, -2.4, 1.1),
    (4.70, 0.10, 1.2, -1.6),
    (5.80, 0.14, -0.8, 1.4),
]

FORE_FLUTTER = [
    (0.28, 0.05, 1.8, -1.1),
    (0.84, 0.045, -1.4, 1.6),
    (2.68, 0.04, 2.1, -0.8),
    (3.55, 0.05, -1.2, 1.5),
    (4.88, 0.06, 0.9, -1.3),
]

PERCH_ROOT = [
    (0.0, 0, 0, 0, LAND_YAW, LAND_PITCH, 0.0),
    (1.6, 0, 0, 0, -179.65, 24.55, 0.18),
    (3.3, 0, 0, 0, -180.28, 23.45, -0.14),
    (PERCH_DURATION, 0, 0, 0, LAND_YAW, LAND_PITCH, 0.0),
]

# Slow asymmetric breath. Enough to read as alive, not a flap.
PERCH_WINGS = [
    (0.0, *LAND_FORE, *LAND_HIND),
    (1.35, 48.2, 41.4, 39.6, 33.2),
    (2.70, 39.4, 49.6, 31.2, 40.4),
    (4.05, 45.6, 42.2, 36.8, 34.4),
    (PERCH_DURATION, *LAND_FORE, *LAND_HIND),
]

PERCH_BODY = [
    (0.0, 0.0, 0.0, 0.0, 0.0),
    (1.7, 1.05, -0.22, 0.35, 0.00012),
    (3.4, -0.35, 0.28, -0.28, 0.0),
    (PERCH_DURATION, 0.0, 0.0, 0.0, 0.0),
]


def pchip_slopes(xs, ys):
    n = len(xs)
    h = [xs[i + 1] - xs[i] for i in range(n - 1)]
    delta = [(ys[i + 1] - ys[i]) / h[i] for i in range(n - 1)]
    slope = [0.0] * n
    slope[0] = delta[0]
    slope[-1] = delta[-1]
    for i in range(1, n - 1):
        if delta[i - 1] == 0 or delta[i] == 0 or delta[i - 1] * delta[i] < 0:
            slope[i] = 0.0
        else:
            w1 = 2 * h[i] + h[i - 1]
            w2 = h[i] + 2 * h[i - 1]
            slope[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i])
    return slope


class Curve:
    def __init__(self, keys):
        self.xs = [row[0] for row in keys]
        cols = list(zip(*[row[1:] for row in keys]))
        self.ys = [list(col) for col in cols]
        self.slopes = [pchip_slopes(self.xs, col) for col in self.ys]
        for i in range(1, len(self.xs)):
            if self.xs[i] <= self.xs[i - 1]:
                raise RuntimeError(f"keys must increase: {self.xs[i - 1]} -> {self.xs[i]}")

    def __call__(self, t):
        xs = self.xs
        if t <= xs[0]:
            return [col[0] for col in self.ys]
        if t >= xs[-1]:
            return [col[-1] for col in self.ys]
        lo, hi = 0, len(xs) - 1
        while hi - lo > 1:
            mid = (lo + hi) // 2
            if xs[mid] <= t:
                lo = mid
            else:
                hi = mid
        span = xs[hi] - xs[lo]
        u = (t - xs[lo]) / span
        u2 = u * u
        u3 = u2 * u
        h00 = 2 * u3 - 3 * u2 + 1
        h10 = u3 - 2 * u2 + u
        h01 = -2 * u3 + 3 * u2
        h11 = u3 - u2
        out = []
        for col, slope in zip(self.ys, self.slopes):
            out.append(h00 * col[lo] + h10 * span * slope[lo] + h01 * col[hi] + h11 * span * slope[hi])
        return out


def periodic_curve(keys, duration):
    """PCHIP with the first and last samples tied, so a loop has no knot."""
    if abs(keys[0][0]) > 1e-8 or abs(keys[-1][0] - duration) > 1e-8:
        raise RuntimeError("periodic keys must start at 0 and end at the duration")
    if any(abs(a - b) > 1e-8 for a, b in zip(keys[0][1:], keys[-1][1:])):
        raise RuntimeError("periodic keys must match at the loop")
    prev = (keys[-2][0] - duration, *keys[-2][1:])
    nxt = (keys[1][0] + duration, *keys[1][1:])
    return Curve([prev, *keys, nxt])


def bump(table, t):
    left = right = 0.0
    for center, width, amp_l, amp_r in table:
        u = (t - center) / width
        if abs(u) >= 1:
            continue
        bell = 0.5 + 0.5 * math.cos(math.pi * u)
        left += amp_l * bell
        right += amp_r * bell
    return left, right


def qaxis(axis, degrees):
    quat = Quaternion(Vector(axis), math.radians(degrees))
    quat.normalize()
    return quat


def attitude(yaw, pitch, roll):
    quat = qaxis((0, 0, 1), yaw) @ qaxis((1, 0, 0), pitch) @ qaxis((0, 1, 0), roll)
    quat.normalize()
    return quat


def wing_quat(name, lift, torsion, sweep):
    sign = -1 if name.startswith("Left") else 1
    fore = "Forewing" in name
    # Fades out as the wings rise, so the perched pose is not twisted.
    fade = max(0.0, min(1.0, (58.0 - lift) / 78.0))
    clearance = -2.3 if fore else 2.0
    tor = torsion * (1.0 if fore else 0.7)
    swept = (sweep * (1.0 if fore else 0.8) + clearance) * fade
    quat = qaxis((1, 0, 0), tor) @ qaxis((0, 1, 0), -sign * lift) @ qaxis((0, 0, 1), sign * swept)
    quat.normalize()
    return quat


def align(quat, previous):
    if previous is not None and quat.dot(previous) < 0:
        quat = Quaternion((-quat.w, -quat.x, -quat.y, -quat.z))
    quat.normalize()
    return quat


def mesh_stamp(objects):
    rows = []
    for name, obj in objects.items():
        co = obj.data.vertices[0].co
        rows.append((name, len(obj.data.vertices), len(obj.data.polygons), round(co.x, 6), round(co.y, 6), round(co.z, 6), tuple(round(v, 6) for v in obj.location)))
    return tuple(rows)


def new_action(rig, name, description, loop):
    old = bpy.data.actions.get(name)
    if old is not None:
        bpy.data.actions.remove(old)
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data.action = action
    action["description"] = description
    action["loop"] = loop
    action["root_motion"] = True
    return action


def key_pose(rig, pose, frame):
    for name, (loc, quat) in pose.items():
        bone = rig.pose.bones[name]
        if loc is not None:
            bone.location = loc
            bone.keyframe_insert(data_path="location", frame=frame, group=name)
        bone.rotation_quaternion = quat
        bone.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=name)


def finish_action(rig, action):
    slot = rig.animation_data.action_slot
    if slot is None:
        slot = action.slots[0]
        rig.animation_data.action_slot = slot
    bag = action.layers[0].strips[0].channelbag(slot)
    for curve in bag.fcurves:
        for point in curve.keyframe_points:
            point.interpolation = "LINEAR"
        curve.update()
    return len(bag.fcurves)


def sample_hero(t, curves, prev):
    x, z, depth, yaw, pitch, roll = curves["root"](t)
    fl, fr = curves["fore"](t)
    if t < 6.8:
        bump_l, bump_r = bump(FORE_FLUTTER, t)
        fl += bump_l
        fr += bump_r
    delay = curves["delay"](t)[0]
    fl_d, fr_d = curves["fore"](t - delay)
    scale = 0.84 + 0.16 * min(1.0, max(0.0, (t - 5.5) / 2.6))
    hl = fl_d * scale - 3.0
    hr = fr_d * scale - 2.2
    nudge_l, nudge_r = bump(HIND_NUDGE, t)
    hl += nudge_l
    hr += nudge_r
    if t >= 7.5:
        blend = min(1.0, (t - 7.5) / 0.65)
        blend = blend * blend * (3 - 2 * blend)
        hl = hl * (1 - blend) + LAND_HIND[0] * blend
        hr = hr * (1 - blend) + LAND_HIND[1] * blend
    if t >= 8.15:
        fl, fr = LAND_FORE
        hl, hr = LAND_HIND
    torsion = curves["torsion"](t)[0]
    sweep = curves["sweep"](t)[0]
    bp, br, by, bob = curves["body"](t)
    lifts = {
        "Left_Forewing": fl,
        "Right_Forewing": fr,
        "Left_Hindwing": hl,
        "Right_Hindwing": hr,
    }
    pose = {
        "Root": ((x, depth, z), align(attitude(yaw, pitch, roll), prev.get("Root"))),
        "Body": ((0.0, 0.0, bob), align(attitude(by, bp, br), prev.get("Body"))),
    }
    for name, lift in lifts.items():
        pose[name] = (None, align(wing_quat(name, lift, torsion, sweep), prev.get(name)))
    prev.update({name: quat for name, (_loc, quat) in pose.items()})
    return pose


def sample_perch(t, curves, prev):
    _x, _z, _depth, yaw, pitch, roll = curves["root"](t)
    fl, fr, hl, hr = curves["wings"](t)
    bp, br, by, bob = curves["body"](t)
    lifts = {
        "Left_Forewing": fl,
        "Right_Forewing": fr,
        "Left_Hindwing": hl,
        "Right_Hindwing": hr,
    }
    pose = {
        "Root": ((0.0, 0.0, 0.0), align(attitude(yaw, pitch, roll), prev.get("Root"))),
        "Body": ((0.0, 0.0, bob), align(attitude(by, bp, br), prev.get("Body"))),
    }
    for name, lift in lifts.items():
        pose[name] = (None, align(wing_quat(name, lift, 0.0, 0.0), prev.get(name)))
    prev.update({name: quat for name, (_loc, quat) in pose.items()})
    return pose


def bake(rig, name, description, loop, duration, sampler):
    action = new_action(rig, name, description, loop)
    frames = round(duration * FPS)
    prev = {}
    for frame in range(frames + 1):
        pose = sampler(frame / FPS, prev)
        key_pose(rig, pose, frame)
        if frame % 120 == 0:
            print(f"BAKE {name} {frame}/{frames}", flush=True)
    curves = finish_action(rig, action)
    print(f"BAKED {name} frames={frames} curves={curves}", flush=True)
    return action


def measure_feet(rig):
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    body = bpy.data.objects["Body"].evaluated_get(deps)
    mesh = body.to_mesh()
    verts = [body.matrix_world @ vertex.co for vertex in mesh.vertices]
    body.to_mesh_clear()
    lowest = min(vertex.z for vertex in verts)
    feet = [vertex for vertex in verts if vertex.z <= lowest + 0.0004]
    center = sum(feet, Vector()) / len(feet)
    # glTF / Three.js: (x, z, -y)
    foot = {"x": center.x, "y": center.z, "z": -center.y, "blender": [center.x, center.y, center.z], "count": len(feet)}
    print("FOOT", json.dumps(foot), flush=True)
    return foot


def export_glb(rig):
    import addon_utils

    addon_utils.enable("io_scene_gltf2", default_set=True, persistent=False)
    parent = bpy.data.objects["Butterfly"]
    meshes = [bpy.data.objects[name] for name in MESHES]
    for obj in meshes:
        obj.name = obj.name + "_Mesh" if not obj.name.endswith("_Mesh") else obj.name
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    for obj in [parent, rig, *meshes]:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(GLB),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_animations=True,
        export_skins=True,
        export_morph=False,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_draco_mesh_compression_enable=False,
        export_animation_mode="ACTIONS",
        export_anim_single_armature=True,
        export_frame_range=False,
        export_frame_step=1,
        export_force_sampling=True,
        export_optimize_animation_size=False,
        export_optimize_animation_keep_anim_armature=False,
        export_rest_position_armature=True,
        export_anim_slide_to_zero=True,
        export_def_bones=False,
        export_leaf_bone=False,
    )
    for obj in meshes:
        if obj.name.endswith("_Mesh"):
            obj.name = obj.name[: -len("_Mesh")]
    sys.path.insert(0, str(HERE))
    from smooth_animation_glb import smooth_glb

    report = smooth_glb(GLB)
    print("SMOOTH", json.dumps(report), flush=True)
    for required in (HERO_NAME, PERCH_NAME):
        if required not in report:
            raise RuntimeError(f"missing exported clip {required}")
        if not report[required]["rootMotion"]:
            raise RuntimeError(f"{required} lost root motion")
    return report


def render_reviews(rig):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = 8
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 820
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    world = scene.world
    if world and world.use_nodes:
        background = world.node_tree.nodes.get("Background")
        if background:
            background.inputs[0].default_value = (0.969, 0.969, 0.969, 1)
            background.inputs[1].default_value = 1.0
    cam_data = bpy.data.cameras.new("HeroReviewCam")
    cam = bpy.data.objects.new("HeroReviewCam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 0.16
    cam_data.clip_start = 0.001
    cam_data.clip_end = 20
    PREVIEW.mkdir(parents=True, exist_ok=True)
    shots = [
        (HERO_NAME, 0.40),
        (HERO_NAME, 1.20),
        (HERO_NAME, 1.95),
        (HERO_NAME, 2.70),
        (HERO_NAME, 3.40),
        (HERO_NAME, 4.40),
        (HERO_NAME, 5.50),
        (HERO_NAME, 6.60),
        (HERO_NAME, 7.15),
        (HERO_NAME, 7.55),
        (HERO_NAME, 8.50),
        (PERCH_NAME, 2.20),
    ]
    if bpy.context.mode != "POSE":
        bpy.context.view_layer.objects.active = rig
        bpy.ops.object.mode_set(mode="POSE")
    for clip, time in shots:
        action = bpy.data.actions[clip]
        rig.animation_data.action = action
        rig.animation_data.action_slot = action.slots[0]
        frame = round(time * FPS)
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        anchor = rig.pose.bones["Root"].head.copy()
        target = anchor + Vector((0, 0, 0.012))
        cam.location = anchor + Vector((0, -0.5, 0.03))
        cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(PREVIEW / f"{clip}-{time:.2f}.png")
        bpy.ops.render.render(write_still=True)
        print("REVIEW", clip, time, flush=True)


def main():
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.render.fps_base = 1
    rig = bpy.data.objects["Butterfly_Rig"]
    objects = {name: bpy.data.objects[name] for name in MESHES}
    before = mesh_stamp(objects)
    if rig.animation_data is None:
        rig.animation_data_create()
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    for bone in rig.pose.bones:
        bone.rotation_mode = "QUATERNION"

    hero_curves = {
        "root": Curve(ROOT_KEYS),
        "fore": Curve(FORE_KEYS),
        "torsion": Curve(TORSION_KEYS),
        "sweep": Curve(SWEEP_KEYS),
        "body": Curve(BODY_KEYS),
        "delay": Curve(HIND_DELAY_KEYS),
    }
    perch_curves = {
        "root": periodic_curve(PERCH_ROOT, PERCH_DURATION),
        "wings": periodic_curve(PERCH_WINGS, PERCH_DURATION),
        "body": periodic_curve(PERCH_BODY, PERCH_DURATION),
    }

    def hero_sampler(t, prev, curves=hero_curves):
        return sample_hero(t, curves, prev)

    def perch_sampler(t, prev, curves=perch_curves):
        return sample_perch(t, curves, prev)

    bake(
        rig,
        HERO_NAME,
        "Cinematic flight from off-screen left onto the hero H, then a settled facing pose.",
        False,
        HERO_DURATION,
        hero_sampler,
    )
    bake(
        rig,
        PERCH_NAME,
        "Wings-up rest on the H, face toward the viewer, tiny living motion.",
        True,
        PERCH_DURATION,
        perch_sampler,
    )

    hero = bpy.data.actions[HERO_NAME]
    rig.animation_data.action = hero
    rig.animation_data.action_slot = hero.slots[0]
    scene.frame_start = 0
    scene.frame_end = round(HERO_DURATION * FPS)
    scene.frame_set(scene.frame_end)
    foot = measure_feet(rig)
    (HERE / "hero-landing.json").write_text(json.dumps({
        "hero": HERO_NAME,
        "perch": PERCH_NAME,
        "heroSeconds": HERO_DURATION,
        "perchSeconds": PERCH_DURATION,
        "fps": FPS,
        "footThree": {"x": foot["x"], "y": foot["y"], "z": foot["z"]},
        "landing": "H",
        "face": "toward viewer",
        "wings": "raised",
    }, indent=2))

    if mesh_stamp(objects) != before:
        raise RuntimeError("Butterfly mesh or object transform changed")
    for clip in ("IDLE", "FLY", "GLIDE", HERO_NAME, PERCH_NAME):
        if clip not in bpy.data.actions:
            raise RuntimeError(f"missing action {clip}")

    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
    print("SAVED", SOURCE, flush=True)
    export_glb(rig)
    if "--no-render" not in sys.argv:
        render_reviews(rig)
    print("HERO_AUTHOR_DONE", flush=True)


if __name__ == "__main__":
    main()
