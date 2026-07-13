import { createClient } from "@supabase/supabase-js";
import { test, expect } from "@playwright/test";
import { loadLocalEnv, requiredEnv } from "./support";

// VAL-SHIP-009/010: ONE canary request through the LIVE production site,
// proven durable in the PROD project, notification recorded, then closed
// via the live portal. Gated behind LIVE_CANARY=1 so ordinary local runs
// can never touch production.

loadLocalEnv();

const LIVE = "https://westchase-gi.vercel.app";
const CANARY_NAME = "TEST — Mission Canary";
const CANARY_PHONE = "8135550100";

const run = process.env.LIVE_CANARY === "1";

function prodDb() {
  return createClient(
    requiredEnv("SUPABASE_PROD_URL", "SUPABASE_URL_PROD"),
    requiredEnv(
      "SUPABASE_PROD_SERVICE_ROLE_KEY",
      "SUPABASE_PROD_SECRET_KEY",
      "SUPABASE_SERVICE_ROLE_KEY_PROD",
      "SUPABASE_SECRET_KEY_PROD",
    ),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

test.describe("live production canary", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(({}, testInfo) => {
    test.skip(!run, "LIVE_CANARY=1 only — never in ordinary runs");
    test.skip(testInfo.project.name !== "chromium", "one canary, one project");
  });

  test("canary proves the live pipeline end-to-end", async ({ page }) => {
    test.setTimeout(300_000);
    const email = requiredEnv("PORTAL_SEED_ADMIN_EMAIL");
    const password = requiredEnv("PORTAL_SEED_ADMIN_PASSWORD");

    const requestUrls: string[] = [];
    page.on("request", (req) => requestUrls.push(req.url()));

    // 1. Patient submits on the LIVE site.
    await page.goto(`${LIVE}/en/appointment`);
    await expect(
      page.locator('form[action="/api/requests/form"]'),
    ).toHaveAttribute("data-hydrated", "true", { timeout: 30_000 });
    await page.fill("#name", CANARY_NAME);
    await page.fill("#phone", CANARY_PHONE);
    await page.fill("#email", email);
    await page.fill("#message", "automated post-deploy verification");
    await page
      .locator('form[action="/api/requests/form"] button[type="submit"]')
      .click();
    await expect(page.getByText("Request received").first()).toBeVisible({
      timeout: 30_000,
    });
    await page.screenshot({ path: "test-results/live-canary/success.png" });

    // 2. Durable in the PROD project.
    const db = prodDb();
    let canaryId = "";
    await expect
      .poll(
        async () => {
          const { data } = await db
            .from("requests")
            .select("id, status")
            .eq("name", CANARY_NAME)
            .order("created_at", { ascending: false })
            .limit(1);
          canaryId = data?.[0]?.id ?? "";
          return data?.[0]?.status ?? "missing";
        },
        { timeout: 30_000 },
      )
      .toBe("new");

    // 3. Notification attempt recorded for the seeded recipient.
    await expect
      .poll(
        async () => {
          const { data } = await db
            .from("request_events")
            .select("recipient, status, provider_message_id")
            .eq("request_id", canaryId)
            .eq("type", "notification");
          return (data ?? []).map((r) => `${r.status}:${!!r.provider_message_id}`);
        },
        { timeout: 30_000 },
      )
      .toContain("sent:true");

    // 4. No patient value ever rode a URL.
    for (const url of requestUrls) {
      for (const fragment of [
        CANARY_PHONE,
        encodeURIComponent(CANARY_NAME),
        CANARY_NAME.replaceAll(" ", "+"),
        encodeURIComponent(email),
      ]) {
        expect(url, `leak in ${url}`).not.toContain(fragment);
      }
    }

    // 5. Staff close the canary through the LIVE portal.
    await page.goto(`${LIVE}/admin`);
    await expect(page).toHaveURL(/\/admin\/login\/?$/);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 30_000 });

    const row = page
      .locator('[data-testid="request-row"]', { hasText: CANARY_NAME })
      .first();
    await expect(row).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: "test-results/live-canary/queue.png" });

    await row.click();
    await expect(page.getByTestId("request-detail-name")).toHaveText(
      CANARY_NAME,
    );
    await page.locator('[data-status-action="closed"]').click();
    await expect(
      page.locator('[data-status-action="closed"]'),
    ).toBeDisabled({ timeout: 30_000 });
    await page.screenshot({ path: "test-results/live-canary/closed.png" });

    const { data: closed } = await db
      .from("requests")
      .select("status")
      .eq("id", canaryId)
      .single();
    expect(closed?.status).toBe("closed");

    // 6. Live safety spot-checks (VAL-SHIP-010).
    await page.goto(`${LIVE}/ar/appointment`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const home = await page.request.get(`${LIVE}/en`);
    expect(home.status()).toBe(200);
  });
});
