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
const origin = originFrom(args.find((argument) => argument !== "--portal") ?? DEFAULT_ORIGIN);

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
  if (origin.hostname.endsWith(".vercel.app") && origin.hostname.includes("-git-")) {
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
  {
    name: "desktop-en-home",
    path: "/en",
    viewport: { width: 1440, height: 900 },
    locale: "en",
    ready: "main h1",
  },
  // The English-evidence first visit is banner + hero alone: the chooser only
  // Interrupts on a locale mismatch (I4).
  {
    name: "desktop-en-home-first-visit",
    path: "/en",
    viewport: { width: 1440, height: 900 },
    firstVisit: true,
    ready: "main h1",
  },
  // The one standing interruption: the chooser when the browser's language
  // Mismatches the served locale, with that language suggested.
  {
    name: "desktop-en-home-locale-hint",
    path: "/en",
    viewport: { width: 1440, height: 900 },
    firstVisit: true,
    browserLocale: "es",
    ready: "dialog.language-dialog[open]",
  },
  {
    name: "desktop-en-services",
    path: "/en/services",
    viewport: { width: 1440, height: 900 },
    locale: "en",
    ready: "main h1",
  },
  {
    name: "desktop-en-physicians",
    path: "/en/physicians",
    viewport: { width: 1440, height: 900 },
    locale: "en",
    ready: "main h1",
  },
  {
    name: "desktop-en-appointment",
    path: "/en/appointment",
    viewport: { width: 1440, height: 900 },
    locale: "en",
    ready: "main form",
  },
  {
    name: "desktop-en-contact",
    path: "/en/contact",
    viewport: { width: 1440, height: 900 },
    locale: "en",
    ready: "main form",
  },
  {
    name: "desktop-ar-home",
    path: "/ar",
    viewport: { width: 1440, height: 900 },
    locale: "ar",
    ready: "main h1",
  },
  {
    name: "desktop-review",
    path: "/review",
    viewport: { width: 1440, height: 900 },
    ready: "main h1",
  },
  {
    name: "desktop-admin-login",
    path: "/admin/login",
    viewport: { width: 1440, height: 900 },
    ready: "form",
  },
  {
    name: "mobile-en-home",
    path: "/en",
    viewport: { width: 390, height: 844 },
    locale: "en",
    ready: "main h1",
  },
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
  {
    name: "mobile-en-procedure-prep",
    path: "/en/procedure-prep",
    viewport: { width: 390, height: 844 },
    locale: "en",
    ready: "main h1",
  },
  {
    name: "mobile-ar-home",
    path: "/ar",
    viewport: { width: 390, height: 844 },
    locale: "ar",
    ready: "main h1",
  },
];

const portalCaptures = [
  {
    name: "desktop-portal-home",
    path: "/admin",
    viewport: { width: 1440, height: 900 },
    ready: "main h1",
  },
  {
    name: "desktop-portal-requests",
    path: "/admin/requests?q=Sample+patient",
    viewport: { width: 1440, height: 900 },
    ready: "main h1",
  },
  {
    name: "desktop-portal-review-flyers",
    path: "/admin/review-flyers",
    viewport: { width: 1440, height: 900 },
    ready: "main h1",
  },
  {
    name: "desktop-portal-settings",
    path: "/admin/settings",
    viewport: { width: 1440, height: 900 },
    ready: '[data-testid="recipients-manager"]',
  },
  {
    name: "desktop-portal-settings-software",
    path: "/admin/settings/software",
    viewport: { width: 1440, height: 900 },
    ready: '[data-testid="managed-product"]',
  },
  {
    name: "desktop-portal-audit",
    path: "/admin/audit",
    viewport: { width: 1440, height: 900 },
    ready: "main h1",
  },
  {
    name: "desktop-portal-help",
    path: "/admin/help",
    viewport: { width: 1440, height: 900 },
    ready: "main h1",
  },
  {
    name: "mobile-portal-home",
    path: "/admin",
    viewport: { width: 390, height: 844 },
    ready: "main h1",
  },
  {
    name: "mobile-portal-requests",
    path: "/admin/requests?q=Sample+patient",
    viewport: { width: 390, height: 844 },
    ready: "main h1",
  },
  {
    name: "mobile-portal-review-flyers",
    path: "/admin/review-flyers",
    viewport: { width: 390, height: 844 },
    ready: "main h1",
  },
  {
    name: "mobile-portal-settings",
    path: "/admin/settings",
    viewport: { width: 390, height: 844 },
    ready: '[data-testid="recipients-manager"]',
  },
  {
    name: "mobile-portal-settings-software",
    path: "/admin/settings/software",
    viewport: { width: 390, height: 844 },
    ready: '[data-testid="managed-product"]',
  },
  {
    name: "mobile-portal-audit",
    path: "/admin/audit",
    viewport: { width: 390, height: 844 },
    ready: "main h1",
  },
  {
    name: "mobile-portal-help",
    path: "/admin/help",
    viewport: { width: 390, height: 844 },
    ready: "main h1",
  },
];

