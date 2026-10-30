import { TEXT } from "./wagahai.js";
import { rainSchedule } from "./lib/rain.js";
import { seeded } from "./lib/mapping.js";
const W = 780,
  H = 1020,
  $ = (id) => document.getElementById(id),
  chars = Array.from(TEXT).filter((c) => !/[\s　]/u.test(c));
let initialized = false;
let rawGray = null,
  maskCanvas = null,
  field = null,
  fontReady = false,
  fontName = "Zen Antique Soft",
  items = [],
  seed = 1409,
  raf = 0,
  playStarted = 0,
  playBase = 0,
  playing = false;
const canvas = $("art");
let three = null, paperOrder = [];
function stop() {
  cancelAnimationFrame(raf);
  playing = false;
  $("play").textContent = "再生";
  canvas.setAttribute("aria-label", "原稿をクリックして再生");
}
let gaiji = null;
async function loadGaiji() {
  const image = new Image();
  image.src = "./assets/gaiji-uso.png";
  await image.decode();
  gaiji = document.createElement("canvas");
  gaiji.width = image.naturalWidth;
  gaiji.height = image.naturalHeight;
  const context = gaiji.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, gaiji.width, gaiji.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const alpha = 255 - pixels.data[i];
    pixels.data.set([41, 37, 31, alpha], i);
  }
  context.putImageData(pixels, 0, 0);
}
function drawCharacter(context, glyph, x, y, size) {
  if (glyph === "―") context.fillRect(x - size * 0.48, y - size * 0.04, size * 0.96, size * 0.06);
  else if (glyph === "譃" && gaiji) context.drawImage(gaiji, x - size / 2, y - size / 2, size, size);
  else context.fillText(glyph, x, y);
}
function storyAt(progress) {
  const seconds = progress * 22;
  return seconds < 5
    ? { phase: "文章", seconds }
    : seconds < 11
      ? { phase: "落下", seconds }
      : seconds < 12
        ? { phase: "余韻", seconds }
        : { phase: seconds < 22 ? "肖像へ" : "完成", seconds };
}
const INTRO = 176;
function sourcePosition(i) {
  const n = i % INTRO;
  return { x: W - 130 - Math.floor(n / 22) * 65, y: 220 + (n % 22) * 28 };
}
function paperMotion(t) {
  if (t >= 1) return { height: 0, t: 1 };
  let height;
  if (t < 0.78) {
    const f = t / 0.78;
    height = 680 * (1 - f * f);
  } else {
    const b = (t - 0.78) / 0.22;
    height = Math.sin(b * Math.PI) * 15 * (1 - b);
  }
  return { height: Math.max(0, height), t };
}
const INTRO_FADE_START = 4,
  GLYPH_FADE_DURATION = 1.25;
const INTRO_BODY_START = 7.8,
  INTRO_BODY_SPREAD = 2.2;
const INTRO_FADE_END =
  INTRO_BODY_START + INTRO_BODY_SPREAD + GLYPH_FADE_DURATION;
const TILT_START = INTRO_FADE_END + 0.25,
  TILT_END = TILT_START + 2.8,
  RAIN_START = TILT_END + 0.3;
