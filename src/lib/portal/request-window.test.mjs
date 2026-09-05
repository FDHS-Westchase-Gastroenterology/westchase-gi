import assert from "node:assert/strict";
import test from "node:test";

import { requestPageWindow } from "./request-window.ts";

// REQUEST_PAGE_SIZE is 50, so page N starts at row (N - 1) * 50.
const counts = (open) => ({
  new: 0,
  contacted: 0,
  scheduled: 0,
  closed: 0,
  ...open,
});

// Each case pins the whole window object: the open-slice range, the
// Closed-tail range, the display totals, and the redirect target. Drift in
// Any of them fails here before it reaches the queue.
const cases = [
  {
    name: "the first page is all open rows when the open set fills it",
    input: {
      filter: "all",
      page: 1,
      counts: counts({ new: 40, contacted: 25, scheduled: 5, closed: 30 }),
      openRows: 70,
    },
    expected: {
      filteredTotal: 100,
      totalPages: 2,
      redirectPage: null,
      openFrom: 0,
      openTo: 50,
      closedFrom: 0,
      closedLimit: 0,
      firstShown: 1,
      lastShown: 50,
    },
  },
  {
    name: "a page spanning the open/closed junction mixes both slices",
    input: {
      filter: "all",
      page: 2,
      counts: counts({ new: 40, contacted: 25, scheduled: 5, closed: 30 }),
      openRows: 70,
    },
    expected: {
      filteredTotal: 100,
      totalPages: 2,
      redirectPage: null,
      openFrom: 50,
      openTo: 70,
      closedFrom: 0,
      closedLimit: 30,
      firstShown: 51,
      lastShown: 100,
    },
  },
  {
    name: "a sub-page queue shows the whole open set then the tail on page one",
    input: {
      filter: "all",
      page: 1,
      counts: counts({ new: 10, closed: 20 }),
      openRows: 10,
    },
    expected: {
      filteredTotal: 30,
      totalPages: 1,
      redirectPage: null,
      openFrom: 0,
      openTo: 10,
      closedFrom: 0,
      closedLimit: 40,
      firstShown: 1,
      lastShown: 30,
    },
  },
  {
    name: "a closed-only filter reads the tail and never the open set",
    input: {
      filter: "closed",
      page: 2,
      counts: counts({ closed: 120 }),
      openRows: 0,
    },
    expected: {
      filteredTotal: 120,
      totalPages: 3,
      redirectPage: null,
      openFrom: 0,
      openTo: 0,
      closedFrom: 50,
      closedLimit: 50,
      firstShown: 51,
      lastShown: 100,
    },
  },
  {
    name: "an empty queue sits on one page showing nothing",
    input: {
      filter: "all",
      page: 1,
      counts: counts(),
      openRows: 0,
    },
    expected: {
      filteredTotal: 0,
      totalPages: 1,
      redirectPage: null,
      openFrom: 0,
      openTo: 0,
      closedFrom: 0,
      closedLimit: 0,
      firstShown: 0,
      lastShown: 0,
    },
  },
  {
    name: "the final partial page shows through the last row",
    input: {
      filter: "all",
      page: 3,
      counts: counts({ new: 100, contacted: 20, closed: 5 }),
      openRows: 120,
    },
    expected: {
      filteredTotal: 125,
      totalPages: 3,
      redirectPage: null,
      openFrom: 100,
      openTo: 120,
      closedFrom: 0,
      closedLimit: 30,
      firstShown: 101,
      lastShown: 125,
    },
  },
  {
    name: "a single open-status filter never touches the closed tail",
    input: {
      filter: "new",
      page: 2,
      counts: counts({ new: 60, closed: 999 }),
      openRows: 60,
    },
    expected: {
      filteredTotal: 60,
      totalPages: 2,
      redirectPage: null,
      openFrom: 50,
      openTo: 60,
      closedFrom: 0,
      closedLimit: 0,
      firstShown: 51,
      lastShown: 60,
    },
  },
  {
    // The open fetch caps at OPEN_CANDIDATE_LIMIT (500); the SQL counts stay
    // Exact. The window follows the capped fetch, so deep pages thin out
    // Instead of inventing rows the fetch never returned.
    name: "past the open-fetch cap the totals stay exact while the window follows the capped fetch",
    input: {
      filter: "all",
      page: 11,
      counts: counts({ new: 500, contacted: 100, closed: 10 }),
      openRows: 500,
    },
    expected: {
      filteredTotal: 610,
      totalPages: 13,
      redirectPage: null,
      openFrom: 500,
      openTo: 500,
      closedFrom: 0,
      closedLimit: 50,
      firstShown: 501,
      lastShown: 510,
    },
  },
  {
    name: "a one-row closed search shows 1–1 of 1 from the unique closed count",
    input: {
      filter: "all",
      page: 1,
      counts: counts({ closed: 1 }),
      openRows: 0,
    },
    expected: {
      filteredTotal: 1,
      totalPages: 1,
      redirectPage: null,
      openFrom: 0,
      openTo: 0,
      closedFrom: 0,
      closedLimit: 50,
      firstShown: 1,
      lastShown: 1,
    },
  },
  {
    name: "a multi-row search uses unique per-status counts for chips and range",
    input: {
      filter: "all",
      page: 1,
      counts: counts({ new: 2, closed: 1 }),
      openRows: 2,
    },
    expected: {
      filteredTotal: 3,
      totalPages: 1,
      redirectPage: null,
      openFrom: 0,
      openTo: 2,
      closedFrom: 0,
      closedLimit: 48,
      firstShown: 1,
      lastShown: 3,
    },
  },
  {
    name: "a status filter on a search uses that unique count only",
    input: {
      filter: "closed",
      page: 1,
      counts: counts({ new: 2, closed: 1 }),
      openRows: 0,
    },
    expected: {
      filteredTotal: 1,
      totalPages: 1,
      redirectPage: null,
      openFrom: 0,
      openTo: 0,
      closedFrom: 0,
      closedLimit: 50,
      firstShown: 1,
      lastShown: 1,
    },
  },
  {
    name: "51 unique rows paginate at the 50/51 boundary",
    input: {
      filter: "new",
      page: 1,
      counts: counts({ new: 51 }),
      openRows: 51,
    },
    expected: {
      filteredTotal: 51,
      totalPages: 2,
      redirectPage: null,
      openFrom: 0,
      openTo: 50,
      closedFrom: 0,
      closedLimit: 0,
      firstShown: 1,
      lastShown: 50,
    },
  },
  {
    name: "the last page of 51 unique rows is 51–51 of 51",
    input: {
      filter: "new",
      page: 2,
      counts: counts({ new: 51 }),
      openRows: 51,
    },
    expected: {
      filteredTotal: 51,
      totalPages: 2,
      redirectPage: null,
      openFrom: 50,
      openTo: 51,
      closedFrom: 0,
      closedLimit: 0,
      firstShown: 51,
      lastShown: 51,
    },
  },
];

