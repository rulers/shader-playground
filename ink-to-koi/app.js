const canvas = document.getElementById('view');
const pause = document.getElementById('pause');
const status = document.getElementById('status');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let paused = motion.matches;
let elapsed = paused ? 12 : 0;
let last = null, frame = 0, gl, program, uniforms, failed = false;
function stop() { cancelAnimationFrame(frame); frame = 0; last = null; }
function sync() {
    stop();
    pause.textContent = paused ? '再生' : '一時停止';
    pause.setAttribute('aria-pressed', String(paused));
    if (!failed && program && !gl.isContextLost()) frame = requestAnimationFrame(render);
}
function render(now) {
    frame = 0;
    if (failed || !program || gl.isContextLost() || document.hidden) return;
    if (!paused && last !== null) elapsed += Math.min((now - last) / 1000, .1);
    last = now;
    const scale = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(1400000 / (innerWidth * innerHeight)));
    const w = Math.max(1, Math.round(innerWidth * scale));
    const h = Math.max(1, Math.round(innerHeight * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.useProgram(program);
    gl.uniform2f(uniforms.resolution, w, h);
    gl.uniform1f(uniforms.time, elapsed % 24);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!paused) frame = requestAnimationFrame(render);
}
function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw Error(message);
    }
    return shader;
}
async function init() {
    try {
        gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false });
        if (!gl) throw Error('WebGL 2 unavailable');
        const response = await fetch('ink.frag');
        if (!response.ok) throw Error('Shader download failed');
        const source = await response.text();
        const vs = compile(gl.VERTEX_SHADER, '#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}');
        const fs = compile(gl.FRAGMENT_SHADER, source);
        program = gl.createProgram();
        gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
        gl.deleteShader(vs); gl.deleteShader(fs);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
        uniforms = Object.fromEntries(['resolution', 'time'].map(key => [key, gl.getUniformLocation(program, key)]));
        failed = false; pause.disabled = false;
        status.textContent = '墨から鯉へ、鯉から墨へ';
        sync();
    } catch (error) {
        failed = true; stop(); pause.disabled = true;
        status.textContent = '描画できませんでした。WebGL 2対応のブラウザーで再読み込みしてください。';
        console.error(error);
    }
}
pause.addEventListener('click', () => { paused = !paused; sync(); });
motion.addEventListener('change', () => { paused = motion.matches; sync(); });
addEventListener('resize', sync);
document.addEventListener('visibilitychange', sync);
canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); stop(); pause.disabled = true;
    status.textContent = '描画の復帰を待っています…';
});
canvas.addEventListener('webglcontextrestored', () => { program = null; init(); });
init();