function smoothStep(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
}
function makeIntroFadePlan(body, mode, seedValue) {
  const random = seeded(seedValue + 773),
    letters = Array.from(body),
    groups = [];
  if (mode === "words" && typeof Intl.Segmenter === "function") {
    let cursor = 0;
    for (const part of new Intl.Segmenter("ja", {
      granularity: "word",
    }).segment(body)) {
      const indexes = Array.from(part.segment, () => cursor++);
      if (!part.isWordLike && groups.length)
        groups[groups.length - 1].push(...indexes);
      else groups.push(indexes);
    }
  } else if (mode === "words") {
    for (let i = 0; i < letters.length; ) {
      const length = 2 + Math.floor(random() * 3);
      groups.push(
        Array.from({ length: Math.min(length, letters.length - i) }, () => i++),
      );
    }
  } else for (let i = 0; i < letters.length; i++) groups.push([i]);
  const order = groups.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const result = [];
  for (let i = 0; i < Array.from("吾輩は猫である").length; i++)
    result.push({
      start: 4 + i * 0.16,
      lift: 26,
      drift: 0,
      group: "title-" + i,
    });
  for (let i = 0; i < Array.from("夏目漱石").length; i++)
    result.push({
      start: 5.7 + i * 0.16,
      lift: 26,
      drift: 0,
      group: "author-" + i,
    });
  order.forEach((groupIndex, rank) => {
    const start =
        INTRO_BODY_START +
        (INTRO_BODY_SPREAD * rank) / Math.max(1, order.length - 1),
      lift = 22 + random() * 14,
      drift = (random() - 0.5) * 16;
    for (const index of groups[groupIndex])
      result[11 + index] = { start, lift, drift, group: groupIndex };
  });
  return result;
}
let introFadePlan = null;
function glyphFadeAt(seconds, index) {
  if (!introFadePlan)
    introFadePlan = makeIntroFadePlan(
      chars.slice(0, INTRO).join(""),
      $("introMode").value,
      seed,
    );
  const p = introFadePlan[index],
    t = smoothStep((seconds - p.start) / GLYPH_FADE_DURATION);
  return { alpha: 1 - t, lift: t * p.lift, drift: t * p.drift, blur: t * 3.8 };
}
function transitionAt(seconds) {
  const tilt = smoothStep((seconds - TILT_START) / (TILT_END - TILT_START));
  return {
    tilt,
    matrix: [
      1 - 0.12 * tilt,
      0.035 * tilt,
      -0.035 * tilt,
      1 - 0.22 * tilt,
      62 * tilt,
      155 * tilt,
    ],
  };
}
function introGlyphs() {
  const result = [];
  for (const [text, y, size] of [
    ["吾輩は猫である", 90, 34],
    ["夏目漱石", 140, 18],
  ]) {
    const letters = Array.from(text);
    letters.forEach((glyph, i) =>
      result.push({
        glyph,
        x: W / 2 + (i - (letters.length - 1) / 2) * size,
        y,
        size,
      }),
    );
  }
  for (let i = 0; i < INTRO; i++)
    result.push({ glyph: chars[i], ...sourcePosition(i), size: 23 });
  return result;
}
function playbackDuration() {
  return $("effect").value === "paper"
    ? RAIN_START +
        rainSchedule(
          0,
          items.length,
          +$("batch").value,
          +$("gap").value / 100,
          +$("accel").value / 100,
          +$("maxBatch").value,
          seed,
        ).duration
    : 22;
}
function renderPortrait(progress) {
  const paper = $("effect").value === "paper";
  const sec = progress * playbackDuration();
  three.begin(paper ? transitionAt(sec).tilt : 0);
  let landed = 0, flying = 0, phase;
  if (paper) {
    if (sec < INTRO_FADE_END) {
      introGlyphs().forEach((p, i) => {
        const fade = glyphFadeAt(sec, i);
        three.glyph(p.glyph, p.x + fade.drift, p.y - fade.lift,
          p.size, 0, fade.alpha, fade.lift * 0.4);
      });
    }
    const state = rainSchedule(Math.max(0, sec - RAIN_START), items.length,
      +$("batch").value, +$("gap").value / 100, +$("accel").value / 100,
      +$("maxBatch").value, seed);
    landed = state.landed;
    flying = state.flying.length;
    for (let i = 0; i < landed; i++) {
      const p = paperOrder[state.arrivalOrder[i].index];
      three.glyph(p.glyph, p.x, p.y, p.size, p.angle, 0.94, 0, true);
    }
    for (const e of state.flying) {
      const p = paperOrder[e.index], t = e.t, h = paperMotion(t).height;
      three.glyph(p.glyph,
        p.x + Math.sin(t * Math.PI) * (p.sway * 0.25 + e.wind * 55),
        p.y - h * 0.55, p.size,
        p.angle + Math.sin(t * Math.PI) * e.spin,
        Math.min(1, t * 9) * 0.96, h * 0.45);
    }
    phase = sec < INTRO_FADE_START ? "文章" : sec < INTRO_FADE_END
      ? "言葉が浮いて消える" : sec < TILT_START ? "余韻"
      : sec < RAIN_START ? "視点の移動" : landed === items.length
      ? "完成" : flying ? "紙面へ降り積もる" : "雨の気配";
  } else {
    phase = storyAt(progress).phase;
    if (sec < 5) {
      for (const p of introGlyphs()) three.glyph(p.glyph, p.x, p.y, p.size);
    } else if (sec < 11) {
      for (const p of introGlyphs().slice(0, 11))
        three.glyph(p.glyph, p.x, p.y, p.size, 0, Math.max(0, 6 - sec));
      items.forEach((p, i) => {
        const q = sourcePosition(i), initial = i < INTRO;
        const delay = initial ? (i % 22) * 0.018 + Math.floor(i / 22) * 0.055
          : 1.2 + p.delay * 2;
        const t = Math.max(0, Math.min(1, (sec - 5 - delay) / 1.5));
        if (!initial && !t) return;
        const startY = initial ? q.y : -60;
        three.glyph(p.glyph, q.x + Math.sin(t * Math.PI) * p.sway * 0.4,
          startY + (H + 140 - startY) * t * t,
          initial ? 23 : p.size, p.angle * t);
      });
    } else if (sec >= 12) {
      for (const p of items) {
        const local = ((sec - 12) / 10 - p.delay * 0.55) / 0.55;
        if (local <= 0) continue;
        const t = Math.min(1, local), ease = t * t * (3 - 2 * t);
        three.glyph(p.glyph, p.x + Math.sin(t * Math.PI) * p.sway * (1 - t),
          H + 100 + (p.y - H - 100) * ease, p.size, p.angle,
          Math.min(1, t * 5) * 0.94, 0, t >= 1);
        if (t >= 1) landed++;
      }
    }
  }
  three.end();
  $("phase").textContent = phase;
  $("progressLabel").textContent = Math.round(progress * 100) + "%";
  $("status").textContent = `${items.length}文字／着地 ${landed}文字／落下中 ${flying}文字／Three.js`;
}
function draw(progress) { renderPortrait(progress); }
let worker = null,
  pendingReject = null,
  buildId = 0;
