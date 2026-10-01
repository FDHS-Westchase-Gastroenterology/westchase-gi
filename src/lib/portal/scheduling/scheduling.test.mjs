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
  assert.equal(decoded.appointment.patientPhone, null);
  assert.equal(
    appointmentReadDatabaseSchema.parse({
      ...response,
      appointment: { ...response.appointment, patient_phone: "(813) 555-0100" },
    }).appointment.patientPhone,
    "(813) 555-0100",
  );
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

test("month summary reads a practice month and rejects malformed rows as unavailable", async () => {
  const provider = (name, open, firstOpen) => ({
    id,
    name,
    open,
    firstOpen,
    locations: ["TEST Westchase"],
  });
  // Rows copied from the RPC's output shape: offset timestamps and literal nulls.
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = `2026-11-${String(index + 1).padStart(2, "0")}`;
    if (index === 4) return { date, open: null, seen: null, status: "closed", bookedShare: null };
    if (index === 5)
      return {
        date,
        open: 2,
        seen: null,
        booked: 1,
        status: "open",
        capacity: 3,
        providers: [
          provider("TEST Alpha", 2, ["2026-11-06T14:15:00+00:00", "2026-11-06T14:30:00+00:00"]),
          provider("TEST Beta", 0, []),
        ],
        bookedShare: 0.1667,
      };
    if (index === 2)
      return {
        date,
        open: 0,
        seen: null,
        booked: 6,
        status: "full",
        capacity: 6,
        providers: [provider("TEST Alpha", 0, [])],
        bookedShare: 1,
      };
    return { date, open: null, seen: 1, status: "past", bookedShare: null };
  });
  const summary = {
    ok: true,
    month: "2026-11",
    today: "2026-11-06",
    timeZone: "America/New_York",
    observedAt: "2026-11-06T13:27:48.996+00:00",
    referenceType: {
      id,
      name: "TEST Follow-up",
      version: 1,
      durationMinutes: 15,
      bufferAfterMinutes: 0,
      bufferBeforeMinutes: 0,
    },
    days,
  };
  const calls = [];
  let data = summary;
  const db = {
    rpc(name, args) {
      calls.push({ name, args });
      return {
        async abortSignal() {
          return { data, error: null };
        },
      };
    },
  };
  const outcome = await executeSchedulingOperation(db, otherId, {
    action: "month_summary",
    month: "2026-11",
    locationId: null,
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.days[5].providers[0].firstOpen.length, 2);
  assert.deepEqual(calls[0], {
    name: "portal_schedule_month_summary",
    args: {
      p_actor_id: otherId,
      p_month: "2026-11-01",
      p_location_id: null,
      p_appointment_type_id: null,
    },
  });
  for (const month of ["2026-13", "1999-12", "2200-01", "2026-1", "2026-11-01"])
    assert.deepEqual(
      await executeSchedulingOperation(db, otherId, { action: "month_summary", month }),
      { ok: false, code: "invalid_command" },
    );
  assert.equal(calls.length, 1);
  data = { ...summary, days: [{ ...days[4], open: 3 }, ...days.slice(1)] };
  assert.deepEqual(
    await executeSchedulingOperation(db, otherId, { action: "month_summary", month: "2026-11" }),
    { ok: false, code: "unavailable" },
  );
  data = { ok: false, code: "location_unavailable" };
  assert.deepEqual(
    await executeSchedulingOperation(db, otherId, {
      action: "month_summary",
      month: "2026-11",
      locationId: id,
    }),
    data,
  );
});

