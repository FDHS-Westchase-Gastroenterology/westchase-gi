import assert from "node:assert/strict";
import test from "node:test";

import { orderQueueRows } from "./queue-attention.ts";

// Tue 2026-07-28 09:00 ET — boundary is Mon 2026-07-27 08:00 ET.
const NOW = new Date("2026-07-28T13:00:00Z");
const BOUNDARY = "2026-07-27T12:00:00.000Z"; // Mon 08:00 ET

function row(partial) {
  return {
    id: partial.id,
    status: partial.status,
    created_at: partial.created_at,
    follow_up_at: partial.follow_up_at ?? null,
  };
}

test("assigns each of the six attention buckets", () => {
  const rows = [
    row({
      id: "new-1",
      status: "new",
      created_at: "2026-07-28T10:00:00.000Z",
      follow_up_at: "2026-07-20T12:00:00.000Z", // Ignored on non-contacted
    }),
    row({
      id: "fu-1",
      status: "contacted",
      created_at: "2026-07-20T10:00:00.000Z",
      follow_up_at: "2026-07-28T13:00:00.000Z", // Due today
    }),
    row({
      id: "stale-1",
      status: "contacted",
      created_at: "2026-07-20T10:00:00.000Z",
      follow_up_at: null,
    }),
    row({
      id: "up-1",
      status: "contacted",
      created_at: "2026-07-21T10:00:00.000Z",
      follow_up_at: "2026-07-29T13:00:00.000Z", // Tomorrow
    }),
    row({
      id: "sched-1",
      status: "scheduled",
      created_at: "2026-07-22T10:00:00.000Z",
    }),
    row({
      id: "closed-1",
      status: "closed",
      created_at: "2026-07-23T10:00:00.000Z",
    }),
  ];
  const activity = new Map([
    ["stale-1", "2026-07-24T15:00:00.000Z"], // Fri — before boundary
    ["up-1", "2026-07-28T12:30:00.000Z"], // Worked this morning
  ]);

  const ordered = orderQueueRows(rows, activity, NOW);
  assert.deepEqual(
    ordered.map((r) => [r.id, r.bucket]),
    [
      ["new-1", "new"],
      ["fu-1", "follow_up"],
      ["stale-1", "stale"],
      ["up-1", "upcoming"],
      ["sched-1", "scheduled"],
      ["closed-1", "closed"],
    ],
  );
  assert.equal(ordered.find((r) => r.id === "stale-1").lastActivityAt, "2026-07-24T15:00:00.000Z");
  assert.equal(ordered.find((r) => r.id === "new-1").lastActivityAt, null);
});

test("stale boundary: worked this morning is not stale; before boundary is", () => {
  const rows = [
    row({
      id: "this-morning",
      status: "contacted",
      created_at: "2026-07-20T10:00:00.000Z",
    }),
    row({
      id: "before-boundary",
      status: "contacted",
      created_at: "2026-07-20T10:00:00.000Z",
    }),
    row({
      id: "at-boundary",
      status: "contacted",
      created_at: "2026-07-20T10:00:00.000Z",
    }),
  ];
  const activity = new Map([
    ["this-morning", "2026-07-28T12:30:00.000Z"], // Tue 08:30 ET
    ["before-boundary", "2026-07-27T11:59:00.000Z"], // Mon 07:59 ET
    ["at-boundary", BOUNDARY], // Mon 08:00 ET — not strictly before
  ]);

  const ordered = orderQueueRows(rows, activity, NOW);
  const byId = Object.fromEntries(ordered.map((r) => [r.id, r.bucket]));
  assert.equal(byId["this-morning"], "upcoming");
  assert.equal(byId["before-boundary"], "stale");
  assert.equal(byId["at-boundary"], "upcoming");
});

test("follow_up_at is ignored on non-contacted rows", () => {
  const rows = [
    row({
      id: "new-with-fu",
      status: "new",
      created_at: "2026-07-28T10:00:00.000Z",
      follow_up_at: "2026-07-01T12:00:00.000Z",
    }),
    row({
      id: "sched-with-fu",
      status: "scheduled",
      created_at: "2026-07-28T09:00:00.000Z",
      follow_up_at: "2026-07-01T12:00:00.000Z",
    }),
    row({
      id: "closed-with-fu",
      status: "closed",
      created_at: "2026-07-28T08:00:00.000Z",
      follow_up_at: "2026-07-01T12:00:00.000Z",
    }),
  ];

  const ordered = orderQueueRows(rows, new Map(), NOW);
  assert.deepEqual(
    ordered.map((r) => [r.id, r.bucket]),
    [
      ["new-with-fu", "new"],
      ["sched-with-fu", "scheduled"],
      ["closed-with-fu", "closed"],
    ],
  );
});

