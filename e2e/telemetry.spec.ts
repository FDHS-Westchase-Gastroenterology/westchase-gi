import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test, expect } from "@playwright/test";
import { loadLocalEnv, requiredEnv, serviceDb } from "./support";

// Telemetry e2e: proves the aggregate counters land, stay off the staff
// surface, and never carry patient fields. Reads private.analytics_daily
// through the CLI pooler because the private schema is deliberately not
// exposed to PostgREST (the API only publishes `public`).

loadLocalEnv();
const db = serviceDb();
const runId = randomUUID().slice(0, 8);

function analyticsQuery(sql: string): unknown[] {
  const poolerUrl = readFileSync(
    resolve(process.cwd(), "supabase/.temp/pooler-url"),
    "utf8",
  ).trim();
  const password = requiredEnv("SUPABASE_DEV_DB_PASSWORD", "SUPABASE_DB_PASSWORD");
  const output = execFileSync(
    "supabase",
    ["db", "query", "--db-url", poolerUrl, "--agent=no", "--output", "json", sql],
    {
      encoding: "utf8",
      env: { ...process.env, PGPASSWORD: password },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const parsed = JSON.parse(output);
  return Array.isArray(parsed) ? parsed : [];
}

type Rollup = { event: string; route_template: string; count: number };

function rollupCount(event: string, routeTemplate: string): number {
  const rows = analyticsQuery(
    `select event, route_template, count from private.analytics_daily` +
      ` where day = current_date and event = '${event}' and route_template = '${routeTemplate}'`,
  ) as Rollup[];
  return rows.reduce((total, row) => total + row.count, 0);
}

async function expectIncrement(
  event: string,
  routeTemplate: string,
  before: number,
) {
  await expect
    .poll(() => rollupCount(event, routeTemplate), { timeout: 20_000 })
    .toBeGreaterThan(before);
}

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name === "no-js", "Beacons require JavaScript");
});

function emailFor(label: string): string {
  return `telemetry-e2e-${runId}-${label}@example.test`;
}

function testIp(label: string): string {
  return `2001:db8:7e1e:${label.slice(0, 4).padEnd(4, "0")}::9`;
}

test.afterAll(async () => {
  await db.from("requests").delete().like("email", `telemetry-e2e-${runId}-%`);
});

test("page_view fires per navigation on patient routes", async ({ page }) => {
  // Cold dev compiles plus two round trips can exceed the default budget.
  test.setTimeout(90_000);
  const beforeHome = rollupCount("page_view", "/");
  const beforePrep = rollupCount("page_view", "/procedure-prep");

  await page.goto("/en");
  await expectIncrement("page_view", "/", beforeHome);

  await page.goto("/en/procedure-prep");
  await expectIncrement("page_view", "/procedure-prep", beforePrep);
});

test("the form funnel counts view, submit, and success", async ({ page }) => {
  const beforeView = rollupCount("form_view", "/appointment");
  const beforeSubmit = rollupCount("form_submit", "/appointment");
  const beforeSuccess = rollupCount("form_success", "/appointment");

  await page.setExtraHTTPHeaders({ "X-Forwarded-For": testIp("funnel") });
  await page.goto("/en/appointment");
  const form = page.locator('form[action="/api/requests/form"]');
  await expect(form).toHaveAttribute("data-hydrated", "true", { timeout: 30_000 });
  await form.scrollIntoViewIfNeeded();
  await expectIncrement("form_view", "/appointment", beforeView);

  await page.fill("#name", "TEST Telemetry Funnel");
  await page.fill("#phone", "8135550142");
  await page.fill("#email", emailFor("funnel"));
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText("Request received")).toBeVisible({ timeout: 20_000 });
  await expectIncrement("form_submit", "/appointment", beforeSubmit);
  await expectIncrement("form_success", "/appointment", beforeSuccess);
});

test("nothing fires on admin routes", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: "Staff sign in" })).toBeVisible();

  const rows = analyticsQuery(
    `select event, route_template from private.analytics_daily` +
      ` where day = current_date and route_template like '%admin%'`,
  );
  expect(rows).toHaveLength(0);
});

test("beacon payloads never carry patient fields", async ({ page }) => {
  const bodies: string[] = [];
  await page.route("**/api/telemetry", async (route) => {
    bodies.push(route.request().postData() ?? "");
    await route.continue();
  });

  await page.setExtraHTTPHeaders({ "X-Forwarded-For": testIp("hygiene") });
  await page.goto("/en/appointment");
  const form = page.locator('form[action="/api/requests/form"]');
  await expect(form).toHaveAttribute("data-hydrated", "true", { timeout: 30_000 });
  await form.scrollIntoViewIfNeeded();
  await page.fill("#name", "TEST Payload Hygiene");
  await page.fill("#phone", "8135550142");
  await page.fill("#email", emailFor("hygiene"));
  await page.fill("#message", "TEST note that must never reach telemetry");
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText("Request received")).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => bodies.length, { timeout: 20_000 }).toBeGreaterThan(0);

  for (const body of bodies) {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual([
      "deviceClass",
      "event",
      "locale",
      "routeTemplate",
    ]);
    for (const forbidden of ["TEST Payload Hygiene", "8135550142", "telemetry-e2e", "note that must never"]) {
      expect(body).not.toContain(forbidden);
    }
  }
});

test("the route rejects bad events, raw URLs, and staff templates", async ({
  request,
}) => {
  const base = {
    routeTemplate: "/",
    locale: "en",
    deviceClass: "desktop",
  };
  const cases: Array<Record<string, unknown>> = [
    { ...base, event: "page_click" },
    { ...base, event: "page_view", routeTemplate: "/appointment?ref=1" },
    { ...base, event: "page_view", routeTemplate: "/admin/requests" },
    { ...base, event: "page_view", locale: "fr" },
    { ...base, event: "page_view", deviceClass: "watch" },
  ];
  for (const payload of cases) {
    const response = await request.post("/api/telemetry", { data: payload });
    expect(response.status()).toBe(400);
  }

  const valid = await request.post("/api/telemetry", {
    data: { ...base, event: "page_view" },
  });
  expect(valid.status()).toBe(204);
});

test("chooser and banner outcomes count", async ({ browser, page }) => {
  test.setTimeout(90_000);
  const beforeBanner = rollupCount("banner_dismissed", "/");
  await page.goto("/en");
  await page.locator(".notice-banner button").click();
  await expectIncrement("banner_dismissed", "/", beforeBanner);

  const beforeShown = rollupCount("chooser_shown", "/");
  const beforeDismissed = rollupCount("chooser_dismissed", "/");
  const context = await browser.newContext({ locale: "es-MX" });
  const mismatch = await context.newPage();
  await mismatch.goto("/en");
  await expect(
    mismatch.getByRole("dialog", { name: "Choose your language" }),
  ).toBeVisible();
  await expectIncrement("chooser_shown", "/", beforeShown);
  await mismatch.keyboard.press("Escape");
  await expectIncrement("chooser_dismissed", "/", beforeDismissed);
  await context.close();
});
