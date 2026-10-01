import { expect, test } from "@playwright/test";

import { runId, serviceDb } from "../harness/env";
import { createSchedulingFixture, schedulingFixtureDate } from "../harness/scheduling";
import { signIn } from "../harness/session";

/* Issue #345: the Schedule's week view. The title menu switches the
   provider in place, turns into the compare picker, and compare mode
   shows the providers in lanes; a click on an appointment or an open time
   opens its card beside the cell. */

function sundayOf(date: string): string {
  const noon = new Date(`${date}T12:00:00Z`);
  return new Date(noon.getTime() - noon.getUTCDay() * 86_400_000).toISOString().slice(0, 10);
}

test("Schedule week switches provider, compares two in lanes, and opens a cell's card", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const db = serviceDb();
  const prefix = `week-${runId}`;
  const fixture = await createSchedulingFixture(db, prefix);
  const [first, second] = [`TEST ${prefix} First`, `TEST ${prefix} Second`];
  try {
    expect((await fixture.save(fixture.booking("10:00"))).ok).toBe(true);
    const week = sundayOf(schedulingFixtureDate());

    await signIn(page, fixture.staff);
    await page.goto(`/admin/schedule?view=week&week=${week}&provider=${fixture.providerIds[0]}`);
    const trigger = page.locator(".wgi-week-trigger");
    await expect(trigger).toHaveAccessibleName(`${first} provider, change`);

    /* A provider chosen in the menu replaces the week in place. */
    await trigger.click();
    await page.getByRole("menuitemradio", { name: second, exact: true }).click();
    await expect(trigger).toHaveAccessibleName(`${second} provider, change`);
    await expect(page).toHaveURL(new RegExp(`provider=${fixture.providerIds[1]}`, "u"));

    /* "Compare providers…" turns the same menu into the picker. */
    await trigger.click();
    await page.getByRole("menuitem", { name: "Compare providers…" }).click();
    await expect(page.getByText("1 of 3 selected")).toBeVisible();
    const compare = page.getByRole("menuitem", { name: "Compare", exact: true });
    await expect(compare).toBeDisabled();
    await page.getByRole("menuitemcheckbox", { name: first, exact: true }).click();
    await expect(page.getByText("2 of 3 selected")).toBeVisible();
    await compare.click();
    await expect(trigger).toHaveAccessibleName(
      `Comparing ${second} and ${first}, providers, change`,
    );
    await expect(page.getByRole("link", { name: `Show only ${first}` }).first()).toBeVisible();

    /* An appointment opens its card; Escape closes it. */
    const card = page.locator(".wgi-week-card");
    await page.getByRole("button", { name: new RegExp(`^${first}, `, "u") }).click();
    await expect(card.getByRole("button", { name: "Reschedule" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(card).toHaveCount(0);

    /* An open time opens the booking card for that start. */
    await page
      .getByRole("button", { name: /^Open, /u })
      .first()
      .click();
    await expect(card.getByText(/^Book /u).first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(card).toHaveCount(0);

    /* A lane label leaves compare for that provider's week alone. */
    await page
      .getByRole("link", { name: `Show only ${first}` })
      .first()
      .click();
    await expect(trigger).toHaveAccessibleName(`${first} provider, change`);
    await expect(page.getByText("This view could not load")).toHaveCount(0);
  } finally {
    await fixture.dispose();
  }
});
