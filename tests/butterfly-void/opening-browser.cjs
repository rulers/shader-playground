// NODE_PATH=<playwright/pngjs modules> CHROMIUM_PATH=/usr/bin/chromium node tests/butterfly-void/opening-browser.cjs
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'../..'),out=path.join(__dirname,'captures/opening');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
 const target=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 const file=fs.existsSync(target)&&fs.statSync(target).isDirectory()?path.join(target,'index.html'):target;
 if(!fs.existsSync(file)){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 try{
 for(const [width,height] of [[1280,800],[390,844]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<600,hasTouch:width<600});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/butterfly-void/main.js',r=>r.fulfill({contentType:'text/javascript',body:"import {mount} from './app.js';window.__void=mount({initialPaused:true});"}));
  await page.goto(base+'/butterfly-void/');await page.waitForFunction(()=>window.__void&&!__void.snapshot().failed);
  const snap=()=>page.evaluate(()=>__void.snapshot());
  const pixels=()=>page.evaluate(()=>{__void.step(0);const c=document.querySelector('#view'),gl=c.getContext('webgl2'),data=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,data);let colored=0,minX=c.width,maxX=0,minY=c.height,maxY=0;for(let i=0;i<data.length;i+=4){if(Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])>40){colored++;const x=(i/4)%c.width,y=Math.floor(i/4/c.width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}return {colored,bounds:[minX,minY,maxX,maxY],error:gl.getError()};});
  const initial=await snap();assert.equal(initial.count,width<600?120:180);assert.equal(initial.opening.visible,1);
  const gpu=await page.evaluate(()=>{const gl=document.querySelector('#view').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);});
  const timeline=[];let last=0;
  for(const time of [.2,.8,1.5,2.5,3,5]){
   await page.evaluate(seconds=>{let rest=seconds;while(rest>1e-9){const dt=Math.min(rest,1/120);__void.step(dt,false);rest-=dt;}__void.step(0);},time-last);last=time;
   const s=await snap(),p=await pixels();assert.equal(p.error,0);assert(p.colored>10,'actual WebGL butterflies visible');
   assert.equal(s.opening.visible,s.opening.starts.filter(t=>t<=s.opening.time).length);
   assert.equal(s.memory.geometries,3);assert.equal(s.memory.textures,0);assert.equal(s.programs,1);assert(s.calls<=3);
   if(time>=3)assert.equal(s.opening.active,false);
   timeline.push({time,visible:s.opening.visible,active:s.opening.active,...p,calls:s.calls,triangles:s.triangles});
   await page.screenshot({path:path.join(out,`${width}-${time.toFixed(1)}.png`)});
  }
  assert(timeline[0].visible<15);assert(timeline[1].visible>initial.count*.4&&timeline[1].visible<initial.count*.7);
  assert.equal(timeline[2].visible,initial.count);
  // Reset and paused stepping reproduce the entrance, independently of draw rate.
  await page.evaluate(()=>{__void.reset();__void.step(.8);});const middle=await snap();
  await page.waitForTimeout(150);assert.deepEqual((await snap()).positions,middle.positions);assert.equal((await snap()).time,middle.time);
  // Resizing preserves projected x and elapsed emission time, without re-seeding.
  await page.setViewportSize({width:height,height:width});await page.waitForTimeout(70);
  const resized=await snap(),ratio=(height/width)/(width/height);assert.equal(resized.opening.time,middle.opening.time);
  for(let k=0;k<middle.positions.length;k+=3)assert(Math.abs(resized.positions[k]-middle.positions[k]*ratio)<.0001);
  await page.evaluate(()=>__void.step(0));const resizedDraw=await snap();for(let k=0;k<resized.positions.length;k++)assert(Math.abs(resizedDraw.positions[k]-resized.positions[k])<.00001);
  await page.setViewportSize({width,height});await page.waitForTimeout(70);
  // Context restoration preserves a partly emitted stream and its exact coordinates.
  const beforeLoss=await snap();const loss=await page.evaluate(()=>{window.__loss=document.querySelector('#view').getContext('webgl2').getExtension('WEBGL_lose_context');__loss?.loseContext();return !!__loss;});
  if(loss){await page.waitForFunction(()=>__void.snapshot().lost);await page.waitForTimeout(80);await page.evaluate(()=>__loss.restoreContext());await page.waitForFunction(()=>!__void.snapshot().lost);const restored=await snap();assert.deepEqual(restored.positions,beforeLoss.positions);assert.equal(restored.opening.time,beforeLoss.opening.time);assert.deepEqual(restored.memory,beforeLoss.memory);assert.equal((await pixels()).error,0);}
  // The application visibility contract, synthetic event in a real browser.
  await page.evaluate(()=>{__void.setPaused(false);Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  const hidden=await snap();await page.waitForTimeout(150);assert.deepEqual((await snap()).positions,hidden.positions);
  const resumed=await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));__void.setPaused(true);return __void.snapshot();});assert.equal(resumed.opening.time,hidden.opening.time);
  // UI activity zero freezes the entrance (wing clock remains the existing one).
  await page.evaluate(()=>{const a=document.querySelector('#activity');a.value='0';a.dispatchEvent(new Event('input'));});const still=await snap();await page.evaluate(()=>__void.step(.5));assert.deepEqual((await snap()).positions,still.positions);
  await page.locator('#toggle').click();await page.locator('#reset').click();assert.deepEqual((await snap()).positions,initial.positions);assert.equal((await snap()).opening.time,0);await page.keyboard.press('Escape');
  // Real mouse / CDP touch input during the entrance, then physics deterministically
  // stepped before the captured wind decays. No fabricated setWind/controller call.
  await page.evaluate(()=>{__void.step(.2);__void.setPaused(false);});
  if(width<600){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:width/2-15,y:height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:width/2+15,y:height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await page.mouse.move(width/2-25,height/2);await page.mouse.move(width/2+25,height/2);}
  // Pausing clears input by design, so sample at a rendered animation frame first.
  await page.waitForFunction(()=>Math.max(...__void.snapshot().gust.map(Math.abs))>.001,{},{timeout:5000});
  const windy=await snap();assert(windy.opening.active,'wind must affect the entrance, not only normal flight');await page.evaluate(()=>__void.setPaused(true));await page.screenshot({path:path.join(out,`${width}-wind.png`)});
  // Real keyboard pause/replay, reset, unchanged colour cycle and stable resources.
  await page.locator('#view').focus();await page.keyboard.press('Space');assert.equal((await snap()).paused,false);await page.keyboard.press('Space');assert.equal((await snap()).paused,true);
  await page.evaluate(()=>{__void.reset();__void.step(15.01);});assert.equal((await snap()).white,true);assert.equal((await snap()).opening.active,false);
  await page.evaluate(()=>__void.step(15));assert.equal((await snap()).white,false);
  const memory=(await snap()).memory;await page.evaluate(()=>{for(let i=0;i<240;i++)__void.step(1/60,false);__void.step(0);});assert.deepEqual((await snap()).memory,memory);
  if(process.env.RECORD_OPENING_VIDEO&&width===1280){
   const frames=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'void-opening-'));
   try{
    await page.evaluate(()=>__void.reset());
    for(let frame=0;frame<=150;frame++){
     await page.evaluate(frame=>{if(frame)for(let i=0;i<4;i++)__void.step(1/120,false);__void.step(0);},frame);
     await page.screenshot({path:path.join(frames,String(frame).padStart(3,'0')+'.png')});
    }
    require('node:child_process').execFileSync('ffmpeg',['-loglevel','error','-y','-framerate','30','-i',path.join(frames,'%03d.png'),'-c:v','libx264','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,'opening.mp4')]);
   }finally{fs.rmSync(frames,{recursive:true,force:true});}
  }
  assert.equal(errors.length,0,errors.join('\n'));results.push({viewport:[width,height],gpu,software:/swiftshader|llvmpipe/i.test(gpu),timeline,contextRestored:loss,windDuringOpening:Math.max(...windy.gust.map(Math.abs)),memory,errors});await context.close();
 }
 const reduced=await browser.newPage({reducedMotion:'reduce'});await reduced.route('**/butterfly-void/main.js',r=>r.fulfill({contentType:'text/javascript',body:"import {mount} from './app.js';window.__void=mount();"}));await reduced.goto(base+'/butterfly-void/');await reduced.waitForFunction(()=>window.__void);const r=await reduced.evaluate(()=>__void.snapshot());assert(r.paused&&!r.opening.active);assert.equal(r.opening.visible,r.count);await reduced.close();
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({browser:await browser.version(),method:'Real WebGL2 / SwiftShader; deterministic 120Hz simulation steps for captures, not a frame-rate measurement. Visibility event is synthetic.',results},null,2));console.log(JSON.stringify(results,null,2));console.log('PASS opening browser: timeline, real pixels, lifecycle, wind input, reduced motion, colour cycle, resources');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
