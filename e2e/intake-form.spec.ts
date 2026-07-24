import { createHash, randomUUID } from "node:crypto";
import { execSync, spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, openSync } from "node:fs";
import { resolve } from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { en } from "../src/lib/dictionaries/en";
import { es } from "../src/lib/dictionaries/es";
import { vi } from "../src/lib/dictionaries/vi";
import { ko } from "../src/lib/dictionaries/ko";
import { ar } from "../src/lib/dictionaries/ar";
import type { Dictionary } from "../src/lib/i18n";
import type { Locale } from "../src/lib/site";
import { serviceDb } from "./support";

const db = serviceDb();
const dicts: Record<Locale, Dictionary> = { en, es, vi, ko, ar };
const runId = randomUUID().slice(0, 8);

test.use({
  storageState: {
    cookies: [{ name: "wgi-locale", value: "en", domain: "localhost", path: "/" }],
    origins: [],
  },
});

/** All spec rows share this address shape so cleanup can sweep any run. */
function emailFor(label: string): string {
  return `form-e2e-${runId}-${label}@example.test`;
}

/** Unique per-submission client so the intake rate limiter never throttles the suite. */
function testIp(label: string): string {
  const hex = createHash("sha256").update(`${runId}:${label}`).digest("hex");
  return `2001:db8:${hex.slice(0, 4)}:${hex.slice(4, 8)}::2`;
}

async function fillForm(page: Page, email: string, name: string) {
  await page.fill("#name", name);
  await page.fill("#phone", "8135550142");
  await page.fill("#email", email);
  await page.fill(
    "#message",
    "TEST submission from the E2E suite - no medical details.",
  );
}

const submitButton = (page: Page) =>
  page.locator('form[action="/api/requests/form"] button[type="submit"]');

/** JS paths must not click before hydration or the native fallback fires. */
async function awaitHydration(page: Page) {
  await expect(
    page.locator('form[action="/api/requests/form"]'),
  ).toHaveAttribute("data-hydrated", "true", { timeout: 30_000 });
}

test.afterAll(async () => {
  // Scoped to THIS worker's runId: workers finish at different times, and a
  // broad form-e2e-% sweep would race other workers' pending DB assertions.
  await db.from("requests").delete().like("email", `form-e2e-${runId}-%`);
});

test("VAL-INTAKE-002: success renders only after durable acceptance", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "JS submission path");

  await page.setExtraHTTPHeaders({ "X-Forwarded-For": testIp("gate") });
  const email = emailFor("gate");

  let release!: () => void;
  const hold = new Promise<void>((resolveHold) => {
    release = resolveHold;
  });
  await page.route("**/api/requests", async (route) => {
    await hold;
    await route.continue();
  });

  await page.goto("/en/appointment");
  await awaitHydration(page);
  await fillForm(page, email, "TEST Gate");
  await submitButton(page).click();

  // While the response is held open the UI must show only the pending
  // affordance — never the confirmation.
  await expect(submitButton(page)).toBeDisabled();
  await expect(submitButton(page)).toHaveText(en.appointment.form.submitting);
  await page.waitForTimeout(1_200);
  await expect(page.getByText(en.appointment.form.doneHeading)).toHaveCount(0);

  release();
  await expect(page.getByText(en.appointment.form.doneHeading)).toBeVisible({
    timeout: 15_000,
  });

  const { data, error } = await db
    .from("requests")
    .select("id, status")
    .eq("email", email);
  expect(error).toBeNull();
  expect(data).toHaveLength(1);
  expect(data![0].status).toBe("new");
});

test.describe("VAL-INTAKE-006: truthful failure when the queue is down", () => {
  test.describe.configure({ mode: "serial" });

  let broken: ChildProcess | null = null;

  test.beforeAll(async ({}, testInfo) => {
    if (testInfo.project.name !== "chromium") return;
    test.setTimeout(240_000);

    // Restrict cleanup to the listener. An unqualified port query can also
    // return this worker's pooled fetch connection and kill the test runner.
    execSync("lsof -tiTCP:3101 -sTCP:LISTEN | xargs -r kill -9 || true", {
      shell: "/bin/bash",
    });
    mkdirSync(resolve(process.cwd(), ".logs"), { recursive: true });
    const log = openSync(resolve(process.cwd(), ".logs/dev-3101.log"), "w");

    // Second instance with an unreachable database and its own build dir
    // (NEXT_DIST_DIR) so it never shares Turbopack state with :3100.
    broken = spawn("npx", ["next", "dev", "-p", "3101"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9",
        SUPABASE_SECRET_KEY: "sb_broken_e2e_key",
        SUPABASE_SERVICE_ROLE_KEY: "sb_broken_e2e_key",
        NEXT_DIST_DIR: ".next-e2e",
      },
      stdio: ["ignore", log, log],
      detached: true,
    });

    const deadline = Date.now() + 210_000;
    for (;;) {
      try {
        const res = await fetch("http://localhost:3101/en/appointment");
        if (res.ok) break;
      } catch {
        // Still booting.
      }
      if (Date.now() > deadline) {
        throw new Error("Broken-DB instance on :3101 failed to boot");
      }
      await new Promise((r) => setTimeout(r, 2_000));
    }
  });

  test.afterAll(async ({}, testInfo) => {
    if (testInfo.project.name !== "chromium") return;
    if (broken?.pid) {
      try {
        process.kill(-broken.pid, "SIGKILL");
      } catch {
        // Already gone.
      }
    }
    execSync("lsof -tiTCP:3101 -sTCP:LISTEN | xargs -r kill -9 || true", {
      shell: "/bin/bash",
    });
  });

  test("browser submit shows the failure state, never success", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "JS submission path");
    test.setTimeout(120_000);

    // localhost (not 127.0.0.1): Next 16 blocks dev hydration assets for
    // non-allowlisted hostnames, and an unhydrated form would take the
    // native fallback instead of the JS state machine under test.
    await page.setExtraHTTPHeaders({ "X-Forwarded-For": testIp("broken") });
    await page.goto("http://localhost:3101/en/appointment");
    await awaitHydration(page);
    await fillForm(page, emailFor("broken"), "TEST Broken Queue");
    await submitButton(page).click();

    // Scoped inside the form: Next's route announcer is also role=alert.
    const alert = page.locator(
      'form[action="/api/requests/form"] [role="alert"]',
    );
    await expect(alert).toBeVisible({ timeout: 45_000 });
    await expect(alert).toContainText(en.appointment.form.failHeading);
    // The patient must see how to reach the office: phone + text line.
    await expect(alert).toContainText("(813) 920-8882");
    await expect(alert).toContainText("(813) 564-0315");
    await expect(page.getByText(en.appointment.form.doneHeading)).toHaveCount(
      0,
    );
  });
});

