import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";
import { z } from "zod";

import { runId, serviceDb } from "../harness/env";
import {
  createSchedulingFixture,
  readSettings,
  restoreBookingInterval,
  schedulingFixtureDate,
} from "../harness/scheduling";
import { createStaffFixture, signIn } from "../harness/session";

/* Issue #352: the Settings window's Schedule group as staff use it. Time off
   warns about the bookings it covers before it is added and lists them to
   rebook after; a type turns off and back on with Undo, and moves in the
   booking order from the keyboard; the practice clock saves a choice and undoes it;
   an office closes a day the same way time
   off does. Staff read every pane with no edit controls. The shared Preview
   database has other providers, types and offices, so every check is scoped
   to this run's rows; the server-side refusals are in
   e2e/boundaries/scheduling-settings.spec.ts. */

function escaped(text: string) {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
}

/** Shows `day` in a calendar that opens on the current month, then picks it. */
async function pickDay(calendar: Readonly<Locator>, day: string) {
  const button = calendar.locator(`button[data-day="${day}"]`);
  for (let pages = 0; pages < 2 && (await button.count()) === 0; pages += 1)
    await calendar.getByRole("button", { name: /next month/iu }).click();
  await button.click();
  await expect(calendar.locator(`[role="gridcell"][aria-selected="true"]`)).toHaveCount(1);
}

test("time off warns about the bookings it covers and lists them to rebook", async ({ page }) => {
  test.setTimeout(120_000);
  const db = serviceDb();
  const prefix = `settings-off-${runId}`;
  const fixture = await createSchedulingFixture(db, prefix);
  try {
    const date = schedulingFixtureDate();
    expect(await fixture.save(fixture.booking("10:00"))).toMatchObject({ ok: true });
    const [providerId] = fixture.providerIds;

    await signIn(page, fixture.staff);
    await page.goto(`/admin/settings/providers?provider=${providerId}`);
    await expect(
      page.getByRole("link", { name: new RegExp(`^${escaped(`TEST ${prefix} First`)}`, "u") }),
    ).toHaveAttribute("aria-current", "page");

    await page.getByRole("button", { name: "Add time off" }).click();
    const popover = page.getByRole("dialog", { name: /^Time off for /u });
    await expect(popover).toBeVisible();
    await pickDay(popover, date);
    // The dry run says what the day covers before anything is saved.
    await expect(popover.getByRole("status").filter({ hasText: "booked" })).toHaveText(
      /^1 appointment is booked on this day\. After adding/u,
    );
    await popover.getByRole("button", { name: "Add time off" }).click();
    await expect(popover).toHaveCount(0);

    const displaced = page.getByRole("status").filter({ hasText: "falls in this time off" });
    await expect(displaced).toContainText(
      "1 booked appointment falls in this time off. Choose a new time for it.",
    );
    const rebook = displaced.getByRole("link");
    await expect(rebook).toHaveCount(1);
    await expect(rebook).toContainText(`TEST ${prefix} Visit`);
    // Never cancelled: the booking stands until staff move it.
    const kept = await db
      .from("appointments")
      .select("status")
      .eq("created_by", fixture.staff.userId)
      .single();
    expect(kept.data).toEqual({ status: "scheduled" });

    await rebook.click();
    await expect(page).toHaveURL(new RegExp(`/admin/schedule\\?.*date=${date}`, "u"));
  } finally {
    await fixture.dispose();
  }
});

