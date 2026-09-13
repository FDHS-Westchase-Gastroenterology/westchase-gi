/* Unit tests for the elastic thumb's pure physics (issue #302). They live
   here rather than beside the module because src/components is a
   browser-only tree by lint: it may not import Node's test runner. */
import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_SQUASH,
  VELOCITY_WINDOW,
  clampDrawn,
  deformationVelocity,
  normalizeWheel,
  squash,
  toContent,
  toTrack,
  trimSamples,
  wheelExcess,
} from "@/components/ui/scroll-area-physics";

test("wheelExcess is the part of a step the viewport cannot take", () => {
  assert.equal(wheelExcess(0, 100, 2160), 0);
  assert.equal(wheelExcess(2100, 100, 2160), 40);
  assert.equal(wheelExcess(2160, 100, 2160), 100);
  assert.equal(wheelExcess(50, -100, 2160), -50);
  assert.equal(wheelExcess(0, -100, 2160), -100);
  assert.equal(wheelExcess(0, 0, 2160), 0);
});

test("wheelExcess is zero for an inward step at either end", () => {
  assert.equal(wheelExcess(2160, -100, 2160), 0);
  assert.equal(wheelExcess(0, 100, 2160), 0);
});

test("normalizeWheel turns lines and pages into pixels", () => {
  assert.equal(normalizeWheel(120, 0, 520), 120);
  assert.equal(normalizeWheel(3, 1, 520), 48);
  assert.equal(normalizeWheel(1, 2, 520), 520);
  assert.equal(normalizeWheel(-2, 1, 520), -32);
});

test("toTrack maps one viewport of content to one thumb height", () => {
  // 57 rows: content 2680, viewport 520, track 484, thumb 94 (issue #302 baseline).
  const maxScrollTop = 2680 - 520;
  const maxOffset = 484 - 94;
  assert.ok(Math.abs(toTrack(520, maxOffset, maxScrollTop) - 94) < 0.5);
  assert.equal(toTrack(100, 0, maxScrollTop), 0);
  assert.equal(toTrack(100, maxOffset, 0), 0);
  assert.ok(
    Math.abs(toContent(toTrack(333, maxOffset, maxScrollTop), maxOffset, maxScrollTop) - 333) <
      1e-9,
  );
});

test("squash is zero at rest, has diminishing returns, and never reaches the cap", () => {
  const height = 94;
  assert.equal(squash(0, height), 0);
  assert.ok(Math.abs(squash(height, height) - (MAX_SQUASH * height) / 2) < 1e-9);
  assert.ok(Math.abs(squash(-height, height) - (MAX_SQUASH * height) / 2) < 1e-9);
  const small = squash(10, height);
  const larger = squash(20, height);
  assert.ok(larger > small);
  assert.ok(larger < 2 * small);
  assert.ok(squash(1e9, height) < MAX_SQUASH * height);
  assert.equal(squash(10, 0), 0);
});

test("squash scales with the thumb at the 16px floor", () => {
  assert.equal(squash(16, 16), 2.4);
  assert.ok(squash(1e9, 16) < 4.8);
});

test("clampDrawn bounds compression and overshoot symmetrically", () => {
  assert.equal(clampDrawn(100, 94), MAX_SQUASH * 94);
  assert.equal(clampDrawn(-100, 94), -MAX_SQUASH * 94);
  assert.equal(clampDrawn(5, 94), 5);
});

test("deformationVelocity reads the last stretch of the gesture", () => {
  const samples = [
    { value: 0, time: 1000 },
    { value: 4, time: 1020 },
    { value: 8, time: 1040 },
  ];
  assert.equal(deformationVelocity(samples, 12, 1060), 200);
  assert.equal(deformationVelocity(samples, 0, 1060), 0);
  assert.equal(deformationVelocity(samples, 4, 1060), 4000 / 60);
});

test("deformationVelocity ignores samples older than the window", () => {
  const samples = [
    { value: 0, time: 1000 },
    { value: 20, time: 1200 },
  ];
  // The first sample is 300ms old; only the second remains in the window.
  assert.equal(deformationVelocity(samples, 25, 1300), 50);
  // A pause longer than the window before release reads as still.
  assert.equal(deformationVelocity(samples, 20, 1200 + VELOCITY_WINDOW + 1), 0);
  assert.equal(deformationVelocity([], 5, 1000), 0);
  assert.equal(deformationVelocity([{ value: 1, time: 1000 }], 5, 1000), 0);
});

test("a pause shorter than the window dilutes the velocity", () => {
  const moving = [
    { value: 0, time: 1000 },
    { value: 10, time: 1050 },
  ];
  assert.equal(deformationVelocity(moving, 10, 1050), 200);
  assert.equal(deformationVelocity(moving, 10, 1100), 100);
});

test("trimSamples keeps only what the window can use", () => {
  const samples = [
    { value: 0, time: 1000 },
    { value: 1, time: 1110 },
    { value: 2, time: 1150 },
  ];
  assert.deepEqual(trimSamples(samples, 1200), [
    { value: 1, time: 1110 },
    { value: 2, time: 1150 },
  ]);
});
