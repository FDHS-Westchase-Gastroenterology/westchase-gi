import { test, expect } from "@playwright/test";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy";

// Harness smoke: proves the QA stack can drive the app at all.
// VAL-ENV-007 — /en renders the home hero; /admin redirects
// unauthenticated visitors toward the login surface.

test("branch previews use one shared gate without changing Production", async () => {
  const original = {
    environment: process.env.VERCEL_ENV,
    username: process.env.PREVIEW_BASIC_AUTH_USERNAME,
    password: process.env.PREVIEW_BASIC_AUTH_PASSWORD,
  };

  try {
    process.env.VERCEL_ENV = "preview";
    process.env.PREVIEW_BASIC_AUTH_USERNAME = "reviewer";
    process.env.PREVIEW_BASIC_AUTH_PASSWORD = "test-only-preview-password";

    const unauthorized = await proxy(
      new NextRequest("https://preview.example/en"),
    );
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get("www-authenticate")).toContain("Basic");

    const authorization = `Basic ${Buffer.from(
      "reviewer:test-only-preview-password",
    ).toString("base64")}`;
    const authorized = await proxy(
      new NextRequest("https://preview.example/en", {
        headers: { authorization },
      }),
    );
    expect(authorized.status).toBe(200);

    delete process.env.PREVIEW_BASIC_AUTH_PASSWORD;
    const unconfigured = await proxy(
      new NextRequest("https://preview.example/en"),
    );
    expect(unconfigured.status).toBe(503);

    process.env.VERCEL_ENV = "production";
    const production = await proxy(
      new NextRequest("https://westchasegi.com/en"),
    );
    expect(production.status).toBe(200);
  } finally {
    for (const [name, value] of [
      ["VERCEL_ENV", original.environment],
      ["PREVIEW_BASIC_AUTH_USERNAME", original.username],
      ["PREVIEW_BASIC_AUTH_PASSWORD", original.password],
    ] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("home page renders the hero on /en", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Digestive health, in caring hands",
  );
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
