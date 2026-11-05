// DOM-event harness with real Canvas rasterization; this is not a browser test.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
(async()=>{
 const model=await import('../model.mjs');
 for(const mobile of [false,true]){
 let now=0,next=0,frames=new Map();
 class El{constructor(){this.handlers={};this.attrs={};this.hidden=true;this.value='1';this.textContent='';}addEventListener(k,f){(this.handlers[k]??=[]).push(f);}emit(k,e={}){for(const f of this.handlers[k]??[])f({preventDefault(){},...e});}setAttribute(k,v){this.attrs[k]=v;}focus(){}}
 const ids=['status','pause','strength','toggle','controls','close','reset'];const els=Object.fromEntries(ids.map(id=>[id,new El()]));els.output=new El();
 const doc=new El(),win=new El(),media=new El();media.matches=false;doc.hidden=false;
 const canvas=new El(),raster=createCanvas(1440,900);canvas.getContext=()=>raster.getContext('2d');
 for(const key of ['width','height'])Object.defineProperty(canvas,key,{get:()=>raster[key],set:v=>raster[key]=v});
 canvas.getBoundingClientRect=()=>({left:0,top:0});let capture=null;
 canvas.setPointerCapture=id=>capture=id;canvas.hasPointerCapture=id=>capture===id;canvas.releasePointerCapture=()=>{capture=null;};
 doc.querySelector=s=>s==='canvas'?canvas:s==='output'?els.output:els[s.slice(1)];
 const context={...model,console,document:doc,window:win,innerWidth:mobile?390:1440,innerHeight:mobile?844:900,devicePixelRatio:3,matchMedia:()=>media,requestAnimationFrame:f=>{frames.set(++next,f);return next;},cancelAnimationFrame:id=>frames.delete(id)};
 const source=fs.readFileSync('magnetic-shapes/app.js','utf8').replace(/^import[^\n]+\n/,'');vm.runInNewContext(source,context);
 const tick=n=>{for(let i=0;i<n;i++){now+=16.67;const pending=[...frames.values()];frames.clear();pending.forEach(f=>f(now));}};
 assert(canvas.width<=1920);tick(2);
 if(!mobile)fs.writeFileSync('magnetic-shapes/preview.jpg',raster.toBuffer('image/jpeg'));
 const image=()=>raster.toBuffer('image/png');const initial=image();
 canvas.emit('pointermove',{pointerId:1,pointerType:'mouse',clientX:context.innerWidth*.56,clientY:context.innerHeight*.4});tick(60);assert(!initial.equals(image()));
 els.pause.emit('click');const frozen=image();tick(20);assert(frozen.equals(image()));
 canvas.emit('pointerdown',{pointerId:1,button:0,clientX:100,clientY:100});assert.equal(capture,null);
 els.reset.emit('click');assert.equal(els.pause.attrs['aria-pressed'],'true');els.pause.emit('click');
 canvas.emit('pointerdown',{pointerId:1,button:0,clientX:100,clientY:100});assert.equal(capture,1);
 canvas.emit('pointercancel',{pointerId:1});assert.equal(capture,null);
 canvas.emit('keydown',{key:'ArrowRight'});tick(20);doc.emit('keydown',{key:'Escape'});tick(500);assert.equal(frames.size,0);
 els.toggle.emit('click');assert.equal(els.controls.hidden,false);doc.emit('keydown',{key:'Escape'});assert.equal(els.controls.hidden,true);assert.equal(els.toggle.attrs['aria-expanded'],'false');
 media.matches=true;media.emit('change',{matches:true});canvas.emit('pointermove',{pointerId:1,pointerType:'mouse',clientX:context.innerWidth*.56,clientY:context.innerHeight*.4});tick(300);assert.equal(frames.size,0);canvas.emit('pointerleave');tick(300);
 doc.hidden=true;doc.emit('visibilitychange');assert.equal(frames.size,0);doc.hidden=false;doc.emit('visibilitychange');tick(5);
 context.innerWidth=844;context.innerHeight=390;win.emit('resize');tick(30);assert.equal(canvas.width,1266);
 console.log((mobile?'mobile':'desktop')+': real Canvas rendering, input, pause, cancellation, panel, reduced motion, resize PASS');
 }
})();
