import { expect, test } from "@playwright/test";

import { requestWorklistOutcomeSchema } from "../../src/lib/portal/request-worklist/contracts";
import { serviceDb } from "../harness/env";
import { createStaffFixture, signIn } from "../harness/session";
import { createWorklistRequests } from "../harness/worklist";

test("deep request pages, previous/next navigation, and private worklist reads use the complete matching set", async ({
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
    await page.goto(`/admin/requests?q=${encodeURIComponent(fixture.query)}&page=11`);
    await expect(page.getByTestId("request-row")).toHaveCount(34);
    await expect(page.getByTestId("request-row").first()).toContainText(fixture.rows[500].name);
    await expect(page.getByTestId("request-row").last()).toContainText(fixture.rows[533].name);
    await page.getByTestId("request-row").first().click();
    await expect(page.getByTestId("prev-request")).toHaveAttribute(
      "href",
      new RegExp(fixture.rows[499].id),
    );
    await expect(page.getByTestId("next-request")).toHaveAttribute(
      "href",
      new RegExp(fixture.rows[501].id),
    );
    await page.getByTestId("next-request").click();
    await expect(page.getByTestId("request-detail-name")).toHaveText(fixture.rows[501].name);
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
    ).toBe(403);
  } finally {
    await fixture.dispose();
    await staff.dispose();
  }
});
