import * as THREE from '../third_party/three/three.module.js';
import { createFlock, advance, resetFlock, resizeFlock, clearWind, setWind, whiteMode, CAMERA_Z, clamp } from './simulation.mjs';
import { createButterflies } from './butterflies.js';

// The controller is also used by the browser tests. Production exports no globals.
export function mount({ initialPaused } = {}) {
  const $ = id => document.getElementById(id), canvas = $('view'), motion = matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController(), on = (target,name,fn) => target.addEventListener(name,fn,{signal:listeners.signal});
  const state = createFlock(innerWidth < 600 ? 120 : 180, innerWidth / innerHeight);
  let renderer, scene, camera, butterflies, raf = 0, last = null, lost = false, disposed = false, failed = false, restoration;
  let paused = initialPaused ?? motion.matches, mode = 'auto', activity = 1, strength = .8, currentWhite = null;
  let pixelRatio = Math.min(devicePixelRatio || 1, innerWidth < 600 ? 1.5 : 2), slowFrames = 0, samples = 0;
  const pointer = { id: null, x: 0, y: 0, time: null };
  function panel(open) {
    $('controls').hidden = !open; $('toggle').textContent = open ? '−' : '＋';
    $('toggle').setAttribute('aria-expanded',String(open));$('toggle').setAttribute('aria-label',open?'調整UIを閉じる':'調整UIを開く');
    (open?$('close'):$('toggle')).focus();
  }
  function release() {
    const id=pointer.id;pointer.id=null;pointer.time=null;
    if(id!==null&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
  }
  function clearInput() { release();clearWind(state); }
  function stop() { cancelAnimationFrame(raf);raf=0;last=null; }
  function status() {
    const white=whiteMode(mode,state.time);
    $('status').textContent=paused?'静止中 · 再生で群れが動きます':(white?'白い影に、風を送る。':'色彩の群れに、風を送る。');
    currentWhite=white;
    $('pause').textContent=paused?'再生':'一時停止';$('pause').setAttribute('aria-pressed',String(paused));
  }
  function draw() {
    if(!renderer||lost||disposed||failed||document.hidden)return;
    butterflies.update();
    butterflies.material.uniforms.uTime.value=state.time;
    butterflies.material.uniforms.uActivity.value=activity;
    butterflies.material.uniforms.uWhite.value=Number(whiteMode(mode,state.time));
    renderer.render(scene,camera);
    if(currentWhite!==whiteMode(mode,state.time))status();
  }
  function schedule() { if(!raf&&!paused&&!document.hidden&&!lost&&!disposed&&!failed)raf=requestAnimationFrame(frame); }
  function frame(now) {
    raf=0;if(paused||document.hidden||lost||disposed||failed)return;
    const dt=last===null?0:clamp((now-last)/1000,0,.1);last=now;
    advance(state,dt,activity,strength);draw();
    // Lower resolution only after sustained slow frames. Never create GPU objects here.
    if(dt>0){samples++;if(dt>.027)slowFrames++;}
    if(samples>=180){if(slowFrames>100&&pixelRatio>.8){pixelRatio=Math.max(.8,pixelRatio*.8);resize();}samples=slowFrames=0;}
    schedule();
  }
  function sync() { stop();clearInput();status();draw();schedule(); }
  function setPaused(value) { paused=Boolean(value);sync(); }
  function setMode(value) { if(!['auto','color','white'].includes(value))return;mode=value;$('mode').value=mode;status();draw(); }
  function reset() {
    activity=1;strength=.8;mode='auto';$('activity').value='1';$('wind').value='.8';$('mode').value='auto';
    $('activity-value').textContent='1.00';$('wind-value').textContent='0.80';
    resetFlock(state);sync();
  }
  function resize() {
    if(!renderer||lost||disposed)return;
    clearInput();resizeFlock(state,innerWidth/innerHeight);
    camera.aspect=state.aspect;camera.updateProjectionMatrix();butterflies.setViewport(innerHeight);
    const maxRatio=Math.sqrt(2400000/(innerWidth*innerHeight));
    renderer.setPixelRatio(Math.min(pixelRatio,maxRatio));renderer.setSize(innerWidth,innerHeight,false);draw();
  }
  function point(event) {
    if(paused||lost||disposed||failed||document.hidden||event.isPrimary===false)return;
    if(pointer.id!==null&&event.pointerId!==pointer.id)return;
    if(event.pointerType==='touch'&&pointer.id===null)return;
    const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width*2-1,y=1-(event.clientY-rect.top)/rect.height*2;
    if(pointer.time!==null){
      const dt=clamp((event.timeStamp-pointer.time)/1000,.008,1.25);
      const gap=(event.timeStamp-pointer.time)/1000;
      // Slow GPUs may deliver legitimate moves more than 200ms apart. Use
      // real elapsed time; retain a stale-hover guard without dropping slow drags.
      if(gap<1.25)setWind(state,x,y,(x-pointer.x)*state.aspect/dt*.6,(y-pointer.y)/dt*.6);
    }
    pointer.x=x;pointer.y=y;pointer.time=event.timeStamp;
  }
  function fail(error) {
    failed=true;stop();clearInput();$('status').textContent='描画できませんでした';
    $('fallback').hidden=false;$('fallback').textContent='この作品にはWebGL 2が必要です。対応ブラウザーで開いてください。\n'+error.message;
    console.error(error);
  }
  on($('toggle'),'click',()=>panel($('controls').hidden));on($('close'),'click',()=>panel(false));
  on($('mode'),'change',()=>setMode($('mode').value));on($('pause'),'click',()=>setPaused(!paused));on($('reset'),'click',reset);
  for(const id of ['activity','wind'])on($(id),'input',()=>{activity=Number($('activity').value);strength=Number($('wind').value);$(id+'-value').textContent=Number($(id).value).toFixed(2);draw();});
  on(document,'keydown',event=>{
    if(event.key==='Escape'&&!$('controls').hidden)panel(false);
    if(event.repeat||/^(INPUT|BUTTON|SELECT|TEXTAREA|A)$/.test(event.target.tagName))return;
    if(event.code==='Space'){event.preventDefault();setPaused(!paused);}
    if(event.key.toLowerCase()==='c')setMode(['auto','color','white'][(['auto','color','white'].indexOf(mode)+1)%3]);
  });
  on(canvas,'pointerdown',event=>{
    if(paused||lost||failed||event.isPrimary===false||event.button!==0||pointer.id!==null)return;
    pointer.id=event.pointerId;pointer.time=null;canvas.setPointerCapture(event.pointerId);canvas.focus({preventScroll:true});point(event);
  });
  on(canvas,'pointermove',point);
  for(const name of ['pointerup','pointercancel','lostpointercapture'])on(canvas,name,event=>{if(pointer.id===event.pointerId)release();});
  on(canvas,'pointerleave',()=>{if(pointer.id===null)pointer.time=null;});on(window,'blur',clearInput);
  on(document,'visibilitychange',()=>{if(document.hidden){stop();clearInput();}else sync();});
  on(motion,'change',event=>{if(event.matches)setPaused(true);});
  on(window,'resize',resize);
  function releaseGpu() {
    butterflies?.dispose();renderer?.dispose();butterflies=undefined;renderer=undefined;
  }
  on(canvas,'webglcontextlost',event=>{
    event.preventDefault();lost=true;stop();clearInput();
    // Release old-context caches while the context is lost. Reusing the old
    // renderer after restoration can leave stale dispose listeners in r186.
    releaseGpu();$('status').textContent='描画の復帰を待っています…';
  });
  on(canvas,'webglcontextrestored',()=>{
    clearTimeout(restoration);restoration=setTimeout(()=>{if(disposed)return;try{lost=false;initializeRenderer();resize();sync();}catch(error){fail(error);}},0);
  });
  function dispose() {
    if(disposed)return;stop();clearInput();disposed=true;clearTimeout(restoration);listeners.abort();
    releaseGpu();
  }
  on(window,'pagehide',event=>{stop();clearInput();if(!event.persisted)dispose();});
  on(window,'pageshow',event=>{if(event.persisted&&!disposed)sync();});
  function initializeRenderer() {
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.setClearColor(0x000000,1);renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.debug.onShaderError=(gl,program,vertex,fragment)=>fail(new Error(gl.getProgramInfoLog(program)||gl.getShaderInfoLog(vertex)||gl.getShaderInfoLog(fragment)||'Shader compilation failed'));
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(45,state.aspect,.1,80);camera.position.z=CAMERA_Z;
    butterflies=createButterflies(state);scene.add(butterflies.mesh);
  }
  try{initializeRenderer();resize();sync();}catch(error){fail(error);}
  return {
    setPaused,setMode,reset,dispose,
    step(seconds, render=true){if(!paused||lost||disposed)throw Error('Deterministic stepping requires a paused, live app');advance(state,seconds,activity,strength);if(render)draw();},
    snapshot(){return {time:state.time,paused,mode,white:whiteMode(mode,state.time),lost,disposed,failed,count:state.count,positions:Array.from(state.positions),pose:Array.from(state.pose),wing:Array.from(state.wing),sizes:Array.from(state.sizes),gust:Array.from(state.gust),wind:{...state.wind},calls:renderer?.info.render.calls,triangles:renderer?.info.render.triangles,memory:renderer?{...renderer.info.memory}:null,programs:renderer?.info.programs?.length,pixelRatio:renderer?.getPixelRatio()};}
  };
}
