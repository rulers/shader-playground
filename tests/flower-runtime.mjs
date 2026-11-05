// Lifecycle tests use real Three.js scene objects and a renderer stub.
// Real WebGL rendering is checked separately in the browser.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as Three from '../third_party/three/three.module.js';
import { random } from '../flower-butterflies/painting.js';
import { resetFlight, updateFlight, decayWind, resizeFlight } from '../flower-butterflies/flight.js';
import { SPECIES, createButterfly, poseButterfly } from '../flower-butterflies/butterfly.js';
import { createFlockLayout } from '../flower-butterflies/flock.js';

const source = fs.readFileSync(new URL('../flower-butterflies/app.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
for (const [viewportWidth, viewportHeight] of [[390, 844], [1280, 800]]) for (const reduced of [false, true]) {
  class Element {
    constructor() { this.events = {}; this.attrs = {}; this.textContent = ''; this.hidden = true; }
    addEventListener(name, fn) { (this.events[name] ??= []).push(fn); }
    emit(name, event = {}) { for (const fn of this.events[name] ?? []) fn({ target: this, preventDefault() {}, ...event }); }
    setAttribute(name, value) { this.attrs[name] = value; }
    focus() { doc.activeElement = this; }
  }
  const elements = Object.fromEntries(['view', 'pause', 'reset', 'hide', 'status', 'toggle', 'controls', 'close', 'activity', 'wind', 'activity-value', 'wind-value'].map(id => [id, new Element()]));
  elements.activity.value = '.55'; elements.wind.value = '.8';
  const doc = new Element(), media = new Element(), win = new Element();
  const classes = new Set();
  doc.querySelector = selector => elements[selector.slice(1)]; doc.hidden = false;
  doc.body = { classList: { toggle(name) { if (classes.has(name)) { classes.delete(name); return false; } classes.add(name); return true; }, remove(name) { classes.delete(name); } } };
  media.matches = reduced;
  let captured = null;
  elements.view.getBoundingClientRect = () => ({ left: 0, top: 0, width: context.innerWidth, height: context.innerHeight });
  elements.view.setPointerCapture = id => { captured = id; };
  elements.view.hasPointerCapture = id => captured === id;
  elements.view.releasePointerCapture = () => { captured = null; };
  let next = 0, time = 0, renders = 0, snapshot, groups, disposed = false, geometryDisposals = 0, textureDisposals = 0;
  const frames = new Map(), timers = new Map();
  const flushTimers = () => { const pending = [...timers.values()]; timers.clear(); for (const fn of pending) fn(); };
  class Renderer {
    setSize() {} setPixelRatio() {} dispose() { disposed = true; }
    render(scene) {
      renders++;
      groups = scene.children.filter(child => child.isGroup);
      assert.equal(groups.length, 17);
      assert.deepEqual(groups.map(g => g.name).filter((v, i, all) => all.indexOf(v) === i).sort(), SPECIES.map(s => s.id).sort());
      assert.deepEqual(SPECIES.map(s => groups.filter(g => g.name === s.id).length), [6, 6, 5]);
      for (const group of groups) assert(group.position.toArray().every(Number.isFinite));
      for (const group of groups) assert.equal(group.children.filter(c => /-(fore|hind)$/.test(c.name)).length, 4);
      for (const group of groups) assert(group.children[0].position.z > group.children[1].position.z, 'forewing overlaps hindwing in depth');
      snapshot = JSON.stringify(groups.map(group => [group.position.toArray(), group.rotation.toArray(), group.children.slice(0, 4).map(c => c.rotation.toArray())]));
    }
  }
  const context = {
    THREE: { ...Three, WebGLRenderer: Renderer }, document: doc, matchMedia: () => media,
    innerWidth: viewportWidth, innerHeight: viewportHeight, devicePixelRatio: 3, console,
    createPainting: () => ({ canvas: { width: 390, height: 844 }, targets: [{ x: -2, y: -4 }, { x: 2, y: -5 }] }),
    wingTexture: () => ({ width: 384, height: 640 }), random, resetFlight, updateFlight, decayWind, resizeFlight,
    SPECIES, createButterfly, poseButterfly, createFlockLayout,
    addEventListener: (...args) => win.addEventListener(...args),
    setTimeout(fn) { timers.set(++next, fn); return next; }, clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(fn) { frames.set(++next, fn); return next; }, cancelAnimationFrame(id) { frames.delete(id); }
  };
  const tick = (count = 1, millis = 16.67) => { for (let i = 0; i < count; i++) { time += millis; const pending = [...frames.values()]; frames.clear(); for (const fn of pending) fn(time); } };
  vm.runInNewContext(source, context);
  assert.equal(elements.pause.attrs['aria-pressed'], String(reduced));
  assert.equal(frames.size, reduced ? 0 : 1);
  const resetSnapshot = snapshot;
  elements.toggle.emit('click'); assert.equal(elements.controls.hidden, false); assert.equal(elements.toggle.attrs['aria-expanded'], 'true'); assert.equal(doc.activeElement, elements.close);
  elements.close.emit('click'); assert.equal(elements.controls.hidden, true); assert.equal(doc.activeElement, elements.toggle);
  if (reduced) elements.pause.emit('click');
  tick(); const initial = snapshot; tick(); assert.notEqual(snapshot, initial);
  elements.pause.emit('click'); assert.equal(frames.size, 0);
  const frozen = snapshot; tick(); assert.equal(snapshot, frozen);
  elements.reset.emit('click'); assert.equal(frames.size, 0); assert.equal(elements.pause.attrs['aria-pressed'], 'true');
  assert.equal(snapshot, resetSnapshot, 'reset restores the seeded initial pose');
  elements.hide.emit('click', { currentTarget: elements.hide }); assert(classes.has('quiet'));
  doc.emit('keydown', { key: 'Escape' }); assert(!classes.has('quiet'));
  elements.pause.emit('click'); doc.hidden = true; doc.emit('visibilitychange'); assert.equal(frames.size, 0);
  doc.hidden = false; doc.emit('visibilitychange'); assert.equal(frames.size, 1);
  media.emit('change', { matches: true }); assert.equal(frames.size, 0);
  elements.pause.emit('click');
  const contextPose = snapshot;
  elements.view.emit('webglcontextlost'); assert.equal(frames.size, 0);
  elements.view.emit('webglcontextrestored'); assert.equal(frames.size, 0, 'wait for Three.js context restoration');
  flushTimers(); assert.equal(frames.size, 1); assert.equal(snapshot, contextPose, 'same-size context restore preserves pose');
  // Zero activity freezes the normal flight, making wind displacement measurable.
  elements.activity.value = '0'; elements.activity.emit('input'); assert.equal(elements['activity-value'].textContent, '0.00');
  elements.wind.value = '1.5'; elements.wind.emit('input'); assert.equal(elements['wind-value'].textContent, '1.50');
  tick(30);
  const position = groups[0].position.clone(), rect = elements.view.getBoundingClientRect();
  const x = (position.x / (16 * rect.width / rect.height) + .5) * rect.width;
  const y = (.5 - position.y / 16) * rect.height;
  const mouse = { pointerId: 1, pointerType: 'mouse', isPrimary: true, clientX: x, clientY: y, timeStamp: 100 };
  elements.view.emit('pointermove', mouse);
  elements.view.emit('pointermove', { ...mouse, clientX: x + 30, timeStamp: 132 }); tick(30);
  assert(groups[0].position.distanceTo(position) > .005, 'mouse gust displaces nearby butterfly');
  assert(groups[0].position.distanceTo(position) < .8, 'gust is bounded');
  tick(1200); assert(groups[0].position.distanceTo(position) < .0001, 'wind decays and butterfly returns to normal flight');
  const touch = { ...mouse, pointerId: 2, pointerType: 'touch', button: 0, timeStamp: 200 };
  elements.view.emit('pointerdown', touch); assert.equal(captured, 2);
  elements.view.emit('pointermove', { ...touch, clientX: x - 30, timeStamp: 232 }); tick(30);
  assert(groups[0].position.distanceTo(position) > .005, 'touch gust displaces butterfly');
  elements.view.emit('pointercancel', touch); assert.equal(captured, null);
  elements.pause.emit('click'); const pausePosition = groups[0].position.clone();
  elements.view.emit('pointermove', { ...mouse, clientX: x + 100, timeStamp: 500 }); tick(30);
  assert.equal(groups[0].position.distanceTo(pausePosition), 0, 'paused input is ignored');
  elements.reset.emit('click'); assert.equal(elements.activity.value, '.55'); assert.equal(elements.wind.value, '.8'); assert.equal(snapshot, resetSnapshot);
  elements.pause.emit('click');
  context.innerWidth = 1280; context.innerHeight = 800; win.emit('resize'); flushTimers();
  assert(renders > 5);
  const sameObjects = [...groups], resizedLayout = createFlockLayout(17, 16 * 1280 / 800);
  elements.reset.emit('click');
  groups.forEach((group, i) => {
    assert.equal(group, sameObjects[i], 'reset reuses model objects');
    assert.equal(group.position.x, resizedLayout[i].x); assert.equal(group.position.y, resizedLayout[i].y);
    assert.equal(group.rotation.z, resizedLayout[i].heading); assert.equal(group.rotation.y, resizedLayout[i].yaw);
    assert.equal(group.scale.x, resizedLayout[i].scale);
  });
  const beforeLostResize = renders;
  elements.view.emit('webglcontextlost'); context.innerWidth = 844; context.innerHeight = 390;
  win.emit('resize'); flushTimers(); assert.equal(renders, beforeLostResize, 'no rendering while context is lost');
  elements.view.emit('webglcontextrestored'); flushTimers(); assert.equal(frames.size, 1);
  doc.emit('keydown', { code: 'Space', repeat: true, target: { tagName: 'BODY' } }); assert.equal(frames.size, 1);
  doc.emit('keydown', { code: 'Space', repeat: false, target: { tagName: 'BODY' } }); assert.equal(frames.size, 0);
  elements.toggle.emit('click'); doc.emit('keydown', { key: 'Escape' }); assert.equal(elements.controls.hidden, true);
  for (const group of groups) group.traverse(object => {
    object.geometry?.addEventListener('dispose', () => geometryDisposals++);
    object.material?.map?.addEventListener('dispose', () => textureDisposals++);
  });
  win.emit('pagehide', { persisted: true }); assert.equal(disposed, false);
  win.emit('pageshow', { persisted: true }); assert.equal(frames.size, 0, 'bfcache preserves pause');
  win.emit('pagehide', { persisted: false }); assert(disposed && geometryDisposals > 0 && textureDisposals > 0);
  console.log(`${viewportWidth}x${viewportHeight}, reduced-motion=${reduced}: 17 butterflies, animation, pause/reset, mouse/touch wind, decay, UI/settings, resize, visibility, context recovery, GPU disposal PASS`);
}

// Behavior, locality, stability and normal-flight return, independent of DOM stubs.
const flowers = [{ x: -2, y: -4 }, { x: 2, y: -5 }], wind = { x: 0, y: 0, vx: 0, vy: 0 };
const initialFlock = createFlockLayout(17, 9);
const flock = initialFlock.map((spawn, i) => { const b = {}; resetFlight(b, i, 9, flowers, spawn); return b; });
const states = new Set(), attitudes = Array.from({ length: 17 }, () => new Set()); let visits = 0;
for (let tick = 0; tick < 36000; tick++) {
  for (const b of flock) {
    const x = b.x, y = b.y;
    updateFlight(b, 1 / 60, 1, 9, flowers, wind, 1); states.add(b.state);
    const yaw = Math.abs(b.yaw);
    attitudes[flock.indexOf(b)].add(yaw < .35 ? 'front' : yaw > 1.05 ? b.yaw < 0 ? 'left' : 'right' : 'oblique');
    assert(Number.isFinite(b.x + b.y + b.flap));
    assert(Math.hypot(b.x - x, b.y - y) < .03, 'no teleport on state transition');
    assert(Math.abs(b.x) <= 4.05 && b.y >= -7.4 && b.y <= 6.5);
  }
}
for (const state of ['flap', 'glide', 'descend', 'approach', 'rest']) assert(states.has(state), state);
visits = flock.reduce((sum, b) => sum + b.visits, 0); assert(visits > 10);
assert(new Set(flock.map(b => b.wingRate)).size === 17);
for (const views of attitudes) for (const view of ['front', 'oblique', 'left', 'right']) assert(views.has(view), `flight attitude ${view}`);
const near = {}, far = {}, disabled = {};
for (const b of [near, far, disabled]) resetFlight(b, 0, 9, flowers, initialFlock[0]);
far.x += 8; wind.x = near.x; wind.y = near.y; wind.vx = 3;
for (let i = 0; i < 30; i++) {
  updateFlight(near, 1 / 60, 0, 30, flowers, wind, 1);
  updateFlight(far, 1 / 60, 0, 30, flowers, wind, 1);
  updateFlight(disabled, 1 / 60, 0, 30, flowers, wind, 0);
  decayWind(wind, 1 / 60);
}
assert(near.offsetX > .01 && far.offsetX < near.offsetX * .01); assert.equal(disabled.offsetX, 0);
for (let i = 0; i < 1200; i++) { updateFlight(near, 1 / 60, 0, 30, flowers, wind, 1); decayWind(wind, 1 / 60); }
assert(Math.abs(near.offsetX) < .0001 && Math.abs(wind.vx) < .0001);
console.log(`flight: all five behaviors, ${visits} flower visits, individual variation, bounded movement, wind locality/zero strength/decay PASS`);
console.log('attitude: every butterfly shows front, oblique, left and right views in flight PASS');
const turning = {};
resetFlight(turning, 0, 9, flowers, initialFlock[0]);
Object.assign(turning, { x: 0, y: 0, vx: .002, vy: -.3, goalX: .02, goalY: -5, heading: Math.PI - .01, state: 'glide', remaining: 100 });
const previousHeading = turning.heading;
updateFlight(turning, 1 / 60, 1, 9, flowers, { x: 0, y: 0, vx: 0, vy: 0 }, 0);
assert(Math.abs(turning.heading - previousHeading) < .02, 'heading follows shortest turn across ±pi');
const heldHeading = turning.heading, heldYaw = turning.yaw;
updateFlight(turning, 1 / 60, 0, 9, flowers, { x: 0, y: 0, vx: 0, vy: 0 }, 0);
assert.equal(turning.heading, heldHeading); assert.equal(turning.yaw, heldYaw);
console.log('attitude: shortest-angle turn and low-speed heading stability PASS');

for (const [pixelsWide, pixelsHigh] of [[390, 844], [1280, 800]]) {
  const width = 16 * pixelsWide / pixelsHigh, layout = createFlockLayout(17, width);
  assert.deepEqual(layout, createFlockLayout(17, width), 'deterministic composition');
  const count = pose => layout.filter(b => b.pose === pose).length;
  assert.deepEqual([count('side'), count('oblique'), count('front')], [7, 7, 3]);
  let minimumGap = Infinity;
  for (let i = 0; i < layout.length; i++) {
    const b = layout[i];
    assert.equal(b.species, initialFlock[i].species); assert.equal(b.size, initialFlock[i].size); assert.equal(b.pose, initialFlock[i].pose);
    const direction = Math.atan2(-b.vx, b.vy);
    assert(Math.abs(Math.atan2(Math.sin(direction - b.heading), Math.cos(direction - b.heading))) < 1e-12);
    const gx = b.goalX - b.x, gy = b.goalY - b.y;
    assert(Math.abs(gx * b.vy - gy * b.vx) < 1e-12 && gx * b.vx + gy * b.vy > 0, 'goal continues initial velocity');
    assert(Math.abs(b.goalX) <= width * .43 && b.goalY >= -5.8 && b.goalY <= 6.3, 'first goal remains inside the flight bounds');
    assert(Math.abs(b.flap - (.14 + (1 + Math.sin(b.phase)) * .525)) < 1e-12, 'initial wing pose matches its stroke phase');
    const category = Math.abs(b.yaw) > 1.05 ? 'side' : Math.abs(b.yaw) < .35 ? 'front' : 'oblique';
    assert.equal(category, b.pose);
    assert(Math.abs(b.x) + b.radius < width / 2 && Math.abs(b.y) + b.radius < 8, 'whole silhouette is inside viewport');
    const material = new Three.MeshBasicMaterial();
    const model = createButterfly(b.species, { fore: material, hind: material });
    model.group.scale.setScalar(b.scale);
    Object.assign(model, b, { offsetX: 0, offsetY: 0, bank: 0 });
    poseButterfly(model); model.group.updateMatrixWorld(true);
    const point = new Three.Vector3(), disposedMaterials = new Set();
    model.group.traverse(object => {
      if (object.geometry) {
        const vertices = object.geometry.attributes.position;
        for (let vertex = 0; vertex < vertices.count; vertex++) {
          point.fromBufferAttribute(vertices, vertex).applyMatrix4(object.matrixWorld);
          assert(Math.hypot(point.x - b.x, point.y - b.y) <= b.radius + 1e-6, 'spacing radius contains the actual posed mesh');
        }
        object.geometry.dispose();
      }
      if (object.material) disposedMaterials.add(object.material);
    });
    disposedMaterials.forEach(value => value.dispose());
    for (let j = 0; j < i; j++) minimumGap = Math.min(minimumGap, Math.hypot(b.x - layout[j].x, b.y - layout[j].y) - b.radius - layout[j].radius);
  }
  assert(minimumGap >= .24, `initial silhouettes need breathing room: ${minimumGap}`);
  console.log(`initial ${pixelsWide}x${pixelsHigh}: spacing margin ${minimumGap.toFixed(3)}, side/oblique/front=7/7/3, independent attributes, aligned velocity/pose/goal, reset reproducibility PASS`);
}
