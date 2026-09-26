import assert from "node:assert/strict";
import test from "node:test";

import { orderQueueRows } from "../src/lib/portal/queue-attention.ts";
import { normalizeRequestState, presentationStatus } from "../src/lib/portal/workflow/contracts.ts";
import {
  PATIENT_NAMES,
  SEED_SOURCE_PATH,
  countsFromEnv,
  generatePatients,
  patientEmail,
} from "./dev-patients.mjs";

function rngFrom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

test("name pool is fifty unique first-last pairs", () => {
  assert.equal(PATIENT_NAMES.length, 50);
  const emails = PATIENT_NAMES.map(([first, last]) => patientEmail(first, last));
  assert.equal(new Set(emails).size, 50);
  assert.equal(patientEmail("Anne-Marie", "Dubois"), "annemarie_dubois@mock.com");
  assert.equal(patientEmail("Maria", "Santos"), "maria_santos@mock.com");
});

test("default mix covers New, Call Again, Scheduled, and Closed", () => {
  assert.deepEqual(countsFromEnv({}), {
    new: 10,
    callAgain: 10,
    stale: 1,
    upcoming: 1,
    booked: 5,
    closed: 5,
  });
});

test("extra patients land in new, and a short total is refused", () => {
  assert.equal(countsFromEnv({ DEV_SEED_PATIENTS: "40" }).new, 18);
  assert.throws(
    () => countsFromEnv({ DEV_SEED_PATIENTS: "5" }),
    /below the configured bucket total/,
  );
  assert.throws(() => countsFromEnv({ DEV_SEED_NEW: "-1" }), /whole number/);
});

test("generated rows use the name pool, fictional phones, and mock.com mailboxes", () => {
  const counts = countsFromEnv({});
  const { requests, events } = generatePatients(
    counts,
    new Date("2026-08-27T16:00:00.000Z"),
    rngFrom(7),
  );
  const nameSet = new Set(PATIENT_NAMES.map(([first, last]) => `${first} ${last}`));

  assert.equal(requests.length, 32);
  assert.equal(new Set(requests.map((row) => row.phone)).size, 32);
  assert.equal(new Set(requests.map((row) => row.email)).size, 32);
  assert.equal(requests.filter((row) => row.status === "new").length, 10);
  assert.equal(
    requests.filter((row) => row.status === "contacted" && row.follow_up_at !== null).length,
    11,
  );
  assert.equal(
    requests.filter((row) => row.status === "contacted" && row.follow_up_at === null).length,
    1,
  );
  for (const row of requests) {
    assert.equal(nameSet.has(row.name), true);
    assert.match(row.phone, /^81355501\d{2}$/);
    assert.match(row.email, /^[a-z]+_[a-z]+@mock\.com$/);
    assert.equal(row.source_path, SEED_SOURCE_PATH);
    assert.equal(normalizeRequestState(row.status), row.status);
  }
  assert.equal(events.length, 44);
  assert.equal(
    events.every((event) => requests.some((row) => row.id === event.request_id)),
    true,
  );
});

test("default fixtures fill the real queue buckets with coherent lifecycle and event fields", () => {
  const now = new Date("2026-09-16T16:00:00.000Z");
  const { requests, events } = generatePatients(countsFromEnv({}), now, rngFrom(19));
  const rows = orderQueueRows(
    requests.map((row) => ({ ...row, status: presentationStatus(row.status) })),
    new Map(),
    now,
  );
  const buckets = {};
  for (const row of rows) buckets[row.bucket] = (buckets[row.bucket] ?? 0) + 1;
  assert.deepEqual(buckets, {
    new: 10,
    follow_up: 10,
    stale: 1,
    upcoming: 1,
    scheduled: 5,
    closed: 5,
  });

  for (const row of requests) {
    const history = events.filter((event) => event.request_id === row.id);
    const received = history.filter((event) => event.type === "created");
    assert.equal(received.length, 1);
    assert.equal(received[0].created_at, row.created_at);
    assert.equal(
      history.every((event) => event.created_at >= row.created_at),
      true,
    );
    assert.equal(
      history.every((event) => event.created_at <= now.toISOString()),
      true,
    );

    if (row.status === "contacted") {
      const contact = history.find((event) => event.type === "contact_attempt");
      assert.equal(contact.meta.follow_up_at, row.follow_up_at);
    } else {
      assert.equal(row.follow_up_at, null);
    }
    if (row.status === "booked") {
      assert.equal(row.record_handoff_at >= row.created_at, true);
      assert.equal(row.appointment_at > now.toISOString(), true);
      assert.equal(row.closed_at, null);
      assert.equal(row.closure_reason, null);
    } else {
      assert.equal(row.record_handoff_at, null);
      assert.equal(row.appointment_at, null);
    }
    if (row.status === "closed") {
      assert.equal(row.closed_at >= row.created_at, true);
      assert.equal(["not_actionable", "wont_schedule"].includes(row.closure_reason), true);
    } else {
      assert.equal(row.closed_at, null);
      assert.equal(row.closure_reason, null);
    }
  }
});
