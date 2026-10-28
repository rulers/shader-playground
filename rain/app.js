/* Heartfelt by Martijn Steinrucken / BigWIngs (2017).
 * Browser adaptation: CC BY-NC-SA 3.0. See ../third_party/heartfelt/NOTICE.md.
 * Reuses the preserved KodeLife shader; no external image or audio is loaded.
 */
(() => {
  "use strict";
  const canvas = document.querySelector("#rain");
  const amount = document.querySelector("#amount");
  const output = document.querySelector("#amount-value");
  const pause = document.querySelector("#pause");
  const reset = document.querySelector("#reset");
  const status = document.querySelector("#status");
  const controls = document.querySelector("#controls");
  const controlsToggle = document.querySelector("#controls-toggle");
  const controlsClose = document.querySelector("#controls-close");
  const controlsNotice = document.querySelector("#controls-notice");
  function setControlsOpen(open) {
    controls.hidden = !open;
    controlsToggle.setAttribute("aria-expanded", String(open));
    controlsToggle.setAttribute("aria-label", open ? "調整UIを閉じる" : "調整UIを開く");
    controlsToggle.querySelector("span").textContent = open ? "−" : "＋";
    controlsToggle.closest(".control-dock").classList.toggle("is-open", open);
  }
  controlsToggle.addEventListener("click", () => setControlsOpen(controls.hidden));
  controlsClose.addEventListener("click", () => {
    setControlsOpen(false);
    controlsToggle.focus();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !controls.hidden) {
      setControlsOpen(false);
      controlsToggle.focus();
    }
  });
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const gl = canvas.getContext("webgl2", {alpha:false, antialias:false, depth:false, powerPreference:"low-power"});
  let shaderSource = "";
  let program, buffer, uniforms;
  let raf = 0, last = null, time = 40;
  let paused = reduced.matches, ready = false, lost = false;

  function stop() { cancelAnimationFrame(raf); raf = 0; last = null; }
  function fallback(message) {
    stop(); ready = false; canvas.classList.remove("ready");
    amount.disabled = pause.disabled = reset.disabled = true;
    status.textContent = message;
    controlsNotice.textContent = message;
    controlsNotice.hidden = false;
  }
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader); gl.deleteShader(shader);
      throw new Error(error);
    }
    return shader;
  }
  function draw() {
    if (!ready || lost) return;
    gl.uniform1f(uniforms.time, time);
    gl.uniform1f(uniforms.amount, Number(amount.value));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function resize() {
    if (!ready || lost) return;
    const scale = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(1000000 / (innerWidth * innerHeight)));
    canvas.width = Math.max(1, Math.round(innerWidth * scale));
    canvas.height = Math.max(1, Math.round(innerHeight * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    draw();
  }
  function tick(now) {
    raf = 0;
    if (!ready || paused || document.hidden || lost) { last = null; return; }
    if (last === null || now - last >= 1000 / 30) {
      if (last !== null) time += Math.min(now - last, 100) / 1000;
      last = now; draw();
    }
    raf = requestAnimationFrame(tick);
  }
  function sync() {
    stop();
    pause.textContent = paused ? "再生" : "一時停止";
    pause.setAttribute("aria-pressed", String(paused));
    if (!ready) return;
    status.textContent = paused ? "一時停止中 · 雨の強さは調整できます" : "雨の景色を再生中 · 音はありません";
    if (!paused && !document.hidden && !lost) raf = requestAnimationFrame(tick);
  }
  function init() {
    if (!gl || !shaderSource || lost) return;
    try {
      const vs = compile(gl.VERTEX_SHADER, "#version 300 es\nin vec2 position; void main(){gl_Position=vec4(position,0.,1.);}");
      // Keep a single source of truth for the rain algorithm. Adapt only the interface.
      const source = shaderSource.replace(/^#version 150/, "#version 300 es\nprecision highp float;")
        .replace("const float RAIN_AMOUNT = -1.0;", "uniform float RAIN_AMOUNT;")
        .replace("col *= 1.+lightning*fade*mix(1., .1, story*story);", "// Lightning flashes disabled in the browser adaptation.");
      const fs = compile(gl.FRAGMENT_SHADER, source);
      program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs);
      gl.linkProgram(program); gl.deleteShader(vs); gl.deleteShader(fs);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,-1,-1,1,1,1,-1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      uniforms = {time:gl.getUniformLocation(program,"time"),resolution:gl.getUniformLocation(program,"resolution"),amount:gl.getUniformLocation(program,"RAIN_AMOUNT")};
      ready = true; controlsNotice.hidden = true;
      amount.disabled = pause.disabled = reset.disabled = false;
      resize(); canvas.classList.add("ready"); sync();
    } catch (error) {
      console.warn("Rain renderer unavailable:", error);
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      fallback("この環境では描画できないため、静止画を表示しています。");
    }
  }
  amount.addEventListener("input", () => { output.value = Math.round(Number(amount.value)*100)+"%"; draw(); });
  pause.addEventListener("click", () => { paused = !paused; sync(); });
  reset.addEventListener("click", () => { time = 40; last = null; draw(); });
  reduced.addEventListener("change", () => { paused = reduced.matches; sync(); });
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("resize", resize);
  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault(); lost = true;
    fallback("描画が中断されたため、静止画を表示しています。");
  });
  canvas.addEventListener("webglcontextrestored", () => { lost = false; init(); });
  if (!gl) { fallback("WebGL 2に対応していないため、静止画を表示しています。"); return; }
  fetch("../third_party/heartfelt/heartfelt_kodelife.frag")
    .then(response => { if (!response.ok) throw new Error("Shader HTTP "+response.status); return response.text(); })
    .then(source => { shaderSource = source; init(); })
    .catch(error => { console.warn(error); fallback("作品を読み込めませんでした。静止画を表示しています。再読み込みをお試しください。"); });
})();
