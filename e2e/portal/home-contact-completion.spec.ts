import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { z } from "zod";

import { CONTACT_COMPLETION_LABELS } from "../../src/app/admin/(portal)/requests/format";
import { requireDecoded } from "../harness/assert";
import { runId, serviceDb } from "../harness/env";
import { signIn } from "../harness/session";

const completionPayload = z.tuple([
  z.strictObject({
    requestId: z.uuid(),
    expectedVersion: z.number(),
    idempotencyKey: z.uuid(),
    outcome: z.enum(["no_answer", "reached"]),
  }),
]);

async function openCard(page: Page, name: string): Promise<void> {
  await page.goto("/admin");
  await page.getByRole("button", { name: new RegExp(name, "u") }).click();
  await expect(page.getByRole("radio", { name: "No answer", exact: true })).toBeVisible();
}

for (const status of ["new", "contacted"] as const) {
  for (const [answer, outcome] of [
    ["No answer", "no_answer"],
    ["Contacted", "reached"],
  ] as const) {
    test(`${status}: Home ${answer} + No call completes contact once and Undo restores it`, async ({
      page,
    }) => {
      const db = serviceDb();
      const id = randomUUID();
      const name = `TEST Home completion ${runId} ${status} ${outcome}`;
      const callback =
        status === "contacted" ? new Date(Date.now() + 86_400_000).toISOString() : null;
      const staged = await db.from("requests").insert({
        id,
        name,
        phone: "8135550199",
        location: "tampa",
        preferred_time: "morning",
        locale: "en",
        source_path: `/e2e/home-completion/${runId}`,
        status,
        follow_up_at: callback,
      });
      expect(staged.error).toBeNull();
      try {
        await signIn(page);
        await openCard(page, name);
        await page.getByRole("radio", { name: answer, exact: true }).click();
        await page.getByRole("button", { name: "No call", exact: true }).click();
        await expect(page.locator(".wgi-record-cal")).toHaveAttribute("data-idle", "true");
        await expect(page.locator(".wgi-record-cal button[data-day]:enabled")).toHaveCount(0);

        const sending = page.waitForRequest(
          (request) =>
            request.method() === "POST" &&
            Boolean(request.headers()["next-action"]) &&
            (request.postData()?.includes(id) ?? false),
        );
        await page.getByRole("button", { name: "Save", exact: true }).click();
        const sent = await sending;
        const payload = requireDecoded(
          completionPayload.safeParse(JSON.parse(sent.postData() ?? "null")),
          "Home must send a contact completion without a callback or closure reason",
        );
        expect(payload[0]).toMatchObject({ requestId: id, expectedVersion: 1, outcome });
        await expect(page.getByRole("status")).toContainText("Request closed.");

        const current = async () =>
          db
            .from("requests")
            .select("status,version,follow_up_at,closure_reason,appointment_at,record_handoff_at")
            .eq("id", id)
            .single();
        const completed = await current();
        expect(completed.error).toBeNull();
        expect(completed.data).toMatchObject({
          status: "closed",
          version: 2,
          follow_up_at: null,
          closure_reason: "no_further_contact",
          appointment_at: null,
          record_handoff_at: null,
        });
        const events = async () =>
          db.from("request_events").select("type,meta").eq("request_id", id);
        const completedEvents = await events();
        expect(completedEvents.error).toBeNull();
        expect(completedEvents.data).toEqual([
          {
            type: "contact_completed",
            meta: expect.objectContaining({ outcome, closure_reason: "no_further_contact" }),
          },
        ]);

        const headers = sent.headers();
        const replay = await page.request.post(sent.url(), {
          headers,
          data: sent.postData() ?? "",
        });
        expect(replay.ok()).toBe(true);
        expect((await events()).data).toEqual(completedEvents.data);
        expect((await current()).data).toEqual(completed.data);

        const stale = await page.request.post(sent.url(), {
          headers,
          data: JSON.stringify([{ ...payload[0], idempotencyKey: randomUUID() }]),
        });
        expect(stale.ok()).toBe(true);
        expect(await stale.text()).toContain("stale_version");
        expect((await events()).data).toEqual(completedEvents.data);
        expect((await current()).data).toEqual(completed.data);

        await page.goto(`/admin/requests/${id}`);
        const history = page.getByTestId("request-history");
        await expect(history).toContainText(
          `${CONTACT_COMPLETION_LABELS[outcome]} — request closed; no further contact needed`,
        );
        await page.reload();
        await expect(history).toContainText("no further contact needed");
        await expect(page.getByTestId("undo-latest")).toBeVisible();
        await page.getByTestId("undo-latest").click();
        await expect(page.getByTestId("workflow-feedback")).toContainText("Undone");
        const restored = await current();
        expect(restored.error).toBeNull();
        expect(restored.data).toMatchObject({
          status,
          version: 3,
          closure_reason: null,
          appointment_at: null,
          record_handoff_at: null,
        });
        const restoredCallback = requireDecoded(
          z.object({ follow_up_at: z.string().nullable() }).safeParse(restored.data),
          "Undo must return the prior callback",
        ).follow_up_at;
        expect(restoredCallback === null ? null : new Date(restoredCallback).toISOString()).toBe(
          callback,
        );
        await page.reload();
        await expect(history).toContainText("no further contact needed");
        await expect(page.getByTestId("undo-latest")).toHaveCount(0);
      } finally {
        await db.from("requests").delete().eq("id", id);
        await db.from("audit_log").delete().eq("entity_id", id);
      }
    });
  }
}
