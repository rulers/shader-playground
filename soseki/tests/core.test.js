import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { analyze, mapLetters } from "../lib/mapping.js";
import { makeRainPlan, rainSchedule } from "../lib/rain.js";
import { TEXT } from "../wagahai.js";

test("white areas remain empty, layouts are reproducible, and budget is respected", () => {
  const w = 240,
    h = 300,
    gray = new Float32Array(w * h).fill(1);
  for (let y = 45; y < 255; y++)
    for (let x = 55; x < 185; x++) gray[y * w + x] = 0.2;
  const field = analyze(gray, w, h, 0.6);
  const options = {
    seed: 1409,
    count: 500,
    scale: 1.2,
    edge: 0.6,
    sizing: "adaptive",
    rotation: "random",
  };
  const letters = mapLetters(field, options);
  assert(letters.length > 0 && letters.length <= options.count);
  assert(
    letters.every((p) => field.mask[p.y * w + p.x] && Number.isFinite(p.size)),
  );
  assert.deepEqual(letters, mapLetters(field, options));
  assert.equal(
    mapLetters(analyze(new Float32Array(w * h).fill(1), w, h, 0.6), options)
      .length,
    0,
  );
  assert.notDeepEqual(letters, mapLetters(field, { ...options, seed: 1410 }));
});

test("random rain intensifies, stays bounded and settles every letter even when arrivals reorder", () => {
  const count = 4800,
    plan = makeRainPlan(count, 16, 0.15, 1.35, 384, 1409);
  assert.equal(new Set(plan.arrivals.map((p) => p.index)).size, count);
  const sparse = plan.events.filter((p) => p.start < 4).length;
  const storm = plan.events.filter((p) => p.start >= 13 && p.start < 16).length;
  assert(storm > sparse * 20);
  let previous = 0;
  for (let time = 0; time <= plan.duration; time += 0.019) {
    const state = rainSchedule(time, count, 16, 0.15, 1.35, 384, 1409);
    assert(state.landed >= previous);
    assert(state.flying.length <= 384);
    assert(state.flying.every((p) => p.t >= 0 && p.t < 1));
    previous = state.landed;
  }
  assert.equal(
    rainSchedule(plan.duration, count, 16, 0.15, 1.35, 384, 1409).landed,
    count,
  );
  assert(plan.arrivals.some((p, i, a) => i && p.index < a[i - 1].index));
  assert(plan.duration < 30);
});

test("body characters are covered by bundled font or explicit original-gaiji fallbacks", () => {
  const font = readFileSync(
    new URL("../assets/ZenAntiqueSoft-Regular.ttf", import.meta.url),
  );
  let cmap;
  for (let i = 0; i < font.readUInt16BE(4); i++) {
    const pos = 12 + i * 16;
    if (font.toString("ascii", pos, pos + 4) === "cmap")
      cmap = font.readUInt32BE(pos + 8);
  }
  assert(cmap !== undefined);
  const subtables = [];
  for (let i = 0; i < font.readUInt16BE(cmap + 2); i++)
    subtables.push(cmap + font.readUInt32BE(cmap + 4 + i * 8 + 4));
  function has(code) {
    return subtables.some((table) => {
      const format = font.readUInt16BE(table);
      if (format === 12) {
        for (let i = 0; i < font.readUInt32BE(table + 12); i++) {
          const group = table + 16 + i * 12;
          if (
            code >= font.readUInt32BE(group) &&
            code <= font.readUInt32BE(group + 4)
          )
            return (
              font.readUInt32BE(group + 8) + code - font.readUInt32BE(group) !==
              0
            );
        }
      } else if (format === 4 && code <= 0xffff) {
        const segments = font.readUInt16BE(table + 6) / 2;
        for (let i = 0; i < segments; i++) {
          const end = font.readUInt16BE(table + 14 + i * 2),
            start = font.readUInt16BE(table + 16 + segments * 2 + i * 2);
          if (code < start || code > end) continue;
          const delta = font.readInt16BE(table + 16 + segments * 4 + i * 2),
            rangePos = table + 16 + segments * 6 + i * 2,
            range = font.readUInt16BE(rangePos);
          if (!range) return ((code + delta) & 0xffff) !== 0;
          const glyph = font.readUInt16BE(
            rangePos + range + (code - start) * 2,
          );
          return glyph !== 0 && ((glyph + delta) & 0xffff) !== 0;
        }
      }
      return false;
    });
  }
  const missing = [
    ...new Set(
      Array.from(Array.from(TEXT).filter(c => !/\s/u.test(c)).slice(0, 12000).join("") + "吾輩は猫である夏目漱石言葉の肖像").filter(
        (c) => !/\s/u.test(c),
      ),
    ),
  ].filter((c) => !has(c.codePointAt(0)));
  assert.deepEqual(missing.sort(), ["―", "譃"].sort());
  assert(readFileSync(new URL("../assets/gaiji-uso.png", import.meta.url)).length > 0);
  assert(TEXT.startsWith("吾輩は猫である。名前はまだ無い。"));
  assert(TEXT.endsWith("ありがたいありがたい。"));
  assert(!TEXT.includes("入力："));
  assert(!TEXT.includes("※"));
});
