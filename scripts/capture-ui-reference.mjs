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

const portalSurfaces = [
  {
    name: "portal-home",
    path: "/admin",
    ready: "main h1",
    continuations: [
      {
        suffix: "desk-tools",
        selector: "#desk-tools-heading",
        devices: ["mobile"],
      },
    ],
  },
  {
    name: "portal-requests",
    path: "/admin/requests",
    ready: '[data-testid="request-list"]',
    continuations: [
      {
        suffix: "queue-end",
        selector: '[data-testid="request-page-summary"]',
        bottom: true,
      },
    ],
  },
  {
    name: "portal-review-flyers",
    path: "/admin/review-flyers",
    ready: "main h1",
    continuations: [
      {
        suffix: "flyer-list-middle",
        selector: '[data-review-target="chang"]',
        devices: ["mobile"],
      },
      {
        suffix: "flyer-list-end",
        selector: '[data-review-target="taylor"]',
        bottom: true,
      },
    ],
  },
  {
    name: "portal-settings",
    path: "/admin/settings",
    ready: '[data-testid="recipients-manager"]',
    continuations: [
      { suffix: "staff", selector: "#staff" },
    ],
  },
  {
    name: "portal-settings-software",
    path: "/admin/settings/software",
    ready: '[data-testid="managed-product"]',
    continuations: [
      {
        suffix: "ownership",
        heading: "Who owns the website",
        devices: ["mobile"],
      },
      {
        suffix: "maintainers",
        selector: '[data-testid="maintainer-access"]',
        bottom: true,
      },
    ],
  },
  {
    name: "portal-audit",
    path: "/admin/audit",
    ready: "main h1",
    // The seeded activity list contains many repeated, blurred rows. Capture
    // its distinct regions instead of producing dozens of redundant frames.
    continuations: [
      {
        suffix: "recent-work",
        selector: "#recent-work-heading",
        devices: ["mobile"],
      },
      { suffix: "technical-record", selector: "#technical-record-heading" },
      {
        suffix: "bottom",
        selector: '[data-testid="audit-page-summary"]',
        bottom: true,
      },
    ],
  },
  {
    name: "portal-help",
    path: "/admin/help",
    ready: "main h1",
    continuations: [
      {
        suffix: "paper-handoff",
        heading: "Print a paper handoff",
        devices: ["mobile"],
      },
      {
        suffix: "workflow-statuses",
        selector: "#appointment-workflow-guide",
        devices: ["desktop"],
      },
      {
        suffix: "workflow-steps",
        heading: "Work the queue in four steps",
        devices: ["mobile"],
      },
      {
        suffix: "workflow-notes",
        heading: "Appointment request notes stay together",
      },
      {
        suffix: "staff-operations",
        heading: "Notification emails",
        devices: ["mobile"],
      },
      {
        suffix: "website-changes",
        selector: "#website-changes",
        devices: ["mobile"],
      },
      {
        suffix: "bottom",
        selector: "#something-wrong",
        bottom: true,
      },
    ],
  },
];

const portalCaptures = [
  { prefix: "desktop", viewport: { width: 1440, height: 900 } },
  { prefix: "mobile", viewport: { width: 390, height: 844 } },
].flatMap(({ prefix, viewport }) =>
  portalSurfaces.map((surface) => ({
    ...surface,
    name: `${prefix}-${surface.name}`,
    device: prefix,
    viewport,
  })),
);

async function settle(page, { scrollToTop = false } = {}) {
  await page.evaluate(async (shouldScrollToTop) => {
    if (shouldScrollToTop) window.scrollTo(0, 0);
    await document.fonts.ready;
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  }, scrollToTop);
}

async function waitForVisibleImages(page) {
  await page.waitForFunction(() => {
    const visibleImages = Array.from(document.images).filter((image) => {
      const bounds = image.getBoundingClientRect();
      return bounds.bottom > 0 && bounds.top < window.innerHeight;
    });
    return visibleImages.every(
      (image) => image.complete && image.naturalWidth > 0,
    );
  });
}

