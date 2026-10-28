import test from "node:test";
import assert from "node:assert/strict";
import { isOnManuscript } from "../lib/manuscript-hit.js";

test("paper clicks respect object-fit letterboxing and exclude the surrounding table", () => {
  const bounds = { left: 320, top: 0, width: 960, height: 720 };
  // The 780x1020 canvas is contained in the middle of a wide element.
  const scale = 720 / 1020,
    left = 320 + (960 - 780 * scale) / 2;
  assert(
    isOnManuscript(left + 100, 300, bounds, 780, 1020, [1, 0, 0, 1, 0, 0]),
  );
  assert(!isOnManuscript(330, 300, bounds, 780, 1020, [1, 0, 0, 1, 0, 0]));
  const matrix = [0.88, 0.035, -0.035, 0.78, 62, 155];
  const project = (x, y) => [
    left + (matrix[0] * x + matrix[2] * y + matrix[4]) * scale,
    (matrix[1] * x + matrix[3] * y + matrix[5]) * scale,
  ];
  assert(isOnManuscript(...project(390, 510), bounds, 780, 1020, matrix));
  assert(!isOnManuscript(...project(-40, 510), bounds, 780, 1020, matrix));
  assert(!isOnManuscript(...project(390, -40), bounds, 780, 1020, matrix));
});

test("mobile scroll offsets, invalid bounds and singular transforms are handled", () => {
  const bounds = { left: 0, top: -100, width: 390, height: 510 };
  assert(isOnManuscript(195, 100, bounds, 780, 1020, [1, 0, 0, 1, 0, 0]));
  assert(!isOnManuscript(400, 100, bounds, 780, 1020, [1, 0, 0, 1, 0, 0]));
  assert(
    !isOnManuscript(
      0,
      0,
      { left: 0, top: 0, width: 0, height: 0 },
      780,
      1020,
      [1, 0, 0, 1, 0, 0],
    ),
  );
  assert(!isOnManuscript(0, 0, bounds, 780, 1020, [0, 0, 0, 0, 0, 0]));
});
