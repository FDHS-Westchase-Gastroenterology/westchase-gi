import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const DEFAULT_ORIGIN = "https://westchasegi.com";
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = resolve(scriptDirectory, "../ui-reference");

function originFrom(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error(`Expected an http(s) origin, received: ${input}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Expected an http(s) origin, received: ${input}`);
  }
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

const args = process.argv.slice(2);
const portalMode = args.includes("--portal");
const origin = originFrom(
  args.find((argument) => argument !== "--portal") ?? DEFAULT_ORIGIN,
);

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name} for portal references`);
  return value;
}

function portalCredentials() {
  if (origin.hostname === "localhost" || origin.hostname === "127.0.0.1") {
    return {
      email: requiredEnv("PORTAL_SEED_ADMIN_EMAIL"),
      password: requiredEnv("PORTAL_SEED_ADMIN_PASSWORD"),
    };
  }
  if (
    origin.hostname.endsWith(".vercel.app") &&
    origin.hostname.includes("-git-")
  ) {
    return {
      email: requiredEnv("PORTAL_PREVIEW_USERNAME"),
      password: requiredEnv("PORTAL_PREVIEW_PASSWORD"),
    };
  }
  throw new Error(
    `Portal references require a local or Vercel Preview origin, received: ${origin.origin}`,
  );
}

const publicCaptures = [
  { name: "desktop-en-home", path: "/en", viewport: { width: 1440, height: 900 }, locale: "en", ready: "main h1" },
  // The English-evidence first visit is banner + hero alone: the chooser only
  // Interrupts on a locale mismatch (I4).
  { name: "desktop-en-home-first-visit", path: "/en", viewport: { width: 1440, height: 900 }, firstVisit: true, ready: "main h1" },
  // The one standing interruption: the chooser when the browser's language
  // Mismatches the served locale, with that language suggested.
  { name: "desktop-en-home-locale-hint", path: "/en", viewport: { width: 1440, height: 900 }, firstVisit: true, browserLocale: "es", ready: "dialog.language-dialog[open]" },
  { name: "desktop-en-services", path: "/en/services", viewport: { width: 1440, height: 900 }, locale: "en", ready: "main h1" },
  { name: "desktop-en-physicians", path: "/en/physicians", viewport: { width: 1440, height: 900 }, locale: "en", ready: "main h1" },
  { name: "desktop-en-appointment", path: "/en/appointment", viewport: { width: 1440, height: 900 }, locale: "en", ready: "main form" },
  { name: "desktop-en-contact", path: "/en/contact", viewport: { width: 1440, height: 900 }, locale: "en", ready: "main form" },
  { name: "desktop-ar-home", path: "/ar", viewport: { width: 1440, height: 900 }, locale: "ar", ready: "main h1" },
  { name: "desktop-review", path: "/review", viewport: { width: 1440, height: 900 }, ready: "main h1" },
  { name: "desktop-admin-login", path: "/admin/login", viewport: { width: 1440, height: 900 }, ready: "form" },
  { name: "mobile-en-home", path: "/en", viewport: { width: 390, height: 844 }, locale: "en", ready: "main h1" },
  {
    name: "mobile-en-menu",
    path: "/en",
    viewport: { width: 390, height: 844 },
    locale: "en",
    ready: "main h1",
    afterReady: async (page) => {
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      await page.getByRole("button", { name: "Close", exact: true }).waitFor();
    },
  },
  { name: "mobile-en-procedure-prep", path: "/en/procedure-prep", viewport: { width: 390, height: 844 }, locale: "en", ready: "main h1" },
  { name: "mobile-ar-home", path: "/ar", viewport: { width: 390, height: 844 }, locale: "ar", ready: "main h1" },
];

const portalCaptures = [
  { name: "desktop-portal-home", path: "/admin", viewport: { width: 1440, height: 900 }, ready: "main h1" },
  { name: "desktop-portal-requests", path: "/admin/requests?q=ui-reference-placeholder", viewport: { width: 1440, height: 900 }, ready: "main h1" },
  { name: "desktop-portal-review-flyers", path: "/admin/review-flyers", viewport: { width: 1440, height: 900 }, ready: "main h1" },
  { name: "desktop-portal-settings", path: "/admin/settings", viewport: { width: 1440, height: 900 }, ready: '[data-testid="recipients-manager"]' },
  { name: "desktop-portal-settings-software", path: "/admin/settings/software", viewport: { width: 1440, height: 900 }, ready: '[data-testid="managed-product"]' },
  { name: "desktop-portal-audit", path: "/admin/audit", viewport: { width: 1440, height: 900 }, ready: "main h1" },
  { name: "desktop-portal-help", path: "/admin/help", viewport: { width: 1440, height: 900 }, ready: "main h1" },
  { name: "mobile-portal-home", path: "/admin", viewport: { width: 390, height: 844 }, ready: "main h1" },
  { name: "mobile-portal-requests", path: "/admin/requests?q=ui-reference-placeholder", viewport: { width: 390, height: 844 }, ready: "main h1" },
  { name: "mobile-portal-review-flyers", path: "/admin/review-flyers", viewport: { width: 390, height: 844 }, ready: "main h1" },
  { name: "mobile-portal-settings", path: "/admin/settings", viewport: { width: 390, height: 844 }, ready: '[data-testid="recipients-manager"]' },
  { name: "mobile-portal-settings-software", path: "/admin/settings/software", viewport: { width: 390, height: 844 }, ready: '[data-testid="managed-product"]' },
  { name: "mobile-portal-audit", path: "/admin/audit", viewport: { width: 390, height: 844 }, ready: "main h1" },
  { name: "mobile-portal-help", path: "/admin/help", viewport: { width: 390, height: 844 }, ready: "main h1" },
];

async function settle(page) {
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts.ready;
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  });
}

async function redactPortalData(page) {
  await page.addStyleTag({
    content: `
      [data-testid="recipient-list"],
      [data-testid="staff-list"],
      [data-testid="audit-table"] tbody,
      [data-testid="maintainer-list"] {
        filter: blur(8px);
        user-select: none;
      }
    `,
  });
  await page.evaluate(() => {
    const sessionUser = document.querySelector('[data-testid="session-user"]');
    if (sessionUser) sessionUser.textContent = "Staff Member";
    const greeting = document.querySelector('[data-testid="home-greeting"]');
    if (greeting) greeting.textContent = "Good morning, Staff.";
    document.querySelector('[data-testid="queue-overview-preview"]')?.remove();
    document.querySelector('[data-testid="portal-tour-nudge"]')?.remove();
    document.querySelector("nextjs-portal")?.remove();
  });
}

async function capturePortalReferences(browser, credentials) {
  const context = await browser.newContext({
    viewport: portalCaptures[0].viewport,
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    await page.goto(new URL("/admin/login", origin).toString(), {
      waitUntil: "domcontentloaded",
    });
    await page.getByLabel("Email").fill(credentials.email);
    await page.getByLabel("Password").fill(credentials.password);
    await Promise.all([
      page.waitForURL((url) =>
        url.origin === origin.origin && url.pathname === "/admin",
      ),
      page.getByRole("button", { name: "Sign in", exact: true }).click(),
    ]);

    for (const capture of portalCaptures) {
      await page.setViewportSize(capture.viewport);
      await page.goto(new URL(capture.path, origin).toString(), {
        waitUntil: "domcontentloaded",
      });
      await page.locator(capture.ready).waitFor({ state: "visible" });
      await page.waitForTimeout(250);
      if (capture.path === "/admin/review-flyers") {
        await page.waitForFunction(() => {
          const images = Array.from(
            document.querySelectorAll("[data-review-target] img"),
          );
          return images.length > 0 && images.every(
            (image) => image.complete && image.naturalWidth > 0,
          );
        });
      }
      await redactPortalData(page);
      await settle(page);
      await page.screenshot({
        path: resolve(outputDirectory, `${capture.name}.png`),
      });
      console.log(`Captured ${capture.name}.png`);
    }
  } finally {
    await context.close();
  }
}

await mkdir(outputDirectory, { recursive: true });
console.log(`Capturing UI reference from ${origin.origin}`);
const browser = await chromium.launch();

try {
  if (!portalMode) {
    for (const capture of publicCaptures) {
      const contextOptions = {
        viewport: capture.viewport,
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
      };
      if (capture.browserLocale) {
        contextOptions.locale = capture.browserLocale;
      }
      const context = await browser.newContext(contextOptions);
      try {
        if (!capture.firstVisit && capture.locale) {
          await context.addCookies([
            { name: "wgi-locale", value: capture.locale, url: origin.origin },
          ]);
        }

        const page = await context.newPage();
        page.setDefaultTimeout(15_000);
        await page.goto(new URL(capture.path, origin).toString(), {
          waitUntil: "domcontentloaded",
        });
        if (new URL(page.url()).origin !== origin.origin) {
          throw new Error(`Unexpected redirect for ${capture.path}: ${page.url()}`);
        }
        await page.locator(capture.ready).waitFor({ state: "visible" });
        await settle(page);
        await capture.afterReady?.(page);
        await settle(page);
        await page.screenshot({
          path: resolve(outputDirectory, `${capture.name}.png`),
        });
        console.log(`Captured ${capture.name}.png`);
      } finally {
        await context.close();
      }
    }
  }
  if (portalMode) await capturePortalReferences(browser, portalCredentials());
} finally {
  await browser.close();
}
