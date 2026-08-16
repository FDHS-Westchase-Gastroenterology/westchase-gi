import assert from "node:assert/strict";
import test from "node:test";

import plugin from "./index.ts";

test("anti-slop plugin loads as an oxlint jsPlugin", () => {
  assert.equal(plugin.meta.name, "anti-slop");
  assert.ok(plugin.rules);
});
