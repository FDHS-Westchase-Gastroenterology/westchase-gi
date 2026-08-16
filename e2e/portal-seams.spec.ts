import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { intakeResponseSchema } from "../src/lib/portal/contracts";
import { loadLocalEnv, requiredEnv } from "./support";

// VAL-REG-005 (revised 2026-07-26): the portal ships no assistant
// Placeholder. The docked "coming soon" launcher was removed because a
// Floating control that completes no job obstructs real work — it
// Returns only when an assistant can finish something. The seam itself
// Is unchanged: when it lands it will be a docked widget, with no
// Dedicated page and no nav entry.

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
  "/admin/settings",
  "/admin/settings/software",
  "/admin/audit",
  "/admin/help",
];

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "JS portal UI");
});

test("VAL-REG-005: no assistant placeholder ships before the assistant works", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page);

  // Stage one request so a detail page exists for the portal-wide check.
  const response = await page.request.post("/api/requests", {
    data: {
      name: "TEST Assistant Widget",
      phone: "8135550188",
      email: "assistant-widget@example.test",
      location: "any",
      time: "any",
      locale: "en",
      sourcePath: "/en/appointment",
    },
    headers: { "X-Forwarded-For": "2001:db8:5ea3:1::5" },
  });
  expect(response.status()).toBe(201);
  const body = intakeResponseSchema.parse(await response.json());
  if (!body.ok) throw new Error("Expected an accepted intake response");
  const { id } = body;

  // No floating placeholder covers content on any portal page.
  const everyPage = [...PORTAL_PAGES, `/admin/requests/${id}`];
  for (const path of everyPage) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(
      page.getByTestId("assistant-launcher"),
      `placeholder launcher present on ${path}`,
    ).toHaveCount(0);
    await expect(
      page.getByTestId("assistant-panel"),
      `placeholder panel present on ${path}`,
    ).toHaveCount(0);
  }

  // No dedicated assistant page or nav entry exists.
  await page.goto("/admin");
  await expect(
    page.locator('nav[aria-label="Portal sections"] a', {
      hasText: "Assistant",
    }),
  ).toHaveCount(0);
  const assistantPage = await page.request.get("/admin/assistant", {
    maxRedirects: 0,
  });
  expect([404, 307]).toContain(assistantPage.status());

  // Cleanup the staged request.
  const { serviceDb } = await import("./support");
  await serviceDb().from("requests").delete().eq("id", id);
});
