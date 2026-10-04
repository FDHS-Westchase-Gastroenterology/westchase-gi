import { expect, test } from "@playwright/test";

import { requestWorklistOutcomeSchema } from "../../src/lib/portal/request-worklist/contracts";
import { serviceDb } from "../harness/env";
import { createStaffFixture, signIn } from "../harness/session";
import { createWorklistRequests } from "../harness/worklist";

test("private worklist reads page deep into the complete matching set", async ({
  page,
  request,
  baseURL,
}) => {
  const db = serviceDb();
  const staff = await createStaffFixture(db, {
    prefix: "worklist-ui",
    displayName: "TEST Worklist Staff",
  });
  let fixture: Awaited<ReturnType<typeof createWorklistRequests>>;
  try {
    fixture = await createWorklistRequests(db, 534);
  } catch (error) {
    await staff.dispose();
    throw error;
  }
  try {
    if (baseURL === undefined)
      throw new Error("Worklist API verification requires a Preview origin");
    const body = { action: "page", query: fixture.query, offset: 500, limit: 50 };
    const unauthorized = await request.post("/api/admin/request-worklist", {
      headers: { origin: new URL(baseURL).origin },
      data: body,
    });
    expect(unauthorized.status()).toBe(401);
    await signIn(page, staff);
    const api = await page.evaluate(async (input) => {
      const response = await fetch("/api/admin/request-worklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return {
        status: response.status,
        cache: response.headers.get("cache-control"),
        body: await response.text(),
      };
    }, body);
    expect(api.status).toBe(200);
    expect(api.cache).toContain("no-store");
    const result = requestWorklistOutcomeSchema.parse(JSON.parse(api.body));
    if (!result.ok) throw new Error("Worklist API read failed");
    expect(result.total).toBe(534);
    expect(result.items).toHaveLength(34);
    expect(
      (
        await page.request.post("/api/admin/request-worklist", {
          headers: { origin: "https://other.example.test" },
          data: body,
        })
      ).status(),
    ).toBe(403);
    expect(
      (await db.from("staff_profiles").update({ active: false }).eq("user_id", staff.userId)).error,
    ).toBeNull();
    expect(
      (
        await page.request.post("/api/admin/request-worklist", {
          headers: { origin: new URL(baseURL).origin },
          data: body,
        })
      ).status(),
    ).toBe(401);
  } finally {
    await fixture.dispose();
    await staff.dispose();
  }
});
