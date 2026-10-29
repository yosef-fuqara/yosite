"""Independently reopen both blend files and verify authored data preservation."""
import bpy,json,hashlib,struct
from pathlib import Path
HERE=Path(__file__).resolve().parent
PROJECT=HERE.parents[1]
NAMES=['Body','Head','Left_Forewing','Left_Hindwing','Right_Forewing','Right_Hindwing','Antenna_L','Antenna_R']

def fingerprint():
    result={}
    for name in NAMES:
        obj=bpy.data.objects[name];mesh=obj.data
        data={'v':[list(v.co) for v in mesh.vertices],'f':[list(p.vertices) for p in mesh.polygons],
              'uv':[[list(v.uv) for v in layer.data] for layer in mesh.uv_layers],
              'smooth':[p.use_smooth for p in mesh.polygons],
              'location':list(obj.location),'rotation':list(obj.rotation_euler),'scale':list(obj.scale),
              'materials':[m.name for m in mesh.materials]}
        result[name]=hashlib.sha256(json.dumps(data).encode()).hexdigest()
    result['packed_images']={im.name:hashlib.sha256(bytes(im.packed_file.data)).hexdigest() for im in bpy.data.images if im.packed_file}
    return result

bpy.ops.wm.open_mainfile(filepath=str(HERE/'butterfly.blend'))
original=fingerprint()
bpy.ops.wm.open_mainfile(filepath=str(HERE/'butterfly-animated.blend'))
animated=fingerprint()
assert original==animated,'Authored mesh, pivots, UV, material assignment or textures changed'
rig=bpy.data.objects['Butterfly_Rig']
assert set(rig.data.bones.keys())=={'Root','Body','Left_Forewing','Left_Hindwing','Right_Forewing','Right_Hindwing'}
assert len([o for o in bpy.data.objects if o.type=='ARMATURE'])==1
assert set(bpy.data.actions.keys())=={'IDLE','FLY','GLIDE'}
for name in NAMES:
    obj=bpy.data.objects[name]
    assert len(obj.modifiers)==1 and obj.modifiers[0].type=='ARMATURE' and obj.modifiers[0].object==rig
for name in NAMES[2:6]:
    assert (rig.data.bones[name].head_local-bpy.data.objects[name].location).length<1e-9
    assert rig.data.bones[name].parent.name=='Body'
assert rig.data.bones['Body'].parent.name=='Root'
for action in bpy.data.actions:
    curves=action.layers[0].strips[0].channelbag(action.slots[0]).fcurves
    assert not any('Root' in fc.data_path for fc in curves)
    for fc in curves:
        assert abs(fc.keyframe_points[0].co.y-fc.keyframe_points[-1].co.y)<1e-9
        assert all(mod.type=='CYCLES' for mod in fc.modifiers)

def glb(path):
    raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0]
    return json.loads(raw[20:20+n]),raw[28+n:]
a,ab=glb(PROJECT/'public/models/butterfly.glb')
b,bb=glb(PROJECT/'public/models/butterfly-animated.glb')
assert a['materials']==b['materials'] and a['textures']==b['textures']
def images(doc,data):
    result={}
    for im in doc['images']:
        v=doc['bufferViews'][im['bufferView']];start=v.get('byteOffset',0)
        result[im['name']]=hashlib.sha256(data[start:start+v['byteLength']]).hexdigest()
    return result
assert images(a,ab)==images(b,bb),'Exported texture bytes changed'
orig=json.loads((HERE/'rig-validation.json').read_text())['source_sha256']
for name,expected in orig.items():
    path=HERE/name if name.endswith('.blend') else PROJECT/'public/models'/name
    assert hashlib.sha256(path.read_bytes()).hexdigest()==expected,'Original file overwritten'
report={'mesh_geometry_uv_origins_and_material_assignments_unchanged':True,
        'packed_textures_unchanged':True,'exported_materials_and_texture_bytes_identical':True,
        'original_blend_and_glb_hashes_unchanged':True,'bones':list(rig.data.bones.keys()),
        'independent_wing_pivots_match_original':True,'root_channels':0,
        'actions':{ac.name:list(ac.frame_range) for ac in bpy.data.actions},
        'source_mesh_signatures':original}
(HERE/'animated-source-validation.json').write_text(json.dumps(report,indent=2))
print('SOURCE_PRESERVATION_PASS',json.dumps({k:v for k,v in report.items() if k!='source_mesh_signatures'}))