test("month availability reads per-provider open starts for the request's office", async () => {
  // Rows copied from the RPC's output shape: offset timestamps and literal nulls.
  const entry = (overrides) => ({
    providerId: id,
    providerName: "TEST Alpha",
    locationId: otherId,
    locationName: "TEST Tampa",
    open: [],
    booked: 0,
    capacity: 0,
    reason: null,
    ...overrides,
  });
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = `2026-11-${String(index + 1).padStart(2, "0")}`;
    if (index < 5) return { date, past: true, open: 0, booked: 0, capacity: 0, providers: [] };
    if (index === 5)
      return {
        date,
        past: false,
        open: 2,
        booked: 1,
        capacity: 3,
        providers: [
          entry({
            open: [
              { startsAt: "2026-11-06T14:15:00+00:00", time: "09:15" },
              { startsAt: "2026-11-06T15:00:00+00:00", time: "10:00" },
            ],
            booked: 1,
            capacity: 3,
          }),
        ],
      };
    if (index === 6)
      return {
        date,
        past: false,
        open: 0,
        booked: 0,
        capacity: 0,
        providers: [entry({ locationId: null, locationName: null, reason: "no_hours" })],
      };
    return {
      date,
      past: false,
      open: 0,
      booked: 4,
      capacity: 4,
      providers: [entry({ booked: 4, capacity: 4, reason: "booked_out" })],
    };
  });
  const availability = {
    ok: true,
    month: "2026-11",
    today: "2026-11-06",
    timeZone: "America/New_York",
    observedAt: "2026-11-06T13:27:48.996+00:00",
    appointmentType: {
      id,
      name: "TEST New patient",
      version: 2,
      durationMinutes: 30,
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 5,
    },
    locations: [{ id: otherId, name: "TEST Tampa", requestLocation: "tampa" }],
    providers: [{ id, name: "TEST Alpha", locations: [{ id: otherId, name: "TEST Tampa" }] }],
    days,
  };
  const calls = [];
  let data = availability;
  const db = {
    rpc(name, args) {
      calls.push({ name, args });
      return {
        async abortSignal() {
          return { data, error: null };
        },
      };
    },
  };
  const outcome = await executeSchedulingOperation(db, otherId, {
    action: "month_availability",
    month: "2026-11",
    appointmentTypeId: id,
    location: "tampa",
    patientId: otherId,
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.days[5].providers[0].open[1].time, "10:00");
  assert.equal(outcome.days[6].providers[0].reason, "no_hours");
  assert.deepEqual(calls[0], {
    name: "portal_schedule_month_availability",
    args: {
      p_actor_id: otherId,
      p_month: "2026-11-01",
      p_appointment_type_id: id,
      p_request_location: "tampa",
      p_patient_id: otherId,
    },
  });
  for (const input of [
    { month: "2026-13", appointmentTypeId: id, location: "any" },
    { month: "2026-11", appointmentTypeId: id, location: "brandon" },
    { month: "2026-11", appointmentTypeId: null, location: "any" },
    { month: "2026-11", location: "any" },
  ])
    assert.deepEqual(
      await executeSchedulingOperation(db, otherId, { action: "month_availability", ...input }),
      { ok: false, code: "invalid_command" },
    );
  assert.equal(calls.length, 1);
  data = { ...availability, days: [{ ...days[5], providers: [entry({ reason: "away" })] }] };
  assert.deepEqual(
    await executeSchedulingOperation(db, otherId, {
      action: "month_availability",
      month: "2026-11",
      appointmentTypeId: id,
      location: "any",
    }),
    { ok: false, code: "unavailable" },
  );
  assert.equal(calls[1].args.p_patient_id, null);
  data = { ok: false, code: "location_unavailable" };
  assert.deepEqual(
    await executeSchedulingOperation(db, otherId, {
      action: "month_availability",
      month: "2026-11",
      appointmentTypeId: id,
      location: "lutz",
    }),
    data,
  );
});

