import { isOnManuscript } from "./lib/manuscript-hit.js";
import { TEXT } from "./rashomon.js";
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
const canvas = $("art"),
  ctx = canvas.getContext("2d"),
  settled = document.createElement("canvas");
settled.width = W;
settled.height = H;
const settledCtx = settled.getContext("2d");
function stop() {
  cancelAnimationFrame(raf);
  playing = false;
  $("play").textContent = "再生";
  canvas.setAttribute("aria-label", "原稿をクリックして再生");
}
const gaiji = new Map();
function drawCharacter(context, glyph, x, y, size) {
  if (glyph === "―") {
    context.fillRect(
      x - size * 0.48,
      y - size * 0.04,
      size * 0.96,
      size * 0.06,
    );
  } else if (gaiji.has(glyph)) {
    context.drawImage(gaiji.get(glyph), x - size / 2, y - size / 2, size, size);
  } else context.fillText(glyph, x, y);
}
async function loadGaiji() {
  for (const [glyph, file] of [
    ["扭", "gaiji-nejiru.png"],
    ["眶", "gaiji-mabuta.png"],
  ]) {
    const image = new Image();
    image.src = "./assets/" + file;
    await image.decode();
    const c = document.createElement("canvas");
    c.width = image.naturalWidth;
    c.height = image.naturalHeight;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(image, 0, 0);
    const pixels = x.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const alpha = 255 - pixels.data[i];
      pixels.data[i] = 41;
      pixels.data[i + 1] = 37;
      pixels.data[i + 2] = 31;
      pixels.data[i + 3] = alpha;
    }
    x.putImageData(pixels, 0, 0);
    gaiji.set(glyph, c);
  }
}
function makeSprite(item, glyph) {
  const c = document.createElement("canvas"),
    padding = Math.ceil(item.size * 0.95);
  c.width = c.height = padding * 2;
  const x = c.getContext("2d");
  x.translate(padding, padding);
  x.rotate(item.angle);
  x.font = item.size + 'px "' + fontName + '"';
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillStyle = "#29251f";
  drawCharacter(x, glyph, 0, 0, item.size);
  return c;
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
function paintGlyph(glyph, x, y, size, angle, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.font = size + 'px "' + fontName + '"';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#29251f";
  drawCharacter(ctx, glyph, 0, 0, size);
  ctx.restore();
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
let cachedLanded = 0,
  paperOrder = [],
  lastPaperTime = -1;
const spriteCache = new Map();
function spriteFor(p) {
  if (spriteCache.has(p)) {
    const sprite = spriteCache.get(p);
    spriteCache.delete(p);
    spriteCache.set(p, sprite);
    return sprite;
  }
  const sprite = makeSprite(p, p.glyph);
  spriteCache.set(p, sprite);
  if (spriteCache.size > 1024)
    spriteCache.delete(spriteCache.keys().next().value);
  return sprite;
}
const INTRO_FADE_START = 4,
  GLYPH_STAGGER = 0.015,
  GLYPH_FADE_DURATION = 1.25;
const INTRO_GLYPH_COUNT = Array.from("羅生門芥川龍之介").length + INTRO;
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
  for (let i = 0; i < 3; i++)
    result.push({
      start: 4 + i * 0.16,
      lift: 26,
      drift: 0,
      group: "title-" + i,
    });
  for (let i = 0; i < Array.from("芥川龍之介").length; i++)
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
      result[8 + index] = { start, lift, drift, group: groupIndex };
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
    ["羅生門", 90, 38],
    ["芥川龍之介", 140, 18],
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
function drawSequentialIntro(seconds) {
  if (seconds >= INTRO_FADE_END) return;
  if (seconds <= INTRO_FADE_START) {
    if (!introLayer) introLayer = makeIntroLayer();
    ctx.drawImage(introLayer, 0, 0);
    return;
  }
  const glyphs = introGlyphs();
  for (let i = 0; i < glyphs.length; i++) {
    const p = glyphs[i],
      fade = glyphFadeAt(seconds, i);
    if (fade.alpha <= 0) continue;
    ctx.save();
    if (fade.blur > 0.02) ctx.filter = "blur(" + fade.blur + "px)";
    paintGlyph(
      p.glyph,
      p.x + fade.drift,
      p.y - fade.lift,
      p.size,
      0,
      fade.alpha,
    );
    ctx.restore();
  }
}
let introLayer = null;
function makeIntroLayer() {
  const layer = document.createElement("canvas");
  layer.width = W;
  layer.height = H;
  const x = layer.getContext("2d");
  x.fillStyle = "#29251f";
  x.textAlign = "center";
  x.textBaseline = "middle";
  for (const p of introGlyphs()) {
    x.font = p.size + 'px "' + fontName + '"';
    drawCharacter(x, p.glyph, p.x, p.y, p.size);
  }
  return layer;
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
function resetPaper() {
  cachedLanded = 0;
  lastPaperTime = -1;
  settledCtx.clearRect(0, 0, W, H);
}
function drawPaper(progress, sec) {
  const transition = transitionAt(sec),
    tilt = transition.tilt;
  ctx.globalAlpha = 1;
  ctx.fillStyle =
    "rgb(" +
    Math.round(245 - 23 * tilt) +
    "," +
    Math.round(240 - 25 * tilt) +
    "," +
    Math.round(229 - 27 * tilt) +
    ")";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.transform(...transition.matrix);
  ctx.shadowColor = "rgba(51,39,25," + 0.21 * tilt + ")";
  ctx.shadowBlur = 24 * tilt;
  ctx.shadowOffsetY = 16 * tilt;
  ctx.fillStyle = "#f5f0e5";
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.save();
  ctx.transform(...transition.matrix);
  ctx.fillStyle = "rgba(111,98,69," + 0.03 * tilt + ")";
  for (let y = 12; y < H; y += 17) ctx.fillRect(8, y, W - 16, 0.5);
  const time = Math.max(0, sec - RAIN_START),
    state = rainSchedule(
      time,
      items.length,
      +$("batch").value,
      +$("gap").value / 100,
      +$("accel").value / 100,
      +$("maxBatch").value,
      seed,
    );
  if (time < lastPaperTime || cachedLanded > state.landed) resetPaper();
  lastPaperTime = time;
  // Add only newly landed letters. Already settled text is a single cached bitmap.
  if (cachedLanded < state.landed) {
    for (let i = cachedLanded; i < state.landed; i++) {
      const p = paperOrder[state.arrivalOrder[i].index],
        sprite = spriteFor(p);
      settledCtx.globalAlpha = 0.94;
      settledCtx.drawImage(
        sprite,
        p.x - sprite.width / 2,
        p.y - sprite.height / 2,
      );
    }
    cachedLanded = state.landed;
    settledCtx.globalAlpha = 1;
    settledCtx.globalCompositeOperation = "destination-in";
    settledCtx.drawImage(maskCanvas, 0, 0);
    settledCtx.globalCompositeOperation = "source-over";
  }
  ctx.drawImage(settled, 0, 0);
  drawSequentialIntro(sec);
  const flying = state.flying.map((entry) => ({
    p: paperOrder[entry.index],
    m: { ...paperMotion(entry.t), wind: entry.wind, spin: entry.spin },
  }));
  for (const { p, m } of flying) {
    const h = m.height;
    ctx.save();
    ctx.fillStyle = "rgba(42,35,23," + (0.04 + 0.15 * (1 - h / 680)) + ")";
    if (flying.length < 96) ctx.filter = "blur(" + (1 + h / 60) + "px)";
    ctx.beginPath();
    ctx.ellipse(
      p.x + h * 0.09,
      p.y + h * 0.055,
      Math.max(3, p.size * 0.4 + h * 0.016),
      Math.max(2, p.size * 0.15 + h * 0.006),
      p.angle,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  }
  flying.sort((a, b) => a.m.height - b.m.height);
  for (const { p, m } of flying) {
    const h = m.height,
      t = m.t,
      scale = 1 + h / 2100,
      sprite = spriteFor(p);
    ctx.save();
    ctx.globalAlpha = Math.min(1, t * 9) * 0.96;
    ctx.translate(
      p.x + Math.sin(t * Math.PI) * (p.sway * 0.25 + m.wind * 55),
      p.y - h,
    );
    ctx.rotate(Math.sin(t * Math.PI) * (0.45 * (p.sway / 50) + m.spin));
    ctx.scale(scale, scale);
    ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
    ctx.restore();
  }
  ctx.restore();
  $("phase").textContent =
    sec < INTRO_FADE_START
      ? "文章"
      : sec < INTRO_FADE_END
        ? "言葉が浮いて消える"
        : sec < TILT_START
          ? "余韻"
          : sec < RAIN_START
            ? "視点の移動"
            : state.landed === items.length
              ? "完成"
              : flying.length
                ? "紙面へ降り積もる"
                : "雨の気配";
  $("progressLabel").textContent = Math.round(progress * 100) + "%";
  $("status").textContent =
    items.length +
    "文字／着地 " +
    state.landed +
    "文字／落下中 " +
    flying.length +
    "文字／全体 約" +
    Math.ceil(playbackDuration()) +
    "秒";
}
function draw(progress) {
  if ($("effect").value === "paper") {
    drawPaper(progress, progress * playbackDuration());
    return;
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#f5f0e5";
  ctx.fillRect(0, 0, W, H);
  let landed = 0;
  settledCtx.clearRect(0, 0, W, H);
  const state = storyAt(progress),
    sec = state.seconds;
  if (sec < 11) {
    const titleAlpha = sec < 5 ? 1 : Math.max(0, 1 - (sec - 5));
    paintGlyph("羅生門", W / 2, 90, 38, 0, titleAlpha);
    paintGlyph("芥川龍之介", W / 2, 140, 18, 0, titleAlpha);
  }
  if (sec < 5) {
    for (let i = 0; i < INTRO; i++) {
      const q = sourcePosition(i);
      paintGlyph(chars[i], q.x, q.y, 23, 0, 1);
    }
  } else if (sec < 11) {
    for (let i = 0; i < items.length; i++) {
      const p = items[i],
        q = sourcePosition(i),
        initial = i < INTRO;
      const delay = initial
        ? (i % 22) * 0.018 + Math.floor(i / 22) * 0.055
        : 1.2 + p.delay * 2.0;
      const t = Math.max(0, Math.min(1, (sec - 5 - delay) / 1.5));
      if (!initial && t <= 0) continue;
      const startY = initial ? q.y : -60;
      const y = startY + (H + 140 - startY) * t * t;
      const x = q.x + Math.sin(t * Math.PI) * p.sway * 0.4;
      paintGlyph(
        chars[i % chars.length],
        x,
        y,
        initial ? 23 : p.size,
        p.angle * t,
        1,
      );
    }
  } else if (sec >= 12) {
    const gather = (sec - 12) / 10;
    for (const p of items) {
      const local = (gather - p.delay * 0.55) / 0.55;
      if (local <= 0) continue;
      const t = Math.min(1, local),
        ease = t * t * (3 - 2 * t);
      const y = H + 100 + (p.y - H - 100) * ease,
        x = p.x + Math.sin(t * Math.PI) * p.sway * (1 - t);
      const target = t >= 1 ? settledCtx : ctx;
      target.globalAlpha = Math.min(1, t * 5) * 0.94;
      target.drawImage(
        p.sprite,
        x - p.sprite.width / 2,
        y - p.sprite.height / 2,
      );
      if (t >= 1) landed++;
    }
    settledCtx.globalAlpha = 1;
    settledCtx.globalCompositeOperation = "destination-in";
    if (maskCanvas) settledCtx.drawImage(maskCanvas, 0, 0);
    settledCtx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(settled, 0, 0);
  }
  $("phase").textContent = state.phase;
  $("progressLabel").textContent = Math.round(progress * 100) + "%";
  $("status").textContent =
    items.length +
    "文字（上限 " +
    $("count").value +
    "）／着地 " +
    landed +
    "文字／本文 " +
    (items.length / chars.length).toFixed(2) +
    "周分／乱数 " +
    seed;
}
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
    introLayer = null;
    introFadePlan = null;
    spriteCache.clear();
    items.forEach((p, i) => {
      p.glyph = chars[i % chars.length];
      Object.defineProperty(p, "sprite", {
        get() {
          return spriteFor(p);
        },
      });
    });
    paperOrder = items.slice().sort((a, b) => a.delay - b.delay);
    resetPaper();
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
  x.drawImage(
    img,
    img.naturalWidth * 0.06,
    img.naturalHeight * 0.015,
    img.naturalWidth * 0.88,
    img.naturalHeight * 0.88,
    35,
    25,
    W - 70,
    H - 50,
  );
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
  const matrix =
    $("effect").value === "paper"
      ? transitionAt(exactProgress * playbackDuration()).matrix
      : [1, 0, 0, 1, 0, 0];
  if (
    isOnManuscript(
      event.clientX,
      event.clientY,
      canvas.getBoundingClientRect(),
      W,
      H,
      matrix,
    )
  )
    $("play").click();
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
  a.download = "akutagawa-outline-" + seed + ".png";
  a.href = canvas.toDataURL();
  a.click();
};
async function initialize() {
  setBusy(true);
  loading("写真とフォントを読み込んでいます…");
  try {
    await Promise.all([
      loadImage("./assets/akutagawa.jpg"),
      loadFont(),
      loadGaiji(),
    ]);
    await rebuild();
  } catch (error) {
    fail(error);
  }
}
$("retry").onclick = () => {
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