function loading(message, failed = false) {
  $("loading").hidden = false;
  $("loading-message").textContent = message;
  $("retry").hidden = !failed;
  $("loading").classList.toggle("failed", failed);
  $("art").setAttribute("aria-busy", String(!failed));
}
function setBusy(busy) {
  canvas.setAttribute("aria-disabled", String(busy));
  for (const el of document.querySelectorAll(
    "#panel input,#panel select,#panel button,.stage-tools button:not(#toggle)",
  ))
    el.disabled = busy;
}
function prepareMapping(options) {
  if (worker) worker.terminate();
  if (pendingReject)
    pendingReject(new DOMException("superseded", "AbortError"));
  return new Promise((resolve, reject) => {
    pendingReject = reject;
    const timer = setTimeout(() => {
      if (worker) worker.terminate();
      worker = null;
      pendingReject = null;
      reject(Error("文字配置の準備がタイムアウトしました"));
    }, 30000);
    worker = new Worker(new URL("./mapping-worker.js", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data }) => {
      clearTimeout(timer);
      worker.terminate();
      worker = null;
      pendingReject = null;
      if (data.error) reject(Error(data.error));
      else resolve(data);
    };
    worker.onerror = () => {
      clearTimeout(timer);
      worker.terminate();
      worker = null;
      pendingReject = null;
      reject(Error("文字配置を準備できませんでした"));
    };
    worker.postMessage({
      gray: rawGray,
      w: W,
      h: H,
      threshold: +$("tone").value / 100,
      options,
    });
  });
}
async function rebuild() {
  if (!field || !fontReady) return;
  const generation = ++buildId;
  stop();
  setBusy(true);
  loading("文字を肖像に配置しています…");
  try {
    const mapped = await prepareMapping({
      seed,
      count: +$("count").value,
      scale: +$("scale").value / 100,
      edge: +$("edge").value / 100,
      sizing: $("sizing").value,
      rotation: $("rotation").value,
    });
    if (generation !== buildId) return;
    field = { mask: mapped.mask };
    maskCanvas = document.createElement("canvas");
    maskCanvas.width = W;
    maskCanvas.height = H;
    const mx = maskCanvas.getContext("2d"),
      md = mx.createImageData(W, H);
    for (let i = 0; i < field.mask.length; i++) {
      md.data[i * 4 + 3] = field.mask[i] ? 255 : 0;
    }
    mx.putImageData(md, 0, 0);
    $("toneLabel").textContent = $("tone").value + "%";
    const count = +$("count").value,
      scale = +$("scale").value / 100,
      edge = +$("edge").value / 100;
    $("countLabel").textContent = count + "字";
    $("scaleLabel").textContent = scale.toFixed(2) + "倍";
    $("edgeLabel").textContent = Math.round(edge * 100) + "%";
    items = mapped.letters;
    introFadePlan = null;
    items.forEach((p, i) => {
      p.glyph = chars[i % chars.length];
    });
    paperOrder = items.slice().sort((a, b) => a.delay - b.delay);
    three.prepare(items, introGlyphs(), maskCanvas, drawCharacter, fontName);
    $("accelLabel").textContent = $("accel").value + "%";
    $("maxBatchLabel").textContent = $("maxBatch").value + "字";
    $("batchLabel").textContent = $("batch").value + "字";
    $("gapLabel").textContent = $("gap").value + "%";
    const initial = !initialized;
    initialized = true;
    exactProgress = initial ? 0 : 1;
    $("progress").value = initial ? 0 : 1000;
    draw(initial ? 0 : 1);
    $("loading").hidden = true;
    $("art").setAttribute("aria-busy", "false");
    setBusy(false);
    if (initial && matchMedia("(prefers-reduced-motion: reduce)").matches) {
      exactProgress = 1;
      $("progress").value = 1000;
      draw(1);
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(error);
      loading("文字配置を準備できませんでした。再試行してください。", true);
    }
  }
}
let exactProgress = 0;
function frame(now) {
  const progress = Math.min(
    1,
    playBase + (now - playStarted) / (playbackDuration() * 1000),
  );
  exactProgress = progress;
  $("progress").value = Math.round(progress * 1000);
  draw(progress);
  if (progress < 1) raf = requestAnimationFrame(frame);
  else stop();
}
function fail(e) {
  console.error(e);
  stop();
  setBusy(true);
  loading("素材を読み込めませんでした。再試行してください。", true);
  $("status").textContent = "読み込みに失敗しました";
}
async function loadImage(url) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((ok, no) => {
    const timer = setTimeout(
      () => no(Error("写真の読み込みがタイムアウトしました")),
      25000,
    );
    img.onload = () => {
      clearTimeout(timer);
      ok();
    };
    img.onerror = () => {
      clearTimeout(timer);
      no(Error("肖像画像"));
    };
    img.src = url;
  });
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.fillStyle = "white";
  x.fillRect(0, 0, W, H);
  // Fit the full source photograph without cropping either side.
  const fit = Math.min((W - 70) / img.naturalWidth, (H - 50) / img.naturalHeight);
  const width = img.naturalWidth * fit, height = img.naturalHeight * fit;
  x.drawImage(img, (W - width) / 2, (H - height) / 2, width, height);
  const d = x.getImageData(0, 0, W, H).data,
    g = new Float32Array(W * H);
  for (let i = 0; i < g.length; i++)
    g[i] =
      (d[i * 4] * 0.2126 + d[i * 4 + 1] * 0.7152 + d[i * 4 + 2] * 0.0722) / 255;
  rawGray = g;
  field = {};
}
async function loadFont() {
  const loaded = await Promise.race([
    document.fonts.load(
      '16px "Zen Antique Soft"',
      Array.from(new Set(chars)).join(""),
    ),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(Error("フォントの読み込みがタイムアウトしました")),
        25000,
      ),
    ),
  ]);
  if (!loaded.length) throw Error("Zen Antique Soft");
  fontReady = true;
}
for (const id of [
  "sizing",
  "rotation",
  "count",
  "scale",
  "edge",
  "tone",
  "effect",
  "batch",
  "gap",
  "accel",
  "maxBatch",
  "introMode",
])
  $(id).addEventListener("change", rebuild);
