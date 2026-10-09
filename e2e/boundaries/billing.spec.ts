import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { expectDenied } from "../harness/assert";
import { readBilling, removeBilling, saveBilling } from "../harness/billing";
import { publishableDb, serviceDb } from "../harness/env";
import { savePatient } from "../harness/patients";
import { createSchedulingFixture } from "../harness/scheduling";

test("patient billing is optional, saves retries once, and bounds competing refunds with permanent corrections", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "billing-ledger");
  const patientId = fixture.patientIds[0];
  const actor = fixture.staff.userId;
  try {
    expect(await readBilling(db, actor, patientId)).toEqual({
      ok: true,
      patientId,
      currency: "USD",
      balanceCents: 0,
      version: 0,
      entries: { total: 0, items: [], nextVersion: null },
    });
    expect(await fixture.save(fixture.booking())).toMatchObject({ ok: true });
    const empty = await db
      .from("patient_billing_accounts")
      .select("patient_id")
      .eq("patient_id", patientId);
    expect(empty.error).toBeNull();
    expect(empty.data).toHaveLength(0);
    const charge = {
      kind: "charge",
      patientId,
      expectedVersion: 0,
      description: "TEST office visit",
      amountCents: 10000,
      serviceDate: "2026-09-06",
    } as const;
    const key = randomUUID();
    const attempts = await Promise.all([
      saveBilling(db, actor, charge, key),
      saveBilling(db, actor, charge, key),
    ]);
    expect(attempts[0]).toMatchObject({ ok: true, version: 1 });
    expect(attempts[1]).toEqual(attempts[0]);
    expect(await saveBilling(db, actor, { ...charge, amountCents: 9000 }, key)).toEqual({
      ok: false,
      code: "idempotency_conflict",
    });
    const payment = await saveBilling(db, actor, {
      kind: "payment",
      patientId,
      expectedVersion: 1,
      description: "TEST payment already received",
      amountCents: 4000,
      method: "card",
    });
    if (!payment.ok) throw new Error("Billing payment fixture failed");
    const refund = {
      kind: "refund",
      patientId,
      expectedVersion: 2,
      description: "TEST partial refund",
      paymentId: payment.entryId,
      amountCents: 3000,
    } as const;
    const competing = await Promise.all([
      saveBilling(db, actor, refund),
      saveBilling(db, actor, refund),
    ]);
    const winningRefund = competing.find((result) => result.ok);
    if (winningRefund === undefined) throw new Error("One refund must be recorded");
    expect(competing.filter((result) => result.ok)).toHaveLength(1);
    expect(competing.find((result) => !result.ok)).toEqual({
      ok: false,
      code: "stale_version",
      currentVersion: 3,
    });
    expect(await saveBilling(db, actor, { ...refund, expectedVersion: 3 })).toEqual({
      ok: false,
      code: "refund_exceeds_payment",
    });
    const reverse = {
      kind: "reverse",
      patientId,
      expectedVersion: 3,
      entryId: payment.entryId,
      description: "TEST correct recorded transaction",
    } as const;
    expect(await saveBilling(db, actor, reverse)).toEqual({
      ok: false,
      code: "payment_has_refunds",
    });
    const correction = await saveBilling(db, actor, { ...reverse, entryId: winningRefund.entryId });
    if (!correction.ok) throw new Error("Refund correction failed");
    expect(await saveBilling(db, actor, { ...reverse, expectedVersion: 4 })).toMatchObject({
      ok: true,
      version: 5,
    });
    const ledger = await readBilling(db, actor, patientId);
    if (!ledger.ok) throw new Error("Billing history read failed");
    expect(ledger.balanceCents).toBe(10000);
    expect(ledger.entries.total).toBe(5);
    expect(ledger.entries.items.reduce((sum, entry) => sum + entry.amountCents, 0)).toBe(10000);
    expect(ledger.entries.items.find(({ id }) => id === winningRefund.entryId)?.reversedBy).toBe(
      correction.entryId,
    );
    const receipts = await db
      .from("patient_billing_receipts")
      .select("entry_id")
      .eq("patient_id", patientId);
    expect(receipts.error).toBeNull();
    expect(receipts.data).toHaveLength(5);
  } finally {
    await removeBilling(db, fixture.patientIds);
    await fixture.dispose();
  }
});

