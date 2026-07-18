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

test("/ negotiates the locale from Accept-Language and the locale cookie", async ({
  playwright,
}) => {
  const cases: Array<{
    headers: Record<string, string>;
    expected: string;
  }> = [
    // No signal: English stays the default.
    { headers: {}, expected: "/en" },
    // Browser language wins for first-time visitors.
    { headers: { "Accept-Language": "es-MX,es;q=0.9,en;q=0.5" }, expected: "/es" },
    { headers: { "Accept-Language": "ko-KR,ko;q=0.9" }, expected: "/ko" },
    // Unsupported languages fall back to English.
    { headers: { "Accept-Language": "fr-FR,fr;q=0.9" }, expected: "/en" },
    // A remembered locale beats the browser language.
    {
      headers: {
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: "wgi-locale=vi",
      },
      expected: "/vi",
    },
  ];

  for (const { headers, expected } of cases) {
    const context = await playwright.request.newContext({
      baseURL: "http://localhost:3100",
    });
    const response = await context.get("/", {
      maxRedirects: 0,
      headers,
    });
    expect(response.status()).toBe(307);
    expect(
      new URL(response.headers().location, "http://localhost:3100").pathname,
    ).toBe(expected);
    await context.dispose();
  }
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
