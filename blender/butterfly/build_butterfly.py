"""YoSite monochrome swallowtail. Run Blender --background --python this_file.
Editable quad-dominant source, closed thin wing shells, eight named mesh parts.
No rig, animation, modifiers, procedural-only materials or external asset inputs.
"""
import sys, math, json
from pathlib import Path
import bpy, bmesh
from mathutils import Vector
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
from anatomy import point, height, uv
ROOT=HERE.parents[1]
TEX=HERE/'textures'
PREVIEW=HERE/'previews'

bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.materials,bpy.data.images,bpy.data.meshes,bpy.data.curves,bpy.data.cameras,bpy.data.lights):
    for block in list(datablocks):
        if block.users==0: datablocks.remove(block)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'; scene.unit_settings.length_unit='MILLIMETERS'
scene.unit_settings.scale_length=1
asset=bpy.data.collections.new('Butterfly_Asset'); scene.collection.children.link(asset)
studio=bpy.data.collections.new('Studio_Not_Exported'); scene.collection.children.link(studio)
parent=bpy.data.objects.new('Butterfly',None); asset.objects.link(parent)
parent['forward_blender']='+Y'; parent['forward_gltf']='-Z'
parent['up_blender']='+Z'; parent['up_gltf']='+Y'
parent['units']='metres'; parent['design']='YoSite monochrome swallowtail / unrigged'

def image_node(mat,filename,x,y,noncolor=False):
    im=bpy.data.images.load(str(TEX/filename),check_existing=True)
    if noncolor: im.colorspace_settings.name='Non-Color'
    im.pack()
    node=mat.node_tree.nodes.new('ShaderNodeTexImage'); node.image=im
    node.location=(x,y); node.label=filename
    return node

wingmat=bpy.data.materials.new('Wing • charcoal silk / warm ivory scales'); wingmat.use_nodes=True
p=wingmat.node_tree.nodes.get('Principled BSDF'); p.location=(200,120)
p.inputs['Metallic'].default_value=0; p.inputs['IOR'].default_value=1.45
p.inputs['Roughness'].default_value=.68
p.inputs['Coat Weight'].default_value=0
# glTF carries sheen color, not the separate Blender sheen-weight control.
# Keep weight one and encode the subtle amount in tint for faithful interchange.
p.inputs['Sheen Weight'].default_value=1
p.inputs['Sheen Tint'].default_value=(.034,.028,.022,1)
p.inputs['Sheen Roughness'].default_value=.82
col=image_node(wingmat,'wing_basecolor.png',-650,500)
wingmat.node_tree.links.new(col.outputs['Color'],p.inputs['Base Color'])
orm=image_node(wingmat,'wing_orm.png',-650,180,True)
sep=wingmat.node_tree.nodes.new('ShaderNodeSeparateColor'); sep.location=(-370,180)
wingmat.node_tree.links.new(orm.outputs['Color'],sep.inputs['Color'])
wingmat.node_tree.links.new(sep.outputs['Green'],p.inputs['Roughness'])
wingmat.node_tree.links.new(sep.outputs['Blue'],p.inputs['Metallic'])
normal=image_node(wingmat,'wing_normal.png',-650,-150,True)
nm=wingmat.node_tree.nodes.new('ShaderNodeNormalMap'); nm.location=(-350,-140)
nm.inputs['Strength'].default_value=.6
wingmat.node_tree.links.new(normal.outputs['Color'],nm.inputs['Color'])
wingmat.node_tree.links.new(nm.outputs['Normal'],p.inputs['Normal'])
trans=image_node(wingmat,'wing_transmission.png',-650,-470,True)
wingmat.node_tree.links.new(trans.outputs['Color'],p.inputs['Transmission Weight'])
wingmat.diffuse_color=(.08,.08,.08,1)
# A closed membrane is used. Each visible side has its own UV island and normals.
wingmat.use_backface_culling=True

