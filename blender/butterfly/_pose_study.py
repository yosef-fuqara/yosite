"""Pose study: wing sign, perch yaw, and leg tuck on the provided rig."""
import math
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector

SRC = Path(r"c:\Users\yosef\OneDrive\שולחן העבודה\projects\yo-site\blender\butterfly\_incoming\butterfly.blend")
TEX = Path(r"c:\Users\yosef\OneDrive\שולחן העבודה\projects\yo-site\blender\butterfly\textures\wing_ivory_reference.png")
OUT = Path(r"c:\Users\yosef\OneDrive\שולחן העבודה\projects\yo-site\blender\butterfly\_incoming\pose-study")
OUT.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(SRC))
scene = bpy.context.scene
arm = bpy.data.objects["Armature"]

# Drop the short flap so we pose from the open keys, then clear it.
if arm.animation_data and arm.animation_data.action:
    arm.animation_data.action = None
bpy.context.view_layer.update()

# Capture the authored open-wing quaternion from the action's first keys by
# evaluating frame 1 before clearing... we already cleared. Re-open.
bpy.ops.wm.open_mainfile(filepath=str(SRC))
scene = bpy.context.scene
arm = bpy.data.objects["Armature"]
scene.frame_set(1)
bpy.context.view_layer.update()
open_quats = {name: arm.pose.bones[name].rotation_quaternion.copy() for name in ("wing", "wing.002", "wingb", "wingb.001")}
print("OPEN", {k: tuple(round(v, 4) for v in q) for k, q in open_quats.items()})

for name in ("cir", "Circle", "Plane", "plane bas", "torssss", "Light"):
    obj = bpy.data.objects.get(name)
    if obj:
        obj.hide_render = True
        obj.hide_viewport = True

# Materials
img = bpy.data.images.load(str(TEX), check_existing=True)
mat = bpy.data.materials["wing"]
nt = mat.node_tree
for node in list(nt.nodes):
    nt.nodes.remove(node)
out = nt.nodes.new("ShaderNodeOutputMaterial")
bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
tex = nt.nodes.new("ShaderNodeTexImage")
tex.image = img
nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
bsdf.inputs["Roughness"].default_value = 0.62
bsdf.inputs["Metallic"].default_value = 0.0
bsdf.inputs["Sheen Weight"].default_value = 0.55
bsdf.inputs["Sheen Roughness"].default_value = 0.72
try:
    bsdf.inputs["Sheen Tint"].default_value = (0.18, 0.14, 0.08, 1)
except Exception:
    pass
if "Transmission Weight" in bsdf.inputs:
    bsdf.inputs["Transmission Weight"].default_value = 0.18
mat.use_backface_culling = False
mat.blend_method = "HASHED" if hasattr(mat, "blend_method") else mat.blend_method
if hasattr(mat, "surface_render_method"):
    mat.surface_render_method = "DITHERED"

for name, color, rough, metal in (
    ("leg.001", (0.035, 0.031, 0.027, 1), 0.48, 0.0),
    ("torso", (0.055, 0.048, 0.042, 1), 0.58, 0.0),
    ("eyes", (0.015, 0.014, 0.013, 1), 0.28, 0.04),
):
    m = bpy.data.materials[name]
    b = m.node_tree.nodes.get("Principled BSDF")
    if b:
        b.inputs["Base Color"].default_value = color
        b.inputs["Roughness"].default_value = rough
        b.inputs["Metallic"].default_value = metal

# Root parent
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="EDIT")
root = arm.data.edit_bones.new("Root")
root.head = Vector((0, 0, 0))
root.tail = Vector((0, 0.02, 0))
root.roll = 0
root.use_deform = False
arm.data.edit_bones["base"].parent = root
bpy.ops.object.mode_set(mode="POSE")
for bone in arm.pose.bones:
    bone.rotation_mode = "QUATERNION"

def qaxis(axis, degrees):
    quat = Quaternion(Vector(axis), math.radians(degrees))
    quat.normalize()
    return quat

def attitude(yaw, pitch, roll):
    quat = qaxis((0, 0, 1), yaw) @ qaxis((1, 0, 0), pitch) @ qaxis((0, 1, 0), roll)
    quat.normalize()
    return quat

scene.render.engine = "BLENDER_EEVEE"
scene.eevee.taa_render_samples = 16
scene.render.resolution_x = 900
scene.render.resolution_y = 700
scene.render.film_transparent = False
scene.render.image_settings.file_format = "PNG"
world = scene.world or bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background") or world.node_tree.nodes.new("ShaderNodeBackground")
if "Background" not in [n.name for n in world.node_tree.nodes]:
    pass
bg = world.node_tree.nodes.get("Background")
if bg is None:
    bg = world.node_tree.nodes.new("ShaderNodeBackground")
    world.node_tree.links.new(bg.outputs[0], world.node_tree.nodes["World Output"].inputs[0])
