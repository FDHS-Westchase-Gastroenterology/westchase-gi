import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout } from "node:timers/promises";

import { measureBackend, setPerformanceDetail, timedSupabaseFetch } from "./performance.ts";

// Owns the new logger's privacy and async-lifecycle contract. Existing domain tests
// Cover business outcomes; they do not observe emitted telemetry or concurrent scopes.
test("timing preserves values and limits telemetry to fixed labels and numeric aggregates", async (t) => {
  const lines = [];
  t.mock.method(console, "info", (line) => lines.push(JSON.parse(line)));
  const response = new Response("private response body");
  t.mock.method(globalThis, "fetch", async () => response);
  const privateResult = { ok: true, patient: "private name", email: "private@example.test" };
  const returned = await measureBackend("patients.command", async () => {
    setPerformanceDetail("create");
    setPerformanceDetail("private name");
    const fetched = await timedSupabaseFetch("https://example.test/private-id?name=secret", {
      headers: { authorization: "secret-token" },
      body: "secret-note",
      method: "POST",
    });
    assert.equal(fetched, response);
    assert.equal(await fetched.text(), "private response body");
    return privateResult;
  });
  assert.equal(returned, privateResult);
  assert.equal(lines.length, 1);
  const [{ duration_ms, upstream_headers_ms, ...record }] = lines;
  assert.ok(duration_ms >= 0 && upstream_headers_ms >= 0);
  assert.deepEqual(record, {
    event: "portal.performance",
    schema: 1,
    operation: "patients.command",
    detail: "create",
    outcome: "success",
    upstream_calls: 1,
    upstream_failed_calls: 0,
  });
  await measureBackend("private name", async () => privateResult);
  assert.equal(lines.length, 1, "unknown operation labels must never be emitted");
});

test("concurrent operations isolate counts and classify returned failures", async (t) => {
  const lines = [];
  t.mock.method(console, "info", (line) => lines.push(JSON.parse(line)));
  t.mock.method(globalThis, "fetch", async () => {
    await setTimeout(5);
    return new Response(null, { status: 503 });
  });
  const rejected = { ok: false, code: "private failure text" };
  await Promise.all([
    measureBackend("patients.read", async () => {
      await timedSupabaseFetch("https://example.test");
      return rejected;
    }),
    measureBackend("billing.operation", async () => {
      setPerformanceDetail("read");
      await setTimeout(1);
      return new Response(null, { status: 401 });
    }),
  ]);
  assert.equal(lines.length, 2);
  assert.ok(lines.every((line) => line.outcome === "rejected"));
  const patients = lines.find((line) => line.operation === "patients.read");
  const billing = lines.find((line) => line.operation === "billing.operation");
  assert.equal(patients.upstream_calls, 1);
  assert.equal(patients.upstream_failed_calls, 1);
  assert.equal(patients.detail, null);
  assert.equal(billing.upstream_calls, 0);
  assert.equal(billing.detail, "read");
});

test("transport exceptions and framework throws retain identity without logging their content", async (t) => {
  const lines = [];
  t.mock.method(console, "info", (line) => lines.push(JSON.parse(line)));
  const original = new Error("NEXT_REDIRECT;private-patient-url");
  t.mock.method(globalThis, "fetch", async () => {
    throw original;
  });
  await assert.rejects(
    measureBackend("requests.createStaffRequest", async () => {
      await timedSupabaseFetch("https://example.test");
    }),
    (error) => error === original,
  );
  assert.equal(lines[0].outcome, "thrown");
  assert.equal(lines[0].upstream_failed_calls, 1);
  assert.equal(JSON.stringify(lines).includes("private-patient"), false);
  t.mock.method(console, "info", () => {
    throw new Error("logger unavailable");
  });
  const value = await measureBackend("patients.read", async () => 42);
  assert.equal(value, 42);
  await assert.rejects(
    measureBackend("patients.read", async () => {
      throw original;
    }),
    (error) => error === original,
  );
});

test("disabled logging leaves the operation and transport intact", async (t) => {
  const previous = process.env.PORTAL_PERFORMANCE_LOGS;
  process.env.PORTAL_PERFORMANCE_LOGS = "0";
  t.after(() => {
    if (previous === undefined) delete process.env.PORTAL_PERFORMANCE_LOGS;
    else process.env.PORTAL_PERFORMANCE_LOGS = previous;
  });
  const logger = t.mock.method(console, "info", () => {});
  const response = new Response("value");
  const transport = t.mock.method(globalThis, "fetch", async () => response);
  assert.equal(
    await measureBackend("patients.read", () => timedSupabaseFetch("https://example.test")),
    response,
  );
  assert.equal(transport.mock.callCount(), 1);
  assert.equal(logger.mock.callCount(), 0);
});

test("successful POST/redirect/GET responses are redirects, not rejected saves", async (t) => {
  const lines = [];
  t.mock.method(console, "info", (line) => lines.push(JSON.parse(line)));
  const response = new Response(null, {
    status: 303,
    headers: { Location: "https://example.test/private-receipt" },
  });
  assert.equal(await measureBackend("intake.form", async () => response), response);
  assert.equal(lines[0].outcome, "redirect");
  assert.equal(JSON.stringify(lines).includes("private-receipt"), false);
});
