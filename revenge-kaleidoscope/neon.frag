#version 300 es
precision highp float;
out vec4 color;
uniform vec2 resolution;
uniform float rotationAngle, flowTime;
const float PI=3.14159265359;
mat2 turn(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float segment(vec2 p,vec2 a,vec2 b){vec2 v=b-a;return length(p-a-v*clamp(dot(p-a,v)/dot(v,v),0.,1.));}
vec3 light(float d,vec3 tint,float width){
 float aa=max(fwidth(d),.00065);
 float core=1.-smoothstep(width-aa,width+aa,d);
 float halo=exp(-d*65.)*.42+exp(-d*20.)*.055;
 return tint*(core*2.4+halo)+vec3(.55,.65,.7)*core*.4;
}
vec3 tone(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float random(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec4 pose(float id,float state){return vec4(random(vec2(id+1.,state+3.)),random(vec2(id+8.,state+12.)),random(vec2(id+27.,state+6.)),random(vec2(id+41.,state+23.)));}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*resolution)/min(resolution.x,resolution.y)*1.65;
 // Mirror lattice stays fixed: rotating contents, not a wallpaper.
 // A triangular mirror lattice, not one central polar image.
 vec2 lattice=vec2(uv.x-uv.y/1.7320508,uv.y*2./1.7320508);
 vec2 f=fract(lattice+vec2(.0,.0));
 if(f.x+f.y>1.)f=1.-f.yx;
 vec3 b=vec3(1.-f.x-f.y,f.x,f.y);
 // Sorting barycentric coordinates folds all six triangle permutations together.
 float lo=min(b.x,min(b.y,b.z)),hi=max(b.x,max(b.y,b.z));
 float mid=1.-lo-hi;
 vec2 p=vec2(mid+.5*lo,.8660254*lo);
 float t=flowTime;
 vec3 cyan=vec3(.06,.95,1.);
 vec3 violet=vec3(.65,.035,1.);
 vec3 pink=vec3(1.,.055,.55);
 vec3 radiance=vec3(.0008,.0012,.004);
 // Every 30 degrees reaches a new deterministic arrangement, without a cut.
 float travel=rotationAngle/(PI/6.);
 float state=floor(travel);
 float progress=fract(travel);
 float ease=progress*progress*progress*(progress*(progress*6.-15.)+10.);
 for(int i=0;i<9;i++){
  float id=float(i);
  vec4 oldPose=pose(id,state),newPose=pose(id,state+1.);
  vec4 current=mix(oldPose,newPose,ease);
  vec2 centre=vec2(.035,.005)+current.xy*vec2(.43,.25);
  centre+=.004*vec2(sin(t*.12+id),cos(t*.1+id));
  float orientation=current.z*PI*2.+rotationAngle*.8;
  vec2 q=turn(orientation)*(p-centre);
  float size=mix(.022,.09,current.w);
  vec3 tint=mod(id,3.)<1.?cyan:(mod(id,3.)<2.?violet:pink);
  float d;
  if(i<3){
   // Loose glass-like triangular outlines: their reflections form new stars.
   d=min(segment(q,vec2(-size,-size*.45),vec2(size,-size*.45)),min(segment(q,vec2(size,-size*.45),vec2(0,size*.9)),segment(q,vec2(0,size*.9),vec2(-size,-size*.45))));
  }else if(i<6){
   // Offset paired bars can join into hexagons, spokes or diamonds in the mirrors.
   d=min(segment(q,vec2(-size,-.006),vec2(size,-.006)),segment(q,vec2(-size,.006),vec2(size,.006)));
  }else{
   d=min(segment(q,vec2(-size,size*.45),vec2(0,-size*.45)),segment(q,vec2(0,-size*.45),vec2(size,size*.45)));
  }
  radiance+=light(d,tint,.002)*.72;
 }
 // Keep large areas genuinely dark; light remains confined to the geometric parts.
 float vignette=1.-.35*smoothstep(.3,2.4,length(uv));
 vec3 mapped=tone(radiance*vignette*.85);
 color=vec4(pow(mapped,vec3(1./2.2)),1.);
}
