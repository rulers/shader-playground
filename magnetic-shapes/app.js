import {createState,reset,step,moving} from './model.mjs';
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
const state=createState(),status=document.querySelector('#status'),pause=document.querySelector('#pause'),slider=document.querySelector('#strength');
const media=matchMedia('(prefers-reduced-motion: reduce)');
let W=1,H=1,size=1,cx=0,cy=0,raf=0,last=0,paused=false,active=null,keyboard={x:0,y:0};
const say=s=>{if(status.textContent!==s)status.textContent=s;};
function schedule(){if(ctx&&!raf&&!document.hidden&&!paused)raf=requestAnimationFrame(frame);}
function frame(now){raf=0;const dt=last?Math.min((now-last)/1000,1/30):1/120;last=now;
 const before=state.pieces.map(a=>[a.x,a.y,a.turn]);
 if(!paused){if(media.matches){for(let i=0;i<32;i++)step(state,1/120);}else step(state,dt);}
 const changed=state.pieces.some((a,i)=>Math.hypot(a.x-before[i][0],a.y-before[i][1],a.turn-before[i][2])>.00001);
 render();if(!paused&&(state.pointer?changed:moving(state)))schedule();else last=0;
}
function shape(a){const r=a.r*size;ctx.beginPath();
 if(a.shape==='circle')ctx.arc(0,0,r,0,Math.PI*2);
 else if(a.shape==='bar')ctx.roundRect(-r*1.3,-r*.32,r*2.6,r*.64,r*.32);
 else if(a.shape==='square')ctx.roundRect(-r*.8,-r*.8,r*1.6,r*1.6,r*.16);
 else {ctx.arc(0,0,r,Math.PI,Math.PI*2);ctx.closePath();}
}
function render(){if(!ctx)return;ctx.fillStyle='#f3ebda';ctx.fillRect(0,0,W,H);
 state.pieces.forEach(a=>{ctx.save();ctx.translate(cx+a.x*size,cy+a.y*size);ctx.rotate(a.angle+a.turn);
 ctx.save();ctx.translate(1,6);shape(a);ctx.fillStyle='#242a3015';ctx.shadowColor='#242a3025';ctx.shadowBlur=14;ctx.fill();ctx.restore();
 ctx.save();ctx.translate(0,3);shape(a);ctx.fillStyle=a.color;ctx.fill();ctx.restore();shape(a);ctx.fillStyle=a.color;ctx.fill();ctx.strokeStyle='#ffffff35';ctx.lineWidth=1;ctx.stroke();ctx.restore();});
 if(state.pointer){ctx.beginPath();ctx.arc(cx+state.pointer.x*size,cy+state.pointer.y*size,7,0,Math.PI*2);ctx.strokeStyle='#355f9e66';ctx.lineWidth=1;ctx.stroke();}
}
function cancel(){const id=active;active=null;state.pointer=null;if(id!==null&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);schedule();}
function resize(){cancel();W=innerWidth;H=innerHeight;const dpr=Math.min(devicePixelRatio||1,1.5,1920/Math.max(W,H));canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx?.setTransform(dpr,0,0,dpr,0,0);size=Math.min(W*.92,H*(W<650?.52:.9));cx=W<650?W*.5:W*.66;cy=W<650?H*.32:H*.46;if(W>=650)size=Math.min(size,W*.57);render();schedule();}
function point(e){const r=canvas.getBoundingClientRect();state.pointer={x:(e.clientX-r.left-cx)/size,y:(e.clientY-r.top-cy)/size};schedule();}
canvas.addEventListener('pointerdown',e=>{if(!ctx||paused||active!==null||e.button!==0)return;e.preventDefault();active=e.pointerId;canvas.focus({preventScroll:true});canvas.setPointerCapture(active);point(e);say('近くの図形が、寄り添います。');});
canvas.addEventListener('pointermove',e=>{if(!ctx||paused||(active!==null&&active!==e.pointerId))return;if(e.pointerType==='touch'&&active===null)return;point(e);});
canvas.addEventListener('pointerup',e=>{if(e.pointerId===active){cancel();say('余白が、元の場所へ。');}});
canvas.addEventListener('pointerleave',()=>{if(active===null)cancel();});
for(const name of ['pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{if(e.pointerId===active)cancel();});
canvas.addEventListener('blur',cancel);window.addEventListener('blur',cancel);
function setPause(value){paused=value;cancel();if(raf){cancelAnimationFrame(raf);raf=0;}last=0;pause.textContent=paused?'再生':'一時停止';pause.setAttribute('aria-pressed',String(paused));say(paused?'一時停止中':'図形の近くへ、ポインターを。');if(!paused)schedule();render();}
canvas.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();if(!e.repeat)setPause(!paused);}else if(e.key.startsWith('Arrow')&&!paused&&ctx){e.preventDefault();keyboard.x=Math.max(-.4,Math.min(.4,keyboard.x+(e.key==='ArrowRight'?.035:e.key==='ArrowLeft'?-.035:0)));keyboard.y=Math.max(-.32,Math.min(.32,keyboard.y+(e.key==='ArrowDown'?.035:e.key==='ArrowUp'?-.035:0)));state.pointer={...keyboard};say('矢印キーで磁力を移動中。Escapeで解放。');schedule();}});
pause.addEventListener('click',()=>setPause(!paused));
slider.addEventListener('input',()=>{state.strength=Number(slider.value);document.querySelector('output').value=state.strength.toFixed(2);schedule();});
document.querySelector('#reset').addEventListener('click',()=>{cancel();reset(state);keyboard={x:0,y:0};slider.value='1';document.querySelector('output').value='1.00';say('最初の構図に戻しました。');render();schedule();});
const panel=document.querySelector('#controls'),toggle=document.querySelector('#toggle');
function open(value){panel.hidden=!value;toggle.setAttribute('aria-expanded',String(value));toggle.setAttribute('aria-label',value?'調整UIを閉じる':'調整UIを開く');toggle.textContent=value?'−':'＋';cancel();}
toggle.addEventListener('click',()=>open(panel.hidden));document.querySelector('#close').addEventListener('click',()=>{open(false);toggle.focus();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){cancel();if(!panel.hidden){open(false);toggle.focus();}}});
document.addEventListener('visibilitychange',()=>{cancel();last=0;if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0;}else schedule();});
media.addEventListener('change',()=>{cancel();schedule();});window.addEventListener('resize',resize);
window.addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);raf=0;});
resize();if(!ctx)say('Canvas 2Dを利用できません。対応ブラウザーで開いてください。');
