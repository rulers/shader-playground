import { seeded } from "./mapping.js";
const planCache = new Map();
function upperTime(list, time, key) {
  let lo = 0,
    hi = list.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (list[m][key] <= time) lo = m + 1;
    else hi = m;
  }
  return lo;
}
function makeRainPlan(
  count,
  early,
  jitter,
  strength = 1.35,
  limit = 384,
  seedValue = 1409,
) {
  const key = [count, early, jitter, strength, limit, seedValue].join(":");
  if (planCache.has(key)) return planCache.get(key);
  const random = seeded(seedValue + 9187),
    events = [],
    lanes = new Float64Array(Math.max(1, limit));
  let previous = 0;
  const initialShare = Math.min(
      0.04,
      Math.max(0.003, early / Math.max(1, count)),
    ),
    rushStart = 4 + (9 * 1.35) / strength;
  for (let i = 0; i < count; i++) {
    const u = (i + random()) / count;
    let target =
      u < initialShare
        ? (4 * u) / initialShare
        : u < 0.2
          ? 4 +
            (rushStart - 4) *
              Math.pow((u - initialShare) / (0.2 - initialShare), 0.65)
          : rushStart + 3 * Math.pow((u - 0.2) / 0.8, 0.6);
    // Irregular local showers: silence, gusts, and dense final bursts.
    target += Math.sin(u * 41) * jitter * 0.55 + (random() - 0.5) * jitter;
    target = Math.max(previous, 0, target);
    previous = target;
    let lane = 0;
    for (let j = 1; j < lanes.length; j++) if (lanes[j] < lanes[lane]) lane = j;
    const start = Math.max(target, lanes[lane] + 0.002),
      duration = (u < 0.2 ? 0.7 : 0.36) + random() * (u < 0.2 ? 0.35 : 0.32);
    const event = {
      index: i,
      start,
      duration,
      end: start + duration,
      wind: (random() - 0.5) * 1.5,
      spin: (random() - 0.5) * 1.6,
    };
    events.push(event);
    lanes[lane] = event.end;
  }
  const arrivals = events
      .slice()
      .sort((a, b) => a.end - b.end || a.index - b.index),
    duration = count ? arrivals[arrivals.length - 1].end + 0.25 : 0;
  const result = { events, arrivals, duration };
  if (planCache.size > 8) planCache.clear();
  planCache.set(key, result);
  return result;
}
function rainSchedule(
  seconds,
  count,
  early,
  jitter,
  strength = 1.35,
  limit = 384,
  seedValue = 1409,
) {
  const plan = makeRainPlan(count, early, jitter, strength, limit, seedValue),
    landed = upperTime(plan.arrivals, seconds, "end"),
    end = upperTime(plan.events, seconds, "start"),
    begin = upperTime(plan.events, seconds - 1.1, "start"),
    flying = [];
  for (let i = begin; i < end; i++) {
    const e = plan.events[i];
    if (seconds < e.end)
      flying.push({ ...e, t: (seconds - e.start) / e.duration });
  }
  return {
    landed,
    flying,
    arrivalOrder: plan.arrivals,
    duration: plan.duration,
  };
}

export { makeRainPlan, rainSchedule };
