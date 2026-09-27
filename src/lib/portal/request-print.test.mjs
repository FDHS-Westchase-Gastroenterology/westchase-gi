import assert from "node:assert/strict";
import test from "node:test";

import { fakePostgrest } from "../../../test/fake-postgrest.mjs";
import { PRINT_ID_LIMIT } from "./print-selection.ts";
import { prepareIdRequestPrintPacket, prepareStatusRequestPrintPacket } from "./request-print.ts";

const OLDER = "00000000-0000-4000-8000-000000000001";
const NEWER = "00000000-0000-4000-8000-000000000002";
const BOOKED = "00000000-0000-4000-8000-000000000003";
const CLOSED = "00000000-0000-4000-8000-000000000004";
const MISSING = "00000000-0000-4000-8000-000000000009";

function requestRow(id, overrides) {
  return {
    id,
    name: `Fictional ${id.slice(-1)}`,
    phone: "000-000-0000",
    email: null,
    location: "tampa",
    preferred_time: "morning",
    message: null,
    locale: "en",
    source_path: "/en/appointment",
    created_at: "2026-08-09T09:00:00.000Z",
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

function tables(requests) {
  return {
    requests: requests ?? [
      requestRow(NEWER, { created_at: "2026-08-09T10:00:00.000Z" }),
      requestRow(OLDER, { created_at: "2026-08-09T09:00:00.000Z" }),
      requestRow(BOOKED, { created_at: "2026-08-09T08:00:00.000Z", status: "booked" }),
      requestRow(CLOSED, { created_at: "2026-08-09T07:00:00.000Z", status: "closed" }),
    ],
    request_transitions: [],
    request_events: [],
    staff_profiles: [],
  };
}

function ids(result) {
  return result.ok ? result.records.map((record) => record.id) : result;
}

test("a status packet prints every request in those statuses, oldest first", async () => {
  const db = fakePostgrest(tables());
  const result = await prepareStatusRequestPrintPacket({ db, statuses: ["new", "scheduled"] });

  assert.deepEqual(ids(result), [BOOKED, OLDER, NEWER]);
  assert.ok(result.ok && !Number.isNaN(Date.parse(result.preparedAt)));
  assert.deepEqual(db.calls.find((call) => call.table === "requests").filters, [
    { column: "status", values: ["new", "booked", "scheduled"] },
  ]);
});

test("the New packet is the same status read, with no database procedure", async () => {
  const db = fakePostgrest(tables());
  const result = await prepareStatusRequestPrintPacket({ db, statuses: ["new"] });

  assert.deepEqual(ids(result), [OLDER, NEWER]);
  assert.equal("rpc" in db, false);
});

test("an empty status packet is a successful packet of nothing", async () => {
  const result = await prepareStatusRequestPrintPacket({
    db: fakePostgrest(tables([])),
    statuses: ["contacted"],
  });
  assert.deepEqual(ids(result), []);
});

test("a status packet fails closed for no statuses, a failed read, or a row outside the choice", async () => {
  assert.deepEqual(
    await prepareStatusRequestPrintPacket({ db: fakePostgrest(tables()), statuses: [] }),
    { ok: false, reason: "unavailable" },
  );
  assert.deepEqual(
    await prepareStatusRequestPrintPacket({
      db: fakePostgrest(tables(), { fail: (call) => call.table === "request_events" }),
      statuses: ["new"],
    }),
    { ok: false, reason: "unavailable" },
  );
  assert.deepEqual(
    await prepareStatusRequestPrintPacket({
      db: fakePostgrest(tables(), { ignoreFilters: ["requests"] }),
      statuses: ["new"],
    }),
    { ok: false, reason: "unavailable" },
  );
});

test("an id packet prints exactly the chosen requests, oldest first", async () => {
  const db = fakePostgrest(tables());
  const result = await prepareIdRequestPrintPacket({ db, ids: [NEWER, CLOSED, OLDER] });

  assert.deepEqual(ids(result), [CLOSED, OLDER, NEWER]);
  assert.deepEqual(db.calls.find((call) => call.table === "requests").filters, [
    { column: "id", values: [NEWER, CLOSED, OLDER] },
  ]);
});

test("an id packet with a request that no longer exists prints nothing", async () => {
  assert.deepEqual(
    await prepareIdRequestPrintPacket({ db: fakePostgrest(tables()), ids: [OLDER, MISSING] }),
    { ok: false, reason: "missing" },
  );
});

test("an id packet fails closed for an empty, repeated, oversized, or malformed list", async () => {
  const tooMany = Array.from(
    { length: PRINT_ID_LIMIT + 1 },
    (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  );
  for (const list of [[], [OLDER, OLDER], tooMany, ["not-a-uuid"], [` ${OLDER}`]]) {
    const db = fakePostgrest(tables());
    assert.deepEqual(await prepareIdRequestPrintPacket({ db, ids: list }), {
      ok: false,
      reason: "unavailable",
    });
    assert.deepEqual(db.calls, [], "an invalid list reads nothing");
  }
});

test("an id packet fails closed when a read fails", async () => {
  for (const table of ["requests", "request_transitions"]) {
    assert.deepEqual(
      await prepareIdRequestPrintPacket({
        db: fakePostgrest(tables(), { fail: (call) => call.table === table }),
        ids: [OLDER],
      }),
      { ok: false, reason: "unavailable" },
    );
  }
});

test("PostgreSQL microseconds order a packet before the id tie-breaker", async () => {
  const requests = [
    requestRow(OLDER, { created_at: "2026-08-09T09:00:00.000002Z" }),
    requestRow(NEWER, { created_at: "2026-08-09T09:00:00.000001Z" }),
    requestRow(BOOKED, { created_at: "2026-08-09T09:00:00.000001+00:00" }),
  ];
  const result = await prepareIdRequestPrintPacket({
    db: fakePostgrest(tables(requests)),
    ids: [OLDER, NEWER, BOOKED],
  });
  assert.deepEqual(ids(result), [NEWER, BOOKED, OLDER]);
});

test("an unreadable creation time fails the packet rather than guessing its order", async () => {
  const requests = [requestRow(OLDER), requestRow(NEWER, { created_at: "2026-08-09 09:00:00" })];
  assert.deepEqual(
    await prepareIdRequestPrintPacket({ db: fakePostgrest(tables(requests)), ids: [OLDER, NEWER] }),
    { ok: false, reason: "unavailable" },
  );
});
