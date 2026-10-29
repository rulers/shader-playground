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
 for(int i=0;i<5;i++){n+=amplitude*noise(p);p=p*2.02+vec2(7.1,16.7);amplitude*=.5;}
 return n;
}
float membrane(vec2 p,float t){
 vec2 drift=vec2(t*.045,-t*.032);
 vec2 warp=vec2(fbm(p*1.15+drift),fbm(p*1.2-drift+9.3));
 vec2 q=p+1.05*(warp-.5);
 // Fine secondary warp rides inside the broad folds, at a lower amplitude.
 q+=.075*vec2(fbm(q*3.1-drift+5.),fbm(q*3.2+drift+17.))-.0375;
 return fbm(q*2.+drift)+.12*sin(length(q-vec2(.7,.25))*5.-t*.065);
}
vec2 foldedPoint(vec2 uv){
 float a=atan(uv.y,uv.x)-rotationAngle;
 float wedge=PI/3.;
 float folded=abs(mod(a+wedge*.5,wedge)-wedge*.5);
 return length(uv)*vec2(cos(folded),sin(folded));
}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*resolution)/min(resolution.x,resolution.y)*2.9;
 float r=length(uv),t=flowTime+3.;
 // Radial dispersion reaches about two internal pixels at the corners.
 float dispersion=1.8/min(resolution.x,resolution.y)*smoothstep(.35,2.5,r);
 vec3 film=vec3(membrane(foldedPoint(uv*(1.+dispersion)),t),membrane(foldedPoint(uv),t),membrane(foldedPoint(uv*(1.-dispersion)),t));
 // Optical thickness approximation in nanometres, sampled at three wavelengths.
 vec3 thickness=420.+film*1050.+r*70.;
 vec3 phase=4.*PI*1.33*thickness/vec3(650.,530.,460.)+vec3(0.,.13,.27);
 vec3 interference=.5+.5*cos(phase);
 vec3 pigment=pow(interference,vec3(1.5));
 float structure=film.g*13.+r*1.5;
 float distanceToLine=abs(sin(structure*3.));
 float aa=max(fwidth(distanceToLine),.01);
 float line=clamp((.035-distanceToLine)/aa+.5,0.,1.);
 float ridge=pow(.5+.5*cos(structure*1.7),12.);
 // Dark tinted folds with sparse radiance above 1.0; no global brightness lift.
 vec3 radiance=vec3(.009,.015,.028)+pigment*(.14+.48*ridge);
 vec3 pearl=mix(vec3(.38,.68,1.),normalize(pigment+.15),.6);
 radiance+=pearl*(line*2.1+ridge*.18);
 float vignette=1.-.25*smoothstep(.5,2.7,r);
 radiance*=vignette;
 // Reversible HDR packing in RGBA8, independent of float framebuffer support.
 color=vec4(radiance/(1.+radiance),1.);
}
