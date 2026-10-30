const canvas = document.querySelector("canvas"),
  ctx = canvas.getContext("2d");
const status = document.querySelector("#status"),
  pauseButton = document.querySelector("#pause");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
let paused = reduce.matches,
  width = innerWidth,
  height = innerHeight,
  dpr = 1,
  previous = 0,
  time = 0,
  raf = 0;
const panel = document.querySelector("#controls"),
  toggle = document.querySelector("#toggle");
function closePanel() {
  panel.hidden = true;
  toggle.setAttribute("aria-expanded", "false");
  toggle.focus();
}
toggle.onclick = () => {
  panel.hidden = !panel.hidden;
  toggle.setAttribute("aria-expanded", String(!panel.hidden));
  if (!panel.hidden) document.querySelector("#close").focus();
};
document.querySelector("#close").onclick = closePanel;
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !panel.hidden) closePanel();
});
function syncPause() {
  pauseButton.textContent = paused ? "再生" : "一時停止";
  pauseButton.setAttribute("aria-pressed", String(paused));
  status.textContent = paused
    ? "停止中 — 再生すると動きます"
    : canvas.dataset.hint;
}
pauseButton.onclick = () => {
  paused = !paused;
  syncPause();
  previous = 0;
  schedule();
};
reduce.addEventListener("change", (e) => {
  paused = e.matches;
  syncPause();
  previous = 0;
  schedule();
});
function resize() {
  if (!ctx) {
    status.textContent =
      "Canvas 2Dを利用できません。対応ブラウザーで開いてください。";
    return;
  }
  width = innerWidth;
  height = innerHeight;
  dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layout();
  draw(0);
}
function schedule() {
  if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
}
function frame(stamp) {
  raf = 0;
  const dt = previous ? Math.min((stamp - previous) / 1000, 0.033) : 0;
  previous = stamp;
  if (!paused) {
    time += dt;
    draw(dt);
  }
  if (!paused) schedule();
}
document.addEventListener("visibilitychange", () => {
  previous = 0;
  if (document.hidden) {
    cancelAnimationFrame(raf);
    raf = 0;
  } else schedule();
});
addEventListener("resize", resize);
function bindRange(id, onChange) {
  const el = document.querySelector("#" + id),
    out = document.querySelector("#" + id + "-value");
  el.oninput = () => {
    out.value = el.value;
    onChange(Number(el.value));
    draw(0);
  };
}
function ready() {
  resize();
  syncPause();
  schedule();
}
let power = 1,
  returnSpeed = 0.3,
  particles = [],
  scene = { x: 0, y: 0, w: 0, h: 0, unit: 1 },
  pointer = null;
const cols = 90,
  rows = 60;
