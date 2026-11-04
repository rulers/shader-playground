import { random } from './painting.js';

const TAU = Math.PI * 2;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Each butterfly owns a repeatable random sequence. Goals change at irregular
// intervals; sine is used only for the wing stroke, never to prescribe a path.
export function resetFlight(b, index, width, targets) {
  b.random = random(8241 + index * 731);
  const r = b.random;
  b.x = (r() - .5) * width * .77; b.y = -3.5 + r() * 9.4;
  b.z = .35 + r() * .5; b.vx = (r() - .5) * .18; b.vy = 0;
  b.pace = .66 + r() * .6; b.wingRate = 7 + r() * 4;
  b.phase = r() * TAU; b.flap = .5; b.bank = 0;
  b.offsetX = b.offsetY = b.windX = b.windY = 0;
  b.flower = index % targets.length; b.state = 'flap';
  b.remaining = 1 + r() * 4; b.visits = 0;
  b.goalX = clamp(b.x + (r() - .5) * 3, -width * .43, width * .43);
  b.goalY = clamp(b.y + .8 + r() * 1.8, -5.7, 6.3);
}

function chooseState(b, width, targets) {
  const r = b.random;
  if (b.state === 'approach') {
    // Reach the flower before resting; a timeout chooses another flight goal.
    if (Math.hypot(b.goalX - b.x, b.goalY - b.y) < .34) {
      b.state = 'rest'; b.remaining = 2.8 + r() * 5; b.visits++;
      return;
    }
  } else if (b.state !== 'rest' && r() < .24) {
    b.flower = Math.floor(r() * targets.length);
    const flower = targets[b.flower];
    b.goalX = clamp(flower.x, -width * .43, width * .43);
    b.goalY = clamp(flower.y + .2, -7.2, 6);
    b.state = 'approach'; b.remaining = 22 + r() * 10;
    return;
  }
  const roll = r();
  b.state = b.state === 'rest' ? 'flap' : roll < .4 ? 'glide' : roll < .65 ? 'descend' : 'flap';
  b.remaining = 2.4 + r() * 4.3;
  b.goalX = clamp(b.x + (r() - .5) * 4.4, -width * .43, width * .43);
  b.goalY = clamp(b.y + (b.state === 'flap' ? .7 + r() * 1.7 : b.state === 'descend' ? -.6 - r() * 1.3 : (r() - .5) * .6), -5.8, 6.3);
}

export function updateFlight(b, dt, activity, width, targets, wind, strength) {
  const step = dt * activity * b.pace;
  b.remaining -= step;
  const dx = b.goalX - b.x, dy = b.goalY - b.y;
  if (b.remaining <= 0 || (b.state === 'approach' && Math.hypot(dx, dy) < .28)) chooseState(b, width, targets);
  const resting = b.state === 'rest';
  const speed = resting ? .15 : b.state === 'approach' ? .52 : b.state === 'glide' ? .31 : .42;
  const gx = b.goalX - b.x, gy = b.goalY - b.y;
  const distance = Math.max(1, Math.hypot(gx, gy));
  const ease = 1 - Math.exp(-step * (resting ? 3 : 1.5));
  b.vx += (gx / distance * speed - b.vx) * ease;
  b.vy += (gy / distance * speed - b.vy) * ease;
  b.phase += step * b.wingRate;
  const stroke = (1 + Math.sin(b.phase)) * .5;
  // Small upward impulses during the closing stroke, absent during gliding.
  if (b.state === 'flap') b.vy += Math.max(0, Math.cos(b.phase)) * step * .14;
  if (b.state === 'descend') b.vy -= step * .035;
  b.x = clamp(b.x + b.vx * step, -width * .45, width * .45);
  b.y = clamp(b.y + b.vy * step, -7.4, 6.5);
  const wantedFlap = resting ? 1.18 : b.state === 'glide' || b.state === 'descend' ? .18 : .14 + stroke * 1.05;
  b.flap += (wantedFlap - b.flap) * (1 - Math.exp(-dt * 13));
  b.bank += (clamp(-b.vx * 1.3, -.65, .65) - b.bank) * (1 - Math.exp(-dt * 2));

  // A damped offset keeps gusts separate from the flight goal. With no input,
  // both displacement and velocity return to zero, even with activity at zero.
  const wx = b.x - wind.x, wy = b.y - wind.y;
  const influence = Math.exp(-(wx * wx + wy * wy) / 3.2) * strength;
  b.windX += (wind.vx * influence * 3.6 - b.offsetX * 5.5 - b.windX * 4.8) * dt;
  b.windY += (wind.vy * influence * 3.6 - b.offsetY * 5.5 - b.windY * 4.8) * dt;
  b.windX = clamp(b.windX, -.85, .85); b.windY = clamp(b.windY, -.85, .85);
  b.offsetX = clamp(b.offsetX + b.windX * dt, -.65, .65);
  b.offsetY = clamp(b.offsetY + b.windY * dt, -.65, .65);
}

export function decayWind(wind, dt) {
  const decay = Math.exp(-dt * 3.2); wind.vx *= decay; wind.vy *= decay;
}

export function resizeFlight(b, ratio, targets, width) {
  b.x *= ratio; b.goalX *= ratio;
  if (b.state === 'approach' || b.state === 'rest') {
    const flower = targets[b.flower % targets.length];
    b.goalX = clamp(flower.x, -width * .43, width * .43); b.goalY = clamp(flower.y + .2, -7.2, 6);
    // Re-approach instead of teleporting to the regenerated plant.
    b.state = 'approach'; b.remaining = 25;
  }
}
