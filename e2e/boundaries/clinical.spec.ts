import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { listClinical, readClinical, removeClinical, saveClinical } from "../harness/clinical";
import { serviceDb } from "../harness/env";
import { createSchedulingFixture } from "../harness/scheduling";

test("optional clinical notes preserve patient ownership, signed content, and permanent corrections", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "clinical-records");
  const actor = fixture.staff.userId;
  const patientId = fixture.patientIds[0];
  try {
    const appointment = await fixture.save(fixture.booking());
    if (!appointment.ok) throw new Error("Clinical appointment fixture failed");
    expect(await listClinical(db, actor, { action: "list", patientId })).toMatchObject({
      ok: true,
      total: 0,
      records: [],
      canSign: false,
    });
    const content = {
      kind: "note",
      title: "TEST office note",
      noteText: "TEST draft text",
    } as const;
    expect(
      await saveClinical(db, actor, {
        kind: "create",
        patientId: fixture.patientIds[1],
        appointmentId: appointment.id,
        content,
      }),
    ).toEqual({ ok: false, code: "appointment_patient_mismatch" });
    const command = { kind: "create", patientId, appointmentId: appointment.id, content } as const;
    const key = randomUUID();
    const created = await saveClinical(db, actor, command, key);
    if (!created.ok || created.entity !== "record")
      throw new Error("Clinical draft fixture failed");
    expect(await saveClinical(db, actor, command, key)).toEqual(created);
    expect(
      await saveClinical(
        db,
        actor,
        { ...command, content: { ...content, noteText: "TEST changed intent" } },
        key,
      ),
    ).toEqual({ ok: false, code: "idempotency_conflict" });
    expect(
      await saveClinical(db, actor, { kind: "sign", recordId: created.id, expectedVersion: 1 }),
    ).toEqual({ ok: false, code: "signing_not_enabled" });
    expect(
      await saveClinical(db, actor, {
        kind: "set_signer",
        userId: actor,
        expectedVersion: 0,
        enabled: true,
      }),
    ).toMatchObject({ ok: true });
    expect(
      await saveClinical(db, actor, {
        kind: "update_draft",
        recordId: created.id,
        expectedVersion: 1,
        content: { ...content, noteText: "TEST final text" },
      }),
    ).toMatchObject({ ok: true, version: 2 });
    expect(
      await saveClinical(db, actor, { kind: "sign", recordId: created.id, expectedVersion: 2 }),
    ).toMatchObject({ ok: true, version: 3 });
    expect(
      await saveClinical(db, actor, {
        kind: "update_draft",
        recordId: created.id,
        expectedVersion: 3,
        content,
      }),
    ).toEqual({ ok: false, code: "record_not_draft" });
    expect(
      (
        await db
          .from("patient_clinical_records")
          .update({ note_text: "TEST overwrite", version: 4 })
          .eq("id", created.id)
      ).error?.code,
    ).toBe("23514");
    expect(
      (
        await db
          .from("patient_clinical_records")
          .update({ patient_id: fixture.patientIds[1], version: 4 })
          .eq("id", created.id)
      ).error?.code,
    ).toBe("23514");
    const amendment = await saveClinical(db, actor, {
      kind: "amend",
      recordId: created.id,
      expectedVersion: 3,
      content: { ...content, noteText: "TEST correction" },
    });
    if (!amendment.ok || amendment.entity !== "record")
      throw new Error("Clinical amendment fixture failed");
    expect(
      await saveClinical(db, actor, {
        kind: "amend",
        recordId: created.id,
        expectedVersion: 3,
        content,
      }),
    ).toEqual({ ok: false, code: "amendment_exists" });
    expect(
      await saveClinical(db, actor, { kind: "sign", recordId: amendment.id, expectedVersion: 1 }),
    ).toMatchObject({ ok: true, version: 2 });
    expect(
      await saveClinical(db, actor, {
        kind: "enter_in_error",
        recordId: amendment.id,
        expectedVersion: 2,
        reason: "TEST correction entered against the wrong note",
      }),
    ).toMatchObject({ ok: true, version: 3 });
    const original = await readClinical(db, actor, created.id);
    const corrected = await readClinical(db, actor, amendment.id);
    if (!original.ok || !corrected.ok) throw new Error("Clinical history read failed");
    expect(original.record).toMatchObject({
      patientId,
      appointmentId: appointment.id,
      status: "signed",
      noteText: "TEST final text",
      version: 3,
      signature: { id: actor, email: fixture.staff.email },
    });
    expect(original.history.items.map((row) => row.command)).toEqual([
      "sign",
      "update_draft",
      "create",
    ]);
    expect(corrected.record).toMatchObject({
      status: "entered_in_error",
      noteText: "TEST correction",
      amendsId: created.id,
      amendsVersion: 3,
      signature: { id: actor },
    });
    expect(corrected.history.items[0].before?.status).toBe("signed");
    expect(corrected.history.items[0].after.status).toBe("entered_in_error");
    const audits = await db
      .from("audit_log")
      .select("detail")
      .eq("actor_email", fixture.staff.email)
      .eq("entity", "patient_clinical_records");
    expect(audits.error).toBeNull();
    expect(JSON.stringify(audits.data)).not.toContain("TEST final text");
    expect(JSON.stringify(audits.data)).not.toContain("TEST correction");
    expect(
      (await db.from("patient_billing_accounts").select("patient_id").eq("patient_id", patientId))
        .data,
    ).toHaveLength(0);
  } finally {
    await removeClinical(db, fixture.patientIds, [actor]);
    await fixture.dispose();
  }
});
