import assert from 'node:assert/strict';
import {createFlock,advance,resetFlock,resizeFlock,setWind,CAMERA_Z} from '../../butterfly-void/simulation.mjs';
import {Opening} from '../../butterfly-void/opening.mjs';
import {createButterflies,SPECIES} from '../../butterfly-void/butterflies.js';
const TAN=Math.tan(Math.PI/8);
for(const [count,aspect] of [[180,1.6],[120,390/844]]) {
  const s=createFlock(count,aspect),sizes=Array.from(s.sizes),wings=Array.from(s.wing),types=Array.from(s.shapes);
  const op=new Opening(s),initial=Array.from(s.positions),starts=Array.from(op.starts),durations=Array.from(op.durations);
  assert.equal(s.count,count);assert.equal(op.visible,1);assert(op.active);
  const sorted=starts.slice().sort((a,b)=>a-b),intervals=sorted.slice(1).map((x,i)=>x-sorted[i]);
  assert.equal(sorted[0],0);assert(sorted.at(-1)<=1.400001);
  assert(Math.max(...intervals)<.07,'no long holes in the emission');
  assert(new Set(intervals.map(x=>x.toFixed(6))).size>count*.85,'intervals are irregular');
  assert(new Set(durations).size>count*.8);assert(new Set(op.initialVelocity.filter((_,i)=>i%3===2)).size===count);
  assert(starts.filter(x=>x<=.2).length>=5&&starts.filter(x=>x<=.2).length<15);
  for(let t=0;t<1.5;t+=1/60)assert(starts.filter(x=>x>=t&&x<t+1/60).length<=8,'no simultaneous mass release');
  for(let i=0;i<count;i++) {
    assert(s.positions[i*3+2]<=-31);assert(Math.hypot(s.positions[i*3],s.positions[i*3+1])<.5);
  }
  const system=createButterflies(s,{releaseTimes:op.starts});system.update(op.time);system.setViewport(800,op.floor);
  assert.equal(system.batches.reduce((sum,b)=>sum+b.geometry.instanceCount,0),1,'unreleased butterflies are not drawn');
  const lead=new Uint8Array(count*count);let passes=0,maxProjected=0,previousVisible=0;
  for(let tick=1;tick<=180;tick++) {
    op.advance(1/60);system.update(op.active?op.time:Infinity);
    assert(op.visible>=previousVisible);previousVisible=op.visible;
    assert.equal(system.batches.reduce((sum,b)=>sum+b.geometry.instanceCount,0),op.visible);
    for(let i=0;i<count;i++)if(op.starts[i]<=op.time){
      const k=i*3,h=(CAMERA_Z-s.positions[k+2])*TAN;
      assert(Number.isFinite(s.positions[k]+s.positions[k+1]+s.positions[k+2]+s.pose[i*2]));
      maxProjected=Math.max(maxProjected,Math.abs(s.positions[k])/(h*aspect),Math.abs(s.positions[k+1])/h);
      for(let j=0;j<count;j++)if(op.starts[j]>op.starts[i]+.08&&op.starts[j]<=op.time){
        const index=i*count+j,difference=s.positions[k+2]-s.positions[j*3+2];
        if(difference>.5)lead[index]=1;
        else if(difference<-.5&&lead[index]===1){passes++;lead[index]=2;}
      }
    }
  }
  assert(!op.active);assert.equal(op.visible,count);assert(passes>0,'later fast butterflies genuinely overtake earlier ones in z');
  assert(maxProjected<1.1,`opening stays within the view: ${maxProjected}`);
  assert.deepEqual(Array.from(s.sizes),sizes);assert.deepEqual(Array.from(s.wing),wings);assert.deepEqual(Array.from(s.shapes),types);
  const reference=structuredClone(s);
  for(let i=0;i<120;i++){op.advance(1/60);advance(reference,1/60);}
  assert.deepEqual(s,reference,'after completion use the exact existing flight simulation');
  resetFlock(s);op.reset();assert.deepEqual(Array.from(s.positions),initial);assert.deepEqual(Array.from(op.starts),starts);assert.deepEqual(Array.from(op.durations),durations);
  for(let i=0;i<48;i++)op.advance(1/60);
  const paused=Array.from(s.positions),progress=op.time;
  for(let i=0;i<20;i++)op.advance(1/60,0,0);
  assert.equal(op.time,progress);assert.deepEqual(Array.from(s.positions),paused,'activity zero freezes the entrance');
  const ratio=1.7;resizeFlock(s,s.aspect*ratio);op.resize(ratio);op.apply(0,1,0,0,0,0);
  for(let i=0;i<count;i++)assert(Math.abs(s.positions[i*3]-paused[i*3]*ratio)<.00002,'resize preserves normalized position');
  // Wind acts on the currently displayed particle, even at activity zero.
  const id=op.order[0],k=id*3,h=(CAMERA_Z-s.positions[k+2])*TAN;
  setWind(s,s.positions[k]/(h*s.aspect),s.positions[k+1]/h,4,1);
  const beforeX=s.positions[k];for(let i=0;i<12;i++)op.advance(1/60,0,1);
  assert(s.positions[k]>beforeX+.001);assert(s.gust[id*2]>0);
  system.dispose();
  console.log(`PASS: ${count} / ${aspect.toFixed(3)}: individual births, no waves, ${passes} overtakes, max view fraction ${maxProjected.toFixed(3)}, deterministic reset, resize, activity and wind, identical normal flight`);
}
// Sample both sides of handoff at a fine fixed step, including the changing z.
for(const rank of [0,60,119]){
  const s=createFlock(120,390/844),op=new Opening(s),id=op.order[rank],end=op.starts[id]+op.durations[id],eps=.0005;
  while(op.time<end-eps-1e-10)op.advance(Math.min(1/600,end-eps-op.time));
  const k=id*3,a=Array.from(s.positions.slice(k,k+3));
  op.advance(eps);const b=Array.from(s.positions.slice(k,k+3));assert.equal(op.mask[id],0);
  op.advance(eps);const c=Array.from(s.positions.slice(k,k+3));
  const before=b.map((x,i)=>(x-a[i])/eps),after=c.map((x,i)=>(x-b[i])/eps);
  assert(Math.hypot(...before.map((x,i)=>x-after[i]))<.35,`C1 handoff: ${before} -> ${after}`);
}
const staticState=createFlock(),initial=Array.from(staticState.positions),skipped=new Opening(staticState,false);
assert(!skipped.active);assert.deepEqual(Array.from(staticState.positions),initial);
console.log('PASS: position/velocity/depth continuity at early/middle/last handoffs; reduced-motion static composition');

// A slow frame caps the ordinary oscillator, while the entrance uses active
// elapsed time. A redraw or activity-zero frame must not reparameterize it.
const slowState=createFlock(),slowOpening=new Opening(slowState);
slowOpening.advance(.5);const slowPosition=Array.from(slowState.positions);
slowOpening.advance(0);assert.deepEqual(Array.from(slowState.positions),slowPosition);
slowOpening.advance(.5,0,0);assert.deepEqual(Array.from(slowState.positions),slowPosition);
console.log('PASS: slow-frame redraw and activity-zero entrance remain stationary');
