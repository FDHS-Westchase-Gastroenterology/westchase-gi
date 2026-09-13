import assert from "node:assert/strict";
import test from "node:test";

import { historyLine } from "./request-history.ts";

const AT = "2026-08-06T15:00:00.000Z";
const CALL_AGAIN = "2026-08-07T13:00:00.000Z";

function line(entry) {
  const rendered = historyLine(entry);
  assert.notEqual(rendered, null, `expected a history line for ${entry.kind}`);
  return rendered;
}

test("creation says who added the request", () => {
  assert.equal(
    line({ kind: "created", origin: "website", at: AT }).text,
    "Appointment request received from the website",
  );
  assert.equal(
    line({ kind: "created", origin: "staff", at: AT }).text,
    "Appointment request added by staff",
  );
});

test("a contact attempt names its outcome and its call-again day, or the missing day", () => {
  const base = { kind: "contact_attempt", id: "a", actor: "staff@example.test", at: AT };
  assert.match(
    line({ ...base, outcome: "voicemail", callAgainAt: CALL_AGAIN }).text,
    /^Left a voicemail — call again /,
  );
  assert.equal(
    line({ ...base, outcome: "no_answer", callAgainAt: null }).text,
    "No answer — no call-again day was set",
  );
});

test("notes and the contact attempt's own self-transition render elsewhere, not in history", () => {
  assert.equal(
    historyLine({ kind: "note", id: "n", text: "x", actor: "staff@example.test", at: AT }),
    null,
  );
  assert.equal(
    historyLine({
      kind: "transition",
      id: "t",
      command: "record_contact_attempt",
      from: "new",
      to: "contacted",
      closureReason: null,
      callAgainAt: CALL_AGAIN,
      appointmentAt: null,
      undone: false,
      actor: "staff@example.test",
      at: AT,
    }),
    null,
  );
});

test("each transition reads as its staff-facing result", () => {
  const base = {
    kind: "transition",
    id: "t",
    from: "contacted",
    to: "booked",
    closureReason: null,
    callAgainAt: null,
    appointmentAt: null,
    undone: false,
    actor: "staff@example.test",
    at: AT,
  };
  assert.equal(
    line({ ...base, command: "confirm_booking_handoff" }).text,
    "Marked Scheduled — appointment booked",
  );
  assert.equal(
    line({ ...base, command: "close_request", to: "closed", closureReason: "wont_schedule" }).text,
    "Closed — patient won't schedule",
  );
  assert.equal(
    line({ ...base, command: "close_request", to: "closed" }).text,
    "Closed — no appointment booked",
  );
  assert.match(
    line({ ...base, command: "reopen_request", to: "contacted", callAgainAt: CALL_AGAIN }).text,
    /^Reopened — returned to Contacted — call again /,
  );
  assert.equal(
    line({ ...base, command: "set_call_again", to: "contacted" }).text,
    "Call-again day correction recorded",
  );
  assert.equal(line({ ...base, command: "classify_legacy_closure" }).text, "Marked Scheduled");
  assert.equal(line({ ...base, command: "confirm_booking_handoff", undone: true }).undone, true);
});

test("undo, legacy review and delivery outcomes each carry their own sentence and tone", () => {
  const undo = line({
    kind: "undo",
    id: "u",
    restoredState: "new",
    actor: "staff@example.test",
    at: AT,
  });
  assert.equal(undo.text, "Undo — restored to New");
  assert.equal(
    line({ kind: "legacy_classified", id: "l", to: "booked", actor: "s@example.test", at: AT })
      .text,
    "Record reviewed — an appointment was booked (Scheduled)",
  );
  const failed = line({
    kind: "delivery",
    id: "d",
    recipient: "desk@example.test",
    accepted: false,
    at: AT,
  });
  assert.equal(failed.text, "Notification email failed — desk@example.test");
  assert.equal(failed.attention, true);
  const accepted = line({ kind: "delivery", id: "d2", recipient: "", accepted: true, at: AT });
  assert.equal(accepted.text, "Notification email accepted for delivery — recipient unavailable");
  assert.equal(accepted.quiet, true);
});
