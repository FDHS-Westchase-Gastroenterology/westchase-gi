import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { schedulingInputSchema } from "./contracts.ts";
import { executeSchedulingOperation } from "./service.ts";

const id = "98092b3a-2747-4d10-933e-b3f06dd5f8d9";
const key = "1c2fa2b6-5e0e-4f70-9b7e-2a7f9341c42c";
const book = {
  kind: "book",
  patientId: id,
  providerId: id,
  locationId: id,
  appointmentTypeId: id,
  expectedTypeVersion: 1,
  sourceRequestId: null,
  start: { date: "2027-01-10", time: "09:15" },
};

test("request booking requires its reviewed version and cancellation pairs its version with a follow-up day", () => {
  const input = (command) => ({ action: "command", idempotencyKey: key, command });
  assert.equal(schedulingInputSchema.safeParse(input(book)).success, true);
  assert.equal(
    schedulingInputSchema.safeParse(input({ ...book, sourceRequestId: id })).success,
    false,
  );
  assert.equal(
    schedulingInputSchema.safeParse(input({ ...book, requestVersion: 1 })).success,
    false,
  );
  assert.equal(
    schedulingInputSchema.safeParse(input({ ...book, sourceRequestId: id, requestVersion: 1 }))
      .success,
    true,
  );
  const cancel = { kind: "cancel", id, expectedVersion: 1, reason: "TEST cancellation" };
  assert.equal(schedulingInputSchema.safeParse(input(cancel)).success, true);
  for (const fields of [
    { requestVersion: 2 },
    { callAgainOn: "2027-01-11" },
    { requestVersion: 2, callAgainOn: "2027-02-30" },
    { requestVersion: 2, callAgainOn: "2027-01-11", requestWorkflowManaged: false },
  ])
    assert.equal(schedulingInputSchema.safeParse(input({ ...cancel, ...fields })).success, false);
  assert.equal(
    schedulingInputSchema.safeParse(
      input({ ...cancel, requestVersion: 2, callAgainOn: "2027-01-11" }),
    ).success,
    true,
  );
});

test("unlinked bookings keep their previous receipt fingerprint and callback days resolve without a moving clock", async () => {
  const previous = process.env.WORKFLOW_COMMAND_HMAC_KEY;
  process.env.WORKFLOW_COMMAND_HMAC_KEY = "TEST handoff fingerprint";
  const calls = [];
  const db = {
    rpc(name, args) {
      calls.push({ name, args });
      return {
        async abortSignal() {
          return { error: null, data: { ok: true, entity: "appointment", id, version: 1 } };
        },
      };
    },
  };
  try {
    await executeSchedulingOperation(db, id, {
      action: "command",
      idempotencyKey: key,
      command: book,
    });
    const fingerprint = createHmac("sha256", "TEST handoff fingerprint")
      .update("wgi:scheduling-command:v1\0")
      .update(JSON.stringify({ actorId: id, action: "command", command: book }))
      .digest("hex");
    assert.equal(calls[0].args.p_fingerprint, fingerprint);
    const cancel = {
      action: "command",
      idempotencyKey: key,
      command: {
        kind: "cancel",
        id,
        expectedVersion: 1,
        reason: "TEST cancellation",
        requestVersion: 2,
        callAgainOn: "2027-11-07",
      },
    };
    await executeSchedulingOperation(db, id, cancel);
    await executeSchedulingOperation(db, id, cancel);
    assert.equal(calls[1].args.p_command.callAgainAt, "2027-11-07T13:00:00.000Z");
    assert.equal("callAgainOn" in calls[1].args.p_command, false);
    assert.equal(calls[1].args.p_command.requestVersion, 2);
    assert.equal(calls[1].args.p_fingerprint, calls[2].args.p_fingerprint);
    await executeSchedulingOperation(db, id, {
      ...cancel,
      command: { ...cancel.command, callAgainOn: "2027-11-08" },
    });
    assert.notEqual(calls[1].args.p_fingerprint, calls[3].args.p_fingerprint);
  } finally {
    if (previous === undefined) delete process.env.WORKFLOW_COMMAND_HMAC_KEY;
    else process.env.WORKFLOW_COMMAND_HMAC_KEY = previous;
  }
});
