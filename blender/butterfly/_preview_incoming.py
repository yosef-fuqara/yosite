"""Render the provided butterfly at rest and through the existing action."""
import bpy
from mathutils import Vector
from pathlib import Path

SRC = Path(r"c:\Users\yosef\OneDrive\שולחן העבודה\projects\yo-site\blender\butterfly\_incoming\butterfly.blend")
OUT = Path(r"c:\Users\yosef\OneDrive\שולחן העבודה\projects\yo-site\blender\butterfly\_incoming\previews")
TEX = Path(r"c:\Users\yosef\OneDrive\שולחן העבודה\projects\yo-site\blender\butterfly\_incoming\Texture\Alas mariposa.jpg")
OUT.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(SRC))

for im in bpy.data.images:
    if "Alas" in im.name:
        im.filepath = str(TEX)
        im.source = "FILE"
        try:
            im.reload()
        except Exception as exc:
            print("RELOAD_FAIL", im.name, exc)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.eevee.taa_render_samples = 16
scene.render.resolution_x = 960
scene.render.resolution_y = 720
scene.render.film_transparent = False
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"

world = scene.world
if world is None:
    world = bpy.data.worlds.new("World")
    scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
if bg is None:
    bg = world.node_tree.nodes.new("ShaderNodeBackground")
bg.inputs[0].default_value = (0.93, 0.91, 0.87, 1)
bg.inputs[1].default_value = 1.0

arm = bpy.data.objects["Armature"]
print("ACTION", arm.animation_data.action.name if arm.animation_data and arm.animation_data.action else None)
print("POSE_MODE bones", len(arm.pose.bones))

# Dump a few pose bones at frame 1 and 30
def dump(frame):
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    rows = []
    for name in ["base", "torso", "abd1", "abd2", "abd3", "head", "wing", "wing.002", "wingb", "wingb.001", "ante1", "ante5", "leg 1", "leg2"]:
        bone = arm.pose.bones[name]
        e = bone.rotation_euler
        q = bone.rotation_quaternion
        rows.append(
            f"{name} mode={bone.rotation_mode} eul=({e.x:.3f},{e.y:.3f},{e.z:.3f}) "
            f"quat=({q.w:.3f},{q.x:.3f},{q.y:.3f},{q.z:.3f}) loc=({bone.location.x:.4f},{bone.location.y:.4f},{bone.location.z:.4f})"
        )
    print(f"FRAME {frame}")
    print("\n".join(rows))

dump(1)
dump(30)
dump(60)

# Hide helper geometry
for name in ["cir", "Circle", "Plane", "plane bas", "torssss", "Light"]:
    obj = bpy.data.objects.get(name)
    if obj:
        obj.hide_render = True

cam_data = bpy.data.cameras.new("Review")
cam = bpy.data.objects.new("Review", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
cam_data.lens = 50
cam_data.clip_start = 0.01
cam_data.clip_end = 50

def look_at(location, target):
    cam.location = location
    direction = Vector(target) - Vector(location)
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

target = (0.0, 0.02, 0.0)
shots = {
    "front": (0.0, -0.85, 0.08),
    "three_quarter": (0.45, -0.7, 0.18),
    "right": (0.9, 0.02, 0.12),
    "top": (0.0, 0.02, 0.9),
    "back": (0.0, 0.9, 0.12),
}

scene.frame_set(1)
for name, loc in shots.items():
    look_at(loc, target)
    scene.render.filepath = str(OUT / f"f01-{name}.png")
    bpy.ops.render.render(write_still=True)
    print("SHOT", name)

scene.frame_set(30)
look_at((0.45, -0.7, 0.18), target)
scene.render.filepath = str(OUT / "f30-three_quarter.png")
bpy.ops.render.render(write_still=True)
print("PREVIEW_DONE")
