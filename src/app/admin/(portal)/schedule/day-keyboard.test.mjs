import assert from "node:assert/strict";
import test from "node:test";

import { moveFor, nextCell } from "./day-keyboard.ts";

/* Three providers. Lane 0: 8–9, 9–10, 13–14. Lane 1: 9–10, 14–15. Lane 2:
   11–12. In reading order, by top then lane. */
const cells = [
  { top: 0, height: 60, lane: 0 },
  { top: 60, height: 60, lane: 0 },
  { top: 60, height: 60, lane: 1 },
  { top: 180, height: 60, lane: 2 },
  { top: 300, height: 60, lane: 0 },
  { top: 360, height: 60, lane: 1 },
];

test("up and down stay with one provider", () => {
  assert.equal(nextCell(cells, 0, "down"), 1);
  assert.equal(nextCell(cells, 1, "down"), 4);
  assert.equal(nextCell(cells, 4, "down"), 4);
  assert.equal(nextCell(cells, 4, "up"), 1);
  assert.equal(nextCell(cells, 0, "up"), 0);
});

test("left and right keep the time and change provider", () => {
  assert.equal(nextCell(cells, 1, "right"), 2);
  assert.equal(nextCell(cells, 2, "left"), 1);
  assert.equal(nextCell(cells, 0, "right"), 2);
  assert.equal(nextCell(cells, 4, "right"), 5);
  assert.equal(nextCell(cells, 2, "right"), 3);
  assert.equal(nextCell(cells, 3, "right"), 3);
  assert.equal(nextCell(cells, 0, "left"), 0);
});

test("a provider with nothing that day is stepped over", () => {
  const sparse = [
    { top: 0, height: 60, lane: 0 },
    { top: 0, height: 60, lane: 2 },
  ];
  assert.equal(nextCell(sparse, 0, "right"), 1);
  assert.equal(nextCell(sparse, 1, "left"), 0);
});

test("only arrows move", () => {
  assert.equal(moveFor("ArrowUp"), "up");
  assert.equal(moveFor("ArrowRight"), "right");
  assert.equal(moveFor("Enter"), null);
});
