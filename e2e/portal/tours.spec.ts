import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import type { StaffTour } from "../../src/lib/portal/contracts";
import { runId, serviceDb } from "../harness/env";
import { createStaffFixture, signIn } from "../harness/session";
import type { StaffFixture } from "../harness/session";

/* Issue #358: a fresh account's first sign-in starts its role's tour, the
   tip takes focus and is worked from the keyboard, and Done or Skip tour is
   recorded so the tour does not start again; Help starts it again. */

test.use({ trace: "off" });

const db = serviceDb();

async function tourRecord(userId: string, tour: StaffTour) {
  const read = await db
    .from("staff_tours")
    .select("status")
    .eq("staff_user_id", userId)
    .eq("tour", tour)
    .maybeSingle<{ status: string }>();
  expect(read.error).toBeNull();
  return read.data?.status ?? null;
}

function tip(page: Page) {
  return page.getByTestId("tour-tip");
}

async function expectStep(page: Page, step: string, announcement: string) {
  await expect(tip(page)).toHaveAttribute("data-tour-step", step, { timeout: 15_000 });
  await expect(tip(page)).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: announcement })).toHaveCount(1);
}

/** The tour starts within moments of a screen settling; give it longer than its fallback. */
async function expectNoTour(page: Page) {
  await page.waitForTimeout(2_500);
  await expect(tip(page)).toHaveCount(0);
  await expect(page.locator(".wgi-tour-ring")).toHaveCount(0);
}

test.describe("First-sign-in tours", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "The tours run once, at desktop size.");
  });

  test("front desk: the tour starts on Home, runs from the keyboard to the Day view, and Done sticks", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    let desk: StaffFixture | null = null;
    try {
      desk = await createStaffFixture(db, {
        prefix: `tour-fd-${runId}`,
        displayName: "TEST Tour Front Desk",
      });
      await signIn(page, desk, { tour: true });

      await expectStep(
        page,
        "new-requests",
        "Front desk tour, step 1 of 4: New requests arrive here",
      );
      await expect(tip(page)).toContainText("Front desk tour");
      await expect(tip(page).getByRole("button", { name: "Skip tour" })).toBeVisible();
      await expect(tip(page).getByRole("button", { name: "Next" })).toBeVisible();

      await page.keyboard.press("Enter");
      await expectStep(page, "log-the-call", "step 2 of 4: Log the call on the card");

      await page.keyboard.press("Enter");
      await expectStep(page, "book-from-card", "step 3 of 4: Book a time from the card");

      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/admin\/schedule\?view=day/);
      await expectStep(page, "check-in", "step 4 of 4: Check patients in on the day");
      await expect(tip(page).getByRole("button", { name: "Done" })).toBeVisible();

      await page.keyboard.press("Enter");
      await expect(tip(page)).toHaveCount(0);
      await expect(page.locator("#portal-main")).toBeFocused();
      await expect.poll(async () => tourRecord(desk?.userId ?? "", "front_desk")).toBe("finished");

      await page.goto("/admin");
      await expectNoTour(page);

      // Help offers front desk its own tour only, and starts it again from the first step.
      await page.goto("/admin/help");
      await expect(page.getByTestId("help-start-admin")).toHaveCount(0);
      await page.getByTestId("help-start-front_desk").click();
      await expect(page).toHaveURL(/\/admin\/?$/);
      await expectStep(page, "new-requests", "step 1 of 4: New requests arrive here");
      expect(await tourRecord(desk.userId, "front_desk")).toBe("pending");
      await tip(page).getByRole("button", { name: "Skip tour" }).click();
      await expect(tip(page)).toHaveCount(0);
      await expect.poll(async () => tourRecord(desk?.userId ?? "", "front_desk")).toBe("skipped");
    } finally {
      if (desk !== null) {
        await db.from("audit_log").delete().eq("actor_email", desk.email);
        await desk.dispose();
      }
    }
  });

  test("admin: the tour starts in Settings, leaves Invite to the admin, and Esc skips it", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    let admin: StaffFixture | null = null;
    try {
      admin = await createStaffFixture(db, {
        prefix: `tour-admin-${runId}`,
        displayName: "TEST Tour Admin",
        role: "admin",
      });
      await signIn(page, admin, { tour: true });

      await expect(page).toHaveURL(/\/admin\/settings\/providers\/?$/, { timeout: 15_000 });
      await expectStep(
        page,
        "weekly-hours",
        "Admin tour, step 1 of 4: Set each provider’s weekly hours",
      );
      await expect(tip(page)).toContainText("Admin tour");

      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/admin\/settings\/appointment-types\/?$/);
      await expectStep(page, "appointment-types", "step 2 of 4: Set up appointment types");

      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/admin\/settings\/staff\/?$/);
      await expectStep(page, "invite-front-desk", "step 3 of 4: Invite the front desk");
      // The ring is on Invite; the invite sheet waits for the admin to choose it.
      await expect(page.locator(".wgi-tour-ring")).toBeVisible();
      await expect(page.getByRole("dialog", { name: "Invite someone" })).toHaveCount(0);

      await page.keyboard.press("Escape");
      await expect(tip(page)).toHaveCount(0);
      await expect(page.locator("#portal-main")).toBeFocused();
      await expect.poll(async () => tourRecord(admin?.userId ?? "", "admin")).toBe("skipped");

      await page.goto("/admin");
      await expect(page).toHaveURL(/\/admin\/?$/);
      await expectNoTour(page);

      // An admin may take either tour from Help.
      await page.goto("/admin/help");
      await page.getByTestId("help-start-admin").click();
      await expect(page).toHaveURL(/\/admin\/settings\/providers\/?$/);
      await expectStep(page, "weekly-hours", "Admin tour, step 1 of 4");
      await tip(page).getByTestId("tour-close").click();
      await expect.poll(async () => tourRecord(admin?.userId ?? "", "admin")).toBe("skipped");

      await page.goto("/admin/help");
      await page.getByTestId("help-start-front_desk").click();
      await expect(page).toHaveURL(/\/admin\/?$/);
      await expectStep(page, "new-requests", "Front desk tour, step 1 of 4");
      await tip(page).getByRole("button", { name: "Skip tour" }).click();
      await expect.poll(async () => tourRecord(admin?.userId ?? "", "front_desk")).toBe("skipped");
    } finally {
      if (admin !== null) {
        await db.from("audit_log").delete().eq("actor_email", admin.email);
        await admin.dispose();
      }
    }
  });
});
