import * as THREE from '../third_party/three/three.module.js';
import { createPainting, wingTexture, random } from './painting.js';
import { resetFlight, updateFlight, decayWind, resizeFlight } from './flight.js';
import { SPECIES, createButterfly, poseButterfly } from './butterfly.js';

const canvas = document.querySelector('#view'), pause = document.querySelector('#pause');
const status = document.querySelector('#status'), motion = matchMedia('(prefers-reduced-motion: reduce)');
let renderer, scene, camera, backdrop, butterflies = [], targets = [], width = 10;
let paused = motion.matches, last = null, frame = 0, lost = false;
const rand = random(142), textures = [], controls = document.querySelector('#controls');
const wingMaterials = [];
const activityInput = document.querySelector('#activity'), windInput = document.querySelector('#wind');
let activity = .55, windStrength = .8;
let restoreTimer;
let viewWidth = 0, viewHeight = 0, viewDpr = 0;
const wind = { x: 0, y: 0, vx: 0, vy: 0 };
const pointer = { id: null, x: 0, y: 0, time: null };

function openPanel(open) {
  controls.hidden = !open;
  const toggle = document.querySelector('#toggle');
  toggle.textContent = open ? '−' : '＋'; toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? '調整UIを閉じる' : '調整UIを開く');
  if (open) document.querySelector('#close').focus(); else toggle.focus();
}
document.querySelector('#toggle').addEventListener('click', () => openPanel(controls.hidden));
document.querySelector('#close').addEventListener('click', () => openPanel(false));
function readSettings() {
  activity = Number(activityInput.value); windStrength = Number(windInput.value);
  document.querySelector('#activity-value').textContent = activity.toFixed(2);
  document.querySelector('#wind-value').textContent = windStrength.toFixed(2);
}
activityInput.addEventListener('input', readSettings); windInput.addEventListener('input', readSettings);

function clearWind() {
  wind.vx = wind.vy = 0; pointer.time = null;
  if (pointer.id !== null && canvas.hasPointerCapture(pointer.id)) canvas.releasePointerCapture(pointer.id);
  pointer.id = null;
}
function pointerStart(event) {
  if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
  if (paused || lost || document.hidden) return;
  pointer.id = event.pointerId; pointer.time = null;
  canvas.setPointerCapture(event.pointerId); pointerMove(event);
}
function pointerMove(event) {
  if (paused || lost || document.hidden || event.isPrimary === false) return;
  if (pointer.id !== null && event.pointerId !== pointer.id) return;
  if (event.pointerType === 'touch' && pointer.id === null) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width - .5) * width;
  const y = (0.5 - (event.clientY - rect.top) / rect.height) * 16;
  if (pointer.time !== null) {
    const seconds = Math.max(.016, Math.min(.1, (event.timeStamp - pointer.time) / 1000));
    const vx = THREE.MathUtils.clamp((x - pointer.x) / seconds, -3, 3);
    const vy = THREE.MathUtils.clamp((y - pointer.y) / seconds, -3, 3);
    wind.vx = wind.vx * .55 + vx * .45; wind.vy = wind.vy * .55 + vy * .45;
  }
  wind.x = x; wind.y = y; pointer.x = x; pointer.y = y; pointer.time = event.timeStamp;
}
function pointerEnd(event) {
  if (pointer.id !== null && event.pointerId !== pointer.id) return;
  if (pointer.id !== null && canvas.hasPointerCapture(pointer.id)) canvas.releasePointerCapture(pointer.id);
  pointer.id = null; pointer.time = null;
}
canvas.addEventListener('pointerdown', pointerStart);
canvas.addEventListener('pointermove', pointerMove);
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, pointerEnd);
canvas.addEventListener('pointerleave', () => { if (pointer.id === null) pointer.time = null; });
addEventListener('blur', clearWind);