bodymat=bpy.data.materials.new('Body • satin black chitin'); bodymat.use_nodes=True
bp=bodymat.node_tree.nodes.get('Principled BSDF')
bp.inputs['Base Color'].default_value=(.012,.012,.012,1)
bp.inputs['Roughness'].default_value=.52; bp.inputs['IOR'].default_value=1.46
bn=image_node(bodymat,'body_normal.png',-560,-50,True)
bnn=bodymat.node_tree.nodes.new('ShaderNodeNormalMap'); bnn.inputs['Strength'].default_value=.35
bodymat.node_tree.links.new(bn.outputs['Color'],bnn.inputs['Color'])
bodymat.node_tree.links.new(bnn.outputs['Normal'],bp.inputs['Normal'])
bodymat.diffuse_color=(.012,.012,.012,1)
bodymat.use_backface_culling=True

def mesh_obj(name,verts,faces,uvs,material,location=(0,0,0)):
    mesh=bpy.data.meshes.new(name+'_Topology'); mesh.from_pydata(verts,[],faces); mesh.update()
    obj=bpy.data.objects.new(name,mesh); asset.objects.link(obj); obj.parent=parent
    obj.location=location; mesh.materials.append(material)
    layer=mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        poly.use_smooth=True
        for li in poly.loop_indices: layer.data[li].uv=uvs[mesh.loops[li].vertex_index]
    bm=bmesh.new(); bm.from_mesh(mesh); bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(mesh); bm.free()
    return obj

def wing(name,kind,sign):
    nt=64 if kind=='fore' else 56; nr=16 if kind=='fore' else 15
    verts=[]; uvs=[]; faces=[]
    for under in (False,True):
        off=len(verts)
        verts.append((0,0,(-1 if under else 1)*.000055)); uvs.append(uv(kind,0,0,under))
        for j in range(1,nr+1):
            # Closely spaced root rings give useful hinge deformation topology.
            r=(j/nr)**1.16
            for k in range(nt+1):
                t=k/nt; x,y=point(kind,t,r); z=height(kind,t,r)
                # A tiny difference in camber is the only left/right asymmetry.
                z+=sign*.028*r*r*math.sin(t*11)
                thickness=.045+.065*(1-r)**3
                z+=(-1 if under else 1)*thickness*.5
                verts.append((sign*x*.001,y*.001,z*.001)); uvs.append(uv(kind,x,y,under))
        for k in range(nt): faces.append((off,off+1+k,off+2+k))
        for j in range(nr-1):
            a=off+1+j*(nt+1); b=a+nt+1
            for k in range(nt): faces.append((a+k,b+k,b+k+1,a+k+1))
    count=1+nr*(nt+1)
    boundary=[0]+[1+j*(nt+1) for j in range(nr)]
    boundary += [1+(nr-1)*(nt+1)+k for k in range(1,nt+1)]
    boundary += [1+j*(nt+1)+nt for j in range(nr-2,-1,-1)]
    for a,b in zip(boundary,boundary[1:]+boundary[:1]): faces.append((a,b,b+count,a+count))
    loc=(sign*.0016,.0024 if kind=='fore' else -.0014,.00105 if kind=='fore' else -.0001)
    obj=mesh_obj(name,verts,faces,uvs,wingmat,loc)
    # Give the real membrane rim its own dark, non-degenerate UV strip.
    # Bridging dorsal and ventral atlas rows would sample unrelated markings.
    layer=obj.data.uv_layers.active
    rim_faces=list(obj.data.polygons)[2*nt*nr:]
    for i,face in enumerate(rim_faces):
        u0=.02+.96*i/len(rim_faces); u1=.02+.96*(i+1)/len(rim_faces)
        for li,coord in zip(face.loop_indices,[(u0,.003),(u1,.003),(u1,.010),(u0,.010)]):
            layer.data[li].uv=coord
    obj['anatomy']='forewing' if kind=='fore' else 'hindwing'
    obj['hinge_axis_local']='Y in Blender / -Z after glTF Y-up conversion'
    obj['root_pivot']='origin at thoracic articulation; rotations zero, scale one'
    obj['membrane_thickness_mm']='0.045 distal, 0.110 root'
    # Vertex groups are deformation preparation only, not a rig.
    root=obj.vertex_groups.new(name='WingRoot'); flex=obj.vertex_groups.new(name='WingFlex')
    for v in obj.data.vertices:
        dist=math.hypot(v.co.x,v.co.y)/.012
        root.add([v.index],max(.0,1-dist),'REPLACE')
        flex.add([v.index],min(1.,dist),'REPLACE')
    return obj

