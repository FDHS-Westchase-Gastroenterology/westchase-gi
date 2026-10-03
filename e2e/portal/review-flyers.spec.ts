import { expect, test } from "@playwright/test";
import type { BrowserContext } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

import { serviceDb } from "../harness/env";
import { createStaffFixture, signIn } from "../harness/session";

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

const FILE_KINDS = ["png", "svg", "pdf"] as const;
const ASSETS = TARGETS.flatMap((target) =>
  FILE_KINDS.map((kind) => ({
    filename: target.files[kind],
    contentType: {
      png: "image/png",
      svg: "image/svg+xml",
      pdf: "application/pdf",
    }[kind],
  })),
);

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Authenticated portal UI");
});

const FILE_ROWS = [
  { kind: "pdf", name: "PDF: For printing at a print shop" },
  { kind: "svg", name: "SVG: For a designer; scales to any size" },
  { kind: "png", name: "PNG: For email, a slide, or social posts" },
  { kind: "zip", name: "All three, as one .zip" },
] as const;

test("review flyers stay closed to visitors and open to every staff member", async ({
  browser,
  page,
  request,
}) => {
  test.setTimeout(180_000);

  const signedOut = await request.get("/admin/review-flyers", {
    maxRedirects: 0,
  });
  expect(signedOut.status()).toBe(307);
  expect(new URL(signedOut.headers().location, "http://localhost:3100").pathname).toBe(
    "/admin/login",
  );

  const signedOutAsset = await request.get(
    "/admin/review-flyers/assets/WGI-Practice-Review-QR.png",
    { maxRedirects: 0 },
  );
  expect(signedOutAsset.status()).toBe(401);
  const signedOutArchive = await request.get("/admin/review-flyers/zip/practice", {
    maxRedirects: 0,
  });
  expect(signedOutArchive.status()).toBe(401);

  const staff = await createStaffFixture(serviceDb(), {
    prefix: "review-flyers",
    displayName: "TEST Review Flyer Staff",
  });

  let staffContext: BrowserContext | null = null;
  try {
    staffContext = await browser.newContext();
    const staffPage = await staffContext.newPage();
    await signIn(staffPage, staff);
    // Handing flyers to patients is a front-desk job: printing is open to
    // Every active staff member (product decision 2026-07-26), while
    // Anonymous access stays closed.
    await expect(
      staffPage
        .getByLabel("Portal workspace")
        .getByRole("list", { name: "Patient materials" })
        .getByRole("link", { name: "Review flyers" }),
    ).toBeVisible();

    await staffPage.goto("/admin/review-flyers");
    await expect(staffPage.getByRole("heading", { name: "Review flyers", level: 1 })).toBeVisible();
    await expect(staffPage.locator("[data-review-target]")).toHaveCount(6);

    for (const asset of ASSETS) {
      const response = await staffContext.request.get(
        `/admin/review-flyers/assets/${encodeURIComponent(asset.filename)}`,
      );
      expect(response.status(), `staff asset access: ${asset.filename}`).toBe(200);
    }
    const staffArchive = await staffContext.request.get("/admin/review-flyers/zip/awad");
    expect(staffArchive.status()).toBe(200);
  } finally {
    await staffContext?.close().catch(() => undefined);
    await staff.dispose();
  }

  await signIn(page);
  await expect(
    page
      .getByLabel("Portal workspace")
      .getByRole("list", { name: "Patient materials" })
      .getByRole("link", { name: "Review flyers" }),
  ).toBeVisible();
  await page.goto("/admin/review-flyers");

  const cards = page.locator("[data-review-target]");
  await expect(cards).toHaveCount(6);
  for (const [index, target] of TARGETS.entries()) {
    const card = cards.nth(index);
    const copy = await card.evaluate((node) => {
      if (!(node instanceof HTMLElement)) {
        throw new Error("expected HTMLElement");
      }
      return {
        key: node.dataset.reviewTarget,
        title: node.querySelector("h2")?.textContent.trim() ?? null,
        credentials: node.querySelector(".wgi-flyer-credentials")?.textContent.trim() ?? null,
        code: node.querySelector(".wgi-flyer-preview img")?.getAttribute("src") ?? null,
      };
    });
    expect(copy).toEqual({
      key: target.key,
      title: target.title,
      credentials: target.credentials,
      code: `/admin/review-flyers/assets/${encodeURIComponent(target.files.svg)}`,
    });
    // The preview is the real code, loaded through the staff-only route.
    await expect
      .poll(async () =>
        card
          .locator(".wgi-flyer-preview img")
          .evaluate((image) => image instanceof HTMLImageElement && image.naturalWidth > 0),
      )
      .toBe(true);

    // Focus reveals Print and Download; Download lists each file by its use.
    await card.getByRole("button", { name: `Print ${target.title}` }).focus();
    await expect(card.getByRole("group", { name: `${target.title}: print or download` })).toHaveCSS(
      "opacity",
      "1",
    );
    await card.getByRole("button", { name: `Download ${target.title}` }).click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    for (const row of FILE_ROWS) {
      const item = menu.getByRole("menuitem", { name: row.name });
      await expect(item).toBeVisible();
      await expect(item).toHaveAttribute("data-review-download", row.kind);
      if (row.kind === "zip") {
        await expect(item).toHaveAttribute("href", `/admin/review-flyers/zip/${target.key}`);
      } else {
        await expect(item).toHaveAttribute(
          "href",
          `/admin/review-flyers/assets/${encodeURIComponent(target.files[row.kind])}?download=1`,
        );
        await expect(item).toHaveAttribute("download", target.files[row.kind]);
      }
    }
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
  }

  for (const asset of ASSETS) {
    const path = `/admin/review-flyers/assets/${encodeURIComponent(asset.filename)}`;
    for (const [query, disposition] of [
      ["", "inline"],
      ["?download=1", "attachment"],
    ] as const) {
      const response = await page.request.get(`${path}${query}`);
      expect(response.status(), `${disposition} asset response: ${asset.filename}`).toBe(200);
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

  for (const target of TARGETS) {
    const response = await page.request.get(`/admin/review-flyers/zip/${target.key}`);
    expect(response.status(), `archive response: ${target.key}`).toBe(200);
    expect(response.headers()["content-type"]).toBe("application/zip");
    const cacheControl = response.headers()["cache-control"];
    expect(cacheControl).toContain("private");
    expect(cacheControl).toContain("no-store");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["content-disposition"]).toBe(
      `attachment; filename="${target.files.pdf.replace(/-Flyer\.pdf$/u, "")}.zip"`,
    );
  }
  const unknownArchive = await page.request.get("/admin/review-flyers/zip/not-a-flyer");
  expect(unknownArchive.status()).toBe(404);

  // A double click on a download row starts one download and says so.
  const masterCard = cards.filter({
    has: page.getByRole("heading", { name: "Master code — review hub" }),
  });
  let masterPdfDownloads = 0;
  page.on("download", (download) => {
    const url = new URL(download.url());
    if (url.pathname.endsWith("/WGI-Master-Review-Hub-Flyer.pdf")) masterPdfDownloads += 1;
  });
  const masterDownload = page.waitForEvent("download");
  await masterCard.getByRole("button", { name: "Download Master code — review hub" }).click();
  await page
    .getByRole("menuitem", { name: "PDF: For printing at a print shop" })
    .evaluate((link) => {
      if (!(link instanceof HTMLAnchorElement)) throw new Error("expected flyer download link");
      link.click();
      link.click();
    });
  const downloadedMasterPdf = await masterDownload;
  await expect(page.getByTestId("review-flyer-output-feedback")).toHaveText(
    "Flyer PDF download started for Master code — review hub.",
  );
  await expect.poll(() => masterPdfDownloads).toBe(1);
  await downloadedMasterPdf.delete();

  const unknown = await page.request.get("/admin/review-flyers/assets/not-in-the-manifest.pdf");
  expect(unknown.status()).toBe(404);

  for (const traversal of ["%2e%2e%2fpackage.json", "..%2F..%2Fpackage.json"]) {
    for (const prefix of ["assets", "zip"]) {
      const response = await page.request.get(`/admin/review-flyers/${prefix}/${traversal}`);
      expect(
        response.status(),
        `path traversal must miss the allowlist: ${prefix}/${traversal}`,
      ).not.toBe(200);
    }
  }
});

test("a flyer's actions stay over its card while its Download menu is open", async ({ page }) => {
  await signIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin/review-flyers");

  const card = page.locator('[data-review-target="chang"]');
  const actions = card.getByRole("group", { name: "Dr. John Chang: print or download" });
  await page.mouse.move(0, 0);
  await expect(actions).toHaveCSS("opacity", "0");

  // Opened from the keyboard, focus moves into the portaled menu and leaves
  // The card, so only the open menu keeps the actions in view.
  await page.getByTestId("review-flyer-download-chang").focus();
  // Keyboard focus shows the actions at once, without the pointer's fade.
  await expect(actions).toHaveCSS("transition-duration", "0s");
  await expect(actions).toHaveCSS("opacity", "1");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  await expect(card.locator(":focus")).toHaveCount(0);
  await expect(actions).toHaveCSS("opacity", "1");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(page.getByTestId("review-flyer-download-chang")).toBeFocused();
});

test("review flyer printing is letter-sized, responsive, and self-contained", async ({ page }) => {
  test.setTimeout(120_000);

  const browserRequests: string[] = [];
  page.on("request", (request) => browserRequests.push(request.url()));
  await page.addInitScript(() => {
    window.print = () => {
      const root = document.documentElement;
      root.dataset.testPrintCalls = String(Number(root.dataset.testPrintCalls ?? "0") + 1);
    };
  });

  await signIn(page);
  await page.goto("/admin/review-flyers");

  const viewportActionSizes: {
    viewport: number;
    label?: string;
    width: number;
    height: number;
  }[] = [];
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/admin/review-flyers");
    await expect(page.getByRole("heading", { name: "Review flyers", level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(0);

    const actionSizes = await page
      .locator(".review-flyer-screen :is(button, a)")
      .evaluateAll((actions) =>
        actions.map((action) => {
          const box = action.getBoundingClientRect();
          return {
            label: action.getAttribute("aria-label") ?? action.textContent.trim(),
            width: box.width,
            height: box.height,
          };
        }),
      );
    // Print several, then each of the six flyers' Print and Download.
    expect(actionSizes).toHaveLength(13);
    for (const action of actionSizes) {
      viewportActionSizes.push({ viewport: viewport.width, ...action });
    }
  }

  const individualPrintButton = page.getByTestId("review-flyer-print-awad");
  await individualPrintButton.focus();
  await individualPrintButton.evaluate((button) => {
    if (!(button instanceof HTMLButtonElement)) throw new Error("expected flyer print button");
    button.click();
    button.click();
  });
  await expect(page.locator("body")).toHaveAttribute("data-review-flyer-print", "awad");
  await expect(page.locator("html")).toHaveAttribute("data-test-print-calls", "1");
  await expect(page.getByTestId("review-flyer-output-feedback")).toHaveText(
    "Print dialog is opening for Dr. Amir Awad.",
  );
  await expect(individualPrintButton).toBeFocused();
  await expect(individualPrintButton).toHaveAttribute("aria-disabled", "true");

  const printedFlyers = async () =>
    page.locator("[data-review-flyer]").evaluateAll((flyers) =>
      flyers.flatMap((flyer) => {
        if (!(flyer instanceof HTMLElement)) {
          throw new Error("expected HTMLElement");
        }
        const style = getComputedStyle(flyer);
        if (style.display === "none") return [];
        return [
          {
            key: flyer.dataset.reviewFlyer,
            display: style.display,
            height: flyer.getBoundingClientRect().height,
            breakBefore: style.breakBefore,
            breakAfter: style.breakAfter,
          },
        ];
      }),
    );

  await page.emulateMedia({ media: "print" });
  expect(
    (await printedFlyers()).map(({ key, display, height }) => ({ key, display, height })),
  ).toEqual([{ key: "awad", display: "flex", height: 960 }]);
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
    return cssTexts.find((text) => /@page\s+review-flyer\b/i.test(text)) ?? null;
  });
  expect(pageRule).toMatch(/size:\s*letter/i);
  expect(pageRule).toMatch(/margin:\s*0\.45in/i);

  await page.emulateMedia({ media: "screen" });
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(page.locator("body")).not.toHaveAttribute("data-review-flyer-print");
  await expect(individualPrintButton).not.toHaveAttribute("aria-disabled", "true");

  // Print several starts with every flyer checked: one click prints all six.
  const several = page.getByTestId("review-flyer-print-several");
  await several.click();
  const chooser = page.getByRole("menu");
  await expect(chooser.getByRole("menuitemcheckbox")).toHaveCount(6);
  for (const target of TARGETS) {
    await expect(chooser.getByRole("menuitemcheckbox", { name: target.title })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  }
  const printChosen = page.getByTestId("review-flyer-print-chosen");
  await expect(printChosen).toHaveText("Print all six");
  await printChosen.evaluate((item) => {
    if (!(item instanceof HTMLElement)) throw new Error("expected print item");
    item.click();
    item.click();
  });
  await expect(page.locator("body")).toHaveAttribute("data-review-flyer-print", "all");
  await expect(page.locator("html")).toHaveAttribute("data-test-print-calls", "2");
  await expect(page.getByTestId("review-flyer-output-feedback")).toHaveText(
    "Print dialog is opening for all six flyers.",
  );

  await page.emulateMedia({ media: "print" });
  const allPrint = await printedFlyers();
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
  await expect(page.locator("body")).not.toHaveAttribute("data-review-flyer-print");

  // Unchecking keeps the menu open; the two left print together, one a page.
  await several.click();
  for (const title of [
    "Master code — review hub",
    "Whole practice — straight to Google",
    "Dr. Alfredo Mendoza",
    "Taylor Emmerman",
  ]) {
    await chooser.getByRole("menuitemcheckbox", { name: title }).click();
    await expect(chooser).toBeVisible();
  }
  await expect(printChosen).toHaveText("Print 2 flyers");
  await printChosen.click();
  await expect(page.locator("body")).toHaveAttribute("data-review-flyer-print", "several");
  await expect(page.locator("html")).toHaveAttribute("data-test-print-calls", "3");
  await expect(page.getByTestId("review-flyer-output-feedback")).toHaveText(
    "Print dialog is opening for two flyers.",
  );
  await page.emulateMedia({ media: "print" });
  const severalPrint = await printedFlyers();
  expect(severalPrint.map(({ key, height }) => ({ key, height }))).toEqual([
    { key: "awad", height: 960 },
    { key: "chang", height: 960 },
  ]);
  expect(severalPrint[1]?.breakBefore).toBe("page");
  const severalPdf = await PDFDocument.load(
    await page.pdf({ preferCSSPageSize: true, printBackground: true }),
  );
  expect(severalPdf.getPageCount()).toBe(2);

  await page.emulateMedia({ media: "screen" });
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(page.locator("body")).not.toHaveAttribute("data-review-flyer-print");
  await expect(page.locator("[data-review-flyer-chosen]")).toHaveCount(0);

  // Unchecking every flyer leaves nothing to print.
  await several.click();
  for (const title of ["Dr. Amir Awad", "Dr. John Chang"]) {
    await chooser.getByRole("menuitemcheckbox", { name: title }).click();
  }
  await expect(printChosen).toHaveText("Choose a flyer to print");
  await expect(printChosen).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");

  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  await expect(page.locator("body")).toHaveAttribute("data-review-flyer-print", "practice");
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(page.locator("body")).not.toHaveAttribute("data-review-flyer-print");

  const forbiddenRequests = browserRequests.filter((rawUrl) => {
    const url = new URL(rawUrl);
    return url.hostname === "wgi-review-qr.vercel.app" || url.pathname.startsWith("/storage/v1/");
  });
  expect(forbiddenRequests).toEqual([]);

  for (const action of viewportActionSizes) {
    expect(action.width, `${action.label} width at ${action.viewport}px`).toBeGreaterThanOrEqual(
      44,
    );
    expect(action.height, `${action.label} height at ${action.viewport}px`).toBeGreaterThanOrEqual(
      44,
    );
  }
});
