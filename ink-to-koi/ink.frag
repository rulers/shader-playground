#version 300 es
precision highp float;
out vec4 color;
uniform vec2 resolution;
uniform float time;
const float TAU=6.28318530718;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
 vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
}
float fbm(vec2 p){return .57*noise(p)+.28*noise(p*2.03+7.)+.15*noise(p*4.07+19.);}
float ellipse(vec2 p,vec2 r){return (length(p/r)-1.)*min(r.x,r.y);}
float segment(vec2 p,vec2 a,vec2 b){vec2 v=b-a;return length(p-a-v*clamp(dot(p-a,v)/dot(v,v),0.,1.));}
float tri(vec2 p,vec2 a,vec2 b,vec2 c){
 float d=min(segment(p,a,b),min(segment(p,b,c),segment(p,c,a)));
 vec2 v=b-a,w=c-b,z=a-c;
 float s1=v.x*(p-a).y-v.y*(p-a).x;
 float s2=w.x*(p-b).y-w.y*(p-b).x;
 float s3=z.x*(p-c).y-z.y*(p-c).x;
 return ((s1>=0.&&s2>=0.&&s3>=0.)||(s1<=0.&&s2<=0.&&s3<=0.))?-d:d;
}
float smin(float a,float b,float k){float h=max(k-abs(a-b),0.)/k;return min(a,b)-h*h*k*.25;}
// Arc-length parameterized capsule: long glides separated by forward U-turns.
// xy = position, zw = its exact unit tangent; the head never rotates in place.
vec4 route(float phase,float run,float radius){
 float straight=2.*run,arc=3.141592654*radius;
 float s=mod(phase/TAU*(2.*straight+2.*arc),2.*straight+2.*arc);
 if(s<straight)return vec4(-run+s,radius,1.,0.);
 s-=straight;
 if(s<arc){float t=s/radius;return vec4(run+radius*sin(t),radius*cos(t),cos(t),-sin(t));}
 s-=arc;
 if(s<straight)return vec4(run-s,-radius,-1.,0.);
 float t=(s-straight)/radius;
 return vec4(-run-radius*sin(t),-radius*cos(t),-cos(t),sin(t));
}
void main(){
 // All clocks share a 24s period, including the travelling body wave and warp.
 // No reseeding, opacity crossfade, or time reset at the loop boundary.
 float a=time*TAU/24.;
 float form=smoothstep(.12,.82,.5-.5*cos(a));
 vec2 uv=(gl_FragCoord.xy-.5*resolution)/min(resolution.x,resolution.y)*3.3;
 // A periodic speed integral accelerates gently while the fish has its shape.
 // Its derivative is 1 - .30*cos(a): up to 30% faster in the fish phase.
 float swim=a-.30*sin(a);
 vec2 halfView=resolution/min(resolution.x,resolution.y)*1.65;
 bool portrait=resolution.y>resolution.x;
 vec2 centre=vec2(portrait?0.:.30,portrait?.65:.25);
 vec2 reach=max(vec2(.12),halfView-abs(centre)-.78);
 vec2 axes=portrait?reach.yx:reach;
 float radius=min(.48,axes.y);
 float run=max(.15,min(1.35,axes.x-radius));
 vec4 course=route(swim,run,radius);
 vec4 before=route(swim-.04,run,radius),after=route(swim+.04,run,radius);
 float turn=clamp((before.z*after.w-before.w*after.z)*3.,-1.,1.)*(portrait?-1.:1.);
 vec2 position=portrait?course.yx:course.xy;
 vec2 forward=portrait?course.wz:course.zw;
 // Ink drifts near the centre independently of the fish's boundary turns.
 // Interpolate translation, never the ink's orientation, while it gathers.
 vec2 inkPosition=vec2(.18*sin(a),.10*cos(a));
 vec2 p=uv-centre-mix(inkPosition,position,form);
 vec2 q=vec2(dot(p,forward),dot(p,vec2(-forward.y,forward.x)))/.55;
 vec2 inkQ=(portrait?p.yx:p)/.55;
 vec2 drift=vec2(cos(a),sin(a));
 vec2 inkWarp=vec2(fbm(inkQ*2.7+drift),fbm(inkQ*2.7+drift+19.))-.5;
 vec2 inkR=inkQ+inkWarp*.95;
 inkR.y-=.045*sin(2.*a+inkR.x*3.);
 // The same domain warp gradually relaxes into an articulated fish silhouette.
 vec2 warp=vec2(fbm(q*2.7+drift),fbm(q*2.7+drift+19.))-.5;
 vec2 r=q+(1.-form)*warp*.95;
 float tailWeight=clamp((.5-r.x)/1.4,0.,1.);
 // Ink has its own slow current; the fast swimming wave only shapes the fish.
 r.y-=(1.-form)*.045*sin(2.*a+r.x*3.);
 vec2 f=r;
 // 30 tail beats per loop (~1.25 Hz); a wave travels from head toward tail.
 // The quiet head leads while the caudal peduncle and tail do most of the work.
 f.y-=form*.22*tailWeight*tailWeight*sin(30.*a+4.*f.x);
 // The rear body follows the curve during a turn, instead of pivoting rigidly.
 f.y-=form*.18*turn*tailWeight*tailWeight;
 // Match koi/koi.frag's broad head/body, narrow peduncle and fin proportions.
 float body=ellipse(f-vec2(.02,0),vec2(.72,.255));
 body=smin(body,ellipse(f-vec2(-.65,0),vec2(.27,.08)),.035);
 // Two lobes leave a visible V-shaped fork; all parts share the body wave.
 float flap=form*.04*sin(30.*a+1.);
 float tail=min(tri(f,vec2(-.79,0),vec2(-1.24,.31+flap),vec2(-1.13,.01)),tri(f,vec2(-.79,0),vec2(-1.13,-.01),vec2(-1.24,-.31+flap)));
 // Whole-number cycles retain the exact 24s loop while the fins gently fan.
 float finAngle=form*.045*sin(24.*a);
 float fins=min(tri(f,vec2(.25,.16),vec2(-.02,.48+finAngle),vec2(-.28,.2)),tri(f,vec2(.25,-.16),vec2(-.28,-.2),vec2(-.02,-.48-finAngle)));
 float fish=smin(body,min(tail,fins),.025);
 // A connected ribbon retains folded liquid edges, rather than a smoky cloud.
 float flow=inkR.y+.20*sin(inkR.x*4.+2.*a)+.08*sin(inkR.x*8.-a);
 float cloud=ellipse(vec2(inkR.x+.12,flow),vec2(1.55,.50));
 cloud+=(fbm(inkR*3.+drift)-.5)*.20;
 float d=mix(cloud,fish,form);
 d+=(1.-form)*.025*sin(inkR.x*12.+inkR.y*7.+a);
 float aa=3.3/min(resolution.x,resolution.y);
 float softness=mix(.13,.009,form)+aa;
 float edge=1.-smoothstep(-softness,softness,d);
 float bleed=(1.-smoothstep(-.035,mix(.24,.17,form),d))*mix(.065,.12,form);
 float pigment=mix(fbm(inkR*8.+inkWarp*2.+drift*.3),fbm(r*8.+warp*2.+drift*.3),form);
 float veins=.5+.5*sin(inkR.y*38.+fbm(inkR*4.+drift)*12.);
 float density=(.45+.40*pigment+.07*veins*(1.-form))*mix(.70,1.,form);
 // Diluted fins and a quiet spine; monochrome throughout.
 density*=mix(1.,mix(.48,1.,1.-smoothstep(-.025,.02,body)),form);
 float gill=abs(ellipse(f-vec2(.4,0),vec2(.12,.205)))-.005;
 density=mix(density,.86,(1.-smoothstep(-.005,.008,gill))*step(.32,f.x)*smoothstep(.75,.98,form)*.45);
 float eye=min(length(f-vec2(.53,.135)),length(f-vec2(.53,-.135)));
 density=mix(density,.98,(1.-smoothstep(.009,.016,eye))*smoothstep(.75,.98,form));
 float paper=(noise(gl_FragCoord.xy*.7)-.5)*.012;
 vec3 background=vec3(.914,.898,.859)+paper;
 float ink=clamp(edge*density+bleed,0.,.96);
 color=vec4(mix(background,vec3(.075,.085,.083),ink),1.);
}
