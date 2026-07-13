import { test, expect } from "@playwright/test";

// Harness smoke: proves the QA stack can drive the app at all.
// VAL-ENV-007 — /en renders the home hero; /admin redirects
// unauthenticated visitors toward the login surface.

test("home page renders the hero on /en", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Digestive health, in caring hands",
  );
});

test("/admin returns a real unauthenticated redirect to login", async ({
  page,
  request,
}) => {
  const rawResponse = await request.get("/admin", { maxRedirects: 0 });
  expect(rawResponse.status()).toBe(307);
  expect(
    new URL(
      rawResponse.headers().location,
      "http://localhost:3100",
    ).pathname,
  ).toBe("/admin/login");

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login\/?$/);
  await expect(
    page.getByRole("heading", { name: "Staff sign in" }),
  ).toBeVisible();
});
