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
      appointment_at: oldYear,
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

  test("retains future, recent, unknown, and held appointments after the booking record ages out", async () => {
    const db = serviceDb();
    const now = new Date();
    const oldBooking = new Date(now.getTime() - 400 * 86_400_000).toISOString();
    const recentAppointment = new Date(now.getTime() - 30 * 86_400_000).toISOString();
    const futureAppointment = new Date(now.getTime() + 34 * 86_400_000).toISOString();
    const pastCutoff = new Date(now);
    pastCutoff.setUTCFullYear(pastCutoff.getUTCFullYear() - 1);
    // Match Postgres's February cutoff in a leap year.
    if (now.getUTCMonth() === 1 && now.getUTCDate() === 29) {
      pastCutoff.setUTCDate(0);
    }
    const justInsideRetention = new Date(pastCutoff.getTime() + 1).toISOString();
    const cases = [
      { label: "future", booking: oldBooking, appointment: futureAppointment, survives: true },
      { label: "recent", booking: oldBooking, appointment: recentAppointment, survives: true },
      { label: "unknown", booking: oldBooking, appointment: null, survives: true },
      {
        label: "recent booking",
        booking: now.toISOString(),
        appointment: oldBooking,
        survives: true,
      },
      {
        label: "just inside cutoff",
        booking: oldBooking,
        appointment: justInsideRetention,
        survives: true,
      },
      {
        label: "exact cutoff",
        booking: oldBooking,
        appointment: pastCutoff.toISOString(),
        survives: false,
      },
      { label: "expired", booking: oldBooking, appointment: oldBooking, survives: false },
      { label: "held", booking: oldBooking, appointment: oldBooking, survives: true, held: true },
    ].map((item) => ({ ...item, id: randomUUID() }));
    const requestIds = cases.map(({ id }) => id);
    const before = await db.rpc("portal_preview_data_lifecycle", { p_now: now.toISOString() });
    expect(before.error).toBeNull();
    const previewSchema = z.object({ converted_requests: z.number() });
    const baseline = requireDecoded(
      previewSchema.safeParse(before.data),
      "Lifecycle baseline was invalid",
    );
    try {
      for (const item of cases) {
        await insertRequest(db, {
          id: item.id,
          name: `TEST appointment retention ${item.label}`,
          status: "booked",
          record_handoff_at: item.booking,
          appointment_at: item.appointment,
          retention_hold_at: item.held === true ? oldBooking : null,
          retention_hold_by: item.held === true ? "retention-test@example.test" : null,
          retention_hold_reason: item.held === true ? "TEST legal hold" : null,
        });
      }
      const preview = await db.rpc("portal_preview_data_lifecycle", { p_now: now.toISOString() });
      expect(preview.error).toBeNull();
      expect(
        requireDecoded(previewSchema.safeParse(preview.data), "Lifecycle preview was invalid")
          .converted_requests,
      ).toBe(baseline.converted_requests + 2);
      const run = await db.rpc("portal_run_data_lifecycle", {
        p_actor_email: "retention-test@example.test",
        p_now: now.toISOString(),
      });
      expect(run.error).toBeNull();
      const remaining = await db.from("requests").select("id").in("id", requestIds);
      expect(remaining.error).toBeNull();
      const survivors = requireDecoded(
        z.array(idRowSchema).safeParse(remaining.data),
        "Survivors were invalid",
      );
      expect(survivors.map(({ id }) => id).sort()).toEqual(
        cases
          .filter(({ survives }) => survives)
          .map(({ id }) => id)
          .sort(),
      );
      const audits = await db
        .from("audit_log")
        .select("entity_id,detail")
        .eq("action", "request.retention_delete")
        .in("entity_id", requestIds);
      expect(audits.error).toBeNull();
      expect(audits.data).toHaveLength(2);
      for (const item of audits.data ?? []) {
        expect(item.detail).toMatchObject({ policy: "workflow_calendar_v3", state: "booked" });
      }
    } finally {
      await db.from("requests").delete().in("id", requestIds);
      await db.from("audit_log").delete().in("entity_id", requestIds);
    }
  });
});
