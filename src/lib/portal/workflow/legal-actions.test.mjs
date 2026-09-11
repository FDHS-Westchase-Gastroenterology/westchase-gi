import assert from "node:assert/strict";
import test from "node:test";

import { CLOSURE_REASONS, legalActionsFor, REQUEST_STATES } from "./contracts.ts";
import { decide } from "./machine.ts";

/* Spec §7: the controls a staff surface renders derive from the same
   legal-action policy the server re-decides with, so a hidden control is
   never the authorization and a shown control is never refused. This pins
   the two functions to each other across every state the machine knows. */

const now = new Date("2026-08-06T15:00:00.000Z");
const callAgainAt = "2026-08-07T13:00:00.000Z";
const appointmentAt = "2026-09-03T14:30:00.000Z";

function snapshot(state, { legacyReviewRequired = false, callAgainAt: pending = null } = {}) {
  const base = {
    state,
    version: 1,
    callAgainAt: null,
    bookingConfirmedAt: null,
    appointmentAt: null,
    closedAt: null,
    closureReason: null,
    legacyReviewRequired,
  };
  if (state === "contacted") return { ...base, callAgainAt: pending };
  if (state === "booked") return { ...base, bookingConfirmedAt: now.toISOString(), appointmentAt };
  if (state === "closed" && !legacyReviewRequired) {
    return { ...base, closedAt: now.toISOString(), closureReason: "wont_schedule" };
  }
  return base;
}

const situations = [];
for (const state of REQUEST_STATES) {
  situations.push({ label: state, current: snapshot(state) });
}
situations.push({
  label: "contacted with a call-again day",
  current: snapshot("contacted", { callAgainAt }),
});
situations.push({
  label: "closed before outcomes were recorded",
  current: snapshot("closed", { legacyReviewRequired: true }),
});

function accepts(current, command) {
  return decide(current, command, now).accepted;
}

for (const { label, current } of situations) {
  const legal = legalActionsFor(current.state, {
    legacyReviewRequired: current.legacyReviewRequired,
    callAgainAt: current.callAgainAt,
  });

  test(`${label}: the panel offers a contact attempt exactly when the machine accepts one`, () => {
    assert.equal(
      accepts(current, { kind: "record_contact_attempt", outcome: "voicemail", callAgainAt }),
      legal.recordContactAttempt,
    );
  });

  test(`${label}: the panel offers a booking handoff exactly when the machine accepts one`, () => {
    assert.equal(
      accepts(current, { kind: "confirm_booking_handoff", appointmentAt }),
      legal.confirmBookingHandoff,
    );
  });

  for (const reason of CLOSURE_REASONS) {
    test(`${label}: closing as ${reason} is offered exactly when the machine accepts it`, () => {
      assert.equal(
        accepts(current, { kind: "close_request", reason }),
        legal.closeReasons.includes(reason),
      );
    });
  }

  test(`${label}: reopen is offered exactly when the machine accepts it`, () => {
    assert.equal(accepts(current, { kind: "reopen_request", callAgainAt }), legal.reopenRequest);
  });

  test(`${label}: the call-again repair is offered exactly when the machine accepts it`, () => {
    assert.equal(accepts(current, { kind: "set_call_again", callAgainAt }), legal.setCallAgain);
  });

  test(`${label}: classifying a legacy closure is offered exactly when the machine accepts it`, () => {
    assert.equal(
      accepts(current, { kind: "classify_legacy_closure", resolution: "booked" }),
      legal.classifyLegacyClosure,
    );
  });
}
