import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { z } from "zod";

import { expectDenied } from "../harness/assert";
import { publishableDb, serviceDb } from "../harness/env";
import { removePatients, savePatient } from "../harness/patients";
import { createStaffFixture } from "../harness/session";
import { insertRequest } from "./support";

test("patient identity survives intake removal; edits, links, receipts, and history stay consistent", async () => {
  const db = serviceDb();
  const staff = await createStaffFixture(db, {
    prefix: "patient-boundary",
    displayName: "TEST Patient Staff",
  });
  const patientIds: string[] = [];
  const requestId = randomUUID();
  try {
    await insertRequest(db, { id: requestId, name: "TEST request with independent patient" });
    const key = randomUUID();
    const command = { kind: "create", patient: { name: "TEST Morgan Reed" }, requestId } as const;
    const created = await savePatient(db, staff.userId, command, key);
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error("Patient registration failed");
    patientIds.push(created.patientId);
    expect(created.version).toBe(1);
    expect(await savePatient(db, staff.userId, command, key)).toEqual(created);
    expect(
      await savePatient(
        db,
        staff.userId,
        { ...command, patient: { name: "TEST Someone Else" } },
        key,
      ),
    ).toEqual({ ok: false, code: "idempotency_conflict" });
    const conflictingCreate = await savePatient(db, staff.userId, command);
    expect(conflictingCreate).toEqual({ ok: false, code: "request_link_conflict" });
    expect(
      (await db.from("patients").select("id").eq("created_by", staff.userId)).data,
    ).toHaveLength(1);
    const edited = await savePatient(db, staff.userId, {
      kind: "update",
      patientId: created.patientId,
      expectedVersion: 1,
      patient: {
        name: "TEST Morgan Reed",
        dateOfBirth: "1980-02-29",
        phone: "8135550199",
        email: "morgan@example.test",
      },
    });
    expect(edited).toMatchObject({ ok: true, version: 2 });
    expect(
      await savePatient(db, staff.userId, {
        kind: "update",
        patientId: created.patientId,
        expectedVersion: 1,
        patient: { name: "TEST Stale Edit" },
      }),
    ).toEqual({ ok: false, code: "stale_version", currentVersion: 2 });
    expect(
      await savePatient(db, staff.userId, {
        kind: "set_archived",
        patientId: created.patientId,
        expectedVersion: 2,
        archived: true,
      }),
    ).toEqual({ ok: false, code: "forbidden" });
    const detail = await db.rpc("portal_read_patient", {
      p_actor_id: staff.userId,
      p_patient_id: created.patientId,
    });
    expect(detail.error).toBeNull();
    expect(detail.data).toMatchObject({
      ok: true,
      patient: { version: 2, name: "TEST Morgan Reed", date_of_birth: "1980-02-29" },
      history: { total: 2 },
      requests: { total: 1 },
    });
    const audits = await db
      .from("audit_log")
      .select("source,correlation_id,detail")
      .eq("entity_id", created.patientId);
    expect(audits.error).toBeNull();
    expect(audits.data).toHaveLength(2);
    expect(audits.data).toContainEqual({
      source: "staff",
      correlation_id: key,
      detail: { version: 1, request_id: requestId },
    });
    for (const identifyingValue of ["Morgan", "1980-02-29", "8135550199", "morgan@example.test"]) {
      expect(JSON.stringify(audits.data)).not.toContain(identifyingValue);
    }
    for (const table of ["patient_revisions", "patient_command_receipts"]) {
      const removed = await db.from(table).delete().eq("patient_id", created.patientId);
      expect(removed.error?.code).toBe("42501");
    }
    const requestRemoved = await db.from("requests").delete().eq("id", requestId);
    expect(requestRemoved.error).toBeNull();
    const retained = await db.rpc("portal_read_patient", {
      p_actor_id: staff.userId,
      p_patient_id: created.patientId,
    });
    expect(retained.data).toMatchObject({
      ok: true,
      patient: { version: 2 },
      history: { total: 2 },
      requests: { total: 0 },
    });
    const deactivated = await db
      .from("staff_profiles")
      .update({ active: false })
      .eq("user_id", staff.userId);
    expect(deactivated.error).toBeNull();
    expect(await savePatient(db, staff.userId, command, key)).toEqual({
      ok: false,
      code: "unauthorized",
    });
    expect((await db.rpc("portal_search_patients", { p_actor_id: staff.userId })).data).toEqual({
      ok: false,
      code: "unauthorized",
    });
  } finally {
    await db.from("requests").delete().eq("id", requestId);
    await removePatients(db, patientIds);
    await staff.dispose();
  }
});

