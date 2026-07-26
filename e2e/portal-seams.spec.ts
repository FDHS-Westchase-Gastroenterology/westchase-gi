import { test, expect, type Page } from "@playwright/test";
import { loadLocalEnv, requiredEnv } from "./support";

// VAL-REG-005: no placeholder assistant competes with current patient work.
// A future assistant must enter through a completed, bounded workflow.

loadLocalEnv();

const SEED_EMAIL = requiredEnv("PORTAL_SEED_ADMIN_EMAIL");
const SEED_PASSWORD = requiredEnv("PORTAL_SEED_ADMIN_PASSWORD");

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(SEED_EMAIL);
  await page.getByLabel("Password").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 15_000 });
}

const PORTAL_PAGES = [
  "/admin",
  "/admin/requests",
  "/admin/settings",
  "/admin/settings/software",
  "/admin/audit",
  "/admin/help",
];

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "JS portal UI");
});

test("VAL-REG-005: placeholder assistant stays absent from portal work", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page);

  for (const path of PORTAL_PAGES) {
    await page.goto(path);
    await expect(
      page.getByTestId("assistant-launcher"),
      `placeholder launcher present on ${path}`,
    ).toHaveCount(0);
    await expect(page.getByTestId("assistant-panel")).toHaveCount(0);
  }

  await expect(
    page.locator('nav[aria-label="Portal sections"] a', {
      hasText: "Assistant",
    }),
  ).toHaveCount(0);
  const assistantPage = await page.request.get("/admin/assistant", {
    maxRedirects: 0,
  });
  expect([404, 307]).toContain(assistantPage.status());
});
