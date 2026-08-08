import { mkdir, readdir, unlink } from "node:fs/promises";
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

async function assertPortalCapturePreflight() {
  const { assertSafeE2ETarget } = await import("../e2e/target-guard.ts");
  assertSafeE2ETarget(process.env);
  if (process.env.UI_REFERENCE_SYNTHETIC_DATA_CONFIRMED?.trim() !== "1") {
    throw new Error(
      "Portal references require UI_REFERENCE_SYNTHETIC_DATA_CONFIRMED=1 after confirming every visible record is synthetic",
    );
  }
}

const publicCaptures = [
  { name: "desktop-en-home", path: "/en", viewport: { width: 1440, height: 900 }, locale: "en", ready: "main h1" },
  // The English-evidence first visit is banner + hero alone: the chooser only
  // interrupts on a locale mismatch (I4).
  { name: "desktop-en-home-first-visit", path: "/en", viewport: { width: 1440, height: 900 }, firstVisit: true, ready: "main h1" },
  // The one standing interruption: the chooser when the browser's language
  // mismatches the served locale, with that language suggested.
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
  { name: "desktop-portal-home", path: "/admin", viewport: { width: 1440, height: 900 }, ready: "#home-heading" },
  { name: "desktop-portal-appointments", path: "/admin/requests", viewport: { width: 1440, height: 900 }, ready: "#requests-heading", allScrollViewports: true },
  { name: "desktop-portal-print-review-flyers", path: "/admin/review-flyers", viewport: { width: 1440, height: 900 }, ready: "main h1" },
  { name: "desktop-portal-settings", path: "/admin/settings", viewport: { width: 1440, height: 900 }, ready: '[data-testid="recipients-manager"]' },
  { name: "desktop-portal-website", path: "/admin/settings/software", viewport: { width: 1440, height: 900 }, ready: '[data-testid="managed-product"]' },
  { name: "desktop-portal-activity-log", path: "/admin/audit", viewport: { width: 1440, height: 900 }, ready: "#audit-heading" },
  { name: "desktop-portal-help", path: "/admin/help", viewport: { width: 1440, height: 900 }, ready: "#help-heading" },
  { name: "mobile-portal-home", path: "/admin", viewport: { width: 390, height: 844 }, ready: "#home-heading" },
  { name: "mobile-portal-appointments", path: "/admin/requests", viewport: { width: 390, height: 844 }, ready: "#requests-heading", allScrollViewports: true },
  { name: "mobile-portal-print-review-flyers", path: "/admin/review-flyers", viewport: { width: 390, height: 844 }, ready: "main h1" },
  { name: "mobile-portal-settings", path: "/admin/settings", viewport: { width: 390, height: 844 }, ready: '[data-testid="recipients-manager"]' },
  { name: "mobile-portal-website", path: "/admin/settings/software", viewport: { width: 390, height: 844 }, ready: '[data-testid="managed-product"]' },
  { name: "mobile-portal-activity-log", path: "/admin/audit", viewport: { width: 390, height: 844 }, ready: "#audit-heading" },
  { name: "mobile-portal-help", path: "/admin/help", viewport: { width: 390, height: 844 }, ready: "#help-heading" },
];

async function settle(page, scrollY = 0) {
  await page.evaluate(async (targetScrollY) => {
    window.scrollTo({ left: 0, top: targetScrollY, behavior: "instant" });
    await document.fonts.ready;
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    if (Math.abs(window.scrollY - targetScrollY) > 1) {
      throw new Error(
        `Expected scroll position ${targetScrollY}, reached ${window.scrollY}`,
      );
    }
  }, scrollY);
}

async function removeDevelopmentChrome(page) {
  await page.evaluate(() => {
    // The Next.js development launcher is browser tooling, not portal UI.
    document.querySelector("nextjs-portal")?.remove();
  });
}

