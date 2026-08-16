import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import { pathToFileURL } from "node:url";

// Request-window uses extensionless relative imports (type-only from
// Contracts, the page size from request-query); Node's test runner needs a
// Resolve hook, matching its sibling suites.
register(
  `data:text/javascript,${encodeURIComponent(`
    export async function resolve(specifier, context, nextResolve) {
      if (
        (specifier.startsWith("./") || specifier.startsWith("../")) &&
        !/\\.(?:[cm]?[jt]s|json|mjs|cjs|tsx|jsx)$/.test(specifier)
      ) {
        try {
          return await nextResolve(specifier + ".ts", context);
        } catch {
          // fall through
        }
      }
      return nextResolve(specifier, context);
    }
  `)}`,
  pathToFileURL("./"),
);

const { requestPageWindow } = await import("./request-window.ts");

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
      closedCount: 30,
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
      closedCount: 30,
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
      closedCount: 20,
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
      closedCount: 120,
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
      closedCount: 0,
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
      closedCount: 5,
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
      closedCount: 999,
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
      closedCount: 10,
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
    closedCount: 5,
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
    closedCount: 0,
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
