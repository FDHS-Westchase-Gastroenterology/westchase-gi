import { test, expect } from "@playwright/test";

import { runId, serviceDb } from "../harness/env";
import { schedulingFixtureDate } from "../harness/scheduling";
import { createStaffFixture, signIn } from "../harness/session";
import type { StaffFixture } from "../harness/session";

/* Issue #358: Help's topics narrow as staff type, open in place from a
   link, and show Practice settings to an admin only; the help button on a
   screen answers in a popover and opens the same topic in Help. */

test.use({ trace: "off" });

test.describe("Help", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Help runs once, at desktop size.");
  });

  test("search narrows the topics, a link opens one in place, and settings stay an admin's", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const db = serviceDb();
    let desk: StaffFixture | null = null;
    try {
      await signIn(page);
      await page.goto("/admin/help");
      const search = page.getByTestId("help-search");
      const topics = page.getByTestId("help-topic");
      const all = await topics.count();
      expect(all).toBe(11);
      await expect(
        page.getByRole("heading", { name: "Practice settings", exact: true }),
      ).toBeVisible();

      // Search reads answers as well as titles.
      await search.fill("mint circle");
      await expect(topics).toHaveCount(1);
      await expect(page.getByRole("status").filter({ hasText: /^1 topic$/ })).toHaveCount(1);
      await search.fill("zzzz");
      await expect(page.getByTestId("help-empty")).toBeVisible();
      await expect(page.getByRole("status").filter({ hasText: "No topics match" })).toHaveCount(1);
      await search.press("Escape");
      await expect(search).toHaveValue("");
      await expect(topics).toHaveCount(all);

      // Opening a topic writes its address; arriving at the address opens it.
      const emails = page.getByRole("button", { name: "Who gets request emails" });
      await emails.click();
      await expect(emails).toHaveAttribute("aria-expanded", "true");
      await expect(page).toHaveURL(/\/admin\/help#request-emails$/);
      await page.goto("/admin/help#booking-open-hour");
      const booking = page.getByRole("button", { name: "Booking an open hour" });
      await expect(booking).toHaveAttribute("aria-expanded", "true");
      await expect(booking).toBeFocused();
      await expect(
        page.locator("#booking-open-hour").getByRole("link", { name: /^Show me on the schedule/ }),
      ).toHaveAttribute("href", "/admin/schedule?view=day");

      await expect(page.getByTestId("help-website-change")).toHaveAttribute(
        "href",
        "/admin/help#website-changes",
      );
      await expect(page.getByTestId("help-start-front_desk")).toHaveText(
        "Start the front desk tour",
      );
      await expect(page.getByTestId("help-start-admin")).toHaveText("Start the admin tour");

      // Front desk gets no Practice settings group and no admin-only topic.
      await page.context().clearCookies();
      desk = await createStaffFixture(db, {
        prefix: `help-desk-${runId}`,
        displayName: "TEST Help Front Desk",
      });
      await signIn(page, desk);
      await page.goto("/admin/help#inviting-staff");
      await expect(page.getByRole("heading", { name: "Schedule", exact: true })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Practice settings", exact: true }),
      ).toHaveCount(0);
      await expect(page.locator("#inviting-staff")).toHaveCount(0);
      await expect(page.locator("#changing-hours-one-day")).toHaveCount(0);
      await expect(topics).toHaveCount(7);
      await expect(page.getByTestId("help-start-front_desk")).toHaveText("Start the tour");
    } finally {
      if (desk !== null) await desk.dispose();
    }
  });

  test("the Hours sheet's help button answers in place and opens the topic in Help", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await signIn(page);
    await page.goto(`/admin/schedule?view=day&date=${schedulingFixtureDate()}`);
    await page.getByRole("button", { name: "Hours", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: /^Hours for / });
    await expect(sheet).toBeVisible();

    const button = sheet.getByTestId("help-button");
    await expect(button).toHaveAccessibleName("Open help on changing hours for one day");
    await button.hover();
    await expect(page.getByRole("tooltip")).toHaveText("Open help on changing hours for one day");

    await button.click();
    const popover = page.getByTestId("help-popover");
    await expect(popover).toBeVisible();
    await expect(popover).toContainText("Changing hours for one day");
    await page.keyboard.press("Escape");
    await expect(popover).toBeHidden();
    await expect(button).toBeFocused();
    await expect(sheet).toBeVisible();

    await button.click();
    await popover.getByTestId("help-open-in-help").click();
    await expect(page).toHaveURL(/\/admin\/help#changing-hours-one-day$/);
    await expect(page.getByRole("button", { name: "Changing hours for one day" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});
