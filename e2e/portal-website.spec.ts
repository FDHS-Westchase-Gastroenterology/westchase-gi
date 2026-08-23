import { randomUUID } from "node:crypto";

import { test, expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { loadLocalEnv, requiredEnv, serviceDb } from "./support";

loadLocalEnv();

const SEED_EMAIL = requiredEnv("PORTAL_SEED_ADMIN_EMAIL");
const SEED_PASSWORD = requiredEnv("PORTAL_SEED_ADMIN_PASSWORD");
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
const runId = randomUUID().slice(0, 8);
const staffEmail = `website-${runId}-staff@example.test`;
const staffPassword = `Ws-${randomUUID()}-aA1!`;
let staffUserId: string | null = null;

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 15_000 });
}

async function screenDisclosureChrome(summary: Locator) {
  return summary.evaluate((el) => {
    const before = getComputedStyle(el, "::before");
    const style = getComputedStyle(el);
    return {
      screen: matchMedia("screen").matches,
      print: matchMedia("print").matches,
      beforeContent: before.content,
      focusVisible: el.matches(":focus-visible"),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineOffset: style.outlineOffset,
    };
  });
}

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
    const created = await db.auth.admin.createUser({
      email: staffEmail,
      password: staffPassword,
      email_confirm: true,
    });
    expect(created.error).toBeNull();
    staffUserId = created.data.user?.id ?? null;
    if (staffUserId === null || staffUserId === "") {
      throw new Error("Staff fixture creation failed");
    }

    const profile = await db.from("staff_profiles").insert({
      user_id: staffUserId,
      email: staffEmail,
      display_name: "TEST Website Staff",
      role: "staff",
      active: true,
      onboarded_at: new Date().toISOString(),
    });
    expect(profile.error).toBeNull();
  });

  test.afterAll(async () => {
    if (staffUserId === null || staffUserId === "") {
      return;
    }
    await db.from("staff_profiles").delete().eq("user_id", staffUserId);
    await db.auth.admin.deleteUser(staffUserId);
  });

  test("staff-first opening, unresolved items, and the website-change action precede maintainer details", async ({
    page,
  }) => {
    await signIn(page, SEED_EMAIL, SEED_PASSWORD);
    await page.goto("/admin/settings/software");

    await expect(page.getByRole("link", { name: "Website", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const product = page.getByTestId("managed-product");
    const staffLayer = page.getByTestId("website-staff-layer");
    const details = page.getByTestId("maintainer-details");
    await expect(product).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Clinic website", exact: true })).toBeVisible();

    const staffText = await staffLayer.innerText();
    const doesAt = staffText.indexOf("What the website does");
    const controlsAt = staffText.indexOf("What Westchase GI controls");
    const attentionAt = staffText.indexOf("Still needs attention");
    const requestAt = staffText.indexOf("How to request a website change");
    expect(doesAt).toBeGreaterThanOrEqual(0);
    expect(doesAt).toBeLessThan(controlsAt);
    expect(controlsAt).toBeLessThan(attentionAt);
    expect(attentionAt).toBeLessThan(requestAt);

    const changeLink = page.getByTestId("request-website-change");
    await expect(changeLink).toBeVisible();
    await expect(changeLink).toHaveAttribute("href", "/admin/help#website-changes");
    await expect(changeLink).toContainText("Request a website change");
    await expect(staffLayer).toContainText("not editing the website from this portal");
    await expect(staffLayer).toContainText("Most staff never need those accounts");

    for (const capability of [
      "Patient-facing website",
      "Authenticated staff portal",
      "Review-flyer printing",
    ]) {
      await expect(staffLayer).toContainText(capability);
    }

    await expect(staffLayer).toContainText("westchasegi.com domain");
    await expect(staffLayer).toContainText("clinic-owned GitHub repository");
    await expect(staffLayer).toContainText("Vercel deployment");
    await expect(staffLayer).not.toContainText("everything", { ignoreCase: false });
    await expect(staffLayer).not.toContainText("fully owned", { ignoreCase: false });
    await expect(staffLayer.getByRole("link", { name: /Sign in to/ })).toHaveCount(0);

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
    for (const link of PROVIDER_LINKS) {
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

    await signIn(page, SEED_EMAIL, SEED_PASSWORD);
    await page.goto("/admin/settings/software");
    await page.emulateMedia({ media: "screen" });

    const details = page.getByTestId("maintainer-details");
    const summary = details.locator("summary");
    await expect(details).toHaveJSProperty("open", false);
    await expect
      .poll(async () => (await screenDisclosureChrome(summary)).beforeContent)
      .toMatch(/Show/);
    const closedChrome = await screenDisclosureChrome(summary);
    expect(closedChrome.screen).toBe(true);
    expect(closedChrome.print).toBe(false);
    await summary.focus();
    await expect(summary).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(details).toHaveJSProperty("open", true);
    await expect(summary).toBeFocused();
    await expect(summary).toContainText("Maintainer details");
    await expect
      .poll(async () => (await screenDisclosureChrome(summary)).beforeContent)
      .toMatch(/Hide/);
    const openChrome = await screenDisclosureChrome(summary);
    expect(openChrome.screen).toBe(true);
    expect(openChrome.print).toBe(false);
    expect(openChrome.focusVisible).toBe(true);
    expect(openChrome.outlineStyle).toBe("solid");
    expect(Number.parseFloat(openChrome.outlineWidth)).toBeGreaterThanOrEqual(3);
    expect(Number.parseFloat(openChrome.outlineOffset)).toBeGreaterThanOrEqual(3);

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
    await expect(summary).toContainText("Maintainer details");
    await expect
      .poll(async () => (await screenDisclosureChrome(summary)).beforeContent)
      .toMatch(/Show/);
    const restoredChrome = await screenDisclosureChrome(summary);
    expect(restoredChrome.screen).toBe(true);
    expect(restoredChrome.print).toBe(false);
    expect(restoredChrome.focusVisible).toBe(true);
    expect(restoredChrome.outlineStyle).toBe("solid");
    expect(Number.parseFloat(restoredChrome.outlineWidth)).toBeGreaterThanOrEqual(3);
    await expect(page.getByTestId("website-attention")).toBeVisible();
    await expect(
      page.getByRole("link", { name: PROVIDER_LINKS[0].name, exact: true }),
    ).toBeHidden();

    for (const removedControl of ["Add asset", "Edit", "Archive", "Add access", "End access"]) {
      await expect(page.getByRole("button", { name: removedControl, exact: true })).toHaveCount(0);
    }
    await expect(page.getByTestId("integration-vercel")).toHaveCount(0);
    await expect(page.getByText("Once connected, it will manage")).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByText("Change permission", { exact: true })).toHaveCount(0);
    expect(browserProviderRequests).toHaveLength(0);
  });

  test("legacy registry redirect, flyer, help, and public-site handoffs keep working", async ({
    page,
  }) => {
    await signIn(page, SEED_EMAIL, SEED_PASSWORD);
    await page.goto("/admin/settings/software");

    const flyerTask = page.getByRole("link", { name: "Print review flyers" });
    await expect(flyerTask).toHaveAttribute("href", "/admin/review-flyers");
    await flyerTask.click();
    await expect(page.getByRole("heading", { name: "Print review flyers" })).toBeVisible();

    await page.goto("/admin/settings/software");
    await page.getByTestId("request-website-change").click();
    await expect(page).toHaveURL(/\/admin\/help#website-changes$/);
    await expect(page.getByRole("heading", { name: "Getting website changes made" })).toBeVisible();

    await page.goto("/admin/registry");
    await expect(page).toHaveURL(/\/admin\/settings\/software\/?$/);
    await expect(page.getByRole("link", { name: "Website", exact: true })).toHaveAttribute(
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

  test("staff can open Website with the flyer task but no maintainer controls", async ({
    page,
  }) => {
    await signIn(page, staffEmail, staffPassword);
    await page.goto("/admin/settings/software");

    await expect(page.getByTestId("managed-product")).toHaveCount(1);
    await expect(page.getByTestId("request-website-change")).toBeVisible();
    await expect(page.getByRole("link", { name: "Print review flyers" })).toHaveAttribute(
      "href",
      "/admin/review-flyers",
    );
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