test("orders a mixed list by bucket then within-bucket rules", () => {
  const rows = [
    row({ id: "closed-new", status: "closed", created_at: "2026-07-28T12:00:00.000Z" }),
    row({ id: "closed-old", status: "closed", created_at: "2026-07-20T12:00:00.000Z" }),
    row({ id: "sched-new", status: "scheduled", created_at: "2026-07-28T11:00:00.000Z" }),
    row({ id: "sched-old", status: "scheduled", created_at: "2026-07-21T11:00:00.000Z" }),
    row({
      id: "up-future-late",
      status: "contacted",
      created_at: "2026-07-10T10:00:00.000Z",
      follow_up_at: "2026-07-30T13:00:00.000Z",
    }),
    row({
      id: "up-future-early",
      status: "contacted",
      created_at: "2026-07-11T10:00:00.000Z",
      follow_up_at: "2026-07-29T13:00:00.000Z",
    }),
    row({
      id: "up-silent-fresh",
      status: "contacted",
      created_at: "2026-07-27T18:00:00.000Z",
      follow_up_at: null,
    }),
    row({
      id: "stale-older",
      status: "contacted",
      created_at: "2026-07-15T10:00:00.000Z",
      follow_up_at: null,
    }),
    row({
      id: "stale-newer",
      status: "contacted",
      created_at: "2026-07-16T10:00:00.000Z",
      follow_up_at: null,
    }),
    row({
      id: "fu-later",
      status: "contacted",
      created_at: "2026-07-18T10:00:00.000Z",
      follow_up_at: "2026-07-28T17:00:00.000Z",
    }),
    row({
      id: "fu-earlier",
      status: "contacted",
      created_at: "2026-07-19T10:00:00.000Z",
      follow_up_at: "2026-07-27T13:00:00.000Z",
    }),
    row({ id: "new-older", status: "new", created_at: "2026-07-26T10:00:00.000Z" }),
    row({ id: "new-newer", status: "new", created_at: "2026-07-27T10:00:00.000Z" }),
  ];
  const activity = new Map([
    ["stale-older", "2026-07-24T12:00:00.000Z"],
    ["stale-newer", "2026-07-25T12:00:00.000Z"],
    ["up-silent-fresh", "2026-07-28T12:15:00.000Z"],
  ]);

  const ordered = orderQueueRows(rows, activity, NOW);
  assert.deepEqual(
    ordered.map((r) => r.id),
    [
      "new-older",
      "new-newer",
      "fu-earlier",
      "fu-later",
      "stale-older",
      "stale-newer",
      "up-future-early",
      "up-future-late",
      "up-silent-fresh", // Null follow-up last among upcoming
      "sched-new",
      "sched-old",
      "closed-new",
      "closed-old",
    ],
  );
});

test("does not mutate the input array", () => {
  const rows = [
    row({ id: "b", status: "new", created_at: "2026-07-28T10:00:00.000Z" }),
    row({ id: "a", status: "new", created_at: "2026-07-27T10:00:00.000Z" }),
  ];
  const snapshot = structuredClone(rows);
  const ordered = orderQueueRows(rows, new Map(), NOW);
  assert.deepEqual(rows, snapshot);
  assert.notEqual(ordered, rows);
  assert.deepEqual(
    ordered.map((r) => r.id),
    ["a", "b"],
  );
});

test("untouched contacted row falls back to created_at for staleness", () => {
  const rows = [
    row({
      id: "never-touched-stale",
      status: "contacted",
      created_at: "2026-07-20T10:00:00.000Z",
    }),
    row({
      id: "never-touched-fresh",
      status: "contacted",
      created_at: "2026-07-28T12:30:00.000Z",
    }),
  ];
  const ordered = orderQueueRows(rows, new Map(), NOW);
  const byId = Object.fromEntries(ordered.map((r) => [r.id, r.bucket]));
  assert.equal(byId["never-touched-stale"], "stale");
  assert.equal(byId["never-touched-fresh"], "upcoming");
});
