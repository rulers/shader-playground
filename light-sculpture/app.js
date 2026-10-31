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
  release();
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
  if (!ctx || activePointer !== null || e.button !== 0) return;
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
  const captured = activePointer;
  pointer.down = false;
  activePointer = null;
  if (captured !== null && canvas.hasPointerCapture(captured))
    canvas.releasePointerCapture(captured);
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
    if (!e.repeat) setPause(!paused);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (!paused) action();
  }
});
pauseButton.addEventListener("click", () => setPause(!paused));
document.querySelector("#reset").addEventListener("click", () => {
  release();
  time = 0;
  slider.value = "0.96";
  document.querySelector("output").value = "0.96";
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
  if (e.key === "Escape") {
    release();
    if (!panel.hidden) closePanel();
  }
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
addEventListener("blur", () => release());
const nodes = [],
  count = 150;
function anchor(i) {
  const a = (i / count) * Math.PI * 2;
  const scale = Math.min(W * 0.29, H * 0.32);
  return {
    x: W * 0.63 + Math.sin(a) * scale * (0.8 + 0.22 * Math.cos(3 * a)),
    y: H * 0.43 + Math.cos(a) * scale * 0.7 + Math.sin(3 * a) * scale * 0.22,
  };
}
function reset() {
  nodes.length = 0;
  for (let i = 0; i < count; i++) {
    const p = anchor(i);
    nodes.push({ ...p, vx: 0, vy: 0 });
  }
}
function resized() {
  reset();
}
function start() {
  setStatus("光をつかんでいます。離すと揺れが残ります");
}
function move() {}
function end() {
  setStatus("光が、ゆっくり重さを取り戻す");
}
function action() {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    nodes[i].vx += Math.cos(a) * 12;
    nodes[i].vy += Math.sin(a) * 8;
  }
  setStatus("光に力を加えました");
}
function update(dt) {
  const k = Math.pow(Number(slider.value), dt * 60),
    s = dt * 60;
  for (let i = 0; i < count; i++) {
    const n = nodes[i],
      p = anchor(i);
    let tx = p.x,
      ty = p.y;
    if (pointer.down) {
      const d = Math.hypot(p.x - pointer.x * W, p.y - pointer.y * H),
        weight = Math.exp((-d * d) / (Math.min(W, H) * 0.26) ** 2);
      tx += (pointer.x * W - p.x) * weight * 0.9;
      ty += (pointer.y * H - p.y) * weight * 0.9;
    }
    n.vx += (tx - n.x) * 0.025 * s;
    n.vy += (ty - n.y) * 0.025 * s;
    n.vx *= k;
    n.vy *= k;
    n.x += n.vx * s;
    n.y += n.vy * s;
  }
}
function render() {
  if (!ctx) return;
  ctx.fillStyle = "#080e18";
  ctx.fillRect(0, 0, W, H);
  const grad = ctx.createRadialGradient(
    W * 0.63,
    H * 0.43,
    0,
    W * 0.63,
    H * 0.43,
    Math.min(W, H) * 0.55,
  );
  grad.addColorStop(0, "#26324755");
  grad.addColorStop(1, "#080e1800");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  if (!nodes.length) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let ribbon = 0; ribbon < 7; ribbon++) {
    ctx.beginPath();
    for (let i = 0; i <= count; i++) {
      const n = nodes[i % count],
        a = (i / count) * Math.PI * 2,
        offset = (ribbon - 3) * 3.1;
      const x = n.x + Math.cos(a * 2 + time * 0.12) * offset,
        y = n.y + Math.sin(a * 3 + time * 0.12) * offset;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = ribbon === 3 ? "#fff3d8" : "#b9d9e9";
    ctx.globalAlpha = ribbon === 3 ? 0.85 : 0.21;
    ctx.lineWidth = ribbon === 3 ? 1.4 : 0.65;
    ctx.shadowColor = "#bcd8f0";
    ctx.shadowBlur = ribbon === 3 ? 20 : 6;
    ctx.stroke();
  }
  ctx.restore();
  if (pointer.down) {
    ctx.beginPath();
    ctx.arc(pointer.x * W, pointer.y * H, 5, 0, Math.PI * 2);
    ctx.strokeStyle = "#e4d5aa";
    ctx.stroke();
  }
}
reset();
resize();
if (ctx) setPause(paused);
setStatus(
  !ctx
    ? "Canvas 2Dを利用できません。対応ブラウザーで開いてください"
    : paused
      ? "動きを減らす設定で停止中。調整UIから再生できます"
      : "光をドラッグして、離してみてください",
);
