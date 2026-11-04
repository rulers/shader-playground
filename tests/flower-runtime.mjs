// Lifecycle tests use real Three.js scene objects and a renderer stub.
// Real WebGL rendering is checked separately in the browser.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as Three from '../third_party/three/three.module.js';

const source = fs.readFileSync(new URL('../flower-butterflies/app.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
for (const reduced of [false, true]) {
  class Element {
    constructor() { this.events = {}; this.attrs = {}; this.textContent = ''; }
    addEventListener(name, fn) { (this.events[name] ??= []).push(fn); }
    emit(name, event = {}) { for (const fn of this.events[name] ?? []) fn({ target: this, preventDefault() {}, ...event }); }
    setAttribute(name, value) { this.attrs[name] = value; }
  }
  const elements = Object.fromEntries(['view', 'pause', 'reset', 'hide', 'status'].map(id => [id, new Element()]));
  const doc = new Element(), media = new Element(), win = new Element();
  const classes = new Set();
  doc.querySelector = selector => elements[selector.slice(1)]; doc.hidden = false;
  doc.body = { classList: { toggle(name) { if (classes.has(name)) { classes.delete(name); return false; } classes.add(name); return true; }, remove(name) { classes.delete(name); } } };
  media.matches = reduced;
  let next = 0, time = 0, renders = 0, snapshot;
  const frames = new Map();
  class Renderer {
    setSize() {} setPixelRatio() {}
    render(scene) {
      renders++;
      const groups = scene.children.filter(child => child.isGroup);
      assert.equal(groups.length, 17);
      for (const group of groups) assert(group.position.toArray().every(Number.isFinite));
      snapshot = JSON.stringify(groups.map(group => [group.position.toArray(), group.children[0].rotation.y]));
    }
  }
  const context = {
    THREE: { ...Three, WebGLRenderer: Renderer }, document: doc, matchMedia: () => media,
    innerWidth: 390, innerHeight: 844, devicePixelRatio: 3, console,
    createPainting: () => ({ canvas: { width: 390, height: 844 }, targets: [{ x: -2, y: -4 }, { x: 2, y: -5 }] }),
    wingTexture: () => ({ width: 384, height: 512 }), random: () => () => .5,
    addEventListener: (...args) => win.addEventListener(...args), setTimeout: fn => fn(), clearTimeout() {},
    requestAnimationFrame(fn) { frames.set(++next, fn); return next; }, cancelAnimationFrame(id) { frames.delete(id); }
  };
  const tick = () => { time += 16.67; const pending = [...frames.values()]; frames.clear(); for (const fn of pending) fn(time); };
  vm.runInNewContext(source, context);
  assert.equal(elements.pause.attrs['aria-pressed'], String(reduced));
  assert.equal(frames.size, reduced ? 0 : 1);
  if (reduced) elements.pause.emit('click');
  tick(); const initial = snapshot; tick(); assert.notEqual(snapshot, initial);
  elements.pause.emit('click'); assert.equal(frames.size, 0);
  const frozen = snapshot; tick(); assert.equal(snapshot, frozen);
  elements.reset.emit('click'); assert.equal(frames.size, 0); assert.equal(elements.pause.attrs['aria-pressed'], 'true');
  elements.hide.emit('click', { currentTarget: elements.hide }); assert(classes.has('quiet'));
  doc.emit('keydown', { key: 'Escape' }); assert(!classes.has('quiet'));
  elements.pause.emit('click'); doc.hidden = true; doc.emit('visibilitychange'); assert.equal(frames.size, 0);
  doc.hidden = false; doc.emit('visibilitychange'); assert.equal(frames.size, 1);
  media.emit('change', { matches: true }); assert.equal(frames.size, 0);
  elements.pause.emit('click');
  elements.view.emit('webglcontextlost'); assert.equal(frames.size, 0);
  elements.view.emit('webglcontextrestored'); assert.equal(frames.size, 1);
  context.innerWidth = 1280; context.innerHeight = 800; win.emit('resize');
  assert(renders > 5);
  doc.emit('keydown', { code: 'Space', repeat: true, target: { tagName: 'BODY' } }); assert.equal(frames.size, 1);
  doc.emit('keydown', { code: 'Space', repeat: false, target: { tagName: 'BODY' } }); assert.equal(frames.size, 0);
  console.log(`reduced-motion=${reduced}: scene, animation, pause, reset, UI, visibility, resize, context recovery PASS`);
}
