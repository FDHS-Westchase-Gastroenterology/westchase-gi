import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import {
  patientCommandOutcomeSchema,
  patientReadOutcomeSchema,
  patientSearchOutcomeSchema,
} from "../../src/lib/portal/patients/contracts";
import type { PatientCommandInput } from "../../src/lib/portal/patients/contracts";
import { serviceDb } from "../harness/env";
import { removePatients } from "../harness/patients";
import { createStaffFixture, signIn } from "../harness/session";

async function save(page: Page, input: Readonly<PatientCommandInput>) {
  const result = await page.evaluate(async (body) => {
    const response = await fetch("/api/admin/patients", {
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
  return { ...result, outcome: patientCommandOutcomeSchema.parse(JSON.parse(result.text)) };
}

test("patient API verifies the staff session, saves once, and returns private, complete patient details", async ({
  page,
  request,
}) => {
  const db = serviceDb();
  const staff = await createStaffFixture(db, {
    prefix: "patient-api",
    displayName: "TEST Patient API Staff",
  });
  const patientIds: string[] = [];
  try {
    const deniedRead = await request.get(`/api/admin/patients/${randomUUID()}`);
    expect(deniedRead.status()).toBe(401);
    await signIn(page, staff);
    const input: PatientCommandInput = {
      idempotencyKey: randomUUID(),
      command: { kind: "create", patient: { name: "TEST Patient API Registration" } },
    };
    const first = await save(page, input);
    expect(first.status).toBe(200);
    expect(first.cache).toContain("no-store");
    if (!first.outcome.ok) throw new Error("Patient API registration failed");
    const patientId = first.outcome.patientId;
    patientIds.push(patientId);
    expect((await save(page, input)).outcome).toEqual(first.outcome);
    const conflict = await save(page, {
      ...input,
      command: { kind: "create", patient: { name: "TEST Other Identity" } },
    });
    expect(conflict.status).toBe(409);
    expect(conflict.outcome).toEqual({ ok: false, code: "idempotency_conflict" });
    const detailResponse = await page.request.get(`/api/admin/patients/${patientId}`);
    expect(detailResponse.status()).toBe(200);
    expect(detailResponse.headers()["cache-control"]).toContain("no-store");
    const detail = patientReadOutcomeSchema.parse(await detailResponse.json());
    expect(detail).toMatchObject({
      ok: true,
      patient: { id: patientId, version: 1, dateOfBirth: null, phone: null, email: null },
      history: { total: 1 },
      requests: { items: [], total: 0 },
    });
    const searchResult = await page.evaluate(async (id) => {
      const response = await fetch("/api/admin/patients/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "TEST Patient API Registration" }),
      });
      const invalid = await fetch(`/api/admin/patients/${id}?historyBefore=bad`);
      return {
        status: response.status,
        text: await response.text(),
        invalidStatus: invalid.status,
      };
    }, patientId);
    expect(searchResult.status).toBe(200);
    expect(searchResult.invalidStatus).toBe(400);
    const search = patientSearchOutcomeSchema.parse(JSON.parse(searchResult.text));
    expect(search).toMatchObject({
      ok: true,
      total: 1,
      patients: [{ id: patientId, dateOfBirth: null }],
    });
    const crossOrigin = await page.request.post("/api/admin/patients", {
      headers: { origin: "https://other.example.test" },
      data: input,
    });
    expect(crossOrigin.status()).toBe(403);
    const archive = await save(page, {
      idempotencyKey: randomUUID(),
      command: {
        kind: "set_archived",
        patientId,
        expectedVersion: 1,
        archived: true,
      },
    });
    expect(archive.status).toBe(403);
    const deactivated = await db
      .from("staff_profiles")
      .update({ active: false })
      .eq("user_id", staff.userId);
    expect(deactivated.error).toBeNull();
    expect((await page.request.get(`/api/admin/patients/${patientId}`)).status()).toBe(401);
    expect((await save(page, input)).status).toBe(401);
  } finally {
    await removePatients(db, patientIds);
    await staff.dispose();
  }
});
