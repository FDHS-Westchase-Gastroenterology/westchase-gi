import assert from "node:assert/strict";
import test from "node:test";

import {
  formatStatusList,
  isNewOnlyPrintSelection,
  knownSelectionCount,
  parsePrintStatusSelection,
  printPacketHref,
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
