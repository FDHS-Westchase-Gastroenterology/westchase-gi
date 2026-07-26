import assert from "node:assert/strict";
import test from "node:test";
import {
  availableQueueCount,
  parsePage,
  parseRequestSearch,
  requestSearchFilter,
  REQUEST_SEARCH_MAX_LENGTH,
} from "./request-query.ts";

test("never reports a failed queue read as empty", () => {
  assert.equal(availableQueueCount(0, new Error("read failed")), null);
  assert.equal(availableQueueCount(null, null), 0);
  assert.equal(availableQueueCount(3, null), 3);
});

test("parses a bounded positive page", () => {
  assert.equal(parsePage("2"), 2);
  assert.equal(parsePage(["3", "4"]), 3);
  assert.equal(parsePage("10001"), 10_000);
  for (const value of [undefined, "", "0", "-1", "1.5", "nope"]) {
    assert.equal(parsePage(value), 1);
  }
});

test("normalizes and bounds request search", () => {
  assert.equal(parseRequestSearch(["  Jane \n Doe  ", "ignored"]), "Jane Doe");
  assert.equal(
    parseRequestSearch("\0Jane\u001f\tDoe\u007f\u0085Smith"),
    "Jane Doe Smith",
  );
  assert.equal(
    parseRequestSearch("x".repeat(REQUEST_SEARCH_MAX_LENGTH + 1)).length,
    REQUEST_SEARCH_MAX_LENGTH,
  );
});

test("quotes PostgREST-reserved search syntax", () => {
  const pattern = String.raw`".*Doe, Jane\\. \\(test\\): \"quoted\" \\\\ path %_\\*.*"`;
  assert.equal(
    requestSearchFilter('Doe, Jane. (test): "quoted" \\ path %_*'),
    ["name", "phone", "email"]
      .map((column) => `${column}.imatch.${pattern}`)
      .join(","),
  );
});
