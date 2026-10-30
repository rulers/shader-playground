const canvas = document.querySelector("canvas"),
  ctx = canvas.getContext("2d");
const status = document.querySelector("#status"),
  pauseButton = document.querySelector("#pause"),
  slider = document.querySelector("#amount");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
let W = 1,
  H = 1,
  DPR = 1,
  time = 0,
  last = 0,
  paused = reduce.matches,
  raf = 0,
  activePointer = null;
const pointer = { x: 0.68, y: 0.45, down: false, active: false };
function setStatus(s) {
  status.textContent = s;
}
function setPause(value) {
  paused = value;
  if (value) release();
  pauseButton.textContent = paused ? "再生" : "一時停止";
  pauseButton.setAttribute("aria-pressed", String(paused));
  last = 0;
  schedule();
}
function resize() {
  if (!ctx) return;
  W = innerWidth;
  H = innerHeight;
  DPR = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (typeof resized === "function") resized();
  render(0);
}
function schedule() {
  if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
}
function frame(now) {
  raf = 0;
  const dt = last ? Math.min((now - last) / 1000, 0.033) : 0;
  last = now;
  if (!paused) {
    time += dt;
    update(dt);
  }
  render(dt);
  if (!paused) schedule();
}
function point(e) {
  const r = canvas.getBoundingClientRect();
  pointer.x = (e.clientX - r.left) / r.width;
  pointer.y = (e.clientY - r.top) / r.height;
  pointer.active = true;
}
canvas.addEventListener("pointerdown", (e) => {
  if (!ctx || activePointer !== null) return;
  if (paused) {
    setStatus("再生ボタンで動きを再開できます");
    return;
  }
  activePointer = e.pointerId;
  point(e);
  pointer.down = true;
  canvas.focus({ preventScroll: true });
  canvas.setPointerCapture(e.pointerId);
  start();
  schedule();
});
canvas.addEventListener("pointermove", (e) => {
  if (!ctx || (activePointer !== null && activePointer !== e.pointerId)) return;
  point(e);
  if (pointer.down && !paused) move();
  if (paused) render(0);
});
function release(e) {
  if (e && activePointer !== e.pointerId) return;
  if (pointer.down) end();
  pointer.down = false;
  activePointer = null;
}
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);
canvas.addEventListener("lostpointercapture", release);
canvas.addEventListener("pointerleave", () => {
  pointer.active = false;
});
canvas.addEventListener("blur", () => release());
canvas.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    setPause(!paused);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (!paused) action();
  }
});
pauseButton.addEventListener("click", () => setPause(!paused));
document.querySelector("#reset").addEventListener("click", () => {
  time = 0;
  reset();
  render(0);
  setStatus("最初の景色に戻しました");
  schedule();
});
document.querySelector("#action").addEventListener("click", () => {
  if (paused) setPause(false);
  action();
  schedule();
});
slider.addEventListener("input", () => {
  document.querySelector("output").value = Number(slider.value).toFixed(2);
  render(0);
});
const panel = document.querySelector("#controls"),
  toggle = document.querySelector("#toggle");
function closePanel() {
  panel.hidden = true;
  toggle.setAttribute("aria-expanded", "false");
  toggle.focus();
}
toggle.addEventListener("click", () => {
  panel.hidden = !panel.hidden;
  toggle.setAttribute("aria-expanded", String(!panel.hidden));
  if (!panel.hidden) document.querySelector("#close").focus();
});
document.querySelector("#close").addEventListener("click", closePanel);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !panel.hidden) closePanel();
});
document.addEventListener("visibilitychange", () => {
  last = 0;
  if (document.hidden) {
    cancelAnimationFrame(raf);
    raf = 0;
    release();
  } else schedule();
});
reduce.addEventListener("change", (e) => {
  if (e.matches) setPause(true);
});
addEventListener("resize", resize);
let seeds = [],
  segments = [],
  randomSeed = 27,
  seedId = 0;
