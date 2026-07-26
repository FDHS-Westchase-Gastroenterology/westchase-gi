import assert from "node:assert/strict";
import test from "node:test";
import { arrivedOutsideOfficeHours, waitingSince } from "./business-time.ts";

// July dates: America/New_York is UTC-4 (EDT).

test("office hours are Mon–Fri 8:00–17:00 practice time", () => {
  assert.equal(arrivedOutsideOfficeHours("2026-07-24T12:00:00Z"), false); // Fri 8:00 AM
  assert.equal(arrivedOutsideOfficeHours("2026-07-24T11:59:00Z"), true); // Fri 7:59 AM
  assert.equal(arrivedOutsideOfficeHours("2026-07-24T20:59:00Z"), false); // Fri 4:59 PM
  assert.equal(arrivedOutsideOfficeHours("2026-07-24T21:00:00Z"), true); // Fri 5:00 PM
  assert.equal(arrivedOutsideOfficeHours("2026-07-25T15:00:00Z"), true); // Sat 11 AM
  assert.equal(arrivedOutsideOfficeHours("2026-07-26T15:00:00Z"), true); // Sun 11 AM
});

test("waiting labels follow the practice-local calendar", () => {
  const now = new Date("2026-07-26T20:00:00Z"); // Sunday 4:00 PM EDT
  assert.equal(waitingSince("2026-07-26T12:00:00Z", now), null); // same day
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
