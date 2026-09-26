import assert from "node:assert/strict";
import test from "node:test";

import { executePatientCommand } from "./commands.ts";
import { patientCommandInputSchema, patientSearchInputSchema } from "./contracts.ts";
import { isPatientRequestOrigin, readPatientJson } from "./http.ts";
import { patientReadDatabaseSchema, patientSearchDatabaseSchema } from "./rows.ts";

const actorId = "de4b8827-11de-4265-81b6-d2a2f913f08c";
const patientId = "93df5291-e078-4fe2-9f9d-8ff83e948261";
const idempotencyKey = "c2a44671-ed20-4d35-839b-63b2795b6394";
const row = {
  id: patientId,
  name: "TEST Morgan Reed",
  date_of_birth: null,
  phone: null,
  email: null,
  archived_at: null,
  version: 1,
  created_at: "2026-09-06T20:00:00+00:00",
  updated_at: "2026-09-06T20:00:00+00:00",
  created_by: actorId,
  updated_by: actorId,
};

test("registration requires only a name and never silently accepts clinical or billing fields", () => {
  const parsed = patientCommandInputSchema.parse({
    idempotencyKey,
    command: { kind: "create", patient: { name: "  TEST Morgan Reed  " } },
  });
  assert.deepEqual(parsed.command, {
    kind: "create",
    patient: { name: row.name, dateOfBirth: null, phone: null, email: null },
    requestId: null,
  });
  for (const patient of [
    { name: " " },
    { name: row.name, dateOfBirth: "2023-02-29" },
    { name: row.name, dateOfBirth: "0000-01-01" },
    { name: row.name, phone: "81355" },
    { name: row.name, email: "not-an-email" },
    { name: row.name, billingPatientId: patientId },
    { name: row.name, clinicalNote: "Unrequested record" },
  ]) {
    assert.equal(
      patientCommandInputSchema.safeParse({
        idempotencyKey,
        command: { kind: "create", patient },
      }).success,
      false,
    );
  }
  assert.equal(
    patientCommandInputSchema.safeParse({
      idempotencyKey,
      command: { kind: "update", patientId, expectedVersion: 0, patient: { name: row.name } },
    }).success,
    false,
  );
  assert.equal(patientSearchInputSchema.safeParse({ limit: 101 }).success, false);
});

test("receipt fingerprints bind normalized intent and actor without storing identifying text", async () => {
  const previousKey = process.env.WORKFLOW_COMMAND_HMAC_KEY;
  process.env.WORKFLOW_COMMAND_HMAC_KEY = "TEST patient command secret";
  const calls = [];
  const saved = { ok: true, patientId, version: 1 };
  const db = {
    rpc(name, args) {
      calls.push({ name, args });
      return {
        async abortSignal(signal) {
          assert.ok(signal instanceof AbortSignal);
          return { data: saved, error: null };
        },
      };
    },
  };
  try {
    assert.deepEqual(
      await executePatientCommand(db, actorId, {
        idempotencyKey,
        command: { kind: "create", patient: { name: ` ${row.name} ` } },
      }),
      saved,
    );
    await executePatientCommand(db, actorId, {
      idempotencyKey,
      command: {
        patient: { email: null, phone: null, name: row.name, dateOfBirth: null },
        kind: "create",
        requestId: null,
      },
    });
    await executePatientCommand(db, actorId, {
      idempotencyKey,
      command: { kind: "create", patient: { name: "TEST Different patient" } },
    });
    await executePatientCommand(db, patientId, {
      idempotencyKey,
      command: { kind: "create", patient: { name: row.name } },
    });
    assert.equal(calls[0].name, "portal_execute_patient_command");
    assert.match(calls[0].args.p_fingerprint, /^[a-f0-9]{64}$/);
    assert.equal(calls[0].args.p_fingerprint, calls[1].args.p_fingerprint);
    assert.notEqual(calls[0].args.p_fingerprint, calls[2].args.p_fingerprint);
    assert.notEqual(calls[0].args.p_fingerprint, calls[3].args.p_fingerprint);
    assert.equal(JSON.stringify(saved).includes(row.name), false);
    assert.deepEqual(
      await executePatientCommand(db, actorId, {
        idempotencyKey,
        command: { kind: "create", patient: { name: "" } },
      }),
      { ok: false, code: "invalid_command" },
    );
    assert.equal(calls.length, 4);
  } finally {
    if (previousKey === undefined) delete process.env.WORKFLOW_COMMAND_HMAC_KEY;
    else process.env.WORKFLOW_COMMAND_HMAC_KEY = previousKey;
  }
});

test("database reads expose the public contract and reject broken history instead of hiding it", () => {
  const search = patientSearchDatabaseSchema.parse({
    ok: true,
    patients: [row],
    total: 1,
    next: null,
  });
  assert.equal(search.patients[0].dateOfBirth, null);
  assert.equal(search.patients[0].createdAt, row.created_at);
  assert.equal("created_by" in search.patients[0], false);
  const detail = {
    ok: true,
    patient: row,
    history: {
      total: 1,
      nextVersion: null,
      items: [
        {
          id: idempotencyKey,
          version: 1,
          command: "create",
          before_record: null,
          after_record: row,
          request_id: null,
          actor_id: actorId,
          actor_email: "staff@example.test",
          occurred_at: row.created_at,
        },
      ],
    },
    requests: {
      total: 1,
      nextRequestId: null,
      items: [
        {
          request_id: idempotencyKey,
          linked_at: row.created_at,
          linked_by: actorId,
          request_created_at: row.created_at,
          request_status: "scheduled",
        },
      ],
    },
  };
  const decoded = patientReadDatabaseSchema.parse(detail);
  assert.equal(decoded.history.items[0].after.name, row.name);
  assert.equal(decoded.history.items[0].actor.id, actorId);
  assert.equal("after_record" in decoded.history.items[0], false);
  assert.equal(decoded.requests.items[0].state, "booked");
  detail.history.items[0].after_record = null;
  assert.equal(patientReadDatabaseSchema.safeParse(detail).success, false);
});

test("patient JSON rejects cross-origin requests, malformed bytes, and oversized streamed bodies", async () => {
  const url = "https://portal.example.test/api/admin/patients";
  const request = (body, headers = {}) =>
    new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: new URL(url).origin, ...headers },
      body,
    });
  assert.equal(isPatientRequestOrigin(request("{}")), true);
  assert.equal(
    isPatientRequestOrigin(request("{}", { origin: "https://elsewhere.example.test" })),
    false,
  );
  assert.equal(isPatientRequestOrigin(new Request(url)), false);
  assert.deepEqual(await readPatientJson(request('{"name":"TEST"}')), { name: "TEST" });
  assert.equal(await readPatientJson(request("{}", { "Content-Type": "text/plain" })), null);
  assert.equal(await readPatientJson(request("{")), null);
  assert.equal(await readPatientJson(request(new Uint8Array([0xff, 0xff]))), null);
  assert.equal(await readPatientJson(request(JSON.stringify("x".repeat(8192)))), null);
  let canceled = false;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(" ".repeat(4096)));
      controller.enqueue(new TextEncoder().encode(" ".repeat(4097)));
    },
    cancel() {
      canceled = true;
    },
  });
  const streamed = new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: stream,
    duplex: "half",
  });
  assert.equal(await readPatientJson(streamed), null);
  assert.equal(canceled, true);
});
