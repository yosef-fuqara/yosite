"""Phase 2 only: add a six-bone rig and three periodic actions to the existing asset.
Run with Blender 5.2 --background --python. Never writes the original deliverables.
"""
import bpy, math, json, hashlib, sys
from pathlib import Path
from mathutils import Quaternion, Vector

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
SOURCE=HERE/'butterfly.blend'
STATIC=HERE.parents[1]/'public/models/butterfly.glb'
DEST=STATIC.with_name('butterfly-animated.glb')
FPS=120
CLIPS={'IDLE':4.0,'FLY':2.0,'GLIDE':3.0}
WINGS=['Left_Forewing','Left_Hindwing','Right_Forewing','Right_Hindwing']
NAMES=['Body','Head',*WINGS,'Antenna_L','Antenna_R']
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
original_hashes={str(p.name):sha(p) for p in (SOURCE,STATIC)}
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene=bpy.context.scene; scene.render.fps=FPS; scene.render.fps_base=1
objects={name:bpy.data.objects[name] for name in NAMES}

def mesh_signature(obj):
    # Includes every authored coordinate, face, UV and smoothing flag.
    data={'vertices':[list(v.co) for v in obj.data.vertices],
          'faces':[list(p.vertices) for p in obj.data.polygons],
          'smooth':[p.use_smooth for p in obj.data.polygons],
          'uv':[[list(x.uv) for x in layer.data] for layer in obj.data.uv_layers],
          'pivot':list(obj.location),'rotation':list(obj.rotation_euler),'scale':list(obj.scale),
          'materials':[m.name for m in obj.data.materials]}
    return hashlib.sha256(json.dumps(data,separators=(',',':')).encode()).hexdigest()

before={name:mesh_signature(obj) for name,obj in objects.items()}
texture_hashes={im.name:hashlib.sha256(bytes(im.packed_file.data)).hexdigest()
                for im in bpy.data.images if im.packed_file}
parent=bpy.data.objects['Butterfly']
parent['design']='YoSite monochrome swallowtail / six-bone animated asset'
arm_data=bpy.data.armatures.new('Butterfly_Skeleton')
rig=bpy.data.objects.new('Butterfly_Rig',arm_data)
objects['Body'].users_collection[0].objects.link(rig)
rig.parent=parent; rig.show_in_front=True; arm_data.display_type='OCTAHEDRAL'
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
for name in ['Root','Body',*WINGS]:
    bone=arm_data.edit_bones.new(name)
    bone.head=objects[name].location.copy() if name in WINGS else (0,0,0)
    bone.tail=bone.head+Vector((0,.006 if name in WINGS else .005,0))
    bone.roll=0
    if name=='Body':bone.parent=arm_data.edit_bones['Root']
    elif name in WINGS:bone.parent=arm_data.edit_bones['Body']
    bone.use_connect=False
bpy.ops.object.mode_set(mode='OBJECT')
arm_data.bones['Root'].use_deform=False
for bone in rig.pose.bones:bone.rotation_mode='QUATERNION'
rig['rig_version']='YoSite phase 2 / six bones / shape-preserving wing articulation'
rig['clip_policy']='in-place periodic clips; Root is never keyed'
rig['forward_gltf']='-Z';rig['up_gltf']='+Y'

for name,obj in objects.items():
    # Keep existing origins, transforms, UVs and source preparation groups intact.
    target=name if name in WINGS else 'Body'
    group=obj.vertex_groups.new(name=target)
    group.add(list(range(len(obj.data.vertices))),1.0,'REPLACE')
    mod=obj.modifiers.new('Butterfly Armature','ARMATURE');mod.object=rig
    mod.use_vertex_groups=True;mod.use_bone_envelopes=False;mod.use_deform_preserve_volume=False
    # Direct armature parenting is the supported glTF skin hierarchy.
    obj.parent=rig
    obj['skin_bone']=target;obj['original_component']=name
    obj['original_pivot_blender_m']=list(obj.location)

def periodic_pose(clip,u):
    """Periodic, mirror-aware rotations with constrained fore/hind separation."""
    u=u%1.; w=math.tau*u
    if clip=='FLY':
        theta=6*w+.10*math.sin(w)
        phase=theta+.26*(1-math.cos(theta))
        delayed=theta-.035
        hp=delayed+.26*(1-math.cos(delayed))
        fore=14+48*math.cos(phase)+.6*math.sin(w)
        hind=10+47.3*math.cos(hp)+.5*math.sin(w-.12)
        pitch=1.75*math.sin(phase+.42)+.25*math.sin(2*phase)
        roll=.16*math.sin(w)
        bob=.00028*math.sin(phase-.55)
        torsion=.65*math.sin(phase+.65)
        sweep=.28*math.sin(phase-.35)
        asym=.12*math.sin(w)
    elif clip=='IDLE':
        fore=9+6.8*math.cos(w)+.65*math.cos(2*w)
        hind=7.25+6.65*math.cos(w-.055)+.60*math.cos(2*w-.075)
        pitch=.50*math.sin(w-.30);roll=.12*math.sin(w)
        bob=.000075*math.sin(w-.45);torsion=.20*math.sin(w+.4)
        sweep=.12*math.sin(w);asym=.06*math.sin(w)
    else:
        fore=5+1.8*math.sin(w)+.30*math.sin(2*w)
        hind=3.45+1.75*math.sin(w-.07)+.26*math.sin(2*w-.08)
        pitch=.40*math.sin(w-.5);roll=.13*math.sin(w+.25)
        bob=.00005*math.sin(w);torsion=.12*math.sin(w+.4)
        sweep=.08*math.sin(w-.15);asym=.05*math.sin(w)
    q=lambda axis,degrees:Quaternion(axis,math.radians(degrees))
    poses={'Body':((0,0,bob),q((1,0,0),pitch)@q((0,1,0),roll))}
    for name in WINGS:
        sign=-1 if name.startswith('Left') else 1
        isfore='Forewing' in name
        lift=(fore if isfore else hind)+sign*asym
        # Main flap, small stroke-plane pitch and subtle sweep. Mirrored axial rotations.
        # Slightly different stroke planes keep the authored inner wing rims
        # clear of the thorax without distorting their very thin closed shells.
        stroke_sweep=(-3.0 if isfore else 2.7) if clip=='FLY' else 0
        rotation=q((1,0,0),torsion*(1 if isfore else .75))@q((0,1,0),-sign*lift)@q((0,0,1),sign*(stroke_sweep+sweep*(1 if isfore else .8)))
        poses[name]=((0,0,0),rotation)
    return poses

