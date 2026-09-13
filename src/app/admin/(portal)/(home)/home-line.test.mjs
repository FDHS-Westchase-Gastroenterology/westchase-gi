import assert from "node:assert/strict";
import test from "node:test";

import { datePresets, filterByKey, filterValueLabel } from "@/lib/portal/filters";

import {
  applyFilters,
  suggestFilters,
  suggestionId,
  SUGGESTION_LIMIT,
  withSuggestion,
} from "./home-line.ts";

/* A practice-local Tuesday afternoon, 2026-09-08 15:00 New York (EDT). */
const NOW = Date.parse("2026-09-08T19:00:00Z");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

let seq = 0;
function line(overrides) {
  seq += 1;
  return {
    id: `r${seq}`,
    version: 1,
    name: `Patient ${seq}`,
    phoneDisplay: "(813) 555-0100",
    phoneDigits: "8135550100",
    tel: "tel:+18135550100",
    status: "new",
    bucket: "new",
    location: "tampa",
    createdAtMs: NOW - 2 * HOUR,
    pref: "Tampa · Morning",
    timing: "waiting 2h",
    stamp: null,
    followUp: null,
    receivedRel: "2h ago",
    receivedFull: "Sep 8",
    actorName: null,
    actorInitials: null,
    lastActivityRel: null,
    followUpSet: false,
    detailHref: `/admin/requests/r${seq}`,
    ...overrides,
  };
}

const ids = (suggestions) => suggestions.map(suggestionId);
const keys = (suggestions) => suggestions.map((suggestion) => suggestion.key);
const status = (raw) => [{ key: "status", raw }];
const callAgain = (followUp, overrides = {}) => {
  const bucket =
    followUp === "needs_date" ? "stale" : followUp === "upcoming" ? "upcoming" : "follow_up";
  return line({ status: "contacted", bucket, followUp, ...overrides });
};

test("the job leads: unworked first, the pile already called second, each with its count", () => {
  const lines = [
    line({ status: "new" }),
    line({ status: "new" }),
    callAgain("due_today"),
    line({ status: "scheduled", bucket: "scheduled", createdAtMs: NOW - 3 * DAY }),
  ];
  const [first, second] = suggestFilters(lines, [], NOW);
  assert.deepEqual([suggestionId(first), first.count], ["status:new", 2]);
  assert.deepEqual([suggestionId(second), second.count], ["status:contacted", 1]);
});

test("a ghost that would change nothing stays out: an all-new list offers no New", () => {
  const lines = [line(), line(), line()];
  assert.ok(!ids(suggestFilters(lines, [], NOW)).includes("status:new"));
});

test("a ghost that would empty the list stays out", () => {
  const lines = [line({ status: "new" }), line({ status: "scheduled", bucket: "scheduled" })];
  assert.ok(!ids(suggestFilters(lines, [], NOW)).includes("status:contacted"));
});

test("every ranked ghost narrows the visible rows: no sibling status once a status pill is up", () => {
  const lines = [line({ status: "new" }), callAgain("due_today"), callAgain("overdue")];
  for (const active of [status("new"), status("contacted"), status("new,contacted")]) {
    const suggestions = suggestFilters(lines, active, NOW);
    assert.ok(!keys(suggestions).includes("status"), `no status ghost under ${active[0].raw}`);
    const visible = applyFilters(lines, active);
    for (const ghost of suggestions) {
      assert.ok(ghost.count > 0 && ghost.count < visible.length);
    }
  }
  assert.deepEqual(withSuggestion(status("new"), { key: "status", raw: "contacted" }), [
    { key: "status", raw: "contacted" },
  ]);
});

test("the other office is a pivot, so a Location pill has no Location ghost beside it", () => {
  const lines = [
    line({ location: "tampa" }),
    line({ location: "lutz" }),
    line({ location: "lutz" }),
  ];
  assert.ok(
    !keys(suggestFilters(lines, [{ key: "location", raw: "tampa" }], NOW)).includes("location"),
  );
});

test("under Call again, the pile is cut by follow-up standing: behind first, then due, then dateless", () => {
  const lines = [
    line({ status: "new" }),
    callAgain("overdue", { createdAtMs: NOW - 3 * DAY }),
    callAgain("due_today"),
    callAgain("due_today"),
    callAgain("needs_date"),
    callAgain("upcoming"),
  ];
  const suggestions = suggestFilters(lines, status("contacted"), NOW);
  assert.deepEqual(ids(suggestions), [
    "followup:overdue",
    "followup:due_today",
    "followup:needs_date",
    "followup:upcoming",
  ]);
  assert.deepEqual(
    suggestions.map((suggestion) => suggestion.count),
    [1, 2, 1, 1],
  );
});

