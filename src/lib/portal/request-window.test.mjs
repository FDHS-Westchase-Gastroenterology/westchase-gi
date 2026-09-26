import assert from "node:assert/strict";
import test from "node:test";

import { requestPageWindow } from "./request-window.ts";

// Independent examples at the 50-row boundary and on deep/partial pages.
for (const [name, page, total, pages, first, last] of [
  ["an empty queue shows nothing on its single page", 1, 0, 1, 0, 0],
  ["a one-row search shows 1–1 of 1", 1, 1, 1, 1, 1],
  ["a partial first page shows every matching row", 1, 30, 1, 1, 30],
  ["exactly 50 matches fit on one page", 1, 50, 1, 1, 50],
  ["51 matches require a second page", 1, 51, 2, 1, 50],
  ["the final match of 51 stands alone", 2, 51, 2, 51, 51],
  ["a full final page needs no redirect", 2, 100, 2, 51, 100],
  ["a partial final page ends at the matching total", 3, 125, 3, 101, 125],
  ["page eleven still shows complete worklist positions", 11, 610, 13, 501, 550],
  ["the final deep page shows its remaining matches", 13, 610, 13, 601, 610],
]) {
  test(name, () => {
    assert.deepEqual(requestPageWindow(page, total), {
      filteredTotal: total,
      totalPages: pages,
      redirectPage: null,
      firstShown: first,
      lastShown: last,
    });
  });
}

for (const [name, page, total, destination] of [
  ["past a partial final page", 4, 125, 3],
  ["past an empty queue", 9, 0, 1],
  ["past a one-row search", 9, 1, 1],
  ["past an exactly full final page", 3, 100, 2],
]) {
  test(`${name} redirects to the last available page`, () => {
    assert.equal(requestPageWindow(page, total).redirectPage, destination);
  });
}