function portalContinuationLocator(page, continuation) {
  if (continuation.heading) {
    return page.getByRole("heading", {
      name: continuation.heading,
      exact: true,
    });
  }
  const matches = page.locator(continuation.selector);
  if (continuation.last) return matches.last();
  return matches.nth(continuation.index ?? 0);
}

async function scrollToPortalContinuation(page, continuation) {
  const target = portalContinuationLocator(page, continuation);
  await target.waitFor({ state: "visible" });

  if (continuation.bottom) {
    // Images revealed at the bottom can finish loading and adjust layout. A
    // second pass guarantees the final frame is the browser's real maximum
    // scroll position, not a stale pre-image measurement.
    for (let pass = 0; pass < 2; pass += 1) {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await settle(page);
      await waitForVisibleImages(page);
    }
    return page.evaluate(() => Math.round(window.scrollY));
  }

  await target.evaluate((element, align) => {
    const bounds = element.getBoundingClientRect();
    const absoluteTop = bounds.top + window.scrollY;
    const absoluteBottom = bounds.bottom + window.scrollY;
    const mobileHeader = document.querySelector(".portal-mobile-header");
    const mobileNavigation = document.querySelector(".portal-sidebar");
    const mobile = window.matchMedia("(max-width: 59.999rem)").matches;
    const topInset = mobile && mobileHeader instanceof HTMLElement
      ? mobileHeader.getBoundingClientRect().height
      : 0;
    const bottomInset = mobile && mobileNavigation instanceof HTMLElement
      ? mobileNavigation.getBoundingClientRect().height
      : 0;
    const topEdge = topInset + 20;
    const bottomEdge = window.innerHeight - bottomInset - 20;
    const desiredTop = align === "end"
      ? absoluteBottom - bottomEdge
      : absoluteTop - topEdge;
    window.scrollTo(0, Math.max(0, desiredTop));
  }, continuation.align ?? "start");
  await settle(page);
  await waitForVisibleImages(page);
  return page.evaluate(() => Math.round(window.scrollY));
}

function assertViewportPng(image, viewport, label) {
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  if (width !== viewport.width || height !== viewport.height) {
    throw new Error(
      `${label} is ${width}x${height}; expected one ${viewport.width}x${viewport.height} viewport`,
    );
  }
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    ),
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
    const queueHeadline = document.querySelector(
      '[data-testid="queue-overview-headline"]',
    );
    if (queueHeadline) {
      const count = document.createElement("strong");
      count.className = "font-black text-[var(--portal-attention-ink)]";
      count.textContent = "3";
      queueHeadline.replaceChildren(
        count,
        " new appointment requests are waiting.",
      );
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

async function assertPortalDataRedacted(page, label) {
  const failures = await page.evaluate(() => {
    const problems = [];
    const syntheticPatientText = {
      "patient-name": "Sample Patient",
      "patient-contact": "(813) 555-0100",
      "patient-message": "Fictional appointment request details.",
    };

    document.querySelectorAll("[data-ui-redact]").forEach((element) => {
      const kind = element.getAttribute("data-ui-redact");
      if (!kind || !(kind in syntheticPatientText)) {
        problems.push(`unknown patient redaction kind: ${kind ?? "missing"}`);
        return;
      }
      if (element.textContent !== syntheticPatientText[kind]) {
        problems.push(`${kind} was not replaced`);
      }
      if (element instanceof HTMLAnchorElement && element.hasAttribute("href")) {
        problems.push(`${kind} retained a link target`);
      }
    });

    const expectedAccountText = [
      ['[data-testid="session-user"]', "Staff Member"],
      ['[data-testid="session-email"]', "staff@example.com"],
    ];
    for (const [selector, expected] of expectedAccountText) {
      const element = document.querySelector(selector);
      if (element?.textContent !== expected) {
        problems.push(`${selector} was not replaced`);
      }
    }

    const blurredSelectors = [
      '[data-testid="recipient-list"]',
      '[data-testid="staff-list"]',
      '[data-testid="audit-table"] tbody',
      '[data-testid="release-engagement-table"] tbody',
      '[data-testid="release-engagement-cards"]',
      '[data-testid="recent-work-list"]',
      '[data-testid="maintainer-list"]',
    ];
    for (const selector of blurredSelectors) {
      document.querySelectorAll(selector).forEach((element) => {
        if (!getComputedStyle(element).filter.includes("blur(")) {
          problems.push(`${selector} is not blurred`);
        }
      });
    }
    return problems;
  });
  if (failures.length > 0) {
    throw new Error(`${label} redaction failed: ${failures.join("; ")}`);
  }
}

async function capturePortalViewport(page, capture, filename, generatedFiles) {
  await settle(page);
  await waitForVisibleImages(page);
  await assertNoHorizontalOverflow(page, filename);
  const image = await page.screenshot({
    path: resolve(outputDirectory, filename),
    fullPage: false,
  });
  assertViewportPng(image, capture.viewport, filename);
  generatedFiles.add(filename);
  const position = await page.evaluate(() => ({
    scrollY: Math.round(window.scrollY),
    maxScrollY: Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    ),
  }));
  console.log(
    `Captured ${filename} at ${position.scrollY}/${position.maxScrollY}px`,
  );
}

