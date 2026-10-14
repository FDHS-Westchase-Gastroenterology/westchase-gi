#!/usr/bin/env node
/**
 * The four standing gates from AGENTS.md "Contribution loop", in order, in one pass.
 *
 *   npm run gates
 *
 * A clean gate prints one line. A failing gate prints its full output, and the run continues so
 * one pass reports every failure. Motion review and visual evidence are judgment gates; this
 * script does not check them.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * CONTRIBUTING.md "What to run — without credentials": a checkout with no .env.local builds
 * against these placeholders. Variables already in the environment win.
 */
const NO_CREDENTIALS_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "ci-public-placeholder",
  SUPABASE_SERVICE_ROLE_KEY: "ci-server-placeholder",
};

function buildEnv() {
  return existsSync(join(repoRoot, ".env.local"))
    ? process.env
    : { ...NO_CREDENTIALS_ENV, ...process.env };
}

/** React Doctor passes at a score of 100; its exit status alone does not say so. */
function doctorProblem(output) {
  const score = /Score:\s*(\d+)\s*\/\s*100/.exec(output);
  if (score === null) return "no score in the output";
  return score[1] === "100" ? null : `score ${score[1]} of 100`;
}

const GATES = [
  { name: "oxlint", command: "npx", args: ["oxlint", "--deny-warnings"] },
  { name: "oxfmt --check", command: "npx", args: ["oxfmt", "--check"] },
  {
    name: "react-doctor",
    command: "npx",
    args: ["react-doctor@latest", "--verbose"],
    problem: doctorProblem,
  },
  { name: "build", command: "npm", args: ["run", "build"], env: buildEnv },
];

function runGate(gate) {
  const started = Date.now();
  const result = spawnSync(gate.command, gate.args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...(gate.env?.() ?? process.env), NO_COLOR: "1" },
    maxBuffer: 256 * 1024 * 1024,
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.error) return { seconds, output, problem: result.error.message };
  if (result.status !== 0) return { seconds, output, problem: `exit status ${result.status}` };
  return { seconds, output, problem: gate.problem?.(output) ?? null };
}

function main() {
  const failed = [];
  for (const gate of GATES) {
    const { seconds, output, problem } = runGate(gate);
    if (problem === null) {
      console.log(`gates: ${gate.name} clean (${seconds}s)`);
    } else {
      failed.push(gate.name);
      console.log(`gates: ${gate.name} FAILED (${seconds}s): ${problem}`);
      console.log(output.trimEnd());
    }
  }
  const clean = GATES.length - failed.length;
  const tail = failed.length > 0 ? `; failed: ${failed.join(", ")}` : "";
  console.log(
    `gates: ${clean} of ${GATES.length} clean${tail}. Motion review and visual evidence are not checked here.`,
  );
  return failed.length > 0 ? 1 : 0;
}

process.exit(main());
