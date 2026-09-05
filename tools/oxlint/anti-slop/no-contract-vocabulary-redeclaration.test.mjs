import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

/* Runs the rule, with the owner list the repository configures, against two
   fixtures: one that restates a contract vocabulary three ways, one that
   derives from it. The fixtures and a minimal config live in a temp
   directory so nothing else in .oxlintrc.json (ignore patterns, type-aware
   rules that need a tsconfig) can hide or break the result. */

const RULE = "anti-slop/no-contract-vocabulary-redeclaration";
const REPO_CONFIG = JSON.parse(readFileSync(resolve("./.oxlintrc.json"), "utf8"));
const RULE_OPTIONS = REPO_CONFIG.rules[RULE];

const dir = mkdtempSync(join(tmpdir(), "vocab-rule-"));
const configPath = join(dir, ".oxlintrc.json");
writeFileSync(
  configPath,
  JSON.stringify({
    categories: { correctness: "off" },
    jsPlugins: [{ name: "anti-slop", specifier: resolve("./tools/oxlint/anti-slop/index.ts") }],
    rules: { [RULE]: RULE_OPTIONS },
  }),
);
test.after(() => {
  rmSync(dir, { recursive: true, force: true });
});

function lint(file) {
  let raw;
  try {
    raw = execFileSync("npx", ["oxlint", "-c", configPath, "--format", "json", file], {
      encoding: "utf8",
      cwd: resolve("."),
    });
  } catch (error) {
    raw = error.stdout;
  }
  let report;
  try {
    report = JSON.parse(raw);
  } catch {
    throw new Error(`oxlint did not return JSON:\n${raw}`);
  }
  return (report.diagnostics ?? []).filter(
    (d) => d.code === "anti-slop(no-contract-vocabulary-redeclaration)",
  );
}

test("the repository config enables the rule with at least the two contract modules as owners", () => {
  assert.equal(RULE_OPTIONS[0], "error");
  const owners = RULE_OPTIONS[1].owners;
  assert.ok(owners.includes("src/lib/portal/workflow/contracts.ts"));
  assert.ok(owners.includes("src/lib/portal/contracts.ts"));
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
