import { randomUUID } from "node:crypto";

import { test, expect } from "@playwright/test";
import { z } from "zod";

import { jsonSchema } from "../../src/lib/json";
import { CONTACT_OUTCOMES } from "../../src/lib/portal/workflow/contracts";
import { requireDecoded, requireText } from "../harness/assert";
import { serviceDb } from "../harness/env";
import {
  APPOINTMENT_AT,
  commandOutcomeSchema,
  insertRequest,
  nullableTimestampSchema,
} from "./support";
import type { RequestInsert, WorkflowDecision } from "./support";

test.use({ trace: "off" });

test.describe("The workflow command RPC", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "The dependency contract runs once.");
  });

  test("enforces workflow version races and command idempotency", async () => {
    const db = serviceDb();
    const requestId = randomUUID();
    const actor = `workflow-race-${randomUUID()}@example.test`;
    const occurredAt = new Date().toISOString();
    // A booking carries no reason code and must state its appointment time, the
    // Same shape the client sends.
    const decision = (command: string, state: string, reasonCode?: string): WorkflowDecision => ({
      command,
      state,
      callAgainAt: null,
      bookingConfirmedAt: state === "booked" ? occurredAt : null,
      appointmentAt: state === "booked" ? APPOINTMENT_AT : null,
      closedAt: state === "closed" ? occurredAt : null,
      closureReason: state === "closed" ? (reasonCode ?? null) : null,
      legacyReviewRequired: false,
      reasonCode: state === "booked" ? null : (reasonCode ?? null),
      occurredAt,
    });
    const execute = (key: string, fingerprint: string, next: Readonly<WorkflowDecision>) =>
      db.rpc("portal_execute_request_command", {
        p_actor_email: actor,
        p_request_id: requestId,
        p_expected_version: 1,
        p_idempotency_key: key,
        p_fingerprint: fingerprint,
        p_decision: next,
      });

    await insertRequest(db, {
      id: requestId,
      name: "TEST workflow race private name",
      email: "workflow-race-patient@example.test",
      message: "TEST workflow race private message",
    });
    try {
      const race = await Promise.all([
        execute(
          randomUUID(),
          "a".repeat(64),
          decision("confirm_booking_handoff", "booked", "booked"),
        ),
        execute(
          randomUUID(),
          "b".repeat(64),
          decision("close_request", "closed", "not_actionable"),
        ),
      ]);
      expect(race.every(({ error }) => error === null)).toBe(true);
      const raceOutcomes = race.map(({ data }) =>
        requireDecoded(
          commandOutcomeSchema.safeParse(data),
          "Workflow race result could not be decoded",
        ),
      );
      expect(
        raceOutcomes.map(({ ok }) => ok).sort((left, right) => Number(left) - Number(right)),
      ).toEqual([false, true]);
      expect(raceOutcomes.find(({ ok }) => !ok)).toMatchObject({
        code: "stale_version",
        current: { version: 2 },
      });

      const acceptedIndex = raceOutcomes.findIndex(({ ok }) => ok);
      expect(acceptedIndex).toBeGreaterThanOrEqual(0);
      const accepted = requireDecoded(
        jsonSchema.safeParse(race[acceptedIndex]?.data),
        "Accepted workflow result could not be decoded",
      );
      const acceptedKey = await db
        .from("request_command_receipts")
        .select("idempotency_key, fingerprint")
        .eq("request_id", requestId)
        .single();
      expect(acceptedKey.error).toBeNull();
      const acceptedReceipt = requireDecoded(
        z
          .object({ idempotency_key: z.string(), fingerprint: z.string() })
          .safeParse(acceptedKey.data),
        "Accepted command receipt could not be decoded",
      );
      const replay = await execute(
        acceptedReceipt.idempotency_key,
        acceptedReceipt.fingerprint,
        decision("close_request", "closed", "not_actionable"),
      );
      expect(replay.error).toBeNull();
      const replayed = requireDecoded(
        jsonSchema.safeParse(replay.data),
        "Replayed workflow result could not be decoded",
      );
      expect(replayed).toEqual(accepted);

      const conflict = await execute(
        acceptedReceipt.idempotency_key,
        "c".repeat(64),
        decision("record_contact_attempt", "contacted", "no_answer"),
      );
      expect(conflict.data).toEqual({
        ok: false,
        code: "idempotency_conflict",
      });
      expect(
        (await db.from("request_transitions").select("id").eq("request_id", requestId)).data,
      ).toHaveLength(1);
      expect(
        (await db.from("request_command_receipts").select("id").eq("request_id", requestId)).data,
      ).toHaveLength(1);
    } finally {
      await db.from("requests").delete().eq("id", requestId);
      await db.from("audit_log").delete().eq("entity_id", requestId);
    }
  });

  test("rolls back decisions whose command does not match the recorded transition", async () => {
    const db = serviceDb();
    const actor = `workflow-semantic-boundary-${randomUUID()}@example.test`;
    const occurredAt = new Date().toISOString();
    const cases = [
      {
        command: "close_request",
        state: "booked",
        reasonCode: null,
        bookingConfirmedAt: occurredAt,
      },
      {
        command: "classify_legacy_closure",
        state: "booked",
        reasonCode: "booked",
        bookingConfirmedAt: occurredAt,
      },
    ] as const;
    const requestIds: string[] = [];

    try {
      for (const item of cases) {
        const requestId = randomUUID();
        requestIds.push(requestId);
        await insertRequest(db, {
          id: requestId,
          name: `TEST malformed ${item.command} decision`,
          source_path: "/e2e/workflow-semantic-boundary",
        });

        const result = await db.rpc("portal_execute_request_command", {
          p_actor_email: actor,
          p_request_id: requestId,
          p_expected_version: 1,
          p_idempotency_key: randomUUID(),
          p_fingerprint: "f".repeat(64),
          p_decision: {
            command: item.command,
            state: item.state,
            callAgainAt: null,
            bookingConfirmedAt: item.bookingConfirmedAt,
            appointmentAt: null,
            closedAt: null,
            closureReason: null,
            legacyReviewRequired: false,
            reasonCode: item.reasonCode,
            occurredAt,
          },
        });

        expect(result.error?.code).toBe("23514");
        expect(
          (await db.from("requests").select("status,version").eq("id", requestId).single()).data,
        ).toMatchObject({ status: "new", version: 1 });
        expect(
          (await db.from("request_transitions").select("id").eq("request_id", requestId)).data,
        ).toHaveLength(0);
        expect(
          (await db.from("request_command_receipts").select("id").eq("request_id", requestId)).data,
        ).toHaveLength(0);
        expect(
          (await db.from("audit_log").select("id").eq("entity_id", requestId)).data,
        ).toHaveLength(0);
      }
    } finally {
      await db.from("requests").delete().in("id", requestIds);
      await db.from("audit_log").delete().in("entity_id", requestIds);
    }
  });

  test("refuses a booking with no appointment time and records the one it accepts", async () => {
    const db = serviceDb();
    const requestId = randomUUID();
    const actor = `workflow-appointment-${randomUUID()}@example.test`;
    const occurredAt = new Date().toISOString();
    const book = (appointmentAt: string | null) =>
      db.rpc("portal_execute_request_command", {
        p_actor_email: actor,
        p_request_id: requestId,
        p_expected_version: 1,
        p_idempotency_key: randomUUID(),
        p_fingerprint: randomUUID().replaceAll("-", "").repeat(2),
        p_decision: {
          command: "confirm_booking_handoff",
          state: "booked",
          callAgainAt: null,
          bookingConfirmedAt: occurredAt,
          appointmentAt,
          closedAt: null,
          closureReason: null,
          legacyReviewRequired: false,
          reasonCode: null,
          occurredAt,
        },
      });

    await insertRequest(db, {
      id: requestId,
      name: "TEST appointment calendar private name",
      email: "appointment-calendar-patient@example.test",
      message: "TEST appointment calendar private message",
    });
    try {
      // The portal owns the calendar, so the server refuses a silent booking even
      // If a client forgets to send one.
      expect((await book(null)).data).toEqual({ ok: false, code: "invalid_command" });
      expect(
        (await db.from("requests").select("status,appointment_at").eq("id", requestId).single())
          .data,
      ).toMatchObject({ status: "new", appointment_at: null });

      const booked = requireDecoded(
        commandOutcomeSchema.safeParse((await book(APPOINTMENT_AT)).data),
        "Booking result could not be decoded",
      );
      expect(booked.ok).toBe(true);

      const stored = await db
        .from("requests")
        .select("status,appointment_at")
        .eq("id", requestId)
        .single();
      expect(stored.data?.status).toBe("booked");
      expect(new Date(String(stored.data?.appointment_at)).toISOString()).toBe(APPOINTMENT_AT);

      // The transition carries the same time as append-only evidence.
      const transition = await db
        .from("request_transitions")
        .select("command,appointment_at,prior_snapshot")
        .eq("request_id", requestId)
        .single();
      expect(transition.data?.command).toBe("confirm_booking_handoff");
      expect(new Date(String(transition.data?.appointment_at)).toISOString()).toBe(APPOINTMENT_AT);
    } finally {
      await db.from("requests").delete().eq("id", requestId);
      await db.from("audit_log").delete().eq("entity_id", requestId);
    }
  });

  test("enforces the workflow undo window and keeps command evidence PHI-free", async () => {
    const db = serviceDb();
    const requestId = randomUUID();
    const actor = `workflow-undo-${randomUUID()}@example.test`;
    const patientValues = [
      "TEST Undo Patient Private",
      "8135550177",
      "undo-patient@example.test",
      "TEST private intake reason",
    ];
    const firstAt = new Date().toISOString();
    const firstKey = randomUUID();
    await insertRequest(db, {
      id: requestId,
      name: patientValues[0],
      phone: patientValues[1],
      email: patientValues[2],
      message: patientValues[3],
    });
    try {
      const first = await db.rpc("portal_execute_request_command", {
        p_actor_email: actor,
        p_request_id: requestId,
        p_expected_version: 1,
        p_idempotency_key: firstKey,
        p_fingerprint: "d".repeat(64),
        p_decision: {
          command: "record_contact_attempt",
          state: "contacted",
          callAgainAt: new Date(Date.parse(firstAt) + 86_400_000).toISOString(),
          bookingConfirmedAt: null,
          closedAt: null,
          closureReason: null,
          legacyReviewRequired: false,
          reasonCode: "reached_follow_up",
          occurredAt: firstAt,
        },
      });
      const firstOutcome = requireDecoded(
        commandOutcomeSchema.safeParse(first.data),
        "Workflow command result could not be decoded",
      );
      expect(firstOutcome.ok).toBe(true);
      const transitionId = requireText(
        firstOutcome.undo?.transitionId,
        "Workflow undo transition id is missing",
      );
      const undoKey = randomUUID();
      const undoDecision = {
        command: "undo_latest_transition",
        state: "new",
        callAgainAt: null,
        bookingConfirmedAt: null,
        closedAt: null,
        closureReason: null,
        legacyReviewRequired: false,
        reasonCode: null,
        occurredAt: new Date(Date.parse(firstAt) + 15 * 60_000).toISOString(),
      };
      const undo = await db.rpc("portal_execute_request_command", {
        p_actor_email: actor,
        p_request_id: requestId,
        p_expected_version: 2,
        p_idempotency_key: undoKey,
        p_fingerprint: "e".repeat(64),
        p_decision: undoDecision,
        p_transition_id: transitionId,
      });
      expect(undo.error).toBeNull();
      const undoOutcome = requireDecoded(
        commandOutcomeSchema.safeParse(undo.data),
        "Workflow undo result could not be decoded",
      );
      expect(undoOutcome.ok).toBe(true);

      const retryAfterExpiry = await db.rpc("portal_execute_request_command", {
        p_actor_email: actor,
        p_request_id: requestId,
        p_expected_version: 2,
        p_idempotency_key: undoKey,
        p_fingerprint: "e".repeat(64),
        p_decision: {
          ...undoDecision,
          occurredAt: new Date(Date.parse(firstAt) + 16 * 60_000).toISOString(),
        },
        p_transition_id: transitionId,
      });
      expect(retryAfterExpiry.data).toEqual(undo.data);

      const evidence = await Promise.all([
        db.from("request_transitions").select("*").eq("request_id", requestId),
        db.from("request_command_receipts").select("*").eq("request_id", requestId),
        db.from("notification_outbox").select("*").eq("request_id", requestId),
        db.from("audit_log").select("detail").eq("entity_id", requestId),
      ]);
      const serialized = JSON.stringify(evidence.map(({ data }) => data));
      for (const value of patientValues) expect(serialized).not.toContain(value);
    } finally {
      await db.from("requests").delete().eq("id", requestId);
      await db.from("audit_log").delete().eq("entity_id", requestId);
    }
  });

  test("requires call-again authority for Contacted commands and preserves correction evidence", async () => {
    const db = serviceDb();
    const actor = `call-again-${randomUUID()}@example.test`;
    const occurredAt = new Date().toISOString();
    const callAgainAt = new Date(Date.parse(occurredAt) + 86_400_000).toISOString();
    const laterCallAgainAt = new Date(Date.parse(occurredAt) + 172_800_000).toISOString();
    const requestIds: string[] = [];
    const expectTimestamp = (value: string | null | undefined, expected: string | null) => {
      expect(value === null || value === undefined ? null : new Date(value).toISOString()).toBe(
        expected,
      );
    };
    const decision = (
      command: string,
      state: string,
      overrides: Readonly<Partial<WorkflowDecision>> = {},
    ): WorkflowDecision => ({
      command,
      state,
      callAgainAt: null,
      bookingConfirmedAt: null,
      appointmentAt: null,
      closedAt: null,
      closureReason: null,
      legacyReviewRequired: false,
      reasonCode: null,
      occurredAt,
      ...overrides,
    });
    const execute = (
      requestId: string,
      expectedVersion: number,
      next: Readonly<WorkflowDecision>,
      transitionId?: string,
    ) =>
      db.rpc("portal_execute_request_command", {
        p_actor_email: actor,
        p_request_id: requestId,
        p_expected_version: expectedVersion,
        p_idempotency_key: randomUUID(),
        p_fingerprint: randomUUID().replaceAll("-", "").repeat(2),
        p_decision: next,
        p_transition_id: transitionId ?? null,
      });
    const writeCounts = async (requestId: string) => {
      const reads = await Promise.all([
        db
          .from("request_events")
          .select("id", { count: "exact", head: true })
          .eq("request_id", requestId),
        db
          .from("request_transitions")
          .select("id", { count: "exact", head: true })
          .eq("request_id", requestId),
        db
          .from("request_command_receipts")
          .select("id", { count: "exact", head: true })
          .eq("request_id", requestId),
        db
          .from("audit_log")
          .select("id", { count: "exact", head: true })
          .eq("entity_id", requestId),
      ]);
      for (const read of reads) expect(read.error).toBeNull();
      return reads.map((read) => read.count);
    };
    const expectNoWrite = async (requestId: string, attempt: () => ReturnType<typeof execute>) => {
      const before = await writeCounts(requestId);
      const result = await attempt();
      expect(result.error).toBeNull();
      expect(result.data).toEqual({ ok: false, code: "invalid_command" });
      expect(await writeCounts(requestId)).toEqual(before);
    };
    const insert = async (row: Readonly<RequestInsert>) => {
      requestIds.push(row.id);
      await insertRequest(db, row);
    };
    const undo = async (requestId: string, expectedVersion: number, transitionId: string) =>
      execute(
        requestId,
        expectedVersion,
        decision("undo_latest_transition", "new", { occurredAt: new Date().toISOString() }),
        transitionId,
      );

    try {
      for (const outcome of CONTACT_OUTCOMES) {
        const requestId = randomUUID();
        await insert({ id: requestId, name: `TEST date-less ${outcome}` });
        await expectNoWrite(requestId, () =>
          execute(
            requestId,
            1,
            decision("record_contact_attempt", "contacted", { reasonCode: outcome }),
          ),
        );
      }

      for (const outcome of CONTACT_OUTCOMES) {
        const requestId = randomUUID();
        await insert({ id: requestId, name: `TEST dated ${outcome}` });
        const result = await execute(
          requestId,
          1,
          decision("record_contact_attempt", "contacted", { callAgainAt, reasonCode: outcome }),
        );
        expect(result.error).toBeNull();
        const outcomeResult = requireDecoded(
          commandOutcomeSchema.safeParse(result.data),
          "Dated contact command result could not be decoded",
        );
        expect(outcomeResult).toMatchObject({ ok: true, state: "contacted" });
        expectTimestamp(outcomeResult.callAgainAt, callAgainAt);
        const [request, events, transitions] = await Promise.all([
          db.from("requests").select("status,follow_up_at").eq("id", requestId).single(),
          db.from("request_events").select("type").eq("request_id", requestId),
          db
            .from("request_transitions")
            .select("command,call_again_at")
            .eq("request_id", requestId)
            .single(),
        ]);
        expect(request.data?.status).toBe("contacted");
        expectTimestamp(
          requireDecoded(
            nullableTimestampSchema.safeParse(request.data?.follow_up_at),
            "Dated contact follow-up timestamp could not be decoded",
          ),
          callAgainAt,
        );
        expect(events.data?.filter((event) => event.type === "contact_attempt")).toHaveLength(1);
        expect(transitions.data?.command).toBe("record_contact_attempt");
        expect(transitions.data?.call_again_at).toBeNull();
      }

      const dateLessReopenId = randomUUID();
      await insert({
        id: dateLessReopenId,
        name: "TEST date-less reopen",
        status: "booked",
        record_handoff_at: occurredAt,
      });
      await expectNoWrite(dateLessReopenId, () =>
        execute(dateLessReopenId, 1, decision("reopen_request", "contacted")),
      );

      const reopenedBookedId = randomUUID();
      const reopenedTypedClosedId = randomUUID();
      const reopenedClosedId = randomUUID();
      await insert({
        id: reopenedBookedId,
        name: "TEST reopen booked",
        status: "booked",
        record_handoff_at: occurredAt,
      });
      await insert({
        id: reopenedTypedClosedId,
        name: "TEST reopen typed closed",
        status: "closed",
        closed_at: occurredAt,
        closure_reason: "wont_schedule",
      });
      await insert({
        id: reopenedClosedId,
        name: "TEST reopen migrated closed",
        status: "closed",
        closed_at: occurredAt,
        closure_provenance: "migration_unconverted",
      });
      const beforeReopenSnapshots = new Map<string, unknown>();
      const reopenedIds = [reopenedBookedId, reopenedTypedClosedId, reopenedClosedId];
      for (const requestId of reopenedIds) {
        const before = await db
          .from("requests")
          .select(
            "status,follow_up_at,record_handoff_at,closed_at,closure_reason,closure_disposition,closure_provenance",
          )
          .eq("id", requestId)
          .single();
        expect(before.error).toBeNull();
        beforeReopenSnapshots.set(requestId, before.data);
        const result = await execute(
          requestId,
          1,
          decision("reopen_request", "contacted", { callAgainAt }),
        );
        expect(result.error).toBeNull();
        const outcome = requireDecoded(
          commandOutcomeSchema.safeParse(result.data),
          "Reopen command result could not be decoded",
        );
        expect(outcome).toMatchObject({ ok: true });
        const transitionId = requireText(
          outcome.undo?.transitionId,
          "Reopen transition is missing",
        );
        const [request, events, transition] = await Promise.all([
          db
            .from("requests")
            .select("status,follow_up_at,record_handoff_at,closed_at,closure_reason")
            .eq("id", requestId)
            .single(),
          db.from("request_events").select("type").eq("request_id", requestId),
          db
            .from("request_transitions")
            .select("command,call_again_at")
            .eq("id", transitionId)
            .single(),
        ]);
        expect(request.data).toMatchObject({
          status: "contacted",
          record_handoff_at: null,
          closed_at: null,
          closure_reason: null,
        });
        expectTimestamp(
          requireDecoded(
            nullableTimestampSchema.safeParse(request.data?.follow_up_at),
            "Reopened request follow-up timestamp could not be decoded",
          ),
          callAgainAt,
        );
        expect(events.data?.filter((event) => event.type === "contact_attempt")).toHaveLength(0);
        expect(transition.data?.command).toBe("reopen_request");
        expectTimestamp(
          requireDecoded(
            nullableTimestampSchema.safeParse(transition.data?.call_again_at),
            "Reopen transition call-again timestamp could not be decoded",
          ),
          callAgainAt,
        );

        const contactedCount = await db
          .from("requests")
          .select("id", { count: "exact", head: true })
          .in("id", reopenedIds)
          .eq("status", "contacted");
        expect(contactedCount).toMatchObject({ error: null, count: 1 });

        const restored = await undo(requestId, 2, transitionId);
        expect(restored.error).toBeNull();
        const afterUndo = await db
          .from("requests")
          .select(
            "status,follow_up_at,record_handoff_at,closed_at,closure_reason,closure_disposition,closure_provenance",
          )
          .eq("id", requestId)
          .single();
        expect(afterUndo.error).toBeNull();
        expect(afterUndo.data).toEqual(beforeReopenSnapshots.get(requestId));
      }

      const legacyContactedId = randomUUID();
      await insert({ id: legacyContactedId, name: "TEST legacy Contacted", status: "contacted" });
      await expectNoWrite(legacyContactedId, () =>
        execute(legacyContactedId, 1, decision("set_call_again", "contacted")),
      );
      const setResult = await execute(
        legacyContactedId,
        1,
        decision("set_call_again", "contacted", { callAgainAt: laterCallAgainAt }),
      );
      expect(setResult.error).toBeNull();
      const setOutcome = requireDecoded(
        commandOutcomeSchema.safeParse(setResult.data),
        "Set-call-again result could not be decoded",
      );
      const setTransitionId = requireText(
        setOutcome.undo?.transitionId,
        "Correction transition is missing",
      );
      const [setRequest, setEvents, setTransition] = await Promise.all([
        db.from("requests").select("status,follow_up_at").eq("id", legacyContactedId).single(),
        db.from("request_events").select("type").eq("request_id", legacyContactedId),
        db
          .from("request_transitions")
          .select("command,call_again_at")
          .eq("id", setTransitionId)
          .single(),
      ]);
      expect(setRequest.data?.status).toBe("contacted");
      expectTimestamp(
        requireDecoded(
          nullableTimestampSchema.safeParse(setRequest.data?.follow_up_at),
          "Corrected request follow-up timestamp could not be decoded",
        ),
        laterCallAgainAt,
      );
      expect(setEvents.data?.filter((event) => event.type === "contact_attempt")).toHaveLength(0);
      expect(setTransition.data?.command).toBe("set_call_again");
      expectTimestamp(
        requireDecoded(
          nullableTimestampSchema.safeParse(setTransition.data?.call_again_at),
          "Correction transition call-again timestamp could not be decoded",
        ),
        laterCallAgainAt,
      );
      const undoSet = await undo(legacyContactedId, 2, setTransitionId);
      expect(undoSet.error).toBeNull();
      expect(
        await db
          .from("requests")
          .select("status,follow_up_at")
          .eq("id", legacyContactedId)
          .single(),
      ).toMatchObject({ data: { status: "contacted", follow_up_at: null } });
      expect(
        await db.from("request_transitions").select("id").eq("request_id", legacyContactedId),
      ).toMatchObject({ data: expect.any(Array) });
      expect(
        (await db.from("request_transitions").select("id").eq("request_id", legacyContactedId))
          .data,
      ).toHaveLength(2);
      expect(
        (await db.from("audit_log").select("id").eq("entity_id", legacyContactedId)).data,
      ).toHaveLength(2);

      for (const row of [
        { status: "new" },
        { status: "booked", record_handoff_at: occurredAt },
        { status: "closed", closed_at: occurredAt, closure_reason: "not_actionable" },
        { status: "contacted", follow_up_at: callAgainAt },
      ] as const) {
        const requestId = randomUUID();
        await insert({ id: requestId, name: `TEST invalid correction ${row.status}`, ...row });
        await expectNoWrite(requestId, () =>
          execute(
            requestId,
            1,
            decision("set_call_again", "contacted", { callAgainAt: laterCallAgainAt }),
          ),
        );
      }

      for (const outcome of CONTACT_OUTCOMES) {
        const requestId = randomUUID();
        await insert({ id: requestId, name: `TEST overlap ${outcome}` });
        const before = await writeCounts(requestId);
        const result = await db.rpc("portal_log_call_outcome", {
          p_actor_email: actor,
          p_request_id: requestId,
          p_outcome: outcome,
          p_follow_up_at: null,
        });
        expect(result.error?.code).toBe("22023");
        expect(await writeCounts(requestId)).toEqual(before);
      }
    } finally {
      await db.from("requests").delete().in("id", requestIds);
      await db.from("audit_log").delete().in("entity_id", requestIds);
    }
  });
});
