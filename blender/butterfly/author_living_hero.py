"""Living hero flight on the provided butterfly rig.

Opens the extracted source blend, keeps its mesh, UVs, pivots and bone
layout, and writes a new working file plus a new GLB. The original blend
and FBX are not modified.

The new Root bone only carries the flight. Legs and antennae keep their
existing IK; the baked action stores the solved pose and the constraints
are muted so that pose exports cleanly.
"""
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "_incoming" / "butterfly.blend"
DEST_BLEND = HERE / "butterfly-hero.blend"
GLB = HERE.parents[1] / "public" / "models" / "butterfly-hero.glb"
TEX = HERE / "textures" / "wing_ivory_reference.png"
NORMAL = HERE / "textures" / "wing_ivory_normal.png"
PREVIEW = HERE / "hero-living-previews"
REPORT = HERE / "hero-living.json"

FPS = 60
HERO_NAME = "HERO_ENTRY_H_LAND"
PERCH_NAME = "PERCHED_IDLE_H"
HERO_DURATION = 9.0
PERCH_DURATION = 6.0

# Mostly the butterfly's right side, with the head still readable.
# Camera looks along Blender +Y (from -Y), which is the website view.
PERCH_YAW = -60.0
PERCH_PITCH = 17.0
PERCH_ROLL = -4.0
LEFT_LAND = 33.0
RIGHT_LAND = 39.0

MESHES = [
    "antenna", "antenna.001", "eye", "head",
    "leg.001", "leg.002", "leg.003", "leg.004", "leg.005", "leg.006",
    "probocis", "torso+tail",
    "wing", "wing.001", "wing b", "wing b.001",
]
LEG_TARGETS = ["leg4.001", "leg4.005", "leg4.007", "leg4.009", "leg4.011", "leg4.013"]
ANTENNA_TARGETS = ["Bone.017", "Bone.018"]

# t, x (right), z (up), y (depth). Yaw / pitch / roll in degrees.
ROOT_KEYS = [
    (0.00, -1.05, 0.028, 0.065, 94, 7, 11),
    (1.15, -0.76, 0.118, -0.040, 68, -4, -13),
    (2.40, -0.48, 0.038, 0.078, 110, 12, 16),
    (3.65, -0.28, 0.142, -0.018, 76, 2, -7),
    (4.85, -0.135, 0.052, 0.038, 96, 13, 8),
    (5.95, -0.050, 0.026, 0.010, 40, 19, 2),
    (6.85, -0.016, 0.014, 0.003, 4, 24, -1),
    (7.55, -0.004, 0.005, 0.000, -34, 21, -3),
    (8.45, 0.000, 0.000, 0.000, PERCH_YAW, PERCH_PITCH, PERCH_ROLL),
    (HERO_DURATION, 0.000, 0.000, 0.000, PERCH_YAW, PERCH_PITCH, PERCH_ROLL),
]


def smoothstep(a, b, t):
    if t <= a:
        return 0.0
    if t >= b:
        return 1.0
    x = (t - a) / (b - a)
    return x * x * (3.0 - 2.0 * x)


def bell(t, center, width):
    u = (t - center) / width
    if abs(u) >= 1.0:
        return 0.0
    return 0.5 + 0.5 * math.cos(math.pi * u)


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


def qaxis(axis, degrees):
    quat = Quaternion(Vector(axis), math.radians(degrees))
    quat.normalize()
    return quat


def attitude(yaw, pitch, roll):
    quat = qaxis((0, 0, 1), yaw) @ qaxis((1, 0, 0), pitch) @ qaxis((0, 1, 0), roll)
    quat.normalize()
    return quat


def align(quat, previous):
    quat = Quaternion(quat)
    quat.normalize()
    if previous is not None and quat.dot(previous) < 0:
        quat.negate()
    return quat


def beat_rate(t):
    rate = 5.5 + 0.45 * math.sin(t * 0.86)
    rate *= 1.0 - 0.78 * bell(t, 1.75, 0.40)
    rate *= 1.0 - 0.82 * bell(t, 4.30, 0.46)
    if t > 6.0:
        rate *= 1.0 - smoothstep(6.0, 8.15, t)
    return max(0.0, rate)


