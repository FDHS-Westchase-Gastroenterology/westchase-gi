import assert from "node:assert/strict";
import test from "node:test";

import { billingInputSchema } from "./contracts.ts";
import { billingReadDatabaseSchema } from "./rows.ts";
import { executeBillingOperation } from "./service.ts";

const patientId = "98092b3a-2747-4d10-933e-b3f06dd5f8d9";
const actorId = "f7a5dc88-70de-4721-bbb6-17e60cc45cbb";
const entryId = "1c2fa2b6-5e0e-4f70-9b7e-2a7f9341c42c";
const charge = {
  action: "command",
  idempotencyKey: entryId,
  command: {
    kind: "charge",
    patientId,
    expectedVersion: 0,
    description: "TEST visit",
    amountCents: 12500,
    serviceDate: "2026-09-06",
  },
};

test("billing requires exact integer cents and patient ownership without requiring an appointment", () => {
  assert.equal(billingInputSchema.safeParse(charge).success, true);
  for (const amountCents of [0, -1, 1.25, Number.MAX_SAFE_INTEGER + 1, Infinity, "12500"]) {
    assert.equal(
      billingInputSchema.safeParse({ ...charge, command: { ...charge.command, amountCents } })
        .success,
      false,
    );
  }
  for (const serviceDate of ["0000-01-01", "2026-02-29", "09/06/2026"]) {
    assert.equal(
      billingInputSchema.safeParse({ ...charge, command: { ...charge.command, serviceDate } })
        .success,
      false,
    );
  }
  assert.equal(
    billingInputSchema.safeParse({
      ...charge,
      command: { ...charge.command, patientId: undefined },
    }).success,
    false,
  );
  assert.equal(
    billingInputSchema.safeParse({ ...charge, command: { ...charge.command, cardNumber: "TEST" } })
      .success,
    false,
  );
  assert.equal(
    billingInputSchema.safeParse({
      ...charge,
      command: {
        kind: "adjustment",
        patientId,
        expectedVersion: 0,
        description: "TEST account credit",
        amountCents: -12500,
      },
    }).success,
    true,
  );
  assert.equal(
    billingInputSchema.safeParse({ action: "read", patientId, beforeVersion: 0 }).success,
    false,
  );
});

test("billing replay fingerprints bind the actor and normalized money intent", async () => {
  const previous = process.env.WORKFLOW_COMMAND_HMAC_KEY;
  process.env.WORKFLOW_COMMAND_HMAC_KEY = "TEST billing secret";
  const calls = [];
  const saved = { ok: true, patientId, entryId, version: 1 };
  const db = {
    rpc(name, args) {
      calls.push({ name, args });
      return {
        async abortSignal() {
          return { data: saved, error: null };
        },
      };
    },
  };
  try {
    assert.deepEqual(await executeBillingOperation(db, actorId, charge), saved);
    await executeBillingOperation(db, actorId, {
      ...charge,
      command: {
        ...charge.command,
        appointmentId: null,
        externalReference: null,
        description: " TEST visit ",
      },
    });
    await executeBillingOperation(db, patientId, charge);
    await executeBillingOperation(db, actorId, {
      ...charge,
      command: { ...charge.command, amountCents: 12501 },
    });
    assert.equal(calls[0].args.p_fingerprint, calls[1].args.p_fingerprint);
    assert.notEqual(calls[0].args.p_fingerprint, calls[2].args.p_fingerprint);
    assert.notEqual(calls[0].args.p_fingerprint, calls[3].args.p_fingerprint);
    assert.equal(calls[0].name, "portal_execute_billing_command");
    assert.equal(calls[0].args.p_command.amountCents, 12500);
    assert.deepEqual(
      await executeBillingOperation(db, actorId, {
        ...charge,
        command: { ...charge.command, amountCents: 1.1 },
      }),
      { ok: false, code: "invalid_command" },
    );
    assert.equal(calls.length, 4);
  } finally {
    if (previous === undefined) delete process.env.WORKFLOW_COMMAND_HMAC_KEY;
    else process.env.WORKFLOW_COMMAND_HMAC_KEY = previous;
  }
});

test("billing reads preserve signed amounts, correction links, and version cursors and reject corrupt amounts", () => {
  const raw = {
    ok: true,
    patientId,
    currency: "USD",
    balanceCents: -5000,
    version: 123,
    entries: {
      total: 123,
      nextVersion: 24,
      items: [
        {
          id: entryId,
          patient_id: patientId,
          appointment_id: null,
          kind: "payment",
          amount_cents: -5000,
          resulting_balance_cents: -5000,
          version: 123,
          description: "TEST payment",
          service_date: null,
          payment_method: "cash",
          external_reference: null,
          source_entry_id: null,
          reversed_by: actorId,
          actor_id: actorId,
          actor_email: "billing@example.test",
          occurred_at: "2026-09-06T20:30:00+00:00",
        },
      ],
    },
  };
  const result = billingReadDatabaseSchema.parse(raw);
  assert.equal(result.balanceCents, -5000);
  assert.equal(result.entries.nextVersion, 24);
  assert.equal(result.entries.items[0].amountCents, -5000);
  assert.equal(result.entries.items[0].reversedBy, actorId);
  assert.equal("patient_id" in result.entries.items[0], false);
  assert.equal(
    billingReadDatabaseSchema.safeParse({ ...raw, balanceCents: Number.MAX_SAFE_INTEGER + 1 })
      .success,
    false,
  );
  assert.equal(
    billingReadDatabaseSchema.safeParse({
      ...raw,
      entries: { ...raw.entries, items: [{ ...raw.entries.items[0], amount_cents: 1.1 }] },
    }).success,
    false,
  );
});
