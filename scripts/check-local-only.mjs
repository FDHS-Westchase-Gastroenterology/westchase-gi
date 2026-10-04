#!/usr/bin/env node
/**
 * The one guard against machine-local directories reaching a pull request.
 *
 * Every consumer reads local-only-paths.json through this module. Nothing keeps a
 * second copy of the list, so nothing can drift out of sync with it:
 *
 *   .githooks/pre-commit         node scripts/check-local-only.mjs staged
 *   .github/workflows/ci.yml     node scripts/check-local-only.mjs tracked
 *                                node scripts/check-local-only.mjs verify-generated
 *   .gitignore managed block     node scripts/check-local-only.mjs write
 *   .claude/rules/...md          node scripts/check-local-only.mjs write
 *
 * `verify-generated` is what makes the single-source-of-truth claim enforceable
 * rather than aspirational: CI regenerates the .gitignore managed block from the
 * manifest and fails if what is committed differs.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(repoRoot, "local-only-paths.json");

const BEGIN =
  "# BEGIN generated from local-only-paths.json -- edit that file, then run `npm run local-only:write`";
const END = "# END generated from local-only-paths.json";
const DOC_BEGIN = "<!-- BEGIN generated from local-only-paths.json -->";
const DOC_END = "<!-- END generated from local-only-paths.json -->";

const RULES_DOC = join(repoRoot, ".claude", "rules", "local-only-directories.md");

/* ------------------------------------------------------------------ manifest */

export function loadManifest(file = MANIFEST) {
  const raw = JSON.parse(readFileSync(file, "utf8"));
  assertManifestSane(raw);
  return raw;
}

/**
 * The scripts/ lesson, encoded so it cannot be repeated. A path that merely looks
 * like tooling is not grounds for removal; if a localOnly entry would swallow a
 * path we have asserted is required, the guard refuses to run at all rather than
 * quietly untracking something CI needs.
 */
export function assertManifestSane(manifest) {
  const problems = [];
  for (const entry of manifest.localOnly) {
    for (const keep of manifest.loadBearing) {
      if (matches(keep.path, entry.path) || matches(entry.path, keep.path)) {
        problems.push(
          `localOnly entry "${entry.path}" overlaps load-bearing path "${keep.path}". ` +
            `${keep.reason}`,
        );
      }
    }
  }
  const seen = new Set();
  for (const entry of manifest.localOnly) {
    if (seen.has(entry.path)) problems.push(`duplicate localOnly entry "${entry.path}"`);
    seen.add(entry.path);
  }
  if (problems.length) {
    throw new Error(
      "local-only-paths.json is unsafe and the guard will not run:\n  - " + problems.join("\n  - "),
    );
  }
  return true;
}

/** Does `pattern` (a directory prefix like ".agents/" or a file like "MEMORY.md") cover `path`? */
function matches(pattern, path) {
  if (pattern.endsWith("/")) return path === pattern.slice(0, -1) || path.startsWith(pattern);
  return path === pattern;
}

/* ---------------------------------------------------------------- classifier */

/**
 * Pure. Returns the violating manifest entry for a path, or null when the path is
 * clean. Load-bearing paths are checked first and always win, so a load-bearing
 * path can never be reported as a violation.
 */
