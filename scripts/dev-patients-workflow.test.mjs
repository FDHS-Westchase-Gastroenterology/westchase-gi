import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { orderQueueRows } from "../src/lib/portal/queue-attention.ts";
import { presentationStatus, REQUEST_STATUSES } from "../src/lib/portal/workflow/contracts.ts";
import { generateScenario, summarizeRequests } from "./dev-patients-scenarios.mjs";
import { seedState } from "./dev-patients-state.mjs";
import { CHILD_TABLES, createSeedStore, digest, scopeSnapshot } from "./dev-patients-store.mjs";
import {
  assertWriteIntent,
  loadSeedEnvironment,
  resolveDevTarget,
} from "./dev-patients-target.mjs";
import { recoverFixtures, regenerateFixtures, verifyFixtures } from "./dev-patients-workflow.mjs";

const NOW = new Date("2026-09-16T19:45:13.000Z");
const SCENARIO = generateScenario("portal-review", {}, "test-scenario", NOW);
const execute = promisify(execFile);

async function localFixtureServer(t) {
  const directory = mkdtempSync(join(tmpdir(), "wgi-fixtures-"));
  const old = generateScenario("portal-review", {}, "previous-batch", NOW);
  const other = {
    ...old.requests[0],
    id: randomUUID(),
    source_path: "/admin/requests/new",
    name: "PRIVATE_NON_SEED_VALUE",
    email: "private@example.test",
    version: 3,
  };
  const data = {
    requests: [...old.requests.map((row) => ({ ...row, version: 1 })), other],
    ...Object.fromEntries(Object.keys(CHILD_TABLES).map((table) => [table, []])),
    staff_profiles: [
      {
        id: randomUUID(),
        user_id: randomUUID(),
        email: "admin@example.test",
        active: true,
        onboarded_at: NOW.toISOString(),
        role: "admin",
      },
    ],
  };
  data.request_events = [
    ...old.events,
    {
      request_id: other.id,
      type: "created",
      status: "recorded",
      meta: {},
      created_at: other.created_at,
    },
  ].map((row) => ({ ...row, id: randomUUID() }));
  data.request_transitions = [
    { id: randomUUID(), request_id: old.requests[0].id, kind: "test-child" },
    { id: randomUUID(), request_id: other.id, kind: "private-child" },
  ];
  data.request_command_receipts = [{ id: randomUUID(), request_id: old.requests[0].id }];
  data.notification_outbox = [{ id: randomUUID(), request_id: old.requests[0].id }];
  data.staff_request_receipts = [{ idempotency_key: randomUUID(), request_id: old.requests[0].id }];
  const calls = [];
  const failures = [];
  const controls = { corruptApp: false, truncate: false, onNewRows: null };
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    const table = url.pathname.split("/").at(-1);
    calls.push({ method: request.method, table });
    const send = (status, value, headers = {}) => {
      response.writeHead(status, { "Content-Type": "application/json", ...headers });
      response.end(JSON.stringify(value));
    };
    const failure = failures.findIndex(
      (item) => item.method === request.method && item.table === table,
    );
    if (failure !== -1) {
      failures.splice(failure, 1);
      send(503, { message: "PRIVATE_PROVIDER_ERROR" });
      return;
    }
    let body = "";
    for await (const chunk of request) body += chunk;
    if (table === "portal_read_request_worklist" || table === "request-worklist") {
      const input = JSON.parse(body);
      const filter = input.p_filter || input;
      const rows = orderQueueRows(
        data.requests.map((row) => ({ ...row, status: presentationStatus(row.status) })),
        new Map(),
        new Date(filter.now || NOW),
      );
      const counts = Object.fromEntries(
        REQUEST_STATUSES.map((status) => [
          status,
          rows.filter((row) => row.status === status).length,
        ]),
      );
      const items = rows.slice(filter.offset, filter.offset + filter.limit).map((row) => ({
        ...row,
        last_activity_at: null,
        last_activity_by: null,
        lastActivityAt: null,
        lastActivityBy: null,
      }));
      send(200, {
        ok: true,
        total: rows.length + Number(controls.corruptApp),
        counts,
        items,
        nextOffset:
          filter.offset + filter.limit < rows.length ? filter.offset + filter.limit : null,
        neighbors: { prevId: null, nextId: null, position: null },
      });
      return;
    }
    if (!(table in data)) {
      send(404, {});
      return;
    }
    const matches = (row) =>
      [...url.searchParams].every(([key, value]) => {
        if (value.startsWith("eq.")) return row[key] === value.slice(3);
        if (value.startsWith("in.(")) return value.slice(4, -1).split(",").includes(row[key]);
        return true;
      });
    if (request.method === "GET") {
      const filtered = data[table].filter(matches);
      const offset = Number(url.searchParams.get("offset"));
      const limit = controls.truncate ? 1 : Number(url.searchParams.get("limit"));
      send(200, filtered.slice(offset, offset + limit), {
        "Content-Range": `0-0/${String(filtered.length)}`,
      });
    } else if (request.method === "POST") {
      const records = JSON.parse(body).map((row) => ({ id: randomUUID(), version: 1, ...row }));
      if (
        table === "request_events" &&
        records.some((row) => !data.requests.some((parent) => parent.id === row.request_id))
      ) {
        send(409, {});
        return;
      }
      data[table].push(...records);
      if (table === "requests" && controls.onNewRows) controls.onNewRows(records);
      send(201, null);
    } else if (request.method === "DELETE" && table === "requests") {
      const ids = new Set(data.requests.filter(matches).map((row) => row.id));
      data.requests = data.requests.filter((row) => !ids.has(row.id));
      for (const [child, column] of Object.entries(CHILD_TABLES)) {
        if (child !== "audit_log") data[child] = data[child].filter((row) => !ids.has(row[column]));
      }
      send(200, null);
    } else send(405, {});
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    server.close();
    await once(server, "close");
    rmSync(directory, { recursive: true, force: true });
  });
  const target = {
    url: `http://127.0.0.1:${String(server.address().port)}`,
    serviceKey: "local-test-key",
    ref: "local",
    kind: "local",
  };
  const context = {
    target,
    store: createSeedStore(target),
    state: seedState(directory, target),
    now: NOW,
    env: { PORTAL_SEED_ADMIN_EMAIL: "admin@example.test" },
    options: { profile: "portal-review", seed: "test-scenario" },
  };
  return { context, data, old, other, calls, failures, controls, directory };
}

