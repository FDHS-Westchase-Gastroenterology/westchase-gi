import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { runId, serviceDb } from "../harness/env";
import { createHandoffFixture } from "../harness/handoff";
import {
  createSchedulingFixture,
  saveSettings,
  schedulingFixtureDate,
} from "../harness/scheduling";
import { signIn } from "../harness/session";

/* Issue #354: a visit on the Day view moves by dragging, and refuses the
   times it cannot take while the card is still in the air; a cancel from its
   card says what becomes of the request, and Undo puts both back. */

function escaped(text: string) {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
}

function lane(page: Page, name: string) {
  return page.getByRole("group", { name: new RegExp(`^${escaped(name)},`, "u") });
}

/** Moves a pressed card so its top edge sits at `minute` of the practice day in `target`'s lane.
    The card keeps the grab offset, so the pointer travels the same distance the card should. */
async function carry(
  page: Page,
  block: Locator,
  startMinute: number,
  target: Locator,
  minute: number,
) {
  const box = await block.boundingBox();
  const column = await target.boundingBox();
  if (box === null || column === null) throw new Error("The grid is not laid out");
  const perMinute = await page
    .locator(".wgi-dayview-grid")
    .evaluate(
      (grid, height) =>
        height / Number(getComputedStyle(grid).getPropertyValue("--dayview-height")),
      column.height,
    );
  await page.mouse.move(
    column.x + column.width / 2,
    box.y + box.height / 2 + (minute - startMinute) * perMinute,
    { steps: 12 },
  );
}

test("Schedule day drags a visit past a booked time and a provider who doesn't see it, drops it on open time, and Undo puts it back", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const db = serviceDb();
  const prefix = `day-drag-${runId}`;
  const fixture = await createSchedulingFixture(db, prefix);
  const name = (label: string) => `TEST ${prefix} ${label}`;
  try {
    const date = schedulingFixtureDate();
    const [, second] = fixture.providerIds;
    expect((await fixture.save(fixture.booking("10:00", 0, 0))).ok).toBe(true);
    expect((await fixture.save(fixture.booking("11:00", 1, 1))).ok).toBe(true);
    // Second keeps the 11:00 visit but no longer sees the type.
    expect(
      await saveSettings(db, fixture.staff.userId, {
        kind: "set_provider_types",
        id: second,
        expectedVersion: 1,
        typeIds: [],
      }),
    ).toMatchObject({ ok: true });

    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page, fixture.staff);
    await page.goto(`/admin/schedule?view=day&date=${date}`);
    const firstLane = lane(page, name("First"));
    const secondLane = lane(page, name("Second"));
    const block = firstLane.locator("[data-appointment]");
    await expect(block).toHaveAccessibleName(
      new RegExp(`^${escaped(name("First"))}, .*, 10:00 AM to `, "u"),
    );
    const readout = page.locator(".wgi-dayview-readout");
    const target = page.locator(".wgi-dayview-target");

    const box = await block.boundingBox();
    if (box === null) throw new Error("The visit is not laid out");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();

    await carry(page, block, 600, secondLane, 660);
    await expect(readout).toHaveText(`11:00 AM with ${name("Second")} is booked`);
    await expect(target).toHaveAttribute("data-verdict", "booked");

    await carry(page, block, 600, secondLane, 840);
    await expect(readout).toHaveText(
      `${name("Second")} doesn't see ${name("Visit").toLowerCase()}s`,
    );
    await expect(target).toHaveAttribute("data-verdict", "refused");

    await carry(page, block, 600, firstLane, 780);
    await expect(target).toHaveAttribute("data-verdict", "open");
    await expect(readout).toHaveText(`${name("First")} · 1:00 PM`);
    await page.mouse.up();

    await expect(
      page.getByText(`${name("First")} moved to 1:00 PM with ${name("First")}`),
    ).toBeVisible();
    await expect(page.getByText(`Was 10:00 AM with ${name("First")}`)).toBeVisible();
    await expect(block).toHaveAccessibleName(new RegExp(`, 1:00 PM to 1:30 PM, `, "u"));
    await expect(page.locator("[data-popup-open]")).toHaveCount(0);

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("Undone.")).toBeVisible();
    await expect(block).toHaveAccessibleName(new RegExp(`, 10:00 AM to 10:30 AM, `, "u"));
  } finally {
    await fixture.dispose();
  }
});

test("Schedule day cancels a request's visit to Call again, opens its time, and Undo rebooks it", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const db = serviceDb();
  const prefix = `day-cancel-${runId}`;
  const fixture = await createHandoffFixture(db, prefix);
  const patient = `TEST ${prefix} First`;
  try {
    const date = schedulingFixtureDate();
    expect((await fixture.save(fixture.booking("10:00"))).ok).toBe(true);

    await signIn(page, fixture.staff);
    await page.goto(`/admin/schedule?view=day&date=${date}`);
    const firstLane = lane(page, `TEST ${prefix} First`);
    const block = firstLane.locator("[data-appointment]");
    await expect(block).toHaveCount(1);
    await block.click();
    const card = page.locator(".wgi-week-card");
    await card.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Cancel appointment…" }).click();

    await expect(
      card.getByText(`10:00 – 10:30 AM with ${patient} opens for booking again.`),
    ).toBeVisible();
    const reasons = card.getByRole("radiogroup", { name: "Reason" });
    await expect(reasons.getByRole("radio", { checked: true })).toBeFocused();
    const afterwards = card.getByRole("radiogroup", { name: "Afterwards" });
    await expect(afterwards.getByRole("radio", { name: /^Call again on/u })).toBeChecked();
    await card.getByRole("button", { name: "Cancel appointment", exact: true }).click();

    await expect(page.getByText(`${patient}'s appointment is cancelled`)).toBeVisible();
    await expect(page.getByText(/^Back on Home as Call again, /u)).toBeVisible();
    await expect(block).toHaveCount(0);
    await expect(firstLane.getByRole("button", { name: /^Open, 10:00 AM, /u })).toBeVisible();

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("Undone.")).toBeVisible();
    await expect(block).toHaveCount(1);
    await expect(block).toHaveAccessibleName(
      new RegExp(`^${escaped(patient)}, .*, 10:00 AM to `, "u"),
    );
  } finally {
    await fixture.dispose();
  }
});
