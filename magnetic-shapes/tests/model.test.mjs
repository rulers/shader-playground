import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createState,step,reset,moving} from '../model.mjs';
test('local attraction moves nearby pieces more, release restores the composition',()=>{
 const s=createState(),near=s.pieces[0],far=s.pieces[5];s.pointer={x:near.x+.08,y:near.y};
 for(let i=0;i<240;i++)step(s,1/120);
 assert(Math.hypot(near.x-near.hx,near.y-near.hy)>Math.hypot(far.x-far.hx,far.y-far.hy)*2);
 s.pointer=null;for(let i=0;i<1200;i++)step(s,1/120);assert(!moving(s));
});
test('coincident positions and long interaction remain finite and bounded',()=>{
 const s=createState();s.pieces.forEach(a=>{a.x=0;a.y=0;});
 for(let i=0;i<10000;i++){
  s.pointer={x:Math.sin(i*.01)*.4,y:Math.cos(i*.01)*.3};step(s,1/120);
  s.pieces.forEach(a=>{for(const key of ['x','y','vx','vy','turn'])assert(Number.isFinite(a[key]));assert(Math.abs(a.x)<=.44&&Math.abs(a.y)<=.36);});
 }
});
test('zero strength leaves the initial poster untouched; reset is reproducible',()=>{
 const s=createState();s.strength=0;s.pointer={x:-.2,y:-.2};for(let i=0;i<240;i++)step(s,1/120);
 s.pieces.forEach(a=>{assert.equal(a.x,a.hx);assert.equal(a.y,a.hy);});
 reset(s);assert.deepEqual(s,createState());
});
