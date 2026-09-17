"""
YoSite hero asset — open ribbon sculptural lowercase "y".

Builds a continuous open Bezier ribbon (flattened rounded-rect profile) that
matches the hero reference silhouette:
  left tapered tip → waist → open right upper loop → waist weave →
  diagonal lower leg → elongated bottom-right teardrop → tucked end tip.

Glass outer shell + chrome inner core, warm studio preview, GLB export.

Run from the repository root:

    blender --background --python scripts/create-yosite-model.py

or, with Blender already open, load it in the Scripting workspace and Run.
Set `PREVIEW_ONLY = True` to build and light the scene without exporting.
"""

from __future__ import annotations

import math
import os

import bpy
from mathutils import Euler, Vector

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

PREVIEW_ONLY = False

EXPORT_RELATIVE_PATH = os.path.join("public", "models", "yosite-ribbon-y.glb")
PREVIEW_RELATIVE_PATH = os.path.join("public", "models", "yosite-ribbon-y-preview.png")

OBJECT_GLASS = "YOuterGlass"
OBJECT_CHROME = "YInnerChrome"

# Flattened ribbon cross-section (Blender units).
OUTER_HALF_W, OUTER_HALF_T, OUTER_CORNER = 0.168, 0.048, 0.042
INNER_HALF_W, INNER_HALF_T, INNER_CORNER = 0.090, 0.024, 0.020

# Presentation rotation baked into the export (degrees).
# Tilts the lower leg toward bottom-right to match the hero crop.
KNOT_ROTATION = (10.0, -2.0, -38.0)

DECIMATE_RATIO = 0.35

ACCENT_PURPLE = (0.545, 0.361, 0.965, 1.0)  # #8B5CF6
ACCENT_BLUE = (0.302, 0.486, 0.996, 1.0)  # #4D7CFE
WARM_IVORY = (0.945, 0.937, 0.910, 1.0)  # #F1EFE8


# --------------------------------------------------------------------------
# Scene helpers
# --------------------------------------------------------------------------

def clear_scene():
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    for collection in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.lights,
        bpy.data.cameras,
        bpy.data.objects,
    ):
        for datablock in list(collection):
            try:
                collection.remove(datablock)
            except (RuntimeError, ReferenceError):
                pass


def find_project_root():
    candidates = []
    script_path = globals().get("__file__")
    if script_path:
        candidates.append(os.path.dirname(os.path.dirname(os.path.abspath(script_path))))
    if bpy.data.filepath:
        candidates.append(os.path.dirname(bpy.data.filepath))
    candidates.append(os.getcwd())

    for candidate in candidates:
        probe = candidate
        for _ in range(5):
            if os.path.isfile(os.path.join(probe, "package.json")):
                return probe
            parent = os.path.dirname(probe)
            if parent == probe:
                break
            probe = parent

    return candidates[0] if candidates else os.getcwd()


def set_input(node, names, value):
    for name in names:
        if name in node.inputs:
            node.inputs[name].default_value = value
            return True
    return False


# --------------------------------------------------------------------------
# Profile + path
# --------------------------------------------------------------------------

def rounded_rect_profile(name, half_w, half_t, corner_r, segments=5):
    curve = bpy.data.curves.new(name, type="CURVE")
    curve.dimensions = "2D"
    curve.fill_mode = "NONE"
    spline = curve.splines.new("POLY")
    flat = max(half_w - corner_r, 1e-4)

    pts = [(-flat, half_t), (flat, half_t)]
    for i in range(1, segments):
        a = math.radians(90 - 180 * i / segments)
        pts.append((flat + corner_r * math.cos(a), corner_r * math.sin(a)))
    pts += [(flat, -half_t), (-flat, -half_t)]
    for i in range(1, segments):
        a = math.radians(-90 - 180 * i / segments)
        pts.append((-flat + corner_r * math.cos(a), corner_r * math.sin(a)))

    spline.points.add(len(pts) - 1)
    for i, (x, y) in enumerate(pts):
        spline.points[i].co = (x, y, 0.0, 1.0)
    spline.use_cyclic_u = True

    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.hide_render = True
    obj.hide_viewport = True
    return obj


