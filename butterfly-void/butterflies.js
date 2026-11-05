import * as THREE from '../third_party/three/three.module.js';
import { SPECIES, traceWing } from './shapes.js';
import { PALETTE, CAMERA_Z } from './simulation.mjs';
export { SPECIES };
const silhouetteHeights = [1.33,1.41,1.06];

export const vertexShader = /* glsl */`
attribute float aWing;
attribute float aPart;
attribute vec3 iPosition;
attribute vec2 iPose;
attribute vec4 iWing;
attribute float iSize;
attribute vec3 iColor;
uniform float uTime;
uniform float uActivity;
varying vec3 vColor;
varying vec2 vLocal;
varying float vShade;
varying float vPart;
void main() {
  vec3 p = position;
  float angle = 0.0;
  if(abs(aWing)>.5) {
    float hind = step(.5,aPart);
    float phase = uTime*iWing.y*(.35+.65*uActivity)+iWing.x-hind*.43;
    float stroke = sin(phase);
    // A resting dihedral, cambered membrane and staggered hindwing remain
    // three-dimensional even when the body is viewed exactly in profile.
    angle = aWing*(.28+hind*.04+(stroke*.5+.5)*.72*iWing.z);
    // Rotate about the actual fore/hind hinge plane, keeping the wing root
    // attached to the thorax throughout the stroke.
    float hingeZ=mix(.012,-.012,hind);
    p.z-=hingeZ;
    p.z += -.09*(p.x*p.x)/(.83*.83)*(1.0-hind*.25);
    float sweep = aWing*hind*(-.055-.020*(stroke*.5+.5));
    float cs=cos(sweep),ss=sin(sweep);
    p.xy = mat2(cs,ss,-ss,cs)*p.xy;
    p=vec3(cos(angle)*p.x+sin(angle)*p.z,p.y,-sin(angle)*p.x+cos(angle)*p.z);
    p.z+=hingeZ;
  }
  vShade=.90+.10*cos(angle);
  vLocal=vec2(abs(position.x),position.y);
  vColor=iColor;vPart=aPart;
  float cy=cos(iPose.y),sy=sin(iPose.y);
  p=vec3(cy*p.x+sy*p.z,p.y,-sy*p.x+cy*p.z);
  float ch=cos(iPose.x),sh=sin(iPose.x);
  p.xy=mat2(ch,sh,-sh,ch)*p.xy;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p*iSize+iPosition,1.0);
}`;

export const fragmentShader = /* glsl */`
uniform float uWhite;
varying vec3 vColor;
varying vec2 vLocal;
varying float vShade;
varying float vPart;
void main() {
  // Broad pigment wash, deliberately without veins, spots or dark borders.
  float wash=smoothstep(-.6,.85,vLocal.y);
  vec3 pigment=mix(vColor*.86,mix(vColor,vec3(1.0),.12),wash)*vShade;
  if(vPart>1.5)pigment=vColor*.78;
  if(uWhite>.5)pigment=vec3(1.0);
  gl_FragColor=vec4(pigment,1.0);
  #include <colorspace_fragment>
}`;

// One triangulated perimeter per wing. Curves retain twelve samples per cubic;
// no inset rings, mask textures or interior tessellation are needed.
function wingMesh(species, part, vertex, triangle, side) {
  const shape=new THREE.Shape();traceWing(shape,SPECIES[species][part]);
  const fill=new THREE.ShapeGeometry(shape,12),p=fill.getAttribute('position');
  const hind=part==='hind',mapping=[];
  for(let i=0;i<p.count;i++)mapping.push(vertex(p.getX(i)*side,p.getY(i)+(hind?-.02:.04),hind?-.012:.012,side,hind?1:0));
  const index=fill.getIndex();
  for(let i=0;i<index.count;i+=3)triangle(mapping[index.getX(i)],mapping[index.getX(i+1)],mapping[index.getX(i+2)]);
  fill.dispose();
}

