#version 300 es
precision highp float;
out vec4 color;
uniform vec2 resolution;
uniform float rotationAngle, flowTime;
const float PI=3.14159265359;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){
 float n=0.,amplitude=.516129;
 for(int i=0;i<5;i++){float footprint=max(length(dFdx(p)),length(dFdy(p)));
  float visible=1.-smoothstep(.25,.75,footprint);
  n+=amplitude*mix(.5,noise(p),visible);p=p*2.02+vec2(7.1,16.7);amplitude*=.5;}
 return n;
}
float membrane(vec2 p,float t){
 vec2 drift=vec2(t*.045,-t*.032);
 vec2 warp=vec2(fbm(p*1.15+drift),fbm(p*1.2-drift+9.3));
 vec2 q=p+1.05*(warp-.5);
 // Three nested warps: broad twisting ribbons, then smaller torn contours.
 q=p+1.7*(warp-.5);
 vec2 warp2=vec2(fbm(q*1.8-drift+5.),fbm(q*1.9+drift+17.));
 q+=.8*(warp2-.5);
 vec2 warp3=vec2(fbm(q*3.2+drift+23.),fbm(q*3.1-drift+41.));
 q+=.2*(warp3-.5);
 return fbm(q*2.4+drift)+.10*sin(length(q-vec2(.7,.25))*6.-t*.065);
}
vec2 foldedPoint(vec2 uv){
 float a=atan(uv.y,uv.x)-rotationAngle;
 float wedge=PI/3.;
 float folded=abs(mod(a+wedge*.5,wedge)-wedge*.5);
 return length(uv)*vec2(cos(folded),sin(folded));
}
// Hue-space transitions keep complementary neighbours from mixing into grey.
float hueAt(float i){
 if(i<1.)return .9; if(i<2.)return .29;
 if(i<3.)return .64; if(i<4.)return .155;
 if(i<5.)return .005; if(i<6.)return .5;
 if(i<7.)return .77; return .34;
}
vec3 neon(float band,float width){
 float index=mod(floor(band),8.);
 float next=mod(index+1.,8.);
 float transition=smoothstep(.5-max(width,.04),.5+max(width,.04),fract(band));
 float h1=hueAt(index),h2=hueAt(next);
 float hue=h1+(fract(h2-h1+.5)-.5)*transition;
 vec3 rgb=clamp(abs(fract(hue+vec3(0.,2./3.,1./3.))*6.-3.)-1.,0.,1.);
 return mix(vec3(.003),vec3(1.),rgb);
}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*resolution)/min(resolution.x,resolution.y)*2.9;
 float r=length(uv),t=flowTime+3.;
 // Subpixel radial dispersion keeps the dense bands from breaking into RGB speckles.
 float dispersion=0.25/min(resolution.x,resolution.y)*smoothstep(.35,2.5,r);
 vec3 film=vec3(membrane(foldedPoint(uv*(1.+dispersion)),t),membrane(foldedPoint(uv),t),membrane(foldedPoint(uv*(1.-dispersion)),t));
 // Dense contour bands with complementary neon hues, rather than white-based interference.
 vec3 bands=film*24.+r*2.5;
 float footprint=max(fwidth(bands.g),.015);
 vec3 pigment=vec3(neon(bands.r,footprint).r,neon(bands.g,footprint).g,neon(bands.b,footprint).b);
 // A narrow dark separator makes adjacent complementary bands collide crisply.
 float separator=1.-smoothstep(.035,.035+min(footprint,.18),abs(fract(bands.g)-.5));
 float highlight=pow(.5+.5*cos(bands.g*6.283185),18.);
 vec3 radiance=pigment*(.72+.55*highlight)*(1.-.55*separator);
 // Bloom carries the local neon colour; there is no white/pearl light contribution.
 radiance+=pigment*highlight*1.1;
 float vignette=1.-.25*smoothstep(.5,2.7,r);
 radiance*=vignette;
 // Reversible HDR packing in RGBA8, independent of float framebuffer support.
 color=vec4(radiance/(1.+radiance),1.);
}
