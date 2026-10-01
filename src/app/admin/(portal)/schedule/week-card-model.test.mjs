import assert from "node:assert/strict";
import test from "node:test";

import {
  cardActions,
  failureMessage,
  nextCallAgainDay,
  startClock,
  statusBadge,
} from "./week-card-model.ts";

/* Wednesday, September 16, 2026 at 11:45 EDT (-04:00). */
const observedAt = "2026-09-16T15:45:00.000Z";

function appointment(startsAt, status = "scheduled") {
  return {
    observedAt,
    id: "a1",
    version: 1,
    patientId: "p1",
    providerId: "v1",
    locationId: "l1",
    appointmentTypeId: "t1",
    sourceRequestId: null,
    startsAt,
    endsAt: new Date(Date.parse(startsAt) + 30 * 60_000).toISOString(),
    status,
    patientName: "Rosa Diaz",
    providerName: "Dr. Chang",
    locationName: "Westchase",
    appointmentTypeName: "New patient",
    patientPhone: null,
    requestVersion: null,
  };
}

test("a scheduled visit later today can be checked in, moved, or cancelled", () => {
  assert.deepEqual(cardActions(appointment("2026-09-16T18:00:00.000Z")), {
    readOnly: false,
    checkIn: true,
    reschedule: true,
    more: ["cancel"],
  });
});

test("a scheduled visit whose start has passed can also be marked no-show", () => {
  assert.deepEqual(cardActions(appointment("2026-09-16T13:00:00.000Z")).more, [
    "cancel",
    "no_show",
  ]);
});

test("a scheduled visit on a later day cannot be checked in yet", () => {
  const actions = cardActions(appointment("2026-09-18T13:00:00.000Z"));
  assert.equal(actions.checkIn, false);
  assert.equal(actions.reschedule, true);
  assert.deepEqual(actions.more, ["cancel"]);
});

test("the practice day decides today, not the UTC day", () => {
  /* 21:30 EDT on the 16th is already the 17th in UTC. */
  assert.equal(cardActions(appointment("2026-09-17T01:30:00.000Z")).checkIn, true);
});

test("a checked-in patient's visit can be completed or cancelled, not moved", () => {
  assert.deepEqual(cardActions(appointment("2026-09-16T14:00:00.000Z", "checked_in")), {
    readOnly: false,
    checkIn: false,
    reschedule: false,
    more: ["complete", "cancel"],
  });
});

test("finished visits and past days open read-only", () => {
  for (const status of ["completed", "no_show", "cancelled"]) {
    assert.equal(cardActions(appointment("2026-09-16T18:00:00.000Z", status)).readOnly, true);
  }
  assert.equal(cardActions(appointment("2026-09-15T18:00:00.000Z")).readOnly, true);
  assert.equal(cardActions(appointment("2026-09-15T18:00:00.000Z", "checked_in")).readOnly, true);
});

test("every status has a badge", () => {
  assert.deepEqual(statusBadge("scheduled"), { label: "Scheduled", variant: "settled" });
  assert.deepEqual(statusBadge("checked_in"), { label: "Checked in", variant: "current" });
  assert.deepEqual(statusBadge("no_show"), { label: "No-show", variant: "attention" });
  assert.equal(statusBadge("completed").variant, "quiet");
  assert.equal(statusBadge("cancelled").variant, "quiet");
});

test("call again lands on the next weekday", () => {
  assert.equal(nextCallAgainDay("2026-09-16"), "2026-09-17");
  assert.equal(nextCallAgainDay("2026-09-18"), "2026-09-21");
  assert.equal(nextCallAgainDay("2026-09-19"), "2026-09-21");
  assert.equal(nextCallAgainDay("2026-09-30"), "2026-10-01");
});

test("a start is sent as the practice's wall clock", () => {
  assert.equal(startClock("2026-09-16T13:30:00.000Z"), "09:30");
  assert.equal(startClock("2026-12-16T14:05:00.000Z"), "09:05");
});

test("known failures read as what happened; unknown ones ask to retry", () => {
  assert.equal(failureMessage("time_unavailable"), "That time was just taken. Pick another.");
  assert.match(failureMessage("stale_version"), /open it again/u);
  assert.equal(
    failureMessage("idempotency_conflict"),
    "The schedule couldn't save that. Try again.",
  );
});
