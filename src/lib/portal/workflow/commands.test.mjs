import assert from "node:assert/strict";
import test from "node:test";

import { executeRequestCommand } from "./commands.ts";

test("a contact completion sends both the contact fact and neutral closure to one database command", async () => {
  const previousKey = process.env.WORKFLOW_COMMAND_HMAC_KEY;
  process.env.WORKFLOW_COMMAND_HMAC_KEY = "fictional-command-test-key";
  const input = {
    requestId: "7625d4d9-2948-4fa5-a095-a4a5cd94fd7a",
    expectedVersion: 7,
    idempotencyKey: "c8d5753b-81d1-47c6-97b0-d32e0a135c92",
    actorEmail: "staff@example.test",
    command: { kind: "record_contact_and_close", outcome: "reached" },
    note: "TEST note stays with the patient record",
  };
  const now = new Date("2026-09-06T16:00:00.000Z");
  const calls = [];
  const saved = {
    ok: true,
    state: "closed",
    version: 8,
    callAgainAt: null,
    appointmentAt: null,
    undo: {
      transitionId: "807e851d-9f97-48bd-a183-584f63039e3d",
      command: "record_contact_and_close",
      occurredAt: now.toISOString(),
      expiresAt: "2026-09-06T16:15:00.000Z",
    },
  };
  let receipt = null;
  const db = {
    from(table) {
      const chain = {
        select() {
          return chain;
        },
        eq() {
          return chain;
        },
        async maybeSingle() {
          if (table === "request_command_receipts") return { data: receipt, error: null };
          return {
            data: {
              status: "contacted",
              version: 7,
              follow_up_at: "2026-09-07T13:00:00.000Z",
              record_handoff_at: null,
              appointment_at: null,
              closed_at: null,
              closure_reason: null,
              legacy_review_required: false,
            },
            error: null,
          };
        },
      };
      return chain;
    },
    async rpc(name, args) {
      calls.push({ name, args });
      receipt = { fingerprint: args.p_fingerprint, result: saved };
      return { data: saved, error: null };
    },
  };
  try {
    assert.deepEqual(await executeRequestCommand(db, input, now), saved);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, "portal_execute_request_command");
    assert.deepEqual(calls[0].args.p_decision, {
      command: "record_contact_and_close",
      state: "closed",
      callAgainAt: null,
      bookingConfirmedAt: null,
      appointmentAt: null,
      closedAt: now.toISOString(),
      closureReason: "no_further_contact",
      legacyReviewRequired: false,
      reasonCode: "reached",
      occurredAt: now.toISOString(),
    });
    assert.equal(calls[0].args.p_note, input.note);
    assert.match(calls[0].args.p_fingerprint, /^[0-9a-f]{64}$/);
    assert.deepEqual(
      await executeRequestCommand(db, input, new Date("2026-09-07T16:00:00.000Z")),
      saved,
    );
    assert.equal(
      calls.length,
      1,
      "A retry must use the durable result without another database mutation",
    );
    assert.deepEqual(
      await executeRequestCommand(
        db,
        {
          ...input,
          command: { kind: "record_contact_and_close", outcome: "no_answer" },
        },
        now,
      ),
      { ok: false, code: "idempotency_conflict" },
    );
    assert.equal(calls.length, 1);
  } finally {
    if (previousKey === undefined) delete process.env.WORKFLOW_COMMAND_HMAC_KEY;
    else process.env.WORKFLOW_COMMAND_HMAC_KEY = previousKey;
  }
});
