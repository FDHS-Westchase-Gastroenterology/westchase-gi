import assert from "node:assert/strict";
import test from "node:test";

import { legalActionsFor } from "@/lib/portal/workflow/contracts";

import { practiceLocalDay } from "../appointment-input.ts";
import {
  choiceId,
  choiceRowsFor,
  failureCopy,
  followUpChoice,
  INITIAL_PANEL,
  panelReducer,
  staleVersionCopy,
  successCopy,
} from "./workflow-panel-model.ts";

function idsFor(state, options) {
  return choiceRowsFor(legalActionsFor(state, options)).map((row) => choiceId(row.choice));
}

test("a new request offers the three contact attempts, booking, and the not-actionable close", () => {
  assert.deepEqual(idsFor("new"), [
    "attempt:reached_follow_up",
    "attempt:voicemail",
    "attempt:no_answer",
    "booked",
    "close:not_actionable",
  ]);
});

test("a contacted request also offers the won't-schedule close", () => {
  assert.deepEqual(idsFor("contacted", { callAgainAt: "2026-09-08T13:00:00.000Z" }), [
    "attempt:reached_follow_up",
    "attempt:voicemail",
    "attempt:no_answer",
    "booked",
    "close:not_actionable",
    "close:wont_schedule",
  ]);
});

test("a booked or closed request offers no outcome rows; a legacy-review row offers none either", () => {
  assert.deepEqual(idsFor("booked"), []);
  assert.deepEqual(idsFor("closed"), []);
  assert.deepEqual(idsFor("closed", { legacyReviewRequired: true }), []);
});

test("moving between contact attempts keeps the chosen return time; moving to a booking drops it", () => {
  const chosen = panelReducer(
    panelReducer(INITIAL_PANEL, { type: "select", id: "attempt:voicemail" }),
    { type: "select_follow_up", kind: "friday" },
  );
  const stillAttempt = panelReducer(chosen, { type: "select", id: "attempt:no_answer" });
  assert.equal(stillAttempt.followUpKind, "friday");
  const booking = panelReducer(chosen, { type: "select", id: "booked" });
  assert.equal(booking.followUpKind, null);
  assert.equal(booking.followUpDay, "");
});

test("a saved outcome clears the form and keeps only the success feedback", () => {
  const filled = panelReducer(panelReducer(INITIAL_PANEL, { type: "select", id: "booked" }), {
    type: "set_appointment_day",
    day: "2026-10-01",
  });
  const saved = panelReducer(filled, { type: "succeeded", text: "Saved.", closedOrBooked: true });
  assert.deepEqual(saved, {
    ...INITIAL_PANEL,
    feedback: { tone: "success", text: "Saved.", closedOrBooked: true },
  });
  const failed = panelReducer(filled, { type: "failed", text: "No." });
  assert.equal(failed.selected, "booked");
  assert.deepEqual(failed.feedback, { tone: "error", text: "No." });
});

test("success copy names the staff-facing result, never Booked", () => {
  const contacted = { state: "contacted", callAgainAt: "2026-09-08T13:00:00.000Z" };
  assert.match(
    successCopy({ kind: "attempt", outcome: "voicemail" }, contacted),
    /^Saved — marked Contacted\. It will resurface /,
  );
  assert.equal(
    successCopy(
      { kind: "attempt", outcome: "voicemail" },
      { state: "contacted", callAgainAt: null },
    ),
    "Saved — marked Contacted.",
  );
  assert.match(
    successCopy({ kind: "booked" }, { state: "booked", callAgainAt: null }),
    /Scheduled/,
  );
  assert.doesNotMatch(
    successCopy({ kind: "booked" }, { state: "booked", callAgainAt: null }),
    /Booked/,
  );
  assert.equal(
    successCopy({ kind: "reopen" }, { state: "contacted", callAgainAt: null }),
    "Reopened — back to Contacted for more work.",
  );
  assert.equal(
    successCopy({ kind: "classify" }, { state: "booked", callAgainAt: null }),
    "Record finished — marked Scheduled.",
  );
  assert.equal(
    successCopy({ kind: "undo" }, { state: "new", callAgainAt: null }),
    "Undone — this request is New again.",
  );
});

test("every fixed rejection has its own sentence and a stale version names the current state", () => {
  const codes = [
    "invalid_command",
    "not_found",
    "idempotency_conflict",
    "undo_unavailable",
    "unauthorized",
    "unavailable",
  ];
  const sentences = new Set(codes.map((code) => failureCopy(code)));
  assert.equal(sentences.size, codes.length);
  assert.match(staleVersionCopy({ state: "booked" }), /currently Scheduled\./);
  assert.match(staleVersionCopy(undefined), /currently changed\./);
});

test("a call-again choice is complete only when its chip, and its day if custom, are valid", () => {
  assert.equal(followUpChoice(null, ""), undefined);
  assert.deepEqual(followUpChoice("tomorrow_morning", ""), { kind: "tomorrow_morning" });
  assert.equal(followUpChoice("day", ""), undefined);
  assert.equal(followUpChoice("day", "2020-01-01"), undefined);
  const today = practiceLocalDay(0);
  assert.deepEqual(followUpChoice("day", today), { kind: "day", date: today });
});

test("a rejection code this build does not know reads as the ambiguous-save sentence", () => {
  assert.equal(failureCopy("rejection_from_a_newer_deploy"), failureCopy("unavailable"));
});