test("a type turns off and back on with Undo, and moves in the booking order from the keyboard", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const db = serviceDb();
  const prefix = `settings-types-${runId}`;
  const fixture = await createSchedulingFixture(db, prefix);
  const name = `TEST ${prefix} Visit`;
  const actor = fixture.staff.userId;
  async function order() {
    const read = await readSettings(db, actor);
    if (!read.ok) throw new Error("Settings read failed");
    return read.types.map((type) => type.id);
  }
  try {
    await signIn(page, fixture.staff);
    await page.goto("/admin/settings/appointment-types");
    const row = page.getByTestId("appointment-type-row").filter({ hasText: name });
    const inUse = page.getByRole("switch", { name: `${name} in use` });
    await expect(inUse).toBeChecked();

    await inUse.click();
    await expect(page.getByText(`${name} turned off`)).toBeVisible();
    await expect(row).toContainText("Turned off. Booked appointments keep this type.");
    await expect(row).toHaveClass(/is-off/u);
    const catalog = await db.rpc("portal_scheduling_catalog", {
      p_actor_id: actor,
      p_entity: "appointment_type",
      p_query: "",
      p_active: true,
      p_limit: 100,
      p_after_name: null,
      p_after_id: null,
    });
    expect(JSON.stringify(catalog.data)).not.toContain(fixture.typeId);

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("Undone.")).toBeVisible();
    await expect(inUse).toBeChecked();
    await expect(row).not.toHaveClass(/is-off/u);

    // A new type joins the end of the booking order; Space, an arrow and Space move it up one.
    const before = await order();
    const at = before.indexOf(fixture.typeId);
    expect(at).toBe(before.length - 1);
    const grip = page.getByRole("button", { name: `Move ${name}` });
    await grip.focus();
    await page.keyboard.press("Space");
    await expect(grip).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Space");
    await expect(grip).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText(`${name} moved`)).toBeVisible();
    await expect.poll(async () => (await order()).indexOf(fixture.typeId)).toBe(at - 1);
    const rows = page.getByTestId("appointment-type-row");
    await expect(rows.nth(at - 1)).toContainText(name);

    // Undo puts it back, so the shared database keeps its order.
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("Undone.")).toBeVisible();
    await expect.poll(async () => (await order()).indexOf(fixture.typeId)).toBe(at);
    await expect(rows.nth(at)).toContainText(name);
  } finally {
    await fixture.dispose();
  }
});

test("the type editor selects a duration by keyboard and saves it, while Cancel leaves it unchanged", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, `settings-length-${runId}`);
  try {
    await signIn(page, fixture.staff);
    const address = `/admin/settings/appointment-types?type=${fixture.typeId}&field=details`;
    await page.goto(address);
    const dialog = page.getByTestId("type-editor-dialog");
    const length = dialog.getByRole("combobox", { name: "Length", exact: true });
    await expect(length).toBeFocused();
    await length.press("Enter");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toBeHidden();
    await expect(dialog).toBeVisible();
    await expect(length).toBeFocused();
    await length.press("Enter");
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(length).toHaveText("15 min");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect
      .poll(async () => {
        const result = await db
          .from("appointment_types")
          .select("duration_minutes")
          .eq("id", fixture.typeId)
          .single();
        expect(result.error).toBeNull();
        return z.object({ duration_minutes: z.number() }).parse(result.data).duration_minutes;
      })
      .toBe(15);

    await page.goto(address);
    await length.click();
    await page.getByRole("option", { name: "60 min", exact: true }).click();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.goto(address);
    await expect(length).toHaveText("15 min");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  } finally {
    await fixture.dispose();
  }
});

test("an admin types the booking interval, saves it, and Undo puts it back", async ({ page }) => {
  test.setTimeout(90_000);
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, `settings-interval-${runId}`);
  const actor = fixture.staff.userId;
  async function interval() {
    const read = await readSettings(db, actor);
    if (!read.ok) throw new Error("Settings read failed");
    return read.practice.bookingIntervalMinutes;
  }
  try {
    await restoreBookingInterval(db, actor);
    await signIn(page, fixture.staff);
    await page.goto("/admin/settings/appointment-types");
    const clock = page.getByRole("radiogroup", { name: "Appointment start times" });
    await expect(clock.getByRole("radio", { name: "On the hour" })).toBeChecked();

    // A choice saves at once, and the line names the marks.
    await clock.getByRole("radio", { name: "Half hour" }).click();
    await expect(page.getByText("Openings start at :00 and :30")).toBeVisible();
    await expect.poll(interval).toBe(30);
    await expect(
      page.getByText(/Suggest available starts at :00 and :30 \(every 30 minutes\)\./u),
    ).toBeVisible();

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("Undone.")).toBeVisible();
    await expect.poll(interval).toBe(60);
    await expect(clock.getByRole("radio", { name: "On the hour" })).toBeChecked();
  } finally {
    await restoreBookingInterval(db, actor);
    await fixture.dispose();
  }
});

