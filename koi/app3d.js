import * as THREE from '../third_party/three/three.module.js';
import { createFish } from './fish.js';

const $ = id => document.getElementById(id);
const canvas = $('view'), controls = $('controls');
function openPanel(open) {
    controls.hidden = !open; $('toggle').textContent = open ? '−' : '＋';
    $('toggle').setAttribute('aria-expanded', String(open));
    $('toggle').setAttribute('aria-label', open ? '調整UIを閉じる' : '調整UIを開く');
}
$('toggle').onclick = () => openPanel(controls.hidden);
$('close').onclick = () => { openPanel(false); $('toggle').focus(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !controls.hidden) { openPanel(false); $('toggle').focus(); } });
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let paused = motion.matches, elapsed = 0, last = null, frame = 0;
let renderer, scene, camera, paper, fishes, lost = false;
function stop() { cancelAnimationFrame(frame); last = null; }
function sync() {
    stop(); $('pause').textContent = paused ? '再生' : '一時停止';
    $('pause').setAttribute('aria-pressed', String(paused));
    if (renderer && !lost && !document.hidden) frame = requestAnimationFrame(render);
}
function paperTexture() {
    const data = new Uint8Array(128 * 128 * 4);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
        const grain = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        const value = 240 + Math.floor((grain - Math.floor(grain)) * 15);
        data.set([value, value, value, 255], (y * 128 + x) * 4);
    }
    const texture = new THREE.DataTexture(data, 128, 128);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(8, 8); texture.needsUpdate = true;
    return texture;
}
function render(now) {
    if (lost || document.hidden) return;
    if (!paused && last !== null) elapsed += Math.min((now - last) / 1000, .1) * Number($('speed').value);
    last = now;
    const aspect = innerWidth / innerHeight;
    const width = aspect < 1 ? 2.15 : Math.min(4.5, 2.8 * aspect), depth = aspect < 1 ? 2.8 : 2.2;
    fishes.forEach((fish, i) => {
        fish.group.visible = i < Number($('count').value);
        if (fish.group.visible) fish.update(elapsed, Number($('bend').value), width, depth);
    });
    paper.material.bumpScale = .035 * Number($('paper').value);
    renderer.render(scene, camera);
    if (!paused) frame = requestAnimationFrame(render);
}
function resize() {
    if (!renderer || lost) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(1600000 / (innerWidth * innerHeight))));
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.position.set(0, innerWidth < innerHeight ? 11 : 8, innerWidth < innerHeight ? 10 : 7);
    camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); sync();
}
function fail(error) {
    stop(); $('pause').disabled = true;
    $('status').textContent = '描画できませんでした。WebGL 2対応のブラウザーで再読み込みしてください。';
    console.error(error);
}
try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setClearColor('#c9b99a'); renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(42, 1, .1, 60);
    scene.add(new THREE.HemisphereLight('#fff5de', '#74736a', 2.5));
    const light = new THREE.DirectionalLight('#fff2d2', 3);
    light.position.set(-3, 8, 5); light.castShadow = true; light.shadow.mapSize.set(1024, 1024);
    Object.assign(light.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: .1, far: 25 });
    light.shadow.bias = -.0005; light.shadow.intensity = .30; light.shadow.radius = 3; scene.add(light);
    paper = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: '#baa989', roughness: 1, bumpMap: paperTexture(), bumpScale: .035 }));
    paper.rotation.x = -Math.PI / 2; paper.position.y = -1.25; paper.receiveShadow = true; scene.add(paper);
    fishes = Array.from({ length: 7 }, (_, i) => createFish(i)); fishes.forEach(fish => scene.add(fish.group));
    $('status').textContent = '立体の鯉と和紙を描画中'; resize();
} catch (error) { fail(error); }
for (const id of ['speed', 'bend', 'paper', 'count']) {
    $(id).oninput = () => { $(id + '-value').value = Number($(id).value).toFixed(id === 'count' ? 0 : 2); sync(); };
}
$('pause').onclick = () => { paused = !paused; sync(); };
$('reset').onclick = () => { elapsed = 0; sync(); };
motion.addEventListener('change', () => { paused = motion.matches; sync(); });
addEventListener('resize', resize); document.addEventListener('visibilitychange', sync);
canvas.addEventListener('webglcontextlost', () => { lost = true; stop(); $('status').textContent = '描画の復帰を待っています…'; });
canvas.addEventListener('webglcontextrestored', () => { lost = false; $('status').textContent = '立体の鯉と和紙を描画中'; resize(); });
