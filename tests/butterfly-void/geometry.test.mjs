import assert from 'node:assert/strict';
import {createFlock} from '../../butterfly-void/simulation.mjs';
import {createButterflies,createSpeciesGeometry,SPECIES} from '../../butterfly-void/butterflies.js';
const signatures=[];
for(let species=0;species<3;species++){
 const geometry=createSpeciesGeometry(species);geometry.computeBoundingBox();
 assert(geometry.getIndex().count>300);assert(geometry.boundingBox.max.z-geometry.boundingBox.min.z>.08,'real body and staggered wings need depth');
 const p=geometry.getAttribute('position'),part=geometry.getAttribute('aPart');let tail=Infinity;
 for(let i=0;i<p.count;i++)if(part.getX(i)===1)tail=Math.min(tail,p.getY(i));
 if(species===0)assert(tail<-.65,'Papilio has an actual tail');else assert(tail>-.53,'other species are tailless');
 signatures.push(JSON.stringify(Array.from(p.array)));geometry.dispose();
}
assert.equal(new Set(signatures).size,3,'actual topology differs, not just a per-instance scale');
for(const aspect of [1.6,390/844]){
 const state=createFlock(180,aspect),system=createButterflies(state);
 assert.equal(system.mesh.children.length,3);assert.equal(system.geometries.length,3);assert.equal(new Set(system.mesh.children.map(m=>m.material)).size,1);
 assert.equal(system.batches.reduce((n,b)=>n+b.geometry.instanceCount,0),180);
 assert.deepEqual(system.mesh.children.map(m=>m.name),SPECIES.map(s=>s.id));
 state.positions[0]+=.25;state.pose[0]+=.13;system.update();
 const batch=system.batches.find(b=>b.ids.includes(0)),j=batch.ids.indexOf(0);
 assert.equal(batch.attributes.iPosition.array[j*3],state.positions[0]);assert.equal(batch.attributes.iPose.array[j*2],state.pose[0]);
 system.setViewport(844);
 for(const b of system.batches)assert(Array.from(b.attributes.iSize.array).every(n=>Number.isFinite(n)&&n>0));
 let geometries=0,materials=0;for(const g of system.geometries)g.addEventListener('dispose',()=>geometries++);system.material.addEventListener('dispose',()=>materials++);
 system.dispose();assert.equal(geometries,3);assert.equal(materials,1);
}
console.log('PASS: 3 genuine outlines, Papilio tail only, volumetric body, species batches, state synchronization, distant-size floor, shared material and disposal');
