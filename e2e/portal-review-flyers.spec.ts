import { randomUUID } from "node:crypto";
import {
  expect,
  test,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { loadLocalEnv, requiredEnv, serviceDb } from "./support";

loadLocalEnv();

const SEED_ADMIN_EMAIL = requiredEnv("PORTAL_SEED_ADMIN_EMAIL");
const SEED_ADMIN_PASSWORD = requiredEnv("PORTAL_SEED_ADMIN_PASSWORD");

const TARGETS = [
  {
    key: "master",
    title: "Master code — review hub",
    credentials: null,
    files: {
      png: "WGI-Master-Review-Hub-QR.png",
      svg: "WGI-Master-Review-Hub-QR.svg",
      pdf: "WGI-Master-Review-Hub-Flyer.pdf",
    },
  },
  {
    key: "practice",
    title: "Whole practice — straight to Google",
    credentials: null,
    files: {
      png: "WGI-Practice-Review-QR.png",
      svg: "WGI-Practice-Review-QR.svg",
      pdf: "WGI-Practice-Review-Flyer.pdf",
    },
  },
  {
    key: "awad",
    title: "Dr. Amir Awad",
    credentials: "MD",
    files: {
      png: "Dr-Awad-Review-QR.png",
      svg: "Dr-Awad-Review-QR.svg",
      pdf: "Dr-Awad-Review-Flyer.pdf",
    },
  },
  {
    key: "chang",
    title: "Dr. John Chang",
    credentials: "MD, FACG",
    files: {
      png: "Dr-Chang-Review-QR.png",
      svg: "Dr-Chang-Review-QR.svg",
      pdf: "Dr-Chang-Review-Flyer.pdf",
    },
  },
  {
    key: "mendoza",
    title: "Dr. Alfredo Mendoza",
    credentials: "MD, MS",
    files: {
      png: "Dr-Mendoza-Review-QR.png",
      svg: "Dr-Mendoza-Review-QR.svg",
      pdf: "Dr-Mendoza-Review-Flyer.pdf",
    },
  },
  {
    key: "taylor",
    title: "Taylor Emmerman",
    credentials: "MSN, APRN, FNP-C",
    files: {
      png: "Taylor-Emmerman-Review-QR.png",
      svg: "Taylor-Emmerman-Review-QR.svg",
      pdf: "Taylor-Emmerman-Review-Flyer.pdf",
    },
  },
] as const;

const ASSETS = TARGETS.flatMap((target) =>
  (Object.entries(target.files) as Array<
    ["png" | "svg" | "pdf", string]
  >).map(([kind, filename]) => ({
    filename,
    contentType: {
      png: "image/png",
      svg: "image/svg+xml",
      pdf: "application/pdf",
    }[kind],
  })),
);

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 15_000 });
}

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Authenticated portal UI");
});