function hash(x, y) {
  return Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1;
}
function colorAt(x, y) {
  const moon = Math.hypot(x - 0.7, y - 0.27) < 0.1;
  if (moon) return "#ffdeb0";
  if (y > 0.66 + Math.sin(x * 12) * 0.014) {
    const line = Math.sin(y * 170 + x * 17);
    return line > 0.7 ? "#dd8e9e" : line < -0.7 ? "#45758d" : "#293b62";
  }
  if (y > 0.55 - Math.sin(x * 8) * 0.08 - Math.sin(x * 21) * 0.03)
    return "#385174";
  if (y > 0.46 - Math.sin(x * 7 + 1) * 0.12 - Math.sin(x * 19) * 0.04)
    return "#70688c";
  if (y > 0.4 - Math.sin(x * 8) * 0.13 - Math.sin(x * 17) * 0.04)
    return "#b385a0";
  if (hash(Math.floor(x * cols), Math.floor(y * rows)) > 0.997 && y < 0.3)
    return "#ebceae";
  return ["#242744", "#323250", "#44405d", "#5e4d6e", "#805b7c"][
    Math.min(4, Math.floor(y * 9))
  ];
}
function layout() {
  scene.w = Math.min(width * (width < 650 ? 0.9 : 0.65), 1000);
  scene.h = (scene.w * rows) / cols;
  scene.unit = scene.w / cols;
  scene.x = width * (width < 650 ? 0.5 : 0.65) - scene.w / 2;
  scene.y = height * (width < 650 ? 0.64 : 0.48) - scene.h / 2;
  if (scene.h > height * 0.52) {
    scene.h = height * 0.52;
    scene.w = (scene.h * cols) / rows;
    scene.unit = scene.w / cols;
    scene.x = width * (width < 650 ? 0.5 : 0.65) - scene.w / 2;
    scene.y = height * (width < 650 ? 0.65 : 0.48) - scene.h / 2;
  }
  if (!particles.length)
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const r = Math.floor(y / 3),
          a = (x / cols) * Math.PI * 2 + (r % 2 ? 0.035 : 0);
        particles.push({
          x,
          y,
          color: colorAt(x / cols, y / rows),
          amount: 0,
          energy: 0,
          tx: cols / 2 + Math.cos(a) * (r + 2) * 1.65,
          ty: rows / 2 + Math.sin(a) * (r + 2) * 1.15,
        });
      }
}
function excite(x, y) {
  const gx = (x - scene.x) / scene.unit,
    gy = (y - scene.y) / scene.unit;
  for (const p of particles) {
    const d = Math.hypot((p.drawX ?? p.x) - gx, (p.drawY ?? p.y) - gy);
    if (d < 13) p.energy = Math.max(p.energy, (1 - d / 13) * power);
  }
}
canvas.addEventListener("pointerdown", (e) => {
  if (paused || pointer) return;
  canvas.focus({ preventScroll: true });
  canvas.setPointerCapture(e.pointerId);
  pointer = { x: e.clientX, y: e.clientY, id: e.pointerId };
  excite(pointer.x, pointer.y);
});
canvas.addEventListener("pointermove", (e) => {
  if (!pointer || paused || pointer.id !== e.pointerId) return;
  const n = Math.min(
    20,
    Math.ceil(Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) / 8),
  );
  for (let i = 1; i <= n; i++)
    excite(
      pointer.x + ((e.clientX - pointer.x) * i) / n,
      pointer.y + ((e.clientY - pointer.y) * i) / n,
    );
  pointer = { x: e.clientX, y: e.clientY, id: e.pointerId };
});
function release(e) {
  if (pointer?.id === e.pointerId) pointer = null;
}
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);
canvas.addEventListener("lostpointercapture", release);
function transform() {
  for (const p of particles) {
    p.energy = 1;
    if (paused) p.amount = 1;
  }
  draw(0);
}
document.querySelector("#transform").onclick = transform;
canvas.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    transform();
  }
});
document.querySelector("#reset").onclick = () => {
  pointer = null;
  for (const p of particles) {
    p.amount = 0;
    p.energy = 0;
  }
  time = 0;
  draw(0);
};
bindRange("power", (v) => (power = v));
bindRange("return", (v) => (returnSpeed = v));
function draw(dt) {
  if (!ctx) return;
  ctx.fillStyle = "#101529";
  ctx.fillRect(0, 0, width, height);
  const u = scene.unit;
  ctx.fillStyle = "#151a30";
  ctx.fillRect(scene.x - 12, scene.y - 12, scene.w + 24, scene.h + 24);
  for (const p of particles) {
    if (dt) {
      p.energy *= Math.exp(-dt * returnSpeed * 0.65);
      p.amount += (p.energy - p.amount) * (1 - Math.exp(-dt * 12));
    }
    const a = Math.min(1, p.amount),
      ease = a * a * (3 - 2 * a);
    const sway = Math.sin(p.y * 0.3 + time * 0.5) * a * 1.6;
    const x = p.x + (p.tx - p.x) * ease + sway,
      y = p.y + (p.ty - p.y) * ease;
    p.drawX = x;
    p.drawY = y;
    ctx.fillStyle = p.color;
    const s = u * (0.96 - a * 0.18);
    ctx.fillRect(
      Math.round(scene.x + x * u),
      Math.round(scene.y + y * u),
      Math.ceil(s),
      Math.ceil(s),
    );
  }
  ctx.strokeStyle = "#f7b87840";
  ctx.lineWidth = 1;
  ctx.strokeRect(scene.x - 12.5, scene.y - 12.5, scene.w + 25, scene.h + 25);
  ctx.fillStyle = "#b69eb3";
  ctx.font = "8px monospace";
  ctx.textAlign = "left";
  ctx.fillText("90 × 60 / A DIFFERENT ORDER", scene.x, scene.y + scene.h + 32);
}
ready();
pauseButton.addEventListener("click", () => {
  pointer = null;
});

addEventListener("blur", () => {
  pointer = null;
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pointer = null;
});