async function settle(page) {
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts.ready;
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  });
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }));
  if (dimensions.scrollWidth > dimensions.clientWidth + 1) {
    throw new Error(
      `${label} overflows horizontally: ${dimensions.scrollWidth}px content in a ${dimensions.clientWidth}px viewport`,
    );
  }
}

async function redactPortalData(page) {
  await page.addStyleTag({
    content: `
      [data-testid="recipient-list"],
      [data-testid="staff-list"],
      [data-testid="audit-table"] tbody,
      [data-testid="release-engagement-table"] tbody,
      [data-testid="release-engagement-cards"],
      [data-testid="recent-work-list"],
      [data-testid="maintainer-list"] {
        filter: blur(8px);
        user-select: none;
      }
    `,
  });
  await page.evaluate(() => {
    const syntheticPatientText = {
      "patient-name": "Sample Patient",
      "patient-contact": "(813) 555-0100",
      "patient-message": "Fictional appointment request details.",
    };
    document.querySelectorAll("[data-ui-redact]").forEach((element) => {
      const kind = element.getAttribute("data-ui-redact");
      if (!kind || !(kind in syntheticPatientText)) return;
      element.textContent = syntheticPatientText[kind];
      element.removeAttribute("title");
      if (element instanceof HTMLAnchorElement) element.removeAttribute("href");
    });
    const sessionUser = document.querySelector('[data-testid="session-user"]');
    if (sessionUser) sessionUser.textContent = "Staff Member";
    const sessionEmail = document.querySelector('[data-testid="session-email"]');
    if (sessionEmail) {
      sessionEmail.textContent = "staff@example.com";
      sessionEmail.removeAttribute("title");
    }
    const greeting = document.querySelector('[data-testid="home-greeting"]');
    if (greeting) greeting.textContent = "Good morning, Staff.";
    const queueHeadline = document.querySelector('[data-testid="queue-overview-headline"]');
    if (queueHeadline) {
      const count = document.createElement("strong");
      count.className = "font-black text-[var(--portal-attention-ink)]";
      count.textContent = "3";
      queueHeadline.replaceChildren(count, " new appointment requests are waiting.");
    }
    const printNewCount = document.querySelector('[data-testid="print-new-count"]');
    if (printNewCount) printNewCount.textContent = "Print all 3";
    const emptyPrint = document.querySelector('[data-testid="print-new-empty"]');
    if (emptyPrint instanceof HTMLElement) {
      emptyPrint.textContent = "Print all 3";
      const control = emptyPrint.closest("button");
      if (control) {
        control.disabled = false;
        control.classList.remove("btn-outline");
        control.classList.add("btn-navy");
      }
    }
    document.querySelector('[data-testid="nav-waiting-badge"]')?.remove();
    document
      .querySelectorAll(
        '[data-testid="queue-overview-unavailable"] > :not([data-testid="queue-overview-headline"])',
      )
      .forEach((element) => element.remove());
    document.querySelector('[data-testid="queue-overview-oldest"]')?.remove();
    document.querySelector(".portal-attention-next")?.remove();
    document.querySelector('[data-testid="no-recipients-warning"]')?.remove();
    document.querySelector('[data-testid="delivery-failure-warning"]')?.remove();
    document.querySelector('[data-testid="portal-tour-nudge"]')?.remove();
    document.querySelector('[data-testid="portal-release-announcement"]')?.remove();
    document.querySelector('[data-testid="portal-release-utility"]')?.remove();
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
      page.waitForURL((url) => url.origin === origin.origin && url.pathname === "/admin"),
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
          const images = Array.from(document.querySelectorAll("[data-review-target] img"));
          const visibleImages = images.filter((image) => {
            const bounds = image.getBoundingClientRect();
            return bounds.bottom > 0 && bounds.top < window.innerHeight;
          });
          return (
            visibleImages.length > 0 &&
            visibleImages.every((image) => image.complete && image.naturalWidth > 0)
          );
        });
      }
      await redactPortalData(page);
      await settle(page);
      await assertNoHorizontalOverflow(page, capture.name);
      await page.screenshot({
        path: resolve(outputDirectory, `${capture.name}.png`),
      });
      if (capture.name.startsWith("mobile-")) {
        await page.setViewportSize({ width: 320, height: capture.viewport.height });
        await settle(page);
        await assertNoHorizontalOverflow(page, `${capture.name} at 320px`);
      }
      console.log(`Captured ${capture.name}.png`);
    }
  } finally {
    await context.close();
  }
}

await mkdir(outputDirectory, { recursive: true });
console.log(`Capturing UI reference from ${origin.origin}`);
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
const browser = await chromium.launch(
  chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : undefined,
);

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
