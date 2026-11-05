const canvas = document.querySelector("#view");
const ctx = canvas.getContext("2d");
const status = document.querySelector("#status");
const motion = matchMedia("(prefers-reduced-motion: reduce)");
let paused = motion.matches,
  time = 0,
  last = 0,
  raf = 0,
  width = 1,
  height = 1,
  dpr = 1;
let amount = Number(document.querySelector("#amount").value);
let pointer = { x: innerWidth * 0.62, y: innerHeight * 0.42, active: false };
let pointerId = null;
const toggle = document.querySelector("#toggle"),
  panel = document.querySelector("#controls");
function setPanel(open) {
  panel.hidden = !open;
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "調整UIを閉じる" : "調整UIを開く");
  if (open) document.querySelector("#amount").focus();
  else toggle.focus();
}
toggle.onclick = () => setPanel(panel.hidden);
document.querySelector("#close").onclick = () => setPanel(false);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !panel.hidden) setPanel(false);
});
function updatePause() {
  document.querySelector("#pause").textContent = paused ? "再生" : "一時停止";
  document.querySelector("#pause").setAttribute("aria-pressed", String(paused));
  status.textContent = paused ? "停止中 · 再生で動き出します" : instructions;
}
document.querySelector("#pause").onclick = () => {
  paused = !paused;
  updatePause();
  last = 0;
  schedule();
};
document.querySelector("#amount").oninput = (e) => {
  amount = Number(e.target.value);
  document.querySelector("#amount-value").value = e.target.value;
  render();
};
document.querySelector("#reset").onclick = () => {
  time = 0;
  reset();
  render();
};
motion.addEventListener("change", (e) => {
  paused = e.matches;
  updatePause();
  last = 0;
  schedule();
});
function locate(e) {
  const r = canvas.getBoundingClientRect();
  pointer.x = e.clientX - r.left;
  pointer.y = e.clientY - r.top;
}
canvas.addEventListener("pointerdown", (e) => {
  if (pointerId !== null) return;
  pointerId = e.pointerId;
  canvas.setPointerCapture(e.pointerId);
  locate(e);
  pointer.active = true;
  canvas.focus({ preventScroll: true });
  interact();
  render();
});
canvas.addEventListener("pointermove", (e) => {
  if (pointerId !== null && e.pointerId !== pointerId) return;
  locate(e);
  pointer.active = true;
  move();
  if (paused) render();
});
function release(e) {
  if (pointerId !== e.pointerId) return;
  pointerId = null;
  pointer.active = false;
  end();
  if (paused) render();
}
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);
canvas.addEventListener("lostpointercapture", release);
canvas.addEventListener("pointerleave", () => {
  if (pointerId === null) {
    pointer.active = false;
    end();
  }
});
canvas.addEventListener("keydown", (e) => {
  const delta = 30;
  if (e.key.startsWith("Arrow")) {
    e.preventDefault();
    if (e.key === "ArrowLeft") pointer.x -= delta;
    if (e.key === "ArrowRight") pointer.x += delta;
    if (e.key === "ArrowUp") pointer.y -= delta;
    if (e.key === "ArrowDown") pointer.y += delta;
    pointer.x = Math.max(0, Math.min(width, pointer.x));
    pointer.y = Math.max(0, Math.min(height, pointer.y));
    pointer.active = true;
    move();
    render();
  }
  if (e.code === "Space") {
    e.preventDefault();
    pointer.active = true;
    interact();
    render();
  }
});
canvas.addEventListener("keyup", (e) => {
  if (e.code === "Space") {
    pointer.active = false;
    end();
  }
});
canvas.addEventListener("blur", () => {
  pointer.active = false;
  pointerId = null;
  end();
});
function resize() {
  width = innerWidth;
  height = innerHeight;
  dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  reset();
  render();
}
function schedule() {
  if (!raf && !paused && !document.hidden) raf = requestAnimationFrame(frame);
}
function frame(stamp) {
  raf = 0;
  if (paused || document.hidden) return;
  const dt = last ? Math.min((stamp - last) / 1000, 0.035) : 1 / 60;
  last = stamp;
  time += dt;
  step(dt);
  render();
  schedule();
}
document.addEventListener("visibilitychange", () => {
  last = 0;
  if (document.hidden) {
    cancelAnimationFrame(raf);
    raf = 0;
    pointer.active = false;
    pointerId = null;
    end();
  } else schedule();
});
addEventListener("resize", resize);
const instructions = "クリック／タップで連鎖。ドラッグで秩序をほどく";
let pieces = [],
  cell = 48,
  nextDrag = 0,
  pulse = null;
