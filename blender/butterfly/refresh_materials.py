"""Reload wing/body texture maps and wing BSDF tuning without touching geometry or rig.

Run from repo root:
  blender --background --factory-startup --python blender/butterfly/refresh_materials.py
"""
import json
import sys
from pathlib import Path

import bpy

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
TEX = HERE / "textures"
STATIC_BLEND = HERE / "butterfly.blend"
ANIM_BLEND = HERE / "butterfly-animated.blend"
STATIC_GLB = ROOT / "public" / "models" / "butterfly.glb"
ANIM_GLB = ROOT / "public" / "models" / "butterfly-animated.glb"
PREVIEW = HERE / "previews"
WING_FILES = (
    "wing_basecolor.png",
    "wing_orm.png",
    "wing_normal.png",
    "wing_transmission.png",
    "body_normal.png",
)
WING_MAT_NAMES = (
    "Wing • charcoal silk / silver scales",
    "Wing • charcoal silk / warm ivory scales",
)
MESHES = [
    "Body",
    "Head",
    "Left_Forewing",
    "Left_Hindwing",
    "Right_Forewing",
    "Right_Hindwing",
    "Antenna_L",
    "Antenna_R",
]


def tune_wing_materials():
    for mat in bpy.data.materials:
        if mat.name not in WING_MAT_NAMES:
            continue
        mat.name = "Wing • charcoal silk / warm ivory scales"
        if not mat.use_nodes:
            continue
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if not bsdf:
            continue
        bsdf.inputs["Roughness"].default_value = 0.68
        bsdf.inputs["Sheen Weight"].default_value = 1.0
        bsdf.inputs["Sheen Tint"].default_value = (0.034, 0.028, 0.022, 1.0)
        bsdf.inputs["Sheen Roughness"].default_value = 0.82
        mat.diffuse_color = (0.09, 0.085, 0.075, 1.0)


def reload_textures():
    for filename in WING_FILES:
        path = TEX / filename
        if not path.is_file():
            raise FileNotFoundError(path)
        image = bpy.data.images.get(filename)
        if image is None:
            raise RuntimeError(f"missing packed image {filename}")
        image.filepath = str(path)
        image.source = "FILE"
        image.reload()
        image.pack()


def export_static():
    parent = bpy.data.objects["Butterfly"]
    parts = [bpy.data.objects[name] for name in MESHES]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in [parent, *parts]:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.export_scene.gltf(
        filepath=str(STATIC_GLB),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_animations=False,
        export_skins=False,
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
    )


def export_animated():
    import addon_utils

    addon_utils.enable("io_scene_gltf2", default_set=True, persistent=False)
    parent = bpy.data.objects["Butterfly"]
    rig = bpy.data.objects["Butterfly_Rig"]
    meshes = [bpy.data.objects[name] for name in MESHES]
    for obj in meshes:
        if not obj.name.endswith("_Mesh"):
            obj.name = obj.name + "_Mesh"
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    for obj in [parent, rig, *meshes]:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(ANIM_GLB),
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

    return smooth_glb(ANIM_GLB)


def render_previews():
    scene = bpy.context.scene
    cam = bpy.data.objects.get("Inspection Camera")
    if cam is None:
        return
    scene.camera = cam
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 40
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 1200
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    PREVIEW.mkdir(parents=True, exist_ok=True)
    views = {
        "three-quarter": (0.035, -0.10, 0.175),
        "top": (0, 0, 0.2),
        "front": (0, 0.19, 0.022),
        "side": (0.2, 0, 0.012),
        "underside": (0, 0, -0.2),
    }
    from mathutils import Vector

    def aim(loc, target=(0, 0, 0)):
        cam.location = loc
        cam.rotation_euler = (Vector(target) - cam.location).to_track_quat("-Z", "Y").to_euler()

    for label, loc in views.items():
        aim(loc)
        scene.render.filepath = str(PREVIEW / f"{label}.png")
        bpy.ops.render.render(write_still=True)
        print("RENDER_DONE", label, flush=True)


def render_hero_white():
    scene = bpy.context.scene
    rig = bpy.data.objects["Butterfly_Rig"]
    hero = bpy.data.actions.get("HERO_ENTRY_H_LAND")
    if hero is None:
        return
    rig.animation_data.action = hero
    rig.animation_data.action_slot = hero.slots[0]
    scene.frame_set(round(7.55 * 120))
    world = scene.world
    if world and world.use_nodes:
        background = world.node_tree.nodes.get("Background")
        if background:
            background.inputs[0].default_value = (0.969, 0.969, 0.969, 1)
            background.inputs[1].default_value = 1.0
    cam_data = bpy.data.cameras.new("WarmMaterialReview")
    cam = bpy.data.objects.new("WarmMaterialReview", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 0.16
    anchor = rig.pose.bones["Root"].head.copy()
    target = anchor + __import__("mathutils").Vector((0, 0, 0.012))
    cam.location = anchor + __import__("mathutils").Vector((0, -0.5, 0.03))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGB"
    out = HERE / "hero-previews" / "warm-material-HERO-7.55.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(out)
    bpy.ops.render.render(write_still=True)
    print("RENDER_DONE", out.name, flush=True)


def process_blend(path, animated):
    bpy.ops.wm.open_mainfile(filepath=str(path))
    reload_textures()
    tune_wing_materials()
    if animated:
        smooth = export_animated()
        render_hero_white()
    else:
        export_static()
        render_previews()
        smooth = None
    bpy.ops.wm.save_as_mainfile(filepath=str(path))
    return smooth


def main():
    static_smooth = process_blend(STATIC_BLEND, animated=False)
    anim_smooth = process_blend(ANIM_BLEND, animated=True)
    report = {
        "static_glb_bytes": STATIC_GLB.stat().st_size,
        "animated_glb_bytes": ANIM_GLB.stat().st_size,
        "static_smooth": static_smooth,
        "animated_smooth_clips": list(anim_smooth.keys()) if anim_smooth else [],
    }
    print("REFRESH_MATERIALS", json.dumps(report), flush=True)


if __name__ == "__main__":
    main()
