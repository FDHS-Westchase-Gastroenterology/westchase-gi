import { test, expect } from "@playwright/test";

// Harness smoke: proves the QA stack can drive the app at all.
// VAL-ENV-007 — /en renders the home hero; /admin redirects
// Unauthenticated visitors toward the login surface.

test("home page renders the hero on /en", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Digestive health, in caring hands",
  );
});

test("appointment submission cannot re-enter while its request is pending", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "JS submission path");

  let requestCount = 0;
  let releaseRequest!: () => void;
  const heldRequest = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });

  await page.route("**/api/requests", async (route) => {
    requestCount += 1;
    await heldRequest;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        id: "00000000-0000-4000-8000-000000000001",
      }),
    });
  });

  await page.goto("/en/appointment");
  // No chooser dismissal: the default en-US evidence matches /en, so the
  // Evidence-gated dialog never opens (P0-2).
  const form = page.locator('form[action="/api/requests/form"]');
  await expect(form).toHaveAttribute("data-hydrated", "true");
  await page.fill("#name", "TEST Re-entry Guard");
  await page.fill("#phone", "8135550142");
  await page.evaluate(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (...args) => {
      const root = document.documentElement;
      root.dataset.intakeFetchCount = String(
        Number(root.dataset.intakeFetchCount ?? "0") + 1,
      );
      return originalFetch(...args);
    };
  });

  await form.evaluate((element) => {
    if (!(element instanceof HTMLFormElement)) {
      throw new Error("expected form");
    }
    element.requestSubmit();
    element.requestSubmit();
  });

  try {
    await expect(page.locator("html")).toHaveAttribute(
      "data-intake-fetch-count",
      "1",
    );
    await expect
      .poll(() => requestCount, { timeout: 5_000 })
      .toBe(1);
    await expect(form.getByRole("button", { name: "Sending…" })).toBeDisabled();
  } finally {
    releaseRequest();
  }

  await expect(page.getByText("Request received")).toBeVisible();
});

test("public metadata uses the apex canonical origin", async ({ page, request }) => {
  const origin = "https://westchasegi.com";
  const redirectingOrigin = "https://www.westchasegi.com";

  await page.goto("/en");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${origin}/en`,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    `${origin}/en`,
  );

  const alternates = await page
    .locator('link[rel="alternate"][hreflang]')
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(alternates).toEqual([
    `${origin}/en`,
    `${origin}/es`,
    `${origin}/vi`,
    `${origin}/ko`,
    `${origin}/ar`,
    `${origin}/en`,
  ]);

  const jsonLd = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  expect(jsonLd.join("")).toContain(origin);
  expect(jsonLd.join("")).not.toContain(redirectingOrigin);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain(`<loc>${origin}/en</loc>`);
  expect(sitemapText).toContain(`href="${origin}/es"`);
  expect(sitemapText).not.toContain(redirectingOrigin);

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  const robotsText = await robots.text();
  expect(robotsText).toContain(`Sitemap: ${origin}/sitemap.xml`);
  expect(robotsText).not.toContain(redirectingOrigin);

  await page.goto("/review");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${origin}/review`,
  );
});

test("/ negotiates the locale from Accept-Language and the locale cookie", async ({
  playwright,
  baseURL,
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
    const context = await playwright.request.newContext({ baseURL });
    const response = await context.get("/", {
      maxRedirects: 0,
      headers,
    });
    expect(response.status()).toBe(307);
    expect(
      new URL(response.headers().location, "http://localhost").pathname,
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
      "http://localhost",
    ).pathname,
  ).toBe("/admin/login");

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login\/?$/);
  await expect(
    page.getByRole("heading", { name: "Staff sign in" }),
  ).toBeVisible();
});
