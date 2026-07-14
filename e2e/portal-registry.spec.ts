import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { loadLocalEnv, requiredEnv, serviceDb } from "./support";

// VAL-REG-001: the registry lists the seeded custody truth.
// VAL-REG-002: asset add/edit/archive persists with audit rows; the
// staff role cannot mutate (server-side, network-level).

loadLocalEnv();

const SEED_EMAIL = requiredEnv("PORTAL_SEED_ADMIN_EMAIL");
const SEED_PASSWORD = requiredEnv("PORTAL_SEED_ADMIN_PASSWORD");

const db = serviceDb();
const runId = randomUUID().slice(0, 8);
const assetName = `TEST Registry Asset ${runId}`;

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 15_000 });
}

test.describe("sovereignty registry", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "JS portal UI");
  });

  test.afterAll(async () => {
    await db.from("registry_assets").delete().like("name", "TEST Registry Asset %");
    const { data: leftovers } = await db
      .from("staff_profiles")
      .select("user_id")
      .like("email", `reg-${runId}-%`);
    for (const row of leftovers ?? []) {
      await db.from("staff_profiles").delete().eq("user_id", row.user_id);
      await db.auth.admin.deleteUser(row.user_id);
    }
  });

  test("VAL-REG-001: seeded custody truth renders", async ({ page }) => {
    await signIn(page, SEED_EMAIL, SEED_PASSWORD);
    await page.goto("/admin/settings/software");

    for (const seeded of [
      { name: "Westchase GI website", repo: "ASTXRTYS/westchase-gi" },
      { name: "Review QR print tool", repo: "ASTXRTYS/wgi-review-qr" },
      { name: "Staff admin portal", repo: "ASTXRTYS/westchase-gi" },
    ]) {
      const card = page.locator(`[data-asset-name="${seeded.name}"]`);
      await expect(card).toBeVisible();
      await expect(card).toContainText(seeded.repo);
      await expect(card).toContainText("Jason — consultant");
      await expect(card.getByTestId("asset-status")).toBeVisible();
    }

    await page.screenshot({
      path: "test-results/portal-registry/registry-1440.png",
      fullPage: true,
    });

    // The retired standalone route forwards to the software sub-page.
    await page.goto("/admin/registry");
    await expect(page).toHaveURL(/\/admin\/settings\/software\/?$/);
  });

  test("VAL-REG-002: asset CRUD persists with audit; staff cannot mutate", async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);
    page.on("dialog", (dialog) => void dialog.accept());

    await signIn(page, SEED_EMAIL, SEED_PASSWORD);
    await page.goto("/admin/settings/software");

    // CREATE through the UI.
    await page.locator('[data-action="open-new-asset"]').click();
    await page.locator("#asset-name").fill(assetName);
    await page.locator("#asset-kind").fill("Test fixture");
    await page.locator("#asset-maintainer").fill("E2E suite");
    await page.locator("#asset-status").fill("active");
    await page.getByRole("button", { name: "Add to the ledger" }).click();

    const card = page.locator(`[data-asset-name="${assetName}"]`);
    await expect(card).toBeVisible({ timeout: 15_000 });

    const { data: created } = await db
      .from("registry_assets")
      .select("id, kind, status")
      .eq("name", assetName)
      .single();
    expect(created?.kind).toBe("Test fixture");

    // EDIT through the UI.
    await card.locator('[data-action="edit-asset"]').click();
    await card.locator("#asset-hosting").fill("Test host");
    await card.getByRole("button", { name: "Save changes" }).click();
    await expect(card).toContainText("Test host", { timeout: 15_000 });

    const { data: edited } = await db
      .from("registry_assets")
      .select("hosting")
      .eq("id", created!.id)
      .single();
    expect(edited?.hosting).toBe("Test host");

    // GRANT add + end through the UI.
    await card.locator('[data-action="toggle-grant-form"]').click();
    await card.locator(`#grant-person-${created!.id}`).fill("TEST Person");
    await card.locator(`#grant-role-${created!.id}`).fill("Owner");
    await card.locator(`#grant-via-${created!.id}`).fill("Portal");
    await card.getByRole("button", { name: "Add", exact: true }).click();
    await expect(card.locator('[data-grant-person="TEST Person"]')).toBeVisible(
      { timeout: 15_000 },
    );

    await card.locator('[data-action="deactivate-grant"]').click();
    await expect(
      card.locator('[data-grant-person="TEST Person"]'),
    ).toContainText("Ended", { timeout: 15_000 });

    // ARCHIVE through the UI.
    await card.locator('[data-action="archive-asset"]').click();
    await expect(card.getByTestId("asset-status")).toHaveText("archived", {
      timeout: 15_000,
    });

    // Audit trail for the whole lifecycle.
    const { data: audits } = await db
      .from("audit_log")
      .select("action")
      .eq("actor_email", SEED_EMAIL.toLowerCase())
      .in("action", [
        "registry.create",
        "registry.update",
        "registry.archive",
      ])
      .order("at", { ascending: false })
      .limit(20);
    const actions = (audits ?? []).map((row) => row.action);
    expect(actions).toContain("registry.create");
    expect(actions).toContain("registry.update");
    expect(actions).toContain("registry.archive");

    // STAFF role: server-side rejection at the network level.
    const staffEmail = `reg-${runId}-staff@example.test`;
    const staffPassword = `Rg-${randomUUID()}`;
    const { data: staffUser, error: createError } =
      await db.auth.admin.createUser({
        email: staffEmail,
        password: staffPassword,
        email_confirm: true,
      });
    expect(createError).toBeNull();
    await db.from("staff_profiles").insert({
      user_id: staffUser!.user!.id,
      email: staffEmail,
      display_name: "TEST Registry Staff",
      role: "staff",
      active: true,
    });

    const staffContext = await browser.newContext();
    const staffPage = await staffContext.newPage();
    await signIn(staffPage, staffEmail, staffPassword);

    // UI withholds mutation controls from staff.
    await staffPage.goto("/admin/settings/software");
    await expect(
      staffPage.locator('[data-asset-name="Westchase GI website"]'),
    ).toBeVisible();
    await expect(
      staffPage.locator('[data-action="open-new-asset"]'),
    ).toHaveCount(0);
    await expect(
      staffPage.locator('[data-action="edit-asset"]'),
    ).toHaveCount(0);

    // Direct call with the staff session is rejected server-side.
    const rejected = await staffPage.request.post("/admin/settings/mutations", {
      headers: { "Content-Type": "application/json" },
      data: {
        operation: "registry.create",
        input: {
          name: `TEST Registry Asset staff-${runId}`,
          kind: "Should not exist",
          maintainer: "Nobody",
          status: "active",
        },
      },
    });
    expect(rejected.status()).toBe(403);
    const { data: staffCreated } = await db
      .from("registry_assets")
      .select("id")
      .eq("name", `TEST Registry Asset staff-${runId}`);
    expect(staffCreated).toHaveLength(0);

    await staffContext.close();
  });
});
