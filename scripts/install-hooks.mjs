#!/usr/bin/env node
/**
 * Points git at the tracked hooks in .githooks/. `npm ci` and `npm install` run this through the
 * prepare script; `npm run hooks:install` sets the same value unconditionally.
 *
 * It changes nothing in CI, outside a git checkout, or when core.hooksPath already names another
 * directory, and prints which.
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HOOKS_PATH = ".githooks";

function git(args) {
  return spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
}

function main() {
  if (process.env.CI) {
    console.log("hooks: CI, so the git hooks are not installed");
    return 0;
  }
  const checkout = git(["rev-parse", "--is-inside-work-tree"]);
  if (checkout.error || checkout.status !== 0) {
    console.log("hooks: not a git checkout, so there is nothing to install");
    return 0;
  }
  const current = git(["config", "--get", "core.hooksPath"]).stdout.trim();
  if (current === HOOKS_PATH) return 0;
  if (current !== "") {
    console.log(
      `hooks: core.hooksPath is ${current}, so it is left alone. ` +
        "Run `npm run hooks:install` to use this repository's hooks.",
    );
    return 0;
  }
  const set = git(["config", "core.hooksPath", HOOKS_PATH]);
  if (set.status !== 0) {
    console.error(`hooks: git config core.hooksPath failed: ${set.stderr.trim()}`);
    return 1;
  }
  console.log(`hooks: core.hooksPath set to ${HOOKS_PATH}`);
  return 0;
}

process.exit(main());
