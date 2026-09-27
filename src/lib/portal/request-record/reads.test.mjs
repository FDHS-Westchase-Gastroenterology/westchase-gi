import assert from "node:assert/strict";
import test from "node:test";

import { fakePostgrest } from "../../../../test/fake-postgrest.mjs";
import { fetchRequestWorkSurface } from "../workflow/reads.ts";
import { requestIdSchema } from "./contracts.ts";
import {
  FULL_RECORD_BATCH_SIZE,
  fetchFullRecord,
  fetchFullRecords,
  fetchFullRecordsByStoredStatus,
} from "./reads.ts";

const REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const CREATED_AT = "2026-09-01T12:00:00.000Z";
const NOTE_AT = "2026-09-02T12:00:00.000Z";
const BOOKED_AT = "2026-09-03T12:00:00.000Z";

function recordClient({ missing = false, failure = null, invalid = false } = {}) {
  const request = {
    id: REQUEST_ID,
    name: "Example Patient",
    phone: "813-555-0100",
    email: null,
    location: "tampa",
    preferred_time: "morning",
    message: "Please call in the morning.",
    locale: "es",
    created_at: CREATED_AT,
    source_path: invalid ? null : "/es/appointments",
    status: "booked",
    version: "5",
    follow_up_at: null,
    record_handoff_at: BOOKED_AT,
    appointment_at: "2026-09-10T14:00:00.000Z",
    closed_at: null,
    closure_reason: null,
    legacy_review_required: false,
  };
  const tables = {
    requests: missing ? null : request,
    request_transitions: [
      {
        id: "booking",
        from_state: "contacted",
        to_state: "booked",
        command: "confirm_booking_handoff",
        actor_email: " Scheduler@Example.invalid ",
        occurred_at: BOOKED_AT,
        appointment_at: request.appointment_at,
        provenance: "staff",
      },
    ],
    request_events: [
      {
        id: "created",
        type: "created",
        status: "recorded",
        meta: { origin: "staff" },
        created_at: CREATED_AT,
      },
      {
        id: "note",
        type: "note",
        status: "recorded",
        meta: { text: "Patient requested a callback.", author_email: " NURSE@example.invalid " },
        created_at: NOTE_AT,
      },
      {
        id: "call",
        type: "contact_attempt",
        status: "recorded",
        meta: { outcome: "voicemail", author_email: "external@example.invalid" },
        created_at: NOTE_AT,
      },
    ],
    staff_profiles: [
      { email: "SCHEDULER@example.invalid", display_name: "Sam" },
      { email: "nurse@example.invalid", display_name: "Nora" },
      { email: "unrelated@example.invalid", display_name: "Other Staff" },
    ],
  };
  const reads = [];
  return {
    reads,
    from(table) {
      let columns;
      const query = {
        select(value) {
          columns = value;
          return query;
        },
        eq(key, value) {
          assert.equal(key, table === "requests" ? "id" : "request_id");
          assert.equal(value, REQUEST_ID);
          return query;
        },
        order() {
          return query;
        },
        maybeSingle() {
          return Promise.resolve(payload());
        },
        then(resolve, reject) {
          return Promise.resolve(payload()).then(resolve, reject);
        },
      };
      function payload() {
        const kind =
          table === "requests" ? (columns.includes("source_path") ? "contact" : "state") : table;
        reads.push(kind);
        if (failure === kind) return { data: null, error: { code: "READ_FAILED" } };
        const data = tables[table];
        assert.notEqual(data, undefined);
        const project = (row) =>
          Object.fromEntries(columns.split(",").map((key) => [key.trim(), row[key.trim()]]));
        return {
          data: data === null ? null : Array.isArray(data) ? data.map(project) : project(data),
          error: null,
        };
      }
      return query;
    },
  };
}

