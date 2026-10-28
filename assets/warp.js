/* Warp Animation, adapted from php-hacker: https://codepen.io/php-hacker/pen/dyVdgRX
 * MIT license and modification notes: ../third_party/warp/NOTICE.md
 */
(() => {
  "use strict";
  const canvas = document.querySelector("#warp");
  const button = document.querySelector("#motion-toggle");
  const label = button.querySelector(".motion-label");
  const icon = button.querySelector(".motion-icon");
  const status = document.querySelector("#motion-status");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let gl;
  let program;
  let buffer;
  let timeUniform;
  let widthUniform;
  let heightUniform;
  let frame = 0;
  let last = null;
  let time = 13;
  let paused = motion.matches;
  let lost = false;
  let failed = false;

  const vertex = `attribute vec2 position;
  void main() { gl_Position = vec4(position, 0.0, 1.0); }`;
  // The original Pen's six-step coordinate warp and nine-sample color average.
  const fragment = `precision mediump float;
  uniform float width;
  uniform float height;
  uniform float time;
  void main() {
    vec2 resolution = vec2(width, height);
    float strength = 0.4;
    float t = time / 6.0;
    vec3 col = vec3(0.0);
    for (int i = -1; i <= 1; i++) {
      for (int j = -1; j <= 1; j++) {
        vec2 fC = gl_FragCoord.xy + vec2(float(i), float(j)) / 3.0;
        vec2 pos = fC / resolution;
        pos.y /= resolution.x / resolution.y;
        pos = 4.0 * (vec2(0.5) - pos);
        for (int k = 1; k < 7; k++) {
          pos.x += strength * sin(2.0*t + float(k)*1.5*pos.y) + t*0.5;
          pos.y += strength * cos(2.0*t + float(k)*1.5*pos.x);
        }
        col += 0.5 + 0.5*cos(time + pos.xyx + vec3(0.0, 2.0, 4.0));
      }
    }
    col /= 9.0;
    col = pow(col, vec3(0.4545));
    gl_FragColor = vec4(col, 1.0);
  }`;

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = null;
  }
  function fallback() {
    stop();
    failed = true;
    canvas.hidden = true;
    button.hidden = true;
    status.textContent = "静止背景を表示中";
  }
  function compile(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      throw new Error("Warp shader compilation failed");
    }
    return shader;
  }
  function render() {
    if (failed || lost) return;
    gl.uniform1f(timeUniform, time);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function resize() {
    if (failed || lost) return;
    // Keep GPU work bounded on phones and high-DPI displays.
    const w = innerWidth;
    const h = innerHeight;
    const scale = Math.min(devicePixelRatio || 1, 1.25, Math.sqrt(1200000 / (w * h)));
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(widthUniform, canvas.width);
    gl.uniform1f(heightUniform, canvas.height);
    render();
  }
  function tick(now) {
    frame = 0;
    if (paused || document.hidden || lost || failed) { last = null; return; }
    if (last === null || now - last >= 1000 / 30) {
      if (last !== null) time += Math.min(now - last, 100) / 770;
      last = now;
      render();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    stop();
    button.setAttribute("aria-pressed", String(paused));
    label.textContent = paused ? "背景を再生" : "背景を一時停止";
    icon.textContent = paused ? "▷" : "Ⅱ";
    if (!paused && !document.hidden && !failed && !lost) frame = requestAnimationFrame(tick);
  }
  function init() {
    try {
      gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, powerPreference: "low-power" });
      if (!gl) { fallback(); return; }
      const vs = compile(vertex, gl.VERTEX_SHADER);
      const fs = compile(fragment, gl.FRAGMENT_SHADER);
      program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Warp program link failed");
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      timeUniform = gl.getUniformLocation(program, "time");
      widthUniform = gl.getUniformLocation(program, "width");
      heightUniform = gl.getUniformLocation(program, "height");
      failed = false;
      lost = false;
      canvas.hidden = false;
      button.hidden = false;
      status.textContent = "";
      resize();
      sync();
    } catch (error) {
      console.warn("Warp background unavailable:", error);
      if (gl && buffer) gl.deleteBuffer(buffer);
      if (gl && program) gl.deleteProgram(program);
      fallback();
    }
  }
  button.addEventListener("click", () => { paused = !paused; sync(); });
  motion.addEventListener("change", () => { paused = motion.matches; sync(); });
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("resize", resize);
  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    lost = true;
    stop();
    canvas.hidden = true;
    button.hidden = true;
    status.textContent = "静止背景を表示中";
  });
  canvas.addEventListener("webglcontextrestored", init);
  init();
})();