function reset() {
  pieces = [];
  pulse = null;
  nextDrag = 0;
  const size = Math.min(width * 0.68, height * 0.63);
  cell = Math.max(30, size / 12);
  const cols = Math.ceil(size / cell),
    rows = Math.ceil(Math.min(height * 0.65, size * 0.8) / cell);
  const left = width * 0.57 - (cols * cell) / 2,
    top = height * 0.43 - (rows * cell) / 2;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      for (let tri = 0; tri < 2; tri++)
        pieces.push({
          x: left + x * cell,
          y: top + y * cell,
          tri,
          ox: 0,
          oy: 0,
          vx: 0,
          vy: 0,
          angle: 0,
          spin: 0,
          delay: -1,
          energy: 0,
          hue: (x + y) % 5,
        });
}
function explode(x, y) {
  pulse = { x, y, born: time };
  for (const p of pieces) {
    const dx = p.x + cell / 2 - x,
      dy = p.y + cell / 2 - y,
      d = Math.hypot(dx, dy);
    if (d < amount) {
      p.delay = d / 550;
      p.energy = 1 - d / amount;
      const a = d > 1 ? Math.atan2(dy, dx) : p.tri ? 1 : -1;
      p.kx = Math.cos(a) * 260 * p.energy;
      p.ky = Math.sin(a) * 260 * p.energy;
      p.ks = (p.tri ? 1 : -1) * (2 + p.energy * 5);
    }
  }
}
function interact() {
  explode(pointer.x, pointer.y);
  nextDrag = time + 0.08;
}
function move() {
  if (pointerId !== null && time >= nextDrag) {
    interact();
  }
}
function end() {}
function step(dt) {
  for (const p of pieces) {
    if (p.delay >= 0) {
      p.delay -= dt;
      if (p.delay < 0) {
        p.vx += p.kx;
        p.vy += p.ky;
        p.spin += p.ks;
      }
    }
    p.vx += (-p.ox * 24 - p.vx * 5.5) * dt;
    p.vy += (-p.oy * 24 - p.vy * 5.5) * dt;
    p.spin += (-p.angle * 22 - p.spin * 5.8) * dt;
    p.ox += p.vx * dt;
    p.oy += p.vy * dt;
    p.angle += p.spin * dt;
  }
}
function render() {
  ctx.fillStyle = "#111921";
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(
    width * 0.57,
    height * 0.4,
    0,
    width * 0.57,
    height * 0.4,
    width * 0.65,
  );
  glow.addColorStop(0, "#273542");
  glow.addColorStop(1, "#111921");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  for (const p of pieces) {
    ctx.save();
    ctx.translate(p.x + cell / 2 + p.ox, p.y + cell / 2 + p.oy);
    ctx.rotate(p.angle);
    const h = cell * 0.47;
    ctx.beginPath();
    if (p.tri === 0) {
      ctx.moveTo(-h, -h);
      ctx.lineTo(h, -h);
      ctx.lineTo(-h, h);
    } else {
      ctx.moveTo(h, h);
      ctx.lineTo(-h, h);
      ctx.lineTo(h, -h);
    }
    ctx.closePath();
    ctx.fillStyle = ["#ded9c9", "#bcaaa0", "#d19b79", "#8ea6a7", "#6e828d"][
      p.hue
    ];
    ctx.globalAlpha = p.tri ? 0.85 : 1;
    ctx.fill();
    ctx.restore();
  }
  if (pulse && time - pulse.born < 0.65) {
    const t = (time - pulse.born) / 0.65;
    ctx.strokeStyle = `rgba(234,201,160,${(1 - t) * 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pulse.x, pulse.y, t * amount, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (pointer.active) {
    ctx.strokeStyle = "#f3ddbd77";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 9, 0, Math.PI * 2);
    ctx.stroke();
  }
}
if (ctx) {
  resize();
  updatePause();
  schedule();
} else
  status.textContent =
    "Canvas 2Dを利用できません。対応ブラウザーで開いてください。";
