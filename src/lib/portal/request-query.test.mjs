import assert from "node:assert/strict";
import test from "node:test";

import {
  availableQueueCount,
  parsePage,
  parseRequestSearch,
  requestSearchFilter,
  requestSearchStatus,
  requestsHref,
  uniqueByRequestId,
  REQUEST_SEARCH_MAX_LENGTH,
} from "./request-query.ts";

test("never reports a failed queue read as empty", () => {
  assert.equal(availableQueueCount(0, true), null);
  assert.equal(availableQueueCount(null, false), 0);
  assert.equal(availableQueueCount(3, false), 3);
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
  assert.equal(parseRequestSearch("\0Jane\u001f\tDoe\u007f\u0085Smith"), "Jane Doe Smith");
  assert.equal(
    parseRequestSearch("x".repeat(REQUEST_SEARCH_MAX_LENGTH + 1)).length,
    REQUEST_SEARCH_MAX_LENGTH,
  );
});

test("quotes PostgREST-reserved search syntax", () => {
  const pattern = String.raw`".*Doe, Jane\\. \\(test\\): \"quoted\" \\\\ path %_\\*.*"`;
  assert.equal(
    requestSearchFilter('Doe, Jane. (test): "quoted" \\ path %_*'),
    ["name", "phone", "email"].map((column) => `${column}.imatch.${pattern}`).join(","),
  );
});

test("uniqueByRequestId keeps one row when related matches fan out", () => {
  assert.deepEqual(uniqueByRequestId([]), []);
  assert.deepEqual(uniqueByRequestId([{ id: "a" }]), [{ id: "a" }]);
  assert.deepEqual(uniqueByRequestId([{ id: "a" }, { id: "b" }, { id: "c" }]), [
    { id: "a" },
    { id: "b" },
    { id: "c" },
  ]);
  const related = [
    { id: "req-1", relation: "note-1" },
    { id: "req-1", relation: "note-2" },
    { id: "req-1", relation: "event-1" },
    { id: "req-2", relation: "note-3" },
  ];
  assert.deepEqual(uniqueByRequestId(related), [
    { id: "req-1", relation: "note-1" },
    { id: "req-2", relation: "note-3" },
  ]);
});

test("requestSearchStatus announces zero, one, and many unique results", () => {
  assert.equal(
    requestSearchStatus({ filteredTotal: 0, search: "zzz" }),
    "No appointment requests match that search.",
  );
  assert.equal(
    requestSearchStatus({ filteredTotal: 1, search: "Jane" }),
    "1 matching appointment request.",
  );
  assert.equal(
    requestSearchStatus({ filteredTotal: 3, search: "Jane" }),
    "3 matching appointment requests.",
  );
  assert.equal(requestSearchStatus({ filteredTotal: 27, search: "" }), "27 appointment requests.");
  assert.equal(requestSearchStatus({ filteredTotal: 0, search: "" }), "No appointment requests.");
  assert.equal(requestSearchStatus({ filteredTotal: 1, search: "" }), "1 appointment request.");
});

test("requestsHref keeps search, status, and page bookmarkable", () => {
  assert.equal(requestsHref({ search: "", status: "all" }), "/admin/requests");
  assert.equal(
    requestsHref({ search: "Jane Doe", status: "closed" }),
    "/admin/requests?status=closed&q=Jane+Doe",
  );
  assert.equal(
    requestsHref({ page: 2, search: "Jane", status: "new" }),
    "/admin/requests?status=new&q=Jane&page=2",
  );
  assert.equal(
    requestsHref({
      path: "/admin/requests/export",
      search: "Jane",
      status: "closed",
    }),
    "/admin/requests/export?status=closed&q=Jane",
  );
});
