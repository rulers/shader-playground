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
float smin(float a,float b,float k){float h=max(k-abs(a-b),0.)/k;return min(a,b)-h*h*k*.25;}
// Closed, centre-crossing course: turn smoothly inward at its outer reaches.
// Reserve room for the tail and diluted ink before the canvas boundary.
vec2 route(float a,vec2 reach){return reach*vec2(cos(a),sin(2.*a)*.78);}
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
 vec2 centre=vec2(resolution.x>resolution.y?.55:0.,.20);
 vec2 reach=min(vec2(.78,.52),max(vec2(.05),halfView-abs(centre)-1.05));
 vec2 p=uv-centre-route(swim,reach);
 vec2 tangent=reach*vec2(-sin(swim),1.56*cos(2.*swim));
 vec2 forward=normalize(tangent);
 vec2 q=vec2(dot(p,forward),dot(p,vec2(-forward.y,forward.x)))/.80;
 vec2 drift=vec2(cos(a),sin(a));
 // The same domain warp gradually relaxes into an articulated fish silhouette.
 vec2 warp=vec2(fbm(q*2.7+drift),fbm(q*2.7+drift+19.))-.5;
 vec2 r=q+(1.-form)*warp*.95;
 float tailWeight=clamp((.5-r.x)/1.4,0.,1.);
 r.y-=.12*tailWeight*tailWeight*sin(4.*swim+r.x*4.);
 float body=ellipse(r-vec2(.06,0),vec2(.62,.205));
 body=smin(body,ellipse(r-vec2(-.53,0),vec2(.24,.065)),.09);
 // A soft fork and paired pectoral fins keep the silhouette organic.
 float tail=ellipse(r-vec2(-.83,0),vec2(.26,.25));
 tail=max(tail,-(r.x+.89+abs(r.y)*.8));
 float fins=min(ellipse(r-vec2(.04,.22),vec2(.21,.12)),ellipse(r-vec2(.04,-.22),vec2(.21,.12)));
 float fish=smin(body,min(tail,fins),.055);
 // A connected, folded ribbon of pigment is the other end of the distance field.
 float flow=r.y+.19*sin(r.x*5.+2.*a)+.08*sin(r.x*10.-a);
 float cloud=ellipse(vec2(r.x+.12,flow),vec2(1.05,.30));
 cloud+=(fbm(r*4.+drift)-.5)*.23;
 float d=mix(cloud,fish,form);
 d+=(1.-form)*.045*sin(r.x*23.+r.y*13.+a);
 float aa=3.3/min(resolution.x,resolution.y);
 float softness=mix(.075,.009,form)+aa;
 float edge=1.-smoothstep(-softness,softness,d);
 float bleed=(1.-smoothstep(-.035,.17,d))*.12;
 float pigment=fbm(r*8.+warp*2.+drift*.3);
 float veins=.5+.5*sin(r.y*38.+fbm(r*4.+drift)*12.);
 float density=.54+.32*pigment+.10*veins*(1.-form);
 // Diluted fins and a quiet spine; monochrome throughout.
 density*=mix(1.,mix(.48,1.,1.-smoothstep(-.025,.02,body)),form);
 float eye=min(length(r-vec2(.49,.085)),length(r-vec2(.49,-.085)));
 density=mix(density,.98,(1.-smoothstep(.009,.016,eye))*form);
 float paper=(noise(gl_FragCoord.xy*.7)-.5)*.012;
 vec3 background=vec3(.914,.898,.859)+paper;
 float ink=clamp(edge*density+bleed,0.,.96);
 color=vec4(mix(background,vec3(.075,.085,.083),ink),1.);
}
