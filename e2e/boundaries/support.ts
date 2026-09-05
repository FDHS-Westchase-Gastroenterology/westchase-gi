import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { z } from "zod";

import { jsonObjectSchema, jsonSchema } from "../../src/lib/json";
import type { Json, JsonObject } from "../../src/lib/json";
import { expectDenied, requireDecoded } from "../harness/assert";
import { publishableDb, requiredEnv, seedAdmin, serviceDb } from "../harness/env";
import { assertSafeE2ETarget } from "../harness/target-guard";

export const lifecycleRowSchema = z.object({
  status: z.string(),
  follow_up_at: z.string().nullable(),
  closure_disposition: z.string().nullable(),
  closed_at: z.string().nullable(),
  record_handoff_at: z.string().nullable(),
  closure_reason: z.string().nullable().optional(),
  closure_provenance: z.string().nullable().optional(),
});
export const releaseProfileSchema = z.looseObject({
  display_name: jsonSchema,
  email: jsonSchema,
  active: jsonSchema,
});
export const seedProfileSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  email: z.string(),
});
export const releaseStateSchema = z.object({
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
export const releaseAuditSchema = z.object({
  action: z.string(),
  entity: z.string(),
  entity_id: z.string(),
  source: z.string(),
  correlation_id: z.string(),
  detail: jsonSchema.nullable(),
});
export const staffUserIdRowSchema = z.object({
  staff_user_id: z.string(),
});
export const correlationIdRowSchema = z.object({
  correlation_id: z.string(),
});
export const requestEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.string(),
  meta: jsonSchema.nullable(),
});
export const commandUndoSchema = z.object({
  transitionId: z.string(),
});
export const commandOutcomeSchema = z.object({
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
export const lifecycleRunSchema = z.object({
  requests_removed: z.number(),
});
export const idRowSchema = z.object({
  id: z.string(),
});
export const nullableTimestampSchema = z.string().nullable();

export interface CallOutcomeAuditDetail {
  outcome: string;
  to: string;
  note_attached: boolean;
  note_length?: number;
}

export interface RequestInsert {
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

export interface WorkflowDecision {
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
export const APPOINTMENT_AT = "2027-03-04T15:30:00.000Z";

export const { email: SEED_EMAIL, password: SEED_PASSWORD } = seedAdmin();

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const PATIENT_PHONE = "8135550199";
export const RECIPIENT_RPC_MIGRATION =
  "supabase/migrations/20260802005123_atomic_notification_recipient_mutations.sql";
export const DROP_RECIPIENT_RPC_QUERIES = [
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

export function expectUuid(value: string): void {
  expect(value).toMatch(UUID_RE);
}

export function expectNoPatientLeak(blob: Json, note?: string | null): void {
  const text = JSON.stringify(blob);
  expect(text).not.toContain(note ?? "TEST patient value that is never present");
  expect(text).not.toContain(PATIENT_PHONE);
}

export async function mutateSettings(
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

export function testDatabaseConnectionArgs(): string[] {
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

export function queryTestDatabase(sql: string): void {
  try {
    execFileSync("supabase", ["db", "query", sql, ...testDatabaseConnectionArgs(), "--agent=no"], {
      cwd: process.cwd(),
      stdio: "pipe",
    });
  } catch {
    throw new Error("Destructive test database query failed");
  }
}

export function recipientRpcMigrationStatements(): string[] {
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

export function dropRecipientRpcs(): void {
  for (const sql of DROP_RECIPIENT_RPC_QUERIES) {
    queryTestDatabase(sql);
  }
  queryTestDatabase("notify pgrst, 'reload schema'");
}

export function restoreRecipientRpcs(): void {
  dropRecipientRpcs();
  for (const sql of recipientRpcMigrationStatements()) {
    queryTestDatabase(sql);
  }
  queryTestDatabase("notify pgrst, 'reload schema'");
}

export async function insertRequest(
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

export async function expectDeniedSurface(
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
