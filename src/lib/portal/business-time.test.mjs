import assert from "node:assert/strict";
import test from "node:test";

import {
  previousBusinessMorningBoundary,
  resolveFollowUpAt,
  waitingSince,
} from "./business-time.ts";

// July dates: America/New_York is UTC-4 (EDT).

test("waiting labels follow the practice-local calendar", () => {
  const now = new Date("2026-07-26T20:00:00Z"); // Sunday 4:00 PM EDT
  assert.equal(waitingSince("2026-07-26T12:00:00Z", now), null); // Same day
  assert.equal(waitingSince("2026-07-25T23:00:00Z", now), "yesterday");
  assert.equal(waitingSince("2026-07-24T12:00:00Z", now), "Friday");
  assert.equal(waitingSince("2026-07-20T12:00:00Z", now), "Monday"); // 6 days
  assert.equal(waitingSince("2026-07-19T12:00:00Z", now), "July 19"); // 7 days
  assert.equal(waitingSince("2026-07-01T12:00:00Z", now), "July 1");
});

test("day boundaries are practice-local, not UTC", () => {
  const now = new Date("2026-07-26T20:00:00Z"); // Sunday in both UTC and NY
  // Saturday 10:00 PM EDT is already Sunday in UTC; it must read as yesterday.
  assert.equal(waitingSince("2026-07-26T02:00:00Z", now), "yesterday");
  // Sunday 00:30 EDT (04:30 UTC) is today in NY.
  assert.equal(waitingSince("2026-07-26T04:30:00Z", now), null);
});

test("resolveFollowUpAt uses EDT offsets in July", () => {
  const now = new Date("2026-07-28T15:00:00Z"); // Tue 11:00 AM EDT
  assert.equal(
    resolveFollowUpAt({ kind: "this_afternoon" }, now),
    "2026-07-28T17:00:00.000Z", // 13:00 EDT
  );
  assert.equal(
    resolveFollowUpAt({ kind: "tomorrow_morning" }, now),
    "2026-07-29T13:00:00.000Z", // Wed 09:00 EDT
  );
  assert.equal(
    resolveFollowUpAt({ kind: "friday" }, now),
    "2026-07-31T13:00:00.000Z", // Fri 09:00 EDT
  );
  assert.equal(
    resolveFollowUpAt({ kind: "day", date: "2026-08-03" }, now),
    "2026-08-03T13:00:00.000Z", // Mon 09:00 EDT
  );
});

test("resolveFollowUpAt uses EST offsets in January", () => {
  const now = new Date("2026-01-14T16:00:00Z"); // Wed 11:00 AM EST
  assert.equal(
    resolveFollowUpAt({ kind: "this_afternoon" }, now),
    "2026-01-14T18:00:00.000Z", // 13:00 EST
  );
  assert.equal(
    resolveFollowUpAt({ kind: "tomorrow_morning" }, now),
    "2026-01-15T14:00:00.000Z", // Thu 09:00 EST
  );
  assert.equal(
    resolveFollowUpAt({ kind: "friday" }, now),
    "2026-01-16T14:00:00.000Z", // Fri 09:00 EST
  );
  assert.equal(
    resolveFollowUpAt({ kind: "day", date: "2026-01-20" }, now),
    "2026-01-20T14:00:00.000Z", // Tue 09:00 EST
  );
});

test("resolveFollowUpAt friday-on-friday jumps one week", () => {
  const friday = new Date("2026-07-24T14:00:00Z"); // Fri 10:00 AM EDT
  assert.equal(resolveFollowUpAt({ kind: "friday" }, friday), "2026-07-31T13:00:00.000Z");
});

test("resolveFollowUpAt rejects past, far-future, and malformed days", () => {
  const now = new Date("2026-07-28T15:00:00Z");
  assert.equal(resolveFollowUpAt({ kind: "day", date: "2026-07-27" }, now), null);
  assert.equal(resolveFollowUpAt({ kind: "day", date: "2026-10-27" }, now), null); // 91 days
  assert.equal(
    resolveFollowUpAt({ kind: "day", date: "2026-10-26" }, now),
    "2026-10-26T13:00:00.000Z",
  ); // 90 days
  assert.equal(resolveFollowUpAt({ kind: "day", date: "2026-02-30" }, now), null);
  assert.equal(resolveFollowUpAt({ kind: "day", date: "07/29/2026" }, now), null);
  assert.equal(resolveFollowUpAt({ kind: "day", date: "not-a-date" }, now), null);
});

test("previousBusinessMorningBoundary is prior business-day 08:00 ET", () => {
  // Tue 09:00 ET → Mon 08:00 ET
  assert.equal(
    previousBusinessMorningBoundary(new Date("2026-07-28T13:00:00Z")).toISOString(),
    "2026-07-27T12:00:00.000Z",
  );
  // Tue 07:59 ET (before open) → Mon 08:00 ET
  assert.equal(
    previousBusinessMorningBoundary(new Date("2026-07-28T11:59:00Z")).toISOString(),
    "2026-07-27T12:00:00.000Z",
  );
  // Tue 08:00 ET exactly → Mon 08:00 ET (strictly before today)
  assert.equal(
    previousBusinessMorningBoundary(new Date("2026-07-28T12:00:00Z")).toISOString(),
    "2026-07-27T12:00:00.000Z",
  );
  // Mon 07:30 ET → Fri 08:00 ET
  assert.equal(
    previousBusinessMorningBoundary(new Date("2026-07-27T11:30:00Z")).toISOString(),
    "2026-07-24T12:00:00.000Z",
  );
  // Sat 12:00 ET → Fri 08:00 ET
  assert.equal(
    previousBusinessMorningBoundary(new Date("2026-07-25T16:00:00Z")).toISOString(),
    "2026-07-24T12:00:00.000Z",
  );
  // Sunday → Friday 08:00 ET
  assert.equal(
    previousBusinessMorningBoundary(new Date("2026-07-26T16:00:00Z")).toISOString(),
    "2026-07-24T12:00:00.000Z",
  );
});