export function classifyPath(path, manifest) {
  const normalised = String(path).replace(/^\.\//, "").replace(/\\/g, "/");
  for (const keep of manifest.loadBearing) {
    if (matches(keep.path, normalised)) return null;
  }
  for (const entry of manifest.localOnly) {
    if (matches(entry.path, normalised)) return entry;
  }
  return null;
}

/** Pure. Maps a list of paths to [{ path, entry }] for the ones that violate. */
export function findViolations(paths, manifest) {
  const out = [];
  for (const p of paths) {
    if (!p) continue;
    const entry = classifyPath(p, manifest);
    if (entry) out.push({ path: p, entry });
  }
  return out;
}

/* ----------------------------------------------------------------- rendering */

export function renderGitignoreBlock(manifest) {
  const lines = [
    BEGIN,
    "# Machine-local tooling, agent scratch and generated design output. These are never",
    "# part of the product and only bloat review. See local-only-paths.json for why each",
    "# entry is here and which paths are deliberately NOT in this list.",
  ];
  for (const entry of manifest.localOnly) lines.push(entry.gitignore);
  lines.push(END);
  return lines.join("\n");
}

export function renderRulesDoc(manifest) {
  const lines = [DOC_BEGIN, "", "| Path | Why it is local-only |", "| --- | --- |"];
  for (const e of manifest.localOnly) lines.push(`| \`${e.path}\` | ${e.reason} |`);
  lines.push("");
  lines.push("**Not local-only.** These look like tooling but are required; the guard refuses");
  lines.push("to run if the list above ever overlaps one of them.");
  lines.push("");
  lines.push("| Path | Why it must stay tracked |");
  lines.push("| --- | --- |");
  for (const e of manifest.loadBearing) {
    lines.push(`| \`${e.path}\` | ${e.reason}${e.incident ? ` _${e.incident}_` : ""} |`);
  }
  lines.push("");
  lines.push(DOC_END);
  return lines.join("\n");
}

/** Replace the managed block in `text`, or append it if no block exists yet. */
export function spliceBlock(text, block, begin, end) {
  const b = text.indexOf(begin);
  const e = text.indexOf(end);
  if (b !== -1 && e !== -1 && e > b) {
    return text.slice(0, b) + block + text.slice(e + end.length);
  }
  return text.replace(/\s*$/, "") + "\n\n" + block + "\n";
}

/* ----------------------------------------------------------------------- git */

function git(args) {
  const r = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
  return r.stdout.split("\n").filter(Boolean);
}

/* -------------------------------------------------------------------- report */

function report(violations, what) {
  if (!violations.length) {
    console.log(`local-only guard: clean (${what})`);
    return 0;
  }
  const byEntry = new Map();
  for (const v of violations) {
    if (!byEntry.has(v.entry.path)) byEntry.set(v.entry.path, []);
    byEntry.get(v.entry.path).push(v.path);
  }
  console.error(`\nlocal-only guard FAILED: ${violations.length} ${what} must not be committed.\n`);
  for (const [entryPath, paths] of byEntry) {
    const entry = paths.length;
    console.error(`  ${entryPath}  (${entry} file${entry === 1 ? "" : "s"})`);
    for (const p of paths.slice(0, 5)) console.error(`      ${p}`);
    if (paths.length > 5) console.error(`      ... and ${paths.length - 5} more`);
  }
  console.error(`
Nothing has been deleted from your working tree. To untrack these, keeping the
files on disk:

  git rm -r --cached ${[...byEntry.keys()].join(" ")}

If one of these paths is actually required, add it to "loadBearing" in
local-only-paths.json with the reason, and run: npm run local-only:write
`);
  return 1;
}

/* -------------------------------------------------------------------- modes */

function main(argv) {
  const mode = argv[2] ?? "tracked";
  const manifest = loadManifest();

  if (mode === "staged") {
    const staged = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]);
    return report(findViolations(staged, manifest), "staged file(s)");
  }

  if (mode === "tracked") {
    return report(findViolations(git(["ls-files"]), manifest), "tracked file(s)");
  }

  if (mode === "classify") {
    const paths = argv.slice(3);
    for (const p of paths) {
      const hit = classifyPath(p, manifest);
      console.log(`${hit ? "VIOLATION" : "clean    "}  ${p}${hit ? `  <- ${hit.path}` : ""}`);
    }
    return findViolations(paths, manifest).length ? 1 : 0;
  }

  if (mode === "write") {
    const gi = join(repoRoot, ".gitignore");
    writeFileSync(
      gi,
      spliceBlock(readFileSync(gi, "utf8"), renderGitignoreBlock(manifest), BEGIN, END),
    );
    console.log("wrote .gitignore managed block");
    mkdirSync(dirname(RULES_DOC), { recursive: true });
    const existing = existsSync(RULES_DOC)
      ? readFileSync(RULES_DOC, "utf8")
      : "# Local-only directories\n\nGenerated from `local-only-paths.json`. Do not edit the block below by hand.\n";
    writeFileSync(RULES_DOC, spliceBlock(existing, renderRulesDoc(manifest), DOC_BEGIN, DOC_END));
    console.log(`wrote ${RULES_DOC.replace(repoRoot + "/", "")} managed block`);
    return 0;
  }

  if (mode === "verify-generated") {
    // The check that keeps the copies honest: regenerate from the manifest and
    // Compare against what is committed. The rules document lives inside .claude/,
    // Which is itself local-only and therefore not in git, so CI can only verify
    // The .gitignore block. `npm run local-only:write` keeps the document current
    // For whoever is at the machine.
    const gi = readFileSync(join(repoRoot, ".gitignore"), "utf8");
    const expected = renderGitignoreBlock(manifest);
    const b = gi.indexOf(BEGIN);
    const e = gi.indexOf(END);
    if (b === -1 || e === -1) {
      console.error(
        "\nlocal-only guard FAILED: .gitignore has no managed block.\n" +
          "Run: npm run local-only:write\n",
      );
      return 1;
    }
    const actual = gi.slice(b, e + END.length);
    if (actual !== expected) {
      console.error(
        "\nlocal-only guard FAILED: the .gitignore managed block has drifted from\n" +
          "local-only-paths.json. Run `npm run local-only:write` and commit the result.\n",
      );
      return 1;
    }
    console.log("local-only guard: .gitignore managed block matches local-only-paths.json");
    return 0;
  }

  console.error(
    `unknown mode "${mode}". Use: staged | tracked | classify | write | verify-generated`,
  );
  return 2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exit(main(process.argv));
  } catch (err) {
    console.error(`\nlocal-only guard ERROR: ${err.message}\n`);
    process.exit(2);
  }
}
