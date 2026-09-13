import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { listClinical, readClinical, removeClinical, saveClinical } from "../harness/clinical";
import { serviceDb } from "../harness/env";
import { savePatient } from "../harness/patients";
import { createSchedulingFixture } from "../harness/scheduling";
import { insertRequest } from "./support";

test("clinical summaries and long histories page completely and survive removal of linked intake", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "clinical-paging");
  const actor = fixture.staff.userId;
  const patientId = fixture.patientIds[0];
  const requestId = randomUUID();
  try {
    const ids: string[] = [];
    for (let offset = 0; offset < 123; offset += 10) {
      const outcomes = await Promise.all(
        Array.from({ length: Math.min(10, 123 - offset) }, async (_, index) =>
          saveClinical(db, actor, {
            kind: "create",
            patientId,
            content: {
              kind: "note",
              title: `TEST chart ${String(offset + index).padStart(4, "0")}`,
              noteText: "TEST protected draft",
            },
          }),
        ),
      );
      for (const outcome of outcomes) {
        if (!outcome.ok || outcome.entity !== "record")
          throw new Error("Clinical paging fixture failed");
        ids.push(outcome.id);
      }
    }
    const first = await listClinical(db, actor, { action: "list", patientId, limit: 100 });
    if (!first.ok || first.next === null) throw new Error("Clinical first page failed");
    const last = await listClinical(db, actor, {
      action: "list",
      patientId,
      limit: 100,
      after: first.next,
    });
    if (!last.ok) throw new Error("Clinical last page failed");
    expect(first.total).toBe(123);
    expect(first.records).toHaveLength(100);
    expect(last.records).toHaveLength(23);
    expect(last.next).toBeNull();
    expect(new Set([...first.records, ...last.records].map((row) => row.id))).toEqual(new Set(ids));
    expect(JSON.stringify(first)).not.toContain("TEST protected draft");
    for (let currentVersion = 1; currentVersion < 25; currentVersion++) {
      expect(
        await saveClinical(db, actor, {
          kind: "update_draft",
          recordId: ids[0],
          expectedVersion: currentVersion,
          content: {
            kind: "note",
            title: "TEST chart 0000",
            noteText: `TEST revision ${currentVersion}`,
          },
        }),
      ).toMatchObject({ ok: true, version: currentVersion + 1 });
    }
    const history = await readClinical(db, actor, ids[0]);
    if (!history.ok) throw new Error("Clinical history page failed");
    expect(history.history.total).toBe(25);
    expect(history.history.items).toHaveLength(20);
    expect(history.history.nextVersion).toBe(6);
    const older = await readClinical(db, actor, ids[0], history.history.nextVersion);
    if (!older.ok) throw new Error("Older clinical history failed");
    expect(older.history.items.map((row) => row.version)).toEqual([5, 4, 3, 2, 1]);
    expect(older.history.nextVersion).toBeNull();
    const literal = "TEST 100%_(),[]";
    expect(
      await saveClinical(db, actor, {
        kind: "create",
        patientId,
        content: {
          kind: "document_reference",
          title: literal,
          documentSource: "TEST source",
          documentReference: "TEST external-id",
        },
      }),
    ).toMatchObject({ ok: true });
    expect(
      await listClinical(db, actor, {
        action: "list",
        patientId,
        query: literal,
        kind: "document_reference",
      }),
    ).toMatchObject({ ok: true, total: 1 });
    await insertRequest(db, { id: requestId, name: "TEST clinical retained patient" });
    expect(
      await savePatient(db, actor, {
        kind: "link_request",
        patientId,
        requestId,
        expectedVersion: 1,
      }),
    ).toMatchObject({ ok: true });
    expect((await db.from("requests").delete().eq("id", requestId)).error).toBeNull();
    expect(await readClinical(db, actor, ids[0])).toMatchObject({
      ok: true,
      record: { patientId, version: 25 },
    });
  } finally {
    expect((await db.from("requests").delete().eq("id", requestId)).error).toBeNull();
    expect((await db.from("audit_log").delete().eq("entity_id", requestId)).error).toBeNull();
    await removeClinical(db, fixture.patientIds);
    await fixture.dispose();
  }
});

test("competing clinical edits and amendments save one version and reject signing after a source correction", async () => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "clinical-races");
  const actor = fixture.staff.userId;
  const patientId = fixture.patientIds[0];
  try {
    const content = {
      kind: "note",
      title: "TEST concurrent chart",
      noteText: "TEST base",
    } as const;
    const created = await saveClinical(db, actor, { kind: "create", patientId, content });
    if (!created.ok || created.entity !== "record")
      throw new Error("Clinical concurrency fixture failed");
    const key = randomUUID();
    const update = {
      kind: "update_draft",
      recordId: created.id,
      expectedVersion: 1,
      content,
    } as const;
    const same = await Promise.all([
      saveClinical(db, actor, update, key),
      saveClinical(db, actor, update, key),
    ]);
    expect(same[0]).toMatchObject({ ok: true, version: 2 });
    expect(same[1]).toEqual(same[0]);
    const edits = await Promise.all([
      saveClinical(db, actor, {
        ...update,
        expectedVersion: 2,
        content: { ...content, noteText: "TEST first" },
      }),
      saveClinical(db, actor, {
        ...update,
        expectedVersion: 2,
        content: { ...content, noteText: "TEST second" },
      }),
    ]);
    expect(edits.filter((result) => result.ok)).toHaveLength(1);
    expect(edits.find((result) => !result.ok)).toEqual({
      ok: false,
      code: "stale_version",
      currentVersion: 3,
    });
    expect(
      await saveClinical(db, actor, {
        kind: "set_signer",
        userId: actor,
        expectedVersion: 0,
        enabled: true,
      }),
    ).toMatchObject({ ok: true });
    expect(
      await saveClinical(db, actor, { kind: "sign", recordId: created.id, expectedVersion: 3 }),
    ).toMatchObject({ ok: true, version: 4 });
    const amendments = await Promise.all([
      saveClinical(db, actor, { kind: "amend", recordId: created.id, expectedVersion: 4, content }),
      saveClinical(db, actor, { kind: "amend", recordId: created.id, expectedVersion: 4, content }),
    ]);
    const amendment = amendments.find((result) => result.ok);
    if (amendment?.entity !== "record") throw new Error("One amendment must be created");
    expect(amendments.filter((result) => result.ok)).toHaveLength(1);
    expect(amendments.find((result) => !result.ok)).toEqual({
      ok: false,
      code: "amendment_exists",
    });
    expect(
      await saveClinical(db, actor, {
        kind: "enter_in_error",
        recordId: created.id,
        expectedVersion: 4,
        reason: "TEST source was entered in error",
      }),
    ).toMatchObject({ ok: true, version: 5 });
    expect(
      await saveClinical(db, actor, { kind: "sign", recordId: amendment.id, expectedVersion: 1 }),
    ).toEqual({ ok: false, code: "amendment_source_changed" });
    const stored = await readClinical(db, actor, created.id);
    if (!stored.ok) throw new Error("Clinical concurrent history read failed");
    expect(stored.history.items.map((row) => row.version)).toEqual([5, 4, 3, 2, 1]);
  } finally {
    await removeClinical(db, fixture.patientIds, [actor]);
    await fixture.dispose();
  }
});
