import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { schedulingCommandOutcomeSchema } from "../../src/lib/portal/scheduling/contracts";
import type { SchedulingInput } from "../../src/lib/portal/scheduling/contracts";
import {
  appointmentAvailabilityOutcomeSchema,
  appointmentListOutcomeSchema,
  appointmentReadOutcomeSchema,
} from "../../src/lib/portal/scheduling/read-contracts";
import { serviceDb } from "../harness/env";
import { createSchedulingFixture, schedulingFixtureDate } from "../harness/scheduling";
import { signIn } from "../harness/session";

async function scheduling(page: Page, input: Readonly<SchedulingInput>) {
  return page.evaluate(async (body) => {
    const response = await fetch("/api/admin/scheduling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return {
      status: response.status,
      cache: response.headers.get("cache-control"),
      text: await response.text(),
    };
  }, JSON.stringify(input));
}

test("staff scheduling API saves once, returns complete private history, and refuses unsafe edits", async ({
  page,
  request,
  baseURL,
}) => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "schedule-api");
  try {
    if (baseURL === undefined)
      throw new Error("Scheduling API verification requires a Preview origin");
    const denied = await request.post("/api/admin/scheduling", {
      headers: { origin: new URL(baseURL).origin },
      data: { action: "catalog", entity: "provider" },
    });
    expect(denied.status()).toBe(401);
    await signIn(page, fixture.staff);
    const booking = fixture.booking();
    const availability = await scheduling(page, {
      action: "availability",
      providerId: fixture.providerIds[0],
      locationId: fixture.locationIds[0],
      date: schedulingFixtureDate(),
      appointmentTypeId: fixture.typeId,
      patientId: fixture.patientIds[0],
    });
    expect(availability.status).toBe(200);
    const choices = appointmentAvailabilityOutcomeSchema.parse(JSON.parse(availability.text));
    if (!choices.ok) throw new Error("Availability API read failed");
    expect(choices.slots.some(({ time }) => time === "10:00")).toBe(true);
    const first = await scheduling(page, booking);
    expect(first.status).toBe(200);
    expect(first.cache).toContain("no-store");
    const created = schedulingCommandOutcomeSchema.parse(JSON.parse(first.text));
    if (!created.ok) throw new Error("Scheduling API booking failed");
    expect(JSON.parse((await scheduling(page, booking)).text)).toEqual(created);
    const conflict = await scheduling(page, fixture.booking("10:00", 1));
    expect(conflict.status).toBe(409);
    expect(JSON.parse(conflict.text)).toEqual({ ok: false, code: "provider_conflict" });
    const read = await scheduling(page, { action: "read_appointment", id: created.id });
    expect(read.status).toBe(200);
    expect(read.cache).toContain("no-store");
    expect(appointmentReadOutcomeSchema.parse(JSON.parse(read.text))).toMatchObject({
      ok: true,
      appointment: { id: created.id, patientId: fixture.patientIds[0], durationMinutes: 30 },
      history: { total: 1 },
    });
    const list = await scheduling(page, {
      action: "appointments",
      patientId: fixture.patientIds[0],
    });
    expect(appointmentListOutcomeSchema.parse(JSON.parse(list.text))).toMatchObject({
      ok: true,
      total: 1,
      items: [{ id: created.id }],
    });
    const crossOrigin = await page.request.post("/api/admin/scheduling", {
      headers: { origin: "https://other.example.test" },
      data: booking,
    });
    expect(crossOrigin.status()).toBe(403);
    const cancellation = await scheduling(page, {
      action: "command",
      idempotencyKey: randomUUID(),
      command: {
        kind: "cancel",
        id: created.id,
        expectedVersion: 1,
        reason: "TEST API cancellation",
      },
    });
    expect(cancellation.status).toBe(200);
    expect(schedulingCommandOutcomeSchema.parse(JSON.parse(cancellation.text))).toMatchObject({
      ok: true,
      version: 2,
    });
    const undo = await scheduling(page, {
      action: "command",
      idempotencyKey: randomUUID(),
      command: { kind: "undo", id: created.id, expectedVersion: 2 },
    });
    expect(undo.status).toBe(200);
    const downgraded = await db
      .from("staff_profiles")
      .update({ role: "staff" })
      .eq("user_id", fixture.staff.userId);
    expect(downgraded.error).toBeNull();
    expect(
      (
        await scheduling(page, {
          action: "configure",
          idempotencyKey: randomUUID(),
          command: { kind: "save_location", name: "TEST Forbidden API" },
        })
      ).status,
    ).toBe(403);
    const deactivated = await db
      .from("staff_profiles")
      .update({ active: false })
      .eq("user_id", fixture.staff.userId);
    expect(deactivated.error).toBeNull();
    expect((await scheduling(page, booking)).status).toBe(401);
    expect((await scheduling(page, { action: "read_appointment", id: created.id })).status).toBe(
      401,
    );
  } finally {
    await fixture.dispose();
  }
});
