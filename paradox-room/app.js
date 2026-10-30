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
let depth = 1,
  inertia = 0.6,
  roll = 0,
  targetRoll = 0,
  tiltX = 0.1,
  tiltY = -0.08,
  targetX = 0.1,
  targetY = -0.08,
  pointer = null;
let scene = { x: 0, y: 0, size: 1 };
function layout() {
  scene = {
    x: width * (width < 650 ? 0.5 : 0.64),
    y: height * (width < 650 ? 0.64 : 0.49),
    size: Math.min(width * (width < 650 ? 0.78 : 0.65), height * 0.73),
  };
}
function project(x, y, z) {
  const co = Math.cos(roll),
    si = Math.sin(roll);
  const rx = x * co - y * si,
    ry = x * si + y * co;
  const f = 1 / (1 + z * depth * 0.3);
  return {
    x: scene.x + (rx + tiltX * z) * scene.size * 0.53 * f,
    y: scene.y + (ry + tiltY * z) * scene.size * 0.53 * f,
  };
}
function path(points, fill, stroke) {
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}
function plane(points, fill, stroke) {
  path(
    points.map((p) => project(...p)),
    fill,
    stroke,
  );
}
function draw(dt) {
  if (!ctx) return;
  if (dt) {
    const ease = 1 - Math.exp(-dt * (3 + (1 - inertia) * 12));
    roll += (targetRoll - roll) * ease;
    tiltX += (targetX - tiltX) * ease;
    tiltY += (targetY - tiltY) * ease;
  }
  ctx.fillStyle = "#e7deca";
  ctx.fillRect(0, 0, width, height);
  ctx.lineWidth = 1;
  const limit = 22;
  // Four continuous walls establish perspective; alternating stairs contradict it.
  for (let z = limit - 1; z >= 0; z--) {
    const shade = z % 2 ? "#e0d6c0" : "#e8dfcc";
    plane(
      [
        [-1, -1, z],
        [1, -1, z],
        [1, -1, z + 1],
        [-1, -1, z + 1],
      ],
      shade,
      "#363c3a40",
    );
    plane(
      [
        [-1, 1, z],
        [1, 1, z],
        [1, 1, z + 1],
        [-1, 1, z + 1],
      ],
      z % 2 ? "#afb4a5" : "#c7cab9",
      "#363c3a60",
    );
    plane(
      [
        [-1, -1, z],
        [-1, 1, z],
        [-1, 1, z + 1],
        [-1, -1, z + 1],
      ],
      "#6d7773",
      "#363c3a70",
    );
    plane(
      [
        [1, -1, z],
        [1, 1, z],
        [1, 1, z + 1],
        [1, -1, z + 1],
      ],
      "#d5c7b0",
      "#363c3a60",
    );
    // On every second landing, an ascending flight attaches to another wall.
    if (z % 3 === 0) {
      const side = Math.floor(z / 3) % 4;
      for (let s = 6; s >= 0; s--) {
        const h = 0.13 * s,
          zz = z + s * 0.12;
        const points = [
          [-0.65, 1 - h, zz],
          [0.65, 1 - h, zz],
          [0.65, 1 - h, zz + 0.12],
          [-0.65, 1 - h, zz + 0.12],
        ].map(([x, y, k]) => {
          for (let r = 0; r < side; r++) [x, y] = [-y, x];
          return [x, y, k];
        });
        plane(points, s % 2 ? "#e7deca" : "#bdad91", "#343b3860");
      }
    }
    const corner = [
      [-1, -1, z],
      [1, -1, z],
      [1, 1, z],
      [-1, 1, z],
    ];
    plane(corner, null, z % 3 === 0 ? "#2b3532" : "#2b353275");
  }
  const end = project(0, 0, limit);
  ctx.fillStyle = "#a95032";
  ctx.beginPath();
  ctx.arc(end.x, end.y, Math.max(2, scene.size * 0.006), 0, Math.PI * 2);
  ctx.fill();
  // A tiny gravity reference reveals what has changed after dragging.
  ctx.save();
  ctx.translate(scene.x, Math.min(height - 70, scene.y + scene.size * 0.55));
  ctx.strokeStyle = "#a95032";
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(0, 8);
  ctx.lineTo(-3, 4);
  ctx.moveTo(0, 8);
  ctx.lineTo(3, 4);
  ctx.stroke();
  ctx.restore();
}
canvas.addEventListener("pointerdown", (e) => {
  if (paused || pointer) return;
  canvas.focus({ preventScroll: true });
  canvas.setPointerCapture(e.pointerId);
  pointer = {
    x: e.clientX,
    y: e.clientY,
    id: e.pointerId,
    roll: targetRoll,
    tx: targetX,
    ty: targetY,
  };
});
canvas.addEventListener("pointermove", (e) => {
  if (!pointer || pointer.id !== e.pointerId || paused) return;
  targetRoll =
    pointer.roll +
    ((e.clientX - pointer.x) / Math.max(200, width * 0.45)) * Math.PI;
  targetX = Math.max(
    -0.18,
    Math.min(0.18, pointer.tx + ((e.clientX - pointer.x) / width) * 0.35),
  );
  targetY = Math.max(
    -0.18,
    Math.min(0.18, pointer.ty + ((e.clientY - pointer.y) / height) * 0.5),
  );
});
function release(e) {
  if (pointer?.id !== e.pointerId) return;
  pointer = null;
  targetRoll = (Math.round(targetRoll / (Math.PI / 2)) * Math.PI) / 2;
}
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);
canvas.addEventListener("lostpointercapture", release);
function invert() {
  targetRoll += Math.PI / 2;
  if (paused) {
    roll = targetRoll;
    draw(0);
  }
}
document.querySelector("#invert").onclick = invert;
canvas.addEventListener("keydown", (e) => {
  if (
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " "].includes(
      e.key,
    )
  ) {
    e.preventDefault();
    if (e.key === "Enter" || e.key === " ") invert();
    else {
      if (e.key === "ArrowLeft") targetRoll -= Math.PI / 8;
      if (e.key === "ArrowRight") targetRoll += Math.PI / 8;
      if (e.key === "ArrowUp") targetY = Math.max(-0.18, targetY - 0.03);
      if (e.key === "ArrowDown") targetY = Math.min(0.18, targetY + 0.03);
      if (paused) {
        roll = targetRoll;
        tiltY = targetY;
        draw(0);
      }
    }
  }
});
document.querySelector("#reset").onclick = () => {
  pointer = null;
  roll = targetRoll = 0;
  tiltX = targetX = 0.1;
  tiltY = targetY = -0.08;
  time = 0;
  draw(0);
};
bindRange("depth", (v) => (depth = v));
bindRange("inertia", (v) => (inertia = v));
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
