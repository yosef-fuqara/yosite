"""Bone axes, UV bounds, and which channels the existing flap actually keys."""
import bpy
import json
from pathlib import Path
from mathutils import Vector

SRC = Path(r"c:\Users\yosef\OneDrive\שולחן העבודה\projects\yo-site\blender\butterfly\_incoming\butterfly.blend")
bpy.ops.wm.open_mainfile(filepath=str(SRC))
arm = bpy.data.objects["Armature"]
action = bpy.data.actions["break pose"]

curves = []
for layer in action.layers:
    for strip in layer.strips:
        for slot in action.slots:
            bag = strip.channelbag(slot)
            if not bag:
                continue
            for fc in bag.fcurves:
                pts = [(round(p.co[0], 2), round(p.co[1], 5)) for p in fc.keyframe_points]
                if not pts:
                    continue
                values = [p[1] for p in pts]
                if max(values) - min(values) < 1e-5:
                    continue
                curves.append({
                    "path": fc.data_path,
                    "index": fc.array_index,
                    "keys": len(pts),
                    "min": min(values),
                    "max": max(values),
                    "first": pts[0][1],
                    "mid": pts[len(pts)//2][1],
                    "last": pts[-1][1],
                })

# Rest axes for important bones
axes = {}
for name in ["base", "torso", "head", "abd1", "wing", "wing.001", "wingb", "wing.002", "wing.003", "wingb.001",
             "ante1", "ante2", "ante5", "leg 1", "leg2", "leg3", "leg4", "leg 1.002", "leg 1.003", "leg 1.005"]:
    bone = arm.data.bones[name]
    x = (bone.x_axis).normalized()
    y = (bone.y_axis).normalized()
    z = (bone.z_axis).normalized()
    axes[name] = {
        "x": [round(v, 3) for v in x],
        "y": [round(v, 3) for v in y],
        "z": [round(v, 3) for v in z],
        "head": [round(v, 4) for v in bone.head_local],
        "tail": [round(v, 4) for v in bone.tail_local],
    }

uvs = {}
for name in ["wing", "wing.001", "wing b", "wing b.001"]:
    obj = bpy.data.objects[name]
    layer = obj.data.uv_layers.active
    coords = [loop.uv for loop in layer.data]
    us = [c.x for c in coords]
    vs = [c.y for c in coords]
    uvs[name] = {
        "u": [round(min(us), 4), round(max(us), 4)],
        "v": [round(min(vs), 4), round(max(vs), 4)],
        "count": len(coords),
    }

# Wing material links
mat = bpy.data.materials["wing"]
nt = mat.node_tree
links = []
for link in nt.links:
    links.append(f"{link.from_node.name}.{link.from_socket.name} -> {link.to_node.name}.{link.to_socket.name}")

out = {
    "moving_curves": curves,
    "axes": axes,
    "uvs": uvs,
    "wing_links": links,
}
dest = Path(r"c:\Users\yosef\OneDrive\שולחן העבודה\projects\yo-site\blender\butterfly\_incoming\motion.json")
dest.write_text(json.dumps(out, indent=2), encoding="utf-8")
print("CURVES", len(curves))
print("DONE")
