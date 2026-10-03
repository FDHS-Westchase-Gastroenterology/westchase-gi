import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { resolveAppointmentStart } from "../../src/lib/portal/scheduling/time";
import { runId, serviceDb } from "../harness/env";
import { createSchedulingFixture, schedulingFixtureDate } from "../harness/scheduling";
import { signIn } from "../harness/session";

/* Issue #351: the Schedule's day view. Every working provider is a lane;
   the lanes, the arrows and the shortcuts move through the day; Day, Week
   and Month reach one another without a full page load; an open time books
   in place with an Undo; and Check in shows only within its window. The
   shared Preview database has other providers, so every check is scoped to
   this run's lanes. */

function at(date: string, time: string) {
  const instant = resolveAppointmentStart({ date, time });
  if (instant === null) throw new Error(`Invalid fixture time ${date} ${time}`);
  return instant;
}

function shift(date: string, days: number) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** "Wed, September 16": the Day view's title. */
function dayTitle(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Wednesday, September 16": a Month cell's heading. */
function monthCellHeading(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function practiceToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function escaped(text: string) {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
}

/** A marker that only survives client-side navigation. */
async function markDocument(page: Page) {
  await page.evaluate(() => {
    document.documentElement.dataset.wgiSameDocument = "1";
  });
}

async function expectSameDocument(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-wgi-same-document", "1");
}

async function focusedLabel(page: Page) {
  return page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
}

test("Schedule day lays out the providers, moves by arrows and shortcuts, and reaches Week and Month in place", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const db = serviceDb();
  const prefix = `day-${runId}`;
  const fixture = await createSchedulingFixture(db, prefix);
  const name = (label: string) => `TEST ${prefix} ${label}`;
  try {
    const date = schedulingFixtureDate();
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const [first] = fixture.locationIds;
    const hours = (day: number, openMinute: number, closeMinute: number) => [
      {
        locationId: first,
        weekday: day,
        openMinute,
        closeMinute,
        validFrom: "2026-01-01",
        validTo: null,
      },
    ];
    // Middle works ten minutes, too short for any visit: a lane with nothing to reach.
    // Off has hours on another weekday only.
    for (const [label, rows] of [
      ["Middle", hours(weekday, 540, 550)],
      ["Off", hours((weekday + 1) % 7, 540, 1080)],
    ] as const) {
      const saved = await fixture.save({
        action: "configure",
        idempotencyKey: randomUUID(),
        command: { kind: "save_provider", name: name(label), hours: rows, exceptions: [] },
      });
      if (!saved.ok) throw new Error(`Provider fixture ${label} failed`);
    }
    expect((await fixture.save(fixture.booking("10:00"))).ok).toBe(true);
    // A checked-in visit and a finished one in the Second lane, written as the RPCs leave them.
    const inserted = await db.from("appointments").insert(
      (
        [
          ["09:00", "checked_in"],
          ["11:00", "completed"],
        ] as const
      ).map(([time, status]) => {
        const start = Date.parse(at(date, time));
        const offset = (minutes: number) => new Date(start + minutes * 60_000).toISOString();
        return {
          patient_id: fixture.patientIds[1],
          provider_id: fixture.providerIds[1],
          location_id: first,
          appointment_type_id: fixture.typeId,
          starts_at: offset(0),
          ends_at: offset(30),
          duration_minutes: 30,
          buffer_before_minutes: 5,
          buffer_after_minutes: 5,
          reserved_from: offset(-5),
          reserved_until: offset(35),
          status,
          created_by: fixture.staff.userId,
          updated_by: fixture.staff.userId,
        };
      }),
    );
    expect(inserted.error).toBeNull();

    await signIn(page, fixture.staff);

    /* Month: a day's preview opens the Day view in place. */
    await page.goto(`/admin/schedule?month=${date.slice(0, 7)}`);
    await markDocument(page);
    await page
      .getByRole("gridcell", { name: new RegExp(`^${escaped(monthCellHeading(date))}\\b`, "u") })
      .hover();
    await page.getByRole("link", { name: /^Open day/u }).click();
    await expect(page).toHaveURL(new RegExp(`view=day&date=${date}`, "u"));
    const title = page.getByRole("heading", { name: dayTitle(date), exact: true });
    await expect(title).toBeVisible();
    await expectSameDocument(page);

    /* The lanes: who works, where, how much is open, and who is off. */
    const lane = (label: string) =>
      page.getByRole("group", { name: new RegExp(`^${escaped(name(label))},`, "u") });
    await expect(lane("Middle")).toHaveAccessibleName(new RegExp(", full$", "u"));
    await expect(lane("First")).toHaveAccessibleName(/, \d+ open$/u);
    await expect(lane("Off")).toHaveCount(0);
    await expect(
      page.getByText(new RegExp(`${escaped(name("Off"))}.* not scheduled this day`, "u")),
    ).toBeVisible();
    const firstBlock = lane("First").locator("[data-appointment]");
    await expect(firstBlock).toHaveCount(1);
    await expect(firstBlock).toHaveAccessibleName(
      `${name("First")}, test ${prefix} visit, 10:00 AM to 10:30 AM, ${name("First")}`,
    );
    await expect(lane("Second").getByText("Checked in", { exact: true })).toBeVisible();
    await expect(lane("Second").getByText("Done", { exact: true })).toBeVisible();

    /* Arrows: up and down stay with one provider; left and right keep the time,
       change provider, and step over a lane with nothing in it. */
    await firstBlock.focus();
    const inLane = (label: string) => new RegExp(`, ${escaped(name(label))}$`, "u");
    await page.keyboard.press("ArrowDown");
    expect(await focusedLabel(page)).toMatch(inLane("First"));
    expect(await focusedLabel(page)).toMatch(/^Open, /u);
    // Open times sit on the quarter hour: eight of them from 8:00 to the block at 10:00.
    for (let step = 0; step < 9; step++) await page.keyboard.press("ArrowUp");
    const top = await focusedLabel(page);
    expect(top).toMatch(/^Open, 8:00 AM, /u);
    await page.keyboard.press("ArrowUp");
    expect(await focusedLabel(page)).toBe(top);
    await firstBlock.focus();
    await page.keyboard.press("ArrowRight");
    expect(await focusedLabel(page)).toMatch(inLane("Second"));
    await page.keyboard.press("ArrowLeft");
    expect(await focusedLabel(page)).toMatch(inLane("First"));

    /* Return books the focused open time; a letter typed in its search is text, not a shortcut. */
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Enter");
    const card = page.locator(".wgi-week-card");
    await expect(card.getByText(/^Book \d/u).first()).toBeVisible();
    const search = card.getByPlaceholder("Search by name or phone");
    await search.focus();
    await page.keyboard.type("dwm");
    await expect(search).toHaveValue("dwm");
    await expect(page).toHaveURL(new RegExp(`view=day&date=${date}`, "u"));
    await page.keyboard.press("Escape");
    if ((await card.count()) > 0) await page.keyboard.press("Escape");
    await expect(card).toHaveCount(0);

    /* The shortcuts list, asked for from the open time the card returned
       focus to; Escape gives focus back to that time. */
    const asker = await page.evaluate(() => document.activeElement?.id ?? "");
    expect(asker).not.toBe("");
    await page.keyboard.press("?");
    const list = page.getByRole("dialog", { name: "Keyboard shortcuts" });
    await expect(list).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(list).toHaveCount(0);
    await expect(page.locator(`[id="${asker}"]`)).toBeFocused();

    /* "All shortcuts" is the list's trigger: it says whether the list is
       open, and takes focus back when the list closes. */
    const allShortcuts = page.getByRole("button", { name: "All shortcuts" });
    await expect(allShortcuts).toHaveAttribute("aria-expanded", "false");
    await allShortcuts.focus();
    await page.keyboard.press("Enter");
    await expect(list).toBeVisible();
    await expect(allShortcuts).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(list).toHaveCount(0);
    await expect(allShortcuts).toBeFocused();
    await expect(allShortcuts).toHaveAttribute("aria-expanded", "false");
    await allShortcuts.click();
    await expect(list).toBeVisible();
    await list.getByRole("button", { name: "Close" }).click();
    await expect(list).toHaveCount(0);
    await expect(allShortcuts).toBeFocused();
    await page.locator(`[id="${asker}"]`).focus();

    /* J and K step a day; W, D and M switch the view; T goes to today. */
    await page.keyboard.press("j");
    await expect(page).toHaveURL(new RegExp(`view=day&date=${shift(date, 1)}`, "u"));
    await expect(
      page.getByRole("heading", { name: dayTitle(shift(date, 1)), exact: true }),
    ).toBeVisible();
    await page.keyboard.press("k");
    await expect(page).toHaveURL(new RegExp(`view=day&date=${date}`, "u"));
    await expect(title).toBeVisible();
    await page.keyboard.press("w");
    await expect(page).toHaveURL(/view=week/u);
    /* A Week header opens its day. W shows the remembered provider, whose week may skip this date. */
    const header = page.getByRole("link", { name: /^Open \w{3}, \w+ \d{1,2}$/u }).first();
    const headerDay = (await header.getAttribute("aria-label")) ?? (await header.innerText());
    await header.click();
    await expect(page).toHaveURL(/view=day&date=\d{4}-\d{2}-\d{2}/u);
    await expect(
      page.getByRole("heading", { name: headerDay.replace(/^Open /u, ""), exact: true }),
    ).toBeVisible();
    /* The view switch reaches Week and comes back. */
    await page.getByRole("radiogroup", { name: "View" }).getByText("Week", { exact: true }).click();
    await expect(page).toHaveURL(/view=week/u);
    await page.keyboard.press("d");
    await expect(page).toHaveURL(/view=day/u);
    await page.keyboard.press("t");
    await expect(page).toHaveURL(/\/admin\/schedule\?view=day$/u);
    await expect(
      page.getByRole("heading", { name: dayTitle(practiceToday()), exact: true }),
    ).toBeVisible();
    await page.keyboard.press("m");
    await expect(page).toHaveURL(/\?month=\d{4}-\d{2}$/u);
    await expectSameDocument(page);

    /* A date nobody works, and a date that is not one. */
    await page.goto("/admin/schedule?view=day&date=2000-01-03");
    await expect(page.getByText("Nobody is scheduled this day.")).toBeVisible();
    await page.goto("/admin/schedule?view=day&date=2026-09-31");
    await expect(
      page.getByRole("heading", { name: dayTitle(practiceToday()), exact: true }),
    ).toBeVisible();
    await expect(page.getByText("This view could not load")).toHaveCount(0);
  } finally {
    await fixture.dispose();
  }
});

test("Schedule day books an open time in place, and Undo opens it again", async ({ page }) => {
  test.setTimeout(120_000);
  const db = serviceDb();
  const prefix = `day-book-${runId}`;
  const fixture = await createSchedulingFixture(db, prefix);
  const patient = `TEST ${prefix} First`;
  try {
    const date = schedulingFixtureDate();
    await signIn(page, fixture.staff);
    await page.goto(`/admin/schedule?view=day&date=${date}`);
    const lane = page.getByRole("group", {
      name: new RegExp(`^${escaped(`TEST ${prefix} First`)},`, "u"),
    });
    await expect(lane.locator("[data-appointment]")).toHaveCount(0);
    const open = lane.getByRole("button", { name: /^Open, /u });
    await expect(open.first()).toBeVisible();
    const openBefore = await open.count();

    await open.first().click();
    const card = page.locator(".wgi-week-card");
    const heading = card.getByText(/^Book \d/u).first();
    await expect(heading).toBeVisible();
    const time = (await heading.textContent())?.replace(/^Book /u, "") ?? "";
    /* The patient search is a combobox (issue #360): focus stays in the
       field, the list is a listbox, and its count is announced. Escape
       clears a query first and closes the card second. */
    const search = card.getByRole("combobox", { name: "Patient" });
    await search.fill(patient);
    const patients = card.getByRole("listbox", { name: "Patients" });
    const match = patients.getByRole("option", { name: patient });
    await expect(match).toBeVisible();
    await expect(card.locator('[data-slot="combobox-status"]')).toHaveText(/^\d+ patients?$/u);
    await expect(search).toHaveAttribute(
      "aria-controls",
      (await patients.getAttribute("id")) ?? "",
    );
    await page.keyboard.press("Escape");
    await expect(search).toHaveValue("");
    await expect(search).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(card).toHaveCount(0);

    /* Typed again, the arrows walk the list and Return picks. */
    await open.first().click();
    await card.getByRole("combobox", { name: "Patient" }).fill(patient);
    await expect(match).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowUp");
    await expect(patients.locator("[data-highlighted]")).toHaveCount(1);
    await expect(search).toHaveAttribute(
      "aria-activedescendant",
      (await patients.locator("[data-highlighted]").getAttribute("id")) ?? "",
    );
    await page.keyboard.press("Enter");
    await expect(card.locator(".wgi-week-card-chosen")).toHaveText(patient);
    await card.getByRole("button", { name: `Book ${time}` }).click();

    await expect(page.getByText(`${patient} is booked`)).toBeVisible();
    await expect(card).toHaveCount(0);
    await expect(lane.locator("[data-appointment]")).toHaveCount(1);
    await expect(lane.locator("[data-appointment]")).toHaveAccessibleName(
      new RegExp(`^${escaped(patient)}, .*, ${escaped(time)} to `, "u"),
    );

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("Undone.")).toBeVisible();
    await expect(lane.locator("[data-appointment]")).toHaveCount(0);
    await expect(open).toHaveCount(openBefore);
    await expect(open.first()).toHaveAccessibleName(new RegExp(`^Open, ${escaped(time)}, `, "u"));
  } finally {
    await fixture.dispose();
  }
});