def glide_amount(t):
    amount = max(0.82 * bell(t, 1.75, 0.40), 0.88 * bell(t, 4.30, 0.46))
    amount = max(amount, smoothstep(6.35, 8.25, t))
    return min(1.0, amount)


def stroke(u):
    u = u % 1.0
    cut = 0.34
    if u < cut:
        x = u / cut
        return 1.0 - x * x * (3.0 - 2.0 * x)
    x = (u - cut) / (1.0 - cut)
    return x * x * (3.0 - 2.0 * x)


def flap_lift(phase, glide, up, down, land):
    top = up * (1.0 - glide) + land * glide
    bot = down * (1.0 - glide) + land * glide
    return bot + (top - bot) * stroke(phase)


def breath(t, cycles):
    """Zero value and zero slope at both ends of the perch loop."""
    return 0.5 * (1.0 - math.cos(cycles * math.tau * t / PERCH_DURATION))


def pose_delta(pose_bone):
    bone = pose_bone.bone
    if pose_bone.parent:
        rest = pose_bone.parent.bone.matrix_local.inverted() @ bone.matrix_local
        local = pose_bone.parent.matrix.inverted() @ pose_bone.matrix
    else:
        rest = bone.matrix_local.copy()
        local = pose_bone.matrix.copy()
    delta = rest.inverted() @ local
    return delta.to_translation(), delta.to_quaternion()


def world_to_local(pose_bone, world_delta):
    return pose_bone.bone.matrix_local.to_3x3().inverted() @ Vector(world_delta)


def build_phase(frame_count):
    phase = [0.0]
    for frame in range(frame_count):
        phase.append(phase[-1] + beat_rate(frame / FPS) / FPS)
    return phase


def materials(arm):
    img = bpy.data.images.load(str(TEX), check_existing=True)
    img.colorspace_settings.name = "sRGB"
    img.pack()
    normal = bpy.data.images.load(str(NORMAL), check_existing=True)
    normal.colorspace_settings.name = "Non-Color"
    normal.pack()

    mat = bpy.data.materials["wing"]
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    ntex = nt.nodes.new("ShaderNodeTexImage")
    ntex.image = normal
    nmap = nt.nodes.new("ShaderNodeNormalMap")
    nmap.inputs["Strength"].default_value = 0.35
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(ntex.outputs["Color"], nmap.inputs["Color"])
    nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    values = {
        "Roughness": 0.56,
        "Metallic": 0.0,
        "Specular IOR Level": 0.32,
        "Sheen Weight": 0.42,
        "Sheen Roughness": 0.7,
        "Transmission Weight": 0.1,
        "IOR": 1.42,
        "Alpha": 1.0,
    }
    for key, value in values.items():
        sock = bsdf.inputs.get(key)
        if sock is not None and not sock.is_linked:
            sock.default_value = value
    tint = bsdf.inputs.get("Sheen Tint")
    if tint is not None and not tint.is_linked:
        try:
            tint.default_value = (0.16, 0.12, 0.07, 1.0)
        except TypeError:
            tint.default_value = 0.25
    thick = bsdf.inputs.get("Thickness")
    if thick is not None:
        thick.default_value = 0.00035
    try:
        mat.use_backface_culling = False
    except Exception:
        pass

    torso = bpy.data.materials["torso"]
    tree = torso.node_tree
    tree.nodes.clear()
    tout = tree.nodes.new("ShaderNodeOutputMaterial")
    tbsdf = tree.nodes.new("ShaderNodeBsdfPrincipled")
    noise = tree.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 28.0
    noise.inputs["Detail"].default_value = 4.0
    ramp = tree.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[0].color = (0.028, 0.024, 0.020, 1)
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (0.075, 0.064, 0.054, 1)
    tree.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    tree.links.new(ramp.outputs["Color"], tbsdf.inputs["Base Color"])
    tree.links.new(tbsdf.outputs["BSDF"], tout.inputs["Surface"])
    tbsdf.inputs["Roughness"].default_value = 0.62
    tbsdf.inputs["Metallic"].default_value = 0.0

    legs = bpy.data.materials["leg.001"]
    lbsdf = legs.node_tree.nodes.get("Principled BSDF")
    lbsdf.inputs["Base Color"].default_value = (0.03, 0.027, 0.023, 1)
    lbsdf.inputs["Roughness"].default_value = 0.46
    lbsdf.inputs["Metallic"].default_value = 0.0

    eyes = bpy.data.materials["eyes"]
    ebsdf = eyes.node_tree.nodes.get("Principled BSDF")
    ebsdf.inputs["Base Color"].default_value = (0.012, 0.011, 0.010, 1)
    ebsdf.inputs["Roughness"].default_value = 0.22
    ebsdf.inputs["Metallic"].default_value = 0.0
    spec = ebsdf.inputs.get("Specular IOR Level")
    if spec is not None:
        spec.default_value = 0.45


