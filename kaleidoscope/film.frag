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
 // Spatial warp bends the contours themselves, rather than just recolouring rings.
 vec2 q=p+.7*warp;
 q+=.13*vec2(sin(p.y*3.+t*.07),sin(p.x*2.7-t*.06));
 float pattern=q.x*.72+field(q*1.8+drift)*.95;
 float fluidTime=t*.22;
 float fluidDistort=sin(pattern*3.14+fluidTime*.5)*.5;
 float psychWave=sin((pattern+fluidDistort)*8.+fluidTime*1.2);
 // Keep the requested crisp transition, with a pixel-sized antialiasing floor.
 float edgeWidth=max(.1,fwidth(psychWave)*.7);
 float colorMixRatio=smoothstep(-edgeWidth,edgeWidth,psychWave);
 const vec3 fluorescentYellow=vec3(.85,1.,0.);
 const vec3 deepPurple=vec3(.45,0.,.85);
 vec3 finalColor=mix(deepPurple,fluorescentYellow,colorMixRatio);
 finalColor=smoothstep(vec3(0.),vec3(1.),finalColor);
 color=vec4(finalColor,1.);
}
