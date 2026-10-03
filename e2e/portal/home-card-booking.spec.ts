import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { z } from "zod";

import { runId, serviceDb } from "../harness/env";
import { savePatient } from "../harness/patients";
import { createSchedulingFixture } from "../harness/scheduling";
import { signIn } from "../harness/session";

/* Issue #344: a start somebody else books between the month read and Book
   stays on the card. The day's popover comes back with the start struck
   and the nearest open one offered, and that one books. */

const PRACTICE_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });
const LONG_DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

type Box = Readonly<{ x: number; y: number; width: number; height: number }>;

function inBox(point: readonly [number, number], box: Box): boolean {
  return (
    point[0] >= box.x &&
    point[0] <= box.x + box.width &&
    point[1] >= box.y &&
    point[1] <= box.y + box.height
  );
}

function clockTime(label: string): string {
  const match = /^(\d+):(\d+)\s*(AM|PM)$/u.exec(label.trim());
  if (match === null) throw new Error(`Unexpected start label ${label}`);
  const hour = (Number(match[1]) % 12) + (match[3] === "PM" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

test("Home Book recovers a start taken before it lands and books the nearest one", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const db = serviceDb();
  const prefix = `card-book-${runId}`;
  const fixture = await createSchedulingFixture(db, prefix);
  const requestId = randomUUID();
  const name = `TEST Card booking ${runId}`;
  try {
    const office = await db
      .from("scheduling_locations")
      .update({ request_location: "tampa" })
      .eq("id", fixture.locationIds[0]);
    expect(office.error).toBeNull();
    const staged = await db.from("requests").insert({
      id: requestId,
      name,
      phone: "8135550198",
      /* The global sweep removes a request a cancelled run leaves behind. */
      email: `card-book-${runId}@example.test`,
      location: "tampa",
      preferred_time: "morning",
      locale: "en",
      source_path: `/e2e/card-booking/${runId}`,
    });
    expect(staged.error).toBeNull();
    const patient = await db
      .from("patients")
      .select("version")
      .eq("id", fixture.patientIds[0])
      .single();
    expect(patient.error).toBeNull();
    expect(
      await savePatient(db, fixture.staff.userId, {
        kind: "link_request",
        patientId: fixture.patientIds[0],
        expectedVersion: z.object({ version: z.number() }).parse(patient.data).version,
        requestId,
      }),
    ).toMatchObject({ ok: true });

    await signIn(page, fixture.staff);
    await page.goto("/admin?status=any");
    await page.getByRole("button", { name: `Open request for ${name}`, exact: true }).click();
    const card = page.locator(".wgi-record-card");
    await card.getByRole("radio", { name: "Appointment scheduled" }).click();
    await card.getByLabel("Visit type").selectOption(fixture.typeId);

    const today = PRACTICE_DAY.format(new Date());
    const day = PRACTICE_DAY.format(new Date(Date.now() + 2 * 86_400_000));
    if (day.slice(0, 7) !== today.slice(0, 7))
      await card.getByRole("button", { name: /next month/iu }).click();
    /* The day's name carries its open count once the month has been read. */
    const dayButton = card.getByRole("button", {
      name: new RegExp(`^${LONG_DAY.format(new Date(`${day}T12:00:00Z`))}, \\d+ open times?$`, "u"),
    });
    await expect(dayButton).toBeVisible();
    const popover = page.locator(".wgi-day-popover");
    /* A pointer resting on a day opens it; the card may still be settling
       under the pointer, so rest on it again until the popover is up. */
    await expect(async () => {
      await page.mouse.move(0, 0);
      await dayButton.hover();
      await expect(popover).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    const starts = popover.getByRole("group", {
      name: `TEST ${prefix} First, TEST ${prefix} First`,
    });
    const tile = starts.getByRole("button").first();
    await expect(tile).toBeVisible();
    const title = popover.getByRole("heading", {
      name: LONG_DAY.format(new Date(`${day}T12:00:00Z`)),
    });
    await expect(title).toBeVisible();

    /* A pointer resting on another open day moves the popover there, and
       resting on the first day again brings it back (issue #360). */
    const openDays = card.getByRole("button", { name: /, \d+ open times?$/u });
    const otherName = await openDays.evaluateAll(
      (buttons, first) =>
        buttons
          .map((button) => button.getAttribute("aria-label") ?? "")
          .find((name) => !name.startsWith(first)),
      LONG_DAY.format(new Date(`${day}T12:00:00Z`)),
    );
    if (otherName === undefined) throw new Error("The month offers only one open day");
    const otherTitle = popover.getByRole("heading", {
      name: otherName.replace(/, \d+ open times?$/u, ""),
    });
    await card.getByRole("button", { name: otherName, exact: true }).hover();
    await expect(otherTitle).toBeVisible();
    await expect(title).toHaveCount(0);
    await dayButton.hover();
    await expect(title).toBeVisible();

    /* The way from the day to its popover crosses other days; they do not
       take the popover on the way, as a menu aims at its submenu. */
    const from = await dayButton.boundingBox();
    const to = await tile.boundingBox();
    if (from === null || to === null) throw new Error("The day or its first start has no box");
    const start = [from.x + from.width / 2, from.y + from.height / 2] as const;
    const end = [to.x + to.width / 2, to.y + to.height / 2] as const;
    /* The path does cross another day, or the check below proves nothing. */
    const triggers = await card.locator('button[id*="-day-"]').evaluateAll((buttons) =>
      buttons.map((button) => {
        const rect = button.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }),
    );
    const path = Array.from({ length: 21 }, (_, step) => {
      const t = step / 20;
      return [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t] as const;
    });
    const crossed = triggers.filter(
      (box) => !inBox(start, box) && path.some((point) => inBox(point, box)),
    );
    expect(crossed.length).toBeGreaterThan(0);
    await page.mouse.move(...start);
    await page.mouse.move(...end, { steps: 20 });
    await expect(title).toBeVisible();
    const label = (await tile.textContent()) ?? "";
    await tile.click();

    /* Somebody else takes that start with the same provider and office. */
    const taken = await fixture.save({
      action: "command",
      idempotencyKey: randomUUID(),
      command: {
        kind: "book",
        patientId: fixture.patientIds[1],
        providerId: fixture.providerIds[0],
        locationId: fixture.locationIds[0],
        appointmentTypeId: fixture.typeId,
        expectedTypeVersion: 1,
        start: { date: day, time: clockTime(label) },
      },
    });
    expect(taken.ok).toBe(true);

    await card.getByRole("button", { name: "Book", exact: true }).click();
    await expect(popover.getByText("Booked a moment ago.")).toBeVisible();
    await expect(
      starts.getByRole("button", { name: `${label.trim()}, booked a moment ago` }),
    ).toBeDisabled();
    await expect(page.getByText("This view could not load")).toHaveCount(0);

    await popover.getByRole("button", { name: /^Use / }).click();
    await card.getByRole("button", { name: "Book", exact: true }).click();
    await expect(page.getByTestId("home-book-toast")).toContainText(`${name} is Scheduled.`);
    const booked = await db
      .from("appointments")
      .select("provider_id,status")
      .eq("patient_id", fixture.patientIds[0]);
    expect(booked.error).toBeNull();
    expect(booked.data).toEqual([{ provider_id: fixture.providerIds[0], status: "scheduled" }]);
  } finally {
    expect(
      (await db.from("appointments").delete().eq("created_by", fixture.staff.userId)).error,
    ).toBeNull();
    expect((await db.from("requests").delete().eq("id", requestId)).error).toBeNull();
    await fixture.dispose();
  }
});