test("VAL-INTAKE-007: no-JS native POST leaks nothing and lands on a receipt", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "no-js", "no-JS project only");
  test.setTimeout(90_000);

  await page.setExtraHTTPHeaders({ "X-Forwarded-For": testIp("nojs") });
  const email = emailFor("nojs");
  const name = "TEST NoScript Patient";
  const phone = "8135550142";

  const requestUrls: string[] = [];
  page.on("request", (request) => requestUrls.push(request.url()));

  await page.goto("/en/appointment");
  await fillForm(page, email, name);
  // Keyboard-submit the native form: implicit submission works without JS
  // and sidesteps bounding-box stability churn on cold dev compiles.
  await page.press("#email", "Enter");

  await page.waitForURL("**/en/appointment/received?status=success", {
    timeout: 60_000,
  });
  await expect(
    page.getByRole("heading", { name: en.requestReceipt.successHeading }),
  ).toBeVisible();

  for (const url of requestUrls) {
    for (const fragment of [
      name,
      encodeURIComponent(name),
      name.replaceAll(" ", "+"),
      phone,
      email,
      encodeURIComponent(email),
    ]) {
      expect(url, `patient value leaked into ${url}`).not.toContain(fragment);
    }
  }

  const { data, error } = await db
    .from("requests")
    .select("id, locale, source_path")
    .eq("email", email);
  expect(error).toBeNull();
  expect(data).toHaveLength(1);
  expect(data![0].locale).toBe("en");
  expect(data![0].source_path).toBe("/en/appointment");
});

for (const locale of ["en", "es", "vi", "ko", "ar"] as const) {
  for (const route of ["appointment", "contact"] as const) {
    test(`VAL-INTAKE-008: ${locale}/${route} renders localized and submits end-to-end`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "chromium", "JS submission path");

      const d = dicts[locale];
      await page.setExtraHTTPHeaders({
        "X-Forwarded-For": testIp(`surface-${locale}-${route}`),
      });
      await page.goto(`/${locale}/${route}`);
      await awaitHydration(page);

      await expect(page.locator('label[for="name"]')).toContainText(
        d.appointment.form.name,
      );
      await expect(page.locator('label[for="message"]')).toContainText(
        d.appointment.form.message,
      );

      const email = emailFor(`${locale}-${route}`);
      await fillForm(page, email, `TEST Locale ${locale} ${route}`);
      await submitButton(page).click();

      await expect(
        page.getByText(d.appointment.form.doneHeading).first(),
      ).toBeVisible({ timeout: 20_000 });

      const { data, error } = await db
        .from("requests")
        .select("locale, source_path")
        .eq("email", email);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].locale).toBe(locale);
      expect(data![0].source_path).toBe(`/${locale}/${route}`);
    });
  }
}

test("VAL-INTAKE-009: Arabic renders RTL with Arabic form labels", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "rendering check");

  await page.goto("/ar/appointment");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator('label[for="name"]')).toContainText(
    ar.appointment.form.name,
  );
  await expect(page.locator('label[for="phone"]')).toContainText(
    ar.appointment.form.phone,
  );
});

test("VAL-INTAKE-014: PHI warning renders verbatim on all ten surfaces", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "rendering check");
  test.setTimeout(120_000);

  // The English warning is the canonical string the practice signed off on;
  // it must never drift.
  expect(en.appointment.phiWarning).toBe(
    "Please do not submit any Protected Health Information (PHI).",
  );

  for (const locale of ["en", "es", "vi", "ko", "ar"] as const) {
    const warning = dicts[locale].appointment.phiWarning;
    expect(warning.length).toBeGreaterThan(0);

    for (const route of ["appointment", "contact"] as const) {
      await page.goto(`/${locale}/${route}`);
      await expect(page.getByText(warning).first()).toBeVisible();
    }
  }
});