test("an office closes a day, lists the bookings it covers, and reopens it with Undo", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const db = serviceDb();
  const prefix = `settings-closed-${runId}`;
  const fixture = await createSchedulingFixture(db, prefix);
  const office = `TEST ${prefix} First`;
  try {
    const date = schedulingFixtureDate();
    expect(await fixture.save(fixture.booking("10:00"))).toMatchObject({ ok: true });

    await signIn(page, fixture.staff);
    await page.goto("/admin/settings/locations");
    const card = page.getByRole("article", { name: office });
    await expect(card).toBeVisible();
    await expect(card.getByText("None coming up")).toBeVisible();

    await card.getByRole("button", { name: `Add a closed day for ${office}` }).click();
    const popover = page.getByRole("dialog", { name: `${office} closed` });
    await pickDay(popover, date);
    await expect(popover.getByRole("status").filter({ hasText: "booked" })).toHaveText(
      /^1 appointment is booked on this day\. After adding/u,
    );
    await popover.getByRole("textbox", { name: "Note" }).fill("Inventory day");
    await popover.getByRole("button", { name: "Add closed day" }).click();
    await expect(popover).toHaveCount(0);

    const closures = card.getByRole("list", { name: `${office} closed days` });
    await expect(closures.getByRole("button")).toHaveCount(1);
    const displaced = card.getByRole("status").filter({ hasText: "falls on this closed day" });
    await expect(displaced.getByRole("link")).toContainText(`with`);

    await closures.getByRole("button").click();
    await expect(page.getByRole("menu").getByText("Inventory day")).toBeVisible();
    await page.getByRole("menuitem", { name: "Open this day" }).click();
    await expect(card.getByText("None coming up")).toBeVisible();

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("Undone.")).toBeVisible();
    await expect(closures.getByRole("button")).toHaveCount(1);
  } finally {
    await fixture.dispose();
  }
});

test("staff read the Schedule group with no edit controls", async ({ page }) => {
  test.setTimeout(90_000);
  const db = serviceDb();
  const prefix = `settings-staff-${runId}`;
  const fixture = await createSchedulingFixture(db, prefix);
  const staff = await createStaffFixture(db, {
    prefix: `${prefix}-reader`,
    displayName: "TEST Settings Reader",
  });
  try {
    await signIn(page, staff);
    // Settings opens on Staff access for staff.
    await page.goto("/admin/settings");
    await expect(page).toHaveURL(/\/admin\/settings\/staff$/u);

    await page.goto(`/admin/settings/providers?provider=${fixture.providerIds[0]}`);
    await expect(page.getByRole("heading", { name: `TEST ${prefix} First` })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add time off" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Add provider" })).toHaveCount(0);

    await page.goto("/admin/settings/appointment-types");
    const name = `TEST ${prefix} Visit`;
    await expect(page.getByRole("switch", { name: `${name} in use` })).toBeDisabled();
    await expect(page.getByRole("button", { name: `Move ${name}` })).toHaveCount(0);
    await expect(page.getByRole("button", { name: `More for ${name}` })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Add type" })).toHaveCount(0);
    const clock = page.getByRole("radiogroup", { name: "Appointment start times" });
    await clock.getByRole("radio", { name: "Quarter hour" }).click();
    await expect(clock.getByRole("radio", { name: "On the hour" })).toBeChecked();

    await page.goto("/admin/settings/locations");
    const office = `TEST ${prefix} First`;
    await expect(page.getByRole("article", { name: office })).toBeVisible();
    await expect(page.getByRole("link", { name: `Edit ${office}` })).toHaveCount(0);
    await expect(page.getByRole("button", { name: `Add a closed day for ${office}` })).toHaveCount(
      0,
    );
    // An edit address opens nothing for staff.
    await page.goto(`/admin/settings/locations?edit=${fixture.locationIds[0]}`);
    await expect(page.getByTestId("location-editor-dialog")).toHaveCount(0);
  } finally {
    await staff.dispose();
    await fixture.dispose();
  }
});
