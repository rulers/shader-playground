// npm install --no-save playwright pngjs; npx playwright install chromium
// CHROMIUM_PATH=/usr/bin/chromium node tests/butterfly-void/browser.cjs
const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'../..'),out=process.env.VOID_CAPTURE_DIR||path.join(root,'tests/butterfly-void/captures');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
 const target=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 const file=fs.existsSync(target)&&fs.statSync(target).isDirectory()?path.join(target,'index.html'):target;
 if(!fs.existsSync(file)){res.writeHead(404);return res.end();}
 const ext=path.extname(file);res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.html':'text/html'})[ext]||'application/octet-stream');res.end(fs.readFileSync(file));
});
function pixelStats(image){let active=0,colored=0,white=0;const hues=new Set();
 for(let i=0;i<image.length;i+=4){const r=image[i],g=image[i+1],b=image[i+2],max=Math.max(r,g,b),min=Math.min(r,g,b);if(max>20){active++;if(max-min>40){colored++;hues.add(r>=g&&r>=b?'red':g>=r&&g>=b?'green':'blue');}if(min>240&&max-min<4)white++;}}
 return {active,colored,white,hues:[...hues],blackFraction:1-active/(image.length/4)};
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 try{
 for(const [width,height] of [[1280,800],[390,844]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<600,isMobile:width<600});
  const page=await context.newPage(),errors=[],warnings=[],readbackWarnings=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')(/GPU stall due to ReadPixels/.test(m.text())?readbackWarnings:warnings).push(m.text());});
  page.on('request',r=>requests.push(r.url()));
  await page.route('**/butterfly-void/main.js',r=>r.fulfill({contentType:'text/javascript',body:"import {mount} from './app.js';window.__void=mount({initialPaused:true,opening:false});"}));
  await page.goto(base+'/butterfly-void/');await page.waitForFunction(()=>window.__void&&!__void.snapshot().failed);
  const snapshot=()=>page.evaluate(()=>__void.snapshot());
  async function pixels(){return page.evaluate(()=>{
   __void.step(0);const c=document.querySelector('#view'),gl=c.getContext('webgl2'),data=new Uint8Array(c.width*c.height*4);
   gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,data);
   let hash=2166136261;for(let i=0;i<data.length;i++)hash=Math.imul(hash^data[i],16777619);
   const copy=document.createElement('canvas');copy.width=c.width;copy.height=c.height;const ctx=copy.getContext('2d'),img=ctx.createImageData(c.width,c.height);img.data.set(data);ctx.putImageData(img,0,0);
   return {hash:hash>>>0,png:copy.toDataURL(),error:gl.getError()};
  });}
  const gpu=await page.evaluate(()=>{const gl=document.querySelector('#view').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);});
  const initial=await snapshot();assert.equal(initial.count,width<600?120:180);assert.equal(initial.calls,3);assert.equal(initial.memory.geometries,3);assert.equal(initial.memory.textures,0);assert.equal(initial.programs,1);
  const initPixels=await pixels();assert.equal(initPixels.error,0);const initialStats=pixelStats(PNG.sync.read(Buffer.from(initPixels.png.split(',')[1],'base64')).data);
  assert(initialStats.active>1500,'must render visible butterflies, not just black');assert(initialStats.colored>initialStats.active*.30);assert.equal(initialStats.hues.length,3);assert(initialStats.blackFraction>.75,'preserve the black void');
  await page.screenshot({path:path.join(out,`${width}-initial.png`)});
  if(process.env.RECORD_PREVIEW&&width===1280)await page.screenshot({path:path.join(root,'butterfly-void/preview.jpg'),type:'jpeg',quality:85});
  await page.evaluate(()=>{for(let i=0;i<40;i++)__void.step(.05,false);});const colorPixels=await pixels();assert.notEqual(colorPixels.hash,initPixels.hash,'positions and wing silhouettes animate');
  await page.screenshot({path:path.join(out,`${width}-color.png`)});
  await page.evaluate(()=>{for(let i=0;i<262;i++)__void.step(.05,false);});assert.equal((await snapshot()).white,true);
  const whitePixels=await pixels(),whiteStats=pixelStats(PNG.sync.read(Buffer.from(whitePixels.png.split(',')[1],'base64')).data);
  await page.screenshot({path:path.join(out,`${width}-white.png`)});
  assert(whiteStats.white>whiteStats.active*.75,'white mode must draw solid white silhouettes (allow antialiased edges)');assert.equal(whiteStats.colored,0);
  await page.evaluate(()=>{for(let i=0;i<300;i++)__void.step(.05,false);});assert.equal((await snapshot()).white,false,'30s loop returns to color');
  // One low-fps-sized active interval still advances colour, not flight.
  await page.evaluate(()=>{__void.reset();__void.step(15.01);});
  assert.equal((await snapshot()).white,true);assert((await snapshot()).simulationTime<.11);
  await page.evaluate(()=>__void.step(15));assert.equal((await snapshot()).white,false);
  // Manual mode through the real UI, including keyboard focus.
  await page.locator('#toggle').click();await page.locator('#mode').selectOption('white');assert.equal((await snapshot()).white,true);
  await page.locator('#mode').selectOption('color');assert.equal((await snapshot()).white,false);
  await page.locator('#activity').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#activity-value').textContent(),'1.05');
  await page.locator('#reset').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#controls').isVisible(),false);assert.equal(await page.locator('#toggle').getAttribute('aria-expanded'),'false');
  assert.deepEqual((await snapshot()).positions,initial.positions);assert.equal((await pixels()).hash,initPixels.hash,'reset reuses buffers and reproduces the initial rendered frame');
  const frozen=(await pixels()).hash,pausedTime=(await snapshot()).time;await page.waitForTimeout(150);assert.equal((await pixels()).hash,frozen);assert.equal((await snapshot()).time,pausedTime);
  await page.locator('#view').focus();await page.keyboard.press('Space');assert.equal((await snapshot()).paused,false);await page.waitForFunction(()=>__void.snapshot().time>0);assert((await snapshot()).time>0);
  // Aim at a currently visible butterfly, rather than relying on one fixed
  // gesture crossing an incidental initial layout. Input is still real pointer/touch.
  const target=await page.evaluate(()=>{
   const s=__void.snapshot(),aspect=innerWidth/innerHeight;let best=Infinity,result;
   for(let i=0;i<s.count;i++){const k=i*3,h=(26-s.positions[k+2])*Math.tan(Math.PI/8),x=s.positions[k]/(h*aspect),y=s.positions[k+1]/h,score=x*x+y*y;
    if(score<best){best=score;result={x:(x+1)*innerWidth/2,y:(1-y)*innerHeight/2};}}
   return result;
  });
  if(width<600){
   const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:target.x-35,y:target.y}]});
   for(let i=0;i<12;i++){await page.waitForTimeout(16);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:target.x-35+i*6,y:target.y}]});}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{
   await page.mouse.move(target.x-65,target.y);
   for(let i=0;i<14;i++){await page.waitForTimeout(16);await page.mouse.move(target.x-65+i*10,target.y);}
  }
  await page.waitForFunction(()=>Math.max(...__void.snapshot().gust.map(Math.abs))>.015);
  const windy=await snapshot();assert(Math.max(...windy.gust.map(Math.abs))>.015,`pointer/touch wind in ${width}x${height}: ${JSON.stringify(windy.wind)}`);
  await page.screenshot({path:path.join(out,`${width}-wind.png`)});
  // Reset a running, wind-disturbed flock after changing flight/color controls. Capture
  // the UI handler's result in the same task, before the next animation frame.
  const resetAfterWind=await page.evaluate(()=>{
   const input=(id,value,event)=>{const element=document.getElementById(id);element.value=value;element.dispatchEvent(new Event(event,{bubbles:true}));};
   input('activity','1.7','input');input('wind','1.4','input');input('mode','white','change');
   const before=__void.snapshot();document.getElementById('reset').click();
   return {before,after:__void.snapshot(),controls:['activity','wind','mode'].map(id=>document.getElementById(id).value),labels:['activity-value','wind-value'].map(id=>document.getElementById(id).textContent)};
  });
  assert.equal(resetAfterWind.before.mode,'white');assert.equal(resetAfterWind.before.white,true);assert(resetAfterWind.before.time>0);
  assert(resetAfterWind.before.gust.some(value=>value!==0),'reset starts with wind-disturbed butterflies');
  const resetState=resetAfterWind.after;
  assert.equal(resetState.time,0);assert.equal(resetState.simulationTime,0);assert.equal(resetState.mode,'auto');assert.equal(resetState.white,false);
  for(const key of ['positions','velocity','pose','wing','sizes'])assert.deepEqual(resetState[key],initial[key],`reset restores ${key}`);
  assert(resetState.gust.every(value=>value===0));assert.equal(resetState.wind.vx,0);assert.equal(resetState.wind.vy,0);
  assert.equal(resetState.wind.x,resetAfterWind.before.wind.x);assert.equal(resetState.wind.y,resetAfterWind.before.wind.y);
  assert.equal(resetState.count,initial.count);assert.equal(resetState.paused,false,'reset preserves playback');
  assert.deepEqual(resetAfterWind.controls,['1','0.8','auto']);assert.deepEqual(resetAfterWind.labels,['1.00','0.80']);
  await page.keyboard.press('Space');assert.equal((await snapshot()).paused,true);const memory=(await snapshot()).memory;
  await page.evaluate(()=>{for(let i=0;i<240;i++)__void.step(1/60);});assert.deepEqual((await snapshot()).memory,memory,'no accumulating geometries or textures');
  // Browser-driven context loss and recovery (the extension may be absent on some GPUs).
  const extension=await page.evaluate(()=>{const e=document.querySelector('#view').getContext('webgl2').getExtension('WEBGL_lose_context');window.__lose=e;e?.loseContext();return !!e;});
  if(extension){await page.waitForFunction(()=>__void.snapshot().lost);await page.waitForTimeout(100);await page.evaluate(()=>__lose.restoreContext());await page.waitForFunction(()=>!__void.snapshot().lost);await page.evaluate(()=>__void.reset());assert.equal((await pixels()).hash,initPixels.hash);}
  // Synthetic visibility event exercises the application contract in this real browser.
  await page.evaluate(()=>{__void.setPaused(false);Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  const hiddenTime=(await snapshot()).time;await page.waitForTimeout(120);assert.equal((await snapshot()).time,hiddenTime);
  assert.equal(await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));return __void.snapshot().time;}),hiddenTime,'resume excludes hidden wall time');await page.waitForFunction(t=>__void.snapshot().time>t,hiddenTime);assert((await snapshot()).time>hiddenTime);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>__void.snapshot().paused);await page.locator('#view').focus();await page.keyboard.press('Space');assert.equal((await snapshot()).paused,false);
  await page.setViewportSize({width:height,height:width});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.setViewportSize({width,height});await page.waitForTimeout(100);
  const fps=await page.evaluate(()=>new Promise(resolve=>{let n=0,start=performance.now();function count(now){n++;if(now-start>=1800)resolve(n*1000/(now-start));else requestAnimationFrame(count);}requestAnimationFrame(count);}));
  assert.equal(await page.evaluate(()=>document.querySelector('#view').getContext('webgl2').getError()),0);
  const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');const metrics=await cdp.send('Performance.getMetrics');const heap=metrics.metrics.find(m=>m.name==='JSHeapUsedSize')?.value;
  assert.equal(errors.length,0,errors.join('\n'));assert.equal(warnings.length,0,warnings.join('\n'));assert(requests.every(url=>url.startsWith(base)),'no third-party requests or stock footage');
  await page.evaluate(()=>__void.dispose());assert.equal((await snapshot()).disposed,true);
  await page.waitForTimeout(100);assert.equal(errors.length,0,errors.join('\n'));assert.equal(warnings.length,0,warnings.join('\n'));
  results.push({viewport:`${width}x${height}`,gpu,software:/swiftshader|llvmpipe|software/i.test(gpu),count:initial.count,calls:initial.calls,triangles:initial.triangles,initialStats,whiteStats,softwareFps:Number(fps.toFixed(1)),heapBytes:heap,contextRestored:extension,errors,warnings,readbackWarnings});
  await context.close();
 }
 // Production entry point really auto-plays, without any test replacement.
 const prod=await browser.newPage({viewport:{width:1280,height:800}});await prod.goto(base+'/butterfly-void/');await prod.waitForFunction(()=>document.querySelector('#status').textContent.includes('色彩の群れ'));
 assert.equal(await prod.locator('#pause').getAttribute('aria-pressed'),'false');await prod.close();
 const reduced=await browser.newPage({reducedMotion:'reduce'});await reduced.goto(base+'/butterfly-void/');await reduced.waitForFunction(()=>document.querySelector('#status').textContent.includes('静止中'));assert.equal(await reduced.locator('#pause').getAttribute('aria-pressed'),'true');await reduced.close();
 const noGL=await browser.newPage();await noGL.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};});await noGL.goto(base+'/butterfly-void/');await noGL.waitForFunction(()=>!document.querySelector('#fallback').hidden);assert.match(await noGL.locator('#fallback').textContent(),/WebGL 2/);await noGL.close();
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({browser:await browser.version(),renderer:'Chromium ANGLE / SwiftShader (software GPU)',results},null,2));console.log(JSON.stringify(results,null,2));console.log('PASS: real browser pixels, animation/modes, mouse/touch wind, UI, reset, lifecycle, context recovery, GPU resources, reduced motion and WebGL fallback');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
