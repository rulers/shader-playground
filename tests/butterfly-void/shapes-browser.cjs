// NODE_PATH=... CHROMIUM_PATH=/usr/bin/chromium node tests/butterfly-void/shapes-browser.cjs
// RECORD_SHAPES=1 writes baselines; inspect both sheets before accepting them.
const {chromium}=require('playwright'),{PNG}=require('pngjs');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(__dirname,'captures'),fixtures=path.join(__dirname,'fixtures');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(fixtures,{recursive:true});
const server=http.createServer((req,res)=>{
 const p=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(!p.startsWith(root+path.sep)||!fs.existsSync(p)){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png'})[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p));
});
function decode(url){return PNG.sync.read(Buffer.from(url.split(',')[1],'base64'));}
function cell(image,row,col){const x=col*300,y=row*290+10,w=300,h=285,mask=new Uint8Array(w*h);let x0=w,y0=h,x1=0,y1=0,area=0;
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){const k=((y+j)*image.width+x+i)*4;if(image.data[k]>128){mask[j*w+i]=1;area++;x0=Math.min(x0,i);y0=Math.min(y0,j);x1=Math.max(x1,i);y1=Math.max(y1,j);}}
 const width=x1-x0+1,height=y1-y0+1,normalized=new Uint8Array(128*128);
 for(let j=0;j<128;j++)for(let i=0;i<128;i++)normalized[j*128+i]=mask[(y0+Math.min(height-1,Math.floor(j*height/128)))*w+x0+Math.min(width-1,Math.floor(i*width/128))];
 const remaining=mask.slice(),stack=new Int32Array(mask.length);let largest=0;
 for(let start=0;start<remaining.length;start++){
  if(!remaining[start])continue;let top=0,size=0;stack[top++]=start;remaining[start]=0;
  while(top){const k=stack[--top],x=k%w,y=Math.floor(k/w);size++;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h){const q=(y+dy)*w+x+dx;if(remaining[q]){remaining[q]=0;stack[top++]=q;}}
  }
  largest=Math.max(largest,size);
 }
 return {width,height,area,normalized,connected:largest/Math.max(area,1)};
}
function iou(a,b){let intersection=0,union=0;for(let i=0;i<a.length;i++){intersection+=a[i]&b[i];union+=a[i]|b[i];}return intersection/Math.max(union,1);}
function compare(a,b,rect={x:0,y:0,w:a.width,h:a.height}){let changed=0,active=0,total=0;
 for(let y=rect.y;y<rect.y+rect.h;y++)for(let x=rect.x;x<rect.x+rect.w;x++){const i=(y*a.width+x)*4;const relevant=Math.max(a.data[i],a.data[i+1],a.data[i+2],b.data[i],b.data[i+1],b.data[i+2])>20;if(!relevant)continue;active++;let delta=0;for(let c=0;c<3;c++){delta=Math.max(delta,Math.abs(a.data[i+c]-b.data[i+c]));total+=Math.abs(a.data[i+c]-b.data[i+c]);}if(delta>24)changed++;}
 return {pass:active>200&&changed/active<.07&&total/(active*3)<4,changed:changed/active,mean:total/(active*3)};
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[],page=await browser.newPage({viewport:{width:1400,height:1100}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errors.push(m.text());});
 try{
 await page.goto(`http://127.0.0.1:${server.address().port}/tests/butterfly-void/shapes.html`);await page.waitForFunction(()=>window.shapeTest);
 const report={browser:await browser.version(),renderer:'ANGLE / SwiftShader (software)',cells:[],overlaps:[]};
 const frame=async time=>{const r=await page.evaluate(t=>shapeTest.render(t),time);assert.equal(r.glError,0);return {raw:r,color:decode(r.color),white:decode(r.white),sheet:decode(r.sheet)};};
 const initial=await frame(0);
 for(const [name,image] of [['color',initial.color],['white',initial.white]])fs.writeFileSync(path.join(out,`shapes-${name}.png`),PNG.sync.write(image));
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){
  const metric=cell(initial.white,row,col);assert(metric.area>400);assert(metric.width>=16&&metric.height>=85,'profile must have an actual wing/body silhouette, not a line');
  assert(metric.connected>.95,'wing roots must remain attached to the body');
  report.cells.push({species:row,view:col,width:metric.width,height:metric.height,area:metric.area,connected:metric.connected});
 }
 for(let view=0;view<3;view++)for(let a=0;a<3;a++)for(let b=a+1;b<3;b++){
  const score=iou(cell(initial.white,a,view).normalized,cell(initial.white,b,view).normalized);
  report.overlaps.push({view,a,b,iou:score});assert(score<.92,`species ${a}/${b} have the same normalized silhouette in view ${view}: ${score}`);
 }
 assert.equal(iou(cell(initial.white,0,0).normalized,cell(initial.white,0,0).normalized),1,'identical-shape negative control');
 // Features in the colour render are tested only inside the true white silhouette.
 for(let row=0;row<3;row++){
  let dark=0,cyan=0,ivory=0,chromatic=0,area=0;
  for(let y=row*290+10;y<row*290+295;y++)for(let x=0;x<300;x++){
   const k=(y*900+x)*4;if(initial.white.data[k]<200)continue;area++;
   const [r,g,b]=initial.color.data.subarray(k,k+3),max=Math.max(r,g,b),min=Math.min(r,g,b);
   if(max<90)dark++;if(g>100&&b>90&&r<g*.55)cyan++;if(r>170&&g>170&&b>140)ivory++;if(max-min>45)chromatic++;
  }
  assert(dark>area*.025,'species needs actual dark margins/markings');
  if(row===0)assert(chromatic>area*.25);if(row===1)assert(cyan>area*.12);if(row===2)assert(ivory>area*.40);
 }
 const phases=[0,Math.PI/14,Math.PI/7,3*Math.PI/14];
 for(let i=0;i<phases.length;i++){
  const f=i===0?initial:await frame(phases[i]);
  for(let row=0;row<3;row++)for(let col=0;col<3;col++){const m=cell(f.white,row,col);assert(m.area>350&&m.width>=16&&m.height>70,'shape collapsed during a wing stroke');assert(m.connected>.95,'a wing detached during a wing stroke');}
  if(i===0||i===2){const name=i===0?'shapes-open.png':'shapes-folded.png';fs.writeFileSync(path.join(out,name),PNG.sync.write(f.sheet));const baseline=path.join(fixtures,name);
   if(process.env.RECORD_SHAPES)fs.writeFileSync(baseline,PNG.sync.write(f.sheet));
   else{assert(fs.existsSync(baseline),'missing reviewed baseline; use RECORD_SHAPES=1, inspect, then rerun');const expected=PNG.sync.read(fs.readFileSync(baseline));
    for(let row=0;row<3;row++)for(let col=0;col<6;col++){
      const rect={x:col*300,y:row*290+70,w:300,h:285},result=compare(f.sheet,expected,rect);
      assert(result.pass,`${name}/${row}/${col}: ${JSON.stringify(result)}`);
    }
    const blank=PNG.sync.read(fs.readFileSync(baseline));
    for(let y=70;y<355;y++)for(let x=0;x<300;x++)for(let c=0;c<4;c++)blank.data[(y*blank.width+x)*4+c]=0;
    assert(!compare(blank,expected,{x:0,y:70,w:300,h:285}).pass,'missing-one-butterfly negative control must fail');}
  }
 }
 for(let i=0;i<=8;i++){
  await page.evaluate(yaw=>shapeTest.setProfileYaw(yaw),i/8*Math.PI/2);const f=await frame(.13);
  for(let row=0;row<3;row++){const m=cell(f.white,row,2);assert(m.width>=16&&m.area>350,'continuous front/profile rotation collapsed');assert(m.connected>.95,'a wing detached during continuous yaw');}
 }
 await page.evaluate(()=>shapeTest.dispose());await page.waitForTimeout(100);assert.deepEqual(errors,[]);
 report.errors=errors;fs.writeFileSync(path.join(out,'shapes-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));console.log('PASS: 18 cells, normalized species silhouettes, pattern features, 4 stroke phases, continuous yaw, actual shaders and GPU disposal');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