test("week schedule reads one to three providers' Sunday weeks in lane order", async () => {
  const thirdId = "4b0f3f4e-2a59-4c55-9a0e-1c39b2c6c6f1";
  // Rows copied from the RPC's output shape: offset timestamps and literal nulls.
  const day = (date, overrides) => ({
    date,
    working: [],
    appointments: [],
    open: [],
    seen: null,
    openCount: 0,
    ...overrides,
  });
  const days = [
    day("2026-09-27"),
    day("2026-09-28", {
      working: [
        { from: "2026-09-28T12:00:00+00:00", until: "2026-09-28T16:00:00+00:00" },
        { from: "2026-09-28T17:00:00+00:00", until: "2026-09-28T21:00:00+00:00" },
      ],
      appointments: [
        {
          id,
          startsAt: "2026-09-28T13:00:00+00:00",
          endsAt: "2026-09-28T13:30:00+00:00",
          status: "completed",
          appointmentType: "TEST Follow-up",
          patientName: "TEST Ellen Byrne",
          patientListName: "Byrne",
        },
      ],
      seen: 1,
      openCount: null,
    }),
    day("2026-09-29", { seen: 0, openCount: null }),
    day("2026-09-30", {
      open: [
        {
          startsAt: "2026-09-30T14:00:00+00:00",
          endsAt: "2026-09-30T14:30:00+00:00",
          locationId: otherId,
          locationName: "TEST Tampa",
        },
      ],
      openCount: 1,
    }),
    day("2026-10-01"),
    day("2026-10-02"),
    day("2026-10-03"),
  ];
  const week = {
    ok: true,
    observedAt: "2026-09-30T13:27:48.996+00:00",
    today: "2026-09-30",
    weekStart: "2026-09-27",
    timeZone: "America/New_York",
    activeProviderCount: 3,
    referenceType: { id, name: "TEST Follow-up", durationMinutes: 30, version: 2 },
    providers: [
      { id: otherId, name: "TEST Dr. Awad", days },
      { id, name: "TEST Dr. Chang", days },
    ],
  };
  const calls = [];
  let data = week;
  const db = {
    rpc(name, args) {
      calls.push({ name, args });
      return {
        async abortSignal() {
          return { data, error: null };
        },
      };
    },
  };
  const outcome = await executeSchedulingOperation(db, otherId, {
    action: "week_schedule",
    weekStart: "2026-09-27",
    providerIds: [otherId, id],
  });
  assert.equal(outcome.ok, true);
  assert.deepEqual(
    outcome.providers.map((provider) => provider.id),
    [otherId, id],
  );
  assert.deepEqual(calls[0], {
    name: "portal_schedule_week",
    args: {
      p_actor_id: otherId,
      p_week_start: "2026-09-27",
      p_provider_ids: [otherId, id],
      p_location_id: null,
      p_appointment_type_id: null,
    },
  });
  for (const input of [
    { weekStart: "2026-09-28", providerIds: [id] },
    { weekStart: "1999-12-26", providerIds: [id] },
    { weekStart: "2026-09-27", providerIds: [] },
    { weekStart: "2026-09-27", providerIds: [id, id] },
    { weekStart: "2026-09-27", providerIds: [id, otherId, thirdId, key] },
  ])
    assert.deepEqual(
      await executeSchedulingOperation(db, otherId, { action: "week_schedule", ...input }),
      { ok: false, code: "invalid_command" },
    );
  assert.equal(calls.length, 1);
  // A cancelled appointment or a short week is a contract break, not a partial grid.
  const cancelled = { ...days[1].appointments[0], status: "cancelled" };
  for (const broken of [
    { ...week, providers: [{ ...week.providers[0], days: days.slice(1) }] },
    {
      ...week,
      providers: [
        {
          ...week.providers[0],
          days: [days[0], { ...days[1], appointments: [cancelled] }, ...days.slice(2)],
        },
      ],
    },
  ]) {
    data = broken;
    assert.deepEqual(
      await executeSchedulingOperation(db, otherId, {
        action: "week_schedule",
        weekStart: "2026-09-27",
        providerIds: [otherId],
      }),
      { ok: false, code: "unavailable" },
    );
  }
  data = { ok: false, code: "provider_unavailable" };
  assert.deepEqual(
    await executeSchedulingOperation(db, otherId, {
      action: "week_schedule",
      weekStart: "2026-09-27",
      providerIds: [thirdId],
    }),
    data,
  );
});

test("the remembered week provider is read and written only through the actor's RPCs", async () => {
  const calls = [];
  const results = {
    portal_schedule_week_provider: { ok: true, providerId: id, remembered: false },
    portal_remember_week_provider: { ok: true, providerId: otherId },
  };
  const db = {
    rpc(name, args) {
      calls.push({ name, args });
      return {
        async abortSignal() {
          return { data: results[name], error: null };
        },
      };
    },
  };
  assert.deepEqual(await executeSchedulingOperation(db, key, { action: "week_provider" }), {
    ok: true,
    providerId: id,
    remembered: false,
  });
  assert.deepEqual(
    await executeSchedulingOperation(db, key, {
      action: "remember_week_provider",
      providerId: otherId,
    }),
    { ok: true, providerId: otherId },
  );
  assert.deepEqual(calls, [
    { name: "portal_schedule_week_provider", args: { p_actor_id: key } },
    { name: "portal_remember_week_provider", args: { p_actor_id: key, p_provider_id: otherId } },
  ]);
  assert.deepEqual(
    await executeSchedulingOperation(db, key, { action: "week_provider", providerId: id }),
    { ok: false, code: "invalid_command" },
  );
  assert.deepEqual(
    await executeSchedulingOperation(db, key, {
      action: "remember_week_provider",
      providerId: "x",
    }),
    { ok: false, code: "invalid_command" },
  );
  results.portal_schedule_week_provider = { ok: true, providerId: null, remembered: false };
  assert.deepEqual(await executeSchedulingOperation(db, key, { action: "week_provider" }), {
    ok: true,
    providerId: null,
    remembered: false,
  });
  const failing = {
    rpc() {
      return {
        async abortSignal() {
          return { data: null, error: { message: "timeout" } };
        },
      };
    },
  };
  assert.deepEqual(
    await executeSchedulingOperation(failing, key, {
      action: "remember_week_provider",
      providerId: otherId,
    }),
    { ok: false, code: "unavailable" },
  );
});
