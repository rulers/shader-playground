function seeded(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function analyze(gray, w, h, threshold = 0.72) {
  const soft = new Float32Array(w * h),
    edges = new Float32Array(w * h),
    dark = new Float32Array(w * h),
    mask = new Uint8Array(w * h);
  for (let y = 2; y < h - 2; y++)
    for (let x = 2; x < w - 2; x++) {
      let sum = 0;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) sum += gray[(y + dy) * w + x + dx];
      soft[y * w + x] = sum / 25;
    }
  for (let y = 4; y < h - 4; y++)
    for (let x = 4; x < w - 4; x++) {
      const i = y * w + x;
      mask[i] = soft[i] < threshold ? 1 : 0;
      dark[i] = mask[i]
        ? Math.pow(
            Math.max(
              0,
              Math.min(
                1,
                (threshold - soft[i]) / Math.max(0.1, threshold - 0.12),
              ),
            ),
            0.65,
          )
        : 0;
      edges[i] = Math.min(
        1,
        Math.hypot(
          soft[i + 2] - soft[i - 2],
          soft[i + w * 2] - soft[i - w * 2],
        ) * 4,
      );
    }
  return { dark, edges, mask, w, h };
}
function mapLetters(field, options) {
  const { dark, edges, mask, w, h } = field,
    rand = seeded(options.seed),
    candidates = [],
    occupied = new Uint8Array(w * h),
    result = [];
  const weight = options.edge;
  for (let y = 30; y < h - 30; y += 5)
    for (let x = 30; x < w - 30; x += 5) {
      const i = y * w + x,
        d = dark[i],
        e = edges[i];
      const importance =
        e * weight * 1.8 + Math.pow(d, 1.6) * (1 - weight * 0.82);
      if (mask[i] && importance > 0.025)
        candidates.push({
          x,
          y,
          d,
          e,
          key: -Math.log(Math.max(1e-9, rand())) / importance,
        });
    }
  candidates.sort((a, b) => a.key - b.key);
  for (const p of candidates) {
    if (result.length >= options.count) break;
    // Inspect surrounding detail too: large glyphs must not cover a nearby fine contour.
    let detail = p.e,
      meanDark = 0,
      samples = 0;
    for (let dy = -14; dy <= 14; dy += 7)
      for (let dx = -14; dx <= 14; dx += 7) {
        const i = (p.y + dy) * w + p.x + dx;
        detail = Math.max(detail, edges[i]);
        meanDark += dark[i];
        samples++;
      }
    meanDark /= samples;
    const flat = Math.max(0, 1 - detail * 2.5),
      large = meanDark * flat;
    let size =
      options.scale *
      (options.sizing === "fixed"
        ? 17
        : 9 + rand() * 5 + large * (14 + rand() * 24));
    // Shrink glyphs near white boundaries; final raster clipping removes remaining ink spill.
    let whiteRatio = 1;
    for (let attempt = 0; attempt < 5; attempt++) {
      let white = 0,
        tested = 0;
      const extent = Math.ceil(size * 0.7);
      for (let dy = -extent; dy <= extent; dy += 3)
        for (let dx = -extent; dx <= extent; dx += 3) {
          const xx = Math.round(p.x + dx),
            yy = Math.round(p.y + dy);
          tested++;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h || !mask[yy * w + xx])
            white++;
        }
      whiteRatio = white / tested;
      if (whiteRatio <= 0.12) break;
      size *= 0.8;
    }
    if (whiteRatio > 0.12 || size < 6) continue;
    const radius = Math.max(3, size * 0.33),
      r = Math.ceil(radius),
      cx = Math.round(p.x),
      cy = Math.round(p.y);
    let hits = 0,
      total = 0;
    for (let dy = -r; dy <= r; dy += 2)
      for (let dx = -r; dx <= r; dx += 2)
        if (dx * dx + dy * dy < radius * radius) {
          total++;
          hits += occupied[(cy + dy) * w + cx + dx];
        }
    if (hits / Math.max(1, total) > 0.42) continue;
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++)
        if (dx * dx + dy * dy < radius * radius)
          occupied[(cy + dy) * w + cx + dx] = 1;
    result.push({
      x: p.x,
      y: p.y,
      size,
      angle: options.rotation === "random" ? (rand() * 2 - 1) * Math.PI : 0,
      delay: rand() * 0.76,
      duration: 0.18 + rand() * 0.06,
      sway: (rand() - 0.5) * 100,
      detail,
      shade: p.d,
    });
  }
  // Reading order only assigns text; landing times are independent.
  result.sort(
    (a, b) => Math.floor(b.x / 18) - Math.floor(a.x / 18) || a.y - b.y,
  );
  return result;
}
const PortraitMapping = { seeded, analyze, mapLetters };

export { seeded, analyze, mapLetters };
