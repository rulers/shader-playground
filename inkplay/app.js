'use strict';
(() => {
    const $ = id => document.getElementById(id);
    const canvas = $('view');
    const swatches = [...document.querySelectorAll('.swatch')];
    let colorIndex = 0;
    let paused = false;
    let failed = false;
    let gl;
    let fb;
    let w = 768;
    let h = 480;
    let simTime = 0;
    let last = 0;
    let acc = 0;
    let down = false;
    let pointerId = null;
    let position = null;
    let lastDraw = null;
    let lastMove = 0;
    let pending = [];
    let dots = 0;
    let velocity;
    let pigment;
    let pressure;
    let divergence;
    let programs = {};
    const dt = 1 / 60;
    const iterations = 24;
    const uniforms = [
        'resolution',
        'velocityTex',
        'pigmentTex',
        'pressureTex',
        'divergenceTex',
        'dt',
        'time',
        'wetness',
        'injecting',
        'radius',
        'amount',
        'point',
        'previous',
        'impulse',
        'inkColor',
    ];
    function fail(e) {
        failed = true;
        $('error').textContent = '描画できませんでした。' + (e.message || e);
        $('status').textContent = '停止中';
        for (const id of ['example', 'pause', 'save']) {
            $(id).disabled = true;
        }
        console.error(e);
    }

    function compile(type, source) {
        const s = gl.createShader(type);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            throw Error(gl.getShaderInfoLog(s));
        }
        return s;
    }

    function program(source) {
        const p = gl.createProgram();
        const vs = compile(
            gl.VERTEX_SHADER,
            '#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}'
        );
        const fs = compile(
            gl.FRAGMENT_SHADER,
            source.replace(
                '#version 150',
                '#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;'
            )
        );
        gl.attachShader(p, vs);
        gl.attachShader(p, fs);
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            throw Error(gl.getProgramInfoLog(p));
        }
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        return {
            p,
            u: Object.fromEntries(
                uniforms.map(k => [k, gl.getUniformLocation(p, k)])
            ),
        };
    }

    function texture() {
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA16F,
            w,
            h,
            0,
            gl.RGBA,
            gl.HALF_FLOAT,
            null
        );
        for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) {
            gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR);
        }
        for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) {
            gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            t,
            0
        );
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            throw Error('浮動小数点テクスチャに対応したWebGL2が必要です。');
        }
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return t;
    }

    function color() {
        const c = swatches[colorIndex].dataset.color;
        return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255);
    }

    function selectColor(i) {
        colorIndex = (i + swatches.length) % swatches.length;
        swatches.forEach((b, j) =>
            b.setAttribute('aria-pressed', String(j === colorIndex))
        );
    }

    function draw(name, out, inputs, splat = null) {
        const { p, u } = programs[name];
        gl.useProgram(p);
        gl.bindFramebuffer(gl.FRAMEBUFFER, out ? fb : null);
        if (out) {
            gl.framebufferTexture2D(
                gl.FRAMEBUFFER,
                gl.COLOR_ATTACHMENT0,
                gl.TEXTURE_2D,
                out,
                0
            );
        }
        gl.viewport(0, 0, out ? w : canvas.width, out ? h : canvas.height);
        gl.uniform2f(u.resolution, out ? w : canvas.width, out ? h : canvas.height);
        const values = {
            dt,
            time: simTime,
            wetness: Number($('wet').value),
            injecting: splat ? 1 : 0,
            radius: splat?.radius || 1,
            amount: splat?.amount || 0,
        };
        for (const [k, v] of Object.entries(values)) gl.uniform1f(u[k], v);
        gl.uniform2fv(u.point, splat?.point || [0, 0]);
        gl.uniform2fv(u.previous, splat?.previous || [0, 0]);
        gl.uniform2fv(u.impulse, splat?.impulse || [0, 0]);
        gl.uniform3fv(u.inkColor, splat?.color || color());
        let unit = 0;
        for (const [key, t] of Object.entries(inputs)) {
            if (u[key] === null) continue;
            if (t === out) throw Error('描画先と入力が重複しています。');
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, t);
            gl.uniform1i(u[key], unit++);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function clearTexture(t) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            t,
            0
        );
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    function clear() {
        for (const t of [...velocity, ...pigment, ...pressure, divergence]) {
            clearTexture(t);
        }
        pending = [];
        dots = 0;
        simTime = 0;
        acc = 0;
        position = lastDraw = null;
        down = false;
        pointerId = null;
        $('hint').classList.remove('hidden');
        render();
    }

    function render() {
        draw('06_render', null, { pigmentTex: pigment[0] });
    }

    function enqueue(p, prev, speed, burst = false) {
        if (paused || failed) return;
        const radius = Number($('size').value) / (1 + speed * 0.003);
        pending.push({
            point: p,
            previous: prev,
            impulse: [
                Math.max(-150, Math.min(150, ((p[0] - prev[0]) * w) / dt)),
                Math.max(-150, Math.min(150, ((p[1] - prev[1]) * h) / dt)),
            ],
            radius: burst
                ? Number($('size').value) * 1.8
                : Math.max(2, radius),
            amount: burst ? 3 : 0.6,
            color: color(),
        });
        if (pending.length > 96) {
            pending.splice(0, pending.length - 96);
        }
        dots++;
        $('hint').classList.add('hidden');
    }

    function step() {
        const s = pending.shift() || null;
        draw(
            '01_velocity',
            velocity[1],
            { velocityTex: velocity[0], pigmentTex: pigment[0] },
            s
        );
        velocity.reverse();
        draw('02_divergence', divergence, { velocityTex: velocity[0] });
        clearTexture(pressure[0]);
        for (let i = 0; i < iterations; i++) {
            draw('03_pressure', pressure[1], {
                pressureTex: pressure[0],
                divergenceTex: divergence,
            });
            pressure.reverse();
        }
        draw('04_project', velocity[1], {
            velocityTex: velocity[0],
            pressureTex: pressure[0],
        });
        velocity.reverse();
        draw(
            '05_pigment',
            pigment[1],
            { velocityTex: velocity[0], pigmentTex: pigment[0] },
            s
        );
        pigment.reverse();
        simTime += dt;
    }

    function toggle() {
        paused = !paused;
        pending = [];
        lastDraw = null;
        $('pause').textContent = paused ? '再開' : '一時停止';
    }

    function resize() {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(devicePixelRatio || 1, 2);
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        render();
    }

    function locate(e) {
        const r = canvas.getBoundingClientRect();
        return [
            Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
            Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height)),
        ];
    }

    function move(e) {
        if (pointerId !== null && e.pointerId !== pointerId) return;
        const p = locate(e);
        const now = performance.now();
        const shouldDraw =
            (e.pointerType === 'mouse' && $('interaction').value === 'hover') ||
            down;
        position = p;
        if (shouldDraw) {
            const prev = lastDraw || p;
            const speed =
                Math.hypot((p[0] - prev[0]) * w, (p[1] - prev[1]) * h) /
                Math.max(0.016, (now - lastMove) / 1000);
            enqueue(p, prev, speed);
            lastDraw = p;
        } else {
            lastDraw = null;
        }
        lastMove = now;
    }

    function release(e) {
        if (pointerId !== null && e.pointerId !== pointerId) return;
        down = false;
        pointerId = null;
        lastDraw = null;
        if (e.pointerType !== 'mouse') position = null;
    }

    function animate(now) {
        if (failed) return;
        try {
            acc += Math.min((now - last) / 1000, 0.05);
            last = now;
            if (!paused) {
                if (
                    position &&
                    pending.length === 0 &&
                    (down || $('interaction').value === 'hover') &&
                    now - lastMove > 65
                ) {
                    enqueue(position, position, 0);
                    lastMove = now;
                }
                let count = 0;
                while (acc >= dt && count < 2) {
                    step();
                    acc -= dt;
                    count++;
                }
                if (count === 2) acc = 0;
                render();
            } else {
                acc = 0;
            }
            $('status').textContent = `${paused ? '停止中' : '描画中'} · ${dots} 筆 · ${simTime.toFixed(1)} 秒`;
            if (gl.getError() !== gl.NO_ERROR) throw Error('GPU描画エラー');
            requestAnimationFrame(animate);
        } catch (e) {
            fail(e);
        }
    }
    try {
        gl = canvas.getContext('webgl2', {
            alpha: false,
            antialias: false,
            depth: false,
            preserveDrawingBuffer: true,
        });
        if (!gl || !gl.getExtension('EXT_color_buffer_float')) {
            throw Error('WebGL2対応のブラウザーで開いてください。');
        }
        gl.bindVertexArray(gl.createVertexArray());
        fb = gl.createFramebuffer();
        const rect = canvas.getBoundingClientRect();
        const aspect = rect.width / rect.height;
        w = Math.max(256, Math.round(640 * Math.min(1, aspect)));
        h = Math.max(256, Math.round(640 / Math.max(1, aspect)));
        for (const [name, source] of Object.entries(window.INK_SHADERS)) {
            programs[name] = program(source);
        }
        velocity = [texture(), texture()];
        pigment = [texture(), texture()];
        pressure = [texture(), texture()];
        divergence = texture();

        swatches.forEach((b, i) => {
            b.onclick = () => selectColor(i);
        });
        for (const id of ['size', 'wet']) {
            $(id).oninput = () => {
                $(id + 'Value').value = $(id).value;
            };
        }
        $('pause').onclick = toggle;
        $('clear').onclick = clear;
        $('interaction').onchange = () => {
            position = lastDraw = null;
            pending = [];
        };
        $('example').onclick = () => {
            if (paused) toggle();
            enqueue([0.5, 0.54], [0.5, 0.54], 0, true);
        };
        $('save').onclick = () => {
            render();
            canvas.toBlob(blob => {
                if (!blob) return;
                const a = document.createElement('a');
                const url = URL.createObjectURL(blob);
                a.href = url;
                a.download = 'ink-garden.png';
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            }, 'image/png');
        };
        canvas.onpointerdown = e => {
            if (down) return;
            down = true;
            pointerId = e.pointerId;
            canvas.setPointerCapture(e.pointerId);
            const p = locate(e);
            position = lastDraw = p;
            enqueue(p, p, 0, true);
            lastMove = performance.now();
        };
        canvas.onpointermove = move;
        canvas.onpointerup = e => {
            release(e);
            if (e.pointerType === 'mouse' && $('interaction').value === 'hover') {
                selectColor(colorIndex + 1);
            }
        };
        canvas.onpointercancel = release;
        canvas.onlostpointercapture = release;
        canvas.onpointerleave = () => {
            if (!down) {
                position = lastDraw = null;
            }
        };
        window.addEventListener('blur', () => {
            down = false;
            pointerId = null;
            position = lastDraw = null;
            pending = [];
        });
        document.addEventListener('visibilitychange', () => {
            last = performance.now();
            acc = 0;
            position = lastDraw = null;
            pending = [];
        });
        document.addEventListener('keydown', e => {
            if (
                ['INPUT', 'SELECT', 'BUTTON'].includes(
                    document.activeElement.tagName
                ) ||
                e.repeat
            ) {
                return;
            }
            if (e.code === 'Space') {
                e.preventDefault();
                toggle();
            }
            if (e.key.toLowerCase() === 'c') selectColor(colorIndex + 1);
            if (e.key.toLowerCase() === 'r') clear();
        });
        canvas.addEventListener('webglcontextlost', e => {
            e.preventDefault();
            fail(Error('GPU接続が失われました。ページを再読み込みしてください。'));
        });
        new ResizeObserver(resize).observe(canvas);
        resize();
        last = performance.now();
        requestAnimationFrame(animate);
    } catch (e) {
        fail(e);
    }
})();
