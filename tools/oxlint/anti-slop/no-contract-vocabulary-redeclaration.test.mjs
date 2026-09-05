import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

/* Runs oxlint with the repository config against two fixtures: one that
   restates a contract vocabulary three ways, one that derives from it. The
   fixtures live outside the repository so no ignore pattern hides them. */

const RULE = "anti-slop(no-contract-vocabulary-redeclaration)";
const CONFIG = resolve("./.oxlintrc.json");

function lint(file) {
  let raw;
  try {
    raw = execFileSync("npx", ["oxlint", "-c", CONFIG, "--format", "json", file], {
      encoding: "utf8",
    });
  } catch (error) {
    raw = error.stdout;
  }
  const report = JSON.parse(raw);
  return (report.diagnostics ?? []).filter((d) => d.code === RULE);
}

const dir = mkdtempSync(join(tmpdir(), "vocab-rule-"));
test.after(() => {
  rmSync(dir, { recursive: true, force: true });
});

test("a union, an as-const array and a z.enum that restate REQUEST_STATES are each reported", () => {
  const file = join(dir, "restated.ts");
  writeFileSync(
    file,
    [
      'import { z } from "zod";',
      "",
      'export type Copied = "new" | "contacted" | "booked" | "closed";',
      'export const COPIED = ["closed", "booked", "contacted", "new"] as const;',
      'export const schema = z.enum(["new", "contacted", "booked", "closed"]);',
      "",
    ].join("\n"),
  );
  const hits = lint(file);
  assert.equal(hits.length, 3, JSON.stringify(hits, null, 2));
  for (const hit of hits) {
    assert.match(hit.message, /REQUEST_STATES from src\/lib\/portal\/workflow\/contracts\.ts/);
  }
});

test("a subset, a derived union and an unrelated list are not reported", () => {
  const file = join(dir, "derived.ts");
  writeFileSync(
    file,
    [
      'import { REQUEST_STATES } from "../src/lib/portal/workflow/contracts";',
      'import type { RequestState } from "../src/lib/portal/workflow/contracts";',
      "",
      'export type Open = Exclude<RequestState, "closed">;',
      'export const OPEN = ["new", "contacted", "booked"] as const;',
      'export const COLORS = ["red", "green"] as const;',
      "export const ALL = REQUEST_STATES;",
      "",
    ].join("\n"),
  );
  assert.deepEqual(lint(file), []);
});
