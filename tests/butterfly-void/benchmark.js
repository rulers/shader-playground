import { mount } from '../../butterfly-void/app.js';

const report=document.querySelector('#report');
const source=new DOMParser().parseFromString(await (await fetch('../../butterfly-void/index.html')).text(),'text/html');
for(const node of [...source.body.children])if(node.tagName!=='SCRIPT')document.body.append(node);
const app=mount({initialPaused:true,opening:false}),canvas=document.querySelector('#view');
const gl=canvas.getContext('webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info');
const gpu=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
const software=/swiftshader|llvmpipe|software/i.test(gpu);
function publish(value){report.textContent=JSON.stringify(value,null,2);report.dataset.status='done';}
document.querySelector('#measure').onclick=()=>{
  report.dataset.status='running';report.textContent='測定中…';app.reset();app.setMode('color');app.setPaused(false);
  let start=null,previous=null;const durations=[];
  function sample(now){
    if(start===null)start=now;
    if(now-start>=2000&&previous!==null)durations.push(now-previous);
    previous=now;
    if(now-start<8000){requestAnimationFrame(sample);return;}
    app.setPaused(true);
    const s=app.snapshot(),total=durations.reduce((a,b)=>a+b,0),sorted=[...durations].sort((a,b)=>a-b);
    publish({viewport:[innerWidth,innerHeight],gpu,software,frames:durations.length,seconds:total/1000,fps:durations.length*1000/total,frameP95Ms:sorted[Math.floor(sorted.length*.95)],count:s.count,triangles:s.triangles,calls:s.calls,memory:s.memory,pixelRatio:s.pixelRatio,artTime:s.time,simulationTime:s.simulationTime??s.time});
  }
  requestAnimationFrame(sample);
};
document.querySelector('#verify').onclick=()=>{
  const errors=[];const check=(yes,message)=>{if(!yes)errors.push(message);};
  app.setPaused(true);app.reset();const initial=app.snapshot();
  // A single 15-second active interval must switch colour even though flight
  // integration is capped. This fails on the former shared capped clock.
  app.step(15.01);let s=app.snapshot();check(s.white,'15-second active interval must enter white');
  app.step(15);s=app.snapshot();check(!s.white,'30-second active interval must return to colour');
  app.setMode('white');check(app.snapshot().white,'manual white');app.setMode('color');check(!app.snapshot().white,'manual colour');
  app.reset();s=app.snapshot();check(s.time===0,'reset clock');check(JSON.stringify(s.positions)===JSON.stringify(initial.positions),'reset flight');
  check(s.calls===3&&s.memory.geometries===3&&s.memory.textures===0&&s.programs===1,'instance resources');
  publish({checks:errors.length?'fail':'pass',errors,gpu,software,initial:{time:s.time,simulationTime:s.simulationTime,count:s.count,triangles:s.triangles,calls:s.calls,memory:s.memory,programs:s.programs}});
};
publish({ready:true,viewport:[innerWidth,innerHeight],gpu,software,triangles:app.snapshot().triangles});
