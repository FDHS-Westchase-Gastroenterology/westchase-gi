import assert from "node:assert/strict";
import test from "node:test";

import { decide } from "./machine.ts";

const now = new Date("2026-08-06T15:00:00.000Z");
const callAgainAt = "2026-08-07T13:00:00.000Z";
const snapshots = {
  new: {
    state: "new",
    version: 1,
    callAgainAt: null,
    bookingConfirmedAt: null,
    closedAt: null,
    closureReason: null,
    legacyReviewRequired: false,
  },
  contacted: {
    state: "contacted",
    version: 1,
    callAgainAt: null,
    bookingConfirmedAt: null,
    closedAt: null,
    closureReason: null,
    legacyReviewRequired: false,
  },
  booked: {
    state: "booked",
    version: 1,
    callAgainAt: null,
    bookingConfirmedAt: now.toISOString(),
    closedAt: null,
    closureReason: null,
    legacyReviewRequired: false,
  },
  closed: {
    state: "closed",
    version: 1,
    callAgainAt: null,
    bookingConfirmedAt: null,
    closedAt: now.toISOString(),
    closureReason: "not_actionable",
    legacyReviewRequired: false,
  },
  legacy: {
    state: "closed",
    version: 1,
    callAgainAt: null,
    bookingConfirmedAt: null,
    closedAt: null,
    closureReason: null,
    legacyReviewRequired: true,
  },
};
const commands = {
  contact: {
    kind: "record_contact_attempt",
    outcome: "no_answer",
    callAgainAt,
  },
  booking: { kind: "confirm_booking_handoff" },
  closeNot: { kind: "close_request", reason: "not_actionable" },
  closeWont: { kind: "close_request", reason: "wont_schedule" },
  reopen: { kind: "reopen_request", callAgainAt },
  setCallAgain: { kind: "set_call_again", callAgainAt },
  classify: { kind: "classify_legacy_closure", resolution: "booked" },
};
const matrix = {
  new: [true, true, true, false, false, false, false],
  contacted: [true, true, true, true, false, true, false],
  booked: [false, false, false, false, true, false, false],
  closed: [false, false, false, false, true, false, false],
  legacy: [false, false, false, false, false, false, true],
};

test("exhausts every state and ordinary command matrix cell", () => {
  for (const [state, expected] of Object.entries(matrix)) {
    Object.values(commands).forEach((command, index) => {
      const result = decide(snapshots[state], command, now);
      assert.equal(
        result.accepted,
        expected[index],
        `${state}/${command.kind}/${command.reason ?? ""}`,
      );
      if (result.accepted) {
        assert.equal(result.next.version, 2);
        assert.equal(result.facts.length, 1);
      } else {
        assert.equal(result.code, "illegal_transition");
        assert.deepEqual(result.facts, []);
      }
    });
  }
});

test("every Contacted-producing command requires a concrete call-again time", () => {
  for (const outcome of ["reached_follow_up", "voicemail", "no_answer"]) {
    const missing = decide(
      snapshots.new,
      { kind: "record_contact_attempt", outcome, callAgainAt: null },
      now,
    );
    assert.equal(missing.accepted, false);
    assert.equal(missing.code, "invalid_command");

    const accepted = decide(
      snapshots.new,
      { kind: "record_contact_attempt", outcome, callAgainAt },
      now,
    );
    assert.equal(accepted.accepted, true);
    assert.equal(accepted.accepted && accepted.next.callAgainAt, callAgainAt);
  }

  const missingReopen = decide(
    snapshots.booked,
    { kind: "reopen_request", callAgainAt: null },
    now,
  );
  assert.equal(missingReopen.accepted, false);
  assert.equal(missingReopen.code, "invalid_command");

  for (const invalid of [
    "",
    "2026-08-07",
    "2026-02-30T09:00:00.000Z",
    " 2026-08-07T13:00:00.000Z",
  ]) {
    const malformed = decide(
      snapshots.new,
      { kind: "record_contact_attempt", outcome: "reached_follow_up", callAgainAt: invalid },
      now,
    );
    assert.equal(malformed.accepted, false, invalid);
    assert.equal(malformed.code, "invalid_command", invalid);
  }
});

test("reopen, legacy correction, terminal clearing, and undo preserve exact snapshots", () => {
  const reopened = decide(snapshots.booked, commands.reopen, now);
  assert.deepEqual(reopened.accepted && reopened.next, {
    ...snapshots.contacted,
    version: 2,
    callAgainAt,
  });

  const corrected = decide(snapshots.contacted, commands.setCallAgain, now);
  assert.equal(corrected.accepted, true);
  assert.equal(corrected.accepted && corrected.next.callAgainAt, callAgainAt);
  const alreadyDated = decide({ ...snapshots.contacted, callAgainAt }, commands.setCallAgain, now);
  assert.equal(alreadyDated.accepted, false);
  assert.equal(alreadyDated.code, "illegal_transition");

  const undone = decide(
    snapshots.contacted,
    { kind: "undo_latest_transition", restore: { ...snapshots.new, version: undefined } },
    now,
  );
  assert.equal(undone.accepted, true);
  assert.equal(undone.accepted && undone.next.version, 2);

  const restoredClosed = decide(
    { ...snapshots.contacted, version: 8, callAgainAt },
    {
      kind: "undo_latest_transition",
      restore: {
        state: snapshots.closed.state,
        callAgainAt: snapshots.closed.callAgainAt,
        bookingConfirmedAt: snapshots.closed.bookingConfirmedAt,
        closedAt: snapshots.closed.closedAt,
        closureReason: snapshots.closed.closureReason,
        legacyReviewRequired: snapshots.closed.legacyReviewRequired,
      },
    },
    now,
  );
  assert.deepEqual(restoredClosed.accepted && restoredClosed.next, {
    ...snapshots.closed,
    version: 9,
  });

  const restoredMigratedClosed = decide(
    { ...snapshots.contacted, version: 9, callAgainAt },
    {
      kind: "undo_latest_transition",
      restore: { ...snapshots.closed, closureReason: null, version: undefined },
    },
    now,
  );
  assert.deepEqual(restoredMigratedClosed.accepted && restoredMigratedClosed.next, {
    ...snapshots.closed,
    version: 10,
    closureReason: null,
  });
});
