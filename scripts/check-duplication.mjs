#!/usr/bin/env node
/**
 * Duplicate-code check: jscpd over the JavaScript, TypeScript and CSS that .jscpd.json selects.
 *
 *   npm run duplication:check                      fails on any clone .jscpd-baseline.json lacks,
 *                                                  and on total duplication over the cap
 *   npm run duplication:check -- --update-baseline records today's clones as the baseline
 *
 * The baseline holds one fingerprint per accepted clone, so a clone counts as new until a commit
 * adds it there, whatever branch a pull request targets. CI's quality job and `npm run gates` run
 * the check; the pre-commit hook fails only on new clones that touch a staged file. Deliberate
 * duplication goes between `// jscpd:ignore-start` and `// jscpd:ignore-end` comments.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const JSCPD = join(repoRoot, "node_modules", ".bin", "jscpd");

/**
 * @typedef {{ name: string, start: number, end: number }} CloneSide
 * @typedef {{ isNew: boolean, lines: number, firstFile: CloneSide, secondFile: CloneSide }} Clone
 */

/**
 * @param {CloneSide} side
 * @returns {string}
 */
function describeSide(side) {
  return `${side.name}:${side.start}-${side.end}`;
}

/**
 * @param {Clone} clone
 * @returns {string}
 */
export function describeClone(clone) {
  return `${describeSide(clone.firstFile)} ~ ${describeSide(clone.secondFile)} (${clone.lines} lines)`;
}

/**
 * The clones the baseline lacks. With `paths`, only those with a side in one of the paths, so
 * an unstaged scratch file cannot fail a commit.
 *
 * @param {readonly Clone[]} clones
 * @param {ReadonlySet<string> | null} paths
 * @returns {Clone[]}
 */
export function newClones(clones, paths) {
  return clones.filter(
    (clone) =>
      clone.isNew &&
      (paths === null || paths.has(clone.firstFile.name) || paths.has(clone.secondFile.name)),
  );
}

/** @returns {number} */
function configuredCap() {
  return JSON.parse(readFileSync(join(repoRoot, ".jscpd.json"), "utf8")).threshold;
}

/**
 * Runs jscpd against the baseline and prints the verdict. Returns the exit status: 0 when clean.
 *
 * @param {ReadonlySet<string> | null} paths limits new-clone failures to these repository paths
 * @returns {number}
 */
export function checkDuplication(paths) {
  const reportDir = mkdtempSync(join(tmpdir(), "jscpd-"));
  try {
    const args = ["--silent", "--no-tips", "--no-colors", "--reporters", "json"];
    args.push("--output", reportDir);
    const run = spawnSync(JSCPD, args, { cwd: repoRoot, encoding: "utf8" });
    if (run.error) {
      console.error(`duplication: cannot run jscpd (${run.error.message}); run npm ci`);
      return 1;
    }
    const output = `${run.stdout}${run.stderr}`;
    const reportFile = join(reportDir, "jscpd-report.json");
    if (!existsSync(reportFile)) {
      console.error(`duplication: jscpd wrote no report\n${output.trimEnd()}`);
      return 1;
    }
    const report = JSON.parse(readFileSync(reportFile, "utf8"));
    const total = report.statistics.total;
    console.log(
      `duplication: ${total.clones} clones, ${total.percentage.toFixed(2)}% of ${total.lines} lines (cap ${configuredCap()}%)`,
    );
    let status = 0;
    if (run.status !== 0) {
      const errors = output.split("\n").filter((line) => line.startsWith("ERROR"));
      console.error(errors.length > 0 ? errors.join("\n") : output.trimEnd());
      status = 1;
    }
    const added = newClones(report.duplicates, paths);
    if (added.length > 0) {
      console.error(`duplication: ${added.length} clone(s) missing from .jscpd-baseline.json:`);
      for (const clone of added) console.error(`  ${describeClone(clone)}`);
      console.error(
        "Extract the shared code, or wrap deliberate duplication in " +
          "`// jscpd:ignore-start` and `// jscpd:ignore-end` comments.",
      );
      status = 1;
    }
    return status;
  } finally {
    rmSync(reportDir, { recursive: true, force: true });
  }
}

function updateBaseline() {
  const run = spawnSync(JSCPD, ["--silent", "--no-tips", "--no-colors", "--update-baseline"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  return run.status ?? 1;
}

function main(args) {
  if (args.length === 0) return checkDuplication(null);
  if (args.length === 1 && args[0] === "--update-baseline") return updateBaseline();
  console.error("usage: node scripts/check-duplication.mjs [--update-baseline]");
  return 2;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