test("review flyers enforce the page and asset role boundary", async ({
  browser,
  page,
  request,
}) => {
  test.setTimeout(180_000);

  const signedOut = await request.get("/admin/review-flyers", {
    maxRedirects: 0,
  });
  expect(signedOut.status()).toBe(307);
  expect(
    new URL(signedOut.headers().location, "http://localhost:3100").pathname,
  ).toBe("/admin/login");

  const signedOutAsset = await request.get(
    "/admin/review-flyers/assets/WGI-Practice-Review-QR.png",
    { maxRedirects: 0 },
  );
  expect(signedOutAsset.status()).toBe(401);

  const db = serviceDb();
  const staffEmail = `review-flyers-${randomUUID().slice(0, 8)}@example.test`;
  const staffPassword = `Flyers-${randomUUID()}-aA1!`;
  const created = await db.auth.admin.createUser({
    email: staffEmail,
    password: staffPassword,
    email_confirm: true,
  });
  expect(created.error).toBeNull();
  const staffUserId = created.data.user?.id;
  if (!staffUserId) throw new Error("Review-flyer staff fixture failed");

  let staffContext: BrowserContext | null = null;
  try {
    const profile = await db.from("staff_profiles").insert({
      user_id: staffUserId,
      email: staffEmail,
      display_name: "TEST Review Flyer Staff",
      role: "staff",
      active: true,
      onboarded_at: new Date().toISOString(),
    });
    expect(profile.error).toBeNull();

    staffContext = await browser.newContext();
    const staffPage = await staffContext.newPage();
    await signIn(staffPage, staffEmail, staffPassword);
    await expect(
      staffPage.getByRole("link", { name: "Print review flyers" }),
    ).toHaveCount(0);

    await staffPage.goto("/admin/review-flyers");
    await expect(staffPage).toHaveURL(/\/admin\/?$/);
    await expect(
      staffPage.getByRole("heading", { name: "Print review flyers" }),
    ).toHaveCount(0);

    for (const asset of ASSETS) {
      const response = await staffContext.request.get(
        `/admin/review-flyers/assets/${encodeURIComponent(asset.filename)}`,
      );
      expect(response.status(), `staff asset access: ${asset.filename}`).toBe(
        403,
      );
    }
  } finally {
    await staffContext?.close().catch(() => undefined);
    await db.from("staff_profiles").delete().eq("user_id", staffUserId);
    await db.auth.admin.deleteUser(staffUserId);
  }

  await signIn(page, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD);
  await expect(
    page.getByRole("link", { name: "Print review flyers" }),
  ).toBeVisible();
  await page.goto("/admin/review-flyers");

  const cards = page.locator("[data-review-target]");
  await expect(cards).toHaveCount(6);
  for (const [index, target] of TARGETS.entries()) {
    const card = cards.nth(index);
    const copy = await card.evaluate((node) => {
      const credential = [...node.querySelectorAll("p")].find((paragraph) =>
        paragraph.classList.contains("font-bold"),
      );
      return {
        key: (node as HTMLElement).dataset.reviewTarget,
        title: node.querySelector("h2")?.textContent?.trim() ?? null,
        credentials: credential?.textContent?.trim() ?? null,
      };
    });
    expect(copy).toEqual({
      key: target.key,
      title: target.title,
      credentials: target.credentials,
    });
    await expect(
      card.getByRole("button", { name: "Print flyer" }),
    ).toBeVisible();
    for (const name of ["Flyer PDF", "SVG", "PNG"]) {
      await expect(card.getByRole("link", { name })).toBeVisible();
    }
  }

  for (const asset of ASSETS) {
    const path =
      `/admin/review-flyers/assets/${encodeURIComponent(asset.filename)}`;
    for (const [query, disposition] of [
      ["", "inline"],
      ["?download=1", "attachment"],
    ] as const) {
      const response = await page.request.get(`${path}${query}`);
      expect(
        response.status(),
        `${disposition} asset response: ${asset.filename}`,
      ).toBe(200);
      expect(response.headers()["content-type"]).toBe(asset.contentType);
      const cacheControl = response.headers()["cache-control"];
      expect(cacheControl).toContain("private");
      expect(cacheControl).toContain("no-store");
      expect(cacheControl).toContain("max-age=0");
      expect(response.headers()["x-content-type-options"]).toBe("nosniff");
      expect(response.headers()["content-disposition"]).toBe(
        `${disposition}; filename="${asset.filename}"`,
      );
      expect((await response.body()).byteLength).toBeGreaterThan(0);
    }
  }

  const unknown = await page.request.get(
    "/admin/review-flyers/assets/not-in-the-manifest.pdf",
  );
  expect(unknown.status()).toBe(404);

  for (const traversal of [
    "%2e%2e%2fpackage.json",
    "..%2F..%2Fpackage.json",
  ]) {
    const response = await page.request.get(
      `/admin/review-flyers/assets/${traversal}`,
    );
    expect(
      response.status(),
      `path traversal must miss the allowlist: ${traversal}`,
    ).not.toBe(200);
  }
});

