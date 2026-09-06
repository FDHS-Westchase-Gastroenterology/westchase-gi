import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import {
  billingCommandOutcomeSchema,
  billingReadOutcomeSchema,
} from "../../src/lib/portal/billing/contracts";
import type { BillingInput } from "../../src/lib/portal/billing/contracts";
import { removeBilling } from "../harness/billing";
import { serviceDb } from "../harness/env";
import { createSchedulingFixture } from "../harness/scheduling";
import { signIn } from "../harness/session";

async function billing(page: Page, input: Readonly<BillingInput>) {
  return page.evaluate(async (body) => {
    const response = await fetch("/api/admin/billing", {
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

test("staff billing API keeps patient balances private, saves a retry once, and requires admin authority for corrections", async ({
  page,
  request,
  baseURL,
}) => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "billing-api");
  const patientId = fixture.patientIds[0];
  try {
    if (baseURL === undefined)
      throw new Error("Billing API verification requires a Preview origin");
    const input = { action: "read", patientId } as const;
    const denied = await request.post("/api/admin/billing", {
      headers: { origin: new URL(baseURL).origin },
      data: input,
    });
    expect(denied.status()).toBe(401);
    await signIn(page, fixture.staff);
    const empty = await billing(page, input);
    expect(empty.status).toBe(200);
    expect(empty.cache).toContain("no-store");
    expect(billingReadOutcomeSchema.parse(JSON.parse(empty.text))).toMatchObject({
      ok: true,
      balanceCents: 0,
      version: 0,
    });
    const charge = {
      action: "command",
      idempotencyKey: randomUUID(),
      command: {
        kind: "charge",
        patientId,
        expectedVersion: 0,
        amountCents: 25000,
        serviceDate: "2026-09-06",
        description: "TEST recorded office charge",
      },
    } as const;
    const first = await billing(page, charge);
    expect(first.status).toBe(200);
    const saved = billingCommandOutcomeSchema.parse(JSON.parse(first.text));
    if (!saved.ok) throw new Error("Billing charge API failed");
    expect(JSON.parse((await billing(page, charge)).text)).toEqual(saved);
    const conflict = await billing(page, {
      ...charge,
      command: { ...charge.command, amountCents: 24000 },
    });
    expect(conflict.status).toBe(409);
    expect(JSON.parse(conflict.text)).toEqual({ ok: false, code: "idempotency_conflict" });
    const crossOrigin = await page.request.post("/api/admin/billing", {
      headers: { origin: "https://other.example.test" },
      data: input,
    });
    expect(crossOrigin.status()).toBe(403);
    expect(
      (
        await db
          .from("staff_profiles")
          .update({ role: "staff" })
          .eq("user_id", fixture.staff.userId)
      ).error,
    ).toBeNull();
    const correction = {
      action: "command",
      idempotencyKey: randomUUID(),
      command: {
        kind: "reverse",
        patientId,
        expectedVersion: 1,
        entryId: saved.entryId,
        description: "TEST correction",
      },
    } as const;
    expect((await billing(page, correction)).status).toBe(403);
    const payment = await billing(page, {
      action: "command",
      idempotencyKey: randomUUID(),
      command: {
        kind: "payment",
        patientId,
        expectedVersion: 1,
        amountCents: 10000,
        method: "cash",
        description: "TEST cash already received",
      },
    });
    expect(payment.status).toBe(200);
    const ledger = await billing(page, input);
    expect(ledger.cache).toContain("no-store");
    const decoded = billingReadOutcomeSchema.parse(JSON.parse(ledger.text));
    if (!decoded.ok) throw new Error("Billing history API failed");
    expect(decoded).toMatchObject({
      patientId,
      balanceCents: 15000,
      version: 2,
      entries: { total: 2 },
    });
    expect(decoded.entries.items.map(({ amountCents }) => amountCents)).toEqual([-10000, 25000]);
    expect(
      (
        await db
          .from("staff_profiles")
          .update({ active: false })
          .eq("user_id", fixture.staff.userId)
      ).error,
    ).toBeNull();
    expect((await billing(page, charge)).status).toBe(401);
    expect((await billing(page, input)).status).toBe(401);
  } finally {
    await removeBilling(db, fixture.patientIds);
    await fixture.dispose();
  }
});
