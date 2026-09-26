import assert from "node:assert/strict";
import test from "node:test";

import {
  filterByKey,
  filterValueLabel,
  isDefaultView,
  readActiveFilters,
  STATUS_DEFAULT_RAW,
  writeActiveFilters,
} from "@/lib/portal/filters";

const NOW = Date.parse("2026-09-08T19:00:00Z");
const status = filterByKey("status");
const label = (raw) => filterValueLabel(status, raw, NOW);

test("a bare URL opens on the default Status pill, first in the bar; status=any is no pill", () => {
  const opening = [{ key: "status", raw: STATUS_DEFAULT_RAW }];
  assert.deepEqual(readActiveFilters(""), opening);
  assert.deepEqual(readActiveFilters("?location=lutz"), [
    ...opening,
    { key: "location", raw: "lutz" },
  ]);
  assert.deepEqual(readActiveFilters("?status=any&location=lutz"), [
    { key: "location", raw: "lutz" },
  ]);
  assert.equal(isDefaultView(readActiveFilters("?tour=finished")), true);
  assert.equal(isDefaultView(readActiveFilters("?status=any")), false);
});

test("writing keeps the opening URL bare and spells a removed Status as status=any", () => {
  const roundTrip = (search) => writeActiveFilters(search, readActiveFilters(search));
  assert.equal(roundTrip(""), "");
  assert.equal(roundTrip("?tour=finished"), "tour=finished");
  assert.equal(roundTrip("?status=any"), "status=any");
  assert.equal(roundTrip("?location=lutz"), "location=lutz");
  assert.equal(
    writeActiveFilters("?tour=finished", [{ key: "location", raw: "lutz" }]),
    "tour=finished&location=lutz&status=any",
  );
  /* The default behind another pill keeps its place in the URL, so pill
     order survives a reload. */
  const behind = [
    { key: "location", raw: "lutz" },
    { key: "status", raw: STATUS_DEFAULT_RAW },
  ];
  assert.deepEqual(readActiveFilters(writeActiveFilters("", behind)), behind);
});

test("Call again is one word in the URL while all four standings are chosen", () => {
  assert.deepEqual(status.decode("contacted"), ["overdue", "due_today", "needs_date", "upcoming"]);
  assert.equal(
    status.encode(["upcoming", "new", "needs_date", "due_today", "overdue"]),
    "new,contacted",
  );
  assert.equal(status.encode(["due_today", "new"]), "new,due_today");
  assert.equal(status.decode("followup,nonsense"), null);
});

test("the Status pill reads by parent: Call again, a named subset, or the standings", () => {
  assert.equal(label(STATUS_DEFAULT_RAW), "New | Call again · due");
  assert.equal(label("contacted"), "Call again");
  assert.equal(label("new,contacted"), "New | Call again");
  assert.equal(label("overdue,due_today"), "Overdue | Due today");
  assert.equal(label("new,contacted,scheduled"), "3 selected");
});
