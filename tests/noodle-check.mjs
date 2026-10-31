import fs from 'node:fs';
import assert from 'node:assert/strict';
const {mountNoodles}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('assets/noodle-engine.js','utf8')).toString('base64'));
for(const mode of ['day','night']) {
 let now=0,frame,draws=0;
 class El {constructor(){this.listeners={};this.attrs={};this.value='1';this.textContent='';this.hidden=true;this.output={value:''};this.parentElement={querySelector:()=>this.output};} addEventListener(k,f){(this.listeners[k]??=[]).push(f)} emit(k,e={}){for(const f of this.listeners[k]??[])f({preventDefault(){},...e})}dispatchEvent(e){this.emit(e.type,e)}setAttribute(k,v){this.attrs[k]=v}focus(){} }
 const ids=['noodles','state-label','control-speed','control-elasticity','control-influence','pause','settings-toggle','settings-panel','settings-close','reset'];
 const els=Object.fromEntries(ids.map(id=>[id,new El()]));const canvas=els.noodles;
 const ctx=new Proxy({},{get:(t,k)=>t[k]??((...args)=>{for(const v of args)if(typeof v==='number')assert(Number.isFinite(v),k+' nonfinite');if(k==='fillRect')draws++}),set:(t,k,v)=>{t[k]=v;return true}});
 canvas.getContext=()=>ctx;canvas.getBoundingClientRect=()=>({left:0,top:0});let capture=null;canvas.setPointerCapture=id=>capture=id;canvas.hasPointerCapture=id=>capture===id;canvas.releasePointerCapture=()=>{capture=null;canvas.emit('lostpointercapture')};
 const doc=new El(),win=new El(),media=new El();media.matches=false;doc.hidden=false;doc.querySelector=s=>els[s.slice(1)];
 Object.assign(globalThis,{document:doc,window:win,innerWidth:1000,innerHeight:700,devicePixelRatio:3,matchMedia:()=>media,requestAnimationFrame:f=>frame=f,performance:{now:()=>now}});
 mountNoodles({mode}); const tick=n=>{for(let i=0;i<n;i++){now+=16.67;frame(now)}};
 assert.equal(canvas.width,2000);tick(60);
 els['settings-toggle'].emit('click');assert.equal(els['settings-panel'].hidden,false);
 els.pause.emit('click');let before=draws;tick(20);assert.equal(draws,before);els.pause.emit('click');
 const down={pointerId:1,button:0,clientX:500,clientY:150};canvas.emit('pointerdown',down);tick(100);
 if(mode==='night')assert.match(els['state-label'].textContent,/HOLD/);
 canvas.emit('pointercancel');canvas.emit('pointerup',down);assert.notEqual(els['state-label'].textContent,'DISCO!');assert.equal(capture,null);
 canvas.emit('pointerdown',down);tick(100);canvas.emit('pointerup',down);if(mode==='night')assert.equal(els['state-label'].textContent,'DISCO!');tick(700);
 globalThis.innerWidth=390;globalThis.innerHeight=844;win.emit('resize');assert.equal(canvas.width,780);tick(100);
 media.emit('change',{matches:true});tick(200);before=draws;tick(20);assert.equal(draws,before,'reduced motion idle must stop drawing');
 els.reset.emit('click');tick(200);assert.equal(els['control-speed'].value,1);
 console.log(mode+': finite simulation, DPR, resize, pause, panel, cancellation, release and reduced motion PASS');
}