test("billing enforces patient ownership and current staff authority at the database boundary", async () => {
  const db = serviceDb();
  const browser = publishableDb();
  const fixture = await createSchedulingFixture(db, "billing-boundary");
  const patientId = fixture.patientIds[0];
  const actor = fixture.staff.userId;
  try {
    for (const table of [
      "patient_billing_accounts",
      "patient_billing_entries",
      "patient_billing_receipts",
    ]) {
      expectDenied(await browser.from(table).select("*"));
    }
    expectDenied(
      await browser.rpc("portal_read_patient_billing", {
        p_actor_id: actor,
        p_patient_id: patientId,
      }),
    );
    expect((await browser.auth.signInWithPassword(fixture.staff)).error).toBeNull();
    expectDenied(await browser.from("patient_billing_entries").select("*"));
    expectDenied(
      await browser.rpc("portal_execute_billing_command", {
        p_actor_id: actor,
        p_idempotency_key: randomUUID(),
        p_fingerprint: "a".repeat(64),
        p_command: {},
      }),
    );
    const appointment = await fixture.save(fixture.booking());
    if (!appointment.ok) throw new Error("Billing appointment fixture failed");
    const charge = {
      kind: "charge",
      patientId: fixture.patientIds[1],
      expectedVersion: 0,
      description: "TEST unrelated patient charge",
      amountCents: 10000,
      serviceDate: "2026-09-06",
      appointmentId: appointment.id,
    } as const;
    expect(await saveBilling(db, actor, charge)).toEqual({
      ok: false,
      code: "appointment_patient_mismatch",
    });
    const saved = await saveBilling(db, actor, { ...charge, patientId });
    if (!saved.ok) throw new Error("Correct patient charge failed");
    expect(
      (
        await db
          .from("patient_billing_entries")
          .update({ patient_id: fixture.patientIds[1] })
          .eq("id", saved.entryId)
      ).error?.code,
    ).toBe("42501");
    expect(
      (await db.from("patient_billing_entries").delete().eq("id", saved.entryId)).error?.code,
    ).toBe("42501");
    const adjustment = {
      kind: "adjustment",
      patientId,
      expectedVersion: 1,
      description: "TEST credit",
      amountCents: -1000,
    } as const;
    const key = randomUUID();
    expect(await saveBilling(db, actor, adjustment, key)).toMatchObject({ ok: true, version: 2 });
    expect(
      (await db.from("staff_profiles").update({ role: "staff" }).eq("user_id", actor)).error,
    ).toBeNull();
    expect(await saveBilling(db, actor, adjustment, key)).toEqual({ ok: false, code: "forbidden" });
    expect(await saveBilling(db, actor, { ...adjustment, expectedVersion: 2 })).toEqual({
      ok: false,
      code: "forbidden",
    });
    expect(
      (await db.from("staff_profiles").update({ role: "admin" }).eq("user_id", actor)).error,
    ).toBeNull();
    expect(
      await savePatient(db, actor, {
        kind: "set_archived",
        patientId,
        expectedVersion: 1,
        archived: true,
      }),
    ).toMatchObject({ ok: true });
    expect(
      await saveBilling(db, actor, {
        kind: "payment",
        patientId,
        expectedVersion: 2,
        description: "TEST settle balance",
        amountCents: 9000,
        method: "cash",
      }),
    ).toMatchObject({ ok: true, version: 3 });
    expect(await readBilling(db, actor, patientId)).toMatchObject({ ok: true, balanceCents: 0 });
    expect(
      (await db.from("staff_profiles").update({ active: false }).eq("user_id", actor)).error,
    ).toBeNull();
    expect(await saveBilling(db, actor, adjustment, key)).toEqual({
      ok: false,
      code: "unauthorized",
    });
    expect(await readBilling(db, actor, patientId)).toEqual({ ok: false, code: "unauthorized" });
  } finally {
    await browser.auth.signOut();
    await removeBilling(db, fixture.patientIds);
    await fixture.dispose();
  }
});

test("billing history pages every recorded entry without changing patient or appointment versions", async () => {
  test.setTimeout(60_000);
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "billing-history");
  const patientId = fixture.patientIds[0];
  const actor = fixture.staff.userId;
  try {
    const appointment = await fixture.save(fixture.booking());
    if (!appointment.ok) throw new Error("Billing appointment fixture failed");
    for (let expectedVersion = 0; expectedVersion < 123; expectedVersion += 1) {
      expect(
        await saveBilling(db, actor, {
          kind: "adjustment",
          patientId,
          expectedVersion,
          description: "TEST ledger history",
          amountCents: 1,
        }),
      ).toMatchObject({ ok: true, version: expectedVersion + 1 });
    }
    const first = await readBilling(db, actor, patientId);
    if (!first.ok) throw new Error("First billing page failed");
    const second = await readBilling(db, actor, patientId, first.entries.nextVersion);
    if (!second.ok) throw new Error("Second billing page failed");
    expect(first).toMatchObject({ balanceCents: 123, version: 123, entries: { total: 123 } });
    expect(first.entries.items).toHaveLength(100);
    expect(second.entries.items).toHaveLength(23);
    expect(second.entries.nextVersion).toBeNull();
    expect(
      new Set([...first.entries.items, ...second.entries.items].map(({ id }) => id)).size,
    ).toBe(123);
    for (const [table, id] of [
      ["patients", patientId],
      ["appointments", appointment.id],
    ]) {
      const row = await db.from(table).select("version").eq("id", id).single();
      expect(row.error).toBeNull();
      expect(row.data?.version).toBe(1);
    }
    const audit = await db
      .from("audit_log")
      .select("detail")
      .eq("entity", "patient_billing")
      .eq("entity_id", patientId);
    expect(audit.error).toBeNull();
    expect(audit.data).toHaveLength(123);
    expect(JSON.stringify(audit.data)).not.toMatch(
      /amountCents|amount_cents|description|TEST ledger/,
    );
  } finally {
    await removeBilling(db, fixture.patientIds);
    await fixture.dispose();
  }
});
