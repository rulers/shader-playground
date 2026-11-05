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
const instructions = "動かすと引力。押して引き、離して余韻を残す";
let field = {
    x: innerWidth * 0.62,
    y: innerHeight * 0.42,
    vx: 0,
    vy: 0,
    power: 0,
    vpower: 0,
  },
  press = false;
function reset() {
  field = {
    x: width * 0.62,
    y: height * 0.42,
    vx: 0,
    vy: 0,
    power: 0,
    vpower: 0,
  };
  press = false;
  pointer.active = false;
}
function interact() {
  press = true;
  field.power = Math.max(field.power, 0.12);
}
function move() {}
function end() {
  press = false;
}
function step(dt) {
  const target = pointer.active ? 1 : 0,
    stiff = press ? 60 : 32;
  field.vpower += ((target - field.power) * stiff - field.vpower * 7) * dt;
  field.power += field.vpower * dt;
  field.vx += ((pointer.x - field.x) * 50 - field.vx * 9) * dt;
  field.vy += ((pointer.y - field.y) * 50 - field.vy * 9) * dt;
  field.x += field.vx * dt;
  field.y += field.vy * dt;
}
function warp(x, y, layer) {
  const cx = width * 0.58,
    cy = height * 0.43,
    angle = layer * 0.055,
    co = Math.cos(angle),
    si = Math.sin(angle);
  let xx = cx + (x - cx) * co - (y - cy) * si,
    yy = cy + (x - cx) * si + (y - cy) * co;
  const dx = xx - field.x,
    dy = yy - field.y,
    r = Math.hypot(dx, dy),
    radius = Math.min(width, height) * 0.47;
  const force =
    Math.exp((-r * r) / (radius * radius)) *
    amount *
    field.power *
    (press ? 0.32 : 0.23) *
    (layer ? 1 : -0.4);
  return [xx - dx * force, yy - dy * force];
}
function render() {
  ctx.fillStyle = "#e9e7df";
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  const spacing = Math.max(7, Math.min(width, height) / 75),
    margin = Math.max(width, height) * 0.18,
    step = Math.max(16, Math.max(width, height) / 100);
  // A finite sampling interval and line count keep the interference inexpensive.
  for (let layer = 0; layer < 2; layer++) {
    ctx.strokeStyle = layer ? "#25292de8" : "#25292df0";
    ctx.lineWidth = spacing * 0.36;
    ctx.beginPath();
    for (let x = -margin; x <= width + margin; x += spacing) {
      let first = true;
      for (let y = -margin; y <= height + margin; y += step) {
        const p = warp(x, y, layer);
        if (first) {
          ctx.moveTo(...p);
          first = false;
        } else ctx.lineTo(...p);
      }
    }
    ctx.stroke();
    // A wide, sparse transverse weave gives a grid without overwhelming the moiré.
    ctx.strokeStyle = layer ? "#25292d27" : "#25292d38";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let y = -margin; y < height + margin; y += spacing * 6) {
      let first = true;
      for (let x = -margin; x < width + margin; x += step) {
        const p = warp(x, y, layer);
        if (first) {
          ctx.moveTo(...p);
          first = false;
        } else ctx.lineTo(...p);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
  const fade = ctx.createLinearGradient(0, 0, width * 0.65, 0);
  fade.addColorStop(0, "#e9e7dff5");
  fade.addColorStop(0.52, "#e9e7df55");
  fade.addColorStop(1, "#e9e7df00");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, width, height);
  if (pointer.active) {
    ctx.strokeStyle = "#25292d99";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, press ? 13 : 7, 0, Math.PI * 2);
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
