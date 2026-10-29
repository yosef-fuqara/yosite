"""Convert sampled periodic transform channels to glTF cubic splines.
Shared first/last tangents guarantee value AND velocity continuity at each loop.
No geometry, material, texture, inverse bind matrix or rest transform is altered.
Identity skinned-mesh nodes are lifted to scene roots for glTF skin conformance.
"""
import json,struct
import numpy as np

def smooth_glb(path):
    raw=path.read_bytes();length=struct.unpack_from('<I',raw,12)[0]
    doc=json.loads(raw[20:20+length]);boff=20+length
    # The skin's joint matrices already provide its world transforms. glTF ignores
    # mesh-node ancestors for skinning, so place identity skin nodes at scene root.
    # This also eliminates NODE_SKINNED_MESH_NON_ROOT validator warnings.
    skinned={i for i,n in enumerate(doc['nodes']) if 'skin' in n}
    for node in doc['nodes']:
        if 'children' in node:node['children']=[i for i in node['children'] if i not in skinned]
        if node.get('children')==[]:node.pop('children')
    for scene in doc['scenes']:
        scene['nodes']=list(dict.fromkeys(scene['nodes']+sorted(skinned)))
    binary=bytearray(raw[boff+8:boff+8+struct.unpack_from('<I',raw,boff)[0]])
    def read(index):
        a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']]
        width={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']]
        offset=v.get('byteOffset',0)+a.get('byteOffset',0)
        return np.frombuffer(binary,dtype='<f4',count=a['count']*width,offset=offset).copy().reshape(-1,width)
    report={}
    for anim in doc['animations']:
        # In-place loops omit Root. The authored hero clips keep Root motion.
        # HERO_ENTRY_H_LAND is a one-shot. PERCHED_IDLE_H loops in place on the letter.
        keep_root=anim['name'] in ('HERO_ENTRY_H_LAND','PERCHED_IDLE_H')
        loop=anim['name']!='HERO_ENTRY_H_LAND'
        channels=[];samplers=[]
        for channel in anim['channels']:
            s=anim['samplers'][channel['sampler']]
            values=read(s['output']);times=read(s['input']).ravel()
            name=doc['nodes'][channel['target']['node']]['name']
            curve=channel['target']['path']
            if name=='Root' and not keep_root:continue
            if curve=='rotation':
                # Keep the quaternion path continuous so cubic tangents cannot spin the long way.
                for i in range(1,len(values)):
                    if float(np.dot(values[i],values[i-1]))<0:values[i]*=-1
                values/=np.linalg.norm(values,axis=1,keepdims=True)
            moving=float(np.max(np.abs(values-values[0])))>1e-8
            # A constant Root rotation is the perched facing. It must survive export.
            if not moving and not (keep_root and name=='Root' and curve=='rotation'):continue
            if len(times)<2:raise AssertionError('Insufficient samples')
            if loop:
                if len(times)<3:raise AssertionError('Insufficient periodic samples')
                if moving:
                    assert np.max(np.abs(values[0]-values[-1]))<2e-4,(anim['name'],name,curve,'loop endpoint mismatch')
                values[-1]=values[0]
            tangents=np.zeros_like(values)
            if moving and len(times)>=3:
                tangents[1:-1]=(values[2:]-values[:-2])/(times[2:]-times[:-2])[:,None]
                if loop:
                    wrap_dt=(times[1]-times[0])+(times[-1]-times[-2])
                    tangents[0]=(values[1]-values[-2])/wrap_dt;tangents[-1]=tangents[0]
                else:
                    tangents[0]=(values[1]-values[0])/(times[1]-times[0])
                    tangents[-1]=(values[-1]-values[-2])/(times[-1]-times[-2])
            if curve=='rotation':
                tangents-=values*np.sum(tangents*values,axis=1,keepdims=True)
                if loop:tangents[-1]=tangents[0]
            output=np.stack([tangents,values,tangents],axis=1).astype('<f4')
            while len(binary)%4:binary.append(0)
            offset=len(binary);payload=output.tobytes();binary.extend(payload)
            view=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(payload)})
            acc=len(doc['accessors']);doc['accessors'].append({'bufferView':view,'componentType':5126,'count':len(values)*3,'type':f'VEC{values.shape[1]}'})
            channel['sampler']=len(samplers);channels.append(channel)
            samplers.append({'input':s['input'],'output':acc,'interpolation':'CUBICSPLINE'})
        anim['channels']=channels;anim['samplers']=samplers
        anim['extras']={'loop':loop,'rootMotion':keep_root,'interpolation':'cubic spline'}
        report[anim['name']]={'channels':len(channels),'interpolation':'CUBICSPLINE','loop':loop,'rootMotion':keep_root}
    # Repack only referenced accessors/views, removing pre-conversion samples.
    used=set()
    for mesh in doc.get('meshes',[]):
        for prim in mesh['primitives']:
            used.update(prim['attributes'].values())
            if 'indices' in prim:used.add(prim['indices'])
    for skin in doc.get('skins',[]):
        if 'inverseBindMatrices' in skin:used.add(skin['inverseBindMatrices'])
    for anim in doc['animations']:
        for s in anim['samplers']:used.update([s['input'],s['output']])
    amap={old:new for new,old in enumerate(sorted(used))}
    accessors=[doc['accessors'][old] for old in sorted(used)]
    for mesh in doc.get('meshes',[]):
        for prim in mesh['primitives']:
            prim['attributes']={k:amap[v] for k,v in prim['attributes'].items()}
            if 'indices' in prim:prim['indices']=amap[prim['indices']]
    for skin in doc.get('skins',[]):
        if 'inverseBindMatrices' in skin:skin['inverseBindMatrices']=amap[skin['inverseBindMatrices']]
    for anim in doc['animations']:
        for s in anim['samplers']:s['input']=amap[s['input']];s['output']=amap[s['output']]
    views=set(a['bufferView'] for a in accessors)
    views.update(im['bufferView'] for im in doc.get('images',[]) if 'bufferView' in im)
    vmap={old:new for new,old in enumerate(sorted(views))};newbin=bytearray();newviews=[]
    for old in sorted(views):
        view=dict(doc['bufferViews'][old]);start=view.get('byteOffset',0)
        while len(newbin)%4:newbin.append(0)
        view['byteOffset']=len(newbin);newbin.extend(binary[start:start+view['byteLength']]);newviews.append(view)
    for a in accessors:a['bufferView']=vmap[a['bufferView']]
    for im in doc.get('images',[]):
        if 'bufferView' in im:im['bufferView']=vmap[im['bufferView']]
    doc['accessors']=accessors;doc['bufferViews']=newviews
    doc['buffers'][0]['byteLength']=len(newbin)
    encoded=json.dumps(doc,separators=(',',':'),ensure_ascii=True).encode()
    encoded+=b' '*((-len(encoded))%4);newbin+=b'\0'*((-len(newbin))%4)
    total=12+8+len(encoded)+8+len(newbin)
    path.write_bytes(struct.pack('<4sII',b'glTF',2,total)+struct.pack('<I4s',len(encoded),b'JSON')+encoded+struct.pack('<I4s',len(newbin),b'BIN\0')+newbin)
    return report
