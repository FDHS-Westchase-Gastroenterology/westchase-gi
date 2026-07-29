import { expect, test, type Page, type TestInfo } from "@playwright/test";

const languageNames = ["English", "Español", "Tiếng Việt", "한국어", "العربية"];

function skipWithoutJavaScript(testInfo: TestInfo) {
  test.skip(testInfo.project.name === "no-js", "Chooser behavior requires JavaScript");
}

async function expectNoOpenChooser(page: Page) {
  await expect(page.locator("dialog.language-dialog[open]")).toHaveCount(0);
}

function cookieValue(cookies: { name: string; value: string }[], name: string) {
  return cookies.find((cookie) => cookie.name === name)?.value;
}

// The chooser auto-opens only on positive evidence of a mismatch (I4): the
// browser's top supported language (navigator.languages, mirrored server-side
// by the proxy's Accept-Language negotiation) differs from the served locale,
// and no remembered choice exists. When the site already guessed right,
// nothing interrupts.
test.describe("evidence-gated language chooser", () => {
  test.beforeEach(async ({}, testInfo) => skipWithoutJavaScript(testInfo));

  test("matching browser language never opens the dialog", async ({ page }) => {
    // Default context: navigator.languages = ["en-US"].
    await page.goto("/en");
    await expectNoOpenChooser(page);
    await expect(page.locator(".notice-banner")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Digestive health, in caring hands",
    );

    await page.goto("/en/procedure-prep");
    await expectNoOpenChooser(page);
  });

  test("unsupported browser language falls back to English with no dialog", async ({
    browser,
    request,
  }) => {
    const redirect = await request.get("/", {
      maxRedirects: 0,
      headers: { "Accept-Language": "fr-FR,fr;q=0.9" },
    });
    expect(redirect.status()).toBe(307);
    expect(new URL(redirect.headers().location, "http://localhost").pathname).toBe("/en");
    expect(redirect.headers()["set-cookie"]).toBeUndefined();

    const context = await browser.newContext({ locale: "fr-FR" });
    const page = await context.newPage();
    await page.goto("/en");
    await expectNoOpenChooser(page);
    await context.close();
  });

  test("a mismatch on a deep route opens the dialog with the browser's language suggested", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "es-MX" });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en/contact");

    const dialog = page.getByRole("dialog", { name: "Choose your language" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      "Choose the language you would like to use on this website.",
    );
    await expect(
      dialog.locator(".language-dialog__option > span:first-child"),
    ).toHaveText(languageNames);
    await expect(dialog.locator('button[lang="es"] .language-dialog__suggested')).toBeVisible();
    await expect(dialog.locator('button[lang="es"] .language-dialog__suggested')).toContainText("Suggested");
    await expect(dialog.locator('button[lang="en"] .language-dialog__suggested')).toBeHidden();

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
      activeLanguage: "es",
    });

    for (const language of ["vi", "ko", "ar"]) {
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
    await context.close();
  });

  test("accepting the suggestion switches locale on the same path and persists", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "es-MX" });
    const page = await context.newPage();
    await page.goto("/en/contact");

    const dialog = page.getByRole("dialog", { name: "Choose your language" });
    await expect(dialog).toBeVisible();
    await dialog.locator('button[lang="es"]').click();

    await expect(page).toHaveURL(/\/es\/contact\/?$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expectNoOpenChooser(page);
    expect(cookieValue(await context.cookies(), "wgi-locale")).toBe("es");

    await page.goto("/");
    await expect(page).toHaveURL(/\/es\/?$/);
    await expectNoOpenChooser(page);
    await context.close();
  });

  test("choosing a language other than the suggested one switches and remembers", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "es-MX" });
    const page = await context.newPage();
    await page.goto("/en/contact");

    const dialog = page.getByRole("dialog", { name: "Choose your language" });
    await expect(dialog).toBeVisible();
    await dialog.locator('button[lang="ko"]').click();

    await expect(page).toHaveURL(/\/ko\/contact\/?$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expectNoOpenChooser(page);
    expect(cookieValue(await context.cookies(), "wgi-locale")).toBe("ko");
    await context.close();
  });

  test("continuing in the current language records completion and leaves the banner independent", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "es-MX" });
    const page = await context.newPage();
    await page.goto("/en");
    const dialog = page.getByRole("dialog", { name: "Choose your language" });
    await expect(dialog).toBeVisible();

    await dialog
      .getByRole("button", { name: "Continue in English", exact: true })
      .click();
    await expectNoOpenChooser(page);
    await expect(page).toHaveURL(/\/en\/?$/);
    await expect(page.locator(".notice-banner")).toBeVisible();
    expect(cookieValue(await context.cookies(), "wgi-locale")).toBe("en");

    await page.getByRole("link", { name: "Contact Us" }).first().click();
    await expect(page).toHaveURL(/\/en\/contact\/?$/);
    await expectNoOpenChooser(page);

    await page.locator(".notice-banner button").click();
    await expect(page.locator(".notice-banner")).toBeHidden();
    await page.reload();
    await expectNoOpenChooser(page);
    await expect(page.locator(".notice-banner")).toBeHidden();
    await context.close();
  });

  test("dismissal closes without a stored choice and does not reopen this session", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "es-MX" });
    const page = await context.newPage();
    await page.goto("/en");
    await expect(page.getByRole("dialog", { name: "Choose your language" })).toBeVisible();
    await page.keyboard.press("Escape");

    await expectNoOpenChooser(page);
    await expect(page.locator("#language-menu-trigger")).toBeFocused();
    expect(cookieValue(await context.cookies(), "wgi-locale")).toBeUndefined();

    // Session memory suppresses reopening while the mismatch persists; a
    // future browser session gets one more chance because nothing is stored.
    await page.goto("/en/contact");
    await expectNoOpenChooser(page);
    await page.goto("/en/procedure-prep");
    await expectNoOpenChooser(page);
    await context.close();
  });

  test("a remembered locale suppresses the chooser on every route", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "en-US" });
    await context.addCookies([
      { name: "wgi-locale", value: "vi", domain: "localhost", path: "/" },
    ]);
    const page = await context.newPage();

    await page.goto("/");
    await expect(page).toHaveURL(/\/vi\/?$/);
    await expectNoOpenChooser(page);

    // The remembered locale also beats the browser's language evidence: the
    // proxy negotiates / from the cookie, and the dialog never re-considers.
    await page.goto("/vi/contact");
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
    expect(cookieValue(await context.cookies(), "wgi-locale")).toBe("es");
    await expectNoOpenChooser(page);
  });

  test("the chooser stays off the review utility and English-only admin", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "es-MX" });
    const page = await context.newPage();
    await page.goto("/review");
    await expectNoOpenChooser(page);
    await page.goto("/admin/login");
    await expectNoOpenChooser(page);
    await context.close();
  });

  test("blocked cookies and storage simply never open the dialog", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "es-MX" });
    const page = await context.newPage();
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

    // The mismatch evidence is real (es), but with no way to remember a
    // choice, reopening every page would recreate the old site's per-page
    // modal. Session module memory still prevents the loop — proven with
    // client-side navigation, since a full reload resets module state when
    // both persistent stores are blocked.
    await page.goto("/en/contact");
    await expect(page.getByRole("dialog", { name: "Choose your language" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expectNoOpenChooser(page);

    await page.getByRole("link", { name: "FDHS Westchase Gastroenterology" }).click();
    await expect(page).toHaveURL(/\/en\/?$/);
    await expectNoOpenChooser(page);
    await expect(page.locator("main")).toBeVisible();
    await context.close();
  });

  test("390x844 Arabic: matched stays quiet, mismatch opens touch-sized with Arabic suggested", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "ar-SA" });
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/");
    await expect(page).toHaveURL(/\/ar\/?$/);
    await expectNoOpenChooser(page);

    await page.goto("/en/contact");
    const dialog = page.getByRole("dialog", { name: "Choose your language" });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('button[lang="ar"] .language-dialog__suggested')).toBeVisible();

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

  test("an Arabic page with a Spanish browser renders the dialog RTL", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "es-MX" });
    const page = await context.newPage();
    await page.goto("/ar");

    const dialog = page.getByRole("dialog", { name: "اختر لغتك" });
    await expect(dialog).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    expect(await dialog.evaluate((element) => getComputedStyle(element).direction)).toBe("rtl");
    await expect(dialog.locator('button[lang="es"] .language-dialog__suggested')).toBeVisible();
    await expect(dialog.locator('button[lang="es"] .language-dialog__suggested')).toContainText("مقترحة");
    await context.close();
  });
});

test("without JavaScript root negotiation remains readable and the chooser cannot open", async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "no-js", "No-JS project only");

  const negotiated = await browser.newContext({ locale: "vi-VN", javaScriptEnabled: false });
  const page = await negotiated.newPage();
  await page.goto("/");
  await expect(page).toHaveURL(/\/vi\/?$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.locator("main")).toBeVisible();
  await expectNoOpenChooser(page);
  await negotiated.close();

  const mismatched = await browser.newContext({ locale: "es-MX", javaScriptEnabled: false });
  const hintless = await mismatched.newPage();
  await hintless.goto("/en/contact");
  await expect(hintless.locator("main")).toBeVisible();
  await expectNoOpenChooser(hintless);
  await mismatched.close();
});
