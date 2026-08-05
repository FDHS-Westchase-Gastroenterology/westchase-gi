import assert from "node:assert/strict";
import test from "node:test";
import {
  applyUndo,
  callAgainDayInBounds,
  decideCommand,
  undoEligibility,
  UNDO_WINDOW_MS,
} from "./appointment-request-machine.ts";

// Exhaustive state × command coverage per the workflow specification §8 and
// §16.1: every cell either succeeds into the named state or rejects with the
// named typed error, and every accepted decision preserves the §7.2 shape
// invariants.

const CLOCK = { iso: "2026-08-04T15:00:00.000Z", day: "2026-08-04" };

function snapshot(state, overrides = {}) {
  return {
    state,
    version: 7,
    callAgainDay: null,
    closureReason: null,
    closedAt: null,
    bookingHandoffAt: null,
    legacyReviewRequired: false,
    ...overrides,
  };
}

const NEW = () => snapshot("NEW");
const CONTACTED = () => snapshot("CONTACTED", { callAgainDay: "2026-08-06" });
const BOOKED = () =>
  snapshot("BOOKED", { bookingHandoffAt: "2026-08-01T12:00:00.000Z" });
const CLOSED = () =>
  snapshot("CLOSED", {
    closureReason: "wont_schedule",
    closedAt: "2026-08-01T12:00:00.000Z",
  });
const LEGACY = () =>
  snapshot("CLOSED", { legacyReviewRequired: true });

const attempt = (outcome = "voicemail", callAgainDay = "2026-08-06") => ({
  kind: "record_contact_attempt",
  outcome,
  callAgainDay,
});
const scheduled = () => ({ kind: "confirm_booking_handoff" });
const close = (reason) => ({ kind: "close_request", reason });
const reopen = () => ({ kind: "reopen_request" });
const classify = (classification) => ({
  kind: "classify_legacy_closure",
  classification,
});

function expectShapeInvariants(next) {
  if (next.state !== "CONTACTED") assert.equal(next.callAgainDay, null);
  if (next.state === "NEW" || next.state === "CONTACTED") {
    assert.equal(next.closureReason, null);
    assert.equal(next.closedAt, null);
    assert.equal(next.bookingHandoffAt, null);
  }
  if (next.state === "BOOKED") {
    assert.notEqual(next.bookingHandoffAt, null);
    assert.equal(next.closureReason, null);
    assert.equal(next.closedAt, null);
  }
  if (next.state === "CLOSED" && !next.legacyReviewRequired) {
    assert.notEqual(next.closureReason, null);
    assert.notEqual(next.closedAt, null);
    assert.equal(next.bookingHandoffAt, null);
  }
}

function expectAccepted(current, command, toState) {
  const decision = decideCommand(current, command, current.version, CLOCK);
  assert.equal(decision.ok, true, `${current.state} × ${command.kind}`);
  assert.equal(decision.next.state, toState);
  assert.equal(decision.next.version, current.version + 1);
  assert.equal(decision.fact.from, current.state);
  assert.equal(decision.fact.to, toState);
  assert.equal(decision.fact.resultingVersion, decision.next.version);
  expectShapeInvariants(decision.next);
  return decision;
}

function expectRejected(current, command, error) {
  const decision = decideCommand(current, command, current.version, CLOCK);
  assert.deepEqual(
    decision,
    { ok: false, error },
    `${current.state} × ${command.kind}${"reason" in command ? `:${command.reason}` : ""}`,
  );
}

test("NEW row of the transition matrix", () => {
  expectAccepted(NEW(), attempt(), "CONTACTED");
  expectAccepted(NEW(), scheduled(), "BOOKED");
  expectAccepted(NEW(), close("not_actionable"), "CLOSED");
  expectRejected(NEW(), close("wont_schedule"), "illegal_transition");
  expectRejected(NEW(), reopen(), "illegal_transition");
  expectRejected(NEW(), classify({ kind: "booked" }), "illegal_transition");
});