rig.animation_data_create()
actions={}
for clip,duration in CLIPS.items():
    action=bpy.data.actions.new(clip);action.use_fake_user=True
    rig.animation_data.action=action
    action['duration_seconds']=duration;action['loop']=True;action['root_motion']=False
    action['description']={'IDLE':'Slow breathing wing motion, in place','FLY':'Six organic wingbeats, asymmetric stroke timing, body recoil, in place','GLIDE':'Open wings and gentle body stabilization, in place'}[clip]
    frames=round(duration*FPS)
    for frame in range(frames+1):
        for name,(loc,quat) in periodic_pose(clip,frame/frames).items():
            bone=rig.pose.bones[name];bone.location=loc;bone.rotation_quaternion=quat
            bone.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=name)
            if name=='Body':bone.keyframe_insert(data_path='location',frame=frame,group=name)
    bag=action.layers[0].strips[0].channelbag(rig.animation_data.action_slot)
    for fc in bag.fcurves:
        for point in fc.keyframe_points:point.interpolation='BEZIER';point.handle_left_type='AUTO';point.handle_right_type='AUTO'
        # Identical wrap tangents in the editable source as well as the GLB.
        pts=fc.keyframe_points
        value=pts[0].co.y
        slope=(pts[1].co.y-pts[-2].co.y)/2
        for point in (pts[0],pts[-1]):
            point.handle_left_type='FREE';point.handle_right_type='FREE'
            point.handle_left=(point.co.x-1/3,value-slope/3)
            point.handle_right=(point.co.x+1/3,value+slope/3)
        cycles=fc.modifiers.new('CYCLES');cycles.mode_before='REPEAT';cycles.mode_after='REPEAT'
    actions[clip]=action

# Preserve a useful editable initial action without layering three NLA tracks.
rig.animation_data.action=actions['IDLE']
rig.animation_data.action_slot=actions['IDLE'].slots[0]
scene.frame_start=0;scene.frame_end=round(CLIPS['IDLE']*FPS)-1;scene.frame_set(0)
for marker in list(scene.timeline_markers):scene.timeline_markers.remove(marker)
scene.timeline_markers.new('IDLE loop start',frame=0)
scene.timeline_markers.new('IDLE loop endpoint (duplicate start)',frame=scene.frame_end+1)

assert {name:mesh_signature(obj) for name,obj in objects.items()}==before,'Source mesh or transform changed'
assert all(hashlib.sha256(bytes(bpy.data.images[n].packed_file.data)).hexdigest()==h for n,h in texture_hashes.items())
assert len(arm_data.bones)==6 and rig.pose.bones['Root'].matrix_basis.is_identity

bpy.ops.object.select_all(action='DESELECT')
for obj in [parent,rig,*objects.values()]:obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'butterfly-animated.blend'))

# Unique mesh/bone names make Three.js AnimationMixer binding unambiguous.
# Original component names and mesh origins remain intact in the Blender source.
for name,obj in objects.items():obj.name=name+'_Mesh'
bpy.ops.export_scene.gltf(filepath=str(DEST),export_format='GLB',use_selection=True,
    export_yup=True,export_apply=False,export_animations=True,export_skins=True,
    export_morph=False,export_cameras=False,export_lights=False,export_extras=True,
    export_texcoords=True,export_normals=True,export_tangents=True,export_materials='EXPORT',
    export_image_format='AUTO',export_draco_mesh_compression_enable=False,
    export_animation_mode='ACTIONS',export_anim_single_armature=True,
    export_frame_range=False,export_frame_step=1,export_force_sampling=True,
    export_optimize_animation_size=False,export_optimize_animation_keep_anim_armature=False,
    export_rest_position_armature=True,export_anim_slide_to_zero=True,
    export_def_bones=False,export_leaf_bone=False)
for name,obj in objects.items():obj.name=name

from smooth_animation_glb import smooth_glb
smooth_report=smooth_glb(DEST)
assert {p.name:sha(p) for p in (SOURCE,STATIC)}==original_hashes,'Original asset modified'
report={'source_sha256':original_hashes,'mesh_signatures_unchanged':before,
        'packed_texture_sha256_unchanged':texture_hashes,'bones':list(arm_data.bones.keys()),
        'clip_seconds':CLIPS,'source_fps':FPS,'root_motion':False,
        'animated_glb_bytes':DEST.stat().st_size,'loop_interpolation':smooth_report}
(HERE/'rig-validation.json').write_text(json.dumps(report,indent=2))
print('RIG_COMPLETE',json.dumps({'bones':len(arm_data.bones),'clips':CLIPS,'bytes':DEST.stat().st_size}),flush=True)
