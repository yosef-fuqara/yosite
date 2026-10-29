"""Independent topology and UV inspection of the saved Blender deliverable."""
import bpy,bmesh,json
from pathlib import Path
HERE=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(HERE/'butterfly.blend'))
report={}
for obj in bpy.data.objects:
    if obj.type!='MESH':continue
    bm=bmesh.new();bm.from_mesh(obj.data)
    faces=[tuple(sorted(v.index for v in f.verts)) for f in bm.faces]
    uv=obj.data.uv_layers.active
    bad_uv=0
    for p in obj.data.polygons:
        coords=[uv.data[i].uv for i in p.loop_indices]
        area=sum(a.x*b.y-b.x*a.y for a,b in zip(coords,coords[1:]+coords[:1]))*.5
        if abs(area)<1e-12:bad_uv+=1
    entry={'duplicate_faces':len(faces)-len(set(faces)),
           'loose_vertices':sum(not v.link_faces for v in bm.verts),
           'non_manifold_edges':sum(not e.is_manifold for e in bm.edges),
           'zero_area_uv_faces':bad_uv,
           'source_quads':sum(len(f.verts)==4 for f in bm.faces),
           'source_triangles':sum(len(f.verts)==3 for f in bm.faces),
           'ngons':sum(len(f.verts)>4 for f in bm.faces)}
    unseen=set(bm.verts);components=0
    while unseen:
        components+=1;stack=[unseen.pop()]
        while stack:
            current=stack.pop()
            for edge in current.link_edges:
                other=edge.other_vert(current)
                if other in unseen:unseen.remove(other);stack.append(other)
    entry['connected_shells']=components
    assert components==1,(obj.name,components)
    if 'wing' in obj.name.lower():
        nt,nr=(64,16) if 'Forewing' in obj.name else (56,15)
        count=nt*nr
        entry['dorsal_inverted_faces']=sum(p.normal.z<=0 for p in list(obj.data.polygons)[:count])
        entry['ventral_inverted_faces']=sum(p.normal.z>=0 for p in list(obj.data.polygons)[count:2*count])
        assert entry['dorsal_inverted_faces']==0 and entry['ventral_inverted_faces']==0,entry
    for k in ['duplicate_faces','loose_vertices','non_manifold_edges','ngons','zero_area_uv_faces']:assert entry[k]==0,(obj.name,k,entry)
    report[obj.name]=entry;bm.free()
assert not bpy.data.actions and not any(o.type=='ARMATURE' for o in bpy.data.objects)
(HERE/'topology-validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