def add_root(arm):
    before = arm.data.bones["base"].head_local.copy()
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    root = arm.data.edit_bones.new("Root")
    root.head = Vector((0.0, 0.0, 0.0))
    root.tail = Vector((0.0, 0.02, 0.0))
    root.roll = 0.0
    root.use_deform = False
    base = arm.data.edit_bones["base"]
    base.parent = root
    base.use_connect = False
    bpy.ops.object.mode_set(mode="POSE")
    for bone in arm.pose.bones:
        bone.rotation_mode = "QUATERNION"
    after = arm.data.bones["base"].head_local.copy()
    if (after - before).length > 1e-6:
        raise RuntimeError(f"base pivot moved {before} -> {after}")


def snapshot_base(arm):
    scene = bpy.context.scene
    scene.frame_set(1)
    bpy.context.view_layer.update()
    base = {}
    for bone in arm.pose.bones:
        base[bone.name] = (tuple(bone.location), tuple(bone.rotation_quaternion))
    if arm.animation_data:
        arm.animation_data.action = None
    return base


def reset_pose(arm, base):
    for name, (loc, quat) in base.items():
        bone = arm.pose.bones[name]
        bone.location = loc
        bone.rotation_quaternion = Quaternion(quat)
        bone.scale = (1.0, 1.0, 1.0)


def apply_controls(arm, base, spec):
    reset_pose(arm, base)
    root = arm.pose.bones["Root"]
    root.location = spec["root_loc"]
    root.rotation_quaternion = spec["root_quat"]
    root.scale = (1.0, 1.0, 1.0)
    for name, quat in spec["rots"].items():
        arm.pose.bones[name].rotation_quaternion = quat
    for name, loc in spec["locs"].items():
        arm.pose.bones[name].location = loc


def capture(arm, base, spec):
    apply_controls(arm, base, spec)
    bpy.context.view_layer.update()
    out = {}
    for bone in arm.pose.bones:
        loc, quat = pose_delta(bone)
        out[bone.name] = (tuple(loc), Quaternion(quat))
    return out


