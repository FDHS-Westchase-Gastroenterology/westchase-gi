import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { z } from "zod";

import { asJsonNumber, asJsonObject, jsonObjectSchema, jsonSchema } from "../../src/lib/json";
import type { Json, JsonObject } from "../../src/lib/json";
import {
  INTAKE_RATE_LIMIT,
  REQUEST_FIELD_LIMITS,
  intakeResponseSchema,
} from "../../src/lib/portal/contracts";
import { CONTACT_OUTCOMES } from "../../src/lib/portal/workflow/contracts";
import { expectDenied, requireDecoded, requireText } from "../harness/assert";
import { publishableDb, requiredEnv, seedAdmin, serviceDb } from "../harness/env";
import { assertSafeE2ETarget } from "../harness/target-guard";

const lifecycleRowSchema = z.object({
  status: z.string(),
  follow_up_at: z.string().nullable(),
  closure_disposition: z.string().nullable(),
  closed_at: z.string().nullable(),
  record_handoff_at: z.string().nullable(),
  closure_reason: z.string().nullable().optional(),
  closure_provenance: z.string().nullable().optional(),
});
const releaseProfileSchema = z.looseObject({
  display_name: jsonSchema,
  email: jsonSchema,
  active: jsonSchema,
});
const seedProfileSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  email: z.string(),
});
const releaseStateSchema = z.object({
  first_opened_at: z.string(),
  last_viewed_at: z.string(),
  view_count: z.number(),
  acknowledged_at: z.string().nullable().optional(),
  hidden_at: z.string().nullable().optional(),
  guide_opened_at: z.string().nullable().optional(),
  last_guide_opened_at: z.string().nullable().optional(),
  guide_open_count: z.number().optional(),
  last_dismissed_at: z.string().nullable().optional(),
  dismiss_count: z.number().optional(),
});
const releaseAuditSchema = z.object({
  action: z.string(),
  entity: z.string(),
  entity_id: z.string(),
  source: z.string(),
  correlation_id: z.string(),
  detail: jsonSchema.nullable(),
});
const staffUserIdRowSchema = z.object({
  staff_user_id: z.string(),
});
const correlationIdRowSchema = z.object({
  correlation_id: z.string(),
});
const requestEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.string(),
  meta: jsonSchema.nullable(),
});
const commandUndoSchema = z.object({
  transitionId: z.string(),
});
const commandOutcomeSchema = z.object({
  ok: z.boolean(),
  code: z.string().optional(),
  state: z.string().optional(),
  callAgainAt: z.string().nullable().optional(),
  current: z
    .object({
      version: z.number(),
    })
    .optional(),
  undo: commandUndoSchema.nullable().optional(),
});
const lifecycleRunSchema = z.object({
  requests_removed: z.number(),
});
const idRowSchema = z.object({
  id: z.string(),
});
const nullableTimestampSchema = z.string().nullable();

interface CallOutcomeAuditDetail {
  outcome: string;
  to: string;
  note_attached: boolean;
  note_length?: number;
}

interface RequestInsert {
  id: string;
  name: string;
  source_path?: string;
  status?: string;
  follow_up_at?: string | null;
  closure_disposition?: string | null;
  closed_at?: string | null;
  record_handoff_at?: string | null;
  closure_reason?: string | null;
  closure_provenance?: string | null;
  email?: string | null;
  phone?: string;
  message?: string | null;
  legacy_review_required?: boolean;
  retention_hold_at?: string | null;
  retention_hold_by?: string | null;
  retention_hold_reason?: string | null;
}

interface WorkflowDecision {
  command: string;
  state: string;
  callAgainAt: string | null;
  bookingConfirmedAt: string | null;
  appointmentAt?: string | null;
  closedAt: string | null;
  closureReason: string | null;
  legacyReviewRequired: boolean;
  reasonCode: string | null;
  occurredAt: string;
}

/** A fictional appointment far enough ahead to stay in the future as tests age. */
const APPOINTMENT_AT = "2027-03-04T15:30:00.000Z";

const { email: SEED_EMAIL, password: SEED_PASSWORD } = seedAdmin();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PATIENT_PHONE = "8135550199";
const RECIPIENT_RPC_MIGRATION =
  "supabase/migrations/20260802005123_atomic_notification_recipient_mutations.sql";
const DROP_RECIPIENT_RPC_QUERIES = [
  `drop function if exists public.portal_add_notification_recipient(
    text,
    text,
    text,
    boolean
  )`,
  `drop function if exists public.portal_toggle_notification_recipient(
    text,
    uuid,
    boolean
  )`,
  "drop function if exists public.portal_remove_notification_recipient(text, uuid)",
] as const;

function expectUuid(value: string): void {
  expect(value).toMatch(UUID_RE);
}

function expectNoPatientLeak(blob: Json, note?: string | null): void {
  const text = JSON.stringify(blob);
  expect(text).not.toContain(note ?? "TEST patient value that is never present");
  expect(text).not.toContain(PATIENT_PHONE);
}

async function mutateSettings(
  page: Page,
  operation: string,
  input: JsonObject,
): Promise<{ status: number; body: JsonObject }> {
  const raw = await page.evaluate(async (body) => {
    const response = await fetch("/admin/settings/mutations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return {
      status: response.status,
      bodyText: await response.text(),
    };
  }, JSON.stringify({ operation, input }));
  return {
    status: raw.status,
    body: requireDecoded(
      jsonObjectSchema.safeParse(JSON.parse(raw.bodyText)),
      "Settings mutation response was not a JSON object",
    ),
  };
}