function texture(source) {
  const tex = new THREE.CanvasTexture(source); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
function makeButterfly(index) {
  const species = index % SPECIES.length;
  const butterfly = createButterfly(species, wingMaterials[species]);
  butterfly.group.scale.setScalar((.38 + rand() * .38) * SPECIES[species].size);
  scene.add(butterfly.group);
  return { ...butterfly, index };
}

function resize() {
  const aspect = innerWidth / innerHeight, previousWidth = width, initial = targets.length === 0;
  width = 16 * aspect; clearWind();
  viewWidth = innerWidth; viewHeight = innerHeight; viewDpr = Math.min(devicePixelRatio, 2);
  camera.left = -width / 2; camera.right = width / 2; camera.top = 8; camera.bottom = -8; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const painting = createPainting(aspect); targets = painting.targets;
  for (const b of butterflies) {
    if (initial) resetFlight(b, b.index, width, targets);
    else resizeFlight(b, width / previousWidth, targets, width);
  }
  if (backdrop) { scene.remove(backdrop); backdrop.geometry.dispose(); backdrop.material.map.dispose(); backdrop.material.dispose(); }
  backdrop = new THREE.Mesh(new THREE.PlaneGeometry(width, 16), new THREE.MeshBasicMaterial({ map: texture(painting.canvas) }));
  backdrop.position.z = -1; scene.add(backdrop); draw();
}

function draw() {
  if (document.hidden || lost) return;
  for (const b of butterflies) {
    poseButterfly(b);
  }
  renderer.render(scene, camera);
}
function stop() { cancelAnimationFrame(frame); frame = 0; last = null; }
function render(now) {
  frame = 0;
  if (last !== null) {
    const dt = Math.min((now - last) / 1000, .05);
    for (const b of butterflies) updateFlight(b, dt, activity, width, targets, wind, windStrength);
    decayWind(wind, dt);
  }
  last = now; draw();
  if (!paused && !document.hidden && !lost) frame = requestAnimationFrame(render);
}
function sync() {
  stop(); clearWind(); pause.textContent = paused ? '再生' : '一時停止'; pause.setAttribute('aria-pressed', String(paused));
  if (!renderer || lost) return;
  draw(); status.textContent = paused ? '静かな一幅。再生で蝶が舞います。' : 'そっとなぞると、花間に風が通ります。';
  if (!paused && !document.hidden) frame = requestAnimationFrame(render);
}
pause.addEventListener('click', () => { paused = !paused; sync(); });
document.querySelector('#reset').addEventListener('click', () => {
  activityInput.value = '.55'; windInput.value = '.8'; readSettings();
  if (targets.length) for (const b of butterflies) resetFlight(b, b.index, width, targets);
  sync();
});
document.querySelector('#hide').addEventListener('click', event => {
  const hidden = document.body.classList.toggle('quiet');
  event.currentTarget.textContent = hidden ? '文字を表示' : '文字を隠す'; event.currentTarget.setAttribute('aria-pressed', String(hidden));
  openPanel(false);
});
document.addEventListener('keydown', event => {
  if (event.code === 'Space' && !event.repeat && !/BUTTON|A|INPUT/.test(event.target.tagName)) { event.preventDefault(); paused = !paused; sync(); }
  if (event.key === 'Escape') {
    if (!controls.hidden) openPanel(false);
    document.body.classList.remove('quiet'); const hide = document.querySelector('#hide'); hide.textContent = '文字を隠す'; hide.setAttribute('aria-pressed', 'false');
  }
});
motion.addEventListener('change', event => { paused = event.matches; sync(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); clearWind(); } else sync(); });
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; stop(); clearWind(); status.textContent = '描画が中断されました。復帰を待っています。'; });
canvas.addEventListener('webglcontextrestored', () => {
  // Three.js must finish its own context-restored listener before rendering.
  clearTimeout(restoreTimer);
  restoreTimer = setTimeout(() => {
    lost = false;
    if (viewWidth !== innerWidth || viewHeight !== innerHeight || viewDpr !== Math.min(devicePixelRatio, 2)) resize();
    sync();
  }, 0);
});
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene(); camera = new THREE.OrthographicCamera(-5, 5, 8, -8, .1, 30); camera.position.z = 15;
  for (let i = 0; i < SPECIES.length; i++) {
    const materials = {};
    for (const part of ['fore', 'hind']) {
      const map = texture(wingTexture(i, part)); textures.push(map);
      materials[part] = new THREE.MeshBasicMaterial({ map, transparent: true, side: THREE.DoubleSide, alphaTest: .2 });
    }
    wingMaterials.push(materials);
  }
  butterflies = Array.from({ length: 17 }, (_, index) => makeButterfly(index));
  readSettings(); resize(); sync();
  let resizing;
  addEventListener('resize', () => { clearTimeout(resizing); resizing = setTimeout(() => { if (!lost) resize(); }, 120); });
  addEventListener('pagehide', event => {
    stop(); clearWind(); clearTimeout(resizing); clearTimeout(restoreTimer);
    if (event.persisted) return;
    const geometries = new Set(), materials = new Set();
    scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) materials.add(object.material); });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const tex of textures) tex.dispose();
    backdrop.material.map.dispose(); renderer.dispose();
  });
  addEventListener('pageshow', event => { if (event.persisted) sync(); });
} catch (error) {
  console.error(error); stop();
  canvas.hidden = true;
  const fallback = document.createElement('p'); fallback.id = 'fallback'; fallback.textContent = 'この作品にはWebGL 2が必要です。対応ブラウザーでお楽しみください。'; document.body.append(fallback);
  status.textContent = '描画を開始できませんでした。';
  pause.disabled = true; document.querySelector('#reset').disabled = true;
}
