import assert from "node:assert/strict";
import test from "node:test";

import { fetchRequestWorkSurface } from "../workflow/reads.ts";
import { requestIdSchema } from "./contracts.ts";
import { fetchFullRecord } from "./reads.ts";

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
