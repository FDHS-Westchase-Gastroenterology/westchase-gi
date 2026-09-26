import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { z } from "zod";

import { jsonSchema } from "../../src/lib/json";
import { CONTACT_COMPLETION_RESULTS } from "../../src/lib/portal/workflow/contact-completion";
import { requireDecoded } from "../harness/assert";
import { serviceDb } from "../harness/env";
import { commandOutcomeSchema, expectNoPatientLeak, insertRequest } from "./support";

test.use({ trace: "off" });

function completion(outcome: string, occurredAt: string) {
  return {
    command: "record_contact_and_close",
    state: "closed",
    callAgainAt: null,
    bookingConfirmedAt: null,
    appointmentAt: null,
    closedAt: occurredAt,
    closureReason: "no_further_contact",
    legacyReviewRequired: false,
    reasonCode: outcome,
    occurredAt,
  };
}

test.describe("Contact completion boundaries", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "The dependency contract runs once.");
  });

  test("finishes all contact results from New and Contacted, then restores the whole prior state", async () => {
    const db = serviceDb();
    const requestIds: string[] = [];
    const occurredAt = new Date().toISOString();
    const callback = new Date(Date.now() + 86_400_000).toISOString();
    try {
      for (const state of ["new", "contacted"]) {
        for (const outcome of CONTACT_COMPLETION_RESULTS) {
          const requestId = randomUUID();
          requestIds.push(requestId);
          await insertRequest(db, {
            id: requestId,
            name: "TEST contact completion patient",
            status: state,
            follow_up_at: state === "contacted" ? callback : null,
          });
          const args = {
            p_actor_email: "contact-completion@example.test",
            p_request_id: requestId,
            p_expected_version: 1,
            p_idempotency_key: randomUUID(),
            p_fingerprint: "a".repeat(64),
            p_decision: completion(outcome, occurredAt),
          };
          const saved = await db.rpc("portal_execute_request_command", args);
          expect(saved.error).toBeNull();
          const result = requireDecoded(
            commandOutcomeSchema.safeParse(saved.data),
            "Contact completion result was invalid",
          );
          expect(result).toMatchObject({ ok: true, state: "closed" });
          expect(saved.data).toMatchObject({ version: 2, callAgainAt: null, appointmentAt: null });
          expectNoPatientLeak(
            requireDecoded(
              jsonSchema.safeParse(saved.data),
              "Contact completion response was invalid",
            ),
          );
          const current = await db
            .from("requests")
            .select("status,version,follow_up_at,closed_at,closure_reason")
            .eq("id", requestId)
            .single();
          expect(current.error).toBeNull();
          expect(current.data).toMatchObject({
            status: "closed",
            version: 2,
            follow_up_at: null,
            closure_reason: "no_further_contact",
          });
          const events = await db
            .from("request_events")
            .select("type,meta")
            .eq("request_id", requestId);
          expect(events.error).toBeNull();
          expect(events.data).toEqual([
            {
              type: "contact_completed",
              meta: {
                outcome,
                closure_reason: "no_further_contact",
                author_email: args.p_actor_email,
              },
            },
          ]);
          expect(
            (await db.from("request_transitions").select("id").eq("request_id", requestId)).data,
          ).toHaveLength(1);
          expect(
            (await db.from("request_command_receipts").select("id").eq("request_id", requestId))
              .data,
          ).toHaveLength(1);
          const replay = await db.rpc("portal_execute_request_command", args);
          expect(replay.error).toBeNull();
          expect(replay.data).toEqual(saved.data);
          const undone = await db.rpc("portal_execute_request_command", {
            ...args,
            p_expected_version: 2,
            p_idempotency_key: randomUUID(),
            p_fingerprint: "b".repeat(64),
            p_transition_id: result.undo?.transitionId,
            p_decision: { command: "undo_latest_transition", occurredAt },
          });
          expect(undone.error).toBeNull();
          expect(undone.data).toMatchObject({ ok: true, state, version: 3, undo: null });
          const restored = await db
            .from("requests")
            .select("status,version,follow_up_at,closed_at,closure_reason")
            .eq("id", requestId)
            .single();
          expect(restored.error).toBeNull();
          expect(restored.data).toMatchObject({
            status: state,
            version: 3,
            closed_at: null,
            closure_reason: null,
          });
          const restoredCallback = requireDecoded(
            z.object({ follow_up_at: z.string().nullable() }).safeParse(restored.data),
            "Restored callback was invalid",
          ).follow_up_at;
          expect(restoredCallback === null ? null : new Date(restoredCallback).toISOString()).toBe(
            state === "contacted" ? callback : null,
          );
        }
      }
    } finally {
      await db.from("requests").delete().in("id", requestIds);
      await db.from("audit_log").delete().in("entity_id", requestIds);
    }
  });

  test("simultaneous identical saves share one result and competing decisions reject stale versions", async () => {
    const db = serviceDb();
    const requestIds: string[] = [];
    try {
      for (const identical of [true, false]) {
        const requestId = randomUUID();
        requestIds.push(requestId);
        await insertRequest(db, { id: requestId, name: "TEST concurrent contact completion" });
        const args = {
          p_actor_email: "contact-race@example.test",
          p_request_id: requestId,
          p_expected_version: 1,
          p_idempotency_key: randomUUID(),
          p_fingerprint: "c".repeat(64),
          p_decision: completion("no_answer", new Date().toISOString()),
        };
        const responses = await Promise.all([
          db.rpc("portal_execute_request_command", args),
          db.rpc("portal_execute_request_command", {
            ...args,
            p_idempotency_key: identical ? args.p_idempotency_key : randomUUID(),
          }),
        ]);
        for (const response of responses) expect(response.error).toBeNull();
        const outcomes = responses.map(({ data }) =>
          requireDecoded(
            commandOutcomeSchema.safeParse(data),
            "Concurrent completion result was invalid",
          ),
        );
        if (identical) {
          expect(outcomes.every(({ ok }) => ok)).toBe(true);
          expect(responses[0].data).toEqual(responses[1].data);
        } else {
          expect(outcomes.filter(({ ok }) => ok)).toHaveLength(1);
          expect(outcomes.find(({ ok }) => !ok)).toMatchObject({
            code: "stale_version",
            current: { version: 2 },
          });
        }
        expect(
          (await db.from("request_transitions").select("id").eq("request_id", requestId)).data,
        ).toHaveLength(1);
        expect(
          (await db.from("request_command_receipts").select("id").eq("request_id", requestId)).data,
        ).toHaveLength(1);
        expect(
          (await db.from("request_events").select("id").eq("request_id", requestId)).data,
        ).toHaveLength(1);
      }
    } finally {
      await db.from("requests").delete().in("id", requestIds);
      await db.from("audit_log").delete().in("entity_id", requestIds);
    }
  });

  test("invalid intent and a failing history write leave no partial contact or closure", async () => {
    const db = serviceDb();
    const requestId = randomUUID();
    await insertRequest(db, { id: requestId, name: "TEST invalid contact completion" });
    const occurredAt = new Date().toISOString();
    const args = {
      p_actor_email: "contact-invalid@example.test",
      p_request_id: requestId,
      p_expected_version: 1,
      p_idempotency_key: randomUUID(),
      p_fingerprint: "d".repeat(64),
      p_decision: completion("reached", occurredAt),
    };
    try {
      for (const patch of [
        { reasonCode: null },
        { reasonCode: "reached_follow_up" },
        { closureReason: "wont_schedule" },
        { closedAt: null },
        { closedAt: "2020-01-01T00:00:00.000Z" },
        { callAgainAt: occurredAt },
        { appointmentAt: occurredAt },
        { state: "contacted" },
        { command: "close_request", reasonCode: "not_actionable" },
        { command: "classify_legacy_closure", reasonCode: "not_actionable" },
      ]) {
        const rejected = await db.rpc("portal_execute_request_command", {
          ...args,
          p_decision: { ...args.p_decision, ...patch },
        });
        expect(rejected.error).toBeNull();
        expect(rejected.data).toEqual({ ok: false, code: "invalid_command" });
      }
      const failedHistory = await db.rpc("portal_execute_request_command", {
        ...args,
        p_actor_email: "",
      });
      expect(failedHistory.error?.code).toBe("23514");
      expect(
        (
          await db
            .from("requests")
            .select("status,version,closed_at,closure_reason")
            .eq("id", requestId)
            .single()
        ).data,
      ).toMatchObject({ status: "new", version: 1, closed_at: null, closure_reason: null });
      for (const table of ["request_events", "request_transitions", "request_command_receipts"]) {
        expect((await db.from(table).select("id").eq("request_id", requestId)).data).toHaveLength(
          0,
        );
      }
      expect(
        (await db.from("audit_log").select("id").eq("entity_id", requestId)).data,
      ).toHaveLength(0);
    } finally {
      await db.from("requests").delete().eq("id", requestId);
      await db.from("audit_log").delete().eq("entity_id", requestId);
    }
  });
});
