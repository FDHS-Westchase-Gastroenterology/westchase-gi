import { expect, test, type Page, type TestInfo } from "@playwright/test";

const languageNames = ["English", "Español", "Tiếng Việt", "한국어", "العربية"];

function skipWithoutJavaScript(testInfo: TestInfo) {
  test.skip(testInfo.project.name === "no-js", "Chooser behavior requires JavaScript");
}

async function expectNoOpenChooser(page: Page) {
  await expect(page.locator("dialog.language-dialog[open]")).toHaveCount(0);
}

test.describe("first-visit language chooser", () => {
  test.beforeEach(async ({}, testInfo) => skipWithoutJavaScript(testInfo));

  test("fresh unsupported-language visitor sees all five accessible desktop choices", async ({
    page,
    playwright,
  }) => {
    const request = await playwright.request.newContext({
      baseURL: "http://localhost:3100",
      extraHTTPHeaders: { "Accept-Language": "fr-FR,fr;q=0.9" },
    });
    const redirect = await request.get("/", { maxRedirects: 0 });
    expect(redirect.status()).toBe(307);
    expect(
      new URL(redirect.headers().location, "http://localhost:3100").pathname,
    ).toBe("/en");
    expect(redirect.headers()["set-cookie"]).toBeUndefined();
    await request.dispose();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.setExtraHTTPHeaders({ "Accept-Language": "fr-FR,fr;q=0.9" });
    await page.goto("/");

    const dialog = page.getByRole("dialog", { name: "Choose your language" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      "Choose the language you would like to use on this website.",
    );
    await expect(
      dialog.locator(".language-dialog__option > span:first-child"),
    ).toHaveText(languageNames);
    await expect(dialog.locator('button[lang="en"]')).toContainText("Suggested");

    const accessibility = await dialog.evaluate((element) => {
      const labelledBy = element.getAttribute("aria-labelledby");
      const describedBy = element.getAttribute("aria-describedby");
      return {
        modal: element.matches(":modal"),
        label: labelledBy ? document.getElementById(labelledBy)?.textContent : null,
        description: describedBy
          ? document.getElementById(describedBy)?.textContent
          : null,
        activeLanguage: document.activeElement?.getAttribute("lang"),
      };
    });
    expect(accessibility).toEqual({
      modal: true,
      label: "Choose your language",
      description:
        "Choose the language you would like to use on this website. You can change it anytime from the Language menu.",
      activeLanguage: "en",
    });

    for (const language of ["es", "vi", "ko", "ar"]) {
      await page.keyboard.press("Tab");
      await expect(page.locator(":focus")).toHaveAttribute("lang", language);
    }
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toHaveText("Continue in English");
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toHaveAttribute(
      "aria-label",
      "Close language chooser and continue in English",
    );

    const sizes = await dialog.locator(".language-dialog__option").evaluateAll(
      (options) => options.map((option) => option.getBoundingClientRect().height),
    );
    expect(sizes.every((height) => height >= 44)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      1440,
    );
  });

  test("browser suggestion switches locale on the same path and persists", async ({
    page,
    context,
  }) => {
    await page.setExtraHTTPHeaders({
      "Accept-Language": "es-MX,es;q=0.9,en;q=0.5",
    });
    await page.goto("/es/contact");

    const dialog = page.getByRole("dialog", { name: "Elija su idioma" });
    await expect(dialog).toBeVisible();
    await dialog.locator('button[lang="ko"]').click();

    await expect(page).toHaveURL(/\/ko\/contact\/?$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expectNoOpenChooser(page);
    expect((await context.cookies()).find(({ name }) => name === "wgi-locale")?.value).toBe(
      "ko",
    );

    await page.goto("/");
    await expect(page).toHaveURL(/\/ko\/?$/);
    await expectNoOpenChooser(page);
  });

  test("continuing in the current language records completion and leaves the banner independent", async ({
    page,
    context,
  }) => {
    await page.goto("/en");
    const dialog = page.getByRole("dialog", { name: "Choose your language" });
    await expect(dialog).toBeVisible();

    await dialog
      .getByRole("button", { name: "Continue in English", exact: true })
      .click();
    await expectNoOpenChooser(page);
    await expect(page.locator(".notice-banner")).toBeVisible();
    expect((await context.cookies()).find(({ name }) => name === "wgi-locale")?.value).toBe(
      "en",
    );

    await page.getByRole("link", { name: "Contact Us" }).first().click();
    await expect(page).toHaveURL(/\/en\/contact\/?$/);
    await expectNoOpenChooser(page);

    await page.locator(".notice-banner button").click();
    await expect(page.locator(".notice-banner")).toBeHidden();
    await page.reload();
    await expectNoOpenChooser(page);
    await expect(page.locator(".notice-banner")).toBeHidden();
  });

  test("Escape confirms the current language, closes, and returns focus", async ({
    page,
  }) => {
    await page.goto("/en");
    await expect(page.getByRole("dialog", { name: "Choose your language" })).toBeVisible();
    await page.keyboard.press("Escape");

    await expectNoOpenChooser(page);
    await expect(page.locator("#language-menu-trigger")).toBeFocused();
    await expect(page.locator("#language-menu-trigger")).toContainText("English");
  });

  test("a pre-existing locale wins over the browser language and suppresses onboarding", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
    });
    await context.addCookies([
      { name: "wgi-locale", value: "vi", domain: "localhost", path: "/" },
    ]);
    const page = await context.newPage();

    await page.goto("http://localhost:3100/");
    await expect(page).toHaveURL(/\/vi\/?$/);
    await expectNoOpenChooser(page);
    await context.close();
  });

  test("the permanent header menu replaces the remembered preference", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: "wgi-locale", value: "en", domain: "localhost", path: "/" },
    ]);
    await page.goto("/en/contact");
    await expectNoOpenChooser(page);

    await page.locator("#language-menu-trigger").click();
    await page.getByRole("link", { name: "Español", exact: true }).click();
    await expect(page).toHaveURL(/\/es\/contact\/?$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    expect((await context.cookies()).find(({ name }) => name === "wgi-locale")?.value).toBe(
      "es",
    );
    await expectNoOpenChooser(page);
  });

  test("the chooser stays off the review utility and English-only admin", async ({
    page,
  }) => {
    await page.goto("/review");
    await expectNoOpenChooser(page);
    await page.goto("/admin/login");
    await expectNoOpenChooser(page);
  });

  test("session memory prevents a loop when cookies and sessionStorage are unavailable", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Document.prototype, "cookie", {
        configurable: true,
        get: () => "",
        set: () => undefined,
      });
      const getItem = Storage.prototype.getItem;
      const setItem = Storage.prototype.setItem;
      Storage.prototype.getItem = function (key) {
        if (this === window.sessionStorage) throw new Error("blocked");
        return getItem.call(this, key);
      };
      Storage.prototype.setItem = function (key, value) {
        if (this === window.sessionStorage) throw new Error("blocked");
        return setItem.call(this, key, value);
      };
    });
    await page.goto("/en/contact");
    const dialog = page.getByRole("dialog", { name: "Choose your language" });
    await expect(dialog).toBeVisible();

    await dialog.locator('button[lang="ar"]').click();
    await expect(page).toHaveURL(/\/ar\/contact\/?$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expectNoOpenChooser(page);
    await page.getByRole("link", { name: "الرئيسية" }).click();
    await expect(page).toHaveURL(/\/ar\/?$/);
    await expectNoOpenChooser(page);
  });

  test("390x844 Arabic chooser is RTL, unclipped, and touch-sized", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "ar-SA" });
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const dialog = page.getByRole("dialog", { name: "اختر لغتك" });
    await expect(dialog).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    expect(await dialog.evaluate((element) => getComputedStyle(element).direction)).toBe("rtl");

    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
    const sizes = await dialog.locator(".language-dialog__option").evaluateAll(
      (options) => options.map((option) => option.getBoundingClientRect().height),
    );
    expect(sizes.every((height) => height >= 44)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    await context.close();
  });
});

test("without JavaScript root negotiation remains readable and the chooser cannot dead-end", async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "no-js", "No-JS project only");
  const context = await browser.newContext({ locale: "vi-VN", javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");

  await expect(page).toHaveURL(/\/vi\/?$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.locator("main")).toBeVisible();
  await expectNoOpenChooser(page);
  await context.close();
});
