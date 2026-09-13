import assert from "node:assert/strict";
import test from "node:test";

import { schedulingInputSchema } from "./contracts.ts";
import { appointmentReadDatabaseSchema, schedulingConfigDatabaseSchema } from "./rows.ts";
import { executeSchedulingOperation } from "./service.ts";
import { resolveAppointmentStart } from "./time.ts";

const id = "98092b3a-2747-4d10-933e-b3f06dd5f8d9";
const otherId = "f7a5dc88-70de-4721-bbb6-17e60cc45cbb";
const key = "1c2fa2b6-5e0e-4f70-9b7e-2a7f9341c42c";
const book = {
  action: "command",
  idempotencyKey: key,
  command: {
    kind: "book",
    patientId: id,
    providerId: id,
    locationId: id,
    appointmentTypeId: id,
    expectedTypeVersion: 1,
    start: { date: "2027-01-10", time: "09:15" },
  },
};

test("scheduling resolves practice time and rejects missing or repeated daylight-saving times", () => {
  assert.equal(
    resolveAppointmentStart({ date: "2027-01-10", time: "09:15" }),
    "2027-01-10T14:15:00.000Z",
  );
  assert.equal(
    resolveAppointmentStart({ date: "2027-07-10", time: "09:15" }),
    "2027-07-10T13:15:00.000Z",
  );
  assert.equal(resolveAppointmentStart({ date: "2027-03-14", time: "02:30" }), null);
  assert.equal(resolveAppointmentStart({ date: "2027-11-07", time: "01:30" }), null);
  assert.equal(
    resolveAppointmentStart({ date: "2027-03-14", time: "03:00" }),
    "2027-03-14T07:00:00.000Z",
  );
  assert.equal(
    resolveAppointmentStart({ date: "2027-11-07", time: "02:00" }),
    "2027-11-07T07:00:00.000Z",
  );
  assert.equal(resolveAppointmentStart({ date: "2027-02-29", time: "09:00" }), null);
  assert.equal(
    resolveAppointmentStart({ date: "2028-02-29", time: "09:00" }),
    "2028-02-29T14:00:00.000Z",
  );
  assert.equal(resolveAppointmentStart({ date: "2027-01-10", time: "24:00" }), null);
});

test("appointment input excludes patient reassignment and requires bounded calendar reads", () => {
  assert.equal(schedulingInputSchema.safeParse(book).success, true);
  assert.equal(
    schedulingInputSchema.safeParse({ ...book, command: { ...book.command, billingId: id } })
      .success,
    false,
  );
  const reschedule = {
    action: "command",
    idempotencyKey: key,
    command: {
      kind: "reschedule",
      id,
      expectedVersion: 1,
      providerId: id,
      locationId: id,
      start: book.command.start,
    },
  };
  assert.equal(schedulingInputSchema.safeParse(reschedule).success, true);
  assert.equal(
    schedulingInputSchema.safeParse({
      ...reschedule,
      command: { ...reschedule.command, patientId: otherId },
    }).success,
    false,
  );
  assert.equal(
    schedulingInputSchema.safeParse({
      ...reschedule,
      command: { ...reschedule.command, appointmentTypeId: id },
    }).success,
    false,
  );
  assert.equal(schedulingInputSchema.safeParse({ action: "appointments" }).success, false);
  assert.equal(
    schedulingInputSchema.safeParse({ action: "appointments", patientId: id }).success,
    true,
  );
  assert.equal(
    schedulingInputSchema.safeParse({
      action: "appointments",
      from: "2027-01-01T00:00:00Z",
      to: "2028-01-01T00:00:00Z",
    }).success,
    false,
  );
  assert.equal(
    schedulingInputSchema.safeParse({
      action: "appointments",
      from: "2027-01-01T00:00:00Z",
      to: "2027-02-01T00:00:00Z",
    }).success,
    true,
  );
  const provider = {
    action: "configure",
    idempotencyKey: key,
    command: {
      kind: "save_provider",
      name: "TEST Provider",
      hours: [
        { locationId: id, weekday: 1, openMinute: 480, closeMinute: 1020, validFrom: "2027-01-01" },
      ],
      exceptions: [],
    },
  };
  assert.equal(schedulingInputSchema.safeParse(provider).success, true);
  assert.equal(
    schedulingInputSchema.safeParse({ ...provider, command: { ...provider.command, id } }).success,
    false,
  );
  assert.equal(
    schedulingInputSchema.safeParse({
      ...provider,
      command: { ...provider.command, hours: [{ ...provider.command.hours[0], closeMinute: 400 }] },
    }).success,
    false,
  );
  assert.equal(
    schedulingInputSchema.safeParse({
      ...provider,
      command: {
        ...provider.command,
        exceptions: [
          {
            kind: "available",
            locationId: null,
            startsAt: "2027-01-01T00:00:00Z",
            endsAt: "2027-01-02T00:00:00Z",
          },
        ],
      },
    }).success,
    false,
  );
});

