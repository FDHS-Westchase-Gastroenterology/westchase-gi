import { randomUUID } from "node:crypto";

import { test, expect } from "@playwright/test";
import { z } from "zod";

import { asJsonNumber, asJsonObject, jsonSchema } from "../../src/lib/json";
import { requireDecoded } from "../harness/assert";
import { serviceDb } from "../harness/env";
import {
  expectNoPatientLeak,
  expectUuid,
  insertRequest,
  lifecycleRowSchema,
  queryTestDatabase,
  requestEventSchema,
} from "./support";
import type { CallOutcomeAuditDetail } from "./support";

test.use({ trace: "off" });

test.describe("Legacy call-outcome RPCs and their undo", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "The dependency contract runs once.");
  });

  test("records and undoes all seven call outcomes atomically", async () => {
    const db = serviceDb();
    const actor = `call-outcome-${randomUUID()}@example.test`;
    const followUpAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const requestIds: string[] = [];
    const cases = [
      {
        outcome: "booked",
        note: "TEST appointment booked.",
        followUpAt: null,
        status: "booked",
        disposition: null,
        closureReason: null,
        handedOff: true,
      },
      {
        outcome: "scheduled_transferred",
        note: "TEST appointment transferred.",
        followUpAt: null,
        status: "booked",
        disposition: null,
        closureReason: null,
        handedOff: true,
      },
      {
        outcome: "reached_follow_up",
        note: "TEST patient asked for another call.",
        followUpAt,
        status: "contacted",
        disposition: null,
        closureReason: null,
        handedOff: false,
      },
      {
        outcome: "voicemail",
        note: "TEST voicemail left.",
        followUpAt,
        status: "contacted",
        disposition: null,
        closureReason: null,
        handedOff: false,
      },
      {
        outcome: "no_answer",
        note: null,
        followUpAt,
        status: "contacted",
        disposition: null,
        closureReason: null,
        handedOff: false,
      },
      {
        outcome: "wont_schedule",
        note: null,
        followUpAt: null,
        status: "closed",
        disposition: null,
        closureReason: "wont_schedule",
        handedOff: false,
      },
      {
        outcome: "not_actionable",
        note: "TEST duplicate request.",
        followUpAt: null,
        status: "closed",
        disposition: null,
        closureReason: "not_actionable",
        handedOff: false,
      },
    ] as const;

    try {
      for (const item of cases) {
        const requestId = randomUUID();
        requestIds.push(requestId);
        await insertRequest(db, {
          id: requestId,
          name: `TEST call outcome ${item.outcome}`,
          source_path: "/e2e/call-outcome",
        });

        const result = await db.rpc("portal_log_call_outcome", {
          p_actor_email: actor,
          p_request_id: requestId,
          p_outcome: item.outcome,
          p_note: item.note,
          p_follow_up_at: item.followUpAt,
        });
        expect(result.error).toBeNull();
        expectUuid(z.string().parse(result.data));
        const eventId = String(result.data);

        const row = await db
          .from("requests")
          .select(
            "status, follow_up_at, closure_disposition, closure_reason, closed_at, record_handoff_at",
          )
          .eq("id", requestId)
          .single();
        expect(row.error).toBeNull();
        const lifecycle = requireDecoded(
          lifecycleRowSchema.safeParse(row.data),
          "Call-outcome request row could not be decoded",
        );
        expect(lifecycle).toMatchObject({
          status: item.status,
          closure_disposition: item.disposition,
          closure_reason: item.closureReason,
        });
        expect(
          lifecycle.follow_up_at !== null && lifecycle.follow_up_at !== ""
            ? new Date(lifecycle.follow_up_at).toISOString()
            : null,
        ).toBe(item.followUpAt);
        expect(lifecycle.closed_at !== null && lifecycle.closed_at !== "").toBe(
          item.status === "closed",
        );
        expect(lifecycle.record_handoff_at !== null && lifecycle.record_handoff_at !== "").toBe(
          item.handedOff,
        );

        const events = await db
          .from("request_events")
          .select("id, type, status, meta")
          .eq("request_id", requestId);
        expect(events.error).toBeNull();
        const eventRows = requireDecoded(
          z.array(requestEventSchema).safeParse(events.data ?? []),
          "Call-outcome events could not be decoded",
        );
        const outcomeEvents = eventRows.filter(({ type }) => type === "call_outcome");
        const noteEvents = eventRows.filter(({ type }) => type === "note");
        expect(outcomeEvents).toHaveLength(1);
        expect(outcomeEvents[0]).toMatchObject({
          id: eventId,
          status: "recorded",
          meta: {
            outcome: item.outcome,
            author_email: actor,
            lifecycle: {
              version: 1,
              before: {
                status: "new",
                follow_up_at: null,
                closure_disposition: null,
                closed_at: null,
                record_handoff_at: null,
              },
              after: {
                status: item.status,
                closure_disposition: item.disposition,
              },
            },
          },
        });
        const outcomeMeta = asJsonObject(outcomeEvents[0].meta);
        const outcomeLifecycle = outcomeMeta !== null ? asJsonObject(outcomeMeta.lifecycle) : null;
        expect(asJsonNumber(outcomeLifecycle?.sequence)).toBe(1);
        const outcomeFollowUp = z.string().safeParse(outcomeMeta?.follow_up_at);
        expect(outcomeFollowUp.success ? new Date(outcomeFollowUp.data).toISOString() : null).toBe(
          item.followUpAt,
        );
        expect(noteEvents).toHaveLength(item.note !== null ? 1 : 0);
        if (item.note !== null) {
          expect(noteEvents[0]).toMatchObject({
            status: "recorded",
            meta: { text: item.note, author_email: actor },
          });
        }

        const audits = await db
          .from("audit_log")
          .select("action, source, correlation_id, detail")
          .eq("entity_id", requestId);
        expect(audits.error).toBeNull();
        expect(audits.data).toHaveLength(1);
        const callOutcomeDetail: CallOutcomeAuditDetail = {
          outcome: item.outcome,
          to: item.status,
          note_attached: item.note !== null,
        };
        if (item.note !== null) {
          callOutcomeDetail.note_length = item.note.length;
        }
        expect(audits.data?.[0]).toMatchObject({
          action: "request.call_outcome",
          source: "staff",
          detail: callOutcomeDetail,
        });
        expectUuid(z.string().parse(audits.data?.[0].correlation_id));
        const auditDetail = asJsonObject(jsonSchema.parse(audits.data?.[0].detail ?? null));
        const auditFollowUp = z.string().safeParse(auditDetail?.follow_up_at);
        expect(auditFollowUp.success ? new Date(auditFollowUp.data).toISOString() : null).toBe(
          item.followUpAt,
        );
        expectNoPatientLeak(jsonSchema.parse(audits.data?.[0].detail ?? null), item.note);
        expectNoPatientLeak(jsonSchema.parse(outcomeEvents[0].meta ?? null), item.note);

        const undone = await db.rpc("portal_undo_call_outcome", {
          p_actor_email: actor,
          p_request_id: requestId,
          p_event_id: eventId,
        });
        expect(undone.error).toBeNull();
        expect(undone.data).toEqual({ status: "new" });

        const restored = await db
          .from("requests")
          .select("status, follow_up_at, closure_disposition, closed_at, record_handoff_at")
          .eq("id", requestId)
          .single();
        expect(restored.data).toEqual({
          status: "new",
          follow_up_at: null,
          closure_disposition: null,
          closed_at: null,
          record_handoff_at: null,
        });

        const finalEvents = await db
          .from("request_events")
          .select("id, type, status, meta")
          .eq("request_id", requestId);
        expect(finalEvents.error).toBeNull();
        const original = finalEvents.data?.find(({ id }) => id === eventId);
        expect(original).toMatchObject({
          type: "call_outcome",
          status: "undone",
          meta: { outcome: item.outcome },
        });
        const undoEvents = (finalEvents.data ?? []).filter(
          ({ type }) => type === "call_outcome_undo",
        );
        expect(undoEvents).toHaveLength(1);
        expect(undoEvents[0]).toMatchObject({
          status: "recorded",
          meta: {
            target_event_id: eventId,
            outcome: item.outcome,
            author_email: actor,
            restored_status: "new",
          },
        });
        expect((finalEvents.data ?? []).filter(({ type }) => type === "note")).toHaveLength(
          item.note !== null ? 1 : 0,
        );

        const undoAudits = await db
          .from("audit_log")
          .select("action, source, correlation_id, detail")
          .eq("entity_id", requestId)
          .eq("action", "request.call_outcome_undo");
        expect(undoAudits.error).toBeNull();
        expect(undoAudits.data).toHaveLength(1);
        expect(undoAudits.data?.[0]).toMatchObject({
          action: "request.call_outcome_undo",
          source: "staff",
          detail: {
            target_event_id: eventId,
            outcome: item.outcome,
            from: item.status,
            to: "new",
            restored_lifecycle: {
              status: "new",
              follow_up_at: null,
              closure_disposition: null,
              closed_at: null,
              record_handoff_at: null,
            },
          },
        });
        expectUuid(z.string().parse(undoAudits.data?.[0].correlation_id));
        expectNoPatientLeak(jsonSchema.parse(undoAudits.data?.[0].detail ?? null), item.note);

        const duplicateUndo = await db.rpc("portal_undo_call_outcome", {
          p_actor_email: actor,
          p_request_id: requestId,
          p_event_id: eventId,
        });
        expect(duplicateUndo.error?.code).toBe("55000");
        expect(
          (
            await db
              .from("request_events")
              .select("id")
              .eq("request_id", requestId)
              .eq("type", "call_outcome_undo")
          ).data,
        ).toHaveLength(1);
      }

      const rollbackId = randomUUID();
      requestIds.push(rollbackId);
      await insertRequest(db, {
        id: rollbackId,
        name: "TEST atomic call-outcome rollback",
        source_path: "/e2e/call-outcome-rollback",
      });

      const forcedAuditFailure = await db.rpc("portal_log_call_outcome", {
        p_actor_email: "",
        p_request_id: rollbackId,
        p_outcome: "voicemail",
        p_note: "TEST this write must roll back.",
        p_follow_up_at: followUpAt,
      });
      expect(forcedAuditFailure.error?.code).toBe("23514");

      const oversizedNote = await db.rpc("portal_log_call_outcome", {
        p_actor_email: actor,
        p_request_id: rollbackId,
        p_outcome: "voicemail",
        p_note: "N".repeat(2001),
        p_follow_up_at: followUpAt,
      });
      expect(oversizedNote.error?.code).toBe("22023");

      const closingFollowUp = await db.rpc("portal_log_call_outcome", {
        p_actor_email: actor,
        p_request_id: rollbackId,
        p_outcome: "wont_schedule",
        p_follow_up_at: followUpAt,
      });
      expect(closingFollowUp.error?.code).toBe("22023");

      const unknownOutcome = await db.rpc("portal_log_call_outcome", {
        p_actor_email: actor,
        p_request_id: rollbackId,
        p_outcome: "maybe_later",
      });
      expect(unknownOutcome.error?.code).toBe("22023");

      const unchanged = await db
        .from("requests")
        .select("status, follow_up_at, closure_disposition, closed_at, record_handoff_at")
        .eq("id", rollbackId)
        .single();
      expect(unchanged.data).toEqual({
        status: "new",
        follow_up_at: null,
        closure_disposition: null,
        closed_at: null,
        record_handoff_at: null,
      });
      expect(
        (await db.from("request_events").select("id").eq("request_id", rollbackId)).data,
      ).toHaveLength(0);
      expect(
        (await db.from("audit_log").select("id").eq("entity_id", rollbackId)).data,
      ).toHaveLength(0);
    } finally {
      if (requestIds.length > 0) {
        await db.from("requests").delete().in("id", requestIds);
        await db.from("audit_log").delete().in("entity_id", requestIds);
      }
    }
  });

  test("restores every meaningful prior appointment-request-lifecycle shape exactly", async () => {
    const db = serviceDb();
    const actor = `undo-shapes-${randomUUID()}@example.test`;
    const requestIds: string[] = [];
    const followUpAt = "2026-08-03T14:30:00.000Z";
    const unconvertedClosedAt = "2026-07-24T15:10:00.000Z";
    const recordHandoffAt = "2026-07-25T16:22:00.000Z";
    const cases = [
      {
        name: "new",
        before: {
          status: "new",
          follow_up_at: null,
          closure_disposition: null,
          closed_at: null,
          record_handoff_at: null,
        },
        outcome: "booked",
      },
      {
        name: "contacted with follow-up",
        before: {
          status: "contacted",
          follow_up_at: followUpAt,
          closure_disposition: null,
          closed_at: null,
          record_handoff_at: null,
        },
        outcome: "wont_schedule",
      },
      {
        name: "booked after scheduled backfill",
        before: {
          status: "booked",
          follow_up_at: null,
          closure_disposition: null,
          closed_at: null,
          record_handoff_at: recordHandoffAt,
        },
        outcome: "no_answer",
      },
      {
        name: "closed unconverted after backfill",
        before: {
          status: "closed",
          follow_up_at: null,
          closure_disposition: null,
          closed_at: unconvertedClosedAt,
          record_handoff_at: null,
          closure_provenance: "migration_unconverted",
        },
        outcome: "booked",
      },
      {
        name: "booked after converted-close backfill",
        before: {
          status: "booked",
          follow_up_at: null,
          closure_disposition: null,
          closed_at: null,
          record_handoff_at: recordHandoffAt,
        },
        outcome: "voicemail",
      },
    ] as const;

    const normalizeLifecycle = (
      row: Readonly<{
        status: string;
        follow_up_at: string | null;
        closure_disposition: string | null;
        closed_at: string | null;
        record_handoff_at: string | null;
        closure_provenance?: string | null;
      }>,
    ) => {
      const normalized = {
        status: row.status,
        follow_up_at:
          row.follow_up_at !== null && row.follow_up_at !== ""
            ? new Date(row.follow_up_at).toISOString()
            : null,
        closure_disposition: row.closure_disposition,
        closed_at:
          row.closed_at !== null && row.closed_at !== ""
            ? new Date(row.closed_at).toISOString()
            : null,
        record_handoff_at:
          row.record_handoff_at !== null && row.record_handoff_at !== ""
            ? new Date(row.record_handoff_at).toISOString()
            : null,
      };
      if (
        row.closure_provenance !== undefined &&
        row.closure_provenance !== null &&
        row.closure_provenance !== ""
      ) {
        return { ...normalized, closure_provenance: row.closure_provenance };
      }
      return normalized;
    };

    try {
      for (const item of cases) {
        const requestId = randomUUID();
        requestIds.push(requestId);
        await insertRequest(db, {
          id: requestId,
          name: `TEST undo previous ${item.name}`,
          source_path: "/e2e/call-outcome-undo-shapes",
          ...item.before,
        });

        const saved = await db.rpc("portal_log_call_outcome", {
          p_actor_email: actor,
          p_request_id: requestId,
          p_outcome: item.outcome,
          p_note:
            item.name === "booked after converted-close backfill"
              ? "TEST note remains after lifecycle undo."
              : null,
          p_follow_up_at:
            item.outcome === "no_answer" || item.outcome === "voicemail" ? followUpAt : null,
        });
        expect(saved.error).toBeNull();

        const savedEventId = z.string().parse(saved.data);
        const undone = await db.rpc("portal_undo_call_outcome", {
          p_actor_email: actor,
          p_request_id: requestId,
          p_event_id: savedEventId,
        });
        expect(undone.error).toBeNull();
        expect(undone.data).toEqual({ status: item.before.status });

        const restored = await db
          .from("requests")
          .select(
            "status, follow_up_at, closure_disposition, closed_at, record_handoff_at, closure_provenance",
          )
          .eq("id", requestId)
          .single();
        expect(restored.error).toBeNull();
        expect(normalizeLifecycle(lifecycleRowSchema.parse(restored.data))).toEqual(item.before);

        if (item.name === "booked after converted-close backfill") {
          const notes = await db
            .from("request_events")
            .select("status, meta")
            .eq("request_id", requestId)
            .eq("type", "note");
          expect(notes.data).toEqual([
            {
              status: "recorded",
              meta: {
                text: "TEST note remains after lifecycle undo.",
                author_email: actor,
              },
            },
          ]);
        }
      }
    } finally {
      if (requestIds.length > 0) {
        await db.from("requests").delete().in("id", requestIds);
        await db.from("audit_log").delete().in("entity_id", requestIds);
      }
    }
  });

  test("rejects stale, mismatched, missing, invalid, and malformed undo tokens", async () => {
    const db = serviceDb();
    const actor = `undo-rejection-${randomUUID()}@example.test`;
    const firstRequestId = randomUUID();
    const secondRequestId = randomUUID();
    const requestIds = [firstRequestId, secondRequestId];
    const callAgainAt = "2026-08-03T14:30:00.000Z";

    try {
      await insertRequest(db, {
        id: firstRequestId,
        name: "TEST undo rejection first",
        source_path: "/e2e/call-outcome-undo-rejection",
      });
      await insertRequest(db, {
        id: secondRequestId,
        name: "TEST undo rejection second",
        source_path: "/e2e/call-outcome-undo-rejection",
      });

      const firstSave = await db.rpc("portal_log_call_outcome", {
        p_actor_email: actor,
        p_request_id: firstRequestId,
        p_outcome: "no_answer",
        p_follow_up_at: callAgainAt,
      });
      expect(firstSave.error).toBeNull();
      const firstEventId = z.string().parse(firstSave.data);

      const missingRequest = await db.rpc("portal_undo_call_outcome", {
        p_actor_email: actor,
        p_request_id: randomUUID(),
        p_event_id: firstEventId,
      });
      expect(missingRequest.error?.code).toBe("P0002");

      const missingEvent = await db.rpc("portal_undo_call_outcome", {
        p_actor_email: actor,
        p_request_id: firstRequestId,
        p_event_id: randomUUID(),
      });
      expect(missingEvent.error?.code).toBe("P0002");

      const mismatched = await db.rpc("portal_undo_call_outcome", {
        p_actor_email: actor,
        p_request_id: secondRequestId,
        p_event_id: firstEventId,
      });
      expect(mismatched.error?.code).toBe("P0002");

      const invalidActor = await db.rpc("portal_undo_call_outcome", {
        p_actor_email: " ",
        p_request_id: firstRequestId,
        p_event_id: firstEventId,
      });
      expect(invalidActor.error?.code).toBe("22023");

      const laterSave = await db.rpc("portal_log_call_outcome", {
        p_actor_email: actor,
        p_request_id: firstRequestId,
        p_outcome: "booked",
      });
      expect(laterSave.error).toBeNull();

      const stale = await db.rpc("portal_undo_call_outcome", {
        p_actor_email: actor,
        p_request_id: firstRequestId,
        p_event_id: firstEventId,
      });
      expect(stale.error?.code).toBe("55000");
      const laterState = await db
        .from("requests")
        .select("status, follow_up_at, closure_disposition, closed_at, record_handoff_at")
        .eq("id", firstRequestId)
        .single();
      expect(laterState.data).toEqual({
        status: "booked",
        follow_up_at: null,
        closure_disposition: null,
        closed_at: null,
        record_handoff_at: expect.any(String),
      });
      expect(
        (
          await db
            .from("request_events")
            .select("id")
            .eq("request_id", firstRequestId)
            .eq("type", "call_outcome_undo")
        ).data,
      ).toHaveLength(0);

      const malformedSave = await db.rpc("portal_log_call_outcome", {
        p_actor_email: actor,
        p_request_id: secondRequestId,
        p_outcome: "voicemail",
        p_follow_up_at: callAgainAt,
      });
      expect(malformedSave.error).toBeNull();
      const malformedEventId = z.string().parse(malformedSave.data);
      const malformedUpdate = await db
        .from("request_events")
        .update({
          meta: {
            outcome: "voicemail",
            author_email: actor,
            lifecycle: {
              version: 1,
              sequence: 1,
              before: { status: "new" },
              after: { status: "contacted" },
            },
          },
        })
        .eq("id", malformedEventId);
      expect(malformedUpdate.error).toBeNull();

      const malformed = await db.rpc("portal_undo_call_outcome", {
        p_actor_email: actor,
        p_request_id: secondRequestId,
        p_event_id: malformedEventId,
      });
      expect(malformed.error?.code).toBe("22023");
      expect(
        (await db.from("requests").select("status").eq("id", secondRequestId).single()).data,
      ).toEqual({ status: "contacted" });
      expect(
        (await db.from("request_events").select("status").eq("id", malformedEventId).single()).data,
      ).toEqual({ status: "recorded" });
    } finally {
      await db.from("requests").delete().in("id", requestIds);
      await db.from("audit_log").delete().in("entity_id", requestIds);
    }
  });

  test("rolls back an undo when its audit insert fails", async () => {
    test.skip(
      process.env.SUPABASE_PROJECT_REF !== "local" && process.env.SUPABASE_PREVIEW_BRANCH !== "1",
      "The forced audit failure requires an isolated test database.",
    );

    const db = serviceDb();
    const actor = `undo-audit-rollback-${randomUUID()}@example.test`;
    const requestId = randomUUID();
    const constraintName = "audit_log_test_reject_call_outcome_undo";
    try {
      await insertRequest(db, {
        id: requestId,
        name: "TEST undo audit rollback",
        source_path: "/e2e/call-outcome-undo-audit-rollback",
      });

      const saved = await db.rpc("portal_log_call_outcome", {
        p_actor_email: actor,
        p_request_id: requestId,
        p_outcome: "booked",
      });
      expect(saved.error).toBeNull();
      const savedEventId = z.string().parse(saved.data);

      queryTestDatabase(
        `alter table public.audit_log add constraint ${constraintName} check (action <> 'request.call_outcome_undo') not valid`,
      );

      const undo = await db.rpc("portal_undo_call_outcome", {
        p_actor_email: actor,
        p_request_id: requestId,
        p_event_id: savedEventId,
      });
      expect(undo.error?.code).toBe("23514");

      expect(
        (
          await db
            .from("requests")
            .select("status, follow_up_at, closure_disposition, closed_at, record_handoff_at")
            .eq("id", requestId)
            .single()
        ).data,
      ).toEqual({
        status: "booked",
        follow_up_at: null,
        closure_disposition: null,
        closed_at: null,
        record_handoff_at: expect.any(String),
      });
      expect(
        (await db.from("request_events").select("status").eq("id", savedEventId).single()).data,
      ).toEqual({ status: "recorded" });
      expect(
        (
          await db
            .from("request_events")
            .select("id")
            .eq("request_id", requestId)
            .eq("type", "call_outcome_undo")
        ).data,
      ).toHaveLength(0);
    } finally {
      try {
        queryTestDatabase(
          `alter table public.audit_log drop constraint if exists ${constraintName}`,
        );
      } finally {
        await db.from("requests").delete().eq("id", requestId);
        await db.from("audit_log").delete().eq("entity_id", requestId);
      }
    }
  });
});
