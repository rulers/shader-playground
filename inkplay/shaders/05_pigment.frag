#version 150
uniform vec2 resolution;
uniform sampler2D velocityTex, pigmentTex, pressureTex, divergenceTex;
uniform float dt, time, wetness, injecting, radius, amount;
uniform vec2 point, previous, impulse;
uniform vec3 inkColor;
out vec4 fragColor;
vec2 uv(){return gl_FragCoord.xy/resolution;}
vec2 cell(){return 1.0/resolution;}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return .57*noise(p)+.28*noise(p*2.03+7.)+.15*noise(p*4.11+19.);}
// Distances are in simulation pixels, keeping round drops at every aspect ratio.
vec2 relativePoint(vec2 p){vec2 a=previous*resolution,b=point*resolution,d=b-a;float t=clamp(dot(p-a,d)/max(dot(d,d),.001),0.,1.);return p-mix(a,b,t);}
float source(vec2 p){vec2 d=relativePoint(p);float r=max(radius,1.);float angle=dot(d,d)>1e-8?atan(d.y,d.x):0.; float rough=1.+.22*sin(angle*5.+noise(p*.06)*3.)+.12*sin(angle*9.);return injecting*amount*exp(-dot(d,d)*rough/(r*r));}
vec2 velocity(vec2 p){return texture(velocityTex,clamp(p,cell()*.5,1.-cell()*.5)).xy;}
void main(){
 vec2 p=uv(),h=cell();vec4 old=texture(pigmentTex,p);
 // Artistic wetting-front expansion, added to the incompressible flow.
 vec2 grad=.5*vec2(texture(pigmentTex,p+vec2(h.x,0)).a-texture(pigmentTex,p-vec2(h.x,0)).a,
                   texture(pigmentTex,p+vec2(0,h.y)).a-texture(pigmentTex,p-vec2(0,h.y)).a);
 vec2 spread=-grad*wetness*15.*clamp(old.a*2.,0.,1.);
 spread*=min(1.,22./max(length(spread),.001));
 vec2 back=p-dt*(velocity(p)*clamp(old.a*3.,0.,1.)+spread)*h;
 vec4 c=texture(pigmentTex,back);
 vec4 average=(texture(pigmentTex,back-vec2(h.x,0))+texture(pigmentTex,back+vec2(h.x,0))+texture(pigmentTex,back-vec2(0,h.y))+texture(pigmentTex,back+vec2(0,h.y)))*.25;
 c=mix(c,average,min(.24,wetness*.13)*clamp(old.a*3.,0.,1.));
 c.a*=exp(-dt*.18); // drying freezes marks instead of erasing them
 float s=source(gl_FragCoord.xy);
 // Store optical density, not display RGB: overlapping pigments darken.
 c.rgb+=-log(clamp(inkColor,vec3(.015),vec3(.98)))*s*.38;
 c.a+=s*.55;
 fragColor=clamp(c,0.,12.);
}