function testDatabaseConnectionArgs(): string[] {
  assertSafeE2ETarget(process.env);
  if (process.env.SUPABASE_PROJECT_REF === "local") {
    const workdir = process.env.SUPABASE_DISPOSABLE_WORKDIR;
    const args = ["--local"];
    if (workdir !== undefined && workdir !== "") {
      args.push("--workdir", workdir);
    }
    return args;
  }

  const ref = requiredEnv("SUPABASE_BRANCH_PROJECT_REF", "SUPABASE_PROJECT_REF");
  const dbUrl = requiredEnv("POSTGRES_URL", "POSTGRES_URL_NON_POOLING");
  const parsedUrl = new URL(dbUrl);
  const direct = parsedUrl.hostname === `db.${ref}.supabase.co`;
  const pooler =
    parsedUrl.hostname.endsWith(".pooler.supabase.com") &&
    decodeURIComponent(parsedUrl.username) === `postgres.${ref}`;
  if (process.env.SUPABASE_PREVIEW_BRANCH !== "1" || (!direct && !pooler)) {
    throw new Error("Destructive database query refused outside a Preview Branch");
  }
  if (pooler && parsedUrl.port === "6543") {
    parsedUrl.port = "5432";
  }
  return ["--db-url", parsedUrl.toString()];
}

function queryTestDatabase(sql: string): void {
  try {
    execFileSync("supabase", ["db", "query", sql, ...testDatabaseConnectionArgs(), "--agent=no"], {
      cwd: process.cwd(),
      stdio: "pipe",
    });
  } catch {
    throw new Error("Destructive test database query failed");
  }
}

function recipientRpcMigrationStatements(): string[] {
  let remaining = readFileSync(RECIPIENT_RPC_MIGRATION, "utf8").trim();
  const statements: string[] = [];

  // Each PL/pgSQL body contains ordinary semicolons inside its dollar quotes.
  // Extract the three function definitions at their real top-level boundary,
  // Then split the remaining revoke/grant statements normally.
  for (let index = 0; index < 3; index += 1) {
    const boundary = remaining.indexOf("$$;");
    if (boundary < 0) {
      throw new Error("Recipient RPC migration has an unexpected function body");
    }
    statements.push(remaining.slice(0, boundary + 3).trim());
    remaining = remaining.slice(boundary + 3).trim();
  }

  statements.push(
    ...remaining
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean),
  );
  if (statements.length !== 9) {
    throw new Error("Recipient RPC migration has an unexpected statement count");
  }
  return statements;
}

function dropRecipientRpcs(): void {
  for (const sql of DROP_RECIPIENT_RPC_QUERIES) {
    queryTestDatabase(sql);
  }
  queryTestDatabase("notify pgrst, 'reload schema'");
}

function restoreRecipientRpcs(): void {
  dropRecipientRpcs();
  for (const sql of recipientRpcMigrationStatements()) {
    queryTestDatabase(sql);
  }
  queryTestDatabase("notify pgrst, 'reload schema'");
}

async function insertRequest(
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
  db: Readonly<ReturnType<typeof serviceDb>>,
  row: Readonly<RequestInsert>,
) {
  const inserted = await db.from("requests").insert({
    phone: PATIENT_PHONE,
    email: null,
    location: "tampa",
    preferred_time: "morning",
    message: null,
    locale: "en",
    source_path: "/e2e/dependency-contract",
    ...row,
  });
  expect(inserted.error).toBeNull();
}

async function expectDeniedSurface(
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
  client: Readonly<ReturnType<typeof publishableDb>>,
  opts: Readonly<{ actorEmail: string; userId: string; hashLabel: string }>,
) {
  const { actorEmail, userId, hashLabel } = opts;
  const release = (fn: string) =>
    client.rpc(fn, { p_user_id: userId, p_release_id: "dependency-contract" });
  for (const probe of [
    () => client.from("staff_profiles").select("id"),
    () =>
      client.rpc("portal_check_intake_rate_limit", {
        p_client_hash: createHash("sha256").update(hashLabel).digest("hex"),
        p_limit: 1,
        p_window_seconds: 1,
      }),
    () =>
      client.rpc("portal_preview_data_lifecycle", {
        p_now: new Date().toISOString(),
      }),
    () =>
      client.rpc("portal_log_call_outcome", {
        p_actor_email: actorEmail,
        p_request_id: randomUUID(),
        p_outcome: "no_answer",
      }),
    () =>
      client.rpc("portal_undo_call_outcome", {
        p_actor_email: actorEmail,
        p_request_id: randomUUID(),
        p_event_id: randomUUID(),
      }),
    () =>
      client.rpc("portal_update_recipient_label", {
        p_actor_email: actorEmail,
        p_recipient_id: randomUUID(),
        p_label: "Blocked",
      }),
    () =>
      client.rpc("portal_add_notification_recipient", {
        p_actor_email: actorEmail,
        p_email: `blocked-${randomUUID()}@example.test`,
        p_label: null,
        p_active: true,
      }),
    () =>
      client.rpc("portal_toggle_notification_recipient", {
        p_actor_email: actorEmail,
        p_recipient_id: randomUUID(),
        p_active: false,
      }),
    () =>
      client.rpc("portal_remove_notification_recipient", {
        p_actor_email: actorEmail,
        p_recipient_id: randomUUID(),
      }),
    () => client.from("portal_release_states").select("staff_user_id"),
    () => release("portal_open_staff_release"),
    () => release("portal_acknowledge_staff_release"),
    () => release("portal_hide_staff_release"),
    () => release("portal_record_staff_release_guide_open"),
    () => release("portal_record_staff_release_dismiss"),
  ]) {
    expectDenied(await probe());
  }
}

test.use({ trace: "off" });