def hero_controls(t, phase, base, tuck_local, antenna_local):
    glide = glide_amount(t)
    x, z, depth, yaw, pitch, roll = ROOT(t)
    bob = (1.0 - glide) * 0.0036 * math.sin(phase * math.tau)
    absorb = 0.0
    if 7.30 < t < 8.40:
        absorb = math.sin(math.pi * (t - 7.30) / 1.10) ** 1.15
    if t >= 8.45:
        bob = 0.0
        absorb = 0.0
        glide = 1.0
    z = z + bob - 0.0042 * absorb
    tuck = 1.0 - smoothstep(6.15, 7.55, t) if t >= 6.15 else 1.0
    if t >= 8.45:
        tuck = 0.0
    left = flap_lift(phase, glide, 56.0, -8.0, LEFT_LAND)
    right = flap_lift(phase - 0.055, glide, 52.0, -5.0, RIGHT_LAND)
    left += (1.0 - glide) * 1.4 * math.sin(phase * math.tau * 0.31 + 0.4)
    right += (1.0 - glide) * 1.1 * math.sin(phase * math.tau * 0.27 + 1.3)
    hind = (1.0 - glide) * 5.5 * math.sin(phase * math.tau - 0.9)
    tip = (1.0 - glide) * 3.5 * math.sin(phase * math.tau - 0.45)
    bend = (1.0 - glide) * 4.8 * math.sin(phase * math.tau - 0.65)
    head_pitch = (1.0 - glide) * 2.2 * math.sin(phase * math.tau - 0.25)
    head_yaw = (1.0 - glide) * 1.3 * math.sin(t * 1.6 + 0.5)

    rots = {
        "wing": qaxis((1, 0, 0), left) @ Quaternion(base["wing"][1]),
        "wing.002": qaxis((1, 0, 0), right) @ Quaternion(base["wing.002"][1]),
        "wingb": qaxis((1, 0, 0), hind) @ Quaternion(base["wingb"][1]),
        "wingb.001": qaxis((1, 0, 0), hind * 0.75 + 1.2) @ Quaternion(base["wingb.001"][1]),
        "wing.001": qaxis((1, 0, 0), tip) @ Quaternion(base["wing.001"][1]),
        "wing.003": qaxis((1, 0, 0), tip * 0.8 - 0.8) @ Quaternion(base["wing.003"][1]),
        "torso rot": qaxis((1, 0, 0), bend) @ Quaternion(base["torso rot"][1]),
        "head": qaxis((1, 0, 0), head_pitch) @ qaxis((0, 0, 1), head_yaw) @ Quaternion(base["head"][1]),
    }
    locs = {}
    mix = tuck + 0.16 * absorb
    for name, local in tuck_local.items():
        locs[name] = Vector(base[name][0]) + local * mix
    amp = 0.0045 + 0.0085 * (1.0 - glide)
    for name, axes in antenna_local.items():
        side = axes["side"]
        sway = Vector((
            side * amp * 0.4 * math.sin(t * 2.5 + side),
            amp * 0.35 * math.sin(t * 1.7 + side * 0.6),
            amp * 0.85 * math.sin(t * 2.1 + phase * 0.15 + side),
        ))
        locs[name] = Vector(base[name][0]) + axes["inv"] @ sway
    if t >= 8.45:
        for name in locs:
            if name in tuck_local:
                locs[name] = Vector(base[name][0])
            else:
                locs[name] = Vector(base[name][0])
        rots["wing"] = qaxis((1, 0, 0), LEFT_LAND) @ Quaternion(base["wing"][1])
        rots["wing.002"] = qaxis((1, 0, 0), RIGHT_LAND) @ Quaternion(base["wing.002"][1])
        rots["wingb"] = Quaternion(base["wingb"][1])
        rots["wingb.001"] = Quaternion(base["wingb.001"][1])
        rots["wing.001"] = Quaternion(base["wing.001"][1])
        rots["wing.003"] = Quaternion(base["wing.003"][1])
        rots["torso rot"] = Quaternion(base["torso rot"][1])
        rots["head"] = Quaternion(base["head"][1])
    return {
        "root_loc": Vector((x, depth, z)),
        "root_quat": attitude(yaw, pitch, roll),
        "rots": rots,
        "locs": locs,
    }


def perch_controls(t, base, tuck_local, antenna_local):
    b1 = breath(t, 2)
    b2 = breath(t, 4)
    yaw = PERCH_YAW + 0.32 * (b1 * 2.0 - b2)
    # b1 and b2 are 0 at the ends, so this is exactly the landing attitude.
    pitch = PERCH_PITCH + 0.18 * b2
    roll = PERCH_ROLL + 0.16 * (b1 - b2)
    rots = {
        "wing": qaxis((1, 0, 0), LEFT_LAND + 2.5 * b1 + 0.7 * b2) @ Quaternion(base["wing"][1]),
        "wing.002": qaxis((1, 0, 0), RIGHT_LAND + 1.6 * b1 - 0.8 * b2) @ Quaternion(base["wing.002"][1]),
        "wingb": qaxis((1, 0, 0), 1.4 * b2) @ Quaternion(base["wingb"][1]),
        "wingb.001": qaxis((1, 0, 0), -1.1 * b1) @ Quaternion(base["wingb.001"][1]),
        "torso rot": qaxis((1, 0, 0), 1.6 * b1) @ Quaternion(base["torso rot"][1]),
        "head": qaxis((1, 0, 0), 1.1 * b2) @ qaxis((0, 0, 1), 0.7 * (b1 - b2)) @ Quaternion(base["head"][1]),
    }
    locs = {}
    for name, local in tuck_local.items():
        locs[name] = Vector(base[name][0]) + local * (0.012 * b1)
    for name, axes in antenna_local.items():
        side = axes["side"]
        sway = Vector((side * 0.0035 * b2, 0.0025 * b1, 0.0045 * b1 * side))
        locs[name] = Vector(base[name][0]) + axes["inv"] @ sway
    return {
        "root_loc": Vector((0.0, 0.0, 0.0)),
        "root_quat": attitude(yaw, pitch, roll),
        "rots": rots,
        "locs": locs,
    }


