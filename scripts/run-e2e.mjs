#!/usr/bin/env node
/**
 * E2E orchestrator. Replaces the `@playwright/test` config + CLI:
 * boots/reuses the dev server, optionally fronts it with a Cloudflare quick
 * tunnel when Browserbase must reach a localhost origin, then runs the spec
 * files serially through `tsx --test` and forwards the exit code.
 *
 * Environment contract (see .env.example):
 * - E2E_BROWSER=browserbase|local (default: browserbase in CI, local otherwise)
 * - E2E_BASE_URL (default http://localhost:3100; set to the tunnel URL when
 *   tunneling)
 * - E2E_PROJECT=chromium|no-js (drives per-test context capabilities)
 * - E2E_PUBLIC_SMOKE=1 skips the Supabase recipient snapshot (no credentials)
 * - E2E_TUNNEL=1 creates a Cloudflare quick tunnel for Browserbase runs that
 *   target localhost
 */

import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const project = args.includes("--project=no-js")
  ? "no-js"
  : args.includes("--project=chromium")
    ? "chromium"
    : undefined;
const files = args.filter((argument) => !argument.startsWith("--"));

const defaultFiles = ["e2e/smoke.spec.ts"];
const specFiles = files.length > 0 ? files : defaultFiles;

const isCi = process.env.CI !== undefined && process.env.CI !== "";
const e2eBrowser = process.env.E2E_BROWSER?.trim() || (isCi ? "browserbase" : "local");
const wantsTunnel =
  process.env.E2E_TUNNEL === "1" ||
  (e2eBrowser === "browserbase" && isCi && !(process.env.E2E_BASE_URL ?? "").startsWith("http"));

let tunnel = undefined;

async function startTunnel() {
  const logDir = resolve(".logs");
  mkdirSync(logDir, { recursive: true });
  const logFile = resolve(logDir, `e2e-tunnel-${randomUUID().slice(0, 8)}.log`);
  const child = spawn(
    "cloudflared",
    ["tunnel", "--url", "http://localhost:3100", "--no-autoupdate", "--protocol", "http2"],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  const chunks = [];
  child.stderr?.on("data", (chunk) => {
    chunks.push(String(chunk));
  });
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const text = chunks.join("");
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (match) {
      return { child, url: match[0], logFile };
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  child.kill("SIGTERM");
  rmSync(logFile, { force: true });
  throw new Error(
    `Cloudflare quick tunnel did not come up. Log tail:\n${chunks.join("").slice(-2000)}`,
  );
}

if (wantsTunnel) {
  const started = await startTunnel();
  tunnel = started;
  process.env.E2E_BASE_URL = started.url;
  console.log(`[e2e] tunnel: ${started.url}`);
}

const env = { ...process.env, E2E_BROWSER: e2eBrowser };
if (project) {
  env.E2E_PROJECT = project;
}

const testArgs = ["--test", "--test-concurrency=1", "--test-reporter=spec", ...specFiles];
console.log(`[e2e] tsx ${testArgs.join(" ")}`);
const run = spawnSync("npx", ["tsx", ...testArgs], {
  stdio: "inherit",
  env,
});

if (tunnel) {
  tunnel.child.kill("SIGTERM");
  rmSync(tunnel.logFile, { force: true });
}

process.exit(run.status ?? 1);
