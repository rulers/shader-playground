import * as THREE from '../third_party/three/three.module.js';
// Reuse the existing, independently drawn outlines without changing that artwork.
import { SPECIES, traceWing } from '../flower-butterflies/butterfly.js';
import { PALETTE, CAMERA_Z } from './simulation.mjs';
export { SPECIES };

export const vertexShader = /* glsl */`
attribute float aWing;
attribute float aPart;
attribute float aRim;
attribute float aSpecies;
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
varying float vRim;
varying float vSpecies;
void main() {
  vec3 p = position;
  float angle = 0.0;
  if(abs(aWing)>.5) {
    float hind = step(.5,aPart);
    float phase = uTime*iWing.y*(.35+.65*uActivity)+iWing.x-hind*.43;
    float stroke = sin(phase);
    // A resting dihedral, cambered membrane and staggered hindwing remain
    // three-dimensional even when the body is viewed exactly in profile.
    angle = aWing*(.24+hind*.07+(stroke*.5+.5)*.90*iWing.z);
    // Rotate about the actual fore/hind hinge plane, keeping the wing root
    // attached to the thorax throughout the stroke.
    float hingeZ=mix(.045,-.045,hind);
    p.z-=hingeZ;
    p.z += -.14*pow(abs(p.x)/.83,2.0)*(1.0-hind*.25);
    p.z += .025*abs(p.x)*sin(p.y*6.0+phase);
    float sweep = aWing*hind*(-.07-.045*(stroke*.5+.5));
    float cs=cos(sweep),ss=sin(sweep);
    p.xy = mat2(cs,ss,-ss,cs)*p.xy;
    float hinge=aWing*.012;
    p.x-=hinge;
    p=vec3(cos(angle)*p.x+sin(angle)*p.z,p.y,-sin(angle)*p.x+cos(angle)*p.z);
    p.x+=hinge;
    p.z+=hingeZ;
  }
  vShade=.74+.24*cos(angle);
  vLocal=vec2(abs(position.x),position.y);
  vColor=iColor;vPart=aPart;vRim=aRim;vSpecies=aSpecies;
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
varying float vRim;
varying float vSpecies;
float oval(vec2 p,vec2 center,vec2 radius){return 1.0-smoothstep(.78,1.0,length((p-center)/radius));}
void main() {
  vec3 pigment=vec3(1.0);
  if(uWhite<.5) {
    vec2 p=vLocal;
    float hind=step(.5,vPart);
    vec3 ink=vec3(.009,.013,.020);
    float radial=clamp(length(p-vec2(.02,.06))/.9,0.0,1.0);
    float veins=pow(max(0.0,sin(atan(p.y-.04,p.x+.015)*10.0+radial*3.5)),20.0);
    float rim=smoothstep(.12,.60,vRim);
    if(vSpecies<.5) {
      // Broad Papilio: a dark margin, structural veins and a row of pale cells.
      vec3 field=mix(vColor*.50,mix(vColor,vec3(1.0,.80,.25),.34),smoothstep(0.0,.7,radial));
      float bands=pow(max(0.0,sin(atan(p.y+.03,p.x+.015)*7.0+radial*2.0)),14.0);
      pigment=mix(field,ink,max(rim,max(veins*.76,bands*.75)));
      float spots=oval(p,vec2(.50,.34),vec2(.048,.065))+oval(p,vec2(.61,.45),vec2(.036,.050));
      spots=mix(spots,oval(p,vec2(.39,-.25),vec2(.070,.050))+oval(p,vec2(.24,-.29),vec2(.047,.042)),hind);
      pigment=mix(pigment,vec3(.96,.85,.45),clamp(spots,0.0,1.0)*.88);
      float eye=oval(p,vec2(.44,-.27),vec2(.033,.026))*hind;
      pigment=mix(pigment,vec3(.08,.46,.72),eye);
    } else if(vSpecies<1.5) {
      // Graphium: the bright, broad turquoise band is legible at mid distance.
      float bandCenter=mix(.19+.36*p.y,.24+.13*p.y,hind);
      float band=1.0-smoothstep(.048,.085,abs(p.x-bandCenter));
      vec3 turquoise=mix(vec3(.005,.47,.40),vec3(.04,.94,.90),radial);
      pigment=mix(ink,turquoise,band*(1.0-rim));
      pigment=mix(pigment,ink,veins*.46);
      float dots=oval(p,vec2(.41,-.22),vec2(.025,.031))+oval(p,vec2(.31,-.30),vec2(.025,.027));
      pigment=mix(pigment,vec3(.08,.65,.58),clamp(dots,0.0,1.0)*hind);
    } else {
      // Pieris: soft ivory wings, a dark forewing tip and two restrained spots.
      pigment=mix(vec3(.74,.79,.63),vec3(.96,.98,.87),smoothstep(0.0,.55,radial));
      float tip=oval(p,vec2(.53,.48),vec2(.18,.22))*(1.0-hind);
      float spots=(oval(p,vec2(.32,.18),vec2(.036,.040))+oval(p,vec2(.43,.27),vec2(.024,.030)))*(1.0-hind);
      pigment=mix(pigment,ink,max(tip,clamp(spots,0.0,1.0)));
      pigment*=1.0-veins*.12; pigment=mix(pigment,vec3(.32,.37,.28),rim*.32);
    }
    pigment*=vShade;
    if(vPart>1.5)pigment=vec3(.055,.065,.048);
  }
  gl_FragColor=vec4(pigment,1.0);
  #include <colorspace_fragment>
}`;

