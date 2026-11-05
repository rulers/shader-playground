import * as THREE from '../third_party/three/three.module.js';
import { PALETTE } from './simulation.mjs';

export const vertexShader = /* glsl */`
attribute float aWing;
attribute float aPart;
attribute vec3 iPosition;
attribute vec2 iPose;
attribute vec4 iWing;
attribute float iSize;
attribute float iShape;
attribute vec3 iColor;
uniform float uTime;
uniform float uActivity;
varying vec3 vColor;
varying vec2 vLocal;
varying float vShade;
varying float vBody;
void main() {
  vec3 p = position;
  // Three related silhouettes: rounded, elongated and tapered.
  p.x *= mix(1.0, .82, step(.5,iShape));
  p.y *= mix(1.0, 1.16, step(1.5,iShape));
  float stroke = sin(uTime * iWing.y * (.35 + .65*uActivity) + iWing.x - aPart*.24);
  float angle = aWing * (.10 + (stroke*.5+.5)*1.30*iWing.z);
  float hinge = aWing*.025;
  p.x -= hinge;
  p = vec3(cos(angle)*p.x, p.y, -sin(angle)*p.x + .025*abs(p.x)*sin(p.y*8.0 + uTime*2.0+iWing.x));
  p.x += hinge;
  vShade = .70 + .28*cos(angle);
  vLocal = position.xy;
  vColor = iColor;
  vBody = 1.0-step(.5,abs(aWing));
  float cy=cos(iPose.y),sy=sin(iPose.y);
  p = vec3(cy*p.x+sy*p.z,p.y,-sy*p.x+cy*p.z);
  float ch=cos(iPose.x),sh=sin(iPose.x);
  p.xy = mat2(ch,sh,-sh,ch)*p.xy;
  vec3 world = p*iSize + iPosition;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(world,1.0);
}`;
export const fragmentShader = /* glsl */`
uniform float uWhite;
varying vec3 vColor;
varying vec2 vLocal;
varying float vShade;
varying float vBody;
void main() {
  float veins = pow(max(0.0,sin(atan(abs(vLocal.x),vLocal.y+.2)*13.0+length(vLocal)*4.0)),18.0);
  vec3 pigment = vColor * (vShade - veins*.13);
  pigment *= mix(1.0,.36,vBody);
  // White is a solid silhouette, independent of lighting or the colour palette.
  gl_FragColor = vec4(mix(pigment,vec3(1.0),uWhite),1.0);
  #include <colorspace_fragment>
}`;

export function createButterflies(state) {
  const positions = [], sides = [], parts = [];
  function append(shape, side, part) {
    const outline = new THREE.ShapeGeometry(shape, 9).toNonIndexed();
    const vertices = outline.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) {
      positions.push(vertices.getX(i) * (side || 1), vertices.getY(i), part===2?.012:0);
      sides.push(side); parts.push(part);
    }
    outline.dispose();
  }
  const fore = new THREE.Shape();
  fore.moveTo(.025,.05);fore.bezierCurveTo(.12,.46,.42,.83,.64,.72);
  fore.bezierCurveTo(.86,.62,.74,.31,.51,.11);fore.bezierCurveTo(.34,-.01,.15,-.06,.025,.05);
  const hind = new THREE.Shape();
  hind.moveTo(.025,.02);hind.bezierCurveTo(.22,.10,.62,.07,.59,-.20);
  hind.bezierCurveTo(.62,-.31,.48,-.49,.34,-.48);hind.lineTo(.24,-.62);
  hind.lineTo(.22,-.46);hind.bezierCurveTo(.04,-.40,.02,-.14,.025,.02);
  for (const side of [-1,1]) { append(fore,side,0); append(hind,side,1); }
  const body = new THREE.Shape();
  body.moveTo(0,.29);body.bezierCurveTo(.045,.28,.037,-.20,0,-.33);body.bezierCurveTo(-.037,-.20,-.045,.28,0,.29);append(body,0,2);
  for (const side of [-1,1]) {
    const antenna = new THREE.Shape();antenna.moveTo(side*.008,.23);antenna.lineTo(side*.085,.39);antenna.lineTo(side*.074,.40);antenna.lineTo(side*-.002,.24);append(antenna,0,2);
  }
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('aWing',new THREE.Float32BufferAttribute(sides,1));
  geometry.setAttribute('aPart',new THREE.Float32BufferAttribute(parts,1));
  const attributes = {};
  for (const [name,array,size] of [['iPosition',state.positions,3],['iPose',state.pose,2],['iWing',state.wing,4],['iSize',state.sizes,1],['iShape',state.shapes,1],['iColor',state.colors,3]]) {
    const attribute = new THREE.InstancedBufferAttribute(array,size);
    if(name==='iPosition'||name==='iPose')attribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute(name,attribute);attributes[name]=attribute;
  }
  const color = new THREE.Color();
  for(let i=0;i<state.count;i++)color.set(PALETTE[i%PALETTE.length]).toArray(state.colors,i*3);
  geometry.instanceCount=state.count;
  const material = new THREE.ShaderMaterial({vertexShader,fragmentShader,side:THREE.DoubleSide,uniforms:{uTime:{value:0},uActivity:{value:1},uWhite:{value:0}},toneMapped:false});
  const mesh = new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
  return {mesh,geometry,material,attributes,dispose(){geometry.dispose();material.dispose();}};
}
