const $ = id => document.getElementById(id);
const canvas = $('view');
const controls = $('controls');
function openPanel(open) {
    controls.hidden = !open;
    $('toggle').textContent = open ? '−' : '＋';
    $('toggle').setAttribute('aria-expanded', String(open));
    $('toggle').setAttribute('aria-label', open ? '調整UIを閉じる' : '調整UIを開く');
}
$('toggle').onclick = () => openPanel(controls.hidden);
$('close').onclick = () => { openPanel(false); $('toggle').focus(); };
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !controls.hidden) { openPanel(false); $('toggle').focus(); }
});
let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
let elapsed = 8, last = 0, request = 0, gl, program, uniforms;
function pauseLabel() {
    $('pause').textContent = paused ? '再生' : '一時停止';
    $('pause').setAttribute('aria-pressed', String(paused));
}
pauseLabel();
function render(now) {
    if (!gl || gl.isContextLost()) return;
    const delta = last ? Math.min((now - last) / 1000, .1) : 0;
    last = now;
    if (!paused && !document.hidden) elapsed += delta * Number($('speed').value);
    // A bounded internal resolution keeps volume rendering usable on phones.
    const scale = Math.min(1, 760 / innerWidth, 540 / innerHeight);
    const w = Math.max(1, Math.round(innerWidth * scale));
    const h = Math.max(1, Math.round(innerHeight * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.useProgram(program);
    gl.uniform2f(uniforms.resolution, w, h);
    gl.uniform1f(uniforms.time, elapsed);
    for (const id of ['density', 'detail']) gl.uniform1f(uniforms[id], Number($(id).value));
    gl.uniform1f(uniforms.whiteInk, Number($('white').value));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!paused && !document.hidden) request = requestAnimationFrame(render);
}
function redraw() { cancelAnimationFrame(request); last = 0; request = requestAnimationFrame(render); }
for (const id of ['speed', 'density', 'detail', 'white']) {
    $(id).oninput = () => { $(id + '-value').value = Number($(id).value).toFixed(2); redraw(); };
}
$('pause').onclick = () => { paused = !paused; pauseLabel(); redraw(); };
$('reset').onclick = () => { elapsed = 0; redraw(); };
addEventListener('resize', redraw);
document.addEventListener('visibilitychange', redraw);
function fail(error) {
    cancelAnimationFrame(request);
    $('status').textContent = '描画できませんでした。WebGL 2対応のブラウザーで再読み込みしてください。';
    console.error(error);
}
function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
    return shader;
}
async function init() {
    try {
        gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false });
        if (!gl) throw Error('WebGL 2 unavailable');
        const response = await fetch('volume.frag');
        if (!response.ok) throw Error('Shader download failed');
        const source = await response.text();
        const vs = compile(gl.VERTEX_SHADER, '#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}');
        const frag = compile(gl.FRAGMENT_SHADER, source);
        program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, frag); gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
        gl.deleteShader(vs); gl.deleteShader(frag);
        uniforms = Object.fromEntries(['resolution','time','density','detail','whiteInk'].map(k => [k, gl.getUniformLocation(program,k)]));
        $('status').textContent = '立体ノイズによるリアルタイム描画';
        redraw();
    } catch (error) { fail(error); }
}
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); cancelAnimationFrame(request); $('status').textContent = '描画の復帰を待っています…'; });
canvas.addEventListener('webglcontextrestored', init);
init();
