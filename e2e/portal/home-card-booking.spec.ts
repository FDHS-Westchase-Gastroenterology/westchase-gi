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

function clockTime(label: string): string {
  const match = /^(\d+):(\d+)\s*(AM|PM)$/u.exec(label.trim());
  if (match === null) throw new Error(`Unexpected start label ${label}`);
  const hour = (Number(match[1]) % 12) + (match[3] === "PM" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

test("Home Book recovers a start taken before it lands and books the nearest one", async ({
  page,
}) => {
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
    await dayButton.hover();
    const popover = page.locator(".wgi-day-popover");
    const starts = popover.getByRole("list", {
      name: `TEST ${prefix} First, TEST ${prefix} First`,
    });
    const tile = starts.getByRole("button").first();
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