function rand() {
  randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) >>> 0;
  return randomSeed / 4294967296;
}
function addSeed(x, y, initial = false) {
  if (seeds.length >= 5) {
    const id = seeds.shift();
    segments = segments.filter((s) => s.id !== id);
  }
  const id = ++seedId;
  seeds.push(id);
  grow({
    id,
    x,
    y,
    angle: -Math.PI / 2,
    length: Math.min(W, H) * 0.13,
    depth: 0,
    born: initial ? -8 : time,
  });
  setStatus("光の方へ、枝が伸びていきます");
}
function grow(s) {
  if (segments.length >= 1500) return;
  const dx = Math.cos(s.angle) * s.length,
    dy = Math.sin(s.angle) * s.length;
  segments.push({ ...s, ex: s.x + dx, ey: s.y + dy, children: false });
}
function reset() {
  seeds = [];
  segments = [];
  randomSeed = 27;
  seedId = 0;
  addSeed(W * 0.65, H * (W < 650 ? 0.54 : 0.78), true);
  for (let n = 0; n < 180; n++) advance(0.04, -8 + n * 0.04);
}
function resized() {
  reset();
}
function start() {
  addSeed(pointer.x * W, pointer.y * H);
}
function move() {}
function end() {}
function action() {
  addSeed(
    W * (0.4 + rand() * 0.45),
    H * (W < 650 ? 0.48 + rand() * 0.08 : 0.62 + rand() * 0.2),
  );
}
function advance(dt, t) {
  for (const s of [...segments]) {
    const age = (t - s.born) * Number(slider.value);
    if (age > 1 && !s.children && s.depth < 7) {
      s.children = true;
      const tx = pointer.active ? pointer.x * W : W * 0.62,
        ty = pointer.active ? pointer.y * H : H * 0.2;
      let target = Math.atan2(ty - s.ey, tx - s.ex);
      let delta = Math.atan2(
        Math.sin(target - s.angle),
        Math.cos(target - s.angle),
      );
      for (const turn of [-1, 1]) {
        grow({
          id: s.id,
          x: s.ex,
          y: s.ey,
          angle: s.angle + delta * 0.16 + turn * (0.28 + rand() * 0.28),
          length: s.length * (0.68 + rand() * 0.13),
          depth: s.depth + 1,
          born: t + rand() * 0.2,
        });
      }
    }
  }
}
function update(dt) {
  advance(dt, time);
}
function render() {
  if (!ctx) return;
  ctx.fillStyle = "#081a15";
  ctx.fillRect(0, 0, W, H);
  const gx = pointer.active ? pointer.x * W : W * 0.62,
    gy = pointer.active ? pointer.y * H : H * 0.2;
  const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.min(W, H) * 0.45);
  g.addColorStop(0, "#7c8d3022");
  g.addColorStop(1, "#081a1500");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (const s of segments) {
    const p = Math.max(0, Math.min(1, (time - s.born) * Number(slider.value)));
    if (p <= 0) continue;
    const x = s.x + (s.ex - s.x) * p,
      y = s.y + (s.ey - s.y) * p;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(x, y);
    ctx.lineWidth = Math.max(0.55, 3.2 - s.depth * 0.4);
    ctx.strokeStyle = ["#8eaa6b", "#a2bd7b", "#b7c98c", "#d7d4a0"][
      Math.min(3, Math.floor(s.depth / 2))
    ];
    ctx.shadowColor = "#a8d478";
    ctx.shadowBlur = s.depth > 4 ? 5 : 1;
    ctx.stroke();
    if (s.depth >= 6) {
      ctx.beginPath();
      ctx.ellipse(x, y, 2.2, 1.1, s.angle, 0, Math.PI * 2);
      ctx.fillStyle = "#e5d7a8";
      ctx.fill();
    }
  }
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(gx, gy, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#e4df9b";
  ctx.fill();
}
resize();
if (ctx) setPause(paused);
setStatus(
  !ctx
    ? "Canvas 2Dを利用できません。対応ブラウザーで開いてください"
    : paused
      ? "動きを減らす設定で停止中。調整UIから再生できます"
      : "クリックで種をまき、光を導いてください",
);
