import assert from 'node:assert/strict';
import { createFlock, advance, resetFlock, resizeFlock, setWind, whiteMode, HALF_HEIGHT, CAMERA_Z } from '../../butterfly-void/simulation.mjs';
for(const [count,aspect] of [[180,1.6],[144,390/844]]) {
  const s=createFlock(count,aspect), initial=Array.from(s.positions), sizes=Array.from(s.sizes);
  assert.equal(s.count,count);assert(new Set(s.wing).size>count);
  assert.equal(new Set(s.shapes).size,3);
  const poses={front:0,oblique:0,side:0};
  for(let i=0;i<count;i++) {
    const yaw=Math.abs(s.pose[i*2+1]);poses[yaw<.4?'front':yaw>1.05?'side':'oblique']++;
    const heading=Math.atan2(-s.velocity[i*3],s.velocity[i*3+1]);
    assert(Math.abs(Math.atan2(Math.sin(heading-s.pose[i*2]),Math.cos(heading-s.pose[i*2])))<1e-6);
  }
  assert(Object.values(poses).every(n=>n>count*.12));
  let largestStep=0;
  for(let frame=0;frame<60*120;frame++) {
    const previous=Array.from(s.positions);advance(s,1/60,1.8,1.5);
    for(let i=0;i<count;i++) {
      const k=i*3,h=HALF_HEIGHT*(CAMERA_Z-s.positions[k+2])/CAMERA_Z;
      assert(Number.isFinite(s.positions[k]+s.positions[k+1]+s.pose[i*2]));
      assert(Math.abs(s.positions[k])<=h*aspect*.981&&Math.abs(s.positions[k+1])<=h*.981);
      largestStep=Math.max(largestStep,Math.hypot(s.positions[k]-previous[k],s.positions[k+1]-previous[k+1]));
    }
  }
  assert(largestStep<.12,'no teleportation');
  resetFlock(s);assert.deepEqual(Array.from(s.positions),initial);assert.deepEqual(Array.from(s.sizes),sizes);
  resizeFlock(s,2);resetFlock(s);assert.equal(s.aspect,2);
  console.log(`${count} / aspect ${aspect.toFixed(3)}: deterministic spacing, 3 shapes/depths, poses ${JSON.stringify(poses)}, aligned headings, 120s bounded flight, max step ${largestStep.toFixed(4)} PASS`);
}
assert.equal(whiteMode('auto',0),false);assert.equal(whiteMode('auto',14.999),false);assert.equal(whiteMode('auto',15),true);assert.equal(whiteMode('auto',29.999),true);assert.equal(whiteMode('auto',30),false);assert.equal(whiteMode('color',19),false);assert.equal(whiteMode('white',0),true);
const near=createFlock(3),far=createFlock(3),disabled=createFlock(3);
for(const s of [near,far,disabled]){s.positions[0]=0;s.positions[1]=0;}
setWind(near,0,0,4,0);setWind(far,1,1,4,0);setWind(disabled,0,0,4,0);
for(let i=0;i<30;i++){advance(near,1/60,0,1);advance(far,1/60,0,1);advance(disabled,1/60,0,0);}
assert(near.gust[0]>.01);assert(Math.abs(far.gust[0])<near.gust[0]*.01);assert.equal(disabled.gust[0],0);
for(let i=0;i<600;i++)advance(near,1/60,0,1);
assert(Math.abs(near.gust[0])<1e-7);assert(Math.abs(near.wind.vx)<1e-7);
console.log('15/30s auto/manual modes, local wind, zero strength, damping and normal-flight recovery PASS');

for(const aspect of [1.6,390/844]) {
  const s=createFlock(aspect>1?180:144,aspect);
  for(let i=0;i<1020;i++)advance(s,1/60);
  let rim=0;
  for(let i=0;i<s.count;i++){const k=i*3,h=HALF_HEIGHT*(CAMERA_Z-s.positions[k+2])/CAMERA_Z;if(Math.abs(s.positions[k])/(h*aspect)>.78||Math.abs(s.positions[k+1])/h>.78)rim++;}
  assert(rim<s.count*.35, 'flight must not become parked around the rim');
  console.log(`17s composition / aspect ${aspect.toFixed(3)}: ${rim}/${s.count} near rim PASS`);
}