test("Received is arrival time: offered on the inbox, never on the Call again pile", () => {
  const lines = [
    line({ status: "new" }),
    line({ status: "new", createdAtMs: NOW - 3 * DAY }),
    callAgain("due_today"),
    callAgain("due_today", { createdAtMs: NOW - 3 * DAY }),
  ];
  assert.ok(keys(suggestFilters(lines, [], NOW)).includes("received"));
  assert.ok(keys(suggestFilters(lines, status("new"), NOW)).includes("received"));
  assert.ok(keys(suggestFilters(lines, status("new,contacted"), NOW)).includes("received"));
  assert.ok(!keys(suggestFilters(lines, status("contacted"), NOW)).includes("received"));
});

test("Follow-up is offered on the empty bar and under exactly Call again, nowhere else", () => {
  const lines = [line({ status: "new" }), callAgain("overdue"), callAgain("due_today")];
  assert.ok(ids(suggestFilters(lines, [], NOW)).includes("followup:overdue"));
  assert.ok(keys(suggestFilters(lines, status("contacted"), NOW)).includes("followup"));
  assert.ok(!keys(suggestFilters(lines, status("new,contacted"), NOW)).includes("followup"));
  assert.ok(!keys(suggestFilters(lines, status("new"), NOW)).includes("followup"));
});

test("a Today pill minted on an earlier render is still the Today pill: no ghost beside it", () => {
  const received = filterByKey("received");
  const earlier = datePresets(NOW - 5 * 60_000).find((preset) => preset.id === "today");
  const lines = [line(), line({ createdAtMs: NOW - 90_000 }), line({ createdAtMs: NOW - 3 * DAY })];
  const active = [{ key: "received", raw: received.encode(earlier.range) }];
  assert.ok(!keys(suggestFilters(lines, active, NOW)).includes("received"));
});

test("Received offers the tightest preset that still narrows: Today, else Last 7 days, else Last 30", () => {
  const received = filterByKey("received");
  const label = (suggestions) => {
    const ghost = suggestions.find((suggestion) => suggestion.key === "received");
    return ghost === undefined ? null : [filterValueLabel(received, ghost.raw, NOW), ghost.count];
  };
  assert.deepEqual(label(suggestFilters([line(), line({ createdAtMs: NOW - 3 * DAY })], [], NOW)), [
    "Today",
    1,
  ]);
  assert.deepEqual(
    label(
      suggestFilters(
        [line({ createdAtMs: NOW - 3 * DAY }), line({ createdAtMs: NOW - 20 * DAY })],
        [],
        NOW,
      ),
    ),
    ["Last 7 days", 1],
  );
  assert.deepEqual(
    label(
      suggestFilters(
        [line({ createdAtMs: NOW - 20 * DAY }), line({ createdAtMs: NOW - 60 * DAY })],
        [],
        NOW,
      ),
    ),
    ["Last 30 days", 1],
  );
  assert.equal(label(suggestFilters([line(), line()], [], NOW)), null);
});

test("the office the visible rows lean toward is offered; Either office never leads", () => {
  const lines = [
    line({ location: "lutz" }),
    line({ location: "lutz" }),
    line({ location: "tampa" }),
    line({ location: "any" }),
    line({ location: "any" }),
    line({ location: "any" }),
  ];
  const office = suggestFilters(lines, [], NOW).find((suggestion) => suggestion.key === "location");
  assert.deepEqual([office.raw, office.count], ["lutz", 2]);
});

test("an even split between offices offers no office, whichever office comes first", () => {
  const lutzFirst = [
    line({ location: "lutz" }),
    line({ location: "tampa" }),
    line({ location: "lutz" }),
    line({ location: "tampa" }),
  ];
  const tampaFirst = [...lutzFirst].reverse();
  for (const lines of [lutzFirst, tampaFirst]) {
    assert.equal(
      suggestFilters(lines, [], NOW).find((suggestion) => suggestion.key === "location"),
      undefined,
    );
  }
});

test("a removed pill is the way back: it returns at the end as a pivot, and the cap makes room", () => {
  const lines = [
    line({ status: "new", location: "lutz" }),
    line({ status: "new", createdAtMs: NOW - 3 * DAY }),
    callAgain("overdue", { createdAtMs: NOW - 3 * DAY }),
    callAgain("due_today"),
    callAgain("needs_date"),
    line({ status: "scheduled", bucket: "scheduled", location: "any" }),
  ];
  const plain = suggestFilters(lines, [], NOW);
  assert.equal(plain.length, SUGGESTION_LIMIT);
  assert.equal(ids(plain)[0], "status:new");

  /* Swapped New for Call again: New is not a refinement of the Call again
     pile, yet it comes back last because the user just had it. */
  const swapped = suggestFilters(lines, status("contacted"), NOW, status("new"));
  assert.equal(swapped.length, SUGGESTION_LIMIT);
  assert.equal(ids(swapped).at(-1), "status:new");
  assert.deepEqual(ids(swapped).slice(0, 3), [
    "followup:overdue",
    "followup:due_today",
    "followup:needs_date",
  ]);

  /* Removed New from an empty bar: same membership as the plain bar, New last. */
  const removed = suggestFilters(lines, [], NOW, status("new"));
  assert.equal(ids(removed).at(-1), "status:new");
  assert.deepEqual(new Set(ids(removed)), new Set(ids(plain)));
});
