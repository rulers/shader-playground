#version 300 es
precision highp float;
out vec4 color;
uniform vec2 resolution;
uniform float time, bend, paper, fishCount;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
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
float mask(float d,float aa){return 1.-smoothstep(-aa,aa,d);}
vec2 route(float t,float id){
 float a=t*(.095+.008*id)+id*1.93;
 // Independent, continuous orbits with drifting centres rather than parallel laps.
 return vec2(1.7*cos(a)+.3*sin(a*2.1+id),1.12*sin(a)+.18*cos(a*2.7-id));
}
vec3 fish(vec3 under,vec2 p,float id,float aa){
 float phase=time*(2.5+.13*id)+id*2.4;
 vec2 centre=route(time,id);
 vec2 forward=normalize(route(time+.02,id)-route(time-.02,id));
 vec2 side=vec2(-forward.y,forward.x);
 vec2 q=vec2(dot(p-centre,forward),dot(p-centre,side))/(.62+.07*sin(id*3.));
 // Travelling body wave increases toward the tail, with a quiet head.
 float tailWeight=clamp((.6-q.x)/1.6,0.,1.);
 q.y-=bend*.19*tailWeight*tailWeight*sin(phase+q.x*3.5);
 float edgeNoise=(fbm(q*48.+id*17.)-.5)*.015;
 float body=ellipse(q-vec2(.02,0),vec2(.72,.255)) + edgeNoise;
 // Narrow caudal peduncle links the tapered body and forked tail.
 body=min(body,ellipse(q-vec2(-.65,0),vec2(.27,.08)));
 float flap=.04*sin(phase+1.);
 float tail=min(tri(q,vec2(-.79,0),vec2(-1.24,.31+flap),vec2(-1.13,.01)),tri(q,vec2(-.79,0),vec2(-1.13,-.01),vec2(-1.24,-.31+flap)));
 float finAngle=.045*sin(phase*.8);
 float fins=min(tri(q,vec2(.25,.16),vec2(-.02,.48+finAngle),vec2(-.28,.2)),tri(q,vec2(.25,-.16),vec2(-.28,-.2),vec2(-.02,-.48-finAngle)));
 float allShape=min(body,min(tail,fins));
 // Soft diluted edge on paper, and a slight shadow where pigment collects.
 float bleed=mask(allShape-.02,aa*3.)*.15;
 under=mix(under,vec3(.36,.34,.27),bleed);
 float finMask=mask(min(fins,tail)+edgeNoise,aa);
 float finRays=.5+.5*sin(atan(q.y,q.x+.76)*44.+q.x*4.);
 vec3 finColor=mix(vec3(.63,.62,.51),vec3(.27,.31,.28),finRays*.38);
 under=mix(under,finColor,finMask*.55);
 float m=mask(body,aa);
 float bulge=sqrt(max(0.,1.-pow(q.y/.26,2.)));
 vec3 ivory=mix(vec3(.55,.57,.49),vec3(.91,.89,.75),bulge);
 float stain=fbm(q*7.+vec2(id*23.,id*8.));
 float red=smoothstep(.48,.54,stain+.12*sin(q.x*10.+id));
 vec3 vermilion=vec3(.56,.19,.115)*( .75+.25*bulge);
 vec3 pigment=mix(ivory,vermilion,red);
 float black= smoothstep(.62,.7,fbm(q*8.+51.+id*13.));
 if(id>2.5) pigment=mix(pigment,vec3(.1,.15,.16),black*.9);
 if(id>4.5) pigment=mix(vec3(.12,.18,.18),ivory,smoothstep(.35,.61,stain));
 // Staggered arcs suggest scales without a regular grid across the whole fish.
 vec2 sc=q*vec2(25.,38.);sc.x+=mod(floor(sc.y),2.)*.5;
 float scales=smoothstep(.4,.48,length(fract(sc)-.5));
 pigment*=1.-scales*.065*(1.-smoothstep(.05,.55,q.x));
 pigment*=.94+.09*fbm(q*100.+id);
 // Gill arcs and paired dark eyes define the broad head.
 float gill=abs(ellipse(q-vec2(.4,0),vec2(.12,.205)))-.005;
 pigment=mix(pigment,vec3(.29,.3,.23),mask(gill,aa)*.45*step(.32,q.x));
 float eyes=min(length(q-vec2(.53,.135)),length(q-vec2(.53,-.135)));
 pigment=mix(pigment,vec3(.08,.105,.095),mask(eyes-.022,aa));
 float mouth=segment(q,vec2(.686,-.045),vec2(.701,.045));
 pigment=mix(pigment,vec3(.3,.3,.23),mask(mouth-.006,aa)*.65);
 under=mix(under,pigment,m);
 // A few translucent rays remain visible in the tail.
 return under;
}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*resolution)/min(resolution.x,resolution.y)*4.7;
 float aa=4.7/min(resolution.x,resolution.y)*1.2;
 float fibres=fbm(gl_FragCoord.xy*vec2(.65,.09));
 float grain=hash(gl_FragCoord.xy);
 float mottling=fbm(uv*3.);
 vec3 parchment=vec3(.8,.745,.61)+paper*((mottling-.5)*.13+(fibres-.5)*.07+(grain-.5)*.045);
 vec3 ink=parchment;
 for(int i=0;i<7;i++) {if(float(i)>=fishCount)break;ink=fish(ink,uv,float(i),aa);}
 float vignette=clamp(length(uv)*.018,0.,.13);
 color=vec4(ink*(1.-vignette),1.);
}
