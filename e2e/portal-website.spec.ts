import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { loadLocalEnv, requiredEnv, serviceDb } from "./support";

loadLocalEnv();

const SEED_EMAIL = requiredEnv("PORTAL_SEED_ADMIN_EMAIL");
const SEED_PASSWORD = requiredEnv("PORTAL_SEED_ADMIN_PASSWORD");
const REPOSITORY = "FDHS-Westchase-Gastroenterology/westchase-gi";
const GITHUB_CONFIGURATION_COUNT = [
  "PORTAL_GITHUB_APP_ID",
  "PORTAL_GITHUB_APP_INSTALLATION_ID",
  "PORTAL_GITHUB_APP_PRIVATE_KEY",
].filter((name) => Boolean(process.env[name]?.trim())).length;

const db = serviceDb();
const runId = randomUUID().slice(0, 8);
const staffEmail = `website-${runId}-staff@example.test`;
const staffPassword = `Ws-${randomUUID()}-aA1!`;
let staffUserId: string | null = null;

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 15_000 });
}

test.describe("website custody", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "JS portal UI");
  });

  test.beforeAll(async () => {
    const created = await db.auth.admin.createUser({
      email: staffEmail,
      password: staffPassword,
      email_confirm: true,
    });
    expect(created.error).toBeNull();
    staffUserId = created.data.user?.id ?? null;
    if (!staffUserId) throw new Error("Staff fixture creation failed");

    const profile = await db.from("staff_profiles").insert({
      user_id: staffUserId,
      email: staffEmail,
      display_name: "TEST Website Staff",
      role: "staff",
      active: true,
      onboarded_at: new Date().toISOString(),
    });
    expect(profile.error).toBeNull();
  });

  test.afterAll(async () => {
    if (!staffUserId) return;
    await db.from("staff_profiles").delete().eq("user_id", staffUserId);
    await db.auth.admin.deleteUser(staffUserId);
  });

  test("admin sees one product, live custody facts, and the working flyer task", async ({
    page,
  }) => {
    const browserProviderRequests: string[] = [];
    page.on("request", (request) => {
      const host = new URL(request.url()).hostname;
      if (host === "api.github.com" || host.endsWith(".github.com")) {
        browserProviderRequests.push(request.url());
      }
    });

    await signIn(page, SEED_EMAIL, SEED_PASSWORD);
    await page.goto("/admin/settings/software");

    await expect(page.getByRole("link", { name: "Website" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const product = page.getByTestId("managed-product");
    await expect(product).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Westchase GI", exact: true }),
    ).toBeVisible();
    await expect(page.getByText(REPOSITORY, { exact: true })).toHaveCount(1);

    for (const capability of [
      "Patient-facing website",
      "Authenticated staff portal",
      "Authenticated review-flyer printer",
    ]) {
      await expect(product).toContainText(capability);
    }

    for (const removedControl of [
      "Add asset",
      "Edit",
      "Archive",
      "Add access",
      "End access",
    ]) {
      await expect(
        page.getByRole("button", { name: removedControl, exact: true }),
      ).toHaveCount(0);
    }
    await expect(page.getByTestId("integration-vercel")).toHaveCount(0);
    await expect(page.getByText("Once connected, it will manage")).toHaveCount(0);
    for (const retiredAssetName of [
      ["Staff", "admin", "portal"].join(" "),
      ["Review", "QR", "print", "tool"].join(" "),
    ]) {
      await expect(
        page.getByText(retiredAssetName, { exact: true }),
      ).toHaveCount(0);
    }

    const github = page.getByTestId("integration-github");
    await expect(github).toBeVisible();
    const expectedStatus =
      GITHUB_CONFIGURATION_COUNT === 3
        ? "Connected"
        : GITHUB_CONFIGURATION_COUNT === 0
          ? "Not configured"
          : "Connection unavailable";
    await expect(github.getByTestId("integration-status")).toHaveText(
      expectedStatus,
    );
    if (expectedStatus === "Connected") {
      await expect(github).toContainText("Connected account");
      await expect(github).toContainText("Installation scope");
    }
    expect(browserProviderRequests).toHaveLength(0);

    const flyerTask = product.getByRole("link", { name: "Print review flyers" });
    await expect(flyerTask).toHaveAttribute("href", "/admin/review-flyers");
    await flyerTask.click();
    await expect(
      page.getByRole("heading", { name: "Print review flyers" }),
    ).toBeVisible();

    await page.goto("/admin/registry");
    await expect(page).toHaveURL(/\/admin\/settings\/software\/?$/);
  });

  test("staff can open Website without receiving the administrator flyer task", async ({
    page,
  }) => {
    await signIn(page, staffEmail, staffPassword);
    await page.goto("/admin/settings/software");

    await expect(page.getByTestId("managed-product")).toHaveCount(1);
    await expect(page.getByText(REPOSITORY, { exact: true })).toHaveCount(1);
    await expect(
      page.getByRole("link", { name: "Print review flyers" }),
    ).toHaveCount(0);
  });
});
