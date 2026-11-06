// Same machine / browser / software GPU before-and-after comparison.
// node tests/butterfly-void/performance.cjs ROOT OUTPUT.json
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(process.argv[2]||'.'),output=process.argv[3]||'tests/butterfly-void/captures/performance.json';
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const results=[];
 for(const [width,height] of [[1280,800],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  await page.route('**/butterfly-void/main.js',r=>r.fulfill({contentType:'text/javascript',body:"import {mount} from './app.js';window.__void=mount({initialPaused:true,opening:false});"}));
  // Lock the comparison to DPR 1; production's adaptive resolution remains enabled.
  await page.route('**/butterfly-void/app.js',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'butterfly-void/app.js'),'utf8').replace('if(samples>=180)','if(false&&samples>=180)')}));
  await page.goto(`http://127.0.0.1:${server.address().port}/butterfly-void/index.html`);
  await page.waitForFunction(()=>window.__void&&!__void.snapshot().failed);
  const measured=await page.evaluate(async()=>{
   const gl=document.querySelector('#view').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');
   const gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
   __void.setPaused(false);
   const frames=await new Promise(resolve=>{
    let start=null,last=null;const times=[];
    function count(now){if(start===null)start=now;if(last!==null&&now-start>=2000)times.push(now-last);last=now;
     if(now-start<8000)requestAnimationFrame(count);else resolve(times);}
    requestAnimationFrame(count);
   });
   __void.setPaused(true);const s=__void.snapshot();
   return {gpu,software:/swiftshader|llvmpipe|software/i.test(gpu),triangles:s.triangles,count:s.count,calls:s.calls,pixelRatio:s.pixelRatio,memory:s.memory,
    fps:frames.length*1000/frames.reduce((a,b)=>a+b,0)};
  });
  results.push({viewport:[width,height],...measured});await page.close();
 }
 const report={browser:await browser.version(),platform:process.platform,method:'2s warmup + 6s rAF, active foreground, DPR 1 locked in test only',results};
 fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
