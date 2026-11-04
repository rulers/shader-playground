import * as THREE from '../third_party/three/three.module.js';
import { SPECIES, createButterfly, poseButterfly } from '../flower-butterflies/butterfly.js';
import { wingTexture } from '../flower-butterflies/painting.js';
import { resetFlight, updateFlight } from '../flower-butterflies/flight.js';
import { createFlockLayout } from '../flower-butterflies/flock.js';

const report = document.querySelector('#report'), lines = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const record = new URLSearchParams(location.search).has('record');
const W = 1200, H = 900, centers = [200, 480, 760];
const views = ['front', 'oblique', 'left', 'right'];
const labels = ['FRONT', 'OBLIQUE', 'LEFT PROFILE', 'RIGHT PROFILE'];
const idleWind = { x: 0, y: 0, vx: 0, vy: 0 };
let renderer;

function classify(b) { return Math.abs(b.yaw) < .35 ? 'front' : Math.abs(b.yaw) > 1.05 ? b.yaw < 0 ? 'left' : 'right' : 'oblique'; }
function flightSamples() {
  const flowers = [{ x: -2, y: -4 }, { x: 2, y: -5 }];
  const layout = createFlockLayout(17, 9);
  const flock = SPECIES.map((_, i) => { const b = {}; resetFlight(b, i, 9, flowers, layout[i]); return b; });
  const samples = SPECIES.map(() => ({}));
  for (let tick = 0; tick < 36000; tick++) for (let i = 0; i < flock.length; i++) {
    const b = flock[i]; updateFlight(b, 1 / 60, .8, 9, flowers, idleWind, 0);
    const view = classify(b);
    // Only record settled side/diagonal headings, rather than a transient yaw
    // still facing up while a direction change is beginning.
    const facing = Math.sin(b.heading);
    if (view === 'front' && (Math.abs(b.yaw) > .2 || Math.abs(facing) > .35 || b.flap > .4)) continue;
    if (view === 'oblique' && (Math.abs(b.yaw) < .6 || Math.abs(b.yaw) > .85 || Math.abs(facing) < .35 || b.flap > .85)) continue;
    if ((view === 'left' && facing < .85) || (view === 'right' && facing > -.85)) continue;
    if ((view === 'left' || view === 'right') && (Math.abs(b.yaw) < 1.12 || b.flap < .65)) continue;
    if (!samples[i][view]) samples[i][view] = { ...b };
  }
  for (let i = 0; i < samples.length; i++) for (const view of views) assert(samples[i][view], `${SPECIES[i].id}: missing in-flight ${view}`);
  lines.push('PASS: all three species show front, oblique, left and right profiles during flight');
  return samples;
}

function pixels(canvas) {
  const copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height;
  const c = copy.getContext('2d'); c.drawImage(canvas, 0, 0); return c.getImageData(0, 0, copy.width, copy.height).data;
}

function compare(actual, expected) {
  const results = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
    let changed = 0, active = 0, error = 0;
    for (let y = centers[row] - 135; y < centers[row] + 135; y++) for (let x = col * 300 + 5; x < col * 300 + 295; x++) {
      const offset = (y * W + x) * 4;
      let foreground = false, maxDifference = 0, sum = 0;
      for (let channel = 0; channel < 3; channel++) {
        if (Math.abs(actual[offset + channel] - actual[channel]) > 16 || Math.abs(expected[offset + channel] - expected[channel]) > 16) foreground = true;
        const delta = Math.abs(actual[offset + channel] - expected[offset + channel]);
        sum += delta; maxDifference = Math.max(maxDifference, delta);
      }
      if (foreground) { active++; error += sum / 3; if (maxDifference > 24) changed++; }
    }
    results.push({ row, col, pass: active > 200 && changed / active < .045 && error / active < 3, changed: changed / Math.max(1, active), error: error / Math.max(1, active) });
  }
  return results;
}

async function baseline(name, actual) {
  if (record) { lines.push(`RECORD: ${name} (baseline comparison skipped)`); return; }
  const response = await fetch(`fixtures/flower-${name}.png`);
  assert(response.ok, `Missing baseline ${name}; see README visual-test instructions`);
  const image = await createImageBitmap(await response.blob());
  assert(image.width === W && image.height === H, `${name}: baseline dimensions`);
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  canvas.getContext('2d').drawImage(image, 0, 0); image.close();
  const expected = pixels(canvas), results = compare(actual, expected);
  for (const result of results) assert(result.pass, `${name}/${SPECIES[result.row].id}/${views[result.col]}: difference=${result.changed.toFixed(3)}, error=${result.error.toFixed(3)}`);
  // Negative control: the comparator must reject a missing butterfly.
  const damaged = new Uint8ClampedArray(actual);
  for (let y = 65; y < 335; y++) for (let x = 5; x < 295; x++) {
    const offset = (y * W + x) * 4;
    damaged[offset] = actual[0]; damaged[offset + 1] = actual[1]; damaged[offset + 2] = actual[2];
  }
  assert(!compare(damaged, expected)[0].pass, 'negative control must detect a missing silhouette');
  lines.push(`PASS: ${name} 12 cells match baseline; missing-silhouette negative control rejected`);
}