$("reseed").onclick = () => {
  seed++;
  rebuild();
};
$("finish").onclick = () => {
  stop();
  exactProgress = 1;
  $("progress").value = 1000;
  draw(1);
};
$("progress").oninput = () => {
  stop();
  if (field && fontReady) {
    exactProgress = +$("progress").value / 1000;
    draw(exactProgress);
  }
};
$("toggle").onclick = () => {
  const open = $("panel").hidden;
  $("panel").hidden = !open;
  $("toggle").setAttribute("aria-expanded", String(open));
  document.querySelector("main").classList.toggle("panel-open", open);
};
$("reset").onclick = () => {
  for (const [id, value] of Object.entries({
    count: 4800,
    scale: 120,
    tone: 60,
    edge: 60,
    sizing: "adaptive",
    rotation: "random",
    effect: "paper",
    batch: 16,
    gap: 15,
    accel: 135,
    maxBatch: 384,
    introMode: "random",
  }))
    $(id).value = value;
  seed = 1409;
  rebuild();
};
$("restart").onclick = () => {
  stop();
  exactProgress = 0;
  $("progress").value = 0;
  draw(0);
  playBase = 0;
  playStarted = performance.now();
  playing = true;
  $("play").textContent = "一時停止";
  canvas.setAttribute("aria-label", "原稿をクリックして一時停止");
  raf = requestAnimationFrame(frame);
};
$("play").onclick = () => {
  if (playing) {
    stop();
    return;
  }
  playBase = exactProgress;
  if (playBase >= 1) playBase = 0;
  playStarted = performance.now();
  playing = true;
  $("play").textContent = "一時停止";
  canvas.setAttribute("aria-label", "原稿をクリックして一時停止");
  raf = requestAnimationFrame(frame);
};
// Only clicks on the projected paper count; the surrounding table is inactive.
canvas.addEventListener("click", (event) => {
  if ($("play").disabled || !$("loading").hidden) return;
  if (three.hitTest(event.clientX, event.clientY)) $("play").click();
});
canvas.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
    event.preventDefault();
    if (!$("play").disabled && $("loading").hidden) $("play").click();
  }
});
$("close-panel").onclick = () => {
  if (!$("panel").hidden) $("toggle").click();
  $("toggle").focus();
};
$("save").onclick = () => {
  const a = document.createElement("a");
  a.download = "soseki-wagahai-" + seed + ".png";
  a.href = canvas.toDataURL();
  a.click();
};
async function initialize() {
  setBusy(true);
  loading("写真とフォントを読み込んでいます…");
  try {
    if (!three) {
      const { PortraitRenderer } = await import("./lib/three-renderer.js");
      three = new PortraitRenderer(canvas, W, H);
      canvas.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        stop();
        setBusy(true);
        loading("描画が中断されました。再試行してください。", true);
      });
    }
    await Promise.all([
      loadImage("./assets/soseki.jpg"),
      loadFont(),
      loadGaiji(),
    ]);
    await rebuild();
  } catch (error) {
    fail(error);
  }
}
$("retry").onclick = () => {
  if (three?.renderer.getContext().isContextLost()) {
    location.reload();
    return;
  }
  initialized = false;
  initialize();
};
initialize();
document.addEventListener("visibilitychange", () => {
  if (document.hidden && playing) {
    playBase = +$("progress").value / 1000;
    stop();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("panel").hidden) {
    $("toggle").click();
    $("toggle").focus();
  }
});
