import { test, expect, type Page } from "@playwright/test";
import { loadLocalEnv, requiredEnv } from "./support";

// VAL-ADMIN-002: the seed admin can log in and out through the UI.
// VAL-ADMIN-014 (shell scope): no horizontal overflow at 390/1440, nav
// targets >= 40px, and the chrome uses the repo's design tokens (not
// ad-hoc hex). Screenshots land in test-results/portal-shell/ for the
// gate evidence.

loadLocalEnv();

const SEED_EMAIL = requiredEnv("PORTAL_SEED_ADMIN_EMAIL");
const SEED_PASSWORD = requiredEnv("PORTAL_SEED_ADMIN_PASSWORD");

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(SEED_EMAIL);
  await page.getByLabel("Password").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
}

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "JS portal UI");
});

test("VAL-ADMIN-002: seed admin logs in and out through the UI", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login\/?$/);

  await signIn(page);
  await expect(page.getByTestId("session-user")).toHaveText(
    SEED_EMAIL.toLowerCase(),
  );

  await page.reload();
  await expect(page).toHaveURL(/\/admin\/?$/);
  await expect(page.getByTestId("session-user")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login\/?$/);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login\/?$/);
});

const VIEWPORTS = [
  { name: "390", width: 390, height: 844 },
  { name: "1440", width: 1440, height: 900 },
] as const;

const PORTAL_PAGES = [
  { name: "queue", path: "/admin" },
  { name: "settings", path: "/admin/settings" },
  { name: "settings-software", path: "/admin/settings/software" },
  { name: "audit", path: "/admin/audit" },
  { name: "help", path: "/admin/help" },
] as const;

test("VAL-ADMIN-014: shell holds the mechanical design bar at 390 and 1440", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page);

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    // Login page (fresh context not needed: measure it logged out later).
    for (const portalPage of PORTAL_PAGES) {
      await page.goto(portalPage.path);
      await expect(page).toHaveURL(new RegExp(`${portalPage.path}/?$`));

      const overflow = await page.evaluate(() => {
        const el = document.documentElement;
        return el.scrollWidth - el.clientWidth;
      });
      expect(
        overflow,
        `${portalPage.path} horizontal overflow at ${viewport.name}`,
      ).toBeLessThanOrEqual(0);

      const navBoxes = await page
        .locator('nav[aria-label="Portal sections"] a')
        .evaluateAll((links) =>
          links.map((link) => link.getBoundingClientRect().height),
        );
      expect(navBoxes).toHaveLength(3);
      for (const height of navBoxes) {
        expect(height, "nav target height").toBeGreaterThanOrEqual(40);
      }

      const signOutBox = await page
        .getByRole("button", { name: "Sign out" })
        .boundingBox();
      expect(signOutBox?.height ?? 0).toBeGreaterThanOrEqual(40);

      // Settings is active on both of its sub-pages.
      if (portalPage.path.startsWith("/admin/settings")) {
        await expect(
          page.locator(
            'nav[aria-label="Portal sections"] a[aria-current="page"]',
          ),
        ).toHaveText("Settings");
      }

      // Screenshot sweep: the queue plus both Settings sub-pages (the tab
      // row is the one place a narrow viewport has clipped before).
      if (
        portalPage.name === "queue" ||
        portalPage.path.startsWith("/admin/settings")
      ) {
        await page.screenshot({
          path: `test-results/portal-shell/${portalPage.name}-${viewport.name}.png`,
          fullPage: true,
        });
      }
    }

    // Token discipline: the header carries the navy token, the active nav
    // item the amber token — resolved from the stylesheet, not ad-hoc hex.
    await page.goto("/admin");
    const tokenCheck = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.backgroundColor = "var(--color-navy)";
      probe.style.borderColor = "var(--color-amber)";
      document.body.appendChild(probe);
      const probeStyles = getComputedStyle(probe);
      const expectedNavy = probeStyles.backgroundColor;
      const expectedAmber = probeStyles.borderColor;
      probe.remove();

      const header = document.querySelector("header");
      const active = document.querySelector(
        'nav[aria-label="Portal sections"] a[aria-current="page"]',
      );
      return {
        expectedNavy,
        expectedAmber,
        headerBg: header ? getComputedStyle(header).backgroundColor : null,
        activeBorder: active
          ? getComputedStyle(active).borderBottomColor
          : null,
      };
    });
    expect(tokenCheck.headerBg).toBe(tokenCheck.expectedNavy);
    expect(tokenCheck.activeBorder).toBe(tokenCheck.expectedAmber);
  }

  // Logged-out login page measurements + screenshots.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login\/?$/);
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto("/admin/login");
    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth - el.clientWidth;
    });
    expect(overflow, `login overflow at ${viewport.name}`).toBeLessThanOrEqual(
      0,
    );
    await page.screenshot({
      path: `test-results/portal-shell/login-${viewport.name}.png`,
      fullPage: true,
    });
  }
});
