import assert from "node:assert/strict";
import test from "node:test";
import { recipientRpcFailureCode } from "./recipient-rpc.ts";

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
