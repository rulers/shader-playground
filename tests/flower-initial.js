import * as THREE from '../third_party/three/three.module.js';
import { createPainting, wingTexture } from '../flower-butterflies/painting.js';
import { SPECIES, createButterfly, poseButterfly } from '../flower-butterflies/butterfly.js';
import { createFlockLayout } from '../flower-butterflies/flock.js';
import { resetFlight, updateFlight } from '../flower-butterflies/flight.js';

const report = document.querySelector('#report'), lines = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const record = new URLSearchParams(location.search).has('record');
const wind = { x: 0, y: 0, vx: 0, vy: 0 };
const readPixels = canvas => {
  const copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height;
  const context = copy.getContext('2d'); context.drawImage(canvas, 0, 0);
  return context.getImageData(0, 0, copy.width, copy.height).data;
};
let renderer;

async function compare(name, actual, layout, width, height, shouldMatch = true) {
  if (record) { lines.push(`RECORD: ${name}; baseline comparison skipped`); return; }
  const response = await fetch(`fixtures/flower-initial-${name}.png`);
  assert(response.ok, `Missing initial ${name} baseline`);
  const image = await createImageBitmap(await response.blob());
  assert(image.width === width && image.height === height, `${name}: baseline dimensions`);
  const copy = document.createElement('canvas'); copy.width = width; copy.height = height;
  copy.getContext('2d').drawImage(image, 0, 0); image.close();
  const expected = readPixels(copy), unit = height / 16;
  let mismatches = 0;
  // Compare every butterfly's own region, so a large quiet background cannot
  // hide a changed starting position or pose. Flowers stay in the full frame.
  for (let i = 0; i < layout.length; i++) {
    const b = layout[i], cx = width / 2 + b.x * unit, cy = height / 2 - b.y * unit;
    const radius = (b.radius + .12) * unit;
    let changed = 0, error = 0, total = 0;
    for (let y = Math.max(0, Math.floor(cy - radius)); y < Math.min(height, Math.ceil(cy + radius)); y++) {
      for (let x = Math.max(0, Math.floor(cx - radius)); x < Math.min(width, Math.ceil(cx + radius)); x++) {
        const offset = (y * width + x) * 4;
        const dr = Math.abs(actual[offset] - expected[offset]), dg = Math.abs(actual[offset + 1] - expected[offset + 1]), db = Math.abs(actual[offset + 2] - expected[offset + 2]);
        if (Math.max(dr, dg, db) > 24) changed++;
        error += (dr + dg + db) / 3; total++;
      }
    }
    if (changed / total >= .025 || error / total >= 2) mismatches++;
  }
  assert(shouldMatch ? mismatches === 0 : mismatches > 0, `${name}: ${shouldMatch ? mismatches + ' initial regions changed' : 'missing butterfly was not detected'}`);
  lines.push(shouldMatch ? `PASS: ${name} ${width}x${height}, 17 starting regions match baseline` : `PASS: ${name} missing-butterfly negative control rejected`);
}

try {
  renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#render'), antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace;
  for (const [name, w, h] of [['portrait', 390, 844], ['landscape', 1280, 800]]) {
    renderer.setSize(w, h, false);
    const width = 16 * w / h, scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-width / 2, width / 2, 8, -8, .1, 30); camera.position.z = 15;
    const painting = createPainting(w / h), maps = [];
    const paper = new THREE.CanvasTexture(painting.canvas); paper.colorSpace = THREE.SRGBColorSpace; maps.push(paper);
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(width, 16), new THREE.MeshBasicMaterial({ map: paper }));
    backdrop.position.z = -1; scene.add(backdrop);
    const pairs = SPECIES.map((_, kind) => {
      const pair = {};
      for (const part of ['fore', 'hind']) {
        const map = new THREE.CanvasTexture(wingTexture(kind, part)); map.colorSpace = THREE.SRGBColorSpace; maps.push(map);
        pair[part] = new THREE.MeshBasicMaterial({ map, transparent: true, side: THREE.DoubleSide, alphaTest: .2 });
      }
      return pair;
    });
    const layout = createFlockLayout(17, width);
    const flock = layout.map((spawn, i) => {
      const b = createButterfly(spawn.species, pairs[spawn.species]);
      b.group.scale.setScalar(spawn.scale); resetFlight(b, i, width, painting.targets, spawn); poseButterfly(b); scene.add(b.group);
      return b;
    });
    renderer.render(scene, camera);
    const initial = readPixels(renderer.domElement);
    document.querySelector(`#initial-${name}`).src = renderer.domElement.toDataURL('image/png');
    if (name === 'landscape') document.querySelector('#initial-preview').src = renderer.domElement.toDataURL('image/jpeg', .88);
    await compare(name, initial, layout, w, h);
    if (!record) {
      const missing = layout.findIndex(b => b.pose === 'front');
      flock[missing].group.visible = false; renderer.render(scene, camera);
      await compare(name, readPixels(renderer.domElement), layout, w, h, false);
      flock[missing].group.visible = true;
    }
    // Move the real flock, then reset the existing objects, rather than comparing
    // two freshly constructed scenes which could miss stale wind/pose state.
    for (let tick = 0; tick < 240; tick++) for (const b of flock) updateFlight(b, 1 / 60, .55, width, painting.targets, wind, .8);
    for (const b of flock) poseButterfly(b);
    renderer.render(scene, camera);
    const moved = readPixels(renderer.domElement);
    assert(moved.some((value, i) => value !== initial[i]), `${name}: flight must change the frame`);
    const resetLayout = createFlockLayout(17, width);
    flock.forEach((b, i) => { b.group.scale.setScalar(resetLayout[i].scale); resetFlight(b, i, width, painting.targets, resetLayout[i]); poseButterfly(b); });
    renderer.render(scene, camera);
    const restored = readPixels(renderer.domElement);
    assert(restored.every((value, i) => value === initial[i]), `${name}: reset must restore the exact initial frame`);
    lines.push(`PASS: ${name} flight then reset restores identical pixels`);
    const geometries = new Set(), allMaterials = new Set();
    scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) allMaterials.add(object.material); });
    geometries.forEach(geometry => geometry.dispose()); allMaterials.forEach(material => material.dispose()); maps.forEach(map => map.dispose());
  }
  report.dataset.status = record ? 'record' : 'pass'; report.textContent = lines.join('\n');
} catch (error) {
  report.dataset.status = 'fail'; report.textContent = [...lines, `FAIL: ${error.message}`].join('\n'); console.error(error);
} finally { renderer?.dispose(); }