test("full record composes stored receipt and contact fields with the authoritative work surface", async () => {
  const client = recordClient();
  const record = await fetchFullRecord(client, REQUEST_ID);
  const surface = await fetchRequestWorkSurface(recordClient(), REQUEST_ID);
  assert.deepEqual(record, {
    id: REQUEST_ID,
    version: surface.version,
    state: surface.state,
    name: "Example Patient",
    phone: "813-555-0100",
    email: null,
    location: "tampa",
    preferredTime: "morning",
    message: "Please call in the morning.",
    createdAt: CREATED_AT,
    locale: "es",
    sourcePath: "/es/appointments",
    callAgainAt: surface.callAgainAt,
    bookingConfirmedAt: surface.bookingConfirmedAt,
    appointmentAt: surface.appointmentAt,
    closedAt: surface.closedAt,
    closureReason: surface.closureReason,
    legacyReviewRequired: surface.legacyReviewRequired,
    history: surface.history,
    actorNames: { "scheduler@example.invalid": "Sam", "nurse@example.invalid": "Nora" },
  });
  assert.equal(record.version, 5);
  assert.deepEqual([...client.reads].sort(), [
    "contact",
    "request_events",
    "request_transitions",
    "staff_profiles",
    "state",
  ]);
});

test("full record preserves newest-first history, notes, and creation origin", async () => {
  const { history } = await fetchFullRecord(recordClient(), REQUEST_ID);
  assert.equal(history[0].at, BOOKED_AT);
  assert.deepEqual(
    history.map((entry) => entry.at),
    history
      .map((entry) => entry.at)
      .toSorted()
      .toReversed(),
  );
  assert.deepEqual(
    history.find((entry) => entry.kind === "note"),
    {
      kind: "note",
      id: "note",
      text: "Patient requested a callback.",
      actor: " NURSE@example.invalid ",
      at: NOTE_AT,
    },
  );
  assert.deepEqual(history.at(-1), { kind: "created", origin: "staff", at: CREATED_AT });
});

test("actor names include only known history actors with normalized keys", async () => {
  const record = await fetchFullRecord(recordClient(), REQUEST_ID);
  assert.deepEqual(record.actorNames, {
    "scheduler@example.invalid": "Sam",
    "nurse@example.invalid": "Nora",
  });
  assert.ok(record.history.some((entry) => entry.actor === "external@example.invalid"));
});

test("a missing request returns null", async () => {
  assert.equal(await fetchFullRecord(recordClient({ missing: true }), REQUEST_ID), null);
});

for (const failure of ["contact", "state", "request_transitions", "request_events"]) {
  test(`a failed ${failure} read rejects, including when the request is missing`, async () => {
    for (const missing of [false, true]) {
      await assert.rejects(
        fetchFullRecord(recordClient({ failure, missing }), REQUEST_ID),
        /read failed/,
      );
    }
  });
}

test("invalid stored contact data rejects instead of rendering an empty record", async () => {
  await assert.rejects(
    fetchFullRecord(recordClient({ invalid: true }), REQUEST_ID),
    /Invalid full record/,
  );
});

test("a staff-name read failure degrades to email attribution", async () => {
  const record = await fetchFullRecord(recordClient({ failure: "staff_profiles" }), REQUEST_ID);
  assert.deepEqual(record.actorNames, {});
  assert.ok(record.history.some((entry) => entry.actor === " NURSE@example.invalid "));
});

test("the request-id validator accepts UUIDs and throws on malformed boundary inputs", () => {
  assert.equal(requestIdSchema.parse(REQUEST_ID), REQUEST_ID);
  for (const invalid of [
    "",
    "not-a-uuid",
    ` ${REQUEST_ID} `,
    null,
    undefined,
    42,
    { id: REQUEST_ID },
  ]) {
    assert.throws(() => requestIdSchema.parse(invalid));
  }
});

/* The batched read: many requests, each table read once per chunk of ids. */

const SECOND_ID = "22222222-2222-4222-8222-222222222222";
const THIRD_ID = "33333333-3333-4333-8333-333333333333";
const MISSING_ID = "99999999-9999-4999-8999-999999999999";

function requestRow(id, overrides) {
  return {
    id,
    name: `Fictional ${id.slice(0, 4)}`,
    phone: "000-000-0000",
    email: null,
    location: "tampa",
    preferred_time: "morning",
    message: null,
    locale: "en",
    created_at: CREATED_AT,
    source_path: "/en/appointment",
    status: "new",
    version: 1,
    follow_up_at: null,
    record_handoff_at: null,
    appointment_at: null,
    closed_at: null,
    closure_reason: null,
    legacy_review_required: false,
    ...overrides,
  };
}

