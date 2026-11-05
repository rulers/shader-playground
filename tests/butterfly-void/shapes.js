import * as THREE from '../../third_party/three/three.module.js';
import { createFlock } from '../../butterfly-void/simulation.mjs';
import { createButterflies, SPECIES } from '../../butterfly-void/butterflies.js';
const W=900,H=900,state=createFlock(9,1),scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-4.5,4.5,4.5,-4.5,.1,30);camera.position.z=12;
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#renderer'),antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(W,H,false);renderer.setClearColor('#000');renderer.outputColorSpace=THREE.SRGBColorSpace;
for(let row=0;row<3;row++)for(let col=0;col<3;col++){
 const id=row*3+col;state.shapes[id]=row;state.sizes[id]=1.5;
 state.positions.set([-3+col*3,2.9-row*2.9,0],id*3);state.pose.set([0,[0,.68,Math.PI/2][col]],id*2);
 state.wing.set([-Math.PI/2,7,1,.3],id*4);
}
const butterflies=createButterflies(state);scene.add(butterflies.mesh);
const sheet=document.querySelector('#sheet');sheet.width=W*2;sheet.height=H+60;const ctx=sheet.getContext('2d');
const modes=Array.from({length:2},()=>{const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;return canvas;});
let playing=false,raf=0;
function render(time=0,readback=true){
 butterflies.material.uniforms.uTime.value=time;butterflies.update();
 for(let white=0;white<2;white++){
  butterflies.material.uniforms.uWhite.value=white;renderer.render(scene,camera);
  modes[white].getContext('2d').drawImage(renderer.domElement,0,0);
 }
 ctx.fillStyle='#111';ctx.fillRect(0,0,sheet.width,sheet.height);
 modes.forEach((canvas,i)=>ctx.drawImage(canvas,i*W,60));
 ctx.fillStyle='#ddd';ctx.font='16px sans-serif';ctx.textAlign='center';
 for(let col=0;col<6;col++)ctx.fillText(`${col<3?'COLOR':'WHITE'} / ${['FRONT','OBLIQUE','PROFILE 90°'][col%3]}`,150+col*300,30);
 ctx.textAlign='left';ctx.font='15px sans-serif';
 for(let mode=0;mode<2;mode++)SPECIES.forEach((s,row)=>{ctx.fillStyle='#aaa';ctx.fillText(s.id,mode*W+12,row*290+86);});
 if(!readback)return;
 return {width:W,height:H,color:modes[0].toDataURL(),white:modes[1].toDataURL(),sheet:sheet.toDataURL(),glError:renderer.getContext().getError()};
}
function frame(now){render(now/1000,false);if(playing)raf=requestAnimationFrame(frame);}
document.querySelector('#play').onclick=()=>{playing=!playing;document.querySelector('#play').textContent=playing?'停止':'羽ばたきを再生';if(playing)raf=requestAnimationFrame(frame);else cancelAnimationFrame(raf);};
window.shapeTest={render,setProfileYaw(yaw){for(let row=0;row<3;row++)state.pose[(row*3+2)*2+1]=yaw;},dispose(){cancelAnimationFrame(raf);butterflies.dispose();renderer.dispose();}};
render(0,false);document.querySelector('#status').textContent='描画完了 · 停止状態（翅を開いた位相）';