export function createSpeciesGeometry(species) {
  const positions=[],sides=[],parts=[],indices=[];
  const vertex=(x,y,z,side,part)=>{const i=positions.length/3;positions.push(x,y,z);sides.push(side);parts.push(part);return i;};
  const triangle=(a,b,c)=>indices.push(a,b,c);
  for(const side of [-1,1])for(const part of ['fore','hind'])wingMesh(species,part,vertex,triangle,side);
  function append(geometry,x=0,y=0,z=0){
    const p=geometry.getAttribute('position'),base=positions.length/3;
    for(let i=0;i<p.count;i++)vertex(p.getX(i)+x,p.getY(i)+y,p.getZ(i)+z,0,2);
    const index=geometry.getIndex();
    if(index)for(let i=0;i<index.count;i+=3)triangle(base+index.getX(i),base+index.getX(i+1),base+index.getX(i+2));
    else for(let i=0;i<p.count;i+=3)triangle(base+i,base+i+1,base+i+2);
    geometry.dispose();
  }
  const body=new THREE.OctahedronGeometry(1,0);body.scale(.033,.23,.035);
  append(body,0,-.015,0);
  // Two quiet graphic antennae; each is one triangle rather than a tube.
  for(const side of [-1,1])triangle(vertex(side*.012,.19,.01,0,2),vertex(side*.019,.19,.01,0,2),vertex(side*.075,.29,.01,0,2));
  const geometry=new THREE.InstancedBufferGeometry();geometry.setIndex(indices);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  for(const [name,data] of [['aWing',sides],['aPart',parts]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(data,1));
  return geometry;
}

export function createButterflies(state) {
  const material=new THREE.ShaderMaterial({vertexShader,fragmentShader,side:THREE.DoubleSide,uniforms:{uTime:{value:0},uActivity:{value:1},uWhite:{value:0}},toneMapped:false});
  const mesh=new THREE.Group(),batches=[],geometries=[];
  const color=new THREE.Color();
  for(let i=0;i<state.count;i++)color.set(PALETTE[i%PALETTE.length]).toArray(state.colors,i*3);
  for(let species=0;species<3;species++){
    const ids=[];for(let i=0;i<state.count;i++)if(state.shapes[i]===species)ids.push(i);
    const geometry=createSpeciesGeometry(species),attributes={};geometries.push(geometry);
    for(const [name,size] of [['iPosition',3],['iPose',2],['iWing',4],['iSize',1],['iColor',3]]){
      const attribute=new THREE.InstancedBufferAttribute(new Float32Array(ids.length*size),size);
      if(name==='iPosition'||name==='iPose')attribute.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute(name,attribute);attributes[name]=attribute;
    }
    for(let j=0;j<ids.length;j++){
      const id=ids[j];attributes.iWing.array.set(state.wing.subarray(id*4,id*4+4),j*4);
      attributes.iSize.array[j]=state.sizes[id]*SPECIES[species].size;
      attributes.iColor.array.set(state.colors.subarray(id*3,id*3+3),j*3);
    }
    geometry.instanceCount=ids.length;
    const object=new THREE.Mesh(geometry,material);object.frustumCulled=false;object.name=SPECIES[species].id;mesh.add(object);
    batches.push({ids,attributes,geometry});
  }
  function update(){
    for(const batch of batches){const p=batch.attributes.iPosition.array,r=batch.attributes.iPose.array;
      for(let j=0;j<batch.ids.length;j++){const id=batch.ids[j],k=id*3,q=id*2;p[j*3]=state.positions[k];p[j*3+1]=state.positions[k+1];p[j*3+2]=state.positions[k+2];r[j*2]=state.pose[q];r[j*2+1]=state.pose[q+1];}
      batch.attributes.iPosition.needsUpdate=true;batch.attributes.iPose.needsUpdate=true;
    }
  }
  function setViewport(height) {
    // A minimum projected height keeps distant wings readable. It changes size,
    // never forces a wing to face the camera or changes the viewing angle.
    for(const batch of batches)for(let j=0;j<batch.ids.length;j++){
      const id=batch.ids[j],species=state.shapes[id];
      const worldPerPixel=2*(CAMERA_Z-state.positions[id*3+2])*Math.tan(Math.PI/8)/height;
      const minimum=16*worldPerPixel/silhouetteHeights[species];
      batch.attributes.iSize.array[j]=Math.max(state.sizes[id]*SPECIES[species].size,minimum);
    }
    for(const batch of batches)batch.attributes.iSize.needsUpdate=true;
  }
  update();
  return {mesh,material,batches,geometries,update,setViewport,dispose(){for(const geometry of geometries)geometry.dispose();material.dispose();}};
}