def ribbon_keys():
    """Open path control points matching the hero reference silhouette.

    Each entry: (co, handle_left_offset, handle_right_offset, radius)
    Coordinates: +X right, +Y depth, +Z up.
    """
    return [
        # Left tip — short, horizontal, toward camera
        (Vector((-1.00, -0.78, 0.58)), Vector((-0.07, -0.04, 0.03)), Vector((0.15, 0.12, -0.02)), 0.24),
        (Vector((-0.72, -0.50, 0.64)), Vector((-0.14, -0.14, 0.02)), Vector((0.18, 0.14, -0.04)), 0.80),
        (Vector((-0.38, -0.16, 0.46)), Vector((-0.16, -0.12, 0.10)), Vector((0.18, 0.10, -0.10)), 0.98),
        (Vector((-0.08, 0.08, 0.28)), Vector((-0.12, -0.04, 0.08)), Vector((0.12, 0.0, -0.06)), 0.76),
        # Waist → right loop
        (Vector((0.10, 0.16, 0.24)), Vector((-0.10, 0.06, 0.0)), Vector((0.12, -0.08, 0.10)), 0.48),
        # Right upper loop — taller, more open, dominant
        (Vector((0.30, 0.00, 0.55)), Vector((-0.08, 0.10, -0.12)), Vector((0.12, -0.04, 0.20)), 0.68),
        (Vector((0.46, -0.14, 0.98)), Vector((-0.06, 0.04, -0.18)), Vector((0.14, -0.02, 0.22)), 0.94),
        (Vector((0.72, -0.02, 1.36)), Vector((-0.12, -0.08, -0.14)), Vector((0.18, 0.08, 0.10)), 1.06),
        (Vector((1.08, 0.20, 1.46)), Vector((-0.18, -0.10, 0.02)), Vector((0.16, 0.08, -0.06)), 1.02),
        (Vector((1.34, 0.34, 1.12)), Vector((-0.10, 0.0, 0.18)), Vector((0.08, 0.0, -0.20)), 1.00),
        (Vector((1.32, 0.26, 0.66)), Vector((0.04, 0.06, 0.16)), Vector((-0.08, -0.06, -0.18)), 1.00),
        (Vector((1.05, 0.08, 0.32)), Vector((0.14, 0.08, 0.10)), Vector((-0.18, -0.06, -0.08)), 0.90),
        (Vector((0.66, -0.06, 0.16)), Vector((0.16, 0.04, 0.06)), Vector((-0.18, -0.02, -0.02)), 0.72),
        # Waist pass 2 (toward camera)
        (Vector((0.28, -0.20, 0.10)), Vector((0.14, 0.0, 0.04)), Vector((-0.10, -0.02, -0.04)), 0.52),
        (Vector((0.08, -0.12, 0.02)), Vector((0.08, -0.04, 0.04)), Vector((-0.02, 0.08, -0.12)), 0.44),
        # Lower stem — diagonal bottom-right
        (Vector((0.32, 0.06, -0.30)), Vector((-0.08, -0.10, 0.14)), Vector((0.14, 0.08, -0.18)), 0.78),
        (Vector((0.68, 0.16, -0.68)), Vector((-0.12, -0.02, 0.14)), Vector((0.18, 0.02, -0.16)), 0.98),
        (Vector((1.08, 0.10, -1.00)), Vector((-0.14, 0.04, 0.12)), Vector((0.18, -0.04, -0.12)), 1.02),
        (Vector((1.40, -0.04, -1.22)), Vector((-0.12, 0.06, 0.08)), Vector((0.14, -0.06, -0.10)), 0.92),
        # Lower elongated teardrop
        (Vector((1.55, -0.14, -1.48)), Vector((-0.02, 0.06, 0.10)), Vector((0.06, -0.06, -0.12)), 0.76),
        (Vector((1.48, -0.10, -1.78)), Vector((0.10, -0.04, 0.10)), Vector((-0.16, 0.08, -0.08)), 0.62),
        (Vector((1.05, 0.12, -1.95)), Vector((0.20, -0.08, 0.0)), Vector((-0.20, 0.08, 0.06)), 0.58),
        (Vector((0.62, 0.24, -1.70)), Vector((0.14, -0.02, -0.14)), Vector((-0.10, 0.02, 0.16)), 0.66),
        (Vector((0.55, 0.20, -1.28)), Vector((0.02, 0.02, -0.16)), Vector((0.02, -0.02, 0.18)), 0.72),
        (Vector((0.72, 0.06, -0.90)), Vector((-0.08, 0.06, -0.12)), Vector((0.12, -0.06, 0.10)), 0.55),
        # Tucked end tip
        (Vector((0.92, -0.06, -0.62)), Vector((-0.06, 0.04, -0.10)), Vector((0.06, -0.04, 0.06)), 0.34),
        (Vector((1.00, -0.10, -0.45)), Vector((-0.02, 0.02, -0.05)), Vector((0.02, -0.02, 0.02)), 0.16),
    ]


