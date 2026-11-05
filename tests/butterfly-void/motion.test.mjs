import assert from 'node:assert/strict';
import {createFlock,advance,resetFlock,CAMERA_Z,HALF_HEIGHT} from '../../butterfly-void/simulation.mjs';

for(const aspect of [1.6,390/844]){
 const s=createFlock(aspect>1?180:120,aspect),initial=Array.from(s.positions);
 const distance=new Float64Array(s.count),depthRange=new Float64Array(s.count);
 const minDepth=Float32Array.from(s.depth),maxDepth=Float32Array.from(s.depth);
 const last=Float32Array.from(s.positions),minSpeed=new Float64Array(s.count).fill(Infinity),maxSpeed=new Float64Array(s.count);
 let turns=0;
 for(let frame=0;frame<60*6;frame++){
  const goals=Float32Array.from(s.goal);advance(s,1/60);
  for(let i=0;i<s.count;i++){
   const k=i*3,h=HALF_HEIGHT*(CAMERA_Z-s.positions[k+2])/CAMERA_Z;
   const step=Math.hypot(s.positions[k]-last[k],s.positions[k+1]-last[k+1]);
   distance[i]+=step/h;minDepth[i]=Math.min(minDepth[i],s.positions[k+2]);maxDepth[i]=Math.max(maxDepth[i],s.positions[k+2]);
   const speed=step*60;minSpeed[i]=Math.min(minSpeed[i],speed);maxSpeed[i]=Math.max(maxSpeed[i],speed);
   if(goals[i]!==s.goal[i])turns++;
  }
  last.set(s.positions);
 }
 const sorted=Array.from(distance).sort((a,b)=>a-b),median=sorted[Math.floor(s.count/2)];
 assert(median>.65&&median<2.5,'visible, bounded travel over six seconds, rather than slow drifting');
 assert(turns>s.count*2,'individual routes change several times during the clip');
 let varied=0;
 for(let i=0;i<s.count;i++){
  depthRange[i]=maxDepth[i]-minDepth[i];assert(depthRange[i]>.5&&depthRange[i]<=2.701);
  if(maxSpeed[i]-minSpeed[i]>.6)varied++;
  const hz=s.wing[i*4+1]/(Math.PI*2);assert(hz>=2&&hz<4);
 }
 assert(varied>s.count*.9,'individual acceleration and deceleration must remain visible');
 const frozen=Array.from(s.positions),frozenTime=s.flightTime;
 for(let i=0;i<120;i++)advance(s,1/60,0,0);
 assert.deepEqual(Array.from(s.positions),frozen,'activity zero freezes x/y/depth');assert.equal(s.flightTime,frozenTime);
 resetFlock(s);assert.deepEqual(Array.from(s.positions),initial);assert.equal(s.flightTime,0);
 console.log(`PASS: aspect ${aspect.toFixed(3)}, median projected 6s travel ${median.toFixed(3)}, ${turns} route changes, acceleration/depth, faster individual flaps, zero activity and reset`);
}
