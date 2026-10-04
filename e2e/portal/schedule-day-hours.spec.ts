import { expect, test } from "@playwright/test";

import { runId, serviceDb } from "../harness/env";
import {
  createSchedulingFixture,
  readDayHours,
  saveSettings,
  schedulingFixtureDate,
  setProviderWeek,
} from "../harness/scheduling";
import { signIn } from "../harness/session";

/* Issue #353: the Day view's Hours sheet. Dragging a provider's end past a booking names the
   visit and offers the way out; a provider who was off switches on; one save covers both, and
   the toast's Undo puts the day back. The shared Preview database has other providers, so every
   check is scoped to this run's rows. */

test("the Hours sheet shortens a day, refuses to strand a visit, adds someone off, and undoes", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const db = serviceDb();
  const prefix = `day-hours-${runId}`;
  const fixture = await createSchedulingFixture(db, prefix);
  const name = (label: string) => `TEST ${prefix} ${label}`;
  try {
    const actor = fixture.staff.userId;
    const date = schedulingFixtureDate();
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const [office] = fixture.locationIds;
    const [firstId, secondId] = fixture.providerIds;
    const everyDay = [0, 1, 2, 3, 4, 5, 6];
    const week = (weekdays: readonly number[]) =>
      weekdays.map((day) => ({
        locationId: office,
        weekday: day,
        openMinute: 480,
        closeMinute: 1020,
      }));
    for (const [id, weekdays] of [
      [firstId, everyDay],
      [secondId, everyDay.filter((day) => day !== weekday)],
    ] as const) {
      expect(await setProviderWeek(db, actor, id, week(weekdays))).toMatchObject({ ok: true });
    }
    expect(
      await saveSettings(db, actor, {
        kind: "save_location_details",
        id: office,
        expectedVersion: 1,
        name: name("First"),
        street: "1 Test Way",
        city: "Tampa",
        region: "FL",
        postal: "33626",
        mapsQuery: "1 Test Way Tampa FL 33626",
        hours: everyDay.map((day) => ({ weekday: day, openMinute: 480, closeMinute: 1080 })),
        keepBooked: false,
        dryRun: false,
      }),
    ).toMatchObject({ ok: true });
    // A 3:30 visit holds First until 4:05 with its buffer.
    expect((await fixture.save(fixture.booking("15:30"))).ok).toBe(true);
    async function windowsOf(providerId: string) {
      const read = await readDayHours(db, actor, date);
      if (!read.ok) throw new Error(`Day hours read failed: ${read.code}`);
      return read.providers.find((provider) => provider.id === providerId)?.windows;
    }

    await signIn(page, fixture.staff);
    await page.goto(`/admin/schedule?view=day&date=${date}`);
    await page.getByRole("button", { name: "Hours", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: /^Hours for / });
    await expect(sheet).toBeVisible();

    /* Ending First at 4:00 would strand the visit: the sheet names it and offers Keep. */
    const end = sheet.getByRole("slider", { name: `${name("First")} end` });
    await expect(end).toHaveAttribute("aria-valuetext", "5:00 PM");
    await end.focus();
    for (let step = 0; step < 4; step++) await page.keyboard.press("ArrowLeft");
    await expect(end).toHaveAttribute("aria-valuetext", "4:00 PM");
    const banner = sheet.getByRole("alert").filter({ hasText: "is booked at 3:30 PM" });
    await expect(banner).toBeVisible();
    const save = sheet.getByRole("button", { name: /^Save for / });
    await expect(save).toBeDisabled();
    await banner.getByRole("button", { name: "Keep 5:00 PM" }).click();
    await expect(end).toHaveAttribute("aria-valuetext", "5:00 PM");
    await expect(banner).toHaveCount(0);

    /* 4:15 still holds the visit; Second, who is off, switches on. */
    await end.focus();
    for (let step = 0; step < 3; step++) await page.keyboard.press("ArrowLeft");
    await expect(end).toHaveAttribute("aria-valuetext", "4:15 PM");
    await sheet.getByRole("switch", { name: name("Second") }).click();
    await expect(sheet.getByRole("switch", { name: name("Second") })).toBeChecked();
    await expect(save).toBeEnabled();
    await save.click();
    await expect(sheet).toHaveCount(0);
    const toast = page.locator("[data-sonner-toast]").filter({ hasText: /^Hours saved for/ });
    await expect(toast).toContainText("2 providers' hours changed");
    expect(await windowsOf(firstId)).toEqual([
      { locationId: office, openMinute: 480, closeMinute: 975 },
    ]);
    expect((await windowsOf(secondId))?.length).toBeGreaterThan(0);

    /* Undo puts both back. */
    await toast.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("The hours are back as they were")).toBeVisible();
    expect(await windowsOf(firstId)).toEqual([
      { locationId: office, openMinute: 480, closeMinute: 1020 },
    ]);
    expect(await windowsOf(secondId)).toEqual([]);
  } finally {
    await fixture.dispose();
  }
});
