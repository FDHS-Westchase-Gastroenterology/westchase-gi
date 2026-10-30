import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { describeClone, newClones } from "../../../scripts/check-duplication.mjs";

function cloneBetween(isNew: boolean, first: string, second: string) {
  return {
    isNew,
    lines: 12,
    firstFile: { name: first, start: 10, end: 21 },
    secondFile: { name: second, start: 40, end: 51 },
  };
}

const known = cloneBetween(false, "src/lib/a.ts", "src/lib/b.ts");
const added = cloneBetween(true, "src/lib/a.ts", "src/lib/c.ts");
const scratch = cloneBetween(true, "scripts/scratch.mjs", "scripts/gates.mjs");
const report = [known, added, scratch];

void describe("newClones", () => {
  void it("keeps only the clones the baseline lacks", () => {
    assert.deepEqual(newClones(report, null), [added, scratch]);
  });

  void it("keeps a new clone when either side is one of the given paths", () => {
    assert.deepEqual(newClones(report, new Set(["src/lib/c.ts"])), [added]);
    assert.deepEqual(newClones(report, new Set(["src/lib/a.ts"])), [added]);
  });

  void it("ignores new clones in paths outside the list, such as an unstaged scratch file", () => {
    assert.deepEqual(newClones(report, new Set(["src/lib/b.ts"])), []);
  });
});

void describe("describeClone", () => {
  void it("names both sides with their line ranges and the clone's length", () => {
    assert.equal(describeClone(added), "src/lib/a.ts:10-21 ~ src/lib/c.ts:40-51 (12 lines)");
  });
});