test("same profile, seed, and reference clock reproduce fields and real queue buckets", () => {
  assert.deepEqual(generateScenario("portal-review", {}, "test-scenario", NOW), SCENARIO);
  assert.notDeepEqual(generateScenario("portal-review", {}, "different", NOW), SCENARIO);
  assert.deepEqual(summarizeRequests(SCENARIO.requests, NOW).attention, {
    new: 10,
    follow_up: 10,
    stale: 1,
    upcoming: 1,
    scheduled: 5,
    closed: 5,
  });
  assert.equal(
    generateScenario("portal-review", { DEV_SEED_NEW: "99" }, "test", NOW).requests.length,
    32,
  );
  assert.equal(generateScenario("custom", { DEV_SEED_NEW: "12" }, "test", NOW).requests.length, 34);
  assert.throws(() => generateScenario("unknown", {}, "test", NOW), /Unknown profile/);
  assert.throws(
    () => generateScenario("portal-review", {}, "test", new Date("invalid")),
    /reference clock/,
  );
});

test("target guards reject ambiguous, unapproved, Production, and CI writes", () => {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: "https://preview.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "private",
    SUPABASE_BRANCH_PROJECT_REF: "preview",
    SUPABASE_PREVIEW_BRANCH: "feature/preview",
    DEV_SEED_ALLOWED_PROJECT_REF: "preview",
    SUPABASE_PROD_PROJECT_REF: "production",
    SUPABASE_PROD_URL: "https://production.supabase.co",
  };
  const target = resolveDevTarget(env);
  for (const change of [
    { SUPABASE_BRANCH_PROJECT_REF: "production" },
    { NEXT_PUBLIC_SUPABASE_URL: env.SUPABASE_PROD_URL },
    { SUPABASE_PREVIEW_BRANCH: "false" },
    { DEV_SEED_ALLOWED_PROJECT_REF: "wrong" },
    { NEXT_PUBLIC_SUPABASE_URL: "https://user:private@preview.supabase.co" },
    { NEXT_PUBLIC_SUPABASE_URL: "https://preview.supabase.co?token=private" },
    { SUPABASE_PROD_URL: "" },
    { SUPABASE_PROD_PROJECT_REF: "" },
  ])
    assert.throws(() => resolveDevTarget({ ...env, ...change }));
  assert.throws(() => assertWriteIntent(target, {}, {}), /confirm-target/);
  assert.throws(() => assertWriteIntent(target, { confirmTarget: "preview" }, {}), /coordinate/);
  assert.throws(
    () =>
      assertWriteIntent(
        target,
        { confirmTarget: "preview", sharedPreviewReady: true },
        { CI: "true" },
      ),
    /CI/,
  );
  assert.doesNotThrow(() =>
    assertWriteIntent(
      target,
      { confirmTarget: "preview", sharedPreviewReady: true },
      { DEV_SEED: "0" },
    ),
  );
});

