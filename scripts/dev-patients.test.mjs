import assert from "node:assert/strict";
import test from "node:test";

import {
  PATIENT_NAMES,
  SEED_SOURCE_PATH,
  countsFromEnv,
  generatePatients,
  patientEmail,
  resolveDevTarget,
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

test("default mix is 15 patients: 10 new, 3 call-again today, 1 stale, 1 later", () => {
  assert.deepEqual(countsFromEnv({}), {
    new: 10,
    callAgain: 3,
    stale: 1,
    upcoming: 1,
    booked: 0,
    closed: 0,
  });
});

test("extra patients land in new, and a short total is refused", () => {
  assert.equal(countsFromEnv({ DEV_SEED_PATIENTS: "20" }).new, 15);
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

  assert.equal(requests.length, 15);
  assert.equal(new Set(requests.map((row) => row.phone)).size, 15);
  assert.equal(new Set(requests.map((row) => row.email)).size, 15);
  assert.equal(requests.filter((row) => row.status === "new").length, 10);
  assert.equal(
    requests.filter((row) => row.status === "contacted" && row.follow_up_at !== null).length,
    4,
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
  }
  assert.equal(events.length, 5);
  assert.equal(
    events.every((event) => requests.some((row) => row.id === event.request_id)),
    true,
  );
});

test("resolveDevTarget refuses Production and accepts a marked Preview Branch", () => {
  assert.equal(resolveDevTarget({}), null);
  assert.throws(
    () =>
      resolveDevTarget({
        NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "test-key",
        SUPABASE_PROJECT_REF: "prod-ref",
        SUPABASE_PROJECT_REF_PROD: "prod-ref",
        SUPABASE_PREVIEW_BRANCH: "1",
      }),
    /Production/,
  );
  assert.throws(
    () =>
      resolveDevTarget({
        NEXT_PUBLIC_SUPABASE_URL: "https://branch.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "test-key",
        SUPABASE_PREVIEW_BRANCH: "0",
      }),
    /Preview Branch/,
  );
  assert.deepEqual(
    resolveDevTarget({
      NEXT_PUBLIC_SUPABASE_URL: "https://branch.supabase.co/",
      SUPABASE_SERVICE_ROLE_KEY: "test-key",
      SUPABASE_PREVIEW_BRANCH: "1",
      SUPABASE_PROJECT_REF: "branch-ref",
      SUPABASE_PROJECT_REF_PROD: "prod-ref",
    }),
    { url: "https://branch.supabase.co", serviceKey: "test-key" },
  );
  assert.equal(
    resolveDevTarget({
      NEXT_PUBLIC_SUPABASE_URL: "https://branch.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-key",
      SUPABASE_PREVIEW_BRANCH: "codex/local-board",
      SUPABASE_PROJECT_REF: "branch-ref",
      SUPABASE_PROJECT_REF_PROD: "prod-ref",
    })?.url,
    "https://branch.supabase.co",
  );
});