cam_data = bpy.data.cameras.new("Study")
cam = bpy.data.objects.new("Study", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
cam_data.lens = 55
cam_data.clip_start = 0.001
cam_data.clip_end = 40

def look(loc, target, bg_color):
    bg.inputs[0].default_value = (*bg_color, 1)
    bg.inputs[1].default_value = 1.0
    cam.location = Vector(loc)
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat("-Z", "Y").to_euler()

def apply_wings(delta_l, delta_r, hind):
    for name, delta in (("wing", delta_l), ("wing.002", delta_r)):
        arm.pose.bones[name].rotation_quaternion = qaxis((1, 0, 0), delta) @ open_quats[name]
    arm.pose.bones["wingb"].rotation_quaternion = qaxis((1, 0, 0), hind)
    arm.pose.bones["wingb.001"].rotation_quaternion = qaxis((1, 0, 0), hind * 0.8)

def render(name, loc, target=(0, 0.01, 0.0), bg_color=(0.94, 0.93, 0.90)):
    look(loc, target, bg_color)
    scene.frame_set(1)
    bpy.context.view_layer.update()
    scene.render.filepath = str(OUT / f"{name}.png")
    bpy.ops.render.render(write_still=True)
    print("RENDER", name)

# Website-like camera: looking from -Y.
CAM = (0.0, -0.72, 0.05)
SIDE = (0.72, 0.02, 0.08)

arm.pose.bones["Root"].rotation_quaternion = attitude(0, 0, 0)
apply_wings(0, 0, 0)
render("open-front", CAM)
apply_wings(40, 36, -8)
render("up40-front", CAM)
apply_wings(-18, -14, 6)
render("down18-front", CAM)

# Perch yaw sweep, wings partly raised
for yaw in (-50, -62, -72, -80):
    arm.pose.bones["Root"].rotation_quaternion = attitude(yaw, 16, -4)
    apply_wings(32, 36, -6)
    render(f"perch-yaw{yaw}", CAM)

arm.pose.bones["Root"].rotation_quaternion = attitude(-68, 14, -3)
apply_wings(34, 38, -5)
render("perch-white", CAM, bg_color=(0.97, 0.97, 0.96))
render("perch-black", CAM, bg_color=(0.04, 0.04, 0.045))
render("perch-side", SIDE)
render("perch-top", (0.05, -0.08, 0.85), target=(0, 0.0, 0.0))

# Leg tuck search: rotate each coxa around local X and record foot height.
chains = {
    "leg 1": "leg4",
    "leg 1.002": "leg4.004",
    "leg 1.003": "leg4.006",
    "leg 1.004": "leg4.008",
    "leg 1.005": "leg4.010",
    "leg 1.006": "leg4.012",
}
print("CONSTRAINTS")
for bone in arm.pose.bones:
    if bone.constraints:
        print(bone.name, [(c.type, c.name) for c in bone.constraints])

bpy.context.view_layer.update()
for coxa, foot in chains.items():
    tail = arm.matrix_world @ arm.pose.bones[foot].tail
    print(f"FOOT0 {coxa} {tuple(round(v, 4) for v in tail)}")

best = {}
for coxa, foot in chains.items():
    bone = arm.pose.bones[coxa]
    base_q = bone.rotation_quaternion.copy()
    rest_tail = (arm.matrix_world @ arm.pose.bones[foot].tail).copy()
    winner = None
    for axis in ((1, 0, 0), (0, 1, 0), (0, 0, 1)):
        for deg in range(-50, 55, 10):
            bone.rotation_quaternion = qaxis(axis, deg) @ base_q
            bpy.context.view_layer.update()
            tail = arm.matrix_world @ arm.pose.bones[foot].tail
            lift = tail.z - rest_tail.z
            inward = rest_tail.xy.length - tail.xy.length
            score = lift * 2.2 + inward
            if winner is None or score > winner[0]:
                winner = (score, axis, deg, lift, inward, tuple(round(v, 4) for v in tail))
    bone.rotation_quaternion = base_q
    best[coxa] = winner
    print("TUCK", coxa, "score", round(winner[0], 4), "axis", winner[1], "deg", winner[2], "lift", round(winner[3], 4), "in", round(winner[4], 4), "tail", winner[5])

for coxa, winner in best.items():
    bone = arm.pose.bones[coxa]
    bone.rotation_quaternion = qaxis(winner[1], winner[2]) @ bone.rotation_quaternion
bpy.context.view_layer.update()
arm.pose.bones["Root"].rotation_quaternion = attitude(90, 8, 6)
apply_wings(18, 22, -4)
render("tuck-side", SIDE)
render("tuck-front", CAM)
print("POSE_STUDY_DONE")
