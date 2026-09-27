import assert from "node:assert/strict";
import test from "node:test";

import { contactCompletionInputSchema, CONTACT_COMPLETION_RESULTS } from "./contact-completion.ts";
import { legalActionsFor } from "./contracts.ts";
import { decide } from "./machine.ts";

const now = new Date("2026-09-06T16:00:00.000Z");
const base = {
  state: "new",
  version: 11,
  callAgainAt: null,
  bookingConfirmedAt: null,
  appointmentAt: null,
  closedAt: null,
  closureReason: null,
  legacyReviewRequired: false,
};

test("No call finishes every contact result from New or Contacted and Undo restores the whole decision", () => {
  for (const state of ["new", "contacted"]) {
    const before = {
      ...base,
      state,
      callAgainAt: state === "contacted" ? "2026-09-07T13:00:00.000Z" : null,
    };
    assert.equal(legalActionsFor(state).recordContactAndClose, true);
    for (const outcome of CONTACT_COMPLETION_RESULTS) {
      const completed = decide(before, { kind: "record_contact_and_close", outcome }, now);
      assert.equal(completed.accepted, true);
      assert.deepEqual(completed.next, {
        ...base,
        state: "closed",
        version: 12,
        closedAt: now.toISOString(),
        closureReason: "no_further_contact",
      });
      assert.deepEqual(completed.facts, [
        { type: "ContactAttemptRecorded", code: outcome },
        { type: "AppointmentRequestClosed", code: "no_further_contact" },
      ]);
      const { version: _version, ...restore } = before;
      const undone = decide(completed.next, { kind: "undo_latest_transition", restore }, now);
      assert.equal(undone.accepted, true);
      assert.deepEqual(undone.next, { ...before, version: 13 });
    }
  }
});

test("finishing contact cannot rewrite a Scheduled, Closed, or legacy-review request", () => {
  for (const before of [
    { ...base, state: "booked", bookingConfirmedAt: now.toISOString() },
    { ...base, state: "closed", closedAt: now.toISOString(), closureReason: "not_actionable" },
    { ...base, state: "closed", legacyReviewRequired: true },
  ]) {
    assert.equal(legalActionsFor(before.state, before).recordContactAndClose, false);
    assert.deepEqual(
      decide(before, { kind: "record_contact_and_close", outcome: "reached" }, now),
      {
        accepted: false,
        code: "illegal_transition",
        facts: [],
      },
    );
  }
});

test("contact completion needs a real contact result and cannot be smuggled into an ordinary close", () => {
  for (const outcome of [undefined, null, "", "reached_follow_up", "booked", "no_answer "]) {
    const result = decide(base, { kind: "record_contact_and_close", outcome }, now);
    assert.equal(result.accepted, false);
    assert.equal(result.code, "invalid_command");
  }
  for (const state of ["new", "contacted"]) {
    const result = decide(
      { ...base, state },
      { kind: "close_request", reason: "no_further_contact" },
      now,
    );
    assert.equal(result.accepted, false);
    assert.equal(result.code, "invalid_command");
  }
});

test("the finish input rejects missing, malformed, and contradictory intent before a save", () => {
  const valid = {
    requestId: "a208ef1e-8e45-4339-a907-0e6b74d46240",
    expectedVersion: 11,
    idempotencyKey: "ad90a8e2-fae1-41ed-9644-a5c67917e4cc",
    outcome: "reached",
  };
  assert.deepEqual(contactCompletionInputSchema.parse(valid), valid);
  for (const invalid of [
    null,
    {},
    { ...valid, requestId: "another-patient" },
    { ...valid, expectedVersion: 0 },
    { ...valid, expectedVersion: 1.5 },
    { ...valid, expectedVersion: Number.MAX_SAFE_INTEGER + 1 },
    { ...valid, idempotencyKey: "" },
    { ...valid, outcome: undefined },
    { ...valid, outcome: "reached_follow_up" },
    { ...valid, callAgain: null },
    { ...valid, callAgain: { kind: "tomorrow_morning" } },
    { ...valid, note: "x".repeat(2001) },
    { ...valid, note: " not trimmed " },
  ]) {
    assert.equal(contactCompletionInputSchema.safeParse(invalid).success, false);
  }
});