def align_clip(frames):
    previous = {}
    aligned = []
    for frame in frames:
        item = {}
        for name, (loc, quat) in frame.items():
            quat = align(quat, previous.get(name))
            previous[name] = quat
            item[name] = (loc, quat.copy())
        aligned.append(item)
    return aligned


def new_action(arm, name):
    old = bpy.data.actions.get(name)
    if old is not None:
        bpy.data.actions.remove(old)
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    if arm.animation_data is None:
        arm.animation_data_create()
    arm.animation_data.action = action
    return action


def key_clip(arm, name, frames):
    action = new_action(arm, name)
    total = len(frames) - 1
    for frame, pose in enumerate(frames):
        for bone_name, (loc, quat) in pose.items():
            bone = arm.pose.bones[bone_name]
            bone.location = loc
            bone.rotation_quaternion = quat
            bone.keyframe_insert(data_path="location", frame=frame, group=bone_name)
            bone.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=bone_name)
        if frame % 60 == 0:
            print(f"KEY {name} {frame}/{total}", flush=True)
    slot = arm.animation_data.action_slot
    if slot is None:
        slot = action.slots[0]
        arm.animation_data.action_slot = slot
    bag = action.layers[0].strips[0].channelbag(slot)
    for curve in bag.fcurves:
        for point in curve.keyframe_points:
            point.interpolation = "LINEAR"
        curve.update()
    print(f"KEYED {name} curves={len(bag.fcurves)}", flush=True)
    return action, bag


def snap_loop(bag):
    for curve in bag.fcurves:
        points = curve.keyframe_points
        points[-1].co.y = points[0].co.y
        curve.update()


def mute_constraints(arm):
    for bone in arm.pose.bones:
        for constraint in bone.constraints:
            constraint.mute = True


def measure(arm):
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    mins = Vector((1e9, 1e9, 1e9))
    maxs = Vector((-1e9, -1e9, -1e9))
    foot_mins = 1e9
    foot_points = []
    for name in MESHES:
        obj = bpy.data.objects[name]
        evaluated = obj.evaluated_get(deps)
        mesh = evaluated.to_mesh()
        for vertex in mesh.vertices:
            world = evaluated.matrix_world @ vertex.co
            mins.x = min(mins.x, world.x)
            mins.y = min(mins.y, world.y)
            mins.z = min(mins.z, world.z)
            maxs.x = max(maxs.x, world.x)
            maxs.y = max(maxs.y, world.y)
            maxs.z = max(maxs.z, world.z)
            if name.startswith("leg"):
                foot_mins = min(foot_mins, world.z)
                foot_points.append(world.copy())
        evaluated.to_mesh_clear()
    feet = [point for point in foot_points if point.z <= foot_mins + 0.0008]
    if not feet:
        raise RuntimeError("no foot vertices")
    center = sum(feet, Vector()) / len(feet)
    return {
        "footThree": {"x": center.x, "y": center.z, "z": -center.y},
        "silhouette": {"width": maxs.x - mins.x, "height": maxs.z - mins.z},
        "bounds_blender": {
            "min": [mins.x, mins.y, mins.z],
            "max": [maxs.x, maxs.y, maxs.z],
        },
        "feet": len(feet),
    }


