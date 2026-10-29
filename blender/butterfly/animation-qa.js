import {MeshBVH} from '/node_modules/three-mesh-bvh/src/index.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export function createAnimationQA({THREE,gltf,mixer,meshes,setPose,scene}){
  const bones=new Map();for(const mesh of meshes)for(const bone of mesh.skeleton.bones)bones.set(bone.name,bone);
  const byName=new Map(meshes.map(m=>[m.userData.original_component,m]));
  const wings=['Left_Forewing','Left_Hindwing','Right_Forewing','Right_Hindwing'];
  const vec=new THREE.Vector3();const identity=new THREE.Matrix4();
  const matrix=m=>{const n=m.userData.skin_bone;const i=m.skeleton.bones.findIndex(b=>b.name===n);return m.matrixWorld.clone().multiply(m.bindMatrixInverse).multiply(m.skeleton.bones[i].matrixWorld).multiply(m.skeleton.boneInverses[i]).multiply(m.bindMatrix)};
  function snapshot(){scene.updateMatrixWorld(true);return Object.fromEntries([...bones].map(([name,b])=>[name,{position:b.position.toArray(),quaternion:b.quaternion.toArray(),world:b.getWorldPosition(new THREE.Vector3()).toArray()}]))}
  async function runChecks(){
    const report={clips:gltf.animations.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length})),bones:[...bones.keys()],meshCount:meshes.length,triangles:meshes.reduce((s,m)=>s+m.geometry.index.count/3,0),maxInfluences:0,maxWeightSumError:0,minTriangleAreaRatio:1,minNormalAlignment:1,restMaxVertexDeltaMeters:0,materialMismatch:[],loops:{},collisions:[],rootMaxDistanceMeters:0,maxPivotErrorMeters:0,maxBoneScaleError:0};
    if(bones.size!==6||meshes.length!==8)throw Error('Unexpected rig size');
    for(const m of meshes){const w=m.geometry.attributes.skinWeight;for(let i=0;i<w.count;i++){const weights=[w.getX(i),w.getY(i),w.getZ(i),w.getW(i)];report.maxInfluences=Math.max(report.maxInfluences,weights.filter(x=>x>0).length);report.maxWeightSumError=Math.max(report.maxWeightSumError,Math.abs(weights.reduce((a,b)=>a+b,0)-1))}}
    if(report.maxInfluences>2||report.maxWeightSumError>1e-6)throw Error('Unexpected skin weights');
    mixer.stopAllAction();for(const m of meshes)m.skeleton.pose();scene.updateMatrixWorld(true);
    const rest=new Map([...bones].map(([n,b])=>[n,b.matrixWorld.clone()]));
    const localPivots=new Map(wings.map(n=>[n,bones.get(n).getWorldPosition(new THREE.Vector3()).applyMatrix4(matrix(byName.get(n)).invert())]));
    const original=await new GLTFLoader().loadAsync('/public/models/butterfly.glb');original.scene.updateMatrixWorld(true);
    for(const [name,m] of byName){
      const old=original.scene.getObjectByName(name);const p=m.geometry.attributes.position;
      if(p.count!==old.geometry.attributes.position.count)throw Error('Vertex count changed '+name);
      for(let i=0;i<p.count;i++){
        const a=m.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(m.matrixWorld);
        const b=old.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(old.matrixWorld);
        report.restMaxVertexDeltaMeters=Math.max(report.restMaxVertexDeltaMeters,a.distanceTo(b));
      }
      for(const key of ['roughness','metalness','ior','sheen','sheenRoughness','transmission','side'])if(m.material[key]!==old.material[key])report.materialMismatch.push(name+':'+key);
      for(const key of ['color','sheenColor','normalScale'])if(m.material[key]&&m.material[key].distanceTo?.(old.material[key])>1e-8)report.materialMismatch.push(name+':'+key);
      for(const key of ['map','normalMap','roughnessMap','transmissionMap']){
        const a=m.material[key],b=old.material[key];if(Boolean(a)!==Boolean(b)||a&&(a.image.width!==b.image.width||a.image.height!==b.image.height||a.colorSpace!==b.colorSpace))report.materialMismatch.push(name+':'+key);
      }
    }
    if(report.restMaxVertexDeltaMeters>2e-7||report.materialMismatch.length)throw Error('Bind pose or material changed '+JSON.stringify(report));
    const bvh=new Map([...byName].map(([n,m])=>[n,new MeshBVH(m.geometry.clone(),{maxLeafTris:6})]));
    const va=new THREE.Vector3(),vb=new THREE.Vector3(),vc=new THREE.Vector3();
    function updateColliders(){for(const [n,tree]of bvh){const m=byName.get(n),p=tree.geometry.attributes.position;for(let i=0;i<p.count;i++){m.getVertexPosition(i,vec).applyMatrix4(m.matrixWorld);if(!Number.isFinite(vec.x+vec.y+vec.z))throw Error('Non-finite skinned vertex');p.setXYZ(i,vec.x,vec.y,vec.z)}tree.refit()}}
    updateColliders();
    const restAreas=new Map(),restNormals=new Map(),triangleWeights=new Map();
    for(const [n,tree]of bvh){
      const g=tree.geometry,p=g.attributes.position,ix=g.index,areas=[],normals=[],weights=[];
      const m=byName.get(n),wingIndex=m.skeleton.bones.findIndex(b=>b.name===n);
      for(let k=0;k<ix.count;k+=3){
        va.fromBufferAttribute(p,ix.getX(k));vb.fromBufferAttribute(p,ix.getX(k+1));vc.fromBufferAttribute(p,ix.getX(k+2));
        const cross=vb.sub(va).cross(vc.sub(va));areas.push(cross.length());normals.push(cross.clone().normalize());
        let w=0;for(let j=0;j<3;j++)for(let c=0;c<4;c++)if(g.attributes.skinIndex.getComponent(ix.getX(k+j),c)===wingIndex)w+=g.attributes.skinWeight.getComponent(ix.getX(k+j),c)/3;
        weights.push(w);
      }restAreas.set(n,areas);restNormals.set(n,normals);triangleWeights.set(n,weights);
    }
    // The supplied wing roots already penetrate the thorax at their anatomical
    // attachment. Measure that existing contact region in the unchanged bind pose;
    // do not mistake it for a new collision introduced by animation.
    const attachmentZones=new Map();report.attachmentOverlapBaselineMeters={};
    for(const name of wings){
      const line=new THREE.Line3();
      const pivot=bones.get(name).getWorldPosition(new THREE.Vector3());let maxRadius=0;
      bvh.get(name).bvhcast(bvh.get('Body'),identity,{intersectsTriangles:(a,b)=>{
        if(a.intersectsTriangle(b,line,true))for(const p of [line.start,line.end])maxRadius=Math.max(maxRadius,p.distanceTo(pivot));
        return false;
      }});
      report.attachmentOverlapBaselineMeters[name]=maxRadius;
      attachmentZones.set(name,maxRadius+.0001);
    }
    function intersects(a,b,allowRoot=false){
      const line=new THREE.Line3();let found=null;
      bvh.get(a).bvhcast(bvh.get(b),identity,{intersectsTriangles:(ta,tb)=>{
        if(!ta.intersectsTriangle(tb,line,true))return false;
        const world=line.getCenter(new THREE.Vector3());
        if(allowRoot){const pivot=bones.get(a).getWorldPosition(new THREE.Vector3());if(world.distanceTo(pivot)<attachmentZones.get(a))return false}
        found=world.toArray();return true;
      }});return found;
    }
    for(const clip of gltf.animations){
      setPose(clip.name,0);const start=snapshot();setPose(clip.name,clip.duration);const end=snapshot();
      let positionGap=0,rotationGap=0;
      for(const name of bones.keys()){
        positionGap=Math.max(positionGap,new THREE.Vector3(...start[name].world).distanceTo(new THREE.Vector3(...end[name].world)));
        rotationGap=Math.max(rotationGap,new THREE.Quaternion(...start[name].quaternion).normalize().angleTo(new THREE.Quaternion(...end[name].quaternion).normalize()));
      }
      let tangentGap=0;
      for(const track of clip.tracks){
        const width=track.getValueSize()/3,values=track.values;
        for(let i=0;i<width;i++)tangentGap=Math.max(tangentGap,Math.abs(values[i]-values[values.length-3*width+i]));
      }
      // Real AnimationMixer wrap after 100 complete periods plus a fractional phase.
      setPose(clip.name,clip.duration*.371);const reference=snapshot();
      mixer.stopAllAction();const a=mixer.clipAction(clip);a.reset().setLoop(THREE.LoopRepeat,Infinity).play();mixer.update(clip.duration*100.371);scene.updateMatrixWorld(true);
      const repeated=snapshot();let repeatedGap=0;
      for(const n of bones.keys())repeatedGap=Math.max(repeatedGap,new THREE.Vector3(...reference[n].world).distanceTo(new THREE.Vector3(...repeated[n].world)));
      report.loops[clip.name]={endpointPositionGapMeters:positionGap,endpointAngleGapRadians:rotationGap,endpointTangentGap:tangentGap,repeated100LoopsGapMeters:repeatedGap};
      const steps=clip.name==='FLY'?Math.ceil(clip.duration*480):Math.ceil(clip.duration*60);
      for(let i=0;i<=steps;i++){
        const time=clip.duration*i/steps;setPose(clip.name,time);
        report.rootMaxDistanceMeters=Math.max(report.rootMaxDistanceMeters,bones.get('Root').getWorldPosition(vec).length());
        for(const name of wings){
          const transform=matrix(byName.get(name));const actual=localPivots.get(name).clone().applyMatrix4(transform);
          const expected=bones.get(name).getWorldPosition(new THREE.Vector3());report.maxPivotErrorMeters=Math.max(report.maxPivotErrorMeters,actual.distanceTo(expected));
          const scale=new THREE.Vector3().setFromMatrixScale(transform);report.maxBoneScaleError=Math.max(report.maxBoneScaleError,Math.abs(scale.x-1),Math.abs(scale.y-1),Math.abs(scale.z-1));
        }
        updateColliders();
        const bodyNormal=new THREE.Matrix3().setFromMatrix4(bones.get('Body').matrixWorld.clone().multiply(rest.get('Body').clone().invert()));
        for(const n of wings){
          const g=bvh.get(n).geometry,p=g.attributes.position,ix=g.index,areas=restAreas.get(n),normals=restNormals.get(n),weights=triangleWeights.get(n);
          const wingNormal=new THREE.Matrix3().setFromMatrix4(bones.get(n).matrixWorld.clone().multiply(rest.get(n).clone().invert()));
          const expected=new THREE.Vector3(),bodyN=new THREE.Vector3();
          for(let k=0;k<ix.count;k+=3){
            va.fromBufferAttribute(p,ix.getX(k));vb.fromBufferAttribute(p,ix.getX(k+1));vc.fromBufferAttribute(p,ix.getX(k+2));const cross=vb.sub(va).cross(vc.sub(va));
            report.minTriangleAreaRatio=Math.min(report.minTriangleAreaRatio,cross.length()/areas[k/3]);
            expected.copy(normals[k/3]).applyMatrix3(wingNormal).multiplyScalar(weights[k/3]);bodyN.copy(normals[k/3]).applyMatrix3(bodyNormal).multiplyScalar(1-weights[k/3]);expected.add(bodyN).normalize();
            const alignment=cross.normalize().dot(expected);
            if(alignment<report.minNormalAlignment){report.minNormalAlignment=alignment;report.normalDiagnostic={clip:clip.name,time,wing:n,triangle:k/3,weight:weights[k/3],restArea:areas[k/3],restNormal:normals[k/3].toArray(),actual:cross.toArray(),expected:expected.toArray(),vertices:[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,ix.getX(k+j)).toArray())}}
          }
        }
        for(let j=0;j<wings.length;j++)for(let k=j+1;k<wings.length;k++){
          const point=intersects(wings[j],wings[k]);if(point&&report.collisions.length<30)report.collisions.push({clip:clip.name,time,pair:[wings[j],wings[k]],point});
        }
        for(const name of wings){const point=intersects(name,'Body',true);if(point&&report.collisions.length<30)report.collisions.push({clip:clip.name,time,pair:[name,'Body'],point})}
        for(const name of wings)for(const other of ['Head','Antenna_L','Antenna_R']){const point=intersects(name,other);if(point&&report.collisions.length<30)report.collisions.push({clip:clip.name,time,pair:[name,other],point})}
      }
      report.loops[clip.name].collisionSampleCount=steps+1;
    }
    setPose('FLY',0);
    return report;
  }
  return {runChecks,snapshot};
}
