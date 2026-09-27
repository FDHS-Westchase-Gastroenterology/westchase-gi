/** Read-only browser timings against the deployed production portal. No stored session or patient data. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "@playwright/test";

const { values } = parseArgs({
  options: {
    output: { type: "string" },
    samples: { type: "string", default: "20" },
    "confirm-origin": { type: "string" },
    "deployment-sha": { type: "string" },
  },
});
const origin = "https://westchasegi.com";
if (values["confirm-origin"] !== origin || !values.output)
  throw new Error("Confirm the fixed production origin and specify an output path");
const samples = Number(values.samples);
if (!Number.isInteger(samples) || samples < 1 || samples > 30)
  throw new Error("Use 1–30 serial samples");
process.loadEnvFile(".env.local");
// Existing credentials only: this collector never provisions or resets an account.
const productionPairConfigured = Boolean(
  process.env.PORTAL_PROD_ADMIN_EMAIL || process.env.PORTAL_PROD_ADMIN_PASSWORD,
);
const email = productionPairConfigured
  ? process.env.PORTAL_PROD_ADMIN_EMAIL
  : process.env.PORTAL_SEED_ADMIN_EMAIL;
const password = productionPairConfigured
  ? process.env.PORTAL_PROD_ADMIN_PASSWORD
  : process.env.PORTAL_SEED_ADMIN_PASSWORD;
if (!email || !password) throw new Error("A complete existing staff credential pair is required");
const observations = [];
const metadata = {
  startedAt: new Date().toISOString(),
  origin,
  deploymentSha: values["deployment-sha"] ?? null,
  samples,
  warmups: 2,
  concurrency: 1,
  viewport: "1440x900",
  runtime: "deployed production; workstation Chrome; no network or CPU throttling",
  completed: false,
  authenticated: false,
  blockedNonReadRequests: 0,
  boundary:
    "navigation start or before Playwright click through verified rendered content; includes automation overhead",
  privacy:
    "No screenshots, traces, session files, names, IDs, URLs containing record IDs, or response bodies stored",
};
const output = resolve(values.output);
function save() {
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify({ metadata, observations }, null, 2) + "\n");
}
function record(operation, i, duration, ok = true) {
  observations.push({
    operation,
    phase: i < 2 ? "warmup" : "measured",
    duration_ms: Math.round(duration * 100) / 100,
    ok,
  });
  save();
}
const browser = await chromium.launch({ channel: "chrome", headless: true });
metadata.browser = browser.version();
const context = await browser.newContext({
  baseURL: origin,
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
page.setDefaultTimeout(30_000);
async function navigate(operation, path, selector, i) {
  const started = performance.now();
  try {
    const response = await page.goto(path);
    if (!response?.ok()) throw new Error("Navigation failed");
    await page.locator(selector).first().waitFor();
    if (new URL(page.url()).pathname === "/admin/login") throw new Error("Session ended");
    const timing = await page.evaluate(() => {
      const n = performance.getEntriesByType("navigation")[0];
      return {
        ready: performance.now(),
        ttfb: n.responseStart - n.requestStart,
        load: n.loadEventEnd,
      };
    });
    record(operation, i, timing.ready);
    record(`${operation}.ttfb`, i, timing.ttfb);
    record(`${operation}.load`, i, timing.load);
  } catch {
    record(operation, i, performance.now() - started, false);
    throw new Error("Read measurement failed; patient details omitted");
  }
}
try {
  metadata.stage = "open-login";
  await page.goto("/admin/login");
  metadata.stage = "fill-login";
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="password"]').fill(password);
  metadata.stage = "submit-login";
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname === "/admin", { timeout: 30_000 });
  metadata.stage = "verify-home";
  await page.getByTestId("home-greeting").waitFor();
  metadata.authenticated = true;
  metadata.stage = "measure-reads";
  console.log("Authenticated production staff session established");
  // Navigation and prefetched reads are allowed. Saves, acknowledgements and telemetry
  // POSTs cannot leave this browser after the explicitly authorized login completes.
  await context.route("**/*", async (route) => {
    if (["GET", "HEAD", "OPTIONS"].includes(route.request().method())) {
      await route.continue();
    } else {
      metadata.blockedNonReadRequests += 1;
      await route.abort("blockedbyclient");
    }
  });
  for (let i = 0; i < samples + 2; i += 1) {
    await navigate("production.home", "/admin", '[data-testid="home-greeting"]', i);
    await navigate("production.requests", "/admin/requests", '[data-testid="request-name"]', i);
    const detailPath = await page.getByTestId("request-row").first().getAttribute("href");
    if (!detailPath?.startsWith("/admin/requests/")) throw new Error("No request available");
    await navigate(
      "production.request_detail",
      detailPath,
      '[data-testid="request-detail-name"]',
      i,
    );
    const next = page.getByTestId("next-request");
    if (await next.count()) {
      const before = page.url();
      const started = performance.now();
      try {
        await next.click();
        await page.waitForURL((url) => url.href !== before);
        await page.getByTestId("request-detail-name").waitFor();
        await page.evaluate(
          () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
        );
        record("production.next_request", i, performance.now() - started);
      } catch {
        record("production.next_request", i, performance.now() - started, false);
        throw new Error("Next-request read failed; patient details omitted");
      }
    }
    console.log(`Completed production read iteration ${i + 1}/${samples + 2}`);
  }
  metadata.completed = true;
} catch {
  metadata.failureAtLogin = new URL(page.url()).pathname === "/admin/login";
  metadata.loginErrorVisible = await page
    .locator("#login-error")
    .isVisible()
    .catch(() => false);
  console.error(
    JSON.stringify({
      stage: metadata.stage,
      failureAtLogin: metadata.failureAtLogin,
      loginErrorVisible: metadata.loginErrorVisible,
    }),
  );
  process.exitCode = 1;
} finally {
  metadata.finishedAt = new Date().toISOString();
  save();
  await browser.close();
}
