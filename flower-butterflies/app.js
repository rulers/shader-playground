import * as THREE from '../third_party/three/three.module.js';
import { createPainting, wingTexture, random } from './painting.js';

const canvas = document.querySelector('#view'), pause = document.querySelector('#pause');
const status = document.querySelector('#status'), motion = matchMedia('(prefers-reduced-motion: reduce)');
let renderer, scene, camera, backdrop, butterflies = [], targets = [], width = 10;
let paused = motion.matches, elapsed = 0, last = null, frame = 0, lost = false;
const rand = random(142), textures = [];

function texture(source) {
  const tex = new THREE.CanvasTexture(source); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
function makeButterfly(index) {
  const group = new THREE.Group(), wings = [];
  for (const side of [-1, 1]) {
    const hinge = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ map: textures[index % 4], transparent: true, side: THREE.DoubleSide, depthWrite: false });
    const wing = new THREE.Mesh(new THREE.PlaneGeometry(.72, .96), material);
    wing.position.set(side * .31, .02, 0); wing.scale.x = side;
    hinge.add(wing); group.add(hinge); wings.push(hinge);
  }
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.023, .3, 3, 6), new THREE.MeshBasicMaterial({ color: '#292d28' }));
  group.add(body);
  for (const side of [-1, 1]) {
    const points = [new THREE.Vector3(0, .15, .01), new THREE.Vector3(side * .045, .23, .01), new THREE.Vector3(side * .09, .25, .01)];
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#292d28' })));
  }
  const scale = .38 + rand() * .38; group.scale.setScalar(scale);
  scene.add(group);
  return { group, wings, phase: rand() * Math.PI * 2, speed: .11 + rand() * .07, index };
}

function resize() {
  const aspect = innerWidth / innerHeight; width = 16 * aspect;
  camera.left = -width / 2; camera.right = width / 2; camera.top = 8; camera.bottom = -8; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const painting = createPainting(aspect); targets = painting.targets;
  if (backdrop) { scene.remove(backdrop); backdrop.geometry.dispose(); backdrop.material.map.dispose(); backdrop.material.dispose(); }
  backdrop = new THREE.Mesh(new THREE.PlaneGeometry(width, 16), new THREE.MeshBasicMaterial({ map: texture(painting.canvas) }));
  backdrop.position.z = -1; scene.add(backdrop); draw();
}

function draw() {
  for (const b of butterflies) {
    const t = elapsed * b.speed + b.phase;
    const flower = targets[(b.index * 7 + 3) % targets.length];
    const approach = Math.pow((1 + Math.sin(t * .63 + b.phase)) * .5, 6) * .88;
    const roamX = Math.sin(t * .79 + b.phase) * width * .38;
    const roamY = 1.5 + Math.sin(t * .93 + b.index) * 4.7;
    const x = THREE.MathUtils.lerp(roamX, flower.x, approach);
    const y = THREE.MathUtils.lerp(roamY, flower.y + .4, approach);
    b.group.position.set(x + Math.sin(t * 7) * .12, y + Math.sin(t * 5) * .2, .5 + Math.sin(t) * .4);
    b.group.rotation.set(.15 + Math.sin(t * 3) * .3, Math.sin(t * 2) * .35, Math.sin(t * 1.7 + b.phase) * .7);
    const flap = .25 + (Math.sin(elapsed * (8 + b.index * .18) + b.phase) + 1) * .58;
    b.wings[0].rotation.y = flap; b.wings[1].rotation.y = -flap;
  }
  renderer.render(scene, camera);
}
function stop() { cancelAnimationFrame(frame); frame = 0; last = null; }
function render(now) {
  frame = 0;
  if (last !== null) elapsed += Math.min((now - last) / 1000, .05);
  last = now; draw();
  if (!paused && !document.hidden && !lost) frame = requestAnimationFrame(render);
}
function sync() {
  stop(); pause.textContent = paused ? '再生' : '一時停止'; pause.setAttribute('aria-pressed', String(paused));
  if (!renderer || lost) return;
  draw(); status.textContent = paused ? '静かな一幅。再生で蝶が舞います。' : '花をめぐり、余白を舞う。';
  if (!paused && !document.hidden) frame = requestAnimationFrame(render);
}
pause.addEventListener('click', () => { paused = !paused; sync(); });
document.querySelector('#reset').addEventListener('click', () => { elapsed = 0; sync(); });
document.querySelector('#hide').addEventListener('click', event => {
  const hidden = document.body.classList.toggle('quiet');
  event.currentTarget.textContent = hidden ? '文字を表示' : '文字を隠す'; event.currentTarget.setAttribute('aria-pressed', String(hidden));
});
document.addEventListener('keydown', event => {
  if (event.code === 'Space' && !event.repeat && !/BUTTON|A|INPUT/.test(event.target.tagName)) { event.preventDefault(); paused = !paused; sync(); }
  if (event.key === 'Escape') { document.body.classList.remove('quiet'); const hide = document.querySelector('#hide'); hide.textContent = '文字を隠す'; hide.setAttribute('aria-pressed', 'false'); }
});
motion.addEventListener('change', event => { paused = event.matches; sync(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else sync(); });
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; stop(); status.textContent = '描画が中断されました。復帰を待っています。'; });
canvas.addEventListener('webglcontextrestored', () => { lost = false; sync(); });
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene(); camera = new THREE.OrthographicCamera(-5, 5, 8, -8, .1, 30); camera.position.z = 15;
  for (let i = 0; i < 4; i++) textures.push(texture(wingTexture(i)));
  butterflies = Array.from({ length: 17 }, (_, index) => makeButterfly(index));
  resize(); sync();
  let resizing;
  addEventListener('resize', () => { clearTimeout(resizing); resizing = setTimeout(() => { if (!lost) resize(); }, 120); });
} catch (error) {
  console.error(error); stop();
  canvas.hidden = true;
  const fallback = document.createElement('p'); fallback.id = 'fallback'; fallback.textContent = 'この作品にはWebGL 2が必要です。対応ブラウザーでお楽しみください。'; document.body.append(fallback);
  status.textContent = '描画を開始できませんでした。';
  pause.disabled = true; document.querySelector('#reset').disabled = true;
}