function silhouetteCheck() {
  renderer.setSize(256, 256, false); renderer.setClearColor('#000000');
  const camera = new THREE.OrthographicCamera(-1.1, 1.1, 1.1, -1.1, .1, 10); camera.position.z = 5;
  const material = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide });
  const masks = [];
  for (let species = 0; species < 3; species++) {
    const scene = new THREE.Scene(), b = createButterfly(species, { fore: material, hind: material });
    Object.assign(b, { x: 0, y: 0, z: 0, offsetX: 0, offsetY: 0, vy: 0, yaw: 0, heading: 0, bank: 0, flap: .12, phase: 0 });
    poseButterfly(b); scene.add(b.group); renderer.render(scene, camera);
    const rgba = pixels(renderer.domElement), mask = new Uint8Array(256 * 256);
    for (let i = 0; i < mask.length; i++) mask[i] = rgba[i * 4] > 128 ? 1 : 0;
    masks.push(mask);
    scene.traverse(object => { object.geometry?.dispose(); if (object.material && object.material !== material) object.material.dispose(); });
  }
  material.dispose();
  for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) {
    let intersection = 0, union = 0;
    for (let i = 0; i < masks[a].length; i++) { intersection += masks[a][i] & masks[b][i]; union += masks[a][i] | masks[b][i]; }
    assert(intersection / union < .9, 'species must have distinct silhouettes, independent of colour');
    lines.push(`PASS: silhouette ${SPECIES[a].id}/${SPECIES[b].id} IoU=${(intersection / union).toFixed(3)}`);
  }
}

function labeledSheet(canvas, name) {
  const sheet = document.createElement('canvas'); sheet.width = W; sheet.height = H;
  const c = sheet.getContext('2d'); c.drawImage(canvas, 0, 0); c.fillStyle = '#302f23';
  c.font = '14px sans-serif'; c.textAlign = 'center';
  labels.forEach((label, i) => c.fillText(label, 150 + i * 300, 27));
  c.textAlign = 'left'; c.font = '16px sans-serif';
  SPECIES.forEach((species, row) => c.fillText(`${species.label} / ${name}`, 16, centers[row] - 145));
  return sheet.toDataURL('image/png');
}

try {
  // Preserve pixels only in this test harness, for deterministic readback.
  renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#render'), antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace;
  silhouetteCheck();
  renderer.setSize(W, H, false); renderer.setClearColor('#b9a76c');
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-6, 6, 4.5, -4.5, .1, 20); camera.position.z = 10;
  const models = [], maps = [], materials = [], samples = flightSamples();
  for (let species = 0; species < 3; species++) {
    const pair = {};
    for (const part of ['fore', 'hind']) {
      const map = new THREE.CanvasTexture(wingTexture(species, part)); map.colorSpace = THREE.SRGBColorSpace; maps.push(map);
      pair[part] = new THREE.MeshBasicMaterial({ map, transparent: true, side: THREE.DoubleSide, alphaTest: .2 }); materials.push(pair[part]);
    }
    for (let col = 0; col < 4; col++) {
      const b = createButterfly(species, pair); b.group.scale.setScalar(1.5 * SPECIES[species].size);
      scene.add(b.group); models.push(b);
    }
  }
  for (const name of ['static', 'flight']) {
    for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
      const b = models[row * 4 + col];
      Object.assign(b, name === 'flight' ? samples[row][views[col]] : {
        heading: [0, -.65, Math.PI / 2, -Math.PI / 2][col], yaw: [0, .65, -1.22, 1.22][col], bank: 0, vy: 0, flap: [.2, .55, .98, .98][col], phase: 1.2
      });
      Object.assign(b, { x: -4.5 + col * 3, y: 4.5 - centers[row] / 100, z: 0, offsetX: 0, offsetY: 0 });
      poseButterfly(b);
    }
    renderer.render(scene, camera);
    document.querySelector(`#snapshot-${name}`).src = renderer.domElement.toDataURL('image/png');
    document.querySelector(`#review-${name}`).src = labeledSheet(renderer.domElement, name);
    await baseline(name, pixels(renderer.domElement));
  }
  scene.traverse(object => { object.geometry?.dispose(); if (object.material && !materials.includes(object.material)) object.material.dispose(); });
  materials.forEach(material => material.dispose()); maps.forEach(map => map.dispose());
  report.dataset.status = record ? 'record' : 'pass';
  report.textContent = lines.join('\n');
} catch (error) {
  report.dataset.status = 'fail'; report.textContent = [...lines, `FAIL: ${error.message}`].join('\n'); console.error(error);
} finally {
  renderer?.dispose();
}