async function assertAuthenticatedPortalTarget(context) {
  const allowedProjectRef = requiredEnv(
    "PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF",
  );
  const targetHostname = new URL(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  ).hostname;
  const cookieProjectRef = allowedProjectRef === "local"
    ? targetHostname.split(".")[0]
    : allowedProjectRef;
  const expectedCookieName = `sb-${cookieProjectRef}-auth-token`;
  const cookies = await context.cookies(origin.origin);
  const sessionCookies = cookies.filter(({ name }) =>
    /^sb-.+-auth-token(?:\.\d+)?$/.test(name),
  );
  const isExpectedSessionCookie = ({ name }) =>
    name === expectedCookieName ||
    (name.startsWith(`${expectedCookieName}.`) &&
      /^\d+$/.test(name.slice(expectedCookieName.length + 1)));
  const hasExpectedSession = sessionCookies.some(isExpectedSessionCookie);
  const hasUnexpectedSession = sessionCookies.some(
    (cookie) => !isExpectedSessionCookie(cookie),
  );
  if (!hasExpectedSession || hasUnexpectedSession) {
    throw new Error(
      "Portal reference sign-in did not establish a session for the allowlisted Development project",
    );
  }
}

async function waitForStableLayout(page) {
  await page.waitForLoadState("load");
  await page.evaluate(async () => {
    let previous = null;
    let stableFrames = 0;
    for (let frame = 0; frame < 60; frame += 1) {
      await new Promise((done) => requestAnimationFrame(done));
      const current = {
        height: Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
        ),
        requestRows: document.querySelectorAll('[data-testid="request-row"]').length,
      };
      if (
        previous &&
        previous.height === current.height &&
        previous.requestRows === current.requestRows
      ) {
        stableFrames += 1;
        if (stableFrames >= 3) return;
      } else {
        stableFrames = 0;
      }
      previous = current;
    }
    throw new Error("Portal layout did not settle before capture");
  });
}

async function scrollViewportPlan(page) {
  return page.evaluate(() => {
    const documentHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
    );
    const viewportHeight = window.innerHeight;
    const maxScroll = Math.max(0, documentHeight - viewportHeight);
    const stickyUtility = document.querySelector(
      '[data-testid="portal-release-utility"]',
    );
    const stickyHeight = stickyUtility
      ? Math.ceil(stickyUtility.getBoundingClientRect().height)
      : 0;
    const stride = Math.max(1, viewportHeight - stickyHeight - 1);
    const positions = [0];
    while (positions.at(-1) < maxScroll) {
      if (positions.length >= 200) {
        throw new Error("Appointments viewport plan exceeded 200 captures");
      }
      const next = Math.min(positions.at(-1) + stride, maxScroll);
      if (next <= positions.at(-1)) {
        throw new Error("Appointments viewport plan stopped making progress");
      }
      positions.push(next);
    }

    for (let index = 1; index < positions.length; index += 1) {
      if (positions[index] - positions[index - 1] > stride) {
        throw new Error("Appointments viewport plan leaves an uncovered gap");
      }
    }
    if (positions.at(-1) + viewportHeight < documentHeight) {
      throw new Error("Appointments viewport plan does not reach the page bottom");
    }
    if (positions.at(-1) !== maxScroll) {
      throw new Error("Appointments viewport plan does not end at max scroll");
    }
    return {
      documentHeight,
      maxScroll,
      positions,
      stickyHeight,
      stride,
      viewportHeight,
    };
  });
}

function viewportFilename(capture, index, total) {
  if (!capture.allScrollViewports) return `${capture.name}.png`;
  const digits = Math.max(2, String(total).length);
  return `${capture.name}-viewport-${String(index + 1).padStart(digits, "0")}.png`;
}

