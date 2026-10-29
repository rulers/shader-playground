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
let post, postUniforms, targets = [], targetWidth = 0, targetHeight = 0;
function pauseLabel() {
    $('pause').textContent = paused ? '再生' : '一時停止';
    $('pause').setAttribute('aria-pressed', String(paused));
}
pauseLabel();
function render(now) {
    if (!gl || !program || !post || !uniforms || gl.isContextLost()) return;
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
    resizeTargets(w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, targets[0].fb);
    gl.viewport(0, 0, w, h);
    gl.useProgram(program);
    gl.uniform2f(uniforms.resolution, w, h);
    gl.uniform1f(uniforms.rotationAngle, angle);
    gl.uniform1f(uniforms.flowTime, flowTime);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    postprocess(w, h);
    if (!paused && !document.hidden) request = requestAnimationFrame(render);
}
function resizeTargets(w, h) {
    if (targetWidth === w && targetHeight === h) return;
    for (const target of targets) { gl.deleteTexture(target.texture); gl.deleteFramebuffer(target.fb); }
    targets = []; targetWidth = w; targetHeight = h;
    for (let i = 0; i < 3; i++) {
        const width = i === 0 ? w : Math.max(1, Math.floor(w / 2));
        const height = i === 0 ? h : Math.max(1, Math.floor(h / 2));
        const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw Error('Framebuffer unavailable');
        targets.push({ texture, fb, width, height });
    }
}
function bindTexture(texture, unit) {
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, texture);
}
function postprocess(w, h) {
    gl.useProgram(post);
    gl.uniform1i(postUniforms.scene, 0); gl.uniform1i(postUniforms.bloom, 1);
    for (let mode = 0; mode < 3; mode++) {
        const output = mode < 2 ? targets[mode + 1] : null;
        const width = output ? output.width : w, height = output ? output.height : h;
        gl.bindFramebuffer(gl.FRAMEBUFFER, output ? output.fb : null);
        gl.viewport(0, 0, width, height);
        gl.uniform2f(postUniforms.texel, 1 / width, 1 / height);
        gl.uniform1i(postUniforms.mode, mode);
        bindTexture(targets[mode === 1 ? 1 : 0].texture, 0);
        bindTexture(targets[mode === 2 ? 2 : 0].texture, 1);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
}
function redraw() { cancelAnimationFrame(request); last = 0; request = requestAnimationFrame(render); }
for (const id of ['rotation', 'flow']) {
    $(id).oninput = () => { $(id + '-value').value = Number($(id).value).toFixed(2); redraw(); };
}
$('pause').onclick = () => { paused = !paused; pauseLabel(); redraw(); };
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
        const sources = await Promise.all(['film.frag', 'post.frag'].map(async path => {
            const response = await fetch(path + '?v=neon-4');
            if (!response.ok) throw Error('Shader download failed');
            return response.text();
        }));
        function link(source) {
            const vs = compile(gl.VERTEX_SHADER, '#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}');
            const frag = compile(gl.FRAGMENT_SHADER, source);
            const result = gl.createProgram(); gl.attachShader(result, vs); gl.attachShader(result, frag); gl.linkProgram(result);
            if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(result));
            gl.deleteShader(vs); gl.deleteShader(frag); return result;
        }
        program = link(sources[0]); post = link(sources[1]);
        uniforms = Object.fromEntries(['resolution','rotationAngle','flowTime'].map(k => [k, gl.getUniformLocation(program,k)]));
        postUniforms = Object.fromEntries(['scene','bloom','texel','mode'].map(k => [k, gl.getUniformLocation(post,k)]));
        targets = []; targetWidth = 0; targetHeight = 0;
        $('status').textContent = '虹色の薄膜をシェーダーで描画中';
        redraw();
    } catch (error) { fail(error); }
}
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); cancelAnimationFrame(request); $('status').textContent = '描画の復帰を待っています…'; });
canvas.addEventListener('webglcontextrestored', () => { program = null; post = null; uniforms = null; init(); });
init();