test("concurrent patient saves and competing request links cannot duplicate or overwrite each other", async () => {
  const db = serviceDb();
  const staff = await createStaffFixture(db, {
    prefix: "patient-race",
    displayName: "TEST Patient Race",
  });
  const patientIds: string[] = [];
  const requestId = randomUUID();
  try {
    const key = randomUUID();
    const command = { kind: "create", patient: { name: "TEST Concurrent Patient" } } as const;
    const [first, repeated] = await Promise.all([
      savePatient(db, staff.userId, command, key),
      savePatient(db, staff.userId, command, key),
    ]);
    if (!first.ok) throw new Error("Concurrent registration failed");
    patientIds.push(first.patientId);
    expect(repeated).toEqual(first);
    const updates = await Promise.all(
      ["TEST First Edit", "TEST Second Edit"].map(async (name) =>
        savePatient(db, staff.userId, {
          kind: "update",
          patientId: first.patientId,
          expectedVersion: 1,
          patient: { name },
        }),
      ),
    );
    expect(updates.filter(({ ok }) => ok)).toHaveLength(1);
    expect(updates.find(({ ok }) => !ok)).toEqual({
      ok: false,
      code: "stale_version",
      currentVersion: 2,
    });
    const second = await savePatient(db, staff.userId, {
      kind: "create",
      patient: { name: "TEST Another Patient" },
    });
    if (!second.ok) throw new Error("Second registration failed");
    patientIds.push(second.patientId);
    await insertRequest(db, { id: requestId, name: "TEST contested request link" });
    const linked = await Promise.all([
      savePatient(db, staff.userId, {
        kind: "link_request",
        patientId: first.patientId,
        expectedVersion: 2,
        requestId,
      }),
      savePatient(db, staff.userId, {
        kind: "link_request",
        patientId: second.patientId,
        expectedVersion: 1,
        requestId,
      }),
    ]);
    expect(linked.filter(({ ok }) => ok)).toHaveLength(1);
    expect(linked.find(({ ok }) => !ok)).toEqual({ ok: false, code: "request_link_conflict" });
    const link = await db
      .from("patient_request_links")
      .select("patient_id")
      .eq("request_id", requestId)
      .single();
    expect(link.error).toBeNull();
    const winner = linked.find((result) => result.ok);
    if (winner === undefined) throw new Error("A patient must own the successful link");
    expect(link.data).toEqual({ patient_id: winner.patientId });
    expect(
      await savePatient(db, staff.userId, {
        kind: "unlink_request",
        patientId: winner.patientId,
        expectedVersion: winner.version,
        requestId,
      }),
    ).toMatchObject({ ok: true, version: winner.version + 1 });
    const receiptCount = await db
      .from("patient_command_receipts")
      .select("idempotency_key", { count: "exact", head: true })
      .in("patient_id", patientIds);
    expect(receiptCount.error).toBeNull();
    expect(receiptCount.count).toBe(5);
  } finally {
    await db.from("requests").delete().eq("id", requestId);
    await removePatients(db, patientIds);
    await staff.dispose();
  }
});

