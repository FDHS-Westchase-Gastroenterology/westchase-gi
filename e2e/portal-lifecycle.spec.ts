import { createHash, randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { loadLocalEnv, requiredEnv, serviceDb } from "./support";

loadLocalEnv();

const supabaseUrl = new URL(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"));
const isolatedTestDatabase =
  process.env.SUPABASE_PREVIEW_BRANCH === "1" ||
  ["127.0.0.1", "localhost", "[::1]"].includes(supabaseUrl.hostname) &&
  requiredEnv("SUPABASE_PROJECT_REF") === "local";
const SEED_EMAIL = requiredEnv("PORTAL_SEED_ADMIN_EMAIL");
const SEED_PASSWORD = requiredEnv("PORTAL_SEED_ADMIN_PASSWORD");
const runId = randomUUID().slice(0, 8);
const sourcePath = `/e2e/lifecycle/${runId}`;
const lifecycleActor = `lifecycle-${runId}@example.test`;
const requestIds = new Set<string>();

const CLOCK = new Date(Date.now() + 2 * 60 * 1000);
const UNCONVERTED_CUTOFF = new Date(
  CLOCK.getTime() - 180 * 24 * 60 * 60 * 1000,
);
const CONVERTED_CUTOFF = new Date(CLOCK);
CONVERTED_CUTOFF.setUTCFullYear(CONVERTED_CUTOFF.getUTCFullYear() - 1);
const AUDIT_CUTOFF = new Date(CLOCK);
AUDIT_CUTOFF.setUTCFullYear(AUDIT_CUTOFF.getUTCFullYear() - 6);

function shifted(date: Date, milliseconds: number): string {
  return new Date(date.getTime() + milliseconds).toISOString();
}

function count(result: unknown, key: string): number {
  if (typeof result !== "object" || result === null || !(key in result)) {
    throw new Error(`Lifecycle result is missing ${key}`);
  }
  return Number((result as Record<string, unknown>)[key]);
}

async function signIn(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(SEED_EMAIL);
  await page.getByLabel("Password").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
}

async function stageRequest(
  suffix: string,
  lifecycle: Record<string, unknown> = {},
): Promise<string> {
  const id = randomUUID();
  requestIds.add(id);
  const { error } = await serviceDb()
    .from("requests")
    .insert({
      id,
      name: `TEST Lifecycle ${runId} ${suffix}`,
      phone: "8135550175",
      email: `lifecycle-${runId}-${suffix}@example.test`,
      location: "tampa",
      preferred_time: "morning",
      message: "TEST lifecycle fixture — no medical details.",
      locale: "en",
      source_path: sourcePath,
      ...lifecycle,
    });
  expect(error).toBeNull();
  return id;
}

test.describe("isolated appointment-request lifecycle", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(
    !isolatedTestDatabase,
    "destructive lifecycle coverage requires local Supabase or a Preview Branch",
  );
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "lifecycle coverage requires JavaScript",
    );
  });

  const db = serviceDb();

  test.afterAll(async () => {
    if (requestIds.size > 0) {
      await db
        .from("requests")
        .delete()
        .in("id", [...requestIds]);
      await db
        .from("audit_log")
        .delete()
        .in("entity_id", [...requestIds]);
    }
    await db.from("audit_log").delete().eq("actor_email", lifecycleActor);
  });

  test("staff classifies closure from the request detail page", async ({
    page,
  }) => {
    // A migrated closure with no recorded outcome (DEC-13): closed, review
    // flag set, no invented closure fact. It resolves only through the
    // dedicated ClassifyLegacyClosure repair path in the workflow panel.
    const bookedReviewId = await stageRequest("legacy-booked", {
      status: "closed",
      legacy_review_required: true,
    });
    const unbookedReviewId = await stageRequest("legacy-unbooked", {
      status: "closed",
      legacy_review_required: true,
    });
    await signIn(page);

    // Reviewed as booked: the record resolves to durable `booked`,
    // presented to staff as Scheduled (DEC-04) with migration-safe
    // retention (the clock starts at review, not in the past).
    await page.goto(`/admin/requests/${bookedReviewId}`);
    const panel = page.getByTestId("workflow-panel");
    await expect(panel).toContainText("Finish this request's record");
    // The review is not an ordinary work surface: no contact/close rows.
    await expect(page.getByTestId("save-workflow")).toHaveCount(0);
    await panel
      .getByText("An appointment was booked", { exact: true })
      .click();
    await page.getByTestId("classify-legacy").click();
    await expect(page.getByTestId("workflow-feedback")).toContainText(
      "marked Scheduled",
    );

    const bookedRow = await db
      .from("requests")
      .select(
        "status, legacy_review_required, record_handoff_at, closed_at, closure_reason, version",
      )
      .eq("id", bookedReviewId)
      .single();
    expect(bookedRow.error).toBeNull();
    expect(bookedRow.data).toMatchObject({
      status: "booked",
      legacy_review_required: false,
      closed_at: null,
      closure_reason: null,
    });
    expect(bookedRow.data?.record_handoff_at).toBeTruthy();
    expect(Number(bookedRow.data?.version)).toBe(2);

    // Reviewed as unbooked: normal CLOSED with a typed reason; the
    // retention clock starts no earlier than the review itself.
    await page.goto(`/admin/requests/${unbookedReviewId}`);
    await page
      .getByTestId("workflow-panel")
      .getByText("No appointment — patient wouldn't schedule", {
        exact: true,
      })
      .click();
    await page.getByTestId("classify-legacy").click();
    await expect(page.getByTestId("workflow-feedback")).toContainText(
      "stays closed",
    );

    const unbookedRow = await db
      .from("requests")
      .select(
        "status, legacy_review_required, record_handoff_at, closed_at, closure_reason",
      )
      .eq("id", unbookedReviewId)
      .single();
    expect(unbookedRow.error).toBeNull();
    expect(unbookedRow.data).toMatchObject({
      status: "closed",
      legacy_review_required: false,
      record_handoff_at: null,
      closure_reason: "wont_schedule",
    });
    expect(unbookedRow.data?.closed_at).toBeTruthy();

    // Each classification appends one immutable legacy_review transition
    // and one PHI-free technical audit entry.
    for (const [id, toState] of [
      [bookedReviewId, "booked"],
      [unbookedReviewId, "closed"],
    ] as const) {
      const { data: transitions, error: transitionsError } = await db
        .from("request_transitions")
        .select("command, from_state, to_state, provenance")
        .eq("request_id", id);
      expect(transitionsError).toBeNull();
      expect(transitions).toEqual([
        {
          command: "classify_legacy_closure",
          from_state: "closed",
          to_state: toState,
          provenance: "legacy_review",
        },
      ]);
    }

    await db
      .from("requests")
      .delete()
      .in("id", [bookedReviewId, unbookedReviewId]);
    await db
      .from("audit_log")
      .delete()
      .in("entity_id", [bookedReviewId, unbookedReviewId]);
    requestIds.delete(bookedReviewId);
    requestIds.delete(unbookedReviewId);
  });

  test("the retired generic close path can no longer manufacture an unclassified closure", async () => {
    // DEC-15: the generic status setter is retired from the application.
    // The RPC survives only for deploy-overlap compatibility, and the new
    // workflow shape constraint now rejects the incoherent closure it used
    // to write (closed with no clock, no reason, no review flag) — it
    // fails loudly with no partial write instead of silently minting an
    // unclassifiable row.
    const id = await stageRequest("old-app-close");
    const closed = await db.rpc("portal_update_request_status", {
      p_actor_email: lifecycleActor,
      p_request_id: id,
      p_next_status: "closed",
    });
    expect(closed.error?.code).toBe("23514");

    const row = await db
      .from("requests")
      .select("status, closure_disposition, closed_at, record_handoff_at")
      .eq("id", id)
      .single();
    expect(row.error).toBeNull();
    expect(row.data).toEqual({
      status: "new",
      closure_disposition: null,
      closed_at: null,
      record_handoff_at: null,
    });

    // No transition evidence appears for the rejected write, and the
    // retention motor has nothing to act on.
    const { data: transitions } = await db
      .from("request_transitions")
      .select("id")
      .eq("request_id", id);
    expect(transitions).toHaveLength(0);

    const run = await db.rpc("portal_run_data_lifecycle", {
      p_actor_email: lifecycleActor,
      p_now: CLOCK.toISOString(),
    });
    expect(run.error).toBeNull();
    expect(count(run.data, "requests_removed")).toBe(0);

    const survivor = await db.from("requests").select("id").eq("id", id);
    expect(survivor.data).toEqual([{ id }]);

    await db.from("requests").delete().eq("id", id);
    await db.from("audit_log").delete().eq("entity_id", id);
    requestIds.delete(id);
  });

  test("concurrent data-lifecycle runs serialize without double deletion", async () => {
    const id = await stageRequest("concurrent-run", {
      status: "closed",
      closure_disposition: "unconverted",
      closure_provenance: "migration_unconverted",
      closed_at: UNCONVERTED_CUTOFF.toISOString(),
    });

    const runs = await Promise.all(
      Array.from({ length: 2 }, () =>
        db.rpc("portal_run_data_lifecycle", {
          p_actor_email: lifecycleActor,
          p_now: CLOCK.toISOString(),
        }),
      ),
    );
    expect(runs.every(({ error }) => error === null)).toBe(true);
    expect(
      runs.reduce(
        (total, { data }) => total + count(data, "requests_removed"),
        0,
      ),
    ).toBe(1);

    const survivor = await db.from("requests").select("id").eq("id", id);
    expect(survivor.data).toHaveLength(0);
  });

  test("exact boundaries, holds, secrets, cascades, and repeat runs are safe", async () => {
    // Closed retention runs on typed/provenance-backed closures (the
    // workflow shape constraint forbids the old bare `closed` rows), and
    // converted requests are durable `booked` rows whose retention clock is
    // the booking-handoff time (spec §14.1).
    const unconvertedBefore = await stageRequest("unconverted-before", {
      status: "closed",
      closure_disposition: "unconverted",
      closure_provenance: "migration_unconverted",
      closed_at: shifted(UNCONVERTED_CUTOFF, 1),
    });
    const unconvertedExact = await stageRequest("unconverted-exact", {
      status: "closed",
      closure_disposition: "unconverted",
      closure_provenance: "migration_unconverted",
      closed_at: UNCONVERTED_CUTOFF.toISOString(),
    });
    const convertedBefore = await stageRequest("converted-before", {
      status: "booked",
      record_handoff_at: shifted(CONVERTED_CUTOFF, 1),
    });
    const convertedExact = await stageRequest("converted-exact", {
      status: "booked",
      record_handoff_at: CONVERTED_CUTOFF.toISOString(),
    });
    const heldExpired = await stageRequest("held-expired", {
      status: "closed",
      closure_disposition: "unconverted",
      closure_provenance: "migration_unconverted",
      closed_at: shifted(UNCONVERTED_CUTOFF, -1),
      retention_hold_at: shifted(CLOCK, -60_000),
      retention_hold_by: lifecycleActor,
      retention_hold_reason: "CASE-HOLD",
    });
    // An unclassified legacy closure stays visible, review-required, and
    // retention-ineligible until classified (DEC-26).
    const legacyClosed = await stageRequest("legacy-closed", {
      status: "closed",
      legacy_review_required: true,
    });
    const openOld = await stageRequest("open-old", {
      status: "contacted",
      created_at: "2020-01-01T00:00:00.000Z",
    });

    const { error: eventError } = await db.from("request_events").insert([
      {
        request_id: unconvertedExact,
        type: "note",
        status: "recorded",
        created_at: CLOCK.toISOString(),
        meta: { text: "TEST cascade", author_email: lifecycleActor },
      },
      {
        request_id: unconvertedBefore,
        type: "receipt",
        status: "issued",
        created_at: shifted(new Date(CLOCK.getTime() - 60 * 60 * 1000), 0),
        meta: { locale: "en", token_hash: "a".repeat(64) },
      },
      {
        request_id: convertedBefore,
        type: "receipt",
        status: "issued",
        created_at: shifted(new Date(CLOCK.getTime() - 60 * 60 * 1000), 1),
        meta: { locale: "en", token_hash: "b".repeat(64) },
      },
    ]);
    expect(eventError).toBeNull();

    const { error: auditError } = await db.from("audit_log").insert([
      {
        actor_email: lifecycleActor,
        action: "test.audit.exact",
        entity: "requests",
        entity_id: openOld,
        detail: {},
        at: AUDIT_CUTOFF.toISOString(),
      },
      {
        actor_email: lifecycleActor,
        action: "test.audit.before",
        entity: "requests",
        entity_id: openOld,
        detail: {},
        at: shifted(AUDIT_CUTOFF, 1),
      },
      {
        actor_email: lifecycleActor,
        action: "test.audit.held",
        entity: "requests",
        entity_id: heldExpired,
        detail: {},
        at: AUDIT_CUTOFF.toISOString(),
      },
    ]);
    expect(auditError).toBeNull();

    const rateHash = createHash("sha256")
      .update(`lifecycle-${runId}`)
      .digest("hex");
    const rateClaim = await db.rpc("portal_check_intake_rate_limit", {
      p_client_hash: rateHash,
      p_limit: 5,
      p_window_seconds: 1,
    });
    expect(rateClaim.error).toBeNull();

    const preview = await db.rpc("portal_preview_data_lifecycle", {
      p_now: CLOCK.toISOString(),
    });
    expect(preview.error).toBeNull();
    expect(count(preview.data, "unconverted_requests")).toBe(1);
    expect(count(preview.data, "converted_requests")).toBe(1);
    expect(count(preview.data, "held_requests")).toBeGreaterThanOrEqual(1);
    expect(
      count(preview.data, "legacy_unclassified_requests"),
    ).toBeGreaterThanOrEqual(1);
    expect(count(preview.data, "receipt_secrets")).toBe(1);
    expect(count(preview.data, "rate_limits")).toBeGreaterThanOrEqual(1);
    expect(count(preview.data, "audits")).toBe(1);

    const unsafeClock = await db.rpc("portal_run_data_lifecycle", {
      p_actor_email: lifecycleActor,
      p_now: "2100-01-01T00:00:00.000Z",
    });
    expect(unsafeClock.error?.code).toBe("22023");

    const firstRun = await db.rpc("portal_run_data_lifecycle", {
      p_actor_email: lifecycleActor,
      p_now: CLOCK.toISOString(),
    });
    expect(firstRun.error).toBeNull();
    expect(count(firstRun.data, "requests_removed")).toBe(2);
    expect(count(firstRun.data, "receipt_secrets_removed")).toBe(1);
    expect(count(firstRun.data, "rate_limits_removed")).toBeGreaterThanOrEqual(
      1,
    );
    expect(count(firstRun.data, "audits_removed")).toBe(1);

    const survivors = await db
      .from("requests")
      .select("id")
      .in("id", [
        unconvertedBefore,
        unconvertedExact,
        convertedBefore,
        convertedExact,
        heldExpired,
        legacyClosed,
        openOld,
      ]);
    expect(survivors.error).toBeNull();
    expect((survivors.data ?? []).map(({ id }) => id).sort()).toEqual(
      [
        unconvertedBefore,
        convertedBefore,
        heldExpired,
        legacyClosed,
        openOld,
      ].sort(),
    );

    const cascadedEvent = await db
      .from("request_events")
      .select("id")
      .eq("request_id", unconvertedExact);
    expect(cascadedEvent.data).toHaveLength(0);

    const receipts = await db
      .from("request_events")
      .select("request_id, status, meta")
      .in("request_id", [unconvertedBefore, convertedBefore])
      .eq("type", "receipt");
    expect(receipts.error).toBeNull();
    const expiredReceipt = receipts.data?.find(
      ({ request_id }) => request_id === unconvertedBefore,
    );
    const liveReceipt = receipts.data?.find(
      ({ request_id }) => request_id === convertedBefore,
    );
    expect(expiredReceipt?.status).toBe("expired");
    expect(expiredReceipt?.meta).not.toHaveProperty("token_hash");
    expect(liveReceipt?.status).toBe("issued");
    expect(liveReceipt?.meta).toHaveProperty("token_hash");

    const audits = await db
      .from("audit_log")
      .select("action")
      .eq("actor_email", lifecycleActor)
      .in("entity_id", [
        unconvertedBefore,
        unconvertedExact,
        convertedBefore,
        convertedExact,
        heldExpired,
        legacyClosed,
        openOld,
      ]);
    expect(audits.error).toBeNull();
    const auditActions = (audits.data ?? []).map(({ action }) => action);
    expect(auditActions).not.toContain("test.audit.exact");
    expect(auditActions).toContain("test.audit.before");
    expect(auditActions).toContain("test.audit.held");
    expect(
      auditActions.filter((action) => action === "request.retention_delete"),
    ).toHaveLength(2);

    const secondRun = await db.rpc("portal_run_data_lifecycle", {
      p_actor_email: lifecycleActor,
      p_now: CLOCK.toISOString(),
    });
    expect(secondRun.error).toBeNull();
    expect(count(secondRun.data, "requests_removed")).toBe(0);
    expect(count(secondRun.data, "receipt_secrets_removed")).toBe(0);
    expect(count(secondRun.data, "rate_limits_removed")).toBe(0);
    expect(count(secondRun.data, "audits_removed")).toBe(0);

    const release = await db.rpc("portal_set_request_legal_hold", {
      p_actor_email: lifecycleActor,
      p_request_id: heldExpired,
      p_held: false,
      p_reason: "CASE-HOLD-RELEASE",
    });
    expect(release.error).toBeNull();
    const afterRelease = await db.rpc("portal_run_data_lifecycle", {
      p_actor_email: lifecycleActor,
      p_now: CLOCK.toISOString(),
    });
    expect(afterRelease.error).toBeNull();
    expect(count(afterRelease.data, "requests_removed")).toBe(1);
  });

  test("exceptional deletion is authorized, hold-aware, and replayable after restore", async () => {
    const earlyId = await stageRequest("early-delete");
    const { error: earlyEventError } = await db.from("request_events").insert({
      request_id: earlyId,
      type: "note",
      status: "recorded",
      meta: { text: "TEST delete cascade", author_email: lifecycleActor },
    });
    expect(earlyEventError).toBeNull();

    const placed = await db.rpc("portal_set_request_legal_hold", {
      p_actor_email: lifecycleActor,
      p_request_id: earlyId,
      p_held: true,
      p_reason: "CASE-EARLY-HOLD",
    });
    expect(placed.error).toBeNull();

    const blocked = await db.rpc("portal_delete_request_early", {
      p_actor_email: lifecycleActor,
      p_request_id: earlyId,
      p_authorization_ref: "AUTH-100",
    });
    expect(blocked.error?.code).toBe("55000");

    const released = await db.rpc("portal_set_request_legal_hold", {
      p_actor_email: lifecycleActor,
      p_request_id: earlyId,
      p_held: false,
      p_reason: "CASE-EARLY-RELEASE",
    });
    expect(released.error).toBeNull();

    const invalidReference = await db.rpc("portal_delete_request_early", {
      p_actor_email: lifecycleActor,
      p_request_id: earlyId,
      p_authorization_ref: "patient requested this in free text",
    });
    expect(invalidReference.error?.code).toBe("22023");

    const deleted = await db.rpc("portal_delete_request_early", {
      p_actor_email: lifecycleActor,
      p_request_id: earlyId,
      p_authorization_ref: "AUTH-100",
    });
    expect(deleted.error).toBeNull();
    expect(deleted.data).toBe(true);

    const deletedRequest = await db
      .from("requests")
      .select("id")
      .eq("id", earlyId);
    const deletedEvents = await db
      .from("request_events")
      .select("id")
      .eq("request_id", earlyId);
    expect(deletedRequest.data).toHaveLength(0);
    expect(deletedEvents.data).toHaveLength(0);

    const deletionAudit = await db
      .from("audit_log")
      .select("detail")
      .eq("entity_id", earlyId)
      .eq("action", "request.authorized_delete")
      .single();
    expect(deletionAudit.error).toBeNull();
    expect(deletionAudit.data?.detail).toMatchObject({
      authorization_ref: "AUTH-100",
    });

    const restoredId = await stageRequest("restored-expired", {
      status: "closed",
      closure_disposition: "unconverted",
      closure_provenance: "migration_unconverted",
      closed_at: UNCONVERTED_CUTOFF.toISOString(),
    });
    const preview = await db.rpc("portal_preview_data_lifecycle", {
      p_now: CLOCK.toISOString(),
    });
    expect(count(preview.data, "unconverted_requests")).toBe(1);

    const replay = await db.rpc("portal_run_data_lifecycle", {
      p_actor_email: lifecycleActor,
      p_now: CLOCK.toISOString(),
    });
    expect(replay.error).toBeNull();
    expect(count(replay.data, "requests_removed")).toBe(1);

    const restoredRequest = await db
      .from("requests")
      .select("id")
      .eq("id", restoredId);
    expect(restoredRequest.data).toHaveLength(0);
  });
});
