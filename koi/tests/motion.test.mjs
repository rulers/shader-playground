import test from 'node:test';
import assert from 'node:assert/strict';
import { createFish, createSwimmer } from '../fish.js';

test('boundary turns cannot reverse body bend abruptly', () => {
    for (let id = 0; id < 7; id++) {
        const swimmer = createSwimmer(id);
        let previous = 0;
        for (let i = 0; i <= 90 * 60; i++) {
            const { curvature } = swimmer.update(i / 60, 4.5, 2.2);
            assert.ok(Number.isFinite(curvature));
            assert.ok(Math.abs(curvature - previous) <= .010000001);
            previous = curvature;
        }
        assert.equal(swimmer.update(0, 4.5, 2.2).curvature, 0);
    }
});

test('tail tip remains continuous through the reproduced 1.4s turn', () => {
    const fish = createFish(0);
    let previous, maximum = 0;
    for (let i = 0; i <= 4 * 60; i++) {
        fish.update(i / 60, 1.2, 4.5, 2.2);
        const positions = fish.group.children[1].geometry.attributes.position;
        const tip = [positions.getX(2), positions.getY(2), positions.getZ(2)];
        if (previous) maximum = Math.max(maximum, Math.hypot(...tip.map((v, n) => v - previous[n])));
        previous = tip;
    }
    // The original defect moved the tip ~2 model units in a single frame.
    assert.ok(maximum < .10, `tail step ${maximum}`);
});
