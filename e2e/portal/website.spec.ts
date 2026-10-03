import { test, expect } from "@playwright/test";
import type { Locator } from "@playwright/test";

import { runId, serviceDb } from "../harness/env";
import { createStaffFixture, signIn } from "../harness/session";
import type { StaffFixture } from "../harness/session";

const REPOSITORY_URL = "https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi";
const GITHUB_CONFIGURATION_COUNT = [
  "PORTAL_GITHUB_APP_ID",
  "PORTAL_GITHUB_APP_INSTALLATION_ID",
  "PORTAL_GITHUB_APP_PRIVATE_KEY",
].filter((name) => Boolean(process.env[name]?.trim())).length;
const PROVIDER_LINKS = [
  {
    name: "Open GitHub (leaves the staff portal)",
    href: REPOSITORY_URL,
    testId: "canonical-repository",
  },
  {
    name: "Open Vercel (leaves the staff portal)",
    href: "https://vercel.com/login",
    testId: "provider-vercel",
  },
  {
    name: "Open Supabase (leaves the staff portal)",
    href: "https://supabase.com/dashboard/sign-in",
    testId: "provider-supabase",
  },
  {
    name: "Open Porkbun (leaves the staff portal)",
    href: "https://porkbun.com/account/login",
    testId: "provider-porkbun",
  },
] as const;
const SECRET_MATERIAL =
  /ghp_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+|sk_live_|sk_test_|BEGIN [A-Z ]*PRIVATE KEY|PORTAL_GITHUB_APP_PRIVATE_KEY|SUPABASE_SERVICE_ROLE_KEY|Bearer [A-Za-z0-9._-]+/;

const db = serviceDb();
let staff: StaffFixture | null = null;

function staffAccount(): StaffFixture {
  if (staff === null) throw new Error("Website staff fixture was not created");
  return staff;
}

async function screenDisclosureChrome(summary: Locator) {
  return summary.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      screen: matchMedia("screen").matches,
      print: matchMedia("print").matches,
      focusVisible: el.matches(":focus-visible"),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });
}

/* The GitHub and Vercel rows link out in the open card; the services only a
   maintainer signs in to stay inside the disclosure. */
const ROW_LINK_IDS = new Set<string>(["canonical-repository", "provider-vercel"]);
const ROW_LINKS = PROVIDER_LINKS.filter((link) => ROW_LINK_IDS.has(link.testId));
const MAINTAINER_LINKS = PROVIDER_LINKS.filter((link) => !ROW_LINK_IDS.has(link.testId));

function expectedConnectionStatus(): "Connected" | "Not configured" | "Connection unavailable" {
  if (GITHUB_CONFIGURATION_COUNT === 3) return "Connected";
  if (GITHUB_CONFIGURATION_COUNT === 0) return "Not configured";
  return "Connection unavailable";
}

