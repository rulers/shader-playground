#version 300 es
precision highp float;
out vec4 color;
uniform sampler2D scene, bloom;
uniform vec2 texel;
uniform int mode;
vec3 unpackHDR(vec3 x){return x/max(vec3(.0039),1.-x);}
vec3 sampleLight(vec2 uv){
 vec3 c=unpackHDR(texture(scene,uv).rgb);
 if(mode==0){float peak=max(c.r,max(c.g,c.b));c*=smoothstep(.85,1.4,peak);}
 return c;
}
vec3 tone(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
 vec2 uv=gl_FragCoord.xy*texel;
 if(mode<2){
  vec2 axis=mode==0?vec2(texel.x,0):vec2(0,texel.y);
  vec3 sum=sampleLight(uv)*.227027;
  sum+=(sampleLight(uv+axis*1.384615)+sampleLight(uv-axis*1.384615))*.316216;
  sum+=(sampleLight(uv+axis*3.230769)+sampleLight(uv-axis*3.230769))*.070270;
  color=vec4(sum/(1.+sum),1.);
 }else{
  vec3 hdr=unpackHDR(texture(scene,uv).rgb)+unpackHDR(texture(bloom,uv).rgb)*.28;
  vec3 mapped=tone(hdr*.92);
  // Linear-light output conversion, after highlight compression.
  vec3 display=mix(mapped*12.92,1.055*pow(mapped,vec3(1./2.4))-.055,step(vec3(.0031308),mapped));
  // Reassert saturation after bloom/tone mapping so overlaps cannot turn pastel.
  display=smoothstep(vec3(.025),vec3(.97),display);
  float low=min(display.r,min(display.g,display.b));
  float high=max(display.r,max(display.g,display.b));
  display=(display-low*.98)*high/max(high-low*.98,.001);
  color=vec4(clamp(display,0.,1.),1.);
 }
}
