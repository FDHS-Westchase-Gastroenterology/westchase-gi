#!/usr/bin/env node
/**
 * The local QA harness server on :3100.
 *
 *   npm run dev:mission
 *
 * Replaces this checkout's previous harness server. A server that belongs to another checkout is
 * left running: the script names its directory and stops. Playwright starts this script through
 * `webServer` in `playwright.config.ts`.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { holderIsThisCheckout, portHolders, repoRoot } from "./port-holder.mjs";

const HARNESS_PORT = 3100;
const FORWARDED_SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP"];

function stop(holder) {
  try {
    process.kill(holder.pid, "SIGKILL");
  } catch {
    // The holder exited between the lookup and the signal.
  }
}

function main() {
  const holders = portHolders(HARNESS_PORT);
  const foreign = holders.filter((holder) => !holderIsThisCheckout(holder));
  if (foreign.length > 0) {
    for (const holder of foreign) {
      const where = holder.cwd ?? "an unknown directory";
      console.error(`dev:mission: port ${HARNESS_PORT} is held by pid ${holder.pid} in ${where}.`);
    }
    console.error(
      "dev:mission: that server belongs to another checkout, so it was left running. Stop it there, then rerun.",
    );
    process.exitCode = 1;
    return;
  }
  for (const holder of holders) stop(holder);

  mkdirSync(join(repoRoot, ".logs"), { recursive: true });
  const next = join(repoRoot, "node_modules", ".bin", "next");
  const server = spawn(next, ["dev", "-p", String(HARNESS_PORT)], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  for (const signal of FORWARDED_SIGNALS) process.on(signal, () => server.kill(signal));
  server.on("error", (error) => {
    console.error(`dev:mission: could not start next: ${error.message}`);
    process.exit(1);
  });
  server.on("exit", (code) => process.exit(code ?? 1));
}

main();