parts=[]
for sign,label in [(-1,'Left'),(1,'Right')]:
    parts.append(wing(label+'_Forewing','fore',sign))
    parts.append(wing(label+'_Hindwing','hind',sign))

def append_tube(verts,faces,uvs,points,radii,sides=8):
    start=len(verts)
    for i,pt in enumerate(points):
        p=Vector(pt)
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        tangent.normalize(); ref=Vector((0,0,1))
        if abs(tangent.dot(ref))>.9: ref=Vector((1,0,0))
        a=tangent.cross(ref).normalized(); b=tangent.cross(a).normalized()
        for k in range(sides):
            angle=k/sides*math.tau
            verts.append(tuple(p+radii[i]*(math.cos(angle)*a+math.sin(angle)*b)))
            uvs.append((k/sides,i/(len(points)-1)))
    for j in range(len(points)-1):
        for k in range(sides):
            a=start+j*sides+k; b=start+j*sides+(k+1)%sides
            faces.append((a,b,b+sides,a+sides))
    # Single pole cap avoids n-gons in these small end surfaces.
    for i,reverse in [(0,True),(len(points)-1,False)]:
        pole=len(verts); verts.append(tuple(points[i])); uvs.append((.5,i/(len(points)-1)))
        ring=start+i*sides
        for k in range(sides):
            f=(pole,ring+k,ring+(k+1)%sides)
            faces.append(f[::-1] if reverse else f)

def bezier(p0,p1,p2,p3,t):
    return tuple((1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d for a,b,c,d in zip(p0,p1,p2,p3))

# One continuous thorax/abdomen surface; abdomen segmentation is geometry.
verts=[]; faces=[]; uvs=[]
stations=76; sides=28
for j in range(stations):
    t=j/(stations-1); y=-.024+.032*t
    if y<-.005:
        a=(y+.024)/.019
        rad=.00025+.00154*math.sin(math.pi*a*.84)**.68
        # Seven sutures; shallow waists, not a stack of disconnected beads.
        groove=math.exp(-(math.sin(a*math.pi*7)/.20)**2)
        rad*=1-.13*groove
        rz=rad*.82; z=-.00035-.00065*(1-a)**2
    else:
        a=(y+.005)/.013
        rad=.00125+.00123*max(0,math.sin(math.pi*a))**.75
        rz=rad*.88; z=0
    for k in range(sides):
        ang=k/sides*math.tau
        micro=1+.012*math.cos(ang*6)*math.sin(math.pi*t)
        verts.append((rad*math.cos(ang)*micro,y,z+rz*math.sin(ang)*micro))
        uvs.append((k/sides,t))
for j in range(stations-1):
    for k in range(sides):
        a=j*sides+k; b=j*sides+(k+1)%sides
        faces.append((a,b,b+sides,a+sides))
for j in (0,stations-1):
    idx=len(verts); ring=verts[j*sides:(j+1)*sides]
    verts.append(tuple(sum(p[k] for p in ring)/sides for k in range(3))); uvs.append((.5,j/(stations-1)))
    for k in range(sides): faces.append((idx,j*sides+k,j*sides+(k+1)%sides))

body=mesh_obj('Body',verts,faces,uvs,bodymat)

def union_shell(target,shell):
    bpy.context.view_layer.update()
    bpy.context.view_layer.objects.active=target
    mod=target.modifiers.new('Clean anatomical junction','BOOLEAN')
    mod.operation='UNION'; mod.solver='EXACT'; mod.object=shell
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(shell,do_unlink=True)
    bm=bmesh.new();bm.from_mesh(target.data)
    bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4])
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(target.data);bm.free()

