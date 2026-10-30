import * as THREE from "../../third_party/three/three.module.js";

// Canvas is used once to rasterize type. All artwork frames are rendered by WebGL.
export class PortraitRenderer {
  constructor(canvas, width, height) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.renderer.setClearColor("#e9e2d5");
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      THREE.MathUtils.radToDeg(2 * Math.atan(height / 2 / 1900)), width / height, 1, 4000);
    this.camera.position.z = 1900;
    this.paper = new THREE.Group();
    this.scene.add(this.paper);
    this.sheet = new THREE.Mesh(new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ color: "#f5f0e5", side: THREE.DoubleSide }));
    this.paper.add(this.sheet);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ color: "#534532", transparent: true, opacity: 0.09 }));
    shadow.position.set(12, -18, -12);
    this.paper.add(shadow);
    this.raycaster = new THREE.Raycaster();
  }

  prepare(items, intro, mask, drawCharacter, fontName) {
    if (this.mesh) {
      this.paper.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.atlas.dispose();
      this.mask.dispose();
    }
    const glyphs = [...new Set([...items, ...intro].map(p => p.glyph))];
    const cell = 64, columns = Math.ceil(Math.sqrt(glyphs.length));
    const rows = Math.ceil(glyphs.length / columns);
    const atlas = document.createElement("canvas");
    atlas.width = columns * cell;
    atlas.height = rows * cell;
    if (Math.max(atlas.width, atlas.height) > this.renderer.capabilities.maxTextureSize)
      throw Error("文字アトラスが端末のテクスチャ上限を超えています");
    const context = atlas.getContext("2d");
    context.font = `48px "${fontName}"`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#29251f";
    this.rects = new Map();
    glyphs.forEach((glyph, i) => {
      const x = i % columns, y = Math.floor(i / columns);
      drawCharacter(context, glyph, x * cell + 32, y * cell + 32, 48);
      this.rects.set(glyph, [x / columns, 1 - (y + 1) / rows, 1 / columns, 1 / rows]);
    });
    this.atlas = new THREE.CanvasTexture(atlas);
    this.mask = new THREE.CanvasTexture(mask);
    this.mask.minFilter = THREE.LinearFilter;
    this.mask.generateMipmaps = false;
    const base = new THREE.PlaneGeometry(1, 1);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setIndex(base.index.clone());
    geometry.setAttribute("position", base.attributes.position.clone());
    geometry.setAttribute("uv", base.attributes.uv.clone());
    base.dispose();
    this.capacity = items.length + intro.length + 8;
    this.attributes = {};
    for (const [name, size] of [["placement", 4], ["state", 3], ["atlasRect", 4]]) {
      const attribute = new THREE.InstancedBufferAttribute(new Float32Array(this.capacity * size), size);
      attribute.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute(name, attribute);
      this.attributes[name] = attribute;
    }
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { atlas: { value: this.atlas }, mask: { value: this.mask },
        paperSize: { value: new THREE.Vector2(this.width, this.height) } },
      vertexShader: `
        attribute vec4 placement;
        attribute vec3 state;
        attribute vec4 atlasRect;
        uniform vec2 paperSize;
        varying vec2 vAtlas;
        varying vec2 vPaper;
        varying vec2 vState;
        void main() {
          vec2 p = position.xy * placement.z;
          float c = cos(placement.w), s = sin(placement.w);
          p = mat2(c, -s, s, c) * p;
          p += placement.xy;
          vAtlas = atlasRect.xy + uv * atlasRect.zw;
          vPaper = p / paperSize + 0.5;
          vState = state.xz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, state.y + 0.5, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D atlas;
        uniform sampler2D mask;
        varying vec2 vAtlas;
        varying vec2 vPaper;
        varying vec2 vState;
        void main() {
          float alpha = texture2D(atlas, vAtlas).a * vState.x;
          if (vState.y > 0.5) {
            if (any(lessThan(vPaper, vec2(0.0))) || any(greaterThan(vPaper, vec2(1.0)))) discard;
            alpha *= texture2D(mask, vPaper).a;
          }
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(0.022, 0.019, 0.014, alpha);
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.paper.add(this.mesh);
  }

  begin(tilt) {
    this.count = 0;
    this.paper.rotation.set(tilt * 0.36, tilt * -0.08, tilt * -0.035);
    this.paper.scale.setScalar(1 - tilt * 0.11);
    this.paper.position.y = -tilt * 32;
  }

  glyph(glyph, x, y, size, angle = 0, alpha = 1, z = 0, clipped = false) {
    if (alpha <= 0 || !this.rects.has(glyph)) return;
    if (this.count >= this.capacity) throw Error("文字インスタンスの上限を超えました");
    const i = this.count++;
    this.attributes.placement.setXYZW(i, x - this.width / 2, this.height / 2 - y, size * 64 / 48, angle);
    this.attributes.state.setXYZ(i, alpha, z, clipped ? 1 : 0);
    this.attributes.atlasRect.array.set(this.rects.get(glyph), i * 4);
  }

  end() {
    this.mesh.geometry.instanceCount = this.count;
    for (const attribute of Object.values(this.attributes)) {
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, this.count * attribute.itemSize);
      attribute.needsUpdate = true;
    }
    this.renderer.render(this.scene, this.camera);
  }

  hitTest(clientX, clientY) {
    // Match CSS object-fit:contain, including letterboxing on wide screens.
    const r = this.canvas.getBoundingClientRect();
    const scale = Math.min(r.width / this.width, r.height / this.height);
    const w = this.width * scale, h = this.height * scale;
    const x = clientX - r.left - (r.width - w) / 2;
    const y = clientY - r.top - (r.height - h) / 2;
    if (x < 0 || y < 0 || x > w || y > h) return false;
    this.raycaster.setFromCamera(new THREE.Vector2(x / w * 2 - 1, 1 - y / h * 2), this.camera);
    return this.raycaster.intersectObject(this.sheet).length > 0;
  }
}
