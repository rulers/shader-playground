import { random } from './painting.js';
import { SPECIES } from './butterfly.js';
import { flightYaw } from './flight.js';

function shuffled(items, seed) {
  const r = random(seed);
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1)); [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

// Separate streams keep identity, scale and attitude independent of placement
// retries and viewport size. Adding a position candidate cannot change a species.
function speciesPlan(count) {
  return shuffled(Array.from({ length: count }, (_, i) => i % SPECIES.length), 1739);
}
function sizePlan(count) {
  const r = random(5291);
  return Array.from({ length: count }, () => .44 + r() * .22);
}
function attitudePlan(count) {
  const side = Math.round(count * .4), diagonal = Math.round(count * .4);
  return shuffled(Array.from({ length: count }, (_, i) => i < side ? 'side' : i < side + diagonal ? 'oblique' : 'front'), 6841);
}

function placeFlock(flock, width) {
  const r = random(9157), placed = [];
  // Place the largest footprints first, retaining the original identity order.
  const order = [...flock].sort((a, b) => b.radius - a.radius);
  for (const bird of order) {
    let bestX = 0, bestY = 0, bestClearance = -Infinity;
    const extent = Math.max(.05, width * .43 - bird.radius * .5);
    for (let candidate = 0; candidate < 320; candidate++) {
      const x = (r() * 2 - 1) * extent, y = -5.1 + r() * 11.2;
      // Leave the vertical title some air, especially on a narrow painting.
      if (x > width * (width < 12 ? .1 : .24) && y > .3 && y < 5.7) continue;
      let clearance = 100;
      for (const other of placed) clearance = Math.min(clearance, Math.hypot(x - other.x, y - other.y) - bird.radius - other.radius);
      if (clearance > bestClearance) { bestClearance = clearance; bestX = x; bestY = y; }
    }
    bird.x = bestX; bird.y = bestY; placed.push(bird);
  }
}

function orientFlock(flock, width) {
  const r = random(3263);
  let sideIndex = 0, diagonalIndex = 0, frontIndex = 0;
  for (const bird of flock) {
    const sign = bird.pose === 'side' ? (sideIndex++ % 2 ? -1 : 1) : bird.pose === 'oblique' ? (diagonalIndex++ % 2 ? -1 : 1) : (frontIndex++ % 2 ? -1 : 1);
    const angle = bird.pose === 'side' ? 1.35 + r() * .28 : bird.pose === 'oblique' ? .75 + r() * .2 : .08 + r() * .16;
    let dx = sign * Math.sin(angle), dy = Math.cos(angle);
    const travel = 1.3 + r() * .8;
    // Reflect only the required component near a border. The pose category and
    // speed stay intact, and the first goal remains on the same velocity ray.
    if (Math.abs(bird.x + dx * travel) > width * .43) dx = -Math.sign(bird.x) * Math.abs(dx);
    if (bird.y + dy * travel > 6.3) dy = -Math.abs(dy);
    if (bird.y + dy * travel < -5.8) dy = Math.abs(dy);
    const speed = .2 + r() * .09;
    bird.vx = dx * speed; bird.vy = dy * speed;
    bird.heading = Math.atan2(-dx, dy); bird.yaw = flightYaw(dx, dy);
    bird.goalX = bird.x + dx * travel; bird.goalY = bird.y + dy * travel;
    bird.flap = bird.pose === 'side' ? .7 + r() * .3 : bird.pose === 'oblique' ? .3 + r() * .3 : .16 + r() * .18;
    const stroke = Math.asin(Math.max(-1, Math.min(1, (bird.flap - .14) / .525 - 1)));
    bird.phase = r() > .5 ? stroke : Math.PI - stroke;
    bird.z = .4 + r() * .3;
  }
}

export function createFlockLayout(count, width) {
  const species = speciesPlan(count), sizes = sizePlan(count), poses = attitudePlan(count);
  const compact = Math.min(1, width / 6.5);
  const flock = species.map((kind, i) => {
    const scale = sizes[i] * SPECIES[kind].size * compact;
    return { species: kind, size: sizes[i], scale, radius: 1.2 * scale, pose: poses[i] };
  });
  placeFlock(flock, width); orientFlock(flock, width);
  return flock;
}
