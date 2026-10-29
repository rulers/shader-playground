#version 300 es
precision highp float;
out vec4 color;
uniform vec2 resolution;
uniform float rotationAngle, flowTime;
const float PI=3.14159265359;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return .57*noise(p)+.28*noise(p*2.02+7.1)+.15*noise(p*4.03+16.7);}
float membrane(vec2 p,float t){
 vec2 drift=vec2(t*.085,-t*.06);
 vec2 warp=vec2(fbm(p*1.25+drift),fbm(p*1.3-drift+9.3));
 vec2 q=p+1.15*(warp-.5);
 return fbm(q*2.+drift)+.18*sin(length(q-vec2(.7,.25))*6.-t*.12);
}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*resolution)/min(resolution.x,resolution.y)*2.9;
 float r=length(uv);
 float a=atan(uv.y,uv.x)-rotationAngle;
 // Six mirrored sectors. Mirror edges join continuously, including at the centre.
 float wedge=PI/3.;
 float folded=abs(mod(a+wedge*.5,wedge)-wedge*.5);
 vec2 p=r*vec2(cos(folded),sin(folded));
 float t=flowTime+3.;
 float film=membrane(p,t);
 float thickness=film*11.+r*1.6;
 // Interference colours, normalised to bound luminance as colours drift.
 vec3 rainbow=.5+.5*cos(thickness+vec3(0.,2.1,4.2));
 rainbow=mix(vec3(.64,.7,.77),rainbow,.76);
 float luma=dot(rainbow,vec3(.2126,.7152,.0722));
 rainbow*=.65/max(luma,.12);
 float contour=.5+.5*cos(thickness*2.5);
 float aa=max(fwidth(thickness)*2.5,.02);
 float lace=1.-smoothstep(.045,.045+aa,abs(sin(thickness*3.)));
 float glow=pow(contour,5.);
 float light=.95+.10*contour+.05*glow;
 vec3 base=rainbow*light;
 base+=vec3(.6,.78,.84)*lace*.18;
 // Smooth falloff and fixed exposure; no flashing, cuts or time-based palette switches.
 float vignette=1.-.12*smoothstep(.2,2.6,r);
 vec3 background=vec3(.045,.065,.11);
 vec3 rgb=(background+base*vignette)*1.2;
 rgb=rgb/(1.+rgb);
 // Convert linear light for display, rather than darkening the midtones.
 rgb=pow(rgb,vec3(1./2.2));
 color=vec4(rgb,1.);
}
