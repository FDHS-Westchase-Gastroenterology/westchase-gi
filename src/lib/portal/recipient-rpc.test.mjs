import assert from "node:assert/strict";
import test from "node:test";
import {
  isRecipientRpcMissing,
  recipientRpcFailureCode,
  runRecipientMutationTransport,
} from "./recipient-rpc.ts";

test("uses the atomic recipient transport when the RPC is available", async () => {
  let compatibilityCalls = 0;
  const atomicResponse = { data: "recipient-id", error: null };
  const result = await runRecipientMutationTransport(
    async () => atomicResponse,
    async () => {
      compatibilityCalls += 1;
      return { ok: true };
    },
  );

  assert.deepEqual(result, {
    transport: "atomic",
    response: atomicResponse,
  });
  assert.equal(compatibilityCalls, 0);
});

test("uses compatibility only for an RPC missing from PostgREST's schema", async () => {
  let compatibilityCalls = 0;
  const result = await runRecipientMutationTransport(
    async () => ({ data: null, error: { code: "PGRST202" } }),
    async () => {
      compatibilityCalls += 1;
      return { ok: true, recipientId: "compatibility-id" };
    },
  );

  assert.deepEqual(result, {
    transport: "compatibility",
    response: { ok: true, recipientId: "compatibility-id" },
  });
  assert.equal(compatibilityCalls, 1);
  assert.equal(isRecipientRpcMissing({ code: "PGRST202" }), true);
});

test("does not use compatibility for permission, database, or validation failures", async () => {
  for (const code of ["42501", "PGRST000", "23514", "22023", undefined]) {
    let compatibilityCalls = 0;
    const atomicResponse = { data: null, error: { code } };
    const result = await runRecipientMutationTransport(
      async () => atomicResponse,
      async () => {
        compatibilityCalls += 1;
        return { ok: true };
      },
    );

    assert.deepEqual(result, {
      transport: "atomic",
      response: atomicResponse,
    });
    assert.equal(compatibilityCalls, 0);
    assert.equal(isRecipientRpcMissing({ code }), false);
  }
});

test("maps duplicate recipient inserts to conflict", () => {
  assert.equal(recipientRpcFailureCode("add", "23505"), "conflict");
});

test("maps unknown toggle and remove targets to not found", () => {
  for (const operation of ["toggle", "remove"]) {
    assert.equal(recipientRpcFailureCode(operation, "P0002"), "not_found");
    assert.equal(recipientRpcFailureCode(operation, "22P02"), "not_found");
  }
});

test("maps every other database failure to unavailable", () => {
  for (const operation of ["add", "toggle", "remove"]) {
    for (const postgresCode of ["23514", "42501", "PGRST202", undefined]) {
      assert.equal(
        recipientRpcFailureCode(operation, postgresCode),
        "unavailable",
      );
    }
  }
});
