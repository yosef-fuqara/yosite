"""Dump the user-provided butterfly blend: objects, bones, actions, materials."""
import bpy
import json
from mathutils import Vector

path = r"c:\Users\yosef\OneDrive\שולחן העבודה\projects\yo-site\blender\butterfly\_incoming\butterfly.blend"
bpy.ops.wm.open_mainfile(filepath=path)

report = {
    "scenes": [],
    "objects": [],
    "armatures": [],
    "actions": [],
    "materials": [],
    "images": [],
}

for scene in bpy.data.scenes:
    report["scenes"].append({
        "name": scene.name,
        "fps": scene.render.fps,
        "frame_start": scene.frame_start,
        "frame_end": scene.frame_end,
        "frame_current": scene.frame_current,
    })

for obj in bpy.data.objects:
    item = {
        "name": obj.name,
        "type": obj.type,
        "parent": obj.parent.name if obj.parent else None,
        "location": [round(v, 5) for v in obj.location],
        "rotation_euler": [round(v, 5) for v in obj.rotation_euler],
        "scale": [round(v, 5) for v in obj.scale],
        "dims": [round(v, 5) for v in obj.dimensions],
    }
    if obj.type == "MESH":
        item["verts"] = len(obj.data.vertices)
        item["polys"] = len(obj.data.polygons)
        item["materials"] = [s.material.name if s.material else None for s in obj.material_slots]
        item["vertex_groups"] = [g.name for g in obj.vertex_groups]
        item["modifiers"] = [(m.name, m.type) for m in obj.modifiers]
        item["uvs"] = [uv.name for uv in obj.data.uv_layers]
    if obj.type == "ARMATURE":
        bones = []
        for bone in obj.data.bones:
            bones.append({
                "name": bone.name,
                "parent": bone.parent.name if bone.parent else None,
                "head": [round(v, 5) for v in bone.head_local],
                "tail": [round(v, 5) for v in bone.tail_local],
                "deform": bone.use_deform,
                "length": round(bone.length, 5),
            })
        item["bones"] = bones
        if obj.animation_data:
            ad = obj.animation_data
            item["action"] = ad.action.name if ad.action else None
            item["nla"] = [strip.name for track in ad.nla_tracks for strip in track.strips]
    report["objects"].append(item)

for action in bpy.data.actions:
    fcurves = 0
    try:
        if action.layers:
            for layer in action.layers:
                for strip in layer.strips:
                    for slot in action.slots:
                        bag = strip.channelbag(slot)
                        if bag:
                            fcurves += len(bag.fcurves)
    except Exception as exc:
        fcurves = -1
        report.setdefault("action_errors", []).append(str(exc))
    groups = []
    try:
        groups = [g.name for g in action.groups]
    except Exception:
        pass
    report["actions"].append({
        "name": action.name,
        "frame_range": [round(action.frame_range[0], 2), round(action.frame_range[1], 2)],
        "fcurves": fcurves,
        "groups": groups[:40],
    })

for mat in bpy.data.materials:
    info = {"name": mat.name, "use_nodes": mat.use_nodes}
    if mat.use_nodes and mat.node_tree:
        info["nodes"] = [n.type + ":" + n.name for n in mat.node_tree.nodes]
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            keys = ["Base Color", "Metallic", "Roughness", "Alpha", "Transmission Weight", "Sheen Weight", "IOR"]
            vals = {}
            for key in keys:
                sock = bsdf.inputs.get(key)
                if sock is None:
                    continue
                val = sock.default_value
                if hasattr(val, "__len__") and not isinstance(val, str):
                    vals[key] = [round(float(v), 4) for v in val]
                else:
                    vals[key] = round(float(val), 4)
            info["bsdf"] = vals
    report["materials"].append(info)

for im in bpy.data.images:
    report["images"].append({
        "name": im.name,
        "size": list(im.size),
        "filepath": im.filepath,
        "packed": bool(im.packed_file),
    })

out = r"c:\Users\yosef\OneDrive\שולחן העבודה\projects\yo-site\blender\butterfly\_incoming\inspect.json"
with open(out, "w", encoding="utf-8") as fh:
    json.dump(report, fh, indent=2)
print("INSPECT_DONE", len(report["objects"]), "objects", len(report["actions"]), "actions")