test("CONTACTED row of the transition matrix", () => {
  // Legal self-transition: another attempt replaces attention data.
  const repeat = expectAccepted(CONTACTED(), attempt("no_answer", "2026-08-10"), "CONTACTED");
  assert.equal(repeat.next.callAgainDay, "2026-08-10");
  expectAccepted(CONTACTED(), scheduled(), "BOOKED");
  expectAccepted(CONTACTED(), close("not_actionable"), "CLOSED");
  expectAccepted(CONTACTED(), close("wont_schedule"), "CLOSED");
  expectRejected(CONTACTED(), reopen(), "illegal_transition");
  expectRejected(CONTACTED(), classify({ kind: "booked" }), "illegal_transition");
});

test("BOOKED row: terminal for ordinary work, reopenable", () => {
  expectRejected(BOOKED(), attempt(), "illegal_transition");
  expectRejected(BOOKED(), scheduled(), "illegal_transition");
  expectRejected(BOOKED(), close("not_actionable"), "illegal_transition");
  expectRejected(BOOKED(), close("wont_schedule"), "illegal_transition");
  const reopened = expectAccepted(BOOKED(), reopen(), "CONTACTED");
  // Reopen clears terminal data; call-again starts empty (§5.4).
  assert.equal(reopened.next.callAgainDay, null);
  assert.equal(reopened.next.bookingHandoffAt, null);
  expectRejected(BOOKED(), classify({ kind: "booked" }), "illegal_transition");
});

test("CLOSED row: terminal for ordinary work, reopenable", () => {
  expectRejected(CLOSED(), attempt(), "illegal_transition");
  expectRejected(CLOSED(), scheduled(), "illegal_transition");
  expectRejected(CLOSED(), close("not_actionable"), "illegal_transition");
  expectRejected(CLOSED(), close("wont_schedule"), "illegal_transition");
  const reopened = expectAccepted(CLOSED(), reopen(), "CONTACTED");
  assert.equal(reopened.next.closureReason, null);
  assert.equal(reopened.next.closedAt, null);
  expectRejected(CLOSED(), classify({ kind: "booked" }), "illegal_transition");
});

test("CLOSED + legacy review row: only classification proceeds", () => {
  expectRejected(LEGACY(), attempt(), "illegal_transition");
  expectRejected(LEGACY(), scheduled(), "illegal_transition");
  expectRejected(LEGACY(), close("not_actionable"), "illegal_transition");
  expectRejected(LEGACY(), close("wont_schedule"), "illegal_transition");
  expectRejected(LEGACY(), reopen(), "illegal_transition");

  const booked = expectAccepted(LEGACY(), classify({ kind: "booked" }), "BOOKED");
  assert.equal(booked.next.legacyReviewRequired, false);
  // Retention starts no earlier than the review — handoff time is the review time.
  assert.equal(booked.next.bookingHandoffAt, CLOCK.iso);

  const unbooked = expectAccepted(
    LEGACY(),
    classify({ kind: "unbooked", reason: "not_actionable" }),
    "CLOSED",
  );
  assert.equal(unbooked.next.legacyReviewRequired, false);
  assert.equal(unbooked.next.closureReason, "not_actionable");
});

test("call-again payload policy (§5.1)", () => {
  // voicemail and no_answer require a call-again day.
  expectRejected(NEW(), attempt("voicemail", null), "invalid_command");
  expectRejected(NEW(), attempt("no_answer", null), "invalid_command");
  // reached_follow_up may omit it.
  const optional = expectAccepted(NEW(), attempt("reached_follow_up", null), "CONTACTED");
  assert.equal(optional.next.callAgainDay, null);
  // Out-of-bounds days reject: past, and beyond 90 days.
  expectRejected(NEW(), attempt("voicemail", "2026-08-03"), "invalid_command");
  expectRejected(NEW(), attempt("voicemail", "2026-11-03"), "invalid_command");
  // Today and the 90-day boundary are accepted.
  expectAccepted(NEW(), attempt("voicemail", "2026-08-04"), "CONTACTED");
  expectAccepted(NEW(), attempt("voicemail", "2026-11-02"), "CONTACTED");
});