test.describe("Supabase dependency contract", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "The dependency contract runs once.");
  });

  test("preserves direct Auth refresh and the portal's SSR cookie session", async ({ page }) => {
    const client = publishableDb();
    const signIn = await client.auth.signInWithPassword({
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
    });
    expect(signIn.error).toBeNull();
    expect(signIn.data.session?.access_token).toBeTruthy();
    expect(signIn.data.user?.email).toBe(SEED_EMAIL);

    const refresh = await client.auth.refreshSession();
    expect(refresh.error).toBeNull();
    expect(refresh.data.session?.access_token).toBeTruthy();
    expect(refresh.data.user?.id).toBe(signIn.data.user?.id);

    const verified = await client.auth.getUser();
    expect(verified.error).toBeNull();
    expect(verified.data.user?.id).toBe(signIn.data.user?.id);
    expect((await client.auth.signOut({ scope: "local" })).error).toBeNull();

    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(SEED_EMAIL);
    await page.getByLabel("Password").fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/?$/);
    const { data: sessionProfile } = await serviceDb()
      .from("staff_profiles")
      .select("display_name")
      .eq("email", SEED_EMAIL.toLowerCase())
      .single();
    const sessionName = String(sessionProfile?.display_name ?? "");
    expect(sessionName).not.toBe("");
    await expect(page.getByTestId("session-user")).toContainText(sessionName);

    await page.reload();
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByTestId("session-user")).toContainText(sessionName);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login\/?$/);
  });

  test("keeps direct Data API access closed while the service client can read", async () => {
    const anon = publishableDb();
    await expectDeniedSurface(anon, {
      actorEmail: "anon@example.test",
      userId: randomUUID(),
      hashLabel: "anon",
    });

    const authenticated = publishableDb();
    const signIn = await authenticated.auth.signInWithPassword({
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
    });
    expect(signIn.error).toBeNull();

    try {
      await expectDeniedSurface(authenticated, {
        actorEmail: SEED_EMAIL,
        userId: signIn.data.user?.id ?? randomUUID(),
        hashLabel: "authenticated",
      });
      expectDenied(
        await authenticated
          .from("staff_profiles")
          .update({ display_name: "TEST forbidden" })
          .eq("user_id", signIn.data.user?.id ?? "")
          .select("id"),
      );

      const serviceRead = await serviceDb()
        .from("staff_profiles")
        .select("user_id, email, role, active")
        .eq("user_id", signIn.data.user?.id ?? "")
        .single();
      expect(serviceRead.error).toBeNull();
      expect(serviceRead.data).toMatchObject({
        email: SEED_EMAIL,
        role: "admin",
        active: true,
      });
    } finally {
      await authenticated.auth.signOut({ scope: "local" });
    }
  });

  test("keeps portal release engagement per staff with atomic counters and audits", async () => {
    const db = serviceDb();
    const releaseId = `dependency-${randomUUID()}`;
    const legacyReleaseId = `legacy-release-${randomUUID()}`;
    const secondEmail = `release-second-${randomUUID()}@example.test`;
    const pendingEmail = `release-pending-${randomUUID()}@example.test`;
    const inactiveEmail = `release-inactive-${randomUUID()}@example.test`;
    const createdUserIds: string[] = [];
    const profileIds: string[] = [];

    const createProfile = async ({
      email,
      active,
      onboarded,
    }: Readonly<{
      email: string;
      active: boolean;
      onboarded: boolean;
    }>) => {
      const createdUser = await db.auth.admin.createUser({
        email,
        email_confirm: true,
        password: `T3st-${randomUUID()}!`,
      });
      expect(createdUser.error).toBeNull();
      const userId = requireText(
        createdUser.data.user?.id,
        "Release-state Auth fixture was not created",
      );
      createdUserIds.push(userId);

      const profileId = randomUUID();
      const inserted = await db.from("staff_profiles").insert({
        id: profileId,
        user_id: userId,
        email,
        display_name: "TEST release-state staff",
        role: "staff",
        active,
        onboarded_at: onboarded ? new Date().toISOString() : null,
      });
      expect(inserted.error).toBeNull();
      profileIds.push(profileId);
      return { userId, profileId };
    };

    const { data: seedProfile, error: seedProfileError } = await db
      .from("staff_profiles")
      .select("id, user_id, email")
      .eq("email", SEED_EMAIL)
      .single();
    expect(seedProfileError).toBeNull();
    const seed = requireDecoded(
      seedProfileSchema.safeParse(seedProfile),
      "Seed staff profile is missing",
    );

    try {
      const second = await createProfile({
        email: secondEmail,
        active: true,
        onboarded: true,
      });
      const pending = await createProfile({
        email: pendingEmail,
        active: true,
        onboarded: false,
      });
      const inactive = await createProfile({
        email: inactiveEmail,
        active: false,
        onboarded: true,
      });

      const firstOpen = await db.rpc("portal_open_staff_release", {
        p_user_id: seed.user_id,
        p_release_id: releaseId,
      });
      expect(firstOpen.error).toBeNull();
      expect(firstOpen.data).toBe(true);

      const openedState = await db
        .from("portal_release_states")
        .select(
          "first_opened_at, last_viewed_at, view_count, acknowledged_at, hidden_at, guide_opened_at, last_guide_opened_at, guide_open_count, last_dismissed_at, dismiss_count",
        )
        .eq("staff_user_id", seed.user_id)
        .eq("release_id", releaseId)
        .single();
      expect(openedState.error).toBeNull();
      const opened = requireDecoded(
        releaseStateSchema.safeParse(openedState.data),
        "Opened release state could not be decoded",
      );
      expect(opened).toMatchObject({
        first_opened_at: expect.any(String),
        last_viewed_at: expect.any(String),
        view_count: 1,
        acknowledged_at: null,
        hidden_at: null,
        guide_opened_at: null,
        last_guide_opened_at: null,
        guide_open_count: 0,
        last_dismissed_at: null,
        dismiss_count: 0,
      });
      expect(opened.last_viewed_at).toBe(opened.first_opened_at);
      const firstOpenedAt = opened.first_opened_at;

      const repeatedOpen = await db.rpc("portal_open_staff_release", {
        p_user_id: seed.user_id,
        p_release_id: releaseId,
      });
      expect(repeatedOpen.error).toBeNull();
      expect(repeatedOpen.data).toBe(false);

      const firstGuideOpen = await db.rpc("portal_record_staff_release_guide_open", {
        p_user_id: seed.user_id,
        p_release_id: releaseId,
      });
      expect(firstGuideOpen.error).toBeNull();
      expect(firstGuideOpen.data).toBe(true);

      const firstDismiss = await db.rpc("portal_record_staff_release_dismiss", {
        p_user_id: seed.user_id,
        p_release_id: releaseId,
      });
      expect(firstDismiss.error).toBeNull();
      expect(firstDismiss.data).toBe(true);

      const beforeConcurrentEvents = await db
        .from("portal_release_states")
        .select("guide_opened_at")
        .eq("staff_user_id", seed.user_id)
        .eq("release_id", releaseId)
        .single();
      expect(beforeConcurrentEvents.error).toBeNull();
      const firstGuideOpenedAt = requireDecoded(
        z.object({ guide_opened_at: z.string() }).safeParse(beforeConcurrentEvents.data),
        "Guide-open timestamp could not be decoded",
      ).guide_opened_at;

      const concurrentEvents = await Promise.all([
        ...Array.from({ length: 4 }, () =>
          db.rpc("portal_open_staff_release", {
            p_user_id: seed.user_id,
            p_release_id: releaseId,
          }),
        ),
        ...Array.from({ length: 3 }, () =>
          db.rpc("portal_record_staff_release_guide_open", {
            p_user_id: seed.user_id,
            p_release_id: releaseId,
          }),
        ),
        ...Array.from({ length: 2 }, () =>
          db.rpc("portal_record_staff_release_dismiss", {
            p_user_id: seed.user_id,
            p_release_id: releaseId,
          }),
        ),
      ]);
      for (const event of concurrentEvents) {
        expect(event.error).toBeNull();
      }

      const countedState = await db
        .from("portal_release_states")
        .select(
          "first_opened_at, last_viewed_at, view_count, guide_opened_at, last_guide_opened_at, guide_open_count, last_dismissed_at, dismiss_count",
        )
        .eq("staff_user_id", seed.user_id)
        .eq("release_id", releaseId)
        .single();
      expect(countedState.error).toBeNull();
      const counted = requireDecoded(
        releaseStateSchema.safeParse(countedState.data),
        "Counted release state could not be decoded",
      );
      expect(counted).toMatchObject({
        first_opened_at: firstOpenedAt,
        last_viewed_at: expect.any(String),
        view_count: 6,
        guide_opened_at: firstGuideOpenedAt,
        last_guide_opened_at: expect.any(String),
        guide_open_count: 4,
        last_dismissed_at: expect.any(String),
        dismiss_count: 3,
      });
      expect(Date.parse(counted.last_viewed_at)).toBeGreaterThanOrEqual(Date.parse(firstOpenedAt));
      const lastGuideOpenedAt = requireText(
        counted.last_guide_opened_at,
        "Last guide-open timestamp is missing",
      );
      expect(Date.parse(lastGuideOpenedAt)).toBeGreaterThanOrEqual(Date.parse(firstGuideOpenedAt));

      const acknowledged = await db.rpc("portal_acknowledge_staff_release", {
        p_user_id: seed.user_id,
        p_release_id: releaseId,
      });
      expect(acknowledged.error).toBeNull();
      expect(acknowledged.data).toBe(true);
      const repeatedAcknowledgement = await db.rpc("portal_acknowledge_staff_release", {
        p_user_id: seed.user_id,
        p_release_id: releaseId,
      });
      expect(repeatedAcknowledgement.error).toBeNull();
      expect(repeatedAcknowledgement.data).toBe(false);

      const acknowledgedState = await db
        .from("portal_release_states")
        .select("first_opened_at, acknowledged_at, hidden_at")
        .eq("staff_user_id", seed.user_id)
        .eq("release_id", releaseId)
        .single();
      expect(acknowledgedState.error).toBeNull();
      const acknowledgedRow = requireDecoded(
        z
          .object({
            first_opened_at: z.string(),
            acknowledged_at: z.string().nullable(),
            hidden_at: z.string().nullable(),
          })
          .safeParse(acknowledgedState.data),
        "Acknowledged release state could not be decoded",
      );
      expect(acknowledgedRow).toMatchObject({
        first_opened_at: firstOpenedAt,
        acknowledged_at: expect.any(String),
        hidden_at: null,
      });

      const hidden = await db.rpc("portal_hide_staff_release", {
        p_user_id: seed.user_id,
        p_release_id: releaseId,
      });
      expect(hidden.error).toBeNull();
      expect(hidden.data).toBe(true);
      const repeatedHide = await db.rpc("portal_hide_staff_release", {
        p_user_id: seed.user_id,
        p_release_id: releaseId,
      });
      expect(repeatedHide.error).toBeNull();
      expect(repeatedHide.data).toBe(false);

      const finalState = await db
        .from("portal_release_states")
        .select(
          "first_opened_at, last_viewed_at, view_count, acknowledged_at, hidden_at, guide_opened_at, last_guide_opened_at, guide_open_count, last_dismissed_at, dismiss_count",
        )
        .eq("staff_user_id", seed.user_id)
        .eq("release_id", releaseId)
        .single();
      expect(finalState.error).toBeNull();
      expect(finalState.data).toMatchObject({
        first_opened_at: firstOpenedAt,
        view_count: 6,
        acknowledged_at: acknowledgedRow.acknowledged_at,
        hidden_at: expect.any(String),
        guide_opened_at: firstGuideOpenedAt,
        guide_open_count: 4,
        dismiss_count: 3,
      });

      const seedAudits = await db
        .from("audit_log")
        .select("action, entity, entity_id, source, correlation_id, detail")
        .eq("entity_id", seed.id)
        .contains("detail", { release_id: releaseId })
        .order("at");
      expect(seedAudits.error).toBeNull();
      const seedAuditRows = requireDecoded(
        z.array(releaseAuditSchema).safeParse(seedAudits.data ?? []),
        "Release audit rows could not be decoded",
      );
      expect(seedAuditRows).toHaveLength(15);
      expect(
        seedAuditRows.reduce<Record<string, number>>(
          (counts: Readonly<Record<string, number>>, { action }) => ({
            ...counts,
            [action]: (counts[action] ?? 0) + 1,
          }),
          {},
        ),
      ).toEqual({
        "staff.release_open": 1,
        "staff.release_view": 5,
        "staff.release_guide_open": 4,
        "staff.release_dismiss": 3,
        "staff.release_acknowledge": 1,
        "staff.release_hide": 1,
      });
      for (const audit of seedAuditRows) {
        expect(audit).toMatchObject({
          entity: "portal_release_states",
          entity_id: seed.id,
          source: "staff",
          detail: { release_id: releaseId },
        });
        expectUuid(audit.correlation_id);
        const auditDetail = asJsonObject(audit.detail);
        expect(auditDetail !== null ? Object.keys(auditDetail) : []).toEqual(["release_id"]);
      }

      for (const mutation of [
        "portal_record_staff_release_guide_open",
        "portal_record_staff_release_dismiss",
      ] as const) {
        const missingState = await db.rpc(mutation, {
          p_user_id: second.userId,
          p_release_id: releaseId,
        });
        expect(missingState.error?.code).toBe("P0002");
      }
      const missingStateAudits = await db
        .from("audit_log")
        .select("id")
        .eq("entity_id", second.profileId)
        .contains("detail", { release_id: releaseId });
      expect(missingStateAudits.error).toBeNull();
      expect(missingStateAudits.data).toEqual([]);

      const secondOpen = await db.rpc("portal_open_staff_release", {
        p_user_id: second.userId,
        p_release_id: releaseId,
      });
      expect(secondOpen.error).toBeNull();
      expect(secondOpen.data).toBe(true);
      const isolatedStates = await db
        .from("portal_release_states")
        .select("staff_user_id")
        .eq("release_id", releaseId)
        .order("staff_user_id");
      expect(isolatedStates.error).toBeNull();
      const isolatedUserIds = requireDecoded(
        z.array(staffUserIdRowSchema).safeParse(isolatedStates.data ?? []),
        "Isolated release states could not be decoded",
      ).map(({ staff_user_id }) => staff_user_id);
      expect(isolatedUserIds).toEqual(
        [seed.user_id, second.userId].sort((left, right) => left.localeCompare(right)),
      );

      const reportRows = await db
        .from("portal_release_states")
        .select(
          "staff_user_id, profile:staff_profiles!portal_release_states_staff_user_id_fkey(display_name,email,active)",
        )
        .eq("release_id", releaseId)
        .order("staff_user_id");
      expect(reportRows.error).toBeNull();
      expect(reportRows.data).toHaveLength(2);
      expect(
        reportRows.data?.every(({ profile }) => releaseProfileSchema.safeParse(profile).success),
      ).toBe(true);

      for (const rejectedUserId of [pending.userId, inactive.userId, randomUUID()]) {
        for (const mutation of [
          "portal_open_staff_release",
          "portal_record_staff_release_guide_open",
          "portal_record_staff_release_dismiss",
        ] as const) {
          const rejected = await db.rpc(mutation, {
            p_user_id: rejectedUserId,
            p_release_id: releaseId,
          });
          expect(rejected.error?.code).toBe("P0002");
        }
      }
      expect(
        (await db.from("portal_release_states").select("staff_user_id").eq("release_id", releaseId))
          .data,
      ).toHaveLength(2);

      for (const invalidReleaseId of ["", " has-spaces", "x".repeat(81)]) {
        for (const mutation of [
          "portal_open_staff_release",
          "portal_record_staff_release_guide_open",
          "portal_record_staff_release_dismiss",
        ] as const) {
          const rejected = await db.rpc(mutation, {
            p_user_id: seed.user_id,
            p_release_id: invalidReleaseId,
          });
          expect(rejected.error?.code).toBe("22023");
        }
      }

      const legacyReleaseInsert = await db
        .from("portal_release_states")
        .insert({
          staff_user_id: second.userId,
          release_id: legacyReleaseId,
        })
        .select("first_opened_at, last_viewed_at, view_count")
        .single();
      expect(legacyReleaseInsert.error).toBeNull();
      expect(legacyReleaseInsert.data).toMatchObject({
        first_opened_at: expect.any(String),
        last_viewed_at: expect.any(String),
        view_count: 1,
      });
      expect(legacyReleaseInsert.data?.last_viewed_at).toBe(
        legacyReleaseInsert.data?.first_opened_at,
      );
      await db.from("portal_release_states").delete().eq("release_id", legacyReleaseId);
    } finally {
      await db
        .from("portal_release_states")
        .delete()
        .in("release_id", [releaseId, legacyReleaseId]);
      await db.from("audit_log").delete().contains("detail", { release_id: releaseId });
      if (profileIds.length > 0) {
        await db.from("staff_profiles").delete().in("id", profileIds);
      }
      for (const userId of createdUserIds) {
        await db.auth.admin.deleteUser(userId);
      }
    }
  });

  test("persists an intake row and resolves its PostgREST relationship", async ({ request }) => {
    const token = randomUUID().slice(0, 8);
    const sourcePath = `/e2e/supabase-dependency/${token}`;
    const response = await request.post("/api/requests", {
      data: {
        name: `TEST Supabase ${token}`,
        phone: PATIENT_PHONE,
        email: `supabase-${token}@example.test`,
        location: "tampa",
        time: "morning",
        message: "TEST dependency contract — no medical details.",
        locale: "en",
        sourcePath,
      },
      headers: { "X-Forwarded-For": `2001:db8:${token.slice(0, 4)}::9` },
    });
    expect(response.status()).toBe(201);
    const body = intakeResponseSchema.parse(await response.json());
    expect(body.ok).toBe(true);
    if (!body.ok) throw new Error("Intake API did not return a request id");

    const db = serviceDb();
    try {
      const event = await db.from("request_events").insert({
        request_id: body.id,
        type: "dependency-contract",
        status: "recorded",
      });
      expect(event.error).toBeNull();

      const joined = await db
        .from("requests")
        .select("id, source_path, status, request_events(id, type, status)")
        .eq("id", body.id)
        .single();
      expect(joined.error).toBeNull();
      expect(joined.data).toMatchObject({
        id: body.id,
        source_path: sourcePath,
        status: "new",
      });
      // Intake itself records a `created` event (workflow authority migration),
      // Plus the event this test inserted through PostgREST. Delivery events may
      // Also exist when a recipient is active; they are valid children and do
      // Not change the relationship contract under test.
      expect(joined.data?.request_events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "created", status: "recorded" }),
          expect.objectContaining({
            type: "dependency-contract",
            status: "recorded",
          }),
        ]),
      );
    } finally {
      await db.from("requests").delete().eq("id", body.id);
    }
  });

  test("shares one atomic intake limit across fresh service clients and expiry", async () => {
    const claim = async (hash: string, limit: number, windowSeconds: number): Promise<boolean> => {
      const result = await serviceDb().rpc("portal_check_intake_rate_limit", {
        p_client_hash: hash,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });
      expect(result.error).toBeNull();
      return result.data === true;
    };
    const hash = (label: string) =>
      createHash("sha256").update(`${randomUUID()}:${label}`).digest("hex");

    const restartHash = hash("restart");
    await expect(claim(restartHash, 2, 1)).resolves.toBe(true);
    await expect(claim(restartHash, 2, 1)).resolves.toBe(true);
    await expect(claim(restartHash, 2, 1)).resolves.toBe(false);
    await new Promise((resolve) => {
      setTimeout(resolve, 1_100);
    });
    await expect(claim(restartHash, 2, 1)).resolves.toBe(true);

    const concurrentHash = hash("concurrent");
    const claims = await Promise.all(
      Array.from({ length: INTAKE_RATE_LIMIT.limit + 3 }, async () =>
        claim(concurrentHash, INTAKE_RATE_LIMIT.limit, INTAKE_RATE_LIMIT.windowSeconds),
      ),
    );
    expect(claims.filter(Boolean)).toHaveLength(INTAKE_RATE_LIMIT.limit);
    expect(claims.filter((allowed) => !allowed)).toHaveLength(3);
  });

  test("adds, toggles, and removes recipients with atomic classified audits", async () => {
    const db = serviceDb();
    const actor = `recipient-atomic-${randomUUID()}@example.test`;
    const rawEmail = `Recipient-Atomic-${randomUUID()}@Example.Test`;
    const email = rawEmail.toLowerCase();
    const failedAddEmail = `recipient-failed-${randomUUID()}@example.test`;
    let recipientId: string | null = null;

    try {
      const added = await db.rpc("portal_add_notification_recipient", {
        p_actor_email: actor,
        p_email: `  ${rawEmail}  `,
        p_label: "  Front desk  ",
        p_active: true,
      });
      expect(added.error).toBeNull();
      expectUuid(z.string().parse(added.data));
      recipientId = String(added.data);

      const inserted = await db
        .from("notification_recipients")
        .select("email, label, active")
        .eq("id", recipientId)
        .single();
      expect(inserted.error).toBeNull();
      expect(inserted.data).toEqual({
        email,
        label: "Front desk",
        active: true,
      });

      const duplicate = await db.rpc("portal_add_notification_recipient", {
        p_actor_email: actor,
        p_email: email.toUpperCase(),
        p_label: null,
        p_active: true,
      });
      expect(duplicate.error?.code).toBe("23505");

      const noOp = await db.rpc("portal_toggle_notification_recipient", {
        p_actor_email: actor,
        p_recipient_id: recipientId,
        p_active: true,
      });
      expect(noOp.error).toBeNull();
      expect(noOp.data).toBe(false);

      const failedToggle = await db.rpc("portal_toggle_notification_recipient", {
        p_actor_email: "",
        p_recipient_id: recipientId,
        p_active: false,
      });
      expect(failedToggle.error?.code).toBe("23514");
      expect(
        (await db.from("notification_recipients").select("active").eq("id", recipientId).single())
          .data?.active,
      ).toBe(true);

      const toggled = await db.rpc("portal_toggle_notification_recipient", {
        p_actor_email: actor,
        p_recipient_id: recipientId,
        p_active: false,
      });
      expect(toggled.error).toBeNull();
      expect(toggled.data).toBe(true);

      const failedRemove = await db.rpc("portal_remove_notification_recipient", {
        p_actor_email: "",
        p_recipient_id: recipientId,
      });
      expect(failedRemove.error?.code).toBe("23514");
      expect(
        (await db.from("notification_recipients").select("active").eq("id", recipientId).single())
          .data?.active,
      ).toBe(false);

      const removed = await db.rpc("portal_remove_notification_recipient", {
        p_actor_email: actor,
        p_recipient_id: recipientId,
      });
      expect(removed.error).toBeNull();
      expect(removed.data).toBe(true);
      expect(
        (await db.from("notification_recipients").select("id").eq("id", recipientId).maybeSingle())
          .data,
      ).toBeNull();

      const audits = await db
        .from("audit_log")
        .select("action, source, correlation_id, detail")
        .eq("entity_id", recipientId);
      expect(audits.error).toBeNull();
      expect(audits.data).toHaveLength(3);
      expect(audits.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            action: "recipients.add",
            source: "staff",
            detail: { active: true, has_label: true },
          }),
          expect.objectContaining({
            action: "recipients.toggle",
            source: "staff",
            detail: { from: true, to: false },
          }),
          expect.objectContaining({
            action: "recipients.remove",
            source: "staff",
            detail: { active: false },
          }),
        ]),
      );
      const correlationIds = new Set(
        requireDecoded(
          z.array(correlationIdRowSchema).safeParse(audits.data ?? []),
          "Recipient audit correlation ids could not be decoded",
        ).map((row) => row.correlation_id),
      );
      expect(correlationIds.size).toBe(3);
      for (const correlationId of correlationIds) {
        expectUuid(z.string().parse(correlationId));
      }

      for (const mutation of [
        db.rpc("portal_toggle_notification_recipient", {
          p_actor_email: actor,
          p_recipient_id: randomUUID(),
          p_active: false,
        }),
        db.rpc("portal_remove_notification_recipient", {
          p_actor_email: actor,
          p_recipient_id: randomUUID(),
        }),
      ]) {
        expect((await mutation).error?.code).toBe("P0002");
      }

      const failedAdd = await db.rpc("portal_add_notification_recipient", {
        p_actor_email: "",
        p_email: failedAddEmail,
        p_label: null,
        p_active: true,
      });
      expect(failedAdd.error?.code).toBe("23514");
      expect(
        (await db.from("notification_recipients").select("id").eq("email", failedAddEmail)).data,
      ).toHaveLength(0);
    } finally {
      if (recipientId !== null && recipientId !== "") {
        await db.from("audit_log").delete().eq("entity_id", recipientId);
        await db.from("notification_recipients").delete().eq("id", recipientId);
      }
      await db.from("notification_recipients").delete().in("email", [email, failedAddEmail]);
    }
  });

  test("bridges only missing recipient RPCs and compensates compatibility failures", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    test.skip(
      process.env.SUPABASE_PROJECT_REF !== "local" && process.env.SUPABASE_PREVIEW_BRANCH !== "1",
      "RPC removal and forced audit failures require an isolated test database.",
    );

    const db = serviceDb();
    const permissionEmail = `recipient-permission-${randomUUID()}@example.test`;
    const failedAddEmail = `recipient-compat-failed-${randomUUID()}@example.test`;
    const recipientEmail = `recipient-compat-${randomUUID()}@example.test`;
    const auditConstraint = "audit_log_test_reject_recipient_compatibility";
    let recipientId: string | null = null;

    const clearAuditConstraint = () => {
      queryTestDatabase(
        `alter table public.audit_log drop constraint if exists ${auditConstraint}`,
      );
    };
    const rejectAuditAction = (action: string) => {
      clearAuditConstraint();
      queryTestDatabase(
        `alter table public.audit_log add constraint ${auditConstraint} check (action <> '${action}') not valid`,
      );
    };
    const recipientRows = (email: string) =>
      db.from("notification_recipients").select("id, active").eq("email", email);

    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(SEED_EMAIL);
    await page.getByLabel("Password").fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/?$/);

    try {
      queryTestDatabase(`
        revoke execute on function public.portal_add_notification_recipient(
          text,
          text,
          text,
          boolean
        ) from service_role;
      `);
      try {
        const permissionProbe = await db.rpc("portal_add_notification_recipient", {
          p_actor_email: SEED_EMAIL,
          p_email: permissionEmail,
          p_label: null,
          p_active: true,
        });
        expect(permissionProbe.error?.code).toBe("42501");

        const denied = await mutateSettings(page, "recipient.add", {
          email: permissionEmail,
          label: "Permission failure must stay closed",
          active: true,
        });
        expect(denied.status).toBe(503);
        expect(denied.body).toMatchObject({
          ok: false,
          code: "unavailable",
        });
        expect((await recipientRows(permissionEmail)).data).toHaveLength(0);
      } finally {
        queryTestDatabase(`
          grant execute on function public.portal_add_notification_recipient(
            text,
            text,
            text,
            boolean
          ) to service_role;
        `);
      }

      dropRecipientRpcs();
      const missingProbes = [
        () =>
          db.rpc("portal_add_notification_recipient", {
            p_actor_email: "",
            p_email: `recipient-probe-${randomUUID()}@example.test`,
            p_label: null,
            p_active: true,
          }),
        () =>
          db.rpc("portal_toggle_notification_recipient", {
            p_actor_email: SEED_EMAIL,
            p_recipient_id: randomUUID(),
            p_active: false,
          }),
        () =>
          db.rpc("portal_remove_notification_recipient", {
            p_actor_email: SEED_EMAIL,
            p_recipient_id: randomUUID(),
          }),
      ];
      for (const probe of missingProbes) {
        await expect
          .poll(async () => (await probe()).error?.code, { timeout: 15_000 })
          .toBe("PGRST202");
      }

      rejectAuditAction("recipients.add");
      const failedAdd = await mutateSettings(page, "recipient.add", {
        email: failedAddEmail,
        label: "Forced compatibility rollback",
        active: true,
      });
      expect(failedAdd.status).toBe(503);
      expect(failedAdd.body).toMatchObject({
        ok: false,
        code: "unavailable",
      });
      expect((await recipientRows(failedAddEmail)).data).toHaveLength(0);
      clearAuditConstraint();

      const added = await mutateSettings(page, "recipient.add", {
        email: recipientEmail,
        label: "Compatibility recipient",
        active: true,
      });
      expect(added.status).toBe(201);
      expect(added.body.ok).toBe(true);

      const inserted = await recipientRows(recipientEmail);
      expect(inserted.error).toBeNull();
      expect(inserted.data).toHaveLength(1);
      expect(inserted.data?.[0].active).toBe(true);
      recipientId = z.string().parse(inserted.data?.[0].id);
      expectUuid(recipientId);

      const duplicate = await mutateSettings(page, "recipient.add", {
        email: recipientEmail.toUpperCase(),
        label: "Duplicate compatibility recipient",
        active: true,
      });
      expect(duplicate.status).toBe(409);
      expect(duplicate.body).toMatchObject({ ok: false, code: "conflict" });

      rejectAuditAction("recipients.toggle");
      const failedToggle = await mutateSettings(page, "recipient.toggle", {
        recipientId,
        active: false,
      });
      expect(failedToggle.status).toBe(503);
      expect(failedToggle.body).toMatchObject({
        ok: false,
        code: "unavailable",
      });
      expect((await recipientRows(recipientEmail)).data?.[0].active).toBe(true);
      clearAuditConstraint();

      const toggled = await mutateSettings(page, "recipient.toggle", {
        recipientId,
        active: false,
      });
      expect(toggled.status).toBe(200);
      expect(toggled.body.ok).toBe(true);
      expect((await recipientRows(recipientEmail)).data?.[0].active).toBe(false);

      const missingId = randomUUID();
      const missingToggle = await mutateSettings(page, "recipient.toggle", {
        recipientId: missingId,
        active: false,
      });
      expect(missingToggle.status).toBe(404);
      expect(missingToggle.body).toMatchObject({
        ok: false,
        code: "not_found",
      });

      rejectAuditAction("recipients.remove");
      const failedRemove = await mutateSettings(page, "recipient.remove", {
        id: recipientId,
      });
      expect(failedRemove.status).toBe(503);
      expect(failedRemove.body).toMatchObject({
        ok: false,
        code: "unavailable",
      });
      expect((await recipientRows(recipientEmail)).data?.[0].active).toBe(false);
      clearAuditConstraint();

      const removed = await mutateSettings(page, "recipient.remove", {
        id: recipientId,
      });
      expect(removed.status).toBe(200);
      expect(removed.body.ok).toBe(true);
      expect((await recipientRows(recipientEmail)).data).toHaveLength(0);

      const missingRemove = await mutateSettings(page, "recipient.remove", {
        id: missingId,
      });
      expect(missingRemove.status).toBe(404);
      expect(missingRemove.body).toMatchObject({
        ok: false,
        code: "not_found",
      });

      const audits = await db
        .from("audit_log")
        .select("action, source, correlation_id, detail")
        .eq("entity_id", recipientId);
      expect(audits.error).toBeNull();
      expect(audits.data).toHaveLength(3);
      expect(audits.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            action: "recipients.add",
            source: "staff",
            detail: { active: true, has_label: true },
          }),
          expect.objectContaining({
            action: "recipients.toggle",
            source: "staff",
            detail: { from: true, to: false },
          }),
          expect.objectContaining({
            action: "recipients.remove",
            source: "staff",
            detail: { active: false },
          }),
        ]),
      );
      for (const audit of requireDecoded(
        z.array(correlationIdRowSchema).safeParse(audits.data ?? []),
        "Compatibility recipient audits could not be decoded",
      )) {
        expectUuid(audit.correlation_id);
      }
    } finally {
      try {
        clearAuditConstraint();
      } finally {
        try {
          restoreRecipientRpcs();
          await expect
            .poll(
              async () =>
                (
                  await db.rpc("portal_toggle_notification_recipient", {
                    p_actor_email: SEED_EMAIL,
                    p_recipient_id: randomUUID(),
                    p_active: false,
                  })
                ).error?.code,
              { timeout: 15_000 },
            )
            .toBe("P0002");
        } finally {
          if (recipientId !== null && recipientId !== "") {
            await db.from("audit_log").delete().eq("entity_id", recipientId);
            await db.from("notification_recipients").delete().eq("id", recipientId);
          }
          await db
            .from("notification_recipients")
            .delete()
            .in("email", [permissionEmail, failedAddEmail, recipientEmail]);
        }
      }
    }
  });

  test("updates recipient labels in place with one classified audit per change", async () => {
    const db = serviceDb();
    const recipientId = randomUUID();
    const actor = `recipient-label-${randomUUID()}@example.test`;
    const email = `recipient-label-${randomUUID()}@example.test`;
    const inserted = await db
      .from("notification_recipients")
      .insert({
        id: recipientId,
        email,
        label: "Before",
        active: false,
      })
      .select("email, label, active, created_at, updated_at")
      .single();
    expect(inserted.error).toBeNull();
    const insertedRow = requireDecoded(
      z
        .object({
          email: z.string(),
          label: z.string().nullable(),
          active: z.boolean(),
          created_at: z.string(),
          updated_at: z.string(),
        })
        .safeParse(inserted.data),
      "Recipient label fixture was not created",
    );

    try {
      const changed = await db.rpc("portal_update_recipient_label", {
        p_actor_email: actor,
        p_recipient_id: recipientId,
        p_label: "  After  ",
      });
      expect(changed.error).toBeNull();
      expect(changed.data).toBe(true);

      const updated = await db
        .from("notification_recipients")
        .select("email, label, active, created_at, updated_at")
        .eq("id", recipientId)
        .single();
      expect(updated.error).toBeNull();
      expect(updated.data).toMatchObject({
        email: insertedRow.email,
        label: "After",
        active: insertedRow.active,
        created_at: insertedRow.created_at,
      });
      expect(updated.data?.updated_at).not.toBe(insertedRow.updated_at);

      const firstAudits = await db
        .from("audit_log")
        .select("action, source, correlation_id, detail")
        .eq("entity_id", recipientId);
      expect(firstAudits.error).toBeNull();
      expect(firstAudits.data).toHaveLength(1);
      expect(firstAudits.data?.[0]).toMatchObject({
        action: "recipients.label_update",
        source: "staff",
        detail: { from: "Before", to: "After" },
      });
      expectUuid(z.string().parse(firstAudits.data?.[0].correlation_id));

      for (const invalidLabel of ["   ", "L".repeat(121)]) {
        const rejected = await db.rpc("portal_update_recipient_label", {
          p_actor_email: actor,
          p_recipient_id: recipientId,
          p_label: invalidLabel,
        });
        expect(rejected.error?.code).toBe("22023");
      }
      expect(
        (await db.from("notification_recipients").select("label").eq("id", recipientId).single())
          .data?.label,
      ).toBe("After");
      expect(
        (await db.from("audit_log").select("id").eq("entity_id", recipientId)).data,
      ).toHaveLength(1);

      const cleared = await db.rpc("portal_update_recipient_label", {
        p_actor_email: actor,
        p_recipient_id: recipientId,
        p_label: null,
      });
      expect(cleared.error).toBeNull();
      expect(cleared.data).toBe(true);
      expect(
        (await db.from("notification_recipients").select("label").eq("id", recipientId).single())
          .data?.label,
      ).toBeNull();
      const finalAudits = await db
        .from("audit_log")
        .select("source, correlation_id, detail")
        .eq("entity_id", recipientId)
        .order("at");
      expect(finalAudits.data).toHaveLength(2);
      expect(finalAudits.data?.[1]).toMatchObject({
        source: "staff",
        detail: { from: "After", to: null },
      });
      expect(finalAudits.data?.[1].correlation_id).not.toBe(finalAudits.data?.[0].correlation_id);
    } finally {
      await db.from("audit_log").delete().eq("entity_id", recipientId);
      await db.from("notification_recipients").delete().eq("id", recipientId);
    }
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

  test("enforces intake field caps at the database boundary", async () => {
    const base = {
      name: "TEST database cap",
      phone: PATIENT_PHONE,
      email: "database-cap@example.test",
      location: "tampa",
      preferred_time: "morning",
      message: null,
      locale: "en",
      source_path: "/e2e/database-field-cap",
    };
    const oversized = [
      { ...base, name: "N".repeat(REQUEST_FIELD_LIMITS.name + 1) },
      { ...base, phone: "8".repeat(REQUEST_FIELD_LIMITS.phone + 1) },
      { ...base, email: "e".repeat(REQUEST_FIELD_LIMITS.email + 1) },
    ];

    for (const row of oversized) {
      const result = await serviceDb().from("requests").insert(row);
      expect(result.error?.code).toBe("23514");
    }
  });
});