test("Schedule day offers Check in only within its window, and checks in from the block", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const db = serviceDb();
  const prefix = `day-checkin-${runId}`;
  const fixture = await createSchedulingFixture(db, prefix);
  const patient = `TEST ${prefix} First`;
  try {
    // The check-in command takes only today's visits, so this one is today at noon.
    const today = practiceToday();
    const start = Date.parse(at(today, "12:00"));
    const offset = (minutes: number) => new Date(start + minutes * 60_000).toISOString();
    const inserted = await db.from("appointments").insert({
      patient_id: fixture.patientIds[0],
      provider_id: fixture.providerIds[0],
      location_id: fixture.locationIds[0],
      appointment_type_id: fixture.typeId,
      starts_at: offset(0),
      ends_at: offset(30),
      duration_minutes: 30,
      buffer_before_minutes: 5,
      buffer_after_minutes: 5,
      reserved_from: offset(-5),
      reserved_until: offset(35),
      status: "scheduled",
      created_by: fixture.staff.userId,
      updated_by: fixture.staff.userId,
    });
    expect(inserted.error).toBeNull();

    await signIn(page, fixture.staff);
    const block = page
      .getByRole("group", { name: new RegExp(`^${escaped(`TEST ${prefix} First`)},`, "u") })
      .locator(".wgi-dayview-block");
    const checkIn = page.getByRole("button", { name: `Check in ${patient}` });

    /* An hour and a half early: no Check in. */
    await page.clock.setFixedTime(new Date(at(today, "10:30")));
    await page.goto(`/admin/schedule?view=day&date=${today}`);
    await expect(block).toHaveCount(1);
    await block.hover();
    await expect(checkIn).toHaveCount(0);

    /* Half an hour early: the block offers it, and it lands in place. */
    await page.clock.setFixedTime(new Date(at(today, "11:30")));
    await page.reload();
    await block.hover();
    await expect(checkIn).toBeVisible();
    await checkIn.click();
    await expect(page.getByText(`${patient} is checked in`)).toBeVisible();
    await expect(block.getByText("Checked in", { exact: true })).toBeVisible();
    await expect(checkIn).toHaveCount(0);

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("Undone.")).toBeVisible();
    await expect(block.getByText("Checked in", { exact: true })).toHaveCount(0);
  } finally {
    await fixture.dispose();
  }
});
