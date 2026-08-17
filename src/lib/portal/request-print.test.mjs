import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import { pathToFileURL } from "node:url";

register(
  `data:text/javascript,${encodeURIComponent(`
    export async function resolve(specifier, context, nextResolve) {
      if (specifier === "server-only") {
        return { shortCircuit: true, url: "data:text/javascript,export {}", format: "module" };
      }
      if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\\.(?:[cm]?[jt]s|json|mjs|cjs|tsx|jsx)$/.test(specifier)) {
        try { return await nextResolve(specifier + ".ts", context); } catch { /* fall through */ }
      }
      return nextResolve(specifier, context);
    }
  `)}`,
  pathToFileURL("./"),
);

const { prepareNewRequestPrintPacket } = await import("./request-print.ts");

const GENERATED_AT = "2026-08-09T12:00:00.000Z";
const FIRST_ROW = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Fictional One",
  phone: "000-000-0001",
  email: null,
  location: "tampa",
  preferred_time: "morning",
  message: "Fictional message.",
  locale: "en",
  source_path: "/en/appointment",
  created_at: "2026-08-09T09:00:00.000Z",
};
const SECOND_ROW = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Fictional Two",
  phone: "000-000-0002",
  email: "fictional@example.test",
  location: "lutz",
  preferred_time: "afternoon",
  message: null,
  locale: "es",
  source_path: "/es/appointment",
  created_at: "2026-08-09T10:00:00.000Z",
};

function rpcHarness(result) {
  const calls = [];
  return {
    calls,
    db: {
      rpc(name, parameters) {
        calls.push({ name, parameters });
        return result instanceof Error ? Promise.reject(result) : Promise.resolve(result);
      },
    },
  };
}

function packet(requests, generatedAt = GENERATED_AT) {
  return { data: { generated_at: generatedAt, requests }, error: null };
}

test("maps one oldest-first RPC packet and passes only the server actor", async () => {
  const harness = rpcHarness(packet([FIRST_ROW, SECOND_ROW]));
  const result = await prepareNewRequestPrintPacket({
    db: harness.db,
    actorEmail: "staff@example.test",
  });

  assert.deepEqual(harness.calls, [
    {
      name: "portal_prepare_new_request_print_packet",
      parameters: { p_actor_email: "staff@example.test" },
    },
  ]);
  assert.deepEqual(result, {
    ok: true,
    generatedAt: GENERATED_AT,
    requests: [
      {
        id: FIRST_ROW.id,
        name: FIRST_ROW.name,
        phone: FIRST_ROW.phone,
        email: null,
        location: "tampa",
        preferredTime: "morning",
        message: FIRST_ROW.message,
        locale: "en",
        sourcePath: "/en/appointment",
        createdAt: FIRST_ROW.created_at,
      },
      {
        id: SECOND_ROW.id,
        name: SECOND_ROW.name,
        phone: SECOND_ROW.phone,
        email: SECOND_ROW.email,
        location: "lutz",
        preferredTime: "afternoon",
        message: null,
        locale: "es",
        sourcePath: "/es/appointment",
        createdAt: SECOND_ROW.created_at,
      },
    ],
  });
});

test("preserves a successfully empty packet", async () => {
  const harness = rpcHarness(packet([]));
  assert.deepEqual(
    await prepareNewRequestPrintPacket({
      db: harness.db,
      actorEmail: "staff@example.test",
    }),
    { ok: true, generatedAt: GENERATED_AT, requests: [] },
  );
});

test("fails closed for RPC errors and thrown transports", async () => {
  for (const result of [{ data: null, error: { code: "PGRST000" } }, new Error("unavailable")]) {
    const harness = rpcHarness(result);
    assert.deepEqual(
      await prepareNewRequestPrintPacket({
        db: harness.db,
        actorEmail: "staff@example.test",
      }),
      { ok: false },
    );
  }
});

test("fails closed for malformed packet objects and arrays", async () => {
  const malformed = [
    null,
    [],
    { generated_at: GENERATED_AT },
    { generated_at: GENERATED_AT, requests: {}, extra: true },
    { generated_at: GENERATED_AT, requests: [FIRST_ROW], extra: true },
  ];
  for (const data of malformed) {
    const harness = rpcHarness({ data, error: null });
    assert.deepEqual(
      await prepareNewRequestPrintPacket({
        db: harness.db,
        actorEmail: "staff@example.test",
      }),
      { ok: false },
    );
  }
});

test("fails closed for malformed rows, timestamps, and enums", async () => {
  const malformedRows = [
    { ...FIRST_ROW, name: null },
    { ...FIRST_ROW, created_at: "not-a-timestamp" },
    { ...FIRST_ROW, location: "other" },
    { ...FIRST_ROW, preferred_time: "evening" },
    { ...FIRST_ROW, unexpected: true },
  ];
  const cases = [
    packet([FIRST_ROW], "not-a-timestamp"),
    ...malformedRows.map((row) => packet([row])),
  ];
  for (const result of cases) {
    const harness = rpcHarness(result);
    assert.deepEqual(
      await prepareNewRequestPrintPacket({
        db: harness.db,
        actorEmail: "staff@example.test",
      }),
      { ok: false },
    );
  }
});

test("fails closed for duplicate IDs and out-of-order rows", async () => {
  for (const requests of [
    [FIRST_ROW, { ...SECOND_ROW, id: FIRST_ROW.id }],
    [SECOND_ROW, FIRST_ROW],
    [SECOND_ROW, { ...FIRST_ROW, created_at: SECOND_ROW.created_at }],
  ]) {
    const harness = rpcHarness(packet(requests));
    assert.deepEqual(
      await prepareNewRequestPrintPacket({
        db: harness.db,
        actorEmail: "staff@example.test",
      }),
      { ok: false },
    );
  }
});

test("preserves PostgreSQL microsecond order before applying the UUID tie-breaker", async () => {
  const earlier = {
    ...FIRST_ROW,
    id: SECOND_ROW.id,
    created_at: "2026-08-09T09:00:00.000001+00:00",
  };
  const later = {
    ...SECOND_ROW,
    id: FIRST_ROW.id,
    created_at: "2026-08-09T09:00:00.000999+00:00",
  };
  const harness = rpcHarness(packet([earlier, later]));

  const result = await prepareNewRequestPrintPacket({
    db: harness.db,
    actorEmail: "staff@example.test",
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.ok ? result.requests.map((request) => request.id) : [], [
    SECOND_ROW.id,
    FIRST_ROW.id,
  ]);
});

test("rejects reversed PostgreSQL microseconds inside one millisecond", async () => {
  const later = {
    ...FIRST_ROW,
    created_at: "2026-08-09T09:00:00.000999+00:00",
  };
  const earlier = {
    ...SECOND_ROW,
    created_at: "2026-08-09T09:00:00.000001+00:00",
  };
  const harness = rpcHarness(packet([later, earlier]));

  assert.deepEqual(
    await prepareNewRequestPrintPacket({
      db: harness.db,
      actorEmail: "staff@example.test",
    }),
    { ok: false },
  );
});
