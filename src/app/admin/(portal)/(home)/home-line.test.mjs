import assert from "node:assert/strict";
import test from "node:test";

import { datePresets, filterByKey } from "@/lib/portal/filters";

import { suggestFilters, suggestionId, SUGGESTION_LIMIT, withSuggestion } from "./home-line.ts";

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

test("the job leads: unworked first, the pile already called second, each with its count", () => {
  const lines = [
    line({ status: "new" }),
    line({ status: "new" }),
    line({ status: "contacted", bucket: "follow_up" }),
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

test("the active pill is never also a ghost, and a same-dimension ghost counts as a replacement", () => {
  const lines = [
    line({ status: "new" }),
    line({ status: "contacted", bucket: "follow_up" }),
    line({ status: "contacted", bucket: "follow_up" }),
  ];
  const active = [{ key: "status", raw: "new" }];
  const suggestions = suggestFilters(lines, active, NOW);
  assert.ok(!ids(suggestions).includes("status:new"));
  const contacted = suggestions.find(
    (suggestion) => suggestionId(suggestion) === "status:contacted",
  );
  assert.equal(contacted.count, 2);
  assert.deepEqual(withSuggestion(active, contacted), [{ key: "status", raw: "contacted" }]);
});

test("a same-dimension ghost that swaps every row is offered even when the count matches", () => {
  const lines = [
    line({ status: "new" }),
    line({ status: "new" }),
    line({ status: "contacted", bucket: "follow_up" }),
    line({ status: "contacted", bucket: "follow_up" }),
  ];
  const suggestions = suggestFilters(lines, [{ key: "status", raw: "new" }], NOW);
  assert.ok(ids(suggestions).includes("status:contacted"));
});

test("a Today pill minted on an earlier render is still the Today pill: no ghost beside it", () => {
  const received = filterByKey("received");
  const earlier = datePresets(NOW - 5 * 60_000).find((preset) => preset.id === "today");
  const lines = [line(), line({ createdAtMs: NOW - 90_000 }), line({ createdAtMs: NOW - 3 * DAY })];
  const active = [{ key: "received", raw: received.encode(earlier.range) }];
  assert.ok(!keys(suggestFilters(lines, active, NOW)).includes("received"));
});

test("today's arrivals are offered when some, not all, rows arrived today", () => {
  const lines = [line(), line({ createdAtMs: NOW - 3 * DAY })];
  const today = suggestFilters(lines, [], NOW).find((suggestion) => suggestion.key === "received");
  assert.ok(today, "expected a Received ghost");
  assert.equal(today.count, 1);
  assert.ok(!keys(suggestFilters([line(), line()], [], NOW)).includes("received"));
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

test("a removed filter's ghost takes the end of the bar; the cap holds", () => {
  const lines = [
    line({ status: "new", location: "lutz" }),
    line({ status: "contacted", bucket: "follow_up", createdAtMs: NOW - 3 * DAY }),
    line({ status: "scheduled", bucket: "scheduled", location: "any" }),
  ];
  const plain = suggestFilters(lines, [], NOW);
  assert.ok(plain.length <= SUGGESTION_LIMIT);
  assert.equal(ids(plain)[0], "status:new");
  const demoted = suggestFilters(lines, [], NOW, ["status:new"]);
  assert.equal(ids(demoted).at(-1), "status:new");
  assert.deepEqual(new Set(ids(demoted)), new Set(ids(plain)));
});