test("replacement stages complete rows and events before retiring only the previous seed batch", async (t) => {
  const { context, other, old, calls } = await localFixtureServer(t);
  const before = await context.store.snapshot();
  const otherRequest = structuredClone(other);
  const otherEvent = structuredClone(
    before.request_events.find((row) => row.request_id === other.id),
  );
  const otherTransition = structuredClone(
    before.request_transitions.find((row) => row.request_id === other.id),
  );
  const preserved = digest(
    scopeSnapshot(
      before,
      old.requests.map((row) => row.id),
      false,
    ),
  );
  const result = await regenerateFixtures(context, SCENARIO);
  const after = await context.store.snapshot(old.requests.map((row) => row.id));
  assert.equal(result.preservationChecked, true);
  assert.equal(result.app.serverReadModel.checked, true);
  assert.equal(result.counts.total, 32);
  assert.equal(after.requests.length, 33);
  assert.deepEqual(
    after.requests.find((row) => row.id === other.id),
    otherRequest,
  );
  assert.deepEqual(
    after.request_events.find((row) => row.request_id === other.id),
    otherEvent,
  );
  assert.deepEqual(
    after.request_transitions.find((row) => row.request_id === other.id),
    otherTransition,
  );
  assert.equal(digest(scopeSnapshot(after, [other.id], true)), preserved);
  assert.equal(
    Object.values(
      scopeSnapshot(
        after,
        old.requests.map((row) => row.id),
        true,
      ),
    ).every((rows) => !rows.length),
    true,
  );
  assert.deepEqual(
    calls.filter(
      (call) =>
        ["POST", "DELETE"].includes(call.method) && call.table !== "portal_read_request_worklist",
    ),
    [
      { method: "POST", table: "requests" },
      { method: "POST", table: "request_events" },
      { method: "DELETE", table: "requests" },
    ],
  );
  assert.equal(context.state.pending(), false);
  assert.equal(context.state.receipt().counts.total, 32);
});

test("failed child insertion removes the staged batch and preserves all previous records", async (t) => {
  const { context, failures } = await localFixtureServer(t);
  const before = await context.store.snapshot();
  failures.push({ method: "POST", table: "request_events" });
  await assert.rejects(regenerateFixtures(context, SCENARIO));
  assert.deepEqual(await context.store.snapshot(), before);
  assert.equal(context.state.pending(), false);
});

test("failed rollback leaves a private journal; a fresh recovery instance rolls back safely", async (t) => {
  const { context, failures, directory } = await localFixtureServer(t);
  const before = digest(await context.store.snapshot());
  failures.push(
    { method: "POST", table: "request_events" },
    { method: "DELETE", table: "requests" },
  );
  await assert.rejects(regenerateFixtures(context, SCENARIO), /Journal/);
  assert.equal(statSync(context.state.journalPath).mode & 0o777, 0o600);
  assert.equal(
    readFileSync(context.state.journalPath, "utf8").includes("PRIVATE_NON_SEED_VALUE"),
    false,
  );
  assert.equal((await context.store.snapshot()).requests.length, 65);
  await recoverFixtures({ ...context, state: seedState(directory, context.target) });
  assert.equal(digest(await context.store.snapshot()), before);
});

test("retirement failure preserves both complete batches and recovery finishes replacement", async (t) => {
  const { context, failures } = await localFixtureServer(t);
  failures.push({ method: "DELETE", table: "requests" });
  await assert.rejects(regenerateFixtures(context, SCENARIO), /HTTP 503/);
  assert.equal(context.state.read().phase, "retiring");
  assert.equal((await context.store.snapshot()).requests.length, 65);
  assert.equal((await recoverFixtures(context)).preservationChecked, true);
  assert.equal((await context.store.snapshot()).requests.length, 33);
});

test("recovery can verify a committed deletion after an uncertain response without deleting new rows", async (t) => {
  const { context, failures, old, data } = await localFixtureServer(t);
  failures.push({ method: "DELETE", table: "requests" });
  await assert.rejects(regenerateFixtures(context, SCENARIO));
  const ids = new Set(old.requests.map((row) => row.id));
  data.requests = data.requests.filter((row) => !ids.has(row.id));
  for (const [table, column] of Object.entries(CHILD_TABLES))
    data[table] = data[table].filter((row) => !ids.has(row[column]));
  assert.equal((await recoverFixtures(context)).counts.total, 32);
});

test("concurrent changes to non-seed records are detected and never overwritten", async (t) => {
  const { context, controls, other } = await localFixtureServer(t);
  controls.onNewRows = () => {
    other.version = 4;
  };
  await assert.rejects(regenerateFixtures(context, SCENARIO), /Non-seed/);
  assert.equal(
    (await context.store.snapshot()).requests.find((row) => row.id === other.id).version,
    4,
  );
  assert.equal(context.state.pending(), false);
});

