import { randomUUID } from "node:crypto";

import { test, expect } from "@playwright/test";
import { z } from "zod";

import { requireDecoded } from "../harness/assert";
import { serviceDb } from "../harness/env";
import { idRowSchema, insertRequest, lifecycleRunSchema } from "./support";

test.use({ trace: "off" });

test.describe("Data lifecycle boundaries", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "The dependency contract runs once.");
  });

  test("keeps legacy-review rows out of lifecycle deletion and exposes failed outbox work", async () => {
    const db = serviceDb();
    const now = new Date();
    const oldClosed = randomUUID();
    const oldBooked = randomUUID();
    const legacyReview = randomUUID();
    const heldClosed = randomUUID();
    const recipientId = randomUUID();
    const survivingRecipientId = randomUUID();
    const requestIds = [oldClosed, oldBooked, legacyReview, heldClosed];
    const old180 = new Date(now.getTime() - 181 * 86_400_000).toISOString();
    const oldYear = new Date(now.getTime() - 366 * 86_400_000).toISOString();
    const existingReviewCount = await db
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("legacy_review_required", true);
    expect(existingReviewCount.error).toBeNull();
    await db.from("notification_recipients").insert([
      {
        id: recipientId,
        email: `workflow-outbox-${randomUUID()}@example.test`,
        active: true,
      },
      {
        id: survivingRecipientId,
        email: `workflow-outbox-survivor-${randomUUID()}@example.test`,
        active: true,
      },
    ]);
    await insertRequest(db, {
      id: oldClosed,
      name: "TEST lifecycle closed",
      status: "closed",
      closed_at: old180,
      closure_reason: "not_actionable",
    });
    await insertRequest(db, {
      id: oldBooked,
      name: "TEST lifecycle booked",
      status: "booked",
      record_handoff_at: oldYear,
    });
    await insertRequest(db, {
      id: legacyReview,
      name: "TEST lifecycle review",
      status: "closed",
      legacy_review_required: true,
    });
    await insertRequest(db, {
      id: heldClosed,
      name: "TEST lifecycle held",
      status: "closed",
      closed_at: old180,
      closure_reason: "wont_schedule",
      retention_hold_at: old180,
      retention_hold_by: "test@example.test",
      retention_hold_reason: "TEST legal hold",
    });
    try {
      const failedOutbox = await db.from("notification_outbox").insert({
        request_id: legacyReview,
        recipient_id: recipientId,
        kind: "new_request",
        status: "failed",
        normalized_outcome: "transport_failure",
      });
      expect(failedOutbox.error).toBeNull();
      const preview = await db.rpc("portal_preview_data_lifecycle", {
        p_now: now.toISOString(),
      });
      expect(preview.data).toMatchObject({
        unconverted_requests: 1,
        converted_requests: 1,
        legacy_review_requests: (existingReviewCount.count ?? 0) + 1,
      });
      expect(
        (
          await db
            .from("notification_outbox")
            .select("status, normalized_outcome")
            .eq("request_id", legacyReview)
            .single()
        ).data,
      ).toEqual({
        status: "failed",
        normalized_outcome: "transport_failure",
      });
      const run = await db.rpc("portal_run_data_lifecycle", {
        p_actor_email: `lifecycle-${randomUUID()}@example.test`,
        p_now: now.toISOString(),
      });
      expect(run.error).toBeNull();
      expect(
        requireDecoded(lifecycleRunSchema.safeParse(run.data), "Lifecycle run could not be decoded")
          .requests_removed,
      ).toBe(2);
      const survivors = await db.from("requests").select("id").in("id", requestIds);
      expect(
        requireDecoded(
          z.array(idRowSchema).safeParse(survivors.data ?? []),
          "Survivor ids could not be decoded",
        )
          .map(({ id }) => id)
          .sort((left, right) => left.localeCompare(right)),
      ).toEqual([heldClosed, legacyReview].sort((left, right) => left.localeCompare(right)));

      const survivingOutbox = await db.from("notification_outbox").insert({
        request_id: legacyReview,
        recipient_id: survivingRecipientId,
        kind: "new_request",
      });
      expect(survivingOutbox.error).toBeNull();
      const removed = await db.rpc("portal_remove_notification_recipient", {
        p_actor_email: `lifecycle-${randomUUID()}@example.test`,
        p_recipient_id: recipientId,
      });
      expect(removed.error).toBeNull();
      expect(removed.data).toBe(true);
      const remainingOutbox = await db
        .from("notification_outbox")
        .select("recipient_id")
        .eq("request_id", legacyReview);
      expect(remainingOutbox.error).toBeNull();
      expect(remainingOutbox.data).toEqual([{ recipient_id: survivingRecipientId }]);
    } finally {
      await db.from("requests").delete().in("id", requestIds);
      await db
        .from("notification_recipients")
        .delete()
        .in("id", [recipientId, survivingRecipientId]);
      await db.from("audit_log").delete().in("entity_id", requestIds);
    }
  });
});