async function removeStaleViewportFiles(capture, expectedFilenames) {
  if (!capture.allScrollViewports) return;
  const escapedName = capture.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sequencePattern = new RegExp(`^${escapedName}-viewport-\\d+\\.png$`);
  const expected = new Set(expectedFilenames);
  for (const filename of await readdir(outputDirectory)) {
    if (sequencePattern.test(filename) && !expected.has(filename)) {
      await unlink(resolve(outputDirectory, filename));
    }
  }
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
    await assertAuthenticatedPortalTarget(context);

    for (const capture of portalCaptures) {
      await page.setViewportSize(capture.viewport);
      const expectedUrl = new URL(capture.path, origin);
      const response = await page.goto(expectedUrl.toString(), {
        waitUntil: "domcontentloaded",
      });
      if (!response?.ok()) {
        throw new Error(
          `Portal reference ${capture.path} returned ${response?.status() ?? "no response"}`,
        );
      }
      const actualUrl = new URL(page.url());
      if (
        actualUrl.origin !== expectedUrl.origin ||
        actualUrl.pathname !== expectedUrl.pathname ||
        actualUrl.search !== expectedUrl.search
      ) {
        throw new Error(
          `Unexpected redirect for ${capture.path}: ${actualUrl.toString()}`,
        );
      }
      await page.locator('[data-testid="session-user"]').waitFor({ state: "attached" });
      await page.locator(capture.ready).waitFor({ state: "visible" });
      if (capture.allScrollViewports) {
        const heading = (await page.locator(capture.ready).textContent())?.trim();
        if (heading !== "Appointments") {
          throw new Error(
            `Expected the Appointments heading at ${capture.path}`,
          );
        }
      }
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
      await waitForStableLayout(page);
      await settle(page);
      const hasErrorOverlayBeforePreparation = await page.locator(
        '[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay',
      ).count();
      if (hasErrorOverlayBeforePreparation > 0) {
        throw new Error(`Error overlay detected while capturing ${capture.path}`);
      }
      await removeDevelopmentChrome(page);
      await settle(page);
      const hasErrorOverlayAfterPreparation = await page.locator(
        '[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay',
      ).count();
      if (hasErrorOverlayAfterPreparation > 0) {
        throw new Error(`Error overlay detected while capturing ${capture.path}`);
      }
      const plan = capture.allScrollViewports
        ? await scrollViewportPlan(page)
        : {
            documentHeight: await page.evaluate(() =>
              Math.max(
                document.documentElement.scrollHeight,
                document.body.scrollHeight,
              ),
            ),
            positions: [0],
            stickyHeight: 0,
            viewportHeight: capture.viewport.height,
          };
      if (plan.viewportHeight !== capture.viewport.height) {
        throw new Error(
          `Expected ${capture.viewport.height}px viewport, received ${plan.viewportHeight}px`,
        );
      }
      const filenames = plan.positions.map((_, index) =>
        viewportFilename(capture, index, plan.positions.length),
      );
      for (const [index, scrollY] of plan.positions.entries()) {
        await settle(page, scrollY);
        const currentDocumentHeight = await page.evaluate(() =>
          Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight,
          ),
        );
        if (currentDocumentHeight !== plan.documentHeight) {
          throw new Error(
            `Page height changed while capturing ${capture.path}: ${plan.documentHeight} to ${currentDocumentHeight}`,
          );
        }
        const filename = filenames[index];
        await page.screenshot({
          path: resolve(outputDirectory, filename),
          fullPage: false,
          scale: "css",
        });
        const position = capture.allScrollViewports
          ? ` (${index + 1}/${plan.positions.length}, scroll ${scrollY}/${plan.maxScroll}px, sticky ${plan.stickyHeight}px)`
          : "";
        console.log(`Captured ${filename}${position}`);
      }
      await removeStaleViewportFiles(capture, filenames);
    }
  } finally {
    await context.close();
  }
}

const credentials = portalMode ? portalCredentials() : null;
if (portalMode) await assertPortalCapturePreflight();
await mkdir(outputDirectory, { recursive: true });
console.log(`Capturing UI reference from ${origin.origin}`);
const browser = await chromium.launch();

try {
  if (!portalMode) {
    for (const capture of publicCaptures) {
      const context = await browser.newContext({
        viewport: capture.viewport,
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
        ...(capture.browserLocale ? { locale: capture.browserLocale } : {}),
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
          fullPage: false,
          scale: "css",
        });
        console.log(`Captured ${capture.name}.png`);
      } finally {
        await context.close();
      }
    }
  }
  if (portalMode) await capturePortalReferences(browser, credentials);
} finally {
  await browser.close();
}