test("unexpected edits to staged records block automatic cleanup and preserve evidence", async (t) => {
  const { context, controls } = await localFixtureServer(t);
  controls.onNewRows = (rows) => {
    rows[0].version = 2;
  };
  await assert.rejects(regenerateFixtures(context, SCENARIO), /Journal/);
  assert.equal(context.state.pending(), true);
  await assert.rejects(recoverFixtures(context), /preserve for review/);
  assert.equal((await context.store.snapshot()).requests.length, 65);
});

test("holds, linked patients, retained audit history, and false seed provenance block all writes", async (t) => {
  const { context, data, calls } = await localFixtureServer(t);
  const row = data.requests[0];
  const protectedCases = [
    () => {
      row.retention_hold_at = NOW.toISOString();
    },
    () => {
      row.retention_hold_at = null;
      data.patient_request_links.push({ request_id: row.id });
    },
    () => {
      data.patient_request_links = [];
      data.audit_log.push({ id: randomUUID(), entity_id: row.id });
    },
    () => {
      data.audit_log = [];
      row.email = "unexpected@example.test";
    },
  ];
  for (const protect of protectedCases) {
    protect();
    await assert.rejects(regenerateFixtures(context, SCENARIO));
  }
  assert.equal(
    calls.some((call) => call.method !== "GET"),
    false,
  );
});

test("truncated reads and app read mismatches fail before any staging", async (t) => {
  const { context, controls, calls } = await localFixtureServer(t);
  controls.truncate = true;
  await assert.rejects(regenerateFixtures(context, SCENARIO), /truncated snapshot/);
  controls.truncate = false;
  controls.corruptApp = true;
  await assert.rejects(regenerateFixtures(context, SCENARIO), /worklist total/);
  assert.equal(
    calls.some((call) => call.table === "requests" && call.method !== "GET"),
    false,
  );
});

test("shared target lock blocks another caller and refuses recovery while its owner is alive", async (t) => {
  const { context, calls } = await localFixtureServer(t);
  const release = context.state.acquire();
  await assert.rejects(regenerateFixtures(context, SCENARIO), /locked/);
  await assert.rejects(recoverFixtures(context), /running/);
  assert.equal(calls.length, 0);
  release();
});

test("verify reads the app service and optional authenticated HTTP with no data mutation", async (t) => {
  const { context, calls, directory } = await localFixtureServer(t);
  const path = join(directory, "session.json");
  writeFileSync(
    path,
    JSON.stringify({
      cookies: [
        { domain: "127.0.0.1", name: "test-session", value: "private-session", expires: -1 },
      ],
    }),
  );
  context.options.appUrl = context.target.url;
  context.options.storageState = path;
  const result = await verifyFixtures(context, await context.store.snapshot(), SCENARIO);
  assert.equal(result.app.http.checked, true);
  assert.equal(
    calls.every(
      (call) =>
        call.method === "GET" ||
        ["portal_read_request_worklist", "request-worklist"].includes(call.table),
    ),
    true,
  );
});

test("CLI inspect is read-only, identifies its checkout and environment, and prints no patient fields or secrets", async (t) => {
  const { context, calls, directory } = await localFixtureServer(t);
  const path = join(directory, "fixtures.env");
  writeFileSync(
    path,
    `NEXT_PUBLIC_SUPABASE_URL=${context.target.url}\nSUPABASE_PROJECT_REF=local\nSUPABASE_SERVICE_ROLE_KEY=local-test-key\nPORTAL_SEED_ADMIN_EMAIL=admin@example.test\nDEV_SEED=0\n`,
  );
  const loaded = loadSeedEnvironment(process.cwd(), path, { DEV_SEED: "1" });
  assert.equal(loaded.env.DEV_SEED, "1");
  const { stdout } = await execute(process.execPath, [
    "--import",
    "./test/register.mjs",
    "scripts/dev-patients-cli.mjs",
    "inspect",
    "--env-file",
    path,
    "--now",
    NOW.toISOString(),
  ]);
  const result = JSON.parse(stdout);
  assert.equal(result.command, "inspect");
  assert.equal(result.target.kind, "local");
  assert.equal(result.environment.file, path);
  assert.equal(result.current.seed.total, 32);
  assert.equal(result.startup.seedsAutomatically, false);
  assert.equal(stdout.includes("PRIVATE_NON_SEED_VALUE"), false);
  assert.equal(stdout.includes("local-test-key"), false);
  assert.equal(stdout.includes("admin@example.test"), false);
  assert.equal(
    calls.every((call) => call.method === "GET"),
    true,
  );
  const scripts = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ).scripts;
  assert.equal(scripts.dev, "next dev");
});
