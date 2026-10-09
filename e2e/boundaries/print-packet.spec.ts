import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { z } from "zod";

import { jsonSchema } from "../../src/lib/json";
import { runId, serviceDb } from "../harness/env";
import { signIn } from "../harness/session";
import { expectNoPatientLeak, PATIENT_PHONE, SEED_EMAIL } from "./support";

/* The print packet's widened read: every chosen request's full record in
   one batched pass (requests by id, then transitions and events by request
   id, paged under the Data API's row cap), and one audit row naming the
   packet's requests in print order. */

const db = serviceDb();
const author = SEED_EMAIL.trim().toLowerCase();
const BULK_NOTES = 1001;

interface Fixture {
  readonly ids: { readonly a: string; readonly b: string; readonly c: string };
  readonly names: { readonly a: string; readonly b: string; readonly c: string };
  readonly noteA: string;
}

async function stageFixture(): Promise<Fixture> {
  const ids = { a: randomUUID(), b: randomUUID(), c: randomUUID() };
  const names = {
    a: `TEST Print Boundary ${runId} A`,
    b: `TEST Print Boundary ${runId} B`,
    c: `TEST Print Boundary ${runId} C`,
  };
  const noteA = `TEST print boundary note for A ${runId}`;
  const request = (key: "a" | "b" | "c", createdAt: string) => ({
    id: ids[key],
    name: names[key],
    phone: PATIENT_PHONE,
    email: `print-boundary-${runId}-${key}@example.test`,
    location: "tampa",
    preferred_time: "morning",
    message: null,
    locale: "en",
    source_path: "/e2e/print-boundary",
    created_at: createdAt,
  });
  // C is oldest, then A, then B, so print order differs from the chosen order.
  const inserted = await db
    .from("requests")
    .insert([
      request("c", "2026-08-01T10:00:00.000Z"),
      request("a", "2026-08-01T11:00:00.000Z"),
      request("b", "2026-08-01T12:00:00.000Z"),
    ]);
  expect(inserted.error).toBeNull();

  // A has one note and one call; B has more notes than one Data API page
  // Returns; C has no history at all.
  const events = await db.from("request_events").insert([
    {
      request_id: ids.a,
      type: "note",
      status: "recorded",
      meta: { text: noteA, author_email: author },
      created_at: "2026-08-02T09:00:00.000Z",
    },
    {
      request_id: ids.a,
      type: "contact_attempt",
      status: "recorded",
      meta: { outcome: "no_answer", author_email: author },
      created_at: "2026-08-02T09:05:00.000Z",
    },
    ...Array.from({ length: BULK_NOTES }, (_, index) => ({
      request_id: ids.b,
      type: "note",
      status: "recorded",
      meta: { text: `TEST print boundary bulk note ${index + 1}`, author_email: author },
      created_at: new Date(Date.parse("2026-08-03T09:00:00.000Z") + index * 1000).toISOString(),
    })),
  ]);
  expect(events.error).toBeNull();
  return { ids, names, noteA };
}

async function disposeFixture(fixture: Readonly<Fixture>) {
  await db.from("requests").delete().in("id", [fixture.ids.a, fixture.ids.b, fixture.ids.c]);
}

test("the batched history read is capped per response, so it must page by exact count", async () => {
  const fixture = await stageFixture();
  try {
    const chosen = [fixture.ids.a, fixture.ids.b, fixture.ids.c];
    const firstPage = await db
      .from("request_events")
      .select("request_id,id", { count: "exact" })
      .in("request_id", chosen)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(0, 1999);
    expect(firstPage.error).toBeNull();
    expect(firstPage.count).toBe(BULK_NOTES + 2);
    // The Data API returns at most max_rows rows whatever range is asked, which
    // Is why the read continues until it holds the counted total.
    expect(firstPage.data?.length ?? 0).toBeLessThanOrEqual(1000);
    expect(firstPage.data?.length ?? 0).toBeLessThan(firstPage.count ?? 0);
  } finally {
    await disposeFixture(fixture);
  }
});

test("an id packet prints each chosen record with its own full history and audits its ids in print order", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "JS portal UI");
  test.setTimeout(120_000);
  const fixture = await stageFixture();
  const auditIds: string[] = [];
  try {
    await signIn(page);
    await page.goto(`/admin/requests/print?ids=${fixture.ids.b},${fixture.ids.a},${fixture.ids.c}`);
    const sheets = page.locator(".portal-print-packet > .printed-page");
    await expect(sheets).toHaveCount(3);
    const [sheetC, sheetA, sheetB] = [sheets.nth(0), sheets.nth(1), sheets.nth(2)];
    await expect(sheetC).toContainText(fixture.names.c);
    await expect(sheetA).toContainText(fixture.names.a);
    await expect(sheetB).toContainText(fixture.names.b);

    // Each page reads only its own record's events, B's past one Data API page.
    await expect(sheetC.getByRole("heading", { name: /^Staff notes/ })).toHaveCount(0);
    await expect(sheetC.getByRole("heading", { name: /^Call history/ })).toHaveCount(0);
    await expect(sheetA.getByRole("heading", { name: "Staff notes · 1" })).toBeVisible();
    await expect(sheetA).toContainText(fixture.noteA);
    await expect(sheetA.getByRole("heading", { name: "Call history · 1" })).toBeVisible();
    await expect(
      sheetB.getByRole("heading", { name: `Staff notes · ${BULK_NOTES}` }),
    ).toBeVisible();
    await expect(sheetB).toContainText(`TEST print boundary bulk note ${BULK_NOTES}`);
    await expect(sheetB).toContainText("TEST print boundary bulk note 1");
    await expect(sheetB).not.toContainText(fixture.noteA);
    await expect(sheetB.getByRole("heading", { name: /^Call history/ })).toHaveCount(0);

    const { data, error } = await db
      .from("audit_log")
      .select("id, entity, entity_id, detail")
      .eq("actor_email", author)
      .eq("action", "requests.print_new")
      .contains("detail", { request_ids: [fixture.ids.a] });
    expect(error).toBeNull();
    const rows = z
      .array(
        z.object({
          id: z.string(),
          entity: z.string(),
          entity_id: z.string().nullable(),
          detail: z.unknown(),
        }),
      )
      .parse(data ?? []);
    auditIds.push(...rows.map((row) => row.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].entity).toBe("requests");
    expect(rows[0].entity_id).toBeNull();
    expect(rows[0].detail).toEqual({
      row_count: 3,
      status_filter: null,
      request_ids: [fixture.ids.c, fixture.ids.a, fixture.ids.b],
    });
    expectNoPatientLeak(jsonSchema.parse(rows[0].detail), fixture.noteA);
    for (const name of Object.values(fixture.names))
      expect(JSON.stringify(rows[0].detail)).not.toContain(name);
  } finally {
    if (auditIds.length > 0) await db.from("audit_log").delete().in("id", auditIds);
    await disposeFixture(fixture);
  }
});