function batchTables() {
  return {
    requests: [
      requestRow(REQUEST_ID, {
        name: "Example Patient",
        phone: "813-555-0100",
        message: "Please call in the morning.",
        locale: "es",
        source_path: "/es/appointments",
        status: "booked",
        version: "5",
        record_handoff_at: BOOKED_AT,
        appointment_at: "2026-09-10T14:00:00.000Z",
      }),
      requestRow(SECOND_ID, { created_at: "2026-08-30T12:00:00.000Z" }),
      requestRow(THIRD_ID, { created_at: "2026-08-31T12:00:00.000Z", status: "contacted" }),
    ],
    request_transitions: [
      {
        request_id: REQUEST_ID,
        id: "booking",
        from_state: "contacted",
        to_state: "booked",
        command: "confirm_booking_handoff",
        actor_email: " Scheduler@Example.invalid ",
        occurred_at: BOOKED_AT,
        appointment_at: "2026-09-10T14:00:00.000Z",
        provenance: "staff",
      },
      {
        request_id: THIRD_ID,
        id: "attempt",
        from_state: "new",
        to_state: "contacted",
        command: "record_contact_attempt",
        actor_email: "unrelated@example.invalid",
        occurred_at: "2026-09-01T09:00:00.000Z",
        provenance: "staff",
      },
    ],
    request_events: [
      {
        request_id: REQUEST_ID,
        id: "created",
        type: "created",
        status: "recorded",
        meta: { origin: "staff" },
        created_at: CREATED_AT,
      },
      {
        request_id: REQUEST_ID,
        id: "note",
        type: "note",
        status: "recorded",
        meta: { text: "Patient requested a callback.", author_email: " NURSE@example.invalid " },
        created_at: NOTE_AT,
      },
      {
        request_id: SECOND_ID,
        id: "second-note",
        type: "note",
        status: "recorded",
        meta: { text: "Fictional note.", author_email: "unrelated@example.invalid" },
        created_at: "2026-08-30T13:00:00.000Z",
      },
    ],
    staff_profiles: [
      { email: "SCHEDULER@example.invalid", display_name: "Sam" },
      { email: "nurse@example.invalid", display_name: "Nora" },
      { email: "unrelated@example.invalid", display_name: "Other Staff" },
    ],
  };
}

function callsTo(client, table) {
  return client.calls.filter((call) => call.table === table);
}

test("a batch composes each record exactly as the single read does", async () => {
  const ids = [REQUEST_ID, SECOND_ID, THIRD_ID];
  const batch = await fetchFullRecords(fakePostgrest(batchTables()), ids);
  const singles = await Promise.all(
    ids.map((id) => fetchFullRecord(fakePostgrest(batchTables()), id)),
  );
  assert.deepEqual(batch, singles);
  const single = await fetchFullRecord(recordClient(), REQUEST_ID);
  assert.deepEqual(batch[0], {
    ...single,
    history: single.history.filter((entry) => entry.id !== "call"),
  });
});

test("a batch reads requests, transitions, events, and staff names once each", async () => {
  const client = fakePostgrest(batchTables());
  await fetchFullRecords(client, [REQUEST_ID, SECOND_ID]);
  for (const table of ["requests", "request_transitions", "request_events", "staff_profiles"])
    assert.equal(callsTo(client, table).length, 1, table);
  assert.deepEqual(callsTo(client, "requests")[0].filters, [
    { column: "id", values: [REQUEST_ID, SECOND_ID] },
  ]);
  for (const table of ["request_transitions", "request_events"])
    assert.deepEqual(callsTo(client, table)[0].filters, [
      { column: "request_id", values: [REQUEST_ID, SECOND_ID] },
    ]);
});

