import assert from "node:assert/strict";
import test from "node:test";
import { decide } from "./machine.ts";

const now = new Date("2026-08-06T15:00:00.000Z");
const snapshots = {
  new: { state: "new", version: 1, callAgainAt: null, bookingConfirmedAt: null, closedAt: null, closureReason: null, legacyReviewRequired: false },
  contacted: { state: "contacted", version: 1, callAgainAt: null, bookingConfirmedAt: null, closedAt: null, closureReason: null, legacyReviewRequired: false },
  booked: { state: "booked", version: 1, callAgainAt: null, bookingConfirmedAt: now.toISOString(), closedAt: null, closureReason: null, legacyReviewRequired: false },
  closed: { state: "closed", version: 1, callAgainAt: null, bookingConfirmedAt: null, closedAt: now.toISOString(), closureReason: "not_actionable", legacyReviewRequired: false },
  legacy: { state: "closed", version: 1, callAgainAt: null, bookingConfirmedAt: null, closedAt: null, closureReason: null, legacyReviewRequired: true },
};
const commands = {
  contact: { kind: "record_contact_attempt", outcome: "no_answer", callAgainAt: "2026-08-07T13:00:00.000Z" },
  booking: { kind: "confirm_booking_handoff" },
  closeNot: { kind: "close_request", reason: "not_actionable" },
  closeWont: { kind: "close_request", reason: "wont_schedule" },
  reopen: { kind: "reopen_request" },
  classify: { kind: "classify_legacy_closure", resolution: "booked" },
};
const matrix = {
  new: [true, true, true, false, false, false],
  contacted: [true, true, true, true, false, false],
  booked: [false, false, false, false, true, false],
  closed: [false, false, false, false, true, false],
  legacy: [false, false, false, false, false, true],
};

test("exhausts every state and ordinary command matrix cell", () => {
  for (const [state, expected] of Object.entries(matrix)) {
    Object.values(commands).forEach((command, index) => {
      const result = decide(snapshots[state], command, now);
      assert.equal(result.accepted, expected[index], `${state}/${command.kind}/${command.reason ?? ""}`);
      if (result.accepted) { assert.equal(result.next.version, 2); assert.equal(result.facts.length, 1); }
      else { assert.equal(result.code, "illegal_transition"); assert.deepEqual(result.facts, []); }
    });
  }
});

test("contact policy, terminal clearing, and undo snapshot invariants", () => {
  assert.equal(decide(snapshots.new, { kind: "record_contact_attempt", outcome: "voicemail", callAgainAt: null }, now).accepted, false);
  const reopened = decide(snapshots.booked, commands.reopen, now);
  assert.deepEqual(reopened.accepted && reopened.next, { ...snapshots.contacted, version: 2 });
  const undone = decide(snapshots.contacted, { kind: "undo_latest_transition", restore: { ...snapshots.new, version: undefined } }, now);
  assert.equal(undone.accepted, true);
  assert.equal(undone.accepted && undone.next.version, 2);
});
