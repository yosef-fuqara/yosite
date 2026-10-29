import bpy
SRC = r"c:\Users\yosef\OneDrive\שולחן העבודה\projects\yo-site\blender\butterfly\_incoming\butterfly.blend"
bpy.ops.wm.open_mainfile(filepath=SRC)
arm = bpy.data.objects["Armature"]
for bone in arm.pose.bones:
    for c in bone.constraints:
        extra = ""
        if c.type == "IK":
            extra = f" target={c.target}.{c.subtarget if c.target else None} chain={c.chain_count} pole={c.pole_target}"
        if c.type == "COPY_ROTATION":
            extra = f" target={c.subtarget} mix={c.mix_mode} influence={c.influence}"
        print(f"{bone.name} {c.type}{extra}")