for (const { name, input, expected } of cases) {
  test(name, () => {
    assert.deepEqual(requestPageWindow(input), expected);
  });
}

test("a requested page past the end redirects to the last page", () => {
  const window = requestPageWindow({
    filter: "all",
    page: 4,
    counts: counts({ new: 100, contacted: 20, closed: 5 }),
    openRows: 120,
  });
  assert.equal(window.redirectPage, 3);
  assert.equal(window.totalPages, 3);
  assert.equal(window.filteredTotal, 125);
});

test("a requested page past the end of an empty queue redirects to page one", () => {
  const window = requestPageWindow({
    filter: "all",
    page: 9,
    counts: counts(),
    openRows: 0,
  });
  assert.equal(window.redirectPage, 1);
});

test("the last page itself is never a redirect", () => {
  for (const { input, expected } of cases) {
    if (input.page === expected.totalPages) {
      assert.equal(
        requestPageWindow(input).redirectPage,
        null,
        `page ${input.page} of ${expected.totalPages}`,
      );
    }
  }
});

test("a page past a one-row search recovers to page one", () => {
  const window = requestPageWindow({
    filter: "all",
    page: 9,
    counts: counts({ closed: 1 }),
    openRows: 0,
  });
  assert.equal(window.redirectPage, 1);
  assert.equal(window.filteredTotal, 1);
  assert.equal(window.totalPages, 1);
});