def make_bezier_ribbon(name, profile_obj):
    curve = bpy.data.curves.new(name, type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 80
    curve.fill_mode = "FULL"
    curve.bevel_mode = "OBJECT"
    curve.bevel_object = profile_obj
    curve.use_fill_caps = True
    curve.twist_mode = "MINIMUM"

    keys = ribbon_keys()
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(keys) - 1)
    spline.use_cyclic_u = False

    for i, (co, hl, hr, radius) in enumerate(keys):
        bp = spline.bezier_points[i]
        bp.co = co
        bp.handle_left_type = "FREE"
        bp.handle_right_type = "FREE"
        bp.handle_left = co + hl
        bp.handle_right = co + hr
        bp.radius = radius

    for i, bp in enumerate(spline.bezier_points):
        t = i / (len(spline.bezier_points) - 1)
        bp.tilt = math.radians(26.0 * math.sin(t * math.pi * 1.9) + 14.0 * t)

    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    return obj


def curve_to_mesh(obj, mesh_name):
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    mesh_obj = bpy.context.active_object
    mesh_obj.name = mesh_name
    mesh_obj.data.name = mesh_name
    bpy.ops.object.shade_smooth()
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(58.0))
    except (AttributeError, RuntimeError):
        pass
    return mesh_obj


def decimate(obj, ratio):
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    mod = obj.modifiers.new("Decimate", "DECIMATE")
    mod.ratio = ratio
    bpy.ops.object.modifier_apply(modifier="Decimate")
    bpy.ops.object.shade_smooth()
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(57.0))
    except (AttributeError, RuntimeError):
        pass


# --------------------------------------------------------------------------
# Materials
# --------------------------------------------------------------------------

def enable_eevee_refraction(material):
    for attribute in ("use_raytrace_refraction", "use_screen_refraction"):
        if hasattr(material, attribute):
            setattr(material, attribute, True)
    if hasattr(material, "use_transparent_shadow"):
        material.use_transparent_shadow = True
    if hasattr(material, "use_backface_culling"):
        material.use_backface_culling = False


def create_glass_material():
    material = bpy.data.materials.new("YoSite_SmokedGlass")
    material.use_nodes = True
    bsdf = material.node_tree.nodes["Principled BSDF"]

    set_input(bsdf, ["Base Color"], (0.82, 0.82, 0.88, 1.0))
    set_input(bsdf, ["Metallic"], 0.12)
    set_input(bsdf, ["Roughness"], 0.028)
    set_input(bsdf, ["IOR"], 1.5)
    set_input(bsdf, ["Transmission Weight", "Transmission"], 0.88)
    set_input(bsdf, ["Coat Weight", "Clearcoat"], 1.0)
    set_input(bsdf, ["Coat Roughness", "Clearcoat Roughness"], 0.02)
    set_input(bsdf, ["Specular IOR Level", "Specular"], 1.0)
    set_input(bsdf, ["Emission Color"], ACCENT_PURPLE)
    set_input(bsdf, ["Emission Strength"], 0.055)

    nodes = material.node_tree.nodes
    links = material.node_tree.links
    vol = nodes.new("ShaderNodeVolumeAbsorption")
    vol.inputs["Color"].default_value = (0.55, 0.38, 0.95, 1.0)
    vol.inputs["Density"].default_value = 0.85
    links.new(vol.outputs["Volume"], nodes["Material Output"].inputs["Volume"])

    enable_eevee_refraction(material)
    return material


