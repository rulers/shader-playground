import * as THREE from '../third_party/three/three.module.js';

// CONURE FLIGHT: all geometry and pixels are original and generated in the browser.
// The reference uses a one-shot film/still join; this is a deliberately stylised,
// real-time 3D interpretation rather than a reproduction of its video assets.
const $ = id => document.getElementById(id);
const canvas = $('stage');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const duration = 8.0;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const mix = (a,b,t) => a+(b-a)*t;
const smooth = (a,b,t) => {const x=clamp((t-a)/(b-a),0,1);return x*x*(3-2*x);};

let renderer, scene, camera, root, leftWing, rightWing, head, tail, sky;
let raf=0, last=0, time=reducedMotion.matches?duration:0, speed=1, paused=reducedMotion.matches, loop=false;
let lost=false, destroyed=false, dragPointer=null;
let pointer={x:0,y:0}, target={x:0,y:0};
const disposables=new Set();

function material(color, metalness=0) {
  const m=new THREE.MeshStandardMaterial({color,roughness:.68,metalness,flatShading:false});
  disposables.add(m);return m;
}
function mesh(geometry, m, parent, position, scale, rotZ=0) {
  disposables.add(geometry);
  const item=new THREE.Mesh(geometry,m);
  if(position)item.position.set(...position);
  if(scale)item.scale.set(...scale);
  item.rotation.z=rotZ;
  parent.add(item);return item;
}
function oval(parent,m,position,scale,rotZ=0) {
  return mesh(new THREE.SphereGeometry(1,20,12),m,parent,position,scale,rotZ);
}
function makeBird() {
  root=new THREE.Group();scene.add(root);
  const golden=material('#fdd041'),sun=material('#ffac36'),orange=material('#e96725');
  const wingGreen=material('#238d69'),jade=material('#26b08c'),lagoon=material('#117c9b');
  const blue=material('#125c89'),dark=material('#252a35'),ivory=material('#ffedb6');
  const iris=material('#111d25'),shine=new THREE.MeshBasicMaterial({color:'#ffffff'});
  disposables.add(shine);
  // Tail is placed behind the breast, as long flexible parrot feathers.
  tail=new THREE.Group();tail.position.set(0,-.82,-.25);root.add(tail);
  for(let i=-2;i<=2;i++) {
    const feather=oval(tail,i%2===0?lagoon:wingGreen,[i*.13,-.68+Math.abs(i)*.15,-.04],[.11,.85-Math.abs(i)*.12,.065],i*.10);
    feather.rotation.x=.11;
  }
  oval(root,wingGreen,[0,-.14,-.11],[.57,.91,.50]);
  oval(root,golden,[0,-.18,.23],[.50,.75,.35]);
  oval(root,orange,[0,-.35,.47],[.35,.42,.12]);
  oval(root,sun,[0,.13,.47],[.38,.35,.15]);
  // Each wing pivots at the shoulder. Feather positions are local to that hinge.
  function makeWing(side) {
    const pivot=new THREE.Group();
    pivot.position.set(side*.42,.20,-.01);
    pivot.scale.x=side;
    root.add(pivot);
    const shape=new THREE.Shape();
    shape.moveTo(-.05,.04);
    shape.bezierCurveTo(.28,.39,1.05,.42,1.88,.12);
    shape.bezierCurveTo(2.18,-.01,2.12,-.28,1.67,-.31);
    shape.bezierCurveTo(1.15,-.39,.49,-.29,-.05,-.10);
    const wingSurface=mesh(new THREE.ShapeGeometry(shape,14),wingGreen,pivot,[0,0,.015]);
    wingSurface.material.side=THREE.DoubleSide;
    // Primary feathers produce a readable silhouette throughout the stroke.
    for(let i=0;i<10;i++){
      const t=i/9;
      const color=i>7?blue:i>4?lagoon:jade;
      oval(pivot,color,[.48+i*.155,-.11-.15*t,-.008-i*.002],
           [.12,.37+.10*t,.047],-1.04-.27*t);
    }
    for(let i=0;i<6;i++){
      oval(pivot,i%2?golden:sun,[.22+i*.19,.09,.065],[.11,.24,.045],-1.24);
    }
    oval(pivot,wingGreen,[.33,.02,.095],[.58,.22,.125],-.12);
    return pivot;
  }
  leftWing=makeWing(-1);rightWing=makeWing(1);
  // A single head rig makes slight gaze changes after the approach possible.
  head=new THREE.Group();head.position.set(0,.67,.26);root.add(head);
  oval(head,golden,[0,.06,.05],[.45,.44,.45]);
  oval(head,sun,[0,-.06,.38],[.35,.29,.11]);
  oval(head,orange,[0,-.27,.38],[.24,.13,.08]);
  for(const side of [-1,1]){
    oval(head,ivory,[side*.265,.067,.357],[.125,.135,.055]);
    oval(head,iris,[side*.269,.065,.408],[.079,.092,.041]);
    oval(head,shine,[side*.29,.103,.445],[.024,.027,.014]);
  }
  oval(head,dark,[0,-.22,.52],[.20,.135,.20]);
  const beak=mesh(new THREE.ConeGeometry(.18,.37,16),dark,head,[0,-.37,.58],[1,1,.95]);
  beak.rotation.z=Math.PI; // the hooked tip points downward
  oval(head,ivory,[0,-.185,.58],[.15,.055,.12]);
  // Small wing highlights read as plumage rather than a solid propeller.
  return root;
}
function makeSky() {
  const vertex=[
    'varying vec2 vUv;',
    'void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'
  ].join('\n');
  const fragment=[
    'precision highp float;',
    'uniform float uTime; varying vec2 vUv;',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'void main(){',
    'vec2 uv=vUv; float h=uv.y;',
    'vec3 bottom=vec3(.18,.31,.35), mid=vec3(.095,.25,.31), top=vec3(.018,.065,.105);',
    'vec3 col=mix(bottom,mid,smoothstep(.14,.55,h));',
    'col=mix(col,top,smoothstep(.45,.97,h));',
    'float sun=1.0-smoothstep(.105,.114,length((uv-vec2(.59,.53))*vec2(1.0,1.0)));',
    'float halo=exp(-length((uv-vec2(.59,.53))*vec2(1.0,1.0))*12.0);',
    'col+=vec3(.49,.21,.07)*halo*.55;',
    'col=mix(col,vec3(.98,.54,.24),sun*.95);',
    'float haze=exp(-pow((h-.34)*15.0,2.0));',
    'col+=vec3(.12,.075,.04)*haze;',
    'float n=hash(floor(uv*vec2(930.0,630.0))+floor(uTime*.75));',
    'col+=(n-.5)*.014;',
    'gl_FragColor=vec4(col,1.0);',
    '#include <colorspace_fragment>',
    '}'
  ].join('\n');
  sky=new THREE.ShaderMaterial({uniforms:{uTime:{value:0}},vertexShader:vertex,fragmentShader:fragment,depthWrite:false});
  disposables.add(sky);
  mesh(new THREE.PlaneGeometry(90,90),sky,scene,[0,0,-27]);
  const positions=[];
  for(let i=0;i<120;i++){
    // A deterministic field of tiny motes gives the empty air depth.
    const x=Math.sin(i*12.9898)*14, y=Math.cos(i*9.371)*8;
    positions.push(x,y,-12-Math.abs(Math.sin(i*41.7))*9);
  }
  const points=new THREE.BufferGeometry();
  points.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const dust=new THREE.PointsMaterial({color:'#ffe7b6',transparent:true,opacity:.28,size:.045,sizeAttenuation:true,depthWrite:false});
  disposables.add(points);disposables.add(dust);
  scene.add(new THREE.Points(points,dust));
}
function initialize() {
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(43,innerWidth/Math.max(innerHeight,1),.1,100);
  camera.position.set(0,0,13);camera.lookAt(0,0,0);
  scene.add(new THREE.HemisphereLight('#ffefcf','#163746',2.1));
  const key=new THREE.DirectionalLight('#ffe8ba',3.3);key.position.set(3,5,9);scene.add(key);
  const fill=new THREE.DirectionalLight('#459cb5',1.8);fill.position.set(-5,-1,3);scene.add(fill);
  const rim=new THREE.DirectionalLight('#f9a25e',2);rim.position.set(1,4,-5);scene.add(rim);
  makeSky();makeBird();
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.18;
  renderer.setClearColor('#071a22',1);
  resize();
}
function resize(){
  if(!renderer)return;
  const w=Math.max(innerWidth,1),h=Math.max(innerHeight,1);
  const dpr=Math.min(devicePixelRatio||1,Math.min(2,Math.sqrt(2200000/(w*h))));
  renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);
  camera.aspect=w/h;camera.updateProjectionMatrix();
  pose();render();
}
function pose(){
  const p=clamp(time/duration,0,1),ease=1-Math.pow(1-p,2.4),land=smooth(.66,1,p);
  pointer.x=mix(pointer.x,target.x,.075);
  pointer.y=mix(pointer.y,target.y,.075);
  const mobile=innerWidth<720;
  const finalX=mobile?.35:1.48;
  root.position.set(
    mix(-2.0,finalX,ease)+pointer.x*(1-land)*.8,
    mix(.45,-.2,ease)+Math.sin(time*2.0)*.11*(1-land)+pointer.y*.34*(1-land),
    mix(-16,2.55,ease)
  );
  root.rotation.y=Math.sin(time*.9)*.17*(1-land)+pointer.x*.14;
  root.rotation.z=-(pointer.x*.10+Math.sin(time*1.5)*.09*(1-land));
  root.rotation.x=-.12*(1-land);
  const stroke=Math.sin(time*10.5)*(.73*(1-land))+.08;
  leftWing.rotation.z=-stroke;
  rightWing.rotation.z=stroke;
  tail.rotation.z=Math.sin(time*5.3)*.12*(1-land);
  head.rotation.y=pointer.x*.20;
  head.rotation.z=-pointer.x*.065;
  sky.uniforms.uTime.value=time;
}
function render(){
  if(renderer&&!lost&&!destroyed)renderer.render(scene,camera);
}
function status(){
  const done=time>=duration;
  $('status').textContent=paused?'静止中 · 再生で動きます':done?'ARRIVED · タップでもう一度飛ばす':'IN FLIGHT · ポインターで進路を変える';
  $('pause').textContent=paused?'再生':'一時停止';
  $('pause').setAttribute('aria-pressed',String(paused));
  $('speed-value').textContent=speed.toFixed(1)+'×';
}
function stop(){if(raf)cancelAnimationFrame(raf);raf=0;last=0;}
function schedule(){
  if(!raf&&!destroyed&&!lost&&!paused&&!document.hidden)
    raf=requestAnimationFrame(frame);
}
function frame(now){
  raf=0;
  if(lost||paused||document.hidden||destroyed)return;
  const dt=last?Math.min((now-last)/1000,.06):0;last=now;
  time+=dt*speed;
  if(loop&&time>duration+1.7)time=0;
  else time=Math.min(time,duration+(!loop?0:1.7));
  pose();render();status();
  if(time<duration||loop||Math.abs(pointer.x-target.x)>.005||Math.abs(pointer.y-target.y)>.005)schedule();
  else last=0;
}
function replay(){
  stop();time=0;pointer.x=target.x;pointer.y=target.y;
  paused=false;pose();render();status();schedule();
}
function setPaused(value){
  paused=!!value;stop();pose();render();status();if(!paused)schedule();
}
function toggleSettings(open){
  $('settings').hidden=!open;
  $('settings-toggle').textContent=open?'−':'＋';
  $('settings-toggle').setAttribute('aria-expanded',String(open));
  $('settings-toggle').setAttribute('aria-label',open?'調整UIを閉じる':'調整UIを開く');
  (open?$('settings-close'):$('settings-toggle')).focus();
}
function updatePointer(event){
  const rect=canvas.getBoundingClientRect();
  target.x=clamp((event.clientX-rect.left)/rect.width*2-1,-1,1);
  target.y=clamp(1-(event.clientY-rect.top)/rect.height*2,-1,1);
  if(time>=duration){pose();render();}
  if(!paused)schedule();
}
function wire(){
  $('settings-toggle').addEventListener('click',()=>toggleSettings($('settings').hidden));
  $('settings-close').addEventListener('click',()=>toggleSettings(false));
  $('speed').addEventListener('input',()=>{speed=Number($('speed').value);status();});
  $('loop').addEventListener('change',()=>{loop=$('loop').checked;if(loop&&!paused)schedule();});
  $('pause').addEventListener('click',()=>time>=duration&&paused?replay():setPaused(!paused));
  $('replay').addEventListener('click',replay);
  canvas.addEventListener('pointermove',updatePointer,{passive:true});
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0||event.isPrimary===false)return;
    dragPointer=event.pointerId;canvas.setPointerCapture(event.pointerId);
    updatePointer(event);replay();
  });
  for(const kind of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(kind,event=>{
    if(dragPointer===event.pointerId){dragPointer=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);}
  });
  canvas.addEventListener('pointerleave',()=>{target.x=0;target.y=0;if(!paused)schedule();});
  window.addEventListener('blur',()=>{target.x=0;target.y=0;});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!$('settings').hidden){toggleSettings(false);return;}
    if(event.repeat||/^(INPUT|BUTTON|SELECT|TEXTAREA|A)$/.test(event.target.tagName))return;
    if(event.code==='Space'){event.preventDefault();setPaused(!paused);}
    if(event.key.toLowerCase()==='r')replay();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else {pose();render();schedule();}});
  reducedMotion.addEventListener('change',event=>{
    if(event.matches){time=duration;setPaused(true);}
  });
  window.addEventListener('resize',resize);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;stop();$('status').textContent='GPU描画の復旧を待っています…';});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;last=0;resize();status();schedule();});
  window.addEventListener('pagehide',dispose,{once:true});
}
function dispose(){
  if(destroyed)return;
  destroyed=true;stop();
  for(const item of disposables)item.dispose();
  renderer?.dispose();
}
try{
  initialize();
  pose();render();status();wire();schedule();
}catch(error){
  stop();$('fallback').hidden=false;$('fallback').textContent='WebGL描画を開始できませんでした。'+(error?.message||'');
  $('status').textContent='描画エラー';console.error(error);
}
