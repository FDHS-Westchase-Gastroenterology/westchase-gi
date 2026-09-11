import assert from "node:assert/strict";
import test from "node:test";

import { clinicalInputSchema, clinicalReadOutcomeSchema } from "./contracts.ts";
import { clinicalReadDatabaseSchema } from "./rows.ts";
import { executeClinicalOperation } from "./service.ts";

const actor = "188d6eb7-347a-4bd9-ae9a-9d8f3c7e020f";
const patientId = "cfb6b2ca-cb5e-47f9-b6c0-b785597013d0";
const recordId = "5a50e9f3-e567-4aef-84db-85d39a94c78f";
const key = "019fe33a-4e4c-44fc-9aaf-5ac0bf3edb8d";
const content = { kind: "note", title: "TEST chart", noteText: "TEST draft" };
const create = {
  action: "command",
  idempotencyKey: key,
  command: { kind: "create", patientId, content },
};

test("clinical drafts do not require an appointment and reject forged authorship, signatures, and mixed document content", () => {
  const parsed = clinicalInputSchema.parse(create);
  assert.equal(parsed.command.appointmentId, null);
  assert.equal(parsed.command.content.serviceDate, null);
  for (const command of [
    { ...create.command, authorId: actor },
    { ...create.command, signedAt: "2026-09-07T00:00:00Z" },
    { ...create.command, content: { ...content, documentReference: "TEST mixed payload" } },
    { ...create.command, content: { ...content, noteText: "x".repeat(20001) } },
    {
      ...create.command,
      content: {
        kind: "document_reference",
        title: "TEST document",
        documentSource: "TEST archive",
      },
    },
  ])
    assert.equal(clinicalInputSchema.safeParse({ ...create, command }).success, false);
  assert.equal(
    clinicalInputSchema.safeParse({ action: "list", patientId, limit: 101 }).success,
    false,
  );
  assert.equal(
    clinicalInputSchema.safeParse({ action: "list", patientId, query: "(literal)%_" }).success,
    true,
  );
});

test("clinical decoding preserves the signed text and signature when a record is entered in error", () => {
  const signed = {
    id: recordId,
    patient_id: patientId,
    appointment_id: null,
    record_kind: "note",
    title: "TEST chart",
    service_date: null,
    status: "signed",
    amends_id: null,
    amends_version: null,
    version: 2,
    author_id: actor,
    author_email: "clinical@example.test",
    signed_by: actor,
    signed_by_email: "clinical@example.test",
    signed_at: "2026-09-07T00:01:00+00:00",
    created_at: "2026-09-07T00:00:00+00:00",
    updated_at: "2026-09-07T00:01:00+00:00",
    updated_by: actor,
    note_text: "TEST signed text",
    document_source: null,
    document_reference: null,
    document_sha256: null,
    error_reason: null,
  };
  const corrected = {
    ...signed,
    version: 3,
    status: "entered_in_error",
    error_reason: "TEST wrong source",
    updated_at: "2026-09-07T00:02:00+00:00",
  };
  const value = clinicalReadDatabaseSchema.parse({
    ok: true,
    canSign: false,
    record: corrected,
    history: {
      total: 3,
      nextVersion: 3,
      items: [
        {
          id: key,
          record_id: recordId,
          version: 3,
          command: "enter_in_error",
          before_record: signed,
          after_record: corrected,
          actor_id: actor,
          actor_email: "clinical@example.test",
          occurred_at: corrected.updated_at,
        },
      ],
    },
  });
  assert.equal(value.record.noteText, "TEST signed text");
  assert.deepEqual(value.record.signature, {
    id: actor,
    email: "clinical@example.test",
    at: signed.signed_at,
  });
  assert.equal(value.history.items[0].before.status, "signed");
  assert.equal(value.history.items[0].after.status, "entered_in_error");
  assert.deepEqual(clinicalReadOutcomeSchema.parse(value), value);
});

test("clinical command fingerprints bind the actor and complete validated content", async () => {
  const previous = process.env.WORKFLOW_COMMAND_HMAC_KEY;
  process.env.WORKFLOW_COMMAND_HMAC_KEY = "TEST clinical HMAC";
  const calls = [];
  const db = {
    rpc(name, args) {
      assert.equal(name, "portal_execute_clinical_command");
      calls.push(args);
      return {
        abortSignal: async () => ({
          error: null,
          data: { ok: true, entity: "record", id: recordId, patientId, version: 1 },
        }),
      };
    },
  };
  try {
    await executeClinicalOperation(db, actor, create);
    await executeClinicalOperation(db, actor, create);
    await executeClinicalOperation(db, actor, {
      ...create,
      command: { ...create.command, content: { ...content, noteText: "TEST changed text" } },
    });
    await executeClinicalOperation(db, recordId, create);
    assert.equal(calls[0].p_fingerprint, calls[1].p_fingerprint);
    assert.notEqual(calls[0].p_fingerprint, calls[2].p_fingerprint);
    assert.notEqual(calls[0].p_fingerprint, calls[3].p_fingerprint);
    assert.match(calls[0].p_fingerprint, /^[a-f0-9]{64}$/);
    assert.equal(calls[0].p_command.appointmentId, null);
  } finally {
    if (previous === undefined) delete process.env.WORKFLOW_COMMAND_HMAC_KEY;
    else process.env.WORKFLOW_COMMAND_HMAC_KEY = previous;
  }
});
