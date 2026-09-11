import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { expectDenied } from "../harness/assert";
import { readClinical, removeClinical, saveClinical } from "../harness/clinical";
import { publishableDb, serviceDb } from "../harness/env";
import { createSchedulingFixture } from "../harness/scheduling";
import { createStaffFixture } from "../harness/session";

test("document references and signing honor authorship, live permissions, and closed browser access", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "clinical-access");
  let author: Awaited<ReturnType<typeof createStaffFixture>>;
  try {
    author = await createStaffFixture(db, {
      prefix: "clinical-author",
      displayName: "TEST Clinical Author",
    });
  } catch (error) {
    await fixture.dispose();
    throw error;
  }
  const admin = fixture.staff.userId;
  try {
    const browser = publishableDb();
    for (const table of [
      "clinical_signers",
      "patient_clinical_records",
      "patient_clinical_revisions",
      "clinical_command_receipts",
    ])
      expectDenied(await browser.from(table).select("*"));
    expect((await browser.auth.signInWithPassword(author)).error).toBeNull();
    expectDenied(
      await browser.rpc("portal_list_patient_clinical_records", {
        p_actor_id: author.userId,
        p_patient_id: fixture.patientIds[0],
      }),
    );
    expect(
      (await db.rpc("portal_list_clinical_signers", { p_actor_id: author.userId })).data,
    ).toEqual({ ok: false, code: "forbidden" });
    expect(
      await saveClinical(db, author.userId, {
        kind: "set_signer",
        userId: author.userId,
        expectedVersion: 0,
        enabled: true,
      }),
    ).toEqual({ ok: false, code: "forbidden" });
    const content = {
      kind: "document_reference",
      title: "TEST paper document",
      documentSource: "TEST archive",
      documentReference: "TEST-doc-123",
      documentSha256: "a".repeat(64),
    } as const;
    const created = await saveClinical(db, author.userId, {
      kind: "create",
      patientId: fixture.patientIds[0],
      content,
    });
    if (!created.ok || created.entity !== "record") throw new Error("Document fixture failed");
    expect(
      await saveClinical(db, admin, {
        kind: "update_draft",
        recordId: created.id,
        expectedVersion: 1,
        content,
      }),
    ).toEqual({ ok: false, code: "not_record_author" });
    expect(
      await saveClinical(db, admin, {
        kind: "set_signer",
        userId: author.userId,
        expectedVersion: 0,
        enabled: true,
      }),
    ).toMatchObject({ ok: true, version: 1 });
    const key = randomUUID();
    const sign = { kind: "sign", recordId: created.id, expectedVersion: 1 } as const;
    expect(await saveClinical(db, author.userId, sign, key)).toMatchObject({
      ok: true,
      version: 2,
    });
    expect(
      await saveClinical(db, admin, {
        kind: "set_signer",
        userId: author.userId,
        expectedVersion: 1,
        enabled: false,
      }),
    ).toMatchObject({ ok: true, version: 2 });
    expect(await saveClinical(db, author.userId, sign, key)).toEqual({
      ok: false,
      code: "signing_not_enabled",
    });
    expect(
      await saveClinical(db, author.userId, {
        kind: "enter_in_error",
        recordId: created.id,
        expectedVersion: 2,
        reason: "TEST correction",
      }),
    ).toEqual({ ok: false, code: "forbidden" });
    expect(
      await saveClinical(db, admin, {
        kind: "enter_in_error",
        recordId: created.id,
        expectedVersion: 2,
        reason: "TEST wrong document reference",
      }),
    ).toMatchObject({ ok: true, version: 3 });
    const stored = await readClinical(db, admin, created.id);
    if (!stored.ok) throw new Error("Document read failed");
    expect(stored.record).toMatchObject({
      status: "entered_in_error",
      noteText: null,
      document: { source: "TEST archive", reference: "TEST-doc-123", sha256: "a".repeat(64) },
      signature: { id: author.userId },
    });
    expect(
      (await db.from("staff_profiles").update({ active: false }).eq("user_id", author.userId))
        .error,
    ).toBeNull();
    expect(await readClinical(db, author.userId, created.id)).toEqual({
      ok: false,
      code: "unauthorized",
    });
    expect(await saveClinical(db, author.userId, sign, key)).toEqual({
      ok: false,
      code: "unauthorized",
    });
    expect(
      await saveClinical(db, admin, {
        kind: "set_signer",
        userId: author.userId,
        expectedVersion: 2,
        enabled: true,
      }),
    ).toEqual({ ok: false, code: "staff_unavailable" });
  } finally {
    await removeClinical(db, fixture.patientIds, [admin, author.userId]);
    expect((await db.from("audit_log").delete().eq("actor_email", author.email)).error).toBeNull();
    await author.dispose();
    await fixture.dispose();
  }
});
