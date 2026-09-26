import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { serviceDb } from "../harness/env";
import { signIn } from "../harness/session";

test("time selection supports clicks and typing while Done and Escape keep request changes local", async ({
  page,
}) => {
  const db = serviceDb();
  const id = randomUUID();
  const name = `TEST Time picker ${id}`;
  const staged = await db.from("requests").insert({
    id,
    name,
    phone: "8135550199",
    location: "tampa",
    preferred_time: "morning",
    locale: "en",
    source_path: "/e2e/time-picker",
    status: "new",
  });
  expect(staged.error).toBeNull();
  try {
    await signIn(page);
    await page.getByRole("button", { name: `Open request for ${name}`, exact: true }).click();
    await page.getByRole("radio", { name: "Appointment scheduled", exact: true }).click();
    await page.locator(".wgi-record-cal button[data-day]:enabled").last().click();
    const trigger = page.locator(".wgi-time-trigger");
    await trigger.press("Enter");
    const picker = page.getByRole("dialog", { name: "Choose a start time", exact: true });
    const hour = picker.getByRole("listbox", { name: "Hour", exact: true });
    const minute = picker.getByRole("listbox", { name: "Minute", exact: true });
    const period = picker.getByRole("listbox", { name: "AM or PM", exact: true });
    const input = picker.getByLabel("Selected time", { exact: true });
    const done = picker.getByRole("button", { name: "Done", exact: true });

    // Real pointer clicks must select rows, even though the wheel captures drags.
    await hour.getByRole("option", { name: "10", exact: true }).click();
    await expect(hour.getByRole("option", { name: "10", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await minute.getByRole("option", { name: "01", exact: true }).click();
    await period.getByRole("option", { name: "PM", exact: true }).click();
    await expect(input).toHaveValue("22:01");
    await expect(trigger).toHaveText("Choose");

    // Text entry drives the wheels too; noon must not become midnight.
    await input.fill("12:05");
    await expect(hour.getByRole("option", { name: "12", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(minute.getByRole("option", { name: "05", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await done.click();
    await expect(trigger).toHaveText("12:05 PM");
    await expect(trigger).toBeFocused();
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();

    await trigger.press("Enter");
    await input.fill("23:59");
    await input.press("Escape");
    await expect(picker).toBeHidden();
    await expect(trigger).toHaveText("12:05 PM");
    await expect(trigger).toBeFocused();

    // Incomplete entry cannot replace a valid card time. A wheel can recover it.
    await trigger.press("Enter");
    await input.fill("");
    await expect(done).toBeDisabled();
    await input.press("Enter");
    await expect(picker).toBeVisible();
    await hour.press("Home");
    await expect(input).toHaveValue("00:00");
    await input.press("Enter");
    await expect(trigger).toHaveText("12:00 AM");

    // Drag capture still works, including releasing outside the pressed row.
    await trigger.press("Enter");
    await input.fill("09:00");
    const row = await hour.getByRole("option", { name: "9", exact: true }).boundingBox();
    if (row === null) throw new Error("The selected hour must be visible");
    const x = row.x + row.width / 2;
    const y = row.y + row.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + row.height * 2, { steps: 8 });
    // A held release has no flick momentum; this pause is part of the gesture.
    await page.waitForTimeout(200);
    await page.mouse.up();
    await expect(input).toHaveValue("07:00");
    await hour.getByRole("option", { name: "9", exact: true }).click();
    await expect(input).toHaveValue("09:00");

    // Keyboard and scroll remain usable after direct entry.
    await input.fill("09:00");
    await hour.press("ArrowDown");
    await expect(input).toHaveValue("10:00");
    await minute.hover();
    await page.mouse.wheel(0, 64);
    await expect(input).not.toHaveValue("10:00");
    await picker.press("Escape");
    await expect(trigger).toHaveText("12:00 AM");

    const current = await db
      .from("requests")
      .select("status,version,appointment_at")
      .eq("id", id)
      .single();
    expect(current.error).toBeNull();
    expect(current.data).toEqual({ status: "new", version: 1, appointment_at: null });
  } finally {
    expect((await db.from("requests").delete().eq("id", id)).error).toBeNull();
  }
});