# Six understated jointed legs tucked beneath the body. Each has femur/tibia/tarsus.
for sign in (-1,1):
    for i,yroot in enumerate([.004,.0005,-.003]):
        verts=[]; faces=[]; uvs=[]
        anchor=(sign*.0014,yroot,-.001)
        knee=(sign*(.0052+i*.0004),yroot+.0015-i*.001,-.0037)
        ankle=(sign*(.0045+i*.0008),yroot-.0035-i*.0015,-.0062)
        tip=(sign*(.0067+i*.0006),yroot-.0058-i*.0015,-.0065)
        pts=[]; rads=[]
        for seg,(a,b) in enumerate(zip([anchor,knee,ankle],[knee,ankle,tip])):
            for k in range(5):
                t=k/5; pts.append(tuple(v*(1-t)+w*t for v,w in zip(a,b)))
                rads.append((.00018*(1-(seg+t)/3)+.000045)*(1+.2*math.exp(-t*15)))
        pts.append(tip); rads.append(.000025)
        append_tube(verts,faces,uvs,pts,rads,7)
        leg=mesh_obj('Temporary_leg',verts,faces,uvs,bodymat)
        union_shell(body,leg)
body['anatomy']='continuous thorax and seven-segment abdomen; six legs with welded junctions'
parts.append(body)

# Head with integrated compound-eye lobes, avoiding intersecting eyeball spheres.
verts=[]; faces=[]; uvs=[]; nlat=20; nlon=32
verts.append((0,.002,0)); uvs.append((.5,0))
for j in range(1,nlat):
    phi=math.pi*j/nlat
    for k in range(nlon):
        theta=math.tau*k/nlon
        x=math.sin(phi)*math.cos(theta)
        y=math.cos(phi); z=math.sin(phi)*math.sin(theta)
        eye=1+.19*max(0,abs(x)-.45)**1.4
        verts.append((x*.00175*eye,y*.0019,z*.00145))
        uvs.append((k/nlon,j/nlat))
last=len(verts); verts.append((0,-.0019,0)); uvs.append((.5,1))
for k in range(nlon): faces.append((0,1+k,1+(k+1)%nlon))
for j in range(nlat-2):
    for k in range(nlon):
        a=1+j*nlon+k; b=1+j*nlon+(k+1)%nlon
        faces.append((a,b,b+nlon,a+nlon))
for k in range(nlon): faces.append((last,1+(nlat-2)*nlon+k,1+(nlat-2)*nlon+(k+1)%nlon))
head=mesh_obj('Head',verts,faces,uvs,bodymat,(0,.0086,.0002))
parts.append(head)

for sign,label in [(-1,'L'),(1,'R')]:
    verts=[]; faces=[]; uvs=[]; pts=[]; radii=[]
    for j in range(45):
        t=j/44
        pt=bezier((0,0,0),(sign*.001,.010,.0025),(sign*.008,.016,.0038),(sign*.009,.022,.003),t)
        pts.append(pt)
        # Naturally clubbed tip, continuous with the slender antenna.
        radius=.000115*(1-.35*t)+.00018*math.exp(-((t-.943)/.072)**2)
        if j==44: radius=.000045
        radii.append(radius)
    append_tube(verts,faces,uvs,pts,radii,8)
    ant=mesh_obj('Antenna_'+label,verts,faces,uvs,bodymat,(sign*.00085,.0098,.0009))
    parts.append(ant)

# Fix cylindrical UV wrap per face without splitting editable source vertices.
for obj in (body,head,*[p for p in parts if p.name.startswith('Antenna')]):
    layer=obj.data.uv_layers.active
    for face in obj.data.polygons:
        us=[layer.data[i].uv.x for i in face.loop_indices]
        if max(us)-min(us)>.5:
            for i in face.loop_indices:
                if layer.data[i].uv.x<.5: layer.data[i].uv.x+=1
        coords=[layer.data[i].uv.copy() for i in face.loop_indices]
        area=sum(a.x*b.y-b.x*a.y for a,b in zip(coords,coords[1:]+coords[:1]))*.5
        if abs(area)<1e-12:
            # Small planar caps use a compact repeating chitin-texture island.
            for j,i in enumerate(face.loop_indices):
                a=math.tau*j/len(face.loop_indices)
                layer.data[i].uv=(.5+.04*math.cos(a),.5+.04*math.sin(a))