test.describe("website custody", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "JS portal UI");
  });

  test.beforeAll(async () => {
    staff = await createStaffFixture(db, {
      prefix: `website-${runId}`,
      displayName: "TEST Website Staff",
    });
  });

  test.afterAll(async () => {
    await staff?.dispose();
  });

  test("staff-first opening, unresolved items, and the website-change action precede maintainer details", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/admin/settings/software");

    await expect(page.getByRole("link", { name: "Software", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const product = page.getByTestId("managed-product");
    const details = page.getByTestId("maintainer-details");
    await expect(product).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "One piece of software runs three things", exact: true }),
    ).toBeVisible();

    // The change request is the page's action, ahead of every account row.
    const changeLink = page.getByTestId("request-website-change");
    await expect(changeLink).toBeVisible();
    await expect(changeLink).toHaveAttribute("href", "/admin/help#website-changes");
    await expect(changeLink).toContainText("Request a website change");

    for (const capability of ["Patient website", "Staff portal", "Review-flyer printing"]) {
      await expect(product).toContainText(capability);
    }
    const domain = product.locator('[data-row="domain"]');
    await expect(domain).toContainText("westchasegi.com");
    await expect(domain).toContainText("Clinic owned");
    await expect(product.locator('[data-row="source-code"]')).toContainText(
      "GitHub · clinic repository",
    );
    await expect(product.locator('[data-row="hosting"]')).toContainText("Vercel");
    await expect(details.locator("summary")).toContainText("Who can change the code and hosting");
    await expect(product).not.toContainText("everything", { ignoreCase: false });
    await expect(product).not.toContainText("fully owned", { ignoreCase: false });
    await expect(product.getByRole("link", { name: /Sign in to/ })).toHaveCount(0);

    const attention = page.getByTestId("website-attention");
    await expect(attention).toBeVisible();
    await expect(attention).toContainText("consultant-managed");
    await expect(attention).toContainText("Auto-renew and WHOIS privacy");
    const expectedStatus = expectedConnectionStatus();
    if (expectedStatus === "Not configured") {
      await expect(attention).toContainText("not configured yet");
    } else if (expectedStatus === "Connection unavailable") {
      await expect(attention).toContainText("cannot be reached right now");
    }

    await expect(details).toHaveJSProperty("open", false);
    for (const link of ROW_LINKS) {
      await expect(page.getByTestId(link.testId)).toBeVisible();
    }
    for (const link of MAINTAINER_LINKS) {
      await expect(page.getByTestId(link.testId)).toBeHidden();
    }

    const pageText = await product.innerText();
    expect(pageText).not.toMatch(SECRET_MATERIAL);
    expect(pageText).not.toContain("305283597");
    expect(pageText).not.toContain("1289668601");
  });

  test("maintainer disclosure expands from the keyboard and keeps unresolved warnings visible", async ({
    page,
  }) => {
    const browserProviderRequests: string[] = [];
    page.on("request", (request) => {
      const host = new URL(request.url()).hostname;
      if (host === "api.github.com" || host.endsWith(".github.com")) {
        browserProviderRequests.push(request.url());
      }
    });

    await signIn(page);
    await page.goto("/admin/settings/software");
    await page.emulateMedia({ media: "screen" });

    const details = page.getByTestId("maintainer-details");
    const summary = details.locator("summary");
    await expect(details).toHaveJSProperty("open", false);
    await expect(summary).toContainText("Manage");
    const closedChrome = await screenDisclosureChrome(summary);
    expect(closedChrome.screen).toBe(true);
    expect(closedChrome.print).toBe(false);
    // Focus and press on the same resolved control; streamed navigation may
    // Replace a server-rendered node between separate focus and keyboard calls.
    await summary.press("Enter");
    await expect(details).toHaveJSProperty("open", true);
    await expect(summary).toBeFocused();
    await expect(summary).toContainText("Maintainer access");
    await expect(summary).toContainText("Hide");
    await expect(summary).not.toContainText("Manage");
    const openChrome = await screenDisclosureChrome(summary);
    expect(openChrome.screen).toBe(true);
    expect(openChrome.print).toBe(false);
    expect(openChrome.focusVisible).toBe(true);
    expect(openChrome.outlineStyle).toBe("solid");
    expect(Number.parseFloat(openChrome.outlineWidth)).toBeGreaterThanOrEqual(2);

    await expect(page.getByTestId("website-attention")).toBeVisible();
    await expect(page.getByTestId("website-attention")).toContainText("consultant-managed");
    await expect(page.getByTestId("website-attention")).toContainText("WHOIS");

    for (const link of PROVIDER_LINKS) {
      const locator = page.getByRole("link", { name: link.name, exact: true });
      await expect(locator).toBeVisible();
      await expect(locator).toHaveAttribute("href", link.href);
      await expect(locator).toHaveAttribute("target", "_blank");
      await expect(locator).toHaveAttribute("rel", "noopener noreferrer");
    }

    const access = page.getByTestId("maintainer-access");
    await expect(access).toBeVisible();
    const expectedStatus = expectedConnectionStatus();
    await expect(access.getByTestId("integration-status")).toHaveText(expectedStatus);
    await expect(access).toContainText("Who can change the website");
    if (expectedStatus === "Connected") {
      await expect(access.getByTestId("maintainer-list")).toContainText("Owner");
      await expect(access).toContainText(
        "FDHS-Westchase-Gastroenterology — the practice’s own account",
      );
      const setupNotice = access.getByTestId("maintainer-setup-notice");
      if ((await setupNotice.count()) === 1) {
        await expect(setupNotice).toBeVisible();
        await expect(access.getByRole("button", { name: "Send invitation" })).toHaveCount(0);
      } else {
        await expect(access.getByRole("button", { name: "Send invitation" })).toBeVisible();
      }
    } else {
      await expect(access.getByTestId("maintainer-list")).toHaveCount(0);
    }

    await page.keyboard.press("Space");
    await expect(details).toHaveJSProperty("open", false);
    await expect(summary).toBeFocused();
    await expect(summary).toContainText("Manage");
    const restoredChrome = await screenDisclosureChrome(summary);
    expect(restoredChrome.screen).toBe(true);
    expect(restoredChrome.print).toBe(false);
    expect(restoredChrome.focusVisible).toBe(true);
    expect(restoredChrome.outlineStyle).toBe("solid");
    await expect(page.getByTestId("website-attention")).toBeVisible();
    for (const link of MAINTAINER_LINKS) {
      await expect(page.getByRole("link", { name: link.name, exact: true })).toBeHidden();
    }

    for (const removedControl of ["Add asset", "Edit", "Archive", "Add access", "End access"]) {
      await expect(page.getByRole("button", { name: removedControl, exact: true })).toHaveCount(0);
    }
    await expect(page.getByTestId("integration-vercel")).toHaveCount(0);
    await expect(page.getByText("Once connected, it will manage")).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByText("Change permission", { exact: true })).toHaveCount(0);
    expect(browserProviderRequests).toHaveLength(0);
  });

  test("legacy registry redirect, help, and public-site handoffs keep working", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/admin/settings/software");
    await page.getByTestId("request-website-change").click();
    await expect(page).toHaveURL(/\/admin\/help#website-changes$/);
    await expect(page.getByRole("heading", { name: "Getting website changes made" })).toBeVisible();

    await page.goto("/admin/registry");
    await expect(page).toHaveURL(/\/admin\/settings\/software\/?$/);
    await expect(page.getByRole("link", { name: "Software", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByTestId("request-website-change")).toBeVisible();

    const websiteLink = page.getByRole("link", { name: "View website" }).first();
    await websiteLink.click();
    await expect(page).toHaveURL(/\/(en|es|vi|ko|ar)\/?$/);
    await page.getByRole("link", { name: "Staff portal" }).click();
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByTestId("session-user")).toBeVisible();
  });

  test("staff can open Software but get no maintainer controls", async ({ page }) => {
    await signIn(page, staffAccount());
    await page.goto("/admin/settings/software");

    await expect(page.getByTestId("managed-product")).toHaveCount(1);
    await expect(page.getByTestId("request-website-change")).toBeVisible();
    await expect(page.getByTestId("website-attention")).toBeVisible();

    const details = page.getByTestId("maintainer-details");
    await details.locator("summary").click();
    await expect(
      page.getByRole("link", {
        name: "Open GitHub (leaves the staff portal)",
        exact: true,
      }),
    ).toHaveAttribute("href", REPOSITORY_URL);
    const access = page.getByTestId("maintainer-access");
    await expect(access.getByRole("button", { name: "Send invitation" })).toHaveCount(0);
    await expect(access.locator('[data-action="revoke-maintainer"]')).toHaveCount(0);
    await expect(access.locator('[data-action="cancel-invitation"]')).toHaveCount(0);
  });
});
