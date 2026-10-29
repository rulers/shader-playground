#version 300 es
precision highp float;
out vec4 color;
uniform vec2 resolution;
uniform float time, density, detail, whiteInk;
float hash(vec3 p){p=fract(p*.3183099+vec3(.11,.23,.37));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.,a=.55;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec3(4.1,1.7,7.2);a*=.48;}return v;}
// An advected, warped tube: its rolling head travels right to left.
vec2 field(vec3 p){
 float head=2.7-mod(time*.24,7.8);
 float axis=.22*sin(p.x*1.1-time*.22)+.16*sin(p.x*2.+p.z);
 vec3 q=p; q.y-=axis;
 float angle=.7*sin(q.x*1.3-time*.2)+.6*q.x;
 q.yz=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*q.yz;
 vec3 flow=q*vec3(1.15,1.5,1.5);flow.x+=time*.17;
 vec3 warp=vec3(noise(flow),noise(flow+7.3),noise(flow+19.1))-.5;
 vec3 v=flow+warp*.95;
 float large=noise(v*4.2);
 float fine=fbm(v*(3.5*detail));
 float radius=.65+.22*sin(q.x*1.5-time*.3)+.34*large;
 float tube=radius-length(vec3(max(head-p.x,0.),q.yz))+.65*(large-.5)+.28*(fine-.5);
 float front=1.;
 float ink=smoothstep(-.025,.055,tube)*front;
 float wisps=smoothstep(.58,.77,fine)*smoothstep(-.35,.05,tube)*front*.24;
 float whiteMask=smoothstep(.5,.78,noise(v*1.6+vec3(0,8.,0)))*whiteInk;
 return vec2((ink+wisps)*density,whiteMask);
}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*resolution)/resolution.y;
 vec3 ro=vec3(uv*3.9,4.);vec3 rd=vec3(0,0,-1);
 vec3 bg=mix(vec3(.96,.985,.975),vec3(.88,.95,.96),smoothstep(-1.,1.,uv.y));
 vec3 accum=vec3(0);float trans=1.;float stepSize=3.4/72.;
 // Front-to-back absorption with a directional density sample for soft self-shadow.
 float jitter=hash(vec3(gl_FragCoord.xy,0.));
 for(int i=0;i<72;i++){
  vec3 p=ro+rd*(2.3+(float(i)+jitter)*stepSize);
  vec2 f=field(p);
  if(f.x>.015){
   float shade=field(p+vec3(-.13,.2,.16)).x;
   float light=exp(-shade*1.5);
   vec3 pigment=mix(vec3(.14,.205,.34),vec3(.82,.9,.94),f.y);
   vec3 lit=pigment*(.42+.85*light);
   float alpha=1.-exp(-f.x*stepSize*8.);
   accum+=trans*alpha*lit;trans*=1.-alpha;
   if(trans<.012)break;
  }
 }
 color=vec4(accum+trans*bg,1.);
}