// Offset the sampled perimeter inward and triangulate that inset plus an edge
// strip. The rim follows the real outline on BOTH sides; no mask texture needed.
function wingMesh(species, part, appendVertex, appendTriangle, side) {
  const shape=new THREE.Shape();traceWing(shape,SPECIES[species][part]);
  const points=shape.extractPoints(10).shape;
  if(points[0].distanceToSquared(points.at(-1))<1e-12)points.pop();
  const n=points.length, clockwise=THREE.ShapeUtils.isClockWise(points);
  const width=species===2?.010:.023;
  const inner=points.map((p,i)=>{
    const prev=points[(i+n-1)%n],next=points[(i+1)%n];
    const ax=p.x-prev.x,ay=p.y-prev.y,bx=next.x-p.x,by=next.y-p.y;
    const la=Math.hypot(ax,ay)||1,lb=Math.hypot(bx,by)||1,sign=clockwise?-1:1;
    let nx=sign*(-ay/la-by/lb),ny=sign*(ax/la+bx/lb);
    const length=Math.hypot(nx,ny)||1;nx/=length;ny/=length;
    const dot=Math.max(.45,Math.abs(nx*sign*(-ay/la)+ny*sign*(ax/la)));
    return new THREE.Vector2(p.x+nx*width/dot,p.y+ny*width/dot);
  });
  const hind=part==='hind',partId=hind?1:0,depth=hind?-.045:.045,shift=hind?-.025:.045;
  const inside=inner.map(p=>appendVertex(p.x*side,p.y+shift,depth,side,partId,0));
  const outside=points.map(p=>appendVertex(p.x*side,p.y+shift,depth,side,partId,1));
  const fill=new THREE.ShapeGeometry(new THREE.Shape(inner),1);
  const fillPosition=fill.getAttribute('position'),mapping=[];
  for(let i=0;i<fillPosition.count;i++){
    const match=inner.findIndex(p=>Math.abs(p.x-fillPosition.getX(i))<1e-6&&Math.abs(p.y-fillPosition.getY(i))<1e-6);
    if(match<0)throw Error('Inset outline vertex was not preserved');
    mapping.push(inside[match]);
  }
  const fillIndex=fill.getIndex();
  for(let i=0;i<fillIndex.count;i+=3)appendTriangle(mapping[fillIndex.getX(i)],mapping[fillIndex.getX(i+1)],mapping[fillIndex.getX(i+2)]);
  fill.dispose();
  for(let i=0;i<n;i++){const j=(i+1)%n;appendTriangle(outside[i],outside[j],inside[i]);appendTriangle(outside[j],inside[j],inside[i]);}
}

export function createSpeciesGeometry(species) {
  const positions=[],sides=[],parts=[],rims=[],indices=[];
  const vertex=(x,y,z,side,part,rim)=>{const i=positions.length/3;positions.push(x,y,z);sides.push(side);parts.push(part);rims.push(rim);return i;};
  const triangle=(a,b,c)=>indices.push(a,b,c);
  for(const side of [-1,1])for(const part of ['fore','hind'])wingMesh(species,part,vertex,triangle,side);
  function append(geometry,x=0,y=0,z=0){
    const p=geometry.getAttribute('position'),base=positions.length/3;
    for(let i=0;i<p.count;i++)vertex(p.getX(i)+x,p.getY(i)+y,p.getZ(i)+z,0,2,0);
    const index=geometry.getIndex();
    if(index)for(let i=0;i<index.count;i+=3)triangle(base+index.getX(i),base+index.getX(i+1),base+index.getX(i+2));
    else for(let i=0;i<p.count;i+=3)triangle(base+i,base+i+1,base+i+2);
    geometry.dispose();
  }
  append(new THREE.CapsuleGeometry(.050,.31,3,7),0,-.025,0);
  append(new THREE.SphereGeometry(.046,7,5),0,.205,.012);
  // Bent tubular antennae keep a small but genuine profile, rather than a flat line.
  for(const side of [-1,1]) {
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.014,.22,.01),new THREE.Vector3(side*.045,.31,.025),new THREE.Vector3(side*.095,.36,.015)]);
    append(new THREE.TubeGeometry(curve,3,.005,3,false));
  }
  const geometry=new THREE.InstancedBufferGeometry();geometry.setIndex(indices);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  for(const [name,data] of [['aWing',sides],['aPart',parts],['aRim',rims]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(data,1));
  geometry.setAttribute('aSpecies',new THREE.Float32BufferAttribute(new Float32Array(positions.length/3).fill(species),1));
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
      const minimum=16*worldPerPixel/[1.46,1.34,1.12][species];
      batch.attributes.iSize.array[j]=Math.max(state.sizes[id]*SPECIES[species].size,minimum);
    }
    for(const batch of batches)batch.attributes.iSize.needsUpdate=true;
  }
  update();
  return {mesh,material,batches,geometries,update,setViewport,dispose(){for(const geometry of geometries)geometry.dispose();material.dispose();}};
}
