// Deterministic, allocation-free flight. No engine, remote service or per-frame objects.
export const CAMERA_Z = 26;
export const HALF_HEIGHT = CAMERA_Z * Math.tan(45 * Math.PI / 360);
export const PALETTE = ['#00dffc', '#286aff', '#36ef77', '#f5ec22', '#ff7a24', '#fa24c8', '#9355ff'];
const TAU = Math.PI * 2;
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export function random(seed = 57054654) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function whiteMode(mode, time) { return mode === 'white' || mode === 'auto' && time % 30 >= 15; }
export function createFlock(count = 180, aspect = 1.6) {
  const state = { count, aspect, time: 0, wind: { x: 0, y: 0, vx: 0, vy: 0 }, positions: new Float32Array(count * 3), velocity: new Float32Array(count * 3), gust: new Float32Array(count * 2), pose: new Float32Array(count * 2), wing: new Float32Array(count * 4), colors: new Float32Array(count * 3), sizes: new Float32Array(count), shapes: new Float32Array(count), speed: new Float32Array(count), goal: new Float32Array(count), remaining: new Float32Array(count), seeds: new Uint32Array(count) };
  resetFlock(state); return state;
}
export function resetFlock(s) {
  const rng = random(); s.time = 0; s.wind.vx = s.wind.vy = 0; s.gust.fill(0);
  const placement = random(915731), placedX = new Float32Array(s.count), placedY = new Float32Array(s.count), radii = new Float32Array(s.count);
  for (let i = 0; i < s.count; i++) {
    const layer = i % 3, z = [-9, -1, 6][layer] + (rng() - .5) * 2.4;
    const halfH = HALF_HEIGHT * (CAMERA_Z - z) / CAMERA_Z;
    const k = i * 3, p = i * 2, w = i * 4;
    s.sizes[i] = [.26, .42, .82][layer] * (.84 + rng() * .32);
    s.shapes[i] = Math.floor(rng() * 3); s.speed[i] = .48 + rng() * .78;
    const heading = rng() * TAU;
    s.goal[i] = heading; s.pose[p] = heading;
    s.pose[p + 1] = Math.sin(heading) * 1.32;
    s.velocity[k] = -Math.sin(heading) * s.speed[i]; s.velocity[k + 1] = Math.cos(heading) * s.speed[i]; s.velocity[k + 2] = 0;
    s.wing[w] = rng() * TAU; s.wing[w + 1] = 5.4 + rng() * 4.8; s.wing[w + 2] = .65 + rng() * .32; s.wing[w + 3] = rng() * TAU;
    // A few best-candidate samples avoid both a regular grid and accidental piles.
    const radius = s.sizes[i] * .64 / halfH;
    let best = -Infinity, bestX = 0, bestY = 0;
    for (let candidate = 0; candidate < 18; candidate++) {
      const x = (placement() * 2 - 1) * (.96 * s.aspect - radius), y = (placement() * 2 - 1) * (.95 - radius);
      let gap = Infinity;
      for (let j = 0; j < i; j++) gap = Math.min(gap, Math.hypot(x - placedX[j], y - placedY[j]) - radius - radii[j]);
      if (gap > best) { best = gap; bestX = x; bestY = y; }
    }
    placedX[i] = bestX; placedY[i] = bestY; radii[i] = radius;
    s.positions[k] = bestX * halfH; s.positions[k + 1] = bestY * halfH; s.positions[k + 2] = z;
    s.remaining[i] = 1.5 + rng() * 5; s.seeds[i] = Math.floor(rng() * 4294967295) || i + 1;
  }
}
function next(s, i) { let x = s.seeds[i]; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; s.seeds[i] = x >>> 0; return (x >>> 0) / 4294967296; }
export function resizeFlock(s, aspect) {
  const ratio = aspect / s.aspect;
  for (let i = 0; i < s.count; i++) s.positions[i * 3] *= ratio;
  s.aspect = aspect; s.wind.vx = s.wind.vy = 0;
}
export function setWind(s, x, y, vx, vy) {
  s.wind.x = x; s.wind.y = y;
  s.wind.vx = clamp(vx, -5, 5); s.wind.vy = clamp(vy, -5, 5);
}
export function clearWind(s) { s.wind.vx = s.wind.vy = 0; }
export function advance(s, seconds, activity = 1, strength = .8) {
  const duration = clamp(seconds, 0, .1), steps = Math.max(1, Math.ceil(duration * 60)), dt = duration / steps;
  for (let k = 0; k < steps; k++) integrate(s, dt, activity, strength);
}
function integrate(s, dt, activity, strength) {
  s.time += dt;
  const follow = 1 - Math.exp(-dt * 1.1), turn = 1 - Math.exp(-dt * 5), decay = Math.exp(-dt * 2.6);
  for (let i = 0; i < s.count; i++) {
    const k = i * 3, p = i * 2;
    s.remaining[i] -= dt * activity;
    if (s.remaining[i] <= 0) { s.goal[i] += (next(s, i) - .5) * 2.2; s.remaining[i] = 2.5 + next(s, i) * 4; }
    const z = s.positions[k + 2], halfH = HALF_HEIGHT * (CAMERA_Z - z) / CAMERA_Z;
    const boundX = halfH * s.aspect, boundY = halfH;
    const x = s.positions[k], y = s.positions[k + 1];
    let wandering = s.goal[i] + .18 * Math.sin(s.time * .63 + s.wing[i * 4 + 3]);
    let desiredX = -Math.sin(wandering) * s.speed[i], desiredY = Math.cos(wandering) * s.speed[i];
    // Choose a new inward route, rather than balancing an outward goal against
    // the border force (which would leave butterflies parked around the rim).
    if ((Math.abs(x) > boundX * .78 && x * desiredX > 0) || (Math.abs(y) > boundY * .78 && y * desiredY > 0)) {
      const dx = (next(s,i) - .5) * boundX * 1.2 - x, dy = (next(s,i) - .5) * boundY * 1.2 - y;
      s.goal[i] = Math.atan2(-dx,dy); s.remaining[i] = 3 + next(s,i) * 4;
      wandering = s.goal[i]; desiredX = -Math.sin(wandering) * s.speed[i]; desiredY = Math.cos(wandering) * s.speed[i];
    }
    desiredX -= Math.sign(x) * Math.max(0, Math.abs(x) / boundX - .82) * 9;
    desiredY -= Math.sign(y) * Math.max(0, Math.abs(y) / boundY - .82) * 9;
    s.velocity[k] += (desiredX - s.velocity[k]) * follow;
    s.velocity[k + 1] += (desiredY - s.velocity[k + 1]) * follow;
    const dx = x / halfH - s.wind.x * s.aspect, dy = y / halfH - s.wind.y;
    const weight = Math.exp(-(dx * dx + dy * dy) / (.30 * .30)) * strength;
    s.gust[p] = clamp(s.gust[p] * decay + s.wind.vx * halfH * weight * dt * 1.4, -3, 3);
    s.gust[p + 1] = clamp(s.gust[p + 1] * decay + s.wind.vy * halfH * weight * dt * 1.4, -3, 3);
    const vx = s.velocity[k] * activity + s.gust[p], vy = s.velocity[k + 1] * activity + s.gust[p + 1];
    s.positions[k] = clamp(x + vx * dt, -boundX * .98, boundX * .98);
    s.positions[k + 1] = clamp(y + vy * dt, -boundY * .98, boundY * .98);
    if (vx * vx + vy * vy > .0004) {
      const heading = Math.atan2(-vx, vy), delta = Math.atan2(Math.sin(heading - s.pose[p]), Math.cos(heading - s.pose[p]));
      s.pose[p] += delta * turn;
      const yaw = Math.sin(s.pose[p]) * 1.32;
      s.pose[p + 1] += (yaw - s.pose[p + 1]) * (1 - Math.exp(-dt * 3));
    }
  }
  s.wind.vx *= Math.exp(-dt * 7); s.wind.vy *= Math.exp(-dt * 7);
}
