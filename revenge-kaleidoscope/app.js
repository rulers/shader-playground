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
let angle = 0, flowTime = 0, last = 0, request = 0, gl, program, uniforms;
function pauseLabel() {
    $('pause').textContent = paused ? '再生' : '一時停止';
    $('pause').setAttribute('aria-pressed', String(paused));
}
pauseLabel();
function render(now) {
    if (!gl || !program || !uniforms || gl.isContextLost()) return;
    const delta = last ? Math.min((now - last) / 1000, .1) : 0;
    last = now;
    if (!paused && !document.hidden) {
        angle += delta * Number($('rotation').value) * .065;
        flowTime += delta * Number($('flow').value);
    }
    // A bounded internal resolution keeps shader rendering usable on phones.
    const scale = Math.min(1, 1000 / innerWidth, 750 / innerHeight);
    const w = Math.max(1, Math.round(innerWidth * scale));
    const h = Math.max(1, Math.round(innerHeight * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.useProgram(program);
    gl.uniform2f(uniforms.resolution, w, h);
    gl.uniform1f(uniforms.rotationAngle, angle);
    $('angle-value').textContent = Math.round(angle * 180 / Math.PI) + '°';
    gl.uniform1f(uniforms.flowTime, flowTime);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!paused && !document.hidden) request = requestAnimationFrame(render);
}
function redraw() { cancelAnimationFrame(request); last = 0; request = requestAnimationFrame(render); }
for (const id of ['rotation', 'flow']) {
    $(id).oninput = () => { $(id + '-value').value = Number($(id).value).toFixed(2); redraw(); };
}
$('pause').onclick = () => { paused = !paused; pauseLabel(); redraw(); };
function advance(degrees) { angle += degrees * Math.PI / 180; redraw(); }
$('step').onclick = () => advance(30);
$('step-half').onclick = () => advance(15);
// The layout overlays the canvas; accept background clicks but leave UI alone.
document.addEventListener('click', e => {
    if (!e.target.closest('header, footer, .dock')) advance(15);
});
$('reset').onclick = () => { angle = 0; flowTime = 0; redraw(); };
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
        const response = await fetch('neon.frag?v=turn-2');
        if (!response.ok) throw Error('Shader download failed');
        const source = await response.text();
        function link(source) {
            const vs = compile(gl.VERTEX_SHADER, '#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}');
            const frag = compile(gl.FRAGMENT_SHADER, source);
            const result = gl.createProgram(); gl.attachShader(result, vs); gl.attachShader(result, frag); gl.linkProgram(result);
            if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(result));
            gl.deleteShader(vs); gl.deleteShader(frag); return result;
        }
        program = link(source);
        uniforms = Object.fromEntries(['resolution','rotationAngle','flowTime'].map(k => [k, gl.getUniformLocation(program,k)]));
        $('status').textContent = '光の鏡面パターンを描画中';
        redraw();
    } catch (error) { fail(error); }
}
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); cancelAnimationFrame(request); $('status').textContent = '描画の復帰を待っています…'; });
canvas.addEventListener('webglcontextrestored', () => { program = null; uniforms = null; init(); });
init();