# Asset integrity report is made from final, editable meshes.
report={'asset':'YoSite butterfly','blender_version':bpy.app.version_string,'parts':{},'triangles':0,'materials':2,'textures_max':2048,'rigged':False,'animated':False}
for obj in parts:
    obj.data.calc_loop_triangles()
    bm=bmesh.new(); bm.from_mesh(obj.data)
    entry={'triangles':len(obj.data.loop_triangles),'vertices':len(obj.data.vertices),
           'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),
           'degenerate_faces':sum(f.calc_area()<1e-15 for f in bm.faces),
           'signed_volume_m3':bm.calc_volume(signed=True),
           'pivot_blender_m':list(obj.location),'scale':list(obj.scale),'rotation':list(obj.rotation_euler)}
    assert entry['non_manifold_edges']==0,(obj.name,entry)
    assert entry['degenerate_faces']==0,(obj.name,entry)
    assert entry['signed_volume_m3']>0,(obj.name,entry)
    report['parts'][obj.name]=entry; report['triangles']+=entry['triangles']; bm.free()
assert 10000<=report['triangles']<=25000,report['triangles']

# Neutral soft-light product studio, kept outside the export selection.
def area(name,loc,power,size):
    data=bpy.data.lights.new(name,'AREA'); data.energy=power; data.shape='DISK'; data.size=size
    obj=bpy.data.objects.new(name,data); studio.objects.link(obj); obj.location=loc
    obj.rotation_euler=(-obj.location).to_track_quat('-Z','Y').to_euler(); return obj
area('Key • softbox',(-.065,.08,.14),.13,.12)
area('Fill • softbox',(.08,.035,.07),.038,.10)
area('Rim • white silk',(.025,-.09,.045),.082,.07)
area('Ventral • bounce',(-.03,.015,-.1),.046,.12)
world=bpy.data.worlds.new('Neutral Studio'); scene.world=world; world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.22,.22,.22,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.35
camdata=bpy.data.cameras.new('Inspection Camera'); cam=bpy.data.objects.new('Inspection Camera',camdata)
studio.objects.link(cam); scene.camera=cam
camdata.type='ORTHO'; camdata.ortho_scale=.132; camdata.clip_start=.001; camdata.clip_end=10
scene.render.engine='CYCLES'; scene.cycles.samples=40
scene.cycles.use_denoising=True
scene.render.resolution_x=1400; scene.render.resolution_y=1200; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGBA'
scene.render.film_transparent=True
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.render.image_settings.color_depth='8'

def view(loc,target=(0,0,0)):
    cam.location=loc; cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()

view((.035,-.10,.175))
bpy.ops.object.select_all(action='DESELECT')
for obj in [parent]+parts: obj.select_set(True)
bpy.context.view_layer.objects.active=body
# Store a useful initial material-preview view in the editable source.
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':
            a.spaces.active.clip_start=.0001
            a.spaces.active.region_3d.view_distance=.17
            a.spaces.active.region_3d.view_location=(0,0,0)
            a.spaces.active.region_3d.view_rotation=cam.rotation_euler.to_quaternion()
            a.spaces.active.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'butterfly.blend'))
glb=ROOT/'public'/'models'/'butterfly.glb'
bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True,
    export_yup=True,export_apply=False,export_animations=False,export_skins=False,
    export_morph=False,export_cameras=False,export_lights=False,export_extras=True,
    export_texcoords=True,export_normals=True,export_tangents=True,export_materials='EXPORT',
    export_image_format='AUTO',export_draco_mesh_compression_enable=False)
report['glb_bytes']=glb.stat().st_size
(HERE/'validation.json').write_text(json.dumps(report,indent=2))
print('ASSET_COMPLETE',json.dumps({'triangles':report['triangles'],'glb_bytes':report['glb_bytes']}),flush=True)
views={'three-quarter':(.035,-.10,.175),'top':(0,0,.2),'front':(0,.19,.022),
       'side':(.2,0,.012),'underside':(0,0,-.2)}
if '--skip-renders' not in sys.argv:
    for label,loc in views.items():
        view(loc); scene.render.filepath=str(PREVIEW/(label+'.png'))
        bpy.ops.render.render(write_still=True)
        print('RENDER_DONE',label,flush=True)
print('BUTTERFLY_DONE',flush=True)