def create_chrome_material():
    material = bpy.data.materials.new("YoSite_PolishedChrome")
    material.use_nodes = True
    bsdf = material.node_tree.nodes["Principled BSDF"]

    set_input(bsdf, ["Base Color"], (0.78, 0.80, 0.86, 1.0))
    set_input(bsdf, ["Metallic"], 1.0)
    set_input(bsdf, ["Roughness"], 0.06)
    set_input(bsdf, ["Coat Weight", "Clearcoat"], 0.35)
    set_input(bsdf, ["Coat Roughness", "Clearcoat Roughness"], 0.1)
    return material


# --------------------------------------------------------------------------
# Studio preview
# --------------------------------------------------------------------------

def setup_world():
    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = WARM_IVORY
        background.inputs["Strength"].default_value = 0.55


def add_area_light(name, location, rotation, energy, size, color):
    data = bpy.data.lights.new(name, type="AREA")
    data.energy = energy
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    obj.rotation_euler = Euler(rotation, "XYZ")
    bpy.context.collection.objects.link(obj)
    return obj


def setup_lighting():
    add_area_light(
        "Key_Warm",
        location=(1.6, -5.0, 3.6),
        rotation=(math.radians(48), 0.0, math.radians(20)),
        energy=620.0,
        size=5.0,
        color=(1.0, 0.96, 0.90),
    )
    add_area_light(
        "Fill_Cool",
        location=(-4.2, -3.2, 1.2),
        rotation=(math.radians(85), 0.0, math.radians(-55)),
        energy=300.0,
        size=7.0,
        color=(0.94, 0.96, 1.0),
    )
    add_area_light(
        "Rim_Purple",
        location=(4.2, 0.4, -0.2),
        rotation=(math.radians(70), 0.0, math.radians(150)),
        energy=680.0,
        size=2.8,
        color=ACCENT_PURPLE[:3],
    )
    add_area_light(
        "Bounce_Purple",
        location=(2.6, -0.8, -1.9),
        rotation=(math.radians(20), 0.0, math.radians(40)),
        energy=340.0,
        size=3.0,
        color=ACCENT_PURPLE[:3],
    )
    add_area_light(
        "Rim_Silver",
        location=(-2.4, 2.0, 1.6),
        rotation=(math.radians(110), 0.0, math.radians(-145)),
        energy=300.0,
        size=2.0,
        color=(0.92, 0.94, 1.0),
    )


def add_dark_card(name, location, rotation, scale):
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = Euler(rotation, "XYZ")
    obj.scale = scale
    mat = bpy.data.materials.new(name + "_Mat")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    set_input(bsdf, ["Base Color"], (0.02, 0.02, 0.03, 1.0))
    set_input(bsdf, ["Roughness"], 0.85)
    set_input(bsdf, ["Specular IOR Level", "Specular"], 0.0)
    obj.data.materials.append(mat)
    obj.visible_camera = False
    return obj


def setup_reflection_cards():
    add_dark_card("ReflectCard_Top", (0.5, 2.5, 4.5), (math.radians(90), 0, 0), (8, 4, 1))
    add_dark_card("ReflectCard_Left", (-5.5, -1.0, 0.5), (0, math.radians(90), 0), (6, 8, 1))
    add_dark_card("ReflectCard_Back", (1.0, 4.5, 0.0), (0, 0, 0), (10, 8, 1))


def setup_backdrop(lowest_z):
    bpy.ops.mesh.primitive_plane_add(size=30.0, location=(0.3, 0.0, lowest_z - 0.02))
    plane = bpy.context.active_object
    plane.name = "Backdrop"
    material = bpy.data.materials.new("YoSite_Backdrop")
    material.use_nodes = True
    bsdf = material.node_tree.nodes["Principled BSDF"]
    set_input(bsdf, ["Base Color"], WARM_IVORY)
    set_input(bsdf, ["Roughness"], 0.88)
    set_input(bsdf, ["Specular IOR Level", "Specular"], 0.12)
    plane.data.materials.append(material)
    return plane


def setup_camera(target):
    data = bpy.data.cameras.new("Camera")
    data.lens = 90.0
    camera = bpy.data.objects.new("Camera", data)
    camera.location = (1.2, -9.6, 0.7)
    bpy.context.collection.objects.link(camera)
    bpy.context.scene.camera = camera

    constraint = camera.constraints.new(type="TRACK_TO")
    constraint.target = target
    constraint.track_axis = "TRACK_NEGATIVE_Z"
    constraint.up_axis = "UP_Y"
    return camera


