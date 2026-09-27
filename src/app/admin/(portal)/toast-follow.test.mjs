import assert from "node:assert/strict";
import test from "node:test";

import { followed, Rejected, rejectionMessage } from "./toast-follow.ts";

const isOk = (result) => result.ok === true;

test("a followed attempt resolves only with a result the guard accepts", async () => {
  const success = { ok: true, id: "r1" };
  assert.equal(await followed(Promise.resolve(success), isOk), success);
});

test("a result the guard refuses rejects with the sentence the surface would say", async () => {
  const failure = { ok: false, code: "stale_version" };
  await assert.rejects(
    followed(Promise.resolve(failure), isOk, (result) => `Refused: ${result.code}`),
    (cause) => cause instanceof Rejected && cause.message === "Refused: stale_version",
  );
});

test("a refused result with no description still rejects, so a toast without an error branch dismisses", async () => {
  await assert.rejects(
    followed(Promise.resolve({ ok: false, code: "unavailable" }), isOk),
    (cause) => cause instanceof Rejected,
  );
});

test("an attempt that throws rejects with its own cause, not a Rejected", async () => {
  const network = new TypeError("fetch failed");
  await assert.rejects(
    followed(Promise.reject(network), isOk, () => "unused"),
    (cause) => cause === network,
  );
});

test("rejectionMessage reads a Rejected and falls back for anything else", () => {
  assert.equal(
    rejectionMessage(new Rejected("Nothing was saved."), "Fallback."),
    "Nothing was saved.",
  );
  assert.equal(rejectionMessage(new TypeError("fetch failed"), "Fallback."), "Fallback.");
  assert.equal(rejectionMessage(undefined, "Fallback."), "Fallback.");
});
