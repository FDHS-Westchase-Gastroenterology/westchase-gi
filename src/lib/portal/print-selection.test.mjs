import assert from "node:assert/strict";
import test from "node:test";

import {
  formatStatusList,
  isNewOnlyPrintSelection,
  knownSelectionCount,
  parsePrintIdSelection,
  parsePrintStatusSelection,
  PRINT_ID_LIMIT,
  printPacketHref,
  printPacketIdsHref,
  printSelectionIsAvailable,
} from "./print-selection.ts";

const STATUS_LABELS = {
  new: "New",
  contacted: "Contacted",
  scheduled: "Scheduled",
  closed: "Closed",
};

test("parsePrintStatusSelection keeps query order and rejects unknown values", () => {
  assert.equal(parsePrintStatusSelection(undefined), "default");
  assert.deepEqual(parsePrintStatusSelection("new"), ["new"]);
  assert.deepEqual(parsePrintStatusSelection("contacted,new,contacted"), ["contacted", "new"]);
  assert.deepEqual(parsePrintStatusSelection(["scheduled", "closed"]), ["scheduled", "closed"]);
  assert.equal(parsePrintStatusSelection(""), "invalid");
  assert.equal(parsePrintStatusSelection("open"), "invalid");
});

test("printPacketHref reuses the New packet URL for New-only work", () => {
  assert.equal(printPacketHref(["new"]), "/admin/requests/print?auto=1");
  assert.equal(printPacketHref(["new"], false), "/admin/requests/print");
  assert.equal(
    printPacketHref(["new", "contacted"]),
    "/admin/requests/print?status=new%2Ccontacted&auto=1",
  );
});

const FIRST_ID = "00000000-0000-4000-8000-000000000001";
const SECOND_ID = "00000000-0000-4000-8000-000000000002";

test("parsePrintIdSelection keeps chosen request ids in order, once each", () => {
  assert.deepEqual(parsePrintIdSelection(`${SECOND_ID},${FIRST_ID}`), [SECOND_ID, FIRST_ID]);
  assert.deepEqual(parsePrintIdSelection([FIRST_ID, `${SECOND_ID},${FIRST_ID}`]), [
    FIRST_ID,
    SECOND_ID,
  ]);
  assert.deepEqual(parsePrintIdSelection(` ${FIRST_ID} `), [FIRST_ID]);
  assert.deepEqual(parsePrintIdSelection(FIRST_ID.toUpperCase()), [FIRST_ID]);
});

test("parsePrintIdSelection rejects a missing, empty, malformed, or oversized list", () => {
  const limit = Array.from(
    { length: PRINT_ID_LIMIT },
    (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  );
  assert.equal(PRINT_ID_LIMIT, 100);
  assert.equal(parsePrintIdSelection(limit.join(","))?.length, PRINT_ID_LIMIT);
  for (const invalid of [
    undefined,
    "",
    ",",
    `${FIRST_ID},`,
    `${FIRST_ID},not-a-uuid`,
    "new",
    [],
    [...limit, "00000000-0000-4000-8000-999999999999"].join(","),
  ]) {
    assert.equal(parsePrintIdSelection(invalid), null, String(invalid));
  }
});

test("printPacketIdsHref names the chosen requests and starts printing when asked", () => {
  assert.equal(
    printPacketIdsHref([SECOND_ID, FIRST_ID]),
    `/admin/requests/print?ids=${SECOND_ID},${FIRST_ID}&auto=1`,
  );
  assert.equal(printPacketIdsHref([FIRST_ID], false), `/admin/requests/print?ids=${FIRST_ID}`);
  const href = new URL(printPacketIdsHref([SECOND_ID, FIRST_ID]), "http://localhost");
  assert.deepEqual(parsePrintIdSelection(href.searchParams.get("ids") ?? undefined), [
    SECOND_ID,
    FIRST_ID,
  ]);
});

test("New-only detection treats the default packet as New", () => {
  assert.equal(isNewOnlyPrintSelection("default"), true);
  assert.equal(isNewOnlyPrintSelection(["new"]), true);
  assert.equal(isNewOnlyPrintSelection(["new", "contacted"]), false);
  assert.equal(isNewOnlyPrintSelection("invalid"), false);
});

test("status lists and availability stay honest", () => {
  assert.equal(formatStatusList(["new"], STATUS_LABELS), "New");
  assert.equal(formatStatusList(["new", "contacted"], STATUS_LABELS), "New and Contacted");
  assert.equal(
    formatStatusList(["new", "contacted", "closed"], STATUS_LABELS),
    "New, Contacted, and Closed",
  );
  assert.equal(knownSelectionCount(["new"], { new: 5 }), 5);
  assert.equal(knownSelectionCount(["new", "contacted"], { new: 5 }), null);
  assert.equal(printSelectionIsAvailable([], { new: 5 }), false);
  assert.equal(printSelectionIsAvailable(["new"], { new: 0 }), false);
  assert.equal(printSelectionIsAvailable(["new"], { new: null }), false);
  assert.equal(printSelectionIsAvailable(["contacted"], { new: 0 }), true);
  assert.equal(printSelectionIsAvailable(["new", "contacted"], { new: 0, contacted: 2 }), true);
});
