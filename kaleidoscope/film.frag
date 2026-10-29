#version 300 es
precision highp float;
out vec4 color;
uniform vec2 resolution;
uniform float rotationAngle, flowTime;
const float PI=3.14159265359;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float field(vec2 p){return .64*noise(p)+.26*noise(p*2.03+7.1)+.10*noise(p*4.01+19.);}
mat2 turn(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
vec2 whirl(vec2 p,vec2 centre,float radius,float amount){
 vec2 d=p-centre;
 return centre+turn(amount*exp(-dot(d,d)/(radius*radius)))*d;
}
// A Cartesian marble field exists independently of the mirror: no radial colour bands.
float marble(vec2 p,float t){
 vec2 q=p+vec2(t*.025,-t*.018);
 q=whirl(q,vec2(.65+.12*sin(t*.09),.35),1.05,2.8+.65*sin(t*.075));
 q=whirl(q,vec2(-.45,1.15+.15*cos(t*.07)),.85,-3.1+.6*cos(t*.085));
 q=whirl(q,vec2(1.3,-.55),.7,2.1+.5*sin(t*.06));
 vec2 warp=vec2(field(q*1.4+vec2(0,t*.012)),field(q*1.4+8.3))-.5;
 q+=.65*warp;
 float broad=q.y*4.6+q.x*1.8+field(q*1.7)*3.;
 // A subordinate ribbon within the broad stream, not an all-over fine grid.
 float folded=broad+.7*sin(broad*1.7+field(q*.9)*3.);
 return folded;
}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*resolution)/min(resolution.x,resolution.y)*3.4;
 float r=length(uv);
 float a=atan(uv.y,uv.x)-rotationAngle;
 float wedge=PI/3.;
 float folded=abs(mod(a+wedge*.5,wedge)-wedge*.5);
 // Offset the mirror's source window so it cuts across moving eddies, not their centre.
 vec2 source=r*vec2(cos(folded),sin(folded))+vec2(-.6,.2);
 float pattern=marble(source,flowTime);
 float wave=sin(pattern);
 float edge=max(.055,fwidth(wave)*.8);
 float blend=smoothstep(-edge,edge,wave);
 const vec3 deepPurple=vec3(.45,0.,.85);
 const vec3 fluorescentYellow=vec3(.85,1.,0.);
 color=vec4(mix(deepPurple,fluorescentYellow,blend),1.);
}
