import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { loadLocalEnv, requiredEnv, serviceDb } from "./support";

// VAL-ADMIN-002: the seed admin can log in and out through the UI.
// VAL-ADMIN-014 (shell scope): no horizontal overflow at 390/1440, nav
// And utility targets >= 44px, and the chrome uses the repo's design tokens
// (not ad-hoc hex).

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
  const { data: profile } = await serviceDb()
    .from("staff_profiles")
    .select("display_name")
    .eq("email", SEED_EMAIL.toLowerCase())
    .single();
  await expect(page.getByTestId("session-user")).toHaveText(
    String(profile?.display_name ?? ""),
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
  { name: "home", path: "/admin" },
  { name: "queue", path: "/admin/requests" },
  { name: "review-flyers", path: "/admin/review-flyers" },
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

      // Every primary destination is a real 44px target AND fully on
      // Screen — reachability must never depend on unmarked horizontal
      // Scrolling (a destination that starts offscreen does not exist
      // For staff who don't know to swipe a nav bar).
      const navBoxes = await page
        .locator('nav[aria-label="Portal sections"] a')
        .evaluateAll((links) =>
          links.map((link) => {
            const rect = link.getBoundingClientRect();
            return { height: rect.height, left: rect.left, right: rect.right };
          }),
        );
      expect(navBoxes).toHaveLength(4);
      for (const box of navBoxes) {
        expect(box.height, "nav target height").toBeGreaterThanOrEqual(44);
        expect(box.left, "nav item starts on screen").toBeGreaterThanOrEqual(0);
        expect(
          box.right,
          `nav item fully visible at ${viewport.name}`,
        ).toBeLessThanOrEqual(viewport.width);
      }

      const websiteLink = page.getByRole("link", { name: "View website" });
      await expect(websiteLink).toBeVisible();
      await expect(websiteLink).toHaveAttribute("href", "/");
      expect((await websiteLink.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(
        44,
      );

      const signOutBox = await page
        .getByRole("button", { name: "Sign out" })
        .boundingBox();
      expect(signOutBox?.height ?? 0).toBeGreaterThanOrEqual(44);

      const utilityCollision = await page.evaluate(() => {
        const website = Array.from(document.querySelectorAll("a")).find(
          (link) => link.textContent?.trim() === "View website",
        )?.getBoundingClientRect();
        const signOut = document
          .querySelector('button[type="submit"]')
          ?.getBoundingClientRect();
        const identity = document
          .querySelector('[data-testid="session-user"]')
          ?.parentElement?.getBoundingClientRect();
        const overlaps = (a: DOMRect, b: DOMRect) =>
          a.left < b.right &&
          a.right > b.left &&
          a.top < b.bottom &&
          a.bottom > b.top;
        return {
          signOut: Boolean(website && signOut && overlaps(website, signOut)),
          identity: Boolean(
            website &&
              identity &&
              identity.width > 0 &&
              identity.height > 0 &&
              overlaps(website, identity),
          ),
        };
      });
      expect(utilityCollision).toEqual({ signOut: false, identity: false });

      // Settings is active on both of its sub-pages.
      if (portalPage.path.startsWith("/admin/settings")) {
        await expect(
          page.locator(
            'nav[aria-label="Portal sections"] a[aria-current="page"]',
          ),
        ).toHaveText("Settings");
      }

    }

    // Token discipline: the header carries the navy token, the active nav
    // Item the amber token — resolved from the stylesheet, not ad-hoc hex.
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

  // Logged-out login page measurements.
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

    await page.getByLabel("Email").fill("recovery-layout@example.test");
    const forgotButton = page.getByRole("button", {
      name: "Forgot password?",
    });
    expect((await forgotButton.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(
      44,
    );
    await forgotButton.click();
    await expect(page.getByLabel("Email")).toBeFocused();
    await expect(page.getByLabel("Email")).toHaveValue(
      "recovery-layout@example.test",
    );
    const recoveryOverflow = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth - el.clientWidth;
    });
    expect(
      recoveryOverflow,
      `recovery overflow at ${viewport.name}`,
    ).toBeLessThanOrEqual(0);
    for (const control of [
      page.getByRole("button", { name: "Send reset link" }),
      page.getByRole("button", { name: "Back to sign in" }),
    ]) {
      expect((await control.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(
        44,
      );
    }
    await page.getByRole("button", { name: "Back to sign in" }).click();
    await expect(page.getByLabel("Email")).toHaveValue(
      "recovery-layout@example.test",
    );
  }
});

test("VAL-ADMIN-016: the waiting count rides on the Requests nav item", async ({
  page,
  request,
}) => {
  const marker = `navbadge-${randomUUID().slice(0, 8)}@example.test`;
  const staged = await request.post("/api/requests", {
    data: {
      name: "TEST Nav Badge",
      phone: "8135550122",
      email: marker,
      location: "tampa",
      time: "morning",
      message: "TEST staged for the nav badge check.",
      locale: "en",
      sourcePath: "/en/appointment",
    },
  });
  expect(staged.status()).toBe(201);
  const db = serviceDb();

  try {
    await signIn(page);
    await page.goto("/admin/settings");

    // Parallel specs and the shared development project can add or remove
    // New requests mid-run; accept the badge once it matches the SQL count
    // At the same instant (and is gone only when that count is zero).
    await expect
      .poll(
        async () => {
          await page.reload();
          const badge = page.getByTestId("nav-waiting-badge");
          const shown = (await badge.count()) > 0;
          const text = shown
            ? Number((await badge.textContent())?.replace(/\D+/g, ""))
            : null;
          const { count, error } = await db
            .from("requests")
            .select("id", { count: "exact", head: true })
            .eq("status", "new");
          expect(error).toBeNull();
          if ((count ?? 0) === 0) return shown ? "badge-shown-at-zero" : "consistent";
          return shown && text === count ? "consistent" : `badge=${text} sql=${count}`;
        },
        { timeout: 30_000, intervals: [500, 1_000, 2_000] },
      )
      .toBe("consistent");
  } finally {
    await db.from("requests").delete().eq("email", marker);
  }
});

test("staff can view the locale-negotiated website and return with their session", async ({
  page,
}) => {
  await page.context().addCookies([
    {
      name: "wgi-locale",
      value: "es",
      url: "http://localhost:3100",
      sameSite: "Lax",
    },
  ]);
  await signIn(page);

  const wordmark = page.getByRole("link", {
    name: "Westchase Gastroenterology",
  });
  await expect(wordmark).toHaveAttribute("href", "/admin");
  const websiteLink = page.getByRole("link", { name: "View website" });
  await wordmark.focus();
  await page.keyboard.press("Tab");
  await expect(websiteLink).toBeFocused();
  expect(await websiteLink.evaluate((link) => getComputedStyle(link).outlineStyle)).not.toBe(
    "none",
  );
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/es\/?$/);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/?$/);
  await expect(page.getByTestId("session-user")).toBeVisible();
});