def setup_render():
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 1400
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.exposure = 0.05

    eevee = scene.eevee
    for attribute, value in (
        ("use_raytracing", True),
        ("use_shadows", True),
        ("taa_render_samples", 64),
        ("taa_samples", 32),
    ):
        if hasattr(eevee, attribute):
            setattr(eevee, attribute, value)


def centre_and_apply(glass, chrome):
    for obj in (glass, chrome):
        bpy.ops.object.select_all(action="DESELECT")
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        obj.rotation_euler = Euler([math.radians(a) for a in KNOT_ROTATION], "XYZ")
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

    bpy.ops.object.select_all(action="DESELECT")
    glass.select_set(True)
    chrome.select_set(True)
    bpy.context.view_layer.objects.active = glass
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")

    offset = Vector(glass.location)
    glass.location = (0.0, 0.0, 0.0)
    chrome.location = Vector(chrome.location) - offset

    bpy.ops.object.select_all(action="DESELECT")
    for obj in (glass, chrome):
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    chrome.parent = glass


def export_glb(glass, chrome, filepath):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    glass.select_set(True)
    chrome.select_set(True)
    bpy.context.view_layer.objects.active = glass

    options = dict(
        filepath=filepath,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_normals=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_extras=False,
        export_texcoords=False,
    )
    try:
        bpy.ops.export_scene.gltf(**options)
    except TypeError:
        bpy.ops.export_scene.gltf(filepath=filepath, export_format="GLB", use_selection=True)
    return filepath


def render_preview(filepath):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    scene = bpy.context.scene
    scene.render.filepath = filepath
    scene.render.image_settings.file_format = "PNG"
    bpy.ops.render.render(write_still=True)
    return filepath


# --------------------------------------------------------------------------

def main():
    clear_scene()

    outer_profile = rounded_rect_profile(
        "OuterProfile", OUTER_HALF_W, OUTER_HALF_T, OUTER_CORNER
    )
    inner_profile = rounded_rect_profile(
        "InnerProfile", INNER_HALF_W, INNER_HALF_T, INNER_CORNER
    )

    glass_curve = make_bezier_ribbon(OBJECT_GLASS, outer_profile)
    chrome_curve = make_bezier_ribbon(OBJECT_CHROME, inner_profile)

    glass = curve_to_mesh(glass_curve, OBJECT_GLASS)
    chrome = curve_to_mesh(chrome_curve, OBJECT_CHROME)

    glass_mat = create_glass_material()
    chrome_mat = create_chrome_material()
    glass.data.materials.clear()
    glass.data.materials.append(glass_mat)
    chrome.data.materials.clear()
    chrome.data.materials.append(chrome_mat)

    centre_and_apply(glass, chrome)
    decimate(glass, DECIMATE_RATIO)
    decimate(chrome, DECIMATE_RATIO)

    setup_world()
    setup_lighting()
    setup_reflection_cards()

    bpy.context.view_layer.update()
    lowest = min((glass.matrix_world @ Vector(corner)).z for corner in glass.bound_box)
    setup_backdrop(lowest)

    target = bpy.data.objects.new("ViewTarget", None)
    target.location = (0.0, 0.0, 0.0)
    bpy.context.collection.objects.link(target)
    setup_camera(target)
    setup_render()

    print(
        "YOSITE_MODEL verts=%d faces=%d"
        % (len(glass.data.vertices), len(glass.data.polygons))
    )
    print("YOSITE_DIMENSIONS %s" % (tuple(round(d, 3) for d in glass.dimensions),))

    root = find_project_root()
    if PREVIEW_ONLY:
        print("YOSITE_EXPORT skipped (PREVIEW_ONLY)")
        return

    glb_path = os.path.join(root, EXPORT_RELATIVE_PATH)
    export_glb(glass, chrome, glb_path)
    print("YOSITE_EXPORT %s (%.1f KB)" % (glb_path, os.path.getsize(glb_path) / 1024.0))

    preview_path = os.path.join(root, PREVIEW_RELATIVE_PATH)
    render_preview(preview_path)
    print("YOSITE_PREVIEW %s" % preview_path)


if __name__ == "__main__":
    main()
