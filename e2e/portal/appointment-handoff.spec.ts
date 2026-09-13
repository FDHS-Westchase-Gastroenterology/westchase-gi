import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { schedulingCommandOutcomeSchema } from "../../src/lib/portal/scheduling/contracts";
import type { SchedulingInput } from "../../src/lib/portal/scheduling/contracts";
import { appointmentReadOutcomeSchema } from "../../src/lib/portal/scheduling/read-contracts";
import { serviceDb } from "../harness/env";
import { createHandoffFixture, readHandoffRequest } from "../harness/handoff";
import { schedulingFixtureDate } from "../harness/scheduling";
import { signIn } from "../harness/session";

async function save(page: Page, input: Readonly<SchedulingInput>) {
  const response = await page.evaluate(async (body) => {
    const result = await fetch("/api/admin/scheduling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return {
      status: result.status,
      cache: result.headers.get("cache-control"),
      text: await result.text(),
    };
  }, JSON.stringify(input));
  return { ...response, result: schedulingCommandOutcomeSchema.parse(JSON.parse(response.text)) };
}

test("staff cookies book, reschedule, cancel, and undo a request and appointment as one private save", async ({
  page,
}) => {
  const db = serviceDb();
  const fixture = await createHandoffFixture(db, "handoff-api");
  try {
    await signIn(page, fixture.staff);
    const booked = await save(page, fixture.booking());
    expect(booked.status).toBe(200);
    expect(booked.cache).toContain("no-store");
    if (!booked.result.ok) throw new Error("Booking API failed");
    const id = booked.result.id;
    expect(booked.result.request).toMatchObject({
      id: fixture.requestId,
      state: "booked",
      version: 2,
    });
    const stale = await save(page, {
      action: "command",
      idempotencyKey: randomUUID(),
      command: {
        kind: "reschedule",
        id,
        expectedVersion: 1,
        requestVersion: 1,
        providerId: fixture.providerIds[0],
        locationId: fixture.locationIds[0],
        start: { date: schedulingFixtureDate(), time: "11:00" },
      },
    });
    expect(stale.status).toBe(409);
    expect(stale.result).toEqual({ ok: false, code: "request_stale_version", currentVersion: 2 });
    const moved = await save(page, {
      action: "command",
      idempotencyKey: randomUUID(),
      command: {
        kind: "reschedule",
        id,
        expectedVersion: 1,
        requestVersion: 2,
        providerId: fixture.providerIds[0],
        locationId: fixture.locationIds[0],
        start: { date: schedulingFixtureDate(), time: "11:00" },
      },
    });
    expect(moved.status).toBe(200);
    expect(moved.result).toMatchObject({ ok: true, version: 2, request: { version: 3 } });
    const cancelled = await save(page, {
      action: "command",
      idempotencyKey: randomUUID(),
      command: {
        kind: "cancel",
        id,
        expectedVersion: 2,
        requestVersion: 3,
        reason: "TEST API cancellation",
        callAgainOn: schedulingFixtureDate(1),
      },
    });
    expect(cancelled.status).toBe(200);
    expect(cancelled.result).toMatchObject({
      ok: true,
      version: 3,
      request: { state: "contacted", version: 4, appointmentAt: null },
    });
    const detail = await page.evaluate(async (appointmentId) => {
      const response = await fetch("/api/admin/scheduling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read_appointment", id: appointmentId }),
      });
      return response.text();
    }, id);
    const current = appointmentReadOutcomeSchema.parse(JSON.parse(detail));
    expect(current).toMatchObject({
      ok: true,
      appointment: { requestWorkflowManaged: true },
      request: { id: fixture.requestId, version: 4, state: "contacted" },
    });
    if (!current.ok) throw new Error("Appointment detail failed");
    expect(current.history.items[0].requestChange).toMatchObject({
      requestId: fixture.requestId,
      afterVersion: 4,
      before: { state: "booked" },
    });
    expect(await readHandoffRequest(db, fixture.requestId)).toMatchObject({
      status: "contacted",
      version: 4,
      appointment_at: null,
    });
    const undo = {
      action: "command",
      idempotencyKey: randomUUID(),
      command: { kind: "undo", id, expectedVersion: 3, requestVersion: 4 },
    } as const;
    const restored = await save(page, undo);
    expect(restored.status).toBe(200);
    expect(restored.result).toMatchObject({
      ok: true,
      version: 4,
      request: { state: "booked", version: 5 },
    });
    expect((await save(page, undo)).result).toEqual(restored.result);
    expect(await readHandoffRequest(db, fixture.requestId)).toMatchObject({
      status: "booked",
      version: 5,
      follow_up_at: null,
    });
  } finally {
    await fixture.dispose();
  }
});