def export_glb(arm):
    import addon_utils

    addon_utils.enable("io_scene_gltf2", default_set=True, persistent=False)
    keep = {HERO_NAME, PERCH_NAME}
    for action in list(bpy.data.actions):
        if action.name not in keep:
            bpy.data.actions.remove(action)
    meshes = [bpy.data.objects[name] for name in MESHES]
    renamed = []
    for obj in meshes:
        if not obj.name.endswith("_Mesh"):
            obj.name = obj.name + "_Mesh"
            renamed.append(obj)
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    for obj in renamed:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = arm
    GLB.parent.mkdir(parents=True, exist_ok=True)
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
        export_tangents=False,
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
    for obj in renamed:
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


def render_reviews(arm):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = 16
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 780
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    try:
        scene.view_settings.view_transform = "AgX"
    except TypeError:
        pass
    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg is None:
        bg = world.node_tree.nodes.new("ShaderNodeBackground")
        world.node_tree.links.new(bg.outputs[0], world.node_tree.nodes["World Output"].inputs[0])
    for name in ("cir", "Circle", "Plane", "plane bas", "torssss", "Light"):
        obj = bpy.data.objects.get(name)
        if obj:
            obj.hide_render = True
    cam_data = bpy.data.cameras.new("HeroReview")
    cam = bpy.data.objects.new("HeroReview", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam_data.clip_start = 0.001
    cam_data.clip_end = 50
    PREVIEW.mkdir(parents=True, exist_ok=True)
    if bpy.context.mode != "POSE":
        bpy.context.view_layer.objects.active = arm
        bpy.ops.object.mode_set(mode="POSE")

    def shoot(label, clip, time, place, target, bg_color, ortho=None):
        action = bpy.data.actions[clip]
        arm.animation_data.action = action
        arm.animation_data.action_slot = action.slots[0]
        scene.frame_set(round(time * FPS))
        bpy.context.view_layer.update()
        bg.inputs[0].default_value = (*bg_color, 1)
        bg.inputs[1].default_value = 1.0
        if ortho:
            cam_data.type = "ORTHO"
            cam_data.ortho_scale = ortho
        else:
            cam_data.type = "PERSP"
            cam_data.lens = 58
        cam.location = Vector(place)
        cam.rotation_euler = (Vector(target) - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(PREVIEW / f"{label}.png")
        bpy.ops.render.render(write_still=True)
        print("REVIEW", label, flush=True)

    body = (0.0, 0.02, 0.0)
    warm = (0.93, 0.91, 0.88)
    white = (0.97, 0.97, 0.96)
    black = (0.03, 0.03, 0.035)
    for time in (0.40, 1.80, 3.40, 5.20, 6.80, 7.60, 8.50, 9.00):
        shoot(f"path-{time:.2f}", HERO_NAME, min(time, HERO_DURATION), (-0.35, -2.4, 0.35), (-0.35, 0.0, 0.02), warm, ortho=2.7)
    shoot("land-white", HERO_NAME, HERO_DURATION, (0.05, -0.78, 0.12), body, white)
    shoot("land-black", HERO_NAME, HERO_DURATION, (0.05, -0.78, 0.12), body, black)
    shoot("land-side", HERO_NAME, HERO_DURATION, (0.85, 0.02, 0.12), body, warm)
    shoot("land-top", HERO_NAME, HERO_DURATION, (0.02, -0.05, 0.9), body, warm)
    shoot("land-front-right", HERO_NAME, HERO_DURATION, (0.42, -0.62, 0.16), body, warm)
    shoot("fly-white", HERO_NAME, 3.40, (0.15, -0.72, 0.1), ( -0.28, 0.02, 0.08), white)
    shoot("fly-black", HERO_NAME, 3.40, (0.15, -0.72, 0.1), (-0.28, 0.02, 0.08), black)
    shoot("perch", PERCH_NAME, 2.40, (0.05, -0.78, 0.12), body, warm)
    shoot("perch-low", PERCH_NAME, 3.10, (0.28, -0.55, -0.02), body, warm)


def main():
    if not SOURCE.is_file():
        raise RuntimeError(f"missing source {SOURCE}")
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.render.fps_base = 1
    arm = bpy.data.objects["Armature"]
    base = snapshot_base(arm)
    add_root(arm)
    materials(arm)

    reset_pose(arm, base)
    arm.pose.bones["Root"].location = (0.1, -0.2, 0.3)
    arm.pose.bones["Root"].rotation_quaternion = attitude(0, 0, 0)
    bpy.context.view_layer.update()
    loc, quat = pose_delta(arm.pose.bones["Root"])
    if (loc - Vector((0.1, -0.2, 0.3))).length > 1e-4:
        raise RuntimeError(f"root delta mismatch {tuple(loc)}")
    print("ROOT_DELTA_OK", tuple(round(v, 4) for v in loc), flush=True)

    tuck_local = {}
    for name in LEG_TARGETS:
        bone = arm.pose.bones[name]
        rest_head = bone.bone.head_local.copy()
        pull = Vector((0.0, 0.01, -0.002)) - Vector((rest_head.x, rest_head.y, 0.0))
        pull.z = 0.0
        world = pull * 0.58 + Vector((0.0, 0.0, 0.036))
        tuck_local[name] = world_to_local(bone, world)
    antenna_local = {}
    for name in ANTENNA_TARGETS:
        bone = arm.pose.bones[name]
        axes = bone.bone.matrix_local.to_3x3()
        antenna_local[name] = {
            "side": 1.0 if bone.bone.head_local.x >= 0 else -1.0,
            "inv": axes.inverted(),
        }

    global ROOT
    ROOT = Curve(ROOT_KEYS)
    hero_frames_n = round(HERO_DURATION * FPS)
    perch_frames_n = round(PERCH_DURATION * FPS)
    phase = build_phase(hero_frames_n)
    print("CAPTURE hero", hero_frames_n, flush=True)
    hero_raw = []
    for frame in range(hero_frames_n + 1):
        spec = hero_controls(frame / FPS, phase[frame], base, tuck_local, antenna_local)
        hero_raw.append(capture(arm, base, spec))
        if frame % 60 == 0:
            print(f"CAPTURE {HERO_NAME} {frame}/{hero_frames_n}", flush=True)
    print("CAPTURE perch", perch_frames_n, flush=True)
    perch_raw = []
    for frame in range(perch_frames_n + 1):
        spec = perch_controls(frame / FPS, base, tuck_local, antenna_local)
        perch_raw.append(capture(arm, base, spec))
        if frame % 60 == 0:
            print(f"CAPTURE {PERCH_NAME} {frame}/{perch_frames_n}", flush=True)

    hero_frames = align_clip(hero_raw)
    perch_frames = align_clip(perch_raw)
    mute_constraints(arm)
    key_clip(arm, HERO_NAME, hero_frames)
    _action, perch_bag = key_clip(arm, PERCH_NAME, perch_frames)
    snap_loop(perch_bag)

    hero = bpy.data.actions[HERO_NAME]
    arm.animation_data.action = hero
    arm.animation_data.action_slot = hero.slots[0]
    scene.frame_start = 0
    scene.frame_end = hero_frames_n
    scene.frame_set(hero_frames_n)
    measured = measure(arm)
    print("MEASURE", json.dumps(measured), flush=True)
    payload = {
        "hero": HERO_NAME,
        "perch": PERCH_NAME,
        "heroSeconds": HERO_DURATION,
        "perchSeconds": PERCH_DURATION,
        "fps": FPS,
        "footThree": measured["footThree"],
        "silhouette": measured["silhouette"],
        "landing": "H",
        "view": "front-right three-quarter",
        "source": SOURCE.name,
    }
    REPORT.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.wm.save_as_mainfile(filepath=str(DEST_BLEND))
    print("SAVED", DEST_BLEND, flush=True)
    if "--no-render" not in sys.argv:
        render_reviews(arm)
    export_glb(arm)
    print("LIVING_HERO_DONE", flush=True)


if __name__ == "__main__":
    main()
