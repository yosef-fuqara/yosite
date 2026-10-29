"""Full-body reviews of the saved hero blend. Does not rebake or overwrite the source."""
import bpy
from mathutils import Vector
from pathlib import Path

BLEND = Path(r"c:\Users\yosef\OneDrive\שולחן העבודה\projects\yo-site\blender\butterfly\butterfly-hero.blend")
OUT = Path(r"c:\Users\yosef\OneDrive\שולחן העבודה\projects\yo-site\blender\butterfly\hero-living-previews")
bpy.ops.wm.open_mainfile(filepath=str(BLEND))
scene = bpy.context.scene
arm = bpy.data.objects["Armature"]
scene.render.engine = "BLENDER_EEVEE"
scene.eevee.taa_render_samples = 24
scene.render.resolution_x = 1200
scene.render.resolution_y = 860
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
try:
    scene.view_settings.view_transform = "Standard"
except Exception:
    pass

world = scene.world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
if bg is None:
    bg = world.node_tree.nodes.new("ShaderNodeBackground")
    world.node_tree.links.new(bg.outputs[0], world.node_tree.nodes["World Output"].inputs[0])

for name in ("cir", "Circle", "Plane", "plane bas", "torssss", "Light"):
    obj = bpy.data.objects.get(name)
    if obj:
        obj.hide_render = True

sun_data = bpy.data.lights.new("Key", "SUN")
sun_data.energy = 3.2
sun_data.color = (1.0, 0.97, 0.93)
sun = bpy.data.objects.new("Key", sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = (0.9, 0.15, 0.4)
fill_data = bpy.data.lights.new("Fill", "SUN")
fill_data.energy = 1.3
fill = bpy.data.objects.new("Fill", fill_data)
scene.collection.objects.link(fill)
fill.rotation_euler = (1.1, -0.4, -1.2)

cam_data = bpy.data.cameras.new("Frame")
cam = bpy.data.objects.new("Frame", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
cam_data.type = "ORTHO"
cam_data.ortho_scale = 0.95
cam_data.clip_start = 0.001
cam_data.clip_end = 40

def shoot(label, clip, time, place, target, color, scale=0.95):
    action = bpy.data.actions[clip]
    arm.animation_data.action = action
    arm.animation_data.action_slot = action.slots[0]
    scene.frame_set(round(time * 60))
    bpy.context.view_layer.update()
    bg.inputs[0].default_value = (*color, 1)
    bg.inputs[1].default_value = 0.35
    cam_data.ortho_scale = scale
    cam.location = Vector(place)
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(OUT / f"{label}.png")
    bpy.ops.render.render(write_still=True)
    print("FRAME", label, flush=True)

body = (0.0, 0.01, 0.02)
white = (0.96, 0.96, 0.95)
black = (0.02, 0.02, 0.025)
warm = (0.90, 0.88, 0.84)
# Level website camera, far enough to see the whole animal.
shoot("full-land-white", "HERO_ENTRY_H_LAND", 9.0, (0.0, -1.5, 0.06), body, white, 0.85)
shoot("full-land-black", "HERO_ENTRY_H_LAND", 9.0, (0.0, -1.5, 0.06), body, black, 0.85)
shoot("full-land-right", "HERO_ENTRY_H_LAND", 9.0, (1.5, 0.0, 0.06), body, warm, 0.85)
shoot("full-land-top", "HERO_ENTRY_H_LAND", 9.0, (0.0, -0.2, 1.6), body, warm, 0.9)
shoot("full-fly-white", "HERO_ENTRY_H_LAND", 2.4, (-0.5, -1.5, 0.08), (-0.5, 0.02, 0.05), white, 0.9)
shoot("full-approach", "HERO_ENTRY_H_LAND", 7.2, (-0.08, -1.5, 0.08), (-0.05, 0.02, 0.04), warm, 0.9)
shoot("full-perch", "PERCHED_IDLE_H", 3.0, (0.0, -1.5, 0.06), body, white, 0.85)
print("FRAME_DONE")