test("scheduling fingerprints bind actor and canonical intent while invalid local times never reach the database", async () => {
  const previous = process.env.WORKFLOW_COMMAND_HMAC_KEY;
  process.env.WORKFLOW_COMMAND_HMAC_KEY = "TEST scheduling secret";
  const calls = [];
  const saved = { ok: true, entity: "appointment", id, version: 1 };
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
    assert.deepEqual(await executeSchedulingOperation(db, id, book), saved);
    await executeSchedulingOperation(db, id, {
      ...book,
      command: { ...book.command, sourceRequestId: null },
    });
    await executeSchedulingOperation(db, otherId, book);
    assert.equal(calls[0].name, "portal_execute_appointment_command");
    assert.equal(calls[0].args.p_command.startsAt, "2027-01-10T14:15:00.000Z");
    assert.equal("start" in calls[0].args.p_command, false);
    assert.equal(calls[0].args.p_fingerprint, calls[1].args.p_fingerprint);
    assert.notEqual(calls[0].args.p_fingerprint, calls[2].args.p_fingerprint);
    assert.deepEqual(
      await executeSchedulingOperation(db, id, {
        ...book,
        command: { ...book.command, start: { date: "2027-03-14", time: "02:15" } },
      }),
      { ok: false, code: "invalid_local_time" },
    );
    assert.equal(calls.length, 3);
  } finally {
    if (previous === undefined) delete process.env.WORKFLOW_COMMAND_HMAC_KEY;
    else process.env.WORKFLOW_COMMAND_HMAC_KEY = previous;
  }
});

test("scheduling decodes complete appointment history and fails visibly on damaged snapshots", () => {
  const at = "2027-01-10T14:15:00+00:00";
  const row = {
    id,
    patient_id: id,
    provider_id: id,
    location_id: id,
    appointment_type_id: id,
    source_request_id: null,
    starts_at: at,
    ends_at: "2027-01-10T14:45:00+00:00",
    duration_minutes: 30,
    buffer_before_minutes: 0,
    buffer_after_minutes: 0,
    reserved_from: at,
    reserved_until: "2027-01-10T14:45:00+00:00",
    status: "scheduled",
    reason: null,
    version: 1,
    created_at: at,
    updated_at: at,
    created_by: otherId,
  };
  const response = {
    ok: true,
    observedAt: at,
    appointment: {
      ...row,
      patient_name: "TEST Patient",
      provider_name: "TEST Provider",
      location_name: "TEST Location",
      appointment_type_name: "TEST Visit",
    },
    undo: { changeId: key, expiresAt: at },
    history: {
      total: 1,
      nextVersion: null,
      items: [
        {
          id: key,
          entity: "appointment",
          version: 1,
          command: "book",
          before_record: null,
          after_record: row,
          compensates_change_id: null,
          actor_id: otherId,
          actor_email: "staff@example.test",
          occurred_at: at,
        },
      ],
    },
  };
  const decoded = appointmentReadDatabaseSchema.parse(response);
  assert.equal(decoded.appointment.patientId, id);
  assert.equal(decoded.appointment.patientName, "TEST Patient");
  assert.equal("created_by" in decoded.appointment, false);
  assert.equal(decoded.history.items[0].after.appointmentTypeId, id);
  assert.equal(
    appointmentReadDatabaseSchema.safeParse({
      ...response,
      history: {
        ...response.history,
        items: [{ ...response.history.items[0], after_record: { ...row, duration_minutes: null } }],
      },
    }).success,
    false,
  );
  const type = {
    id,
    name: "TEST Visit",
    active: true,
    version: 1,
    created_at: at,
    updated_at: at,
    duration_minutes: 30,
    buffer_before_minutes: 5,
    buffer_after_minutes: 10,
  };
  const config = schedulingConfigDatabaseSchema.parse({
    ok: true,
    entity: "appointment_type",
    record: type,
    history: {
      total: 1,
      nextVersion: null,
      items: [
        {
          ...response.history.items[0],
          entity: "appointment_type",
          command: "save_appointment_type",
          after_record: type,
        },
      ],
    },
  });
  assert.equal(config.record.bufferAfterMinutes, 10);
  assert.equal(config.history.items[0].after.durationMinutes, 30);
});
