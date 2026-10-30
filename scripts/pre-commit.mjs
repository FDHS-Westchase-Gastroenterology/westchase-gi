#!/usr/bin/env node
/**
 * The checks .githooks/pre-commit runs on the files a commit stages:
 *
 *   local-only guard   no machine-local path is staged (scripts/check-local-only.mjs)
 *   oxfmt              staged files match .oxfmtrc.json
 *   oxlint             staged JavaScript and TypeScript has no warning or error
 *   duplication        the staged files add no clone .jscpd-baseline.json lacks, and the total
 *                      stays under the cap
 *
 * Every check runs, so one attempt reports every problem. A partly staged file is
 * format-checked as staged; oxlint and jscpd read its working-tree copy, and the hook says so.
 * The standing gates in AGENTS.md still cover the whole repository before a pull request.
 */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { checkDuplication } from "./check-duplication.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OXFMT = join(repoRoot, "node_modules", ".bin", "oxfmt");
const OXLINT = join(repoRoot, "node_modules", ".bin", "oxlint");
const LINTED = /\.(?:[cm]?[jt]sx?|vue)$/u;
const SCANNED_FOR_CLONES = /\.(?:[cm]?[jt]sx?|css)$/u;
const DUPLICATION_CONFIG = new Set([".jscpd.json", ".jscpd-baseline.json"]);

function run(command, args, input) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    input,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function git(args) {
  const result = run("git", args);
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout;
}

function pathList(output) {
  return output.split("\0").filter(Boolean);
}

/** The guard reports a violation on stderr; its clean line would repeat this hook's own. */
function localOnlyGuard() {
  const result = spawnSync(process.execPath, ["scripts/check-local-only.mjs", "staged"], {
    cwd: repoRoot,
    stdio: ["ignore", "ignore", "inherit"],
  });
  return result.status === 0;
}

/** Oxfmt's verdict on the staged blob, which differs from the file on disk. */
function stagedFormatProblem(path) {
  const staged = git(["show", `:${path}`]);
  const result = run(OXFMT, [`--stdin-filepath=${path}`], staged);
  if (result.status === 0) return result.stdout === staged ? null : "not formatted";
  if (result.stderr.includes("Unsupported file type")) return null;
  return result.stderr.trim();
}

function formatCheck(staged, partial) {
  const whole = staged.filter((path) => !partial.has(path));
  let clean = true;
  if (whole.length > 0) {
    const result = run(OXFMT, ["--check", "--no-error-on-unmatched-pattern", ...whole]);
    if (result.status !== 0) {
      console.error(`${result.stdout}${result.stderr}`.trimEnd());
      clean = false;
    }
  }
  for (const path of partial) {
    const problem = stagedFormatProblem(path);
    if (problem !== null) {
      console.error(`${path} (staged version): ${problem}`);
      clean = false;
    }
  }
  if (!clean) console.error("Run `npx oxfmt <file>` and stage the result.");
  return clean;
}

function lintCheck(staged) {
  const files = staged.filter((path) => LINTED.test(path));
  if (files.length === 0) return true;
  const result = run(OXLINT, ["--deny-warnings", ...files]);
  const output = `${result.stdout}${result.stderr}`;
  // Oxlint exits non-zero when every path it is given matches .oxlintrc.json ignorePatterns.
  if (result.status === 0 || output.includes("No files found to lint")) return true;
  console.error(output.trimEnd());
  return false;
}

function duplicationCheck(staged) {
  // A staged change to the jscpd configuration or baseline can move every file's verdict.
  if (staged.some((path) => DUPLICATION_CONFIG.has(path))) return checkDuplication(null) === 0;
  if (!staged.some((path) => SCANNED_FOR_CLONES.test(path))) return true;
  return checkDuplication(new Set(staged)) === 0;
}

function main() {
  const staged = pathList(git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]));
  if (staged.length === 0) return 0;
  const unstaged = new Set(pathList(git(["diff", "--name-only", "-z"])));
  const partial = new Set(staged.filter((path) => unstaged.has(path)));
  if (partial.size > 0) {
    console.log(
      `pre-commit: partly staged, so oxlint and jscpd read the working-tree copy of: ${[...partial].join(", ")}`,
    );
  }

  const checks = [
    ["local-only guard", localOnlyGuard],
    ["oxfmt", () => formatCheck(staged, partial)],
    ["oxlint", () => lintCheck(staged)],
    ["duplication", () => duplicationCheck(staged)],
  ];
  const failed = [];
  for (const [name, check] of checks) {
    if (check()) console.log(`pre-commit: ${name} clean`);
    else failed.push(name);
  }
  if (failed.length === 0) return 0;
  console.error(
    `pre-commit: failed: ${failed.join(", ")}. Fix the problems above and stage the result.`,
  );
  return 1;
}

process.exit(main());