test("each record in a batch names only its own history actors", async () => {
  const [first, second, third] = await fetchFullRecords(fakePostgrest(batchTables()), [
    REQUEST_ID,
    SECOND_ID,
    THIRD_ID,
  ]);
  assert.deepEqual(first.actorNames, {
    "scheduler@example.invalid": "Sam",
    "nurse@example.invalid": "Nora",
  });
  assert.deepEqual(second.actorNames, { "unrelated@example.invalid": "Other Staff" });
  assert.deepEqual(third.actorNames, { "unrelated@example.invalid": "Other Staff" });
  assert.deepEqual(
    second.history.map((entry) => entry.id ?? entry.kind),
    ["second-note", "created"],
  );
});

test("a batch returns records in the order asked and leaves out ids with no request", async () => {
  const records = await fetchFullRecords(fakePostgrest(batchTables()), [
    THIRD_ID,
    MISSING_ID,
    REQUEST_ID,
    THIRD_ID,
  ]);
  assert.deepEqual(
    records.map((record) => record.id),
    [THIRD_ID, REQUEST_ID],
  );
  assert.deepEqual(await fetchFullRecords(fakePostgrest(batchTables()), []), []);
});

test("a batch pages past the server row cap instead of truncating history", async () => {
  const ids = [REQUEST_ID, SECOND_ID, THIRD_ID];
  const whole = await fetchFullRecords(fakePostgrest(batchTables()), ids);
  const client = fakePostgrest(batchTables(), {
    maxRows: { requests: 1, request_transitions: 1, request_events: 1 },
  });
  assert.deepEqual(await fetchFullRecords(client, ids), whole);
  assert.equal(callsTo(client, "requests").length, 3);
  assert.equal(callsTo(client, "request_events").length, 3);
  assert.equal(callsTo(client, "request_transitions").length, 2);
});

test("more than a hundred ids are read in chunks of a hundred", async () => {
  const filler = Array.from(
    { length: FULL_RECORD_BATCH_SIZE },
    (_, index) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(index).padStart(12, "0")}`,
  );
  const client = fakePostgrest(batchTables());
  const records = await fetchFullRecords(client, [...filler, REQUEST_ID]);
  assert.deepEqual(
    records.map((record) => record.id),
    [REQUEST_ID],
  );
  assert.deepEqual(
    callsTo(client, "requests").map((call) => call.filters[0].values.length),
    [FULL_RECORD_BATCH_SIZE, 1],
  );
});

for (const table of ["requests", "request_transitions", "request_events"]) {
  test(`a failed batched ${table} read rejects`, async () => {
    await assert.rejects(
      fetchFullRecords(fakePostgrest(batchTables(), { fail: (call) => call.table === table }), [
        REQUEST_ID,
        SECOND_ID,
      ]),
      /read failed/,
    );
  });
}

test("a batched history read without its count, or that comes up short, rejects", async () => {
  await assert.rejects(
    fetchFullRecords(fakePostgrest(batchTables(), { countless: true }), [REQUEST_ID]),
    /read failed/,
  );
  await assert.rejects(
    fetchFullRecords(fakePostgrest(batchTables(), { extraCount: 1 }), [REQUEST_ID]),
    /read incomplete/,
  );
});

test("an invalid stored row in a batch rejects the whole batch", async () => {
  const tables = batchTables();
  tables.requests[1].source_path = null;
  await assert.rejects(
    fetchFullRecords(fakePostgrest(tables), [REQUEST_ID, SECOND_ID]),
    /Invalid full record/,
  );
});

test("the stored-status read returns every matching record oldest first", async () => {
  const client = fakePostgrest(batchTables());
  const records = await fetchFullRecordsByStoredStatus(client, ["new", "contacted"]);
  assert.deepEqual(
    records.map((record) => [record.id, record.state]),
    [
      [SECOND_ID, "new"],
      [THIRD_ID, "contacted"],
    ],
  );
  const [read] = callsTo(client, "requests");
  assert.deepEqual(read.filters, [{ column: "status", values: ["new", "contacted"] }]);
  assert.deepEqual(read.orders, [
    { column: "created_at", ascending: true },
    { column: "id", ascending: true },
  ]);
  assert.equal(read.count, "exact");
  assert.deepEqual(await fetchFullRecordsByStoredStatus(client, []), []);
});
