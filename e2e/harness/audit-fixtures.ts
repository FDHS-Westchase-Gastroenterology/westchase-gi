import postgres from "postgres";

import {
  connectionSettings,
  parsePostgresUrl,
  supabaseProjectRef,
} from "../../src/lib/db/connection";
import type { ConnectionSettings } from "../../src/lib/db/connection";
import type { JsonObject } from "../../src/lib/json";
import { loadLocalEnv } from "./env";
import { assertSafeE2ETarget } from "./target-guard";

type E2EEnvironment = Readonly<Record<string, string | undefined>>;

function first(env: E2EEnvironment, ...names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value !== undefined && value !== "") return value;
  }
  return undefined;
}

/**
 * Where spec cleanup removes audit rows: the Preview Branch's own database, as the role that
 * owns `audit_log`. The app's `service_role` can only read and append to the log, so no Data
 * API client can clean it up. Refused, before anything connects, unless the e2e target guard
 * passes and `POSTGRES_URL` names the allowlisted Preview Branch, which must not be
 * Production. A database that names no Supabase project (a local stack) is refused too.
 */
export function auditFixtureSettings(env: E2EEnvironment): ConnectionSettings {
  assertSafeE2ETarget(env);
  const postgresUrl = first(env, "POSTGRES_URL");
  if (postgresUrl === undefined) {
    throw new Error("Audit fixture cleanup needs POSTGRES_URL for the Preview Branch");
  }
  const databaseRef = supabaseProjectRef(parsePostgresUrl(postgresUrl));
  if (databaseRef === null) {
    throw new Error("Audit fixture cleanup refused: POSTGRES_URL names no Supabase project");
  }
  const productionRef = first(env, "SUPABASE_PROD_PROJECT_REF", "SUPABASE_PROJECT_REF_PROD");
  if (productionRef === undefined || databaseRef === productionRef) {
    throw new Error("Audit fixture cleanup refused: Production project rejected");
  }
  if (databaseRef !== first(env, "PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF")) {
    throw new Error("Audit fixture cleanup refused: POSTGRES_URL is not the allowlisted branch");
  }
  return connectionSettings(postgresUrl, env.NEXT_PUBLIC_SUPABASE_URL);
}

let client: postgres.Sql | null = null;

function auditFixtureClient(): postgres.Sql {
  if (client !== null) return client;
  loadLocalEnv();
  client = postgres({
    ...auditFixtureSettings(process.env),
    max: 1,
    idle_timeout: 2,
    max_lifetime: 60,
  });
  return client;
}

/** Which audit rows a cleanup removes. Every field given must match; at least one is required. */
export interface AuditRows {
  readonly ids?: readonly string[];
  readonly entityIds?: readonly string[];
  readonly entity?: string;
  readonly actorEmail?: string;
  /** A SQL `like` pattern for `actor_email`. */
  readonly actorEmailLike?: string;
  readonly action?: string;
  /** Rows written at or after this instant. */
  readonly atFrom?: string;
  /** Rows whose `detail` contains this JSON (`@>`). */
  readonly detailContains?: JsonObject;
}

/**
 * Deletes the audit rows a spec wrote and returns how many went. Throws when the delete fails,
 * so a cleanup that leaves rows behind fails the spec instead of passing silently. An empty id
 * list matches nothing and deletes nothing.
 */
export async function deleteAuditRows(rows: AuditRows): Promise<number> {
  if (rows.ids?.length === 0 || rows.entityIds?.length === 0) return 0;
  const sql = auditFixtureClient();
  const conditions: postgres.Fragment[] = [];
  if (rows.ids !== undefined) conditions.push(sql`id = any(${rows.ids}::uuid[])`);
  if (rows.entityIds !== undefined) {
    conditions.push(sql`entity_id = any(${rows.entityIds}::uuid[])`);
  }
  if (rows.entity !== undefined) conditions.push(sql`entity = ${rows.entity}`);
  if (rows.actorEmail !== undefined) conditions.push(sql`actor_email = ${rows.actorEmail}`);
  if (rows.actorEmailLike !== undefined) {
    conditions.push(sql`actor_email like ${rows.actorEmailLike}`);
  }
  if (rows.action !== undefined) conditions.push(sql`action = ${rows.action}`);
  if (rows.atFrom !== undefined) conditions.push(sql`at >= ${rows.atFrom}::timestamptz`);
  if (rows.detailContains !== undefined) {
    // The driver serializes jsonb itself; a pre-stringified object arrives as a string scalar.
    conditions.push(sql`detail @> ${sql.json(rows.detailContains)}`);
  }
  if (conditions.length === 0) throw new Error("deleteAuditRows needs at least one filter");
  const where = conditions.reduce((joined, condition) => sql`${joined} and ${condition}`);
  const deleted = await sql`delete from public.audit_log where ${where}`;
  return deleted.count;
}

/** Closes the cleanup connection, for a process (global setup) that must exit promptly. */
export async function closeAuditFixtures(): Promise<void> {
  const open = client;
  client = null;
  await open?.end({ timeout: 5 });
}
