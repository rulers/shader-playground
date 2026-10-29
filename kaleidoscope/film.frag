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
 // 1. 座標の初期化（1.6のままで大きな模様のサイズ感をキープ）
 vec2 uv=(gl_FragCoord.xy-.5*resolution)/min(resolution.x,resolution.y)*1.6;
 float r=length(uv);
 float a=atan(uv.y,uv.x)-rotationAngle;
 
 // 2. 万華鏡の6方向対称折りたたみ
 float wedge=PI/3.;
 float folded=abs(mod(a+wedge*.5,wedge)-wedge*.5);
 vec2 p=r*vec2(cos(folded),sin(folded));
 
 // 3. 空間の歪み（Domain Warping）のブースト
 // 元コードの歪み（.45）を少し強めて（.75）、液体のどろどろとした流動感を作ります
 float t=flowTime;
 vec2 drift=vec2(t*.035,-t*.025);
 vec2 warp=vec2(field(p+drift),field(p-drift+9.3))-.5;
 vec2 q=p+.75*warp;
 
 // 4. 波の生成（周波数を「7.0」から「3.8」に下げて細かすぎる縞模様を解消！）
 float wave = sin(q.x * 3.8 + field(q * 1.2 + drift) * 4.0 - t * 0.12);
 
 // 5. クッキリとした色の境界線の構築（中間色のモヤモヤを消去）
 // smoothstepの幅を非常に狭くして、トップページ背景のようなパキッとしたエッジにします
 float blend = smoothstep(-0.08, 0.08, wave);
 
 // 6. 蛍光イエロー × 鮮やかな紫のパレット定義
 const vec3 deepPurple       = vec3(0.45, 0.00, 0.85); // ディープバイオレット
 const vec3 fluorescentYellow = vec3(0.85, 1.00, 0.00); // 蛍光イエロー
 
 // 7. 最終ブレンドと出力
 vec3 rgb = mix(deepPurple, fluorescentYellow, blend);
 color = vec4(rgb, 1.0);
}
