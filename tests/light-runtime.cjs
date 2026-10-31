// Real Canvas rasterization + event stubs. Does not replace browser layout QA.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas}=require('@napi-rs/canvas');
for(const mobile of [false,true]){
 let now=0,next=0,frames=new Map();
 class El{constructor(){this.handlers={};this.attrs={};this.hidden=true;this.value='.96';this.textContent='';}addEventListener(k,f){(this.handlers[k]??=[]).push(f);}emit(k,e={}){for(const f of this.handlers[k]??[])f({preventDefault(){},...e});}setAttribute(k,v){this.attrs[k]=v;}focus(){}}
 const ids=['status','pause','amount','toggle','controls','close','reset','action'];const els=Object.fromEntries(ids.map(id=>[id,new El()]));els.output=new El();
 const doc=new El(),win=new El(),media=new El();media.matches=false;doc.hidden=false;
 const canvas=new El(),raster=createCanvas(1440,900);canvas.getContext=()=>raster.getContext('2d');
 for(const key of ['width','height'])Object.defineProperty(canvas,key,{get:()=>raster[key],set:v=>raster[key]=v});
 canvas.getBoundingClientRect=()=>({left:0,top:0,width:context.innerWidth,height:context.innerHeight});let capture=null;
 canvas.setPointerCapture=id=>capture=id;canvas.hasPointerCapture=id=>capture===id;canvas.releasePointerCapture=()=>{capture=null;};
 doc.querySelector=s=>s==='canvas'?canvas:s==='output'?els.output:els[s.slice(1)];
 const context={console,document:doc,innerWidth:mobile?390:1440,innerHeight:mobile?844:900,devicePixelRatio:3,matchMedia:()=>media,addEventListener:(...a)=>win.addEventListener(...a),requestAnimationFrame:f=>{frames.set(++next,f);return next;},cancelAnimationFrame:id=>frames.delete(id)};
 vm.runInNewContext(fs.readFileSync('light-sculpture/app.js','utf8'),context);
 const tick=n=>{for(let i=0;i<n;i++){now+=16.67;const pending=[...frames.values()];frames.clear();pending.forEach(f=>f(now));}};
 tick(3);assert.equal(canvas.width,context.innerWidth*2);
 const image=()=>raster.toBuffer('image/png');const initial=image();
 const down={pointerId:1,button:0,clientX:context.innerWidth*.68,clientY:context.innerHeight*.4};
 canvas.emit('pointerdown',{...down,button:2});assert.equal(capture,null);
 canvas.emit('pointerdown',down);tick(15);canvas.emit('pointermove',{...down,clientX:context.innerWidth*.75});tick(30);assert(!initial.equals(image()));
 doc.emit('keydown',{key:'Escape'});assert.equal(capture,null);
 canvas.emit('pointerdown',down);win.emit('blur');assert.equal(capture,null);
 els.pause.emit('click');tick(2);const frozen=image();tick(30);assert(frozen.equals(image()));
 els.amount.value='.89';els.reset.emit('click');assert.equal(els.amount.value,'0.96');assert.equal(els.pause.attrs['aria-pressed'],'true');
 canvas.emit('keydown',{code:'Space',repeat:true});assert.equal(els.pause.attrs['aria-pressed'],'true');
 canvas.emit('keydown',{code:'Space',repeat:false});assert.equal(els.pause.attrs['aria-pressed'],'false');
 els.toggle.emit('click');assert.equal(els.controls.hidden,false);doc.emit('keydown',{key:'Escape'});assert.equal(els.controls.hidden,true);
 canvas.emit('pointerdown',down);context.innerWidth=844;context.innerHeight=390;win.emit('resize');assert.equal(capture,null);tick(120);
 media.emit('change',{matches:true});tick(2);const reduced=image();tick(20);assert(reduced.equals(image()));
 doc.hidden=true;doc.emit('visibilitychange');assert.equal(frames.size,0);
 console.log((mobile?'mobile':'desktop')+': Canvas rendering, drag, Escape, capture release, reset, pause, keyboard repeat, resize, reduced motion PASS');
}