test("review flyer printing is letter-sized, responsive, and self-contained", async ({
  page,
}) => {
  test.setTimeout(120_000);

  const browserRequests: string[] = [];
  page.on("request", (request) => browserRequests.push(request.url()));
  await page.addInitScript(() => {
    window.print = () => {
      const root = document.documentElement;
      root.dataset.testPrintCalls = String(
        Number(root.dataset.testPrintCalls ?? "0") + 1,
      );
    };
  });

  await signIn(page, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD);
  await page.goto("/admin/review-flyers");

  const viewportActionSizes: Array<{
    viewport: number;
    label?: string;
    width: number;
    height: number;
  }> = [];
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/admin/review-flyers");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(
      overflow,
      `horizontal overflow at ${viewport.width}px`,
    ).toBeLessThanOrEqual(0);

    const actionSizes = await page
      .locator(".review-flyer-screen :is(button, a)")
      .evaluateAll((actions) =>
        actions.map((action) => {
          const box = action.getBoundingClientRect();
          return {
            label: action.textContent?.trim(),
            width: box.width,
            height: box.height,
          };
        }),
      );
    // 24 flyer actions + the "Print all six flyers" button + the Home
    // breadcrumb link (44px touch target like every other action).
    expect(actionSizes).toHaveLength(26);
    for (const action of actionSizes) {
      viewportActionSizes.push({ viewport: viewport.width, ...action });
    }
  }

  await page
    .locator('[data-review-target="awad"]')
    .getByRole("button", { name: "Print flyer" })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-review-flyer-print",
    "awad",
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-test-print-calls",
    "1",
  );

  await page.emulateMedia({ media: "print" });
  const individualPrint = await page.locator("[data-review-flyer]").evaluateAll(
    (flyers) =>
      flyers.map((flyer) => ({
        key: (flyer as HTMLElement).dataset.reviewFlyer,
        display: getComputedStyle(flyer).display,
        height: flyer.getBoundingClientRect().height,
      })),
  );
  expect(individualPrint.filter((flyer) => flyer.display !== "none")).toEqual([
    { key: "awad", display: "flex", height: 960 },
  ]);
  const individualPdf = await PDFDocument.load(
    await page.pdf({ preferCSSPageSize: true, printBackground: true }),
  );
  expect(individualPdf.getPageCount()).toBe(1);

  const pageRule = await page.evaluate(() => {
    const cssTexts: string[] = [];
    for (const sheet of document.styleSheets) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of rules) {
        if (rule instanceof CSSPageRule) cssTexts.push(rule.cssText);
      }
    }
    return cssTexts.find((text) => /size:\s*letter/i.test(text)) ?? null;
  });
  expect(pageRule).toMatch(/size:\s*letter/i);
  expect(pageRule).toMatch(/margin:\s*0\.45in/i);

  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: "Print all six flyers" }).click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-review-flyer-print",
    "all",
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-test-print-calls",
    "2",
  );

  await page.emulateMedia({ media: "print" });
  const allPrint = await page.locator("[data-review-flyer]").evaluateAll(
    (flyers) =>
      flyers.map((flyer) => ({
        display: getComputedStyle(flyer).display,
        height: flyer.getBoundingClientRect().height,
        breakAfter: getComputedStyle(flyer).breakAfter,
      })),
  );
  expect(allPrint).toHaveLength(6);
  for (const [index, flyer] of allPrint.entries()) {
    expect(flyer.display).toBe("flex");
    expect(flyer.height).toBe(960);
    if (index < 5) expect(flyer.breakAfter).toBe("page");
  }
  const combinedPdf = await PDFDocument.load(
    await page.pdf({ preferCSSPageSize: true, printBackground: true }),
  );
  expect(combinedPdf.getPageCount()).toBe(6);

  await page.emulateMedia({ media: "screen" });
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(page.locator("body")).not.toHaveAttribute(
    "data-review-flyer-print",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  await expect(page.locator("body")).toHaveAttribute(
    "data-review-flyer-print",
    "practice",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(page.locator("body")).not.toHaveAttribute(
    "data-review-flyer-print",
  );

  const forbiddenRequests = browserRequests.filter((rawUrl) => {
    const url = new URL(rawUrl);
    return (
      url.hostname === "wgi-review-qr.vercel.app" ||
      url.pathname.startsWith("/storage/v1/")
    );
  });
  expect(forbiddenRequests).toEqual([]);

  for (const action of viewportActionSizes) {
    expect(
      action.width,
      `${action.label} width at ${action.viewport}px`,
    ).toBeGreaterThanOrEqual(44);
    expect(
      action.height,
      `${action.label} height at ${action.viewport}px`,
    ).toBeGreaterThanOrEqual(44);
  }
});
