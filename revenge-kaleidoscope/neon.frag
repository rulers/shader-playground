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
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*resolution)/min(resolution.x,resolution.y)*1.65;
 uv=turn(rotationAngle)*uv;
 // A triangular mirror lattice, not one central polar image.
 vec2 lattice=vec2(uv.x-uv.y/1.7320508,uv.y*2./1.7320508);
 vec2 f=fract(lattice+vec2(.0,.0));
 if(f.x+f.y>1.)f=1.-f.yx;
 vec3 b=vec3(1.-f.x-f.y,f.x,f.y);
 // Sorting barycentric coordinates folds all six triangle permutations together.
 float lo=min(b.x,min(b.y,b.z)),hi=max(b.x,max(b.y,b.z));
 float mid=1.-lo-hi;
 vec2 p=vec2(mid+.5*lo,.8660254*lo);
 float r=length(p),a=atan(p.y,p.x);
 float t=flowTime;
 vec3 cyan=vec3(.06,.95,1.);
 vec3 violet=vec3(.65,.035,1.);
 vec3 pink=vec3(1.,.055,.55);
 vec3 radiance=vec3(.0008,.0012,.004);
 // Five nested broken star crowns. The centre and nearby vertices become rosettes.
 for(int i=0;i<5;i++){
  float layer=float(i);
  float radius=.043*pow(1.8,layer)*(1.+.07*sin(t*.18+layer*1.8));
  float crown=radius*(.84+(.12+.07*sin(t*.16+layer*.8))*cos(a*6.));
  float d=abs(r-crown);
  // An opening at the ray gives a deliberate black gap between pieces.
  float gate=smoothstep(.004,.016,p.y);
  vec3 tint=mix(cyan,violet,layer*.12);
  radiance+=light(d,tint,.0028)*gate;
  radiance+=light(abs(r-crown-.012),tint,.0013)*gate*.5;
 }
 // Twin violet radial bars alternate with the cyan chevrons.
 float start=.045+.01*sin(t*.16);
 float finish=.39+.025*cos(t*.14);
 float bar=min(segment(p,vec2(start,.009),vec2(finish,.009)),segment(p,vec2(start,.024),vec2(finish,.024)));
 radiance+=light(bar,mix(violet,pink,.35),.0024);
 // Faceted triangular jewel near the gap between neighbouring rosettes.
 vec2 centre=vec2(.445,.223);
 vec2 q=turn(.12*sin(t*.12))*(p-centre);
 float triangle=min(segment(q,vec2(-.029,-.017),vec2(.029,-.017)),min(segment(q,vec2(.029,-.017),vec2(0,.033)),segment(q,vec2(0,.033),vec2(-.029,-.017))));
 radiance+=light(triangle,cyan,.0018)*.75;
 // Keep large areas genuinely dark; light remains confined to the geometric parts.
 float vignette=1.-.35*smoothstep(.3,2.4,length(uv));
 vec3 mapped=tone(radiance*vignette*.85);
 color=vec4(pow(mapped,vec3(1./2.2)),1.);
}
