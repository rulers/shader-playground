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
let strokes = [],
  current = null;
const delays = [0, 1.5, 3, 4.5],
  colors = ["#44372f", "#a23e2c", "#bf8254", "#667d78"];
function reset() {
  strokes = [];
  current = null;
  const points = [];
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    points.push({
      x: W * 0.65 + Math.sin(a) * Math.min(W * 0.23, H * 0.25),
      y: H * 0.4 + Math.sin(a * 2) * Math.min(W * 0.1, H * 0.13),
      t: (i / 160) * 2,
    });
  }
  strokes.push({ points, born: time - 3, demo: true });
}
function resized() {
  reset();
}
function start() {
  current = {
    points: [{ x: pointer.x * W, y: pointer.y * H, t: 0 }],
    born: time,
  };
  strokes.push(current);
  if (strokes.length > 8) strokes.shift();
  setStatus("描いた動きが、少し遅れて戻ってきます");
}
function move() {
  if (!current || current.points.length >= 600) return;
  const previous = current.points.at(-1);
  if (Math.hypot(previous.x - pointer.x * W, previous.y - pointer.y * H) > 3)
    current.points.push({
      x: pointer.x * W,
      y: pointer.y * H,
      t: time - current.born,
    });
}
function end() {
  current = null;
}
function action() {
  const points = [];
  for (let i = 0; i <= 100; i++) {
    const a = (i / 100) * Math.PI * 2;
    points.push({
      x: W * 0.65 + Math.cos(a) * Math.min(W, H) * (0.15 + (i / 100) * 0.08),
      y: H * 0.4 + Math.sin(a) * Math.min(W, H) * (0.15 + (i / 100) * 0.08),
      t: (i / 100) * 1.8,
    });
  }
  strokes.push({ points, born: time });
  if (strokes.length > 8) strokes.shift();
  setStatus("新しい軌跡を時間差で再生します");
}
function update() {
  strokes = strokes.filter(
    (s) => s === current || s.demo || time - s.born < 15,
  );
}
function render() {
  if (!ctx) return;
  ctx.fillStyle = "#e8e2d6";
  ctx.fillRect(0, 0, W, H);
  const speed = Number(slider.value);
  for (const s of strokes) {
    const age = s.demo ? (time + 3) % 11 : time - s.born;
    for (let k = 3; k >= 0; k--) {
      const phase = (age - delays[k]) * speed;
      if (phase < 0) continue;
      ctx.beginPath();
      let started = false;
      for (const p of s.points) {
        if (p.t > phase) break;
        const life = phase - p.t;
        const fade = Math.max(0, 1 - life / 5);
        if (fade <= 0) {
          started = false;
          continue;
        }
        const x = p.x + k * 7 * Math.sin(p.t * 2 + 0.5),
          y = p.y + k * 7;
        started ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        started = true;
      }
      ctx.strokeStyle = colors[k];
      ctx.lineWidth = k === 0 ? 1.7 : 1.2;
      ctx.globalAlpha =
        Math.max(0, Math.min(1, 1 - (phase - s.points.at(-1).t) / 7)) *
        (k === 0 ? 0.85 : 0.6);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      const head = s.points.findLast((p) => p.t <= phase);
      if (head && phase - head.t < 0.15) {
        ctx.beginPath();
        ctx.arc(
          head.x + k * 7 * Math.sin(head.t * 2 + 0.5),
          head.y + k * 7,
          2.5,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = colors[k];
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}
resize();
if (ctx) setPause(paused);
setStatus(
  !ctx
    ? "Canvas 2Dを利用できません。対応ブラウザーで開いてください"
    : paused
      ? "動きを減らす設定で停止中。調整UIから再生できます"
      : "指で描き、少し待つと時間の残響が現れます",
);
