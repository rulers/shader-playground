// Real-time comparison using the published version's flight, not reference-video frames.
// CHROMIUM_PATH=... node tests/butterfly-void/motion-browser.cjs OUTPUT_DIRECTORY
const {chromium}=require('playwright');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.resolve(process.argv[2]||path.join(__dirname,'captures'));
const before=execFileSync('git',['show','a04118f:butterfly-void/simulation.mjs'],{cwd:root,encoding:'utf8'});
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:440},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/motion-review.html',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><title>Motion comparison</title><style>body{margin:0;background:#000}iframe{position:absolute;top:40px;border:0;width:640px;height:400px}#after{left:640px}canvas{display:none}</style><iframe id="before" src="butterfly-void/index.html?before"></iframe><iframe id="after" src="butterfly-void/index.html?after"></iframe><canvas width="1280" height="440"></canvas>`}));
 await page.route('**/butterfly-void/main.js',r=>r.fulfill({contentType:'text/javascript',body:"import {mount} from './app.js';window.__void=mount({initialPaused:true});"}));
 await page.route('**/butterfly-void/app.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'butterfly-void/app.js'),'utf8').replace('antialias:true,alpha:false','antialias:true,alpha:false,preserveDrawingBuffer:true')}));
 await page.route('**/butterfly-void/simulation.mjs',r=>r.fulfill({contentType:'text/javascript',body:r.request().frame().url().endsWith('?before')?before:fs.readFileSync(path.join(root,'butterfly-void/simulation.mjs'),'utf8')}));
 await page.goto(`http://127.0.0.1:${server.address().port}/motion-review.html`);
 await page.waitForFunction(()=>[...document.querySelectorAll('iframe')].every(f=>f.contentWindow.__void));
 const result=await page.evaluate(async()=>{
  const frames=[...document.querySelectorAll('iframe')],canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
  const controllers=frames.map(f=>f.contentWindow.__void),gl=frames[1].contentDocument.querySelector('#view').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');
  const gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
  function draw(){ctx.fillStyle='#000';ctx.fillRect(0,0,1280,440);ctx.fillStyle='#eee';ctx.font='18px sans-serif';ctx.fillText('BEFORE / published a04118f',20,27);ctx.fillText('AFTER / quicker flaps, swoops & turns',660,27);frames.forEach((f,i)=>ctx.drawImage(f.contentDocument.querySelector('#view'),i*640,40,640,400));}
  draw();const mime=['video/mp4;codecs=avc1.42001E','video/webm;codecs=vp9','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));
  const stream=canvas.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5000000}),chunks=[];
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  const complete=new Promise(resolve=>recorder.onstop=resolve);let recording=true,n=0;
  function frame(){draw();n++;if(recording)requestAnimationFrame(frame);}
  controllers.forEach(c=>{c.reset();c.setMode('color');c.setPaused(false);});recorder.start();requestAnimationFrame(frame);
  await new Promise(r=>setTimeout(r,6000));controllers.forEach(c=>c.setPaused(true));recording=false;draw();recorder.stop();await complete;stream.getTracks().forEach(t=>t.stop());
  const blob=new Blob(chunks,{type:mime}),data=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});
  const pixels=ctx.getImageData(0,40,1280,400).data,active=[0,0];
  for(let i=0;i<pixels.length;i+=4)if(Math.max(pixels[i],pixels[i+1],pixels[i+2])>30)active[(i/4)%1280<640?0:1]++;
  return {data,mime,frames:n,gpu,active,snapshots:controllers.map(c=>({count:c.snapshot().count,time:c.snapshot().time,triangles:c.snapshot().triangles,calls:c.snapshot().calls})),still:canvas.toDataURL()};
 });
 assert.deepEqual(errors,[]);assert(result.frames>120,'comparison must run in real time');
 assert(result.active.every(n=>n>500),'both sides must contain actual rendered butterflies');
 const extension=result.mime.startsWith('video/mp4')?'mp4':'webm';
 fs.writeFileSync(path.join(out,`butterfly-void-motion-comparison.${extension}`),Buffer.from(result.data.split(',')[1],'base64'));
 fs.writeFileSync(path.join(out,'butterfly-void-motion-comparison.png'),Buffer.from(result.still.split(',')[1],'base64'));
 delete result.data;delete result.still;fs.writeFileSync(path.join(out,'butterfly-void-motion-browser.json'),JSON.stringify({browser:await browser.version(),...result,errors},null,2));
 console.log(JSON.stringify(result));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