test("patient reads remain closed to browser roles and registration validates dates at the database", async () => {
  const db = serviceDb();
  const browser = publishableDb();
  const staff = await createStaffFixture(db, {
    prefix: "patient-access",
    displayName: "TEST Patient Access",
    role: "admin",
  });
  const patientIds: string[] = [];
  try {
    for (const table of [
      "patients",
      "patient_request_links",
      "patient_revisions",
      "patient_command_receipts",
    ]) {
      expectDenied(await browser.from(table).select("*"));
    }
    const args = {
      p_actor_id: staff.userId,
      p_idempotency_key: randomUUID(),
      p_fingerprint: "a".repeat(64),
      p_command: {
        kind: "create",
        patient: { name: "TEST Patient", dateOfBirth: null, phone: null, email: null },
      },
    };
    expectDenied(await browser.rpc("portal_execute_patient_command", args));
    const signIn = await browser.auth.signInWithPassword(staff);
    expect(signIn.error).toBeNull();
    expectDenied(await browser.from("patients").select("*"));
    expectDenied(await browser.rpc("portal_search_patients", { p_actor_id: staff.userId }));
    for (const dateOfBirth of ["9999-01-01", "2023-02-29", "0000-01-01", "01/02/1980"]) {
      const result = await db.rpc("portal_execute_patient_command", {
        ...args,
        p_command: { ...args.p_command, patient: { ...args.p_command.patient, dateOfBirth } },
      });
      expect(result.error).toBeNull();
      expect(result.data).toEqual({ ok: false, code: "invalid_command" });
    }
    const created = await savePatient(db, staff.userId, {
      kind: "create",
      patient: { name: "TEST Archived Patient" },
    });
    if (!created.ok) throw new Error("Registration failed");
    patientIds.push(created.patientId);
    expect(
      await savePatient(db, staff.userId, {
        kind: "set_archived",
        patientId: created.patientId,
        expectedVersion: 1,
        archived: true,
      }),
    ).toMatchObject({ ok: true, version: 2 });
    expect(
      await savePatient(db, staff.userId, {
        kind: "update",
        patientId: created.patientId,
        expectedVersion: 2,
        patient: { name: "TEST blocked edit" },
      }),
    ).toEqual({ ok: false, code: "patient_archived" });
    expect(
      await savePatient(db, staff.userId, {
        kind: "set_archived",
        patientId: created.patientId,
        expectedVersion: 2,
        archived: false,
      }),
    ).toMatchObject({ ok: true, version: 3 });
  } finally {
    await browser.auth.signOut();
    await removePatients(db, patientIds);
    await staff.dispose();
  }
});

test("patient search returns every matching row beyond one page, including equal names and literal wildcards", async () => {
  const db = serviceDb();
  const staff = await createStaffFixture(db, {
    prefix: "patient-pages",
    displayName: "TEST Patient Pages",
  });
  const prefix = `TEST Registry ${randomUUID().slice(0, 8)}`;
  const fixtures = Array.from({ length: 123 }, (_, index) => ({
    id: randomUUID(),
    name: `${prefix} ${Math.floor(index / 2)
      .toString()
      .padStart(3, "0")}`,
    created_by: staff.userId,
    updated_by: staff.userId,
  }));
  const literalId = randomUUID();
  const patientIds = [...fixtures.map(({ id }) => id), literalId];
  try {
    const inserted = await db.from("patients").insert([
      ...fixtures,
      {
        id: literalId,
        name: `${prefix} 100%_literal`,
        created_by: staff.userId,
        updated_by: staff.userId,
      },
    ]);
    expect(inserted.error).toBeNull();
    let after: { name: string; id: string } | null = null;
    const seen: string[] = [];
    do {
      const result = await db.rpc("portal_search_patients", {
        p_actor_id: staff.userId,
        p_query: prefix,
        p_limit: 50,
        p_after_name: after?.name ?? null,
        p_after_id: after?.id ?? null,
      });
      expect(result.error).toBeNull();
      const page = z
        .object({
          ok: z.literal(true),
          total: z.number(),
          patients: z.array(z.object({ id: z.uuid() })),
          next: z.object({ name: z.string(), id: z.uuid() }).nullable(),
        })
        .parse(result.data);
      expect(page.total).toBe(124);
      expect(page.patients.length).toBeLessThanOrEqual(50);
      seen.push(...page.patients.map(({ id }) => id));
      after = page.next;
    } while (after !== null && seen.length <= patientIds.length);
    expect(after).toBeNull();
    expect(seen.toSorted()).toEqual(patientIds.toSorted());
    const literal = await db.rpc("portal_search_patients", {
      p_actor_id: staff.userId,
      p_query: "100%_literal",
    });
    expect(literal.data).toMatchObject({ ok: true, total: 1, patients: [{ id: literalId }] });
  } finally {
    await removePatients(db, patientIds);
    await staff.dispose();
  }
});