test("call-again bounds helper is DST-safe and format-strict", () => {
  assert.equal(callAgainDayInBounds("2026-08-04", "2026-08-04"), true);
  assert.equal(callAgainDayInBounds("2026-11-02", "2026-08-04"), true); // 90 days across DST
  assert.equal(callAgainDayInBounds("2026-11-03", "2026-08-04"), false);
  assert.equal(callAgainDayInBounds("08/04/2026", "2026-08-04"), false);
});

test("stale version rejects every command without writes", () => {
  for (const command of [
    attempt(),
    scheduled(),
    close("not_actionable"),
    reopen(),
    classify({ kind: "booked" }),
  ]) {
    const current = command.kind === "reopen_request" ? BOOKED() : NEW();
    const decision = decideCommand(current, command, current.version - 1, CLOCK);
    assert.deepEqual(decision, { ok: false, error: "stale_version" });
  }
});

test("undo eligibility: latest, version-matched, inside the 15-minute window", () => {
  const fact = {
    from: "NEW",
    to: "CONTACTED",
    command: "record_contact_attempt",
    code: "voicemail",
    resultingVersion: 8,
    occurredAt: "2026-08-04T15:00:00.000Z",
  };
  const inWindow = "2026-08-04T15:14:59.000Z";
  const atBoundary = new Date(Date.parse(fact.occurredAt) + UNDO_WINDOW_MS).toISOString();
  const pastWindow = "2026-08-04T15:15:01.000Z";

  assert.deepEqual(undoEligibility(fact, 8, 8, inWindow), { eligible: true });
  // Accepted at the boundary, rejected after it (§16.1).
  assert.deepEqual(undoEligibility(fact, 8, 8, atBoundary), { eligible: true });
  assert.deepEqual(undoEligibility(fact, 8, 8, pastWindow), {
    eligible: false,
    reason: "window_closed",
  });
  // A later transition makes it not-latest.
  assert.deepEqual(undoEligibility(fact, 9, 9, inWindow), {
    eligible: false,
    reason: "not_latest",
  });
  // A later attention mutation shows as a version mismatch.
  assert.deepEqual(undoEligibility(fact, 8, 9, inWindow), {
    eligible: false,
    reason: "stale_version",
  });
  // Legacy classification is never staff-reversible.
  assert.deepEqual(
    undoEligibility({ ...fact, command: "classify_legacy_closure" }, 8, 8, inWindow),
    { eligible: false, reason: "not_reversible" },
  );
});

test("applyUndo restores the exact prior snapshot and advances version", () => {
  const prior = NEW();
  const decision = decideCommand(prior, scheduled(), prior.version, CLOCK);
  assert.equal(decision.ok, true);

  const undone = applyUndo(decision.next, decision.fact, prior, {
    iso: "2026-08-04T15:05:00.000Z",
    day: "2026-08-04",
  });
  assert.equal(undone.next.state, "NEW");
  assert.equal(undone.next.callAgainDay, prior.callAgainDay);
  assert.equal(undone.next.bookingHandoffAt, null);
  // Version advances again rather than moving backward (§5.5).
  assert.equal(undone.next.version, decision.next.version + 1);
  assert.equal(undone.fact.command, "undo_latest_transition");
  assert.equal(undone.fact.compensatesVersion, decision.fact.resultingVersion);
});

test("the Scheduled action maps to BOOKED and never emits a SCHEDULED state", () => {
  const decision = decideCommand(NEW(), scheduled(), 7, CLOCK);
  assert.equal(decision.ok, true);
  assert.equal(decision.next.state, "BOOKED");
  assert.notEqual(decision.next.state, "SCHEDULED");
});
