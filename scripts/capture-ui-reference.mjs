import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const DEFAULT_ORIGIN = "https://westchasegi.com";
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = resolve(scriptDirectory, "../docs/ui-reference");

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

const origin = originFrom(process.argv[2] ?? DEFAULT_ORIGIN);

const captures = [
  { name: "desktop-en-home", path: "/en", viewport: { width: 1440, height: 900 }, locale: "en", ready: "main h1" },
  { name: "desktop-en-home-first-visit", path: "/en", viewport: { width: 1440, height: 900 }, firstVisit: true, ready: "dialog.language-dialog[open]" },
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

async function settle(page) {
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts.ready;
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  });
}

await mkdir(outputDirectory, { recursive: true });
console.log(`Capturing UI reference from ${origin.origin}`);
const browser = await chromium.launch();

try {
  for (const capture of captures) {
    const context = await browser.newContext({
      viewport: capture.viewport,
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
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
} finally {
  await browser.close();
}
