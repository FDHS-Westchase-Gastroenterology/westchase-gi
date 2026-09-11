import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import type { RequestWorklistInput } from "../../src/lib/portal/request-worklist/contracts";
import { requestWorklistDatabaseSchema } from "../../src/lib/portal/request-worklist/rows";
import { expectDenied } from "../harness/assert";
import { publishableDb, serviceDb } from "../harness/env";
import { createStaffFixture } from "../harness/session";
import { createWorklistRequests } from "../harness/worklist";

test("worklists reach every request beyond 1000, keep exact filtered counts, and find complete neighbors", async () => {
  const db = serviceDb();
  const staff = await createStaffFixture(db, {
    prefix: "worklist",
    displayName: "TEST Worklist Staff",
  });
  let fixture: Awaited<ReturnType<typeof createWorklistRequests>>;
  try {
    fixture = await createWorklistRequests(db, 1107);
  } catch (error) {
    await staff.dispose();
    throw error;
  }
  const read = async (
    filter: Readonly<
      Partial<Omit<Extract<RequestWorklistInput, { action: "page" }>, "action">> & {
        neighborId?: string;
      }
    >,
  ) => {
    const result = await db.rpc("portal_read_request_worklist", {
      p_actor_id: staff.userId,
      p_filter: { query: fixture.query, ...filter },
    });
    expect(result.error).toBeNull();
    const decoded = requestWorklistDatabaseSchema.parse(result.data);
    if (!decoded.ok) throw new Error(`Worklist read failed: ${decoded.code}`);
    return decoded;
  };
  try {
    const found: string[] = [];
    for (let offset = 0; offset < 1107; offset += 200) {
      const page = await read({ offset, limit: 200 });
      expect(page.total).toBe(1107);
      expect(page.counts.new).toBe(1107);
      found.push(...page.items.map((row) => row.id));
    }
    expect(found).toEqual(fixture.rows.map((row) => row.id));
    const middle = fixture.rows[1001];
    expect((await read({ neighborId: middle.id })).neighbors).toEqual({
      prevId: fixture.rows[1000].id,
      nextId: fixture.rows[1002].id,
      position: 1002,
    });
    const filtered = await read({ location: "tampa", offset: 500, limit: 100 });
    expect(filtered.total).toBe(553);
    expect(filtered.items).toHaveLength(53);
    expect((await read({ offset: 2000 })).items).toHaveLength(0);
    const literal = `worklist%_(),${randomUUID().slice(0, 8)}`;
    expect(
      (await db.from("requests").update({ name: literal }).eq("id", middle.id)).error,
    ).toBeNull();
    expect((await read({ query: literal })).total).toBe(1);
    const denied = await publishableDb().rpc("portal_read_request_worklist", {
      p_actor_id: staff.userId,
      p_filter: {},
    });
    expectDenied(denied);
    expect(
      (await db.from("staff_profiles").update({ active: false }).eq("user_id", staff.userId)).error,
    ).toBeNull();
    expect(
      (await db.rpc("portal_read_request_worklist", { p_actor_id: staff.userId, p_filter: {} }))
        .data,
    ).toEqual({ ok: false, code: "unauthorized" });
  } finally {
    await fixture.dispose();
    await staff.dispose();
  }
});

test("last activity and its named actor remain correct after 1500 audit entries", async () => {
  const db = serviceDb();
  const staff = await createStaffFixture(db, {
    prefix: "worklist-audit",
    displayName: "TEST Worklist Audit",
  });
  let fixture: Awaited<ReturnType<typeof createWorklistRequests>>;
  try {
    fixture = await createWorklistRequests(db, 1);
  } catch (error) {
    await staff.dispose();
    throw error;
  }
  const id = fixture.rows[0].id;
  try {
    const audits = Array.from({ length: 1501 }, (_, index) => ({
      entity: "requests",
      entity_id: id,
      action: "request.note_added",
      source: "staff",
      actor_email: staff.email,
      at: new Date(Date.UTC(2026, 8, 6, 0, index)).toISOString(),
    }));
    for (let offset = 0; offset < audits.length; offset += 200)
      expect(
        (await db.from("audit_log").insert(audits.slice(offset, offset + 200))).error,
      ).toBeNull();
    const result = await db.rpc("portal_read_request_worklist", {
      p_actor_id: staff.userId,
      p_filter: { query: fixture.query },
    });
    expect(result.error).toBeNull();
    const value = requestWorklistDatabaseSchema.parse(result.data);
    if (!value.ok) throw new Error("Worklist audit read failed");
    expect(Date.parse(value.items[0].lastActivityAt ?? "")).toBe(Date.parse(audits[1500].at));
    expect(value.items[0].lastActivityBy).toBe(staff.email);
  } finally {
    await fixture.dispose();
    await staff.dispose();
  }
});
