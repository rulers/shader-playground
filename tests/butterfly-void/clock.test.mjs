import assert from 'node:assert/strict';
import {ArtworkClock} from '../../butterfly-void/clock.mjs';
import {createFlock,advance,whiteMode} from '../../butterfly-void/simulation.mjs';
const clock=new ArtworkClock(),state=createFlock(120,1);
clock.resume(1000);
for(let now=6000;now<=31000;now+=5000){
  advance(state,Math.min(clock.tick(now),.1));
  assert.equal(whiteMode('auto',clock.time),clock.time>=15&&clock.time<30);
}
assert.equal(clock.time,30);assert(state.time<.61,'flight integration remains bounded at 0.2fps');
clock.pause(31500);assert.equal(clock.time,30.5);
clock.pause(60000);assert.equal(clock.time,30.5,'repeated stops do not count hidden time');
clock.resume(90000);assert.equal(clock.tick(90500),.5);assert.equal(clock.time,31);
assert.equal(clock.tick(90000),0,'non-monotonic timestamp cannot rewind');
clock.pause(90500);clock.step(15);assert.equal(clock.time,46);
assert.equal(whiteMode('color',clock.time),false);assert.equal(whiteMode('white',clock.time),true);
clock.reset();assert.equal(clock.time,0);assert.equal(clock.last,null);
clock.resume(100000);clock.tick(115000);assert.equal(clock.time,15);
console.log('PASS: active real-time 15/30s at low fps, capped flight, pause/hidden/resume, manual modes, reset');