async function pruneStalePortalReferences(generatedFiles) {
  const portalReference = /^(?:desktop|mobile)-portal-.*\.png$/;
  const existingFiles = await readdir(outputDirectory);
  for (const filename of existingFiles) {
    if (!portalReference.test(filename) || generatedFiles.has(filename)) continue;
    await unlink(resolve(outputDirectory, filename));
    console.log(`Removed stale ${filename}`);
  }
}

async function capturePortalReferences(browser, credentials) {
  const context = await browser.newContext({
    viewport: portalCaptures[0].viewport,
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  try {
    const generatedFiles = new Set();
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
      await redactPortalData(page);
      await assertPortalDataRedacted(page, capture.name);
      await settle(page, { scrollToTop: true });

      const capturedPositions = new Set();
      const topFilename = `${capture.name}.png`;
      await capturePortalViewport(page, capture, topFilename, generatedFiles);
      capturedPositions.add(0);

      const continuations = capture.continuations.filter(
        (continuation) =>
          !continuation.devices || continuation.devices.includes(capture.device),
      );
      for (const continuation of continuations) {
        const scrollY = await scrollToPortalContinuation(page, continuation);
        if (capturedPositions.has(scrollY)) {
          console.log(
            `Skipped ${capture.name}-${continuation.suffix}.png; ` +
              `scroll position ${scrollY}px is already represented`,
          );
          continue;
        }
        const filename = `${capture.name}-${continuation.suffix}.png`;
        await capturePortalViewport(page, capture, filename, generatedFiles);
        capturedPositions.add(scrollY);
      }

      if (capture.name.startsWith("mobile-")) {
        await page.setViewportSize({ width: 320, height: capture.viewport.height });
        await settle(page, { scrollToTop: true });
        await assertNoHorizontalOverflow(page, `${capture.name} at 320px`);
      }
    }
    await pruneStalePortalReferences(generatedFiles);
  } finally {
    await context.close();
  }
}

await mkdir(outputDirectory, { recursive: true });
console.log(`Capturing UI reference from ${origin.origin}`);
const chromiumExecutablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
const browser = await chromium.launch(
  chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : undefined,
);

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
        await settle(page, { scrollToTop: true });
        await capture.afterReady?.(page);
        await settle(page, { scrollToTop: true });
        await page.screenshot({
          path: resolve(outputDirectory, `${capture.name}.png`),
          fullPage: false,
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
