/** Browser-visible request workflow, serial and additive on a confirmed Preview. */
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";

import { chromium, expect } from "@playwright/test";

import { loadLocalEnv } from "../e2e/harness/env.ts";
import { signIn } from "../e2e/harness/session.ts";
import { assertSafeE2ETarget } from "../e2e/harness/target-guard.ts";
import { capturePerformanceSource } from "./portal-performance-source.mjs";

const { values } = parseArgs({
  options: {
    origin: { type: "string" },
    output: { type: "string" },
    samples: { type: "string", default: "20" },
    "confirm-target": { type: "string" },
  },
});
loadLocalEnv();
assertSafeE2ETarget(process.env);
const origin = new URL(values.origin ?? "");
if (origin.protocol !== "http:" || origin.hostname !== "localhost" || origin.pathname !== "/")
  throw new Error("Use localhost production build");
const projectRef = process.env.SUPABASE_BRANCH_PROJECT_REF;
if (!projectRef || values["confirm-target"] !== projectRef)
  throw new Error("Confirm Preview target");
const attestation = await fetch(new URL("/api/preview-environment", origin)).then((r) => r.json());
if (!attestation.ok || !attestation.schemaCompatible || attestation.projectRef !== projectRef)
  throw new Error("Preview attestation failed");
const samples = Number(values.samples);
if (!Number.isInteger(samples) || samples < 1 || samples > 50 || !values.output)
  throw new Error("Use 1–50 samples and an output path");
const output = resolve(values.output);
const run = randomUUID().slice(0, 8);
const observations = [];
const metadata = {
  startedAt: new Date().toISOString(),
  source: capturePerformanceSource(),
  projectRef,
  run,
  samples,
  warmups: 2,
  concurrency: 1,
  viewport: "1440x900",
  runtime: "local next start; remote Preview Supabase",
  completed: false,
  boundary:
    "browser navigation start or before Playwright click through verified rendered state; includes automation overhead",
};
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
  baseURL: origin.origin,
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
page.setDefaultTimeout(30_000);
async function navigate(operation, path, ready, i) {
  await page.goto(path);
  await ready();
  const timing = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    return {
      ready: performance.now(),
      ttfb: navigation.responseStart - navigation.requestStart,
      load: navigation.loadEventEnd,
    };
  });
  record(operation, i, timing.ready);
  record(`${operation}.ttfb`, i, timing.ttfb);
  record(`${operation}.load`, i, timing.load);
}
async function click(operation, control, ready, i) {
  const start = await page.evaluate(() => performance.now());
  try {
    await control.click();
    await ready();
    // Two frames include an opportunity to paint the verified content.
    const end = await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now()))),
        ),
    );
    record(operation, i, end - start);
  } catch (error) {
    record(operation, i, (await page.evaluate(() => performance.now())) - start, false);
    throw error;
  }
}
const homeReady = () => page.locator('button[aria-label^="Open request for "]').first().waitFor();
const detailReady = () => page.getByTestId("request-detail-name").waitFor();
try {
  await signIn(page);
  for (let i = 0; i < samples + 2; i += 1) {
    const name = `Benchmark UI ${run} ${i}`;
    await navigate("browser.home", "/admin", homeReady, i);
    await navigate(
      "browser.requests",
      "/admin/requests",
      () => page.getByTestId("request-name").first().waitFor(),
      i,
    );
    await page.goto("/admin/requests/new");
    await page.locator('[name="name"]').fill(name);
    await page.locator('[name="phone"]').fill("8135550199");
    await page.locator('[name="email"]').fill(`benchmark-ui-${run}-${i}@example.test`);
    await page.locator('[name="location"]').selectOption("tampa");
    await page.locator('[name="time"]').selectOption("morning");
    // Creation navigates, so the clock changes. Measure from Node's monotonic
    // Clock across documents, unlike the same-document interactions below.
    const start = performance.now();
    await page.getByTestId("submit-staff-request").click();
    await expect(page.getByTestId("request-detail-name")).toHaveText(name);
    record("browser.create_request", i, performance.now() - start);
    const detailPath = new URL(page.url()).pathname;
    await navigate("browser.request_detail", detailPath, detailReady, i);
    const next = page.getByTestId("next-request");
    if (await next.count()) {
      await click(
        "browser.next_request",
        next,
        async () => {
          await expect(page.getByTestId("request-detail-name")).not.toHaveText(name);
        },
        i,
      );
    }
    await page.goto(detailPath);
    await page.getByRole("button", { name: "Add note", exact: true }).click();
    const note = `Synthetic performance note ${run} ${i}`;
    await page.locator('[name="note"]').fill(note);
    await click(
      "browser.save_note",
      page.getByRole("button", { name: "Save note", exact: true }),
      () => expect(page.getByTestId("note-list")).toContainText(note),
      i,
    );
    await page.goto("/admin?status=any");
    const row = page.getByRole("button", { name: `Open request for ${name}`, exact: true });
    await row.waitFor();
    await click("browser.open_card", row, () => page.locator(".wgi-record-full").waitFor(), i);
    await click(
      "browser.open_full_record",
      page.locator(".wgi-record-full"),
      async () => {
        await page.locator(".wgi-sheet-body .wgi-sheet-section").first().waitFor();
        await expect(page.locator(".wgi-sheet-name")).toContainText(name);
        await expect(page.locator(".wgi-sheet-skeleton")).toHaveCount(0);
      },
      i,
    );
    await page.getByRole("button", { name: "Close full record", exact: true }).click();
    await page.getByRole("radio", { name: "No answer", exact: true }).click();
    await page.getByRole("button", { name: "No call", exact: true }).click();
    await click(
      "browser.save_contact_close",
      page.locator(".wgi-record-save"),
      () => expect(page.getByTestId("home-save-toast")).toContainText("Request closed."),
      i,
    );
    await page.goto(detailPath);
    await click(
      "browser.undo",
      page.getByTestId("undo-latest"),
      () => expect(page.getByTestId("workflow-current-state")).toContainText("New"),
      i,
    );
    // Leave the additive fixture resolved, using the same authenticated UI.
    await page.goto("/admin?status=any");
    await page.getByRole("button", { name: `Open request for ${name}`, exact: true }).click();
    await page.getByRole("radio", { name: "No answer", exact: true }).click();
    await page.getByRole("button", { name: "No call", exact: true }).click();
    await page.locator(".wgi-record-save").click();
    await expect(page.getByTestId("home-save-toast")).toContainText("Request closed.");
    console.log(`Completed browser iteration ${i + 1}/${samples + 2}`);
  }
  metadata.completed = true;
} finally {
  metadata.finishedAt = new Date().toISOString();
  save();
  await browser.close();
}
