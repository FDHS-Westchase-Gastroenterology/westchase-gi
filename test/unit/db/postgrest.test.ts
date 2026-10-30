import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { requestError, toPostgrestTimestamp } from "@/lib/db/postgrest";

void describe("toPostgrestTimestamp", () => {
  void it("writes PostgreSQL's timestamptz text the way PostgREST's JSON did", () => {
    assert.equal(
      toPostgrestTimestamp("2026-10-13 16:31:09.049815+00"),
      "2026-10-13T16:31:09.049815+00:00",
    );
    assert.equal(toPostgrestTimestamp("2026-10-13 16:31:09+00"), "2026-10-13T16:31:09+00:00");
    assert.equal(toPostgrestTimestamp("2026-10-13 12:01:09.5-04"), "2026-10-13T12:01:09.5-04:00");
    assert.equal(toPostgrestTimestamp("2026-10-13 22:01:09+05:30"), "2026-10-13T22:01:09+05:30");
    assert.equal(
      toPostgrestTimestamp("1883-11-18 12:00:00-05:17:32"),
      "1883-11-18T12:00:00-05:17:32",
    );
    assert.equal(toPostgrestTimestamp("10000-01-01 00:00:00+00"), "10000-01-01T00:00:00+00:00");
  });

  void it("leaves infinities as they are", () => {
    assert.equal(toPostgrestTimestamp("infinity"), "infinity");
    assert.equal(toPostgrestTimestamp("-infinity"), "-infinity");
  });
});

void describe("requestError", () => {
  void it("reports a failed request the way postgrest-js reported a failed fetch", () => {
    const failure = new TypeError("fetch failed");
    assert.deepEqual(requestError(failure), {
      code: "",
      message: "TypeError: fetch failed",
      details: failure.stack,
      hint: "",
    });
  });

  void it("adds postgrest-js's hint only for an abort", () => {
    const aborted = new DOMException("This operation was aborted", "AbortError");
    assert.equal(
      requestError(aborted).hint,
      "Request was aborted (timeout or manual cancellation)",
    );
    assert.equal(requestError(aborted).message, "AbortError: This operation was aborted");
    const timedOut = new DOMException("The operation was aborted due to timeout", "TimeoutError");
    assert.equal(requestError(timedOut).hint, "");
  });
});
