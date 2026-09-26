import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import {
  clinicalCommandOutcomeSchema,
  clinicalListOutcomeSchema,
  clinicalReadOutcomeSchema,
} from "../../src/lib/portal/clinical/contracts";
import type { ClinicalInput } from "../../src/lib/portal/clinical/contracts";
import { removeClinical } from "../harness/clinical";
import { serviceDb } from "../harness/env";
import { createSchedulingFixture } from "../harness/scheduling";
import { signIn } from "../harness/session";

async function clinical(page: Page, input: Readonly<ClinicalInput>) {
  return page.evaluate(async (body) => {
    const response = await fetch("/api/admin/clinical", {
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

test("clinical API keeps records private, requires explicit signing permission, and preserves a signed record through correction", async ({
  page,
  request,
  baseURL,
}) => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, "clinical-api");
  const actor = fixture.staff.userId;
  const patientId = fixture.patientIds[0];
  try {
    if (baseURL === undefined)
      throw new Error("Clinical API verification requires a Preview origin");
    const list = { action: "list", patientId } as const;
    expect(
      (
        await request.post("/api/admin/clinical", {
          headers: { origin: new URL(baseURL).origin },
          data: list,
        })
      ).status(),
    ).toBe(401);
    await signIn(page, fixture.staff);
    const empty = await clinical(page, list);
    expect(empty.status).toBe(200);
    expect(empty.cache).toContain("no-store");
    expect(clinicalListOutcomeSchema.parse(JSON.parse(empty.text))).toMatchObject({
      ok: true,
      canSign: false,
      total: 0,
    });
    const create = {
      action: "command",
      idempotencyKey: randomUUID(),
      command: {
        kind: "create",
        patientId,
        content: {
          kind: "note",
          title: "TEST private clinical chart",
          noteText: "TEST private note content",
        },
      },
    } as const;
    const first = await clinical(page, create);
    expect(first.status).toBe(200);
    const created = clinicalCommandOutcomeSchema.parse(JSON.parse(first.text));
    if (!created.ok || created.entity !== "record") throw new Error("Clinical API creation failed");
    expect(JSON.parse((await clinical(page, create)).text)).toEqual(created);
    const sign = {
      action: "command",
      idempotencyKey: randomUUID(),
      command: { kind: "sign", recordId: created.id, expectedVersion: 1 },
    } as const;
    expect((await clinical(page, sign)).status).toBe(403);
    expect(
      (
        await clinical(page, {
          action: "command",
          idempotencyKey: randomUUID(),
          command: { kind: "set_signer", userId: actor, expectedVersion: 0, enabled: true },
        })
      ).status,
    ).toBe(200);
    expect((await clinical(page, sign)).status).toBe(200);
    expect(
      (
        await clinical(page, {
          action: "command",
          idempotencyKey: randomUUID(),
          command: {
            kind: "update_draft",
            recordId: created.id,
            expectedVersion: 2,
            content: create.command.content,
          },
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await clinical(page, {
          action: "command",
          idempotencyKey: randomUUID(),
          command: {
            kind: "enter_in_error",
            recordId: created.id,
            expectedVersion: 2,
            reason: "TEST note belongs in another encounter",
          },
        })
      ).status,
    ).toBe(200);
    const stored = await clinical(page, { action: "read", recordId: created.id });
    expect(stored.cache).toContain("no-store");
    const decoded = clinicalReadOutcomeSchema.parse(JSON.parse(stored.text));
    if (!decoded.ok) throw new Error("Clinical API history failed");
    expect(decoded.record).toMatchObject({
      patientId,
      status: "entered_in_error",
      noteText: "TEST private note content",
      signature: { id: actor },
      version: 3,
    });
    expect(decoded.history.total).toBe(3);
    const summaries = clinicalListOutcomeSchema.parse(
      JSON.parse((await clinical(page, list)).text),
    );
    expect(JSON.stringify(summaries)).not.toContain("TEST private note content");
    expect(
      (
        await page.request.post("/api/admin/clinical", {
          headers: { origin: "https://other.example.test" },
          data: list,
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post("/api/admin/clinical", {
          headers: { origin: new URL(baseURL).origin },
          data: { ...create, command: { ...create.command, authorId: randomUUID() } },
        })
      ).status(),
    ).toBe(400);
    expect(
      (await db.from("staff_profiles").update({ active: false }).eq("user_id", actor)).error,
    ).toBeNull();
    expect((await clinical(page, list)).status).toBe(401);
  } finally {
    await removeClinical(db, fixture.patientIds, [actor]);
    await fixture.dispose();
  }
});
