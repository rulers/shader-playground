#version 300 es
precision highp float;
out vec4 color;
uniform vec2 resolution;
uniform float rotationAngle, flowTime;
const float PI=3.14159265359;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float field(vec2 p){return .7*noise(p)+.3*noise(p*2.+7.1);}
void main(){
 // Broad forms: far lower coordinate and colour frequency than the neon version.
 vec2 uv=(gl_FragCoord.xy-.5*resolution)/min(resolution.x,resolution.y)*1.6;
 float r=length(uv);
 float a=atan(uv.y,uv.x)-rotationAngle;
 float wedge=PI/3.;
 float folded=abs(mod(a+wedge*.5,wedge)-wedge*.5);
 vec2 p=r*vec2(cos(folded),sin(folded));
 float t=flowTime;
 vec2 drift=vec2(t*.025,-t*.018);
 vec2 warp=vec2(field(p+drift),field(p-drift+9.3))-.5;
 vec2 q=p+.45*warp;
 float wave=.5+.5*sin(q.x*7.+field(q*1.4+drift)*3.5-t*.08);
 float blend=smoothstep(.14,.86,wave);
 const vec3 blue=vec3(.025,.16,.88);
 const vec3 pink=vec3(.96,.035,.46);
 // Only two colours and their continuous blend; no highlights or extra palette.
 color=vec4(mix(blue,pink,blend),1.);
}
