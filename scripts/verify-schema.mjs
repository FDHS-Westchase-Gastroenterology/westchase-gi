import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

import { z } from "zod"

import { asJsonObject, asJsonString, jsonSchema } from "../src/lib/json.ts"

function providerErrorObject(payload) {
  const parsed = jsonSchema.safeParse(payload)
  if (!parsed.success) return null
  return asJsonObject(parsed.data)
}

function providerErrorMessage(payload) {
  const object = providerErrorObject(payload)
  if (!object) return null
  return (
    asJsonString(object.message) ??
    asJsonString(object.msg) ??
    asJsonString(object.error_description) ??
    asJsonString(object.error)
  )
}

function providerErrorCode(payload) {
  const object = providerErrorObject(payload)
  return object ? asJsonString(object.code) : null
}

const staffProfileRowSchema = z.object({
  user_id: z.string(),
  role: z.string(),
  active: z.boolean(),
  onboarded_at: z.string(),
  portal_tour_dismissed_at: z.string(),
})

const TABLES = [
  "audit_log",
  "notification_recipients",
  "portal_release_states",
  "request_events",
  "requests",
  "staff_profiles",
]

const RETIRED_TABLES = [
  ["registry", "assets"].join("_"),
  ["registry", "grants"].join("_"),
]

const POLICIES = []

const RPC_SIGNATURES = {
  portal_acknowledge_staff_release: "p_user_id uuid, p_release_id text",
  portal_add_notification_recipient:
    "p_actor_email text, p_email text, p_label text, p_active boolean",
  portal_add_request_note:
    "p_actor_email text, p_request_id uuid, p_note text, p_note_length integer",
  portal_check_intake_rate_limit:
    "p_client_hash text, p_limit integer, p_window_seconds integer",
  portal_record_analytics_event:
    "p_event text, p_route_template text, p_locale text, p_device_class text",
  portal_close_request:
    "p_actor_email text, p_request_id uuid, p_disposition text",
  portal_complete_staff_onboarding: "p_user_id uuid",
  portal_delete_request_early:
    "p_actor_email text, p_request_id uuid, p_authorization_ref text",
  portal_log_call_outcome:
    "p_actor_email text, p_request_id uuid, p_outcome text, p_note text, p_follow_up_at timestamp with time zone",
  portal_undo_call_outcome:
    "p_actor_email text, p_request_id uuid, p_event_id uuid",
  portal_hide_staff_release: "p_user_id uuid, p_release_id text",
  portal_open_staff_release: "p_user_id uuid, p_release_id text",
  portal_preview_data_lifecycle: "p_now timestamp with time zone",
  portal_record_staff_password_reset: "p_user_id uuid",
  portal_record_staff_release_dismiss: "p_user_id uuid, p_release_id text",
  portal_record_staff_release_guide_open: "p_user_id uuid, p_release_id text",
  portal_remove_notification_recipient:
    "p_actor_email text, p_recipient_id uuid",
  portal_run_data_lifecycle:
    "p_actor_email text, p_now timestamp with time zone",
  portal_set_request_legal_hold:
    "p_actor_email text, p_request_id uuid, p_held boolean, p_reason text",
  portal_set_staff_tour_dismissed: "p_user_id uuid, p_dismissed boolean",
  portal_toggle_notification_recipient:
    "p_actor_email text, p_recipient_id uuid, p_active boolean",
  portal_update_recipient_label:
    "p_actor_email text, p_recipient_id uuid, p_label text",
  portal_update_request_status:
    "p_actor_email text, p_request_id uuid, p_next_status text",
}

const RETIRED_RPC_SIGNATURES = [
  {
    name: ["portal", "create", "registry", "asset"].join("_"),
    signature:
      "p_actor_email text, p_name text, p_kind text, p_repo text, p_live_url text, p_hosting text, p_maintainer text, p_status text, p_notes text",
  },
  {
    name: ["portal", "update", "registry", "asset"].join("_"),
    signature:
      "p_actor_email text, p_asset_id uuid, p_name text, p_kind text, p_repo text, p_live_url text, p_hosting text, p_maintainer text, p_status text, p_notes text",
  },
  {
    name: ["portal", "archive", "registry", "asset"].join("_"),
    signature: "p_actor_email text, p_asset_id uuid",
  },
  {
    name: ["portal", "add", "registry", "grant"].join("_"),
    signature:
      "p_actor_email text, p_asset_id uuid, p_person text, p_role text, p_granted_via text",
  },
  {
    name: ["portal", "deactivate", "registry", "grant"].join("_"),
    signature: "p_actor_email text, p_grant_id uuid",
  },
]

const RPCS = Object.keys(RPC_SIGNATURES).sort()
const RPC_RESULTS = {
  portal_acknowledge_staff_release: "boolean",
  portal_add_notification_recipient: "uuid",
  portal_add_request_note: "uuid",
  portal_check_intake_rate_limit: "boolean",
  portal_record_analytics_event: "boolean",
  portal_close_request: "boolean",
  portal_complete_staff_onboarding: "boolean",
  portal_delete_request_early: "boolean",
  portal_log_call_outcome: "uuid",
  portal_undo_call_outcome: "jsonb",
  portal_hide_staff_release: "boolean",
  portal_open_staff_release: "boolean",
  portal_preview_data_lifecycle: "jsonb",
  portal_record_staff_password_reset: "boolean",
  portal_record_staff_release_dismiss: "boolean",
  portal_record_staff_release_guide_open: "boolean",
  portal_remove_notification_recipient: "boolean",
  portal_run_data_lifecycle: "jsonb",
  portal_set_request_legal_hold: "boolean",
  portal_set_staff_tour_dismissed: "boolean",
  portal_toggle_notification_recipient: "boolean",
  portal_update_recipient_label: "boolean",
  portal_update_request_status: "boolean",
}
const AUDIT_RPC_SOURCES = {
  portal_acknowledge_staff_release: "staff",
  portal_add_notification_recipient: "staff",
  portal_add_request_note: "staff",
  portal_close_request: "staff",
  portal_complete_staff_onboarding: "staff",
  portal_delete_request_early: "staff",
  portal_log_call_outcome: "staff",
  portal_undo_call_outcome: "staff",
  portal_hide_staff_release: "staff",
  portal_open_staff_release: "staff",
  portal_record_staff_password_reset: "staff",
  portal_record_staff_release_dismiss: "staff",
  portal_record_staff_release_guide_open: "staff",
  portal_remove_notification_recipient: "staff",
  portal_run_data_lifecycle: "system",
  portal_set_request_legal_hold: "staff",
  portal_set_staff_tour_dismissed: "staff",
  portal_toggle_notification_recipient: "staff",
  portal_update_recipient_label: "staff",
  portal_update_request_status: "staff",
}
const PHASE_C_MIGRATION = {
  version: "20260714224219",
  name: "close_portal_data_api_and_atomic_audits",
}
const ONBOARDING_MIGRATION = {
  version: "20260715023258",
  name: "complete_staff_onboarding",
}
const PASSWORD_RESET_LOCK_MIGRATION = {
  version: "20260715025435",
  name: "serialize_password_reset_deactivation",
}
const REVIEW_QR_RETIREMENT_MIGRATION = {
  version: "20260716132839",
  name: "retire_review_qr_registry_asset",
}
const SOFTWARE_REGISTRY_RETIREMENT_MIGRATION = {
  version: "20260716151327",
  name: "retire_software_registry",
}
const PORTAL_TOUR_MIGRATION = {
  version: "20260720102654",
  name: "add_portal_staff_tour",
}
const INTAKE_RATE_LIMIT_MIGRATION = {
  version: "20260725133049",
  name: "harden_intake_rate_limits",
}
const DATA_LIFECYCLE_MIGRATION = {
  version: "20260725170000",
  name: "add_request_data_lifecycle",
}
const CALL_OUTCOME_MIGRATION = {
  version: "20260727013641",
  name: "add_atomic_call_outcome",
}
const AUDIT_PROVENANCE_MIGRATION = {
  version: "20260727070521",
  name: "add_audit_provenance_and_recipient_label_update",
}
const ANALYTICS_MIGRATION = {
  version: "20260728223000",
  name: "add_patient_analytics_daily",
}
const PORTAL_RELEASE_STATE_MIGRATION = {
  version: "20260729095026",
  name: "add_portal_release_briefing_state",
}
const PORTAL_RELEASE_ENGAGEMENT_MIGRATION = {
  version: "20260729105056",
  name: "add_portal_release_engagement_telemetry",
}
const PORTAL_RELEASE_GUIDE_FIX_MIGRATION = {
  version: "20260729105736",
  name: "fix_portal_release_guide_timestamp",
}
const CALL_OUTCOME_UNDO_MIGRATION = {
  version: "20260729172311",
  name: "add_atomic_call_outcome_undo",
}
const RECIPIENT_MUTATIONS_MIGRATION = {
  version: "20260802005123",
  name: "atomic_notification_recipient_mutations",
}

const TARGETS = new Set(["dev", "prod"])

function parseTarget(args) {
  const inline = args.find((arg) => arg.startsWith("--target="))
  const flagIndex = args.indexOf("--target")
  const value =
    inline?.slice("--target=".length) ??
    (flagIndex >= 0 ? args[flagIndex + 1] : undefined)

  if (!value || !TARGETS.has(value)) {
    throw new Error("Usage: node scripts/verify-schema.mjs --target dev|prod")
  }

  return value
}

function requireEnv(...names) {
  for (const name of names) {
    const value = process.env[name]
    if (value) {
      return value
    }
  }

  throw new Error(`Missing required environment variable: ${names.join(" or ")}`)
}

function projectConfig(target) {
  if (target === "dev") {
    return {
      ref: requireEnv("SUPABASE_DEV_PROJECT_REF", "SUPABASE_PROJECT_REF"),
      url: requireEnv("SUPABASE_DEV_URL", "NEXT_PUBLIC_SUPABASE_URL"),
      anonKey: requireEnv(
        "SUPABASE_DEV_ANON_KEY",
        "SUPABASE_DEV_PUBLISHABLE_KEY",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      ),
      serviceKey: requireEnv(
        "SUPABASE_DEV_SERVICE_ROLE_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
      ),
    }
  }

  return {
    ref: requireEnv("SUPABASE_PROD_PROJECT_REF", "SUPABASE_PROJECT_REF_PROD"),
    url: requireEnv("SUPABASE_PROD_URL", "SUPABASE_URL_PROD"),
    anonKey: requireEnv(
      "SUPABASE_PROD_ANON_KEY",
      "SUPABASE_PROD_PUBLISHABLE_KEY",
      "SUPABASE_ANON_KEY_PROD",
      "SUPABASE_PUBLISHABLE_KEY_PROD",
    ),
    serviceKey: requireEnv(
      "SUPABASE_PROD_SERVICE_ROLE_KEY",
      "SUPABASE_SERVICE_ROLE_KEY_PROD",
    ),
  }
}

function adminCredentials(target) {
  return target === "dev"
    ? {
        email: requireEnv("PORTAL_SEED_ADMIN_EMAIL"),
        password: requireEnv("PORTAL_SEED_ADMIN_PASSWORD"),
      }
    : {
        email: requireEnv("PORTAL_PROD_ADMIN_EMAIL"),
        password: requireEnv("PORTAL_PROD_ADMIN_PASSWORD"),
      }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function parseResponse(response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function readResponse(response, operation) {
  const payload = await parseResponse(response)

  if (!response.ok) {
    const message = providerErrorMessage(payload)
    throw new Error(`${operation} failed (${response.status})${message ? `: ${message}` : ""}`)
  }

  return payload
}

async function queryDatabase({ accessToken, ref, query }) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${encodeURIComponent(ref)}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  )
  if (response.status === 401) {
    const linkedRef = readFileSync("supabase/.temp/project-ref", "utf8").trim()
    const devRef =
      process.env.SUPABASE_DEV_PROJECT_REF ?? process.env.SUPABASE_PROJECT_REF
    assert(
      ref === devRef && linkedRef === devRef,
      "Direct database verification fallback is Development-only",
    )
    const dbUrl = readFileSync("supabase/.temp/pooler-url", "utf8").trim()
    const password = requireEnv(
      "SUPABASE_DEV_DB_PASSWORD",
      "SUPABASE_DB_PASSWORD",
    )
    return JSON.parse(
      execFileSync(
        "supabase",
        [
          "db",
          "query",
          "--db-url",
          dbUrl,
          "--agent=no",
          "--output",
          "json",
          query,
        ],
        {
          encoding: "utf8",
          env: { ...process.env, PGPASSWORD: password },
          stdio: ["ignore", "pipe", "inherit"],
        },
      ),
    )
  }
  const payload = await readResponse(response, "Database verification query")

  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.result)) {
    return payload.result
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  throw new Error("Database verification query returned an unexpected shape")
}

function serviceHeaders(serviceKey) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  }
}

async function selectRows({ url, serviceKey, table, query }) {
  const response = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: serviceHeaders(serviceKey),
  })
  const payload = await readResponse(response, `Read ${table}`)

  if (!Array.isArray(payload)) {
    throw new Error(`Read ${table} returned an unexpected shape`)
  }

  return payload
}

async function assertSelectDeniedAsUser({
  url,
  anonKey,
  accessToken,
  table,
  query,
}) {
  const response = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  })
  const payload = await parseResponse(response)

  assert(!response.ok, `Authenticated read of ${table} unexpectedly succeeded`)
  const code = providerErrorCode(payload)
  assert(
    code === "42501",
    `Authenticated read of ${table} failed unexpectedly (${response.status}${code ? `/${code}` : ""})`,
  )
}

async function assertAtomicAuditRollback({ target, url, serviceKey }) {
  const marker = `verify-${target}-${Date.now()}@example.test`
  const createResponse = await fetch(`${url}/rest/v1/requests`, {
    method: "POST",
    headers: {
      ...serviceHeaders(serviceKey),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      name: "Schema verifier",
      phone: "8135550100",
      email: marker,
      location: "any",
      preferred_time: "any",
      message: null,
      locale: "en",
      source_path: "/schema-verifier",
      status: "new",
    }),
  })
  const created = await readResponse(createResponse, "Create rollback-check request")
  const requestId = Array.isArray(created) ? created[0]?.id : null
  assert(requestId, "Rollback-check request was not created")

  try {
    const response = await fetch(
      `${url}/rest/v1/rpc/portal_log_call_outcome`,
      {
        method: "POST",
        headers: {
          ...serviceHeaders(serviceKey),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_actor_email: "",
          p_request_id: requestId,
          p_outcome: "voicemail",
          p_note: "TEST forced audit rollback",
          p_follow_up_at: new Date(Date.now() + 60_000).toISOString(),
        }),
      },
    )
    const payload = await parseResponse(response)
    const code = providerErrorCode(payload)
    assert(
      !response.ok && code === "23514",
      `Forced audit failure was unexpected (${response.status}${code ? `/${code}` : ""})`,
    )

    const rows = await selectRows({
      url,
      serviceKey,
      table: "requests",
      query: `select=id,status,follow_up_at,closure_disposition&id=eq.${encodeURIComponent(requestId)}`,
    })
    assert(
      rows.length === 1 &&
        rows[0].status === "new" &&
        rows[0].follow_up_at === null &&
        rows[0].closure_disposition === null,
      "Call-outcome request state survived a forced audit failure",
    )
    const events = await selectRows({
      url,
      serviceKey,
      table: "request_events",
      query: `select=id&request_id=eq.${encodeURIComponent(requestId)}`,
    })
    assert(
      events.length === 0,
      "Call-outcome events survived a forced audit failure",
    )
  } finally {
    const response = await fetch(
      `${url}/rest/v1/requests?id=eq.${encodeURIComponent(requestId)}`,
      {
        method: "DELETE",
        headers: serviceHeaders(serviceKey),
      },
    )
    await readResponse(response, "Delete rollback-check request")
  }
}

async function signIn({ url, anonKey, email, password }) {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })
  const payload = await readResponse(response, "Seed admin password sign-in")

  assert(payload?.access_token, "Seed admin sign-in returned no access token")
  assert(payload?.user?.id, "Seed admin sign-in returned no user")
  return {
    accessToken: payload.access_token,
    user: payload.user,
  }
}

function sameValues(actual, expected) {
  return (
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  )
}

async function main() {
  const target = parseTarget(process.argv.slice(2))
  const config = projectConfig(target)
  const accessToken = requireEnv("SUPABASE_ACCESS_TOKEN")
  const credentials = adminCredentials(target)
  const email = credentials.email.trim().toLowerCase()
  const password = credentials.password
  const tableList = TABLES.map((name) => `'${name}'`).join(", ")
  const retiredTableList = RETIRED_TABLES.map((name) => `'${name}'`).join(", ")
  const rpcList = RPCS.map((name) => `'${name}'`).join(", ")
  const retiredRpcList = RETIRED_RPC_SIGNATURES.map(({ name }) => `'${name}'`).join(", ")

  const migrationRows = await queryDatabase({
    accessToken,
    ref: config.ref,
    query: `
      select version, name
      from supabase_migrations.schema_migrations
      order by version;
    `,
  })
  assert(
    migrationRows.some(
      (row) =>
        row.version === PHASE_C_MIGRATION.version &&
        row.name === PHASE_C_MIGRATION.name,
    ),
    `Phase C migration ${PHASE_C_MIGRATION.version}_${PHASE_C_MIGRATION.name} is not applied`,
  )
  assert(
    migrationRows.some(
      (row) =>
        row.version === ONBOARDING_MIGRATION.version &&
        row.name === ONBOARDING_MIGRATION.name,
    ),
    `Onboarding migration ${ONBOARDING_MIGRATION.version}_${ONBOARDING_MIGRATION.name} is not applied`,
  )
  assert(
    migrationRows.some(
      (row) =>
        row.version === PASSWORD_RESET_LOCK_MIGRATION.version &&
        row.name === PASSWORD_RESET_LOCK_MIGRATION.name,
    ),
    `Password-reset lock migration ${PASSWORD_RESET_LOCK_MIGRATION.version}_${PASSWORD_RESET_LOCK_MIGRATION.name} is not applied`,
  )
  assert(
    migrationRows.some(
      (row) =>
        row.version === REVIEW_QR_RETIREMENT_MIGRATION.version &&
        row.name === REVIEW_QR_RETIREMENT_MIGRATION.name,
    ),
    `Review-QR retirement migration ${REVIEW_QR_RETIREMENT_MIGRATION.version}_${REVIEW_QR_RETIREMENT_MIGRATION.name} is not applied`,
  )
  assert(
    migrationRows.some(
      (row) =>
        row.version === SOFTWARE_REGISTRY_RETIREMENT_MIGRATION.version &&
        row.name === SOFTWARE_REGISTRY_RETIREMENT_MIGRATION.name,
    ),
    `Software-registry retirement migration ${SOFTWARE_REGISTRY_RETIREMENT_MIGRATION.version}_${SOFTWARE_REGISTRY_RETIREMENT_MIGRATION.name} is not applied`,
  )
  assert(
    migrationRows.some(
      (row) =>
        row.version === PORTAL_TOUR_MIGRATION.version &&
        row.name === PORTAL_TOUR_MIGRATION.name,
    ),
    `Portal-tour migration ${PORTAL_TOUR_MIGRATION.version}_${PORTAL_TOUR_MIGRATION.name} is not applied`,
  )
  assert(
    migrationRows.some(
      (row) =>
        row.version === INTAKE_RATE_LIMIT_MIGRATION.version &&
        row.name === INTAKE_RATE_LIMIT_MIGRATION.name,
    ),
    `Intake rate-limit migration ${INTAKE_RATE_LIMIT_MIGRATION.version}_${INTAKE_RATE_LIMIT_MIGRATION.name} is not applied`,
  )
  assert(
    migrationRows.some(
      (row) =>
        row.version === DATA_LIFECYCLE_MIGRATION.version &&
        row.name === DATA_LIFECYCLE_MIGRATION.name,
    ),
    `Data-lifecycle migration ${DATA_LIFECYCLE_MIGRATION.version}_${DATA_LIFECYCLE_MIGRATION.name} is not applied`,
  )
  assert(
    migrationRows.some(
      (row) =>
        row.version === CALL_OUTCOME_MIGRATION.version &&
        row.name === CALL_OUTCOME_MIGRATION.name,
    ),
    `Call-outcome migration ${CALL_OUTCOME_MIGRATION.version}_${CALL_OUTCOME_MIGRATION.name} is not applied`,
  )
  assert(
    migrationRows.some(
      (row) =>
        row.version === AUDIT_PROVENANCE_MIGRATION.version &&
        row.name === AUDIT_PROVENANCE_MIGRATION.name,
    ),
    `Audit-provenance migration ${AUDIT_PROVENANCE_MIGRATION.version}_${AUDIT_PROVENANCE_MIGRATION.name} is not applied`,
  )
  assert(
    migrationRows.some(
      (row) =>
        row.version === ANALYTICS_MIGRATION.version &&
        row.name === ANALYTICS_MIGRATION.name,
    ),
    `Analytics migration ${ANALYTICS_MIGRATION.version}_${ANALYTICS_MIGRATION.name} is not applied`,
  )
  assert(
    migrationRows.some(
      (row) =>
        row.version === PORTAL_RELEASE_STATE_MIGRATION.version &&
        row.name === PORTAL_RELEASE_STATE_MIGRATION.name,
    ),
    `Portal release-state migration ${PORTAL_RELEASE_STATE_MIGRATION.version}_${PORTAL_RELEASE_STATE_MIGRATION.name} is not applied`,
  )
  assert(
    migrationRows.some(
      (row) =>
        row.version === PORTAL_RELEASE_ENGAGEMENT_MIGRATION.version &&
        row.name === PORTAL_RELEASE_ENGAGEMENT_MIGRATION.name,
    ),
    `Portal release-engagement migration ${PORTAL_RELEASE_ENGAGEMENT_MIGRATION.version}_${PORTAL_RELEASE_ENGAGEMENT_MIGRATION.name} is not applied`,
  )
  assert(
    migrationRows.some(
      (row) =>
        row.version === PORTAL_RELEASE_GUIDE_FIX_MIGRATION.version &&
        row.name === PORTAL_RELEASE_GUIDE_FIX_MIGRATION.name,
    ),
    `Portal release guide fix migration ${PORTAL_RELEASE_GUIDE_FIX_MIGRATION.version}_${PORTAL_RELEASE_GUIDE_FIX_MIGRATION.name} is not applied`,
  )
  assert(
    migrationRows.some(
      (row) =>
        row.version === CALL_OUTCOME_UNDO_MIGRATION.version &&
        row.name === CALL_OUTCOME_UNDO_MIGRATION.name,
    ),
    `Call-outcome undo migration ${CALL_OUTCOME_UNDO_MIGRATION.version}_${CALL_OUTCOME_UNDO_MIGRATION.name} is not applied`,
  )
  assert(
    migrationRows.some(
      (row) =>
        row.version === RECIPIENT_MUTATIONS_MIGRATION.version &&
        row.name === RECIPIENT_MUTATIONS_MIGRATION.name,
    ),
    `Recipient-mutations migration ${RECIPIENT_MUTATIONS_MIGRATION.version}_${RECIPIENT_MUTATIONS_MIGRATION.name} is not applied`,
  )

  const onboardingColumnRows = await queryDatabase({
    accessToken,
    ref: config.ref,
    query: `
      select data_type, is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'staff_profiles'
        and column_name = 'onboarded_at';
    `,
  })
  assert(
    onboardingColumnRows.length === 1 &&
      onboardingColumnRows[0].data_type === "timestamp with time zone" &&
      onboardingColumnRows[0].is_nullable === "YES" &&
      onboardingColumnRows[0].column_default === null,
    "staff_profiles.onboarded_at must be nullable timestamptz with no default",
  )

  const tourColumnRows = await queryDatabase({
    accessToken,
    ref: config.ref,
    query: `
      select data_type, is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'staff_profiles'
        and column_name = 'portal_tour_dismissed_at';
    `,
  })
  assert(
    tourColumnRows.length === 1 &&
      tourColumnRows[0].data_type === "timestamp with time zone" &&
      tourColumnRows[0].is_nullable === "YES" &&
      tourColumnRows[0].column_default === null,
    "staff_profiles.portal_tour_dismissed_at must be nullable timestamptz with no default",
  )

  const portalReleaseColumnRows = await queryDatabase({
    accessToken,
    ref: config.ref,
    query: `
      select column_name, data_type, is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'portal_release_states'
      order by ordinal_position;
    `,
  })
  assert(
    sameValues(
      portalReleaseColumnRows.map((row) => row.column_name),
      [
        "staff_user_id",
        "release_id",
        "first_opened_at",
        "acknowledged_at",
        "hidden_at",
        "last_viewed_at",
        "view_count",
        "guide_opened_at",
        "last_guide_opened_at",
        "guide_open_count",
        "last_dismissed_at",
        "dismiss_count",
      ],
    ) &&
      portalReleaseColumnRows.find(
        (row) => row.column_name === "staff_user_id",
      )?.data_type === "uuid" &&
      portalReleaseColumnRows.find((row) => row.column_name === "release_id")
        ?.data_type === "text" &&
      portalReleaseColumnRows
        .filter((row) => row.column_name.endsWith("_at"))
        .every((row) => row.data_type === "timestamp with time zone") &&
      portalReleaseColumnRows.find(
        (row) => row.column_name === "first_opened_at",
      )?.is_nullable === "NO" &&
      portalReleaseColumnRows.find(
        (row) => row.column_name === "acknowledged_at",
      )?.is_nullable === "YES" &&
      portalReleaseColumnRows.find((row) => row.column_name === "hidden_at")
        ?.is_nullable === "YES" &&
      portalReleaseColumnRows.find(
        (row) => row.column_name === "last_viewed_at",
      )?.is_nullable === "NO" &&
      portalReleaseColumnRows
        .filter((row) => row.column_name.endsWith("_count"))
        .every(
          (row) =>
            row.data_type === "integer" &&
            row.is_nullable === "NO" &&
            row.column_default !== null,
        ),
    "portal_release_states must contain the per-staff release state and bounded engagement telemetry",
  )

  const portalReleaseConstraintRows = await queryDatabase({
    accessToken,
    ref: config.ref,
    query: `
      select conname, contype, pg_catalog.pg_get_constraintdef(oid) as definition
      from pg_catalog.pg_constraint
      where conrelid = 'public.portal_release_states'::pg_catalog.regclass
      order by conname;
    `,
  })
  const portalReleasePrimaryKey = portalReleaseConstraintRows.find(
    (row) => row.conname === "portal_release_states_pkey",
  )
  const portalReleaseIdCheck = portalReleaseConstraintRows.find(
    (row) => row.conname === "portal_release_states_release_id_valid",
  )
  const portalReleaseViewCountCheck = portalReleaseConstraintRows.find(
    (row) => row.conname === "portal_release_states_view_count_valid",
  )
  const portalReleaseViewTimestampCheck = portalReleaseConstraintRows.find(
    (row) => row.conname === "portal_release_states_view_timestamps_valid",
  )
  const portalReleaseGuideCheck = portalReleaseConstraintRows.find(
    (row) => row.conname === "portal_release_states_guide_engagement_valid",
  )
  const portalReleaseDismissCheck = portalReleaseConstraintRows.find(
    (row) => row.conname === "portal_release_states_dismiss_engagement_valid",
  )
  assert(
    ["p", 112].includes(portalReleasePrimaryKey?.contype) &&
      portalReleasePrimaryKey.definition
        .toLowerCase()
        .includes("staff_user_id, release_id") &&
      ["c", 99].includes(portalReleaseIdCheck?.contype) &&
      portalReleaseIdCheck.definition.toLowerCase().includes("btrim") &&
      portalReleaseIdCheck.definition.toLowerCase().includes("80") &&
      ["c", 99].includes(portalReleaseViewCountCheck?.contype) &&
      portalReleaseViewCountCheck.definition.includes("2147483647") &&
      ["c", 99].includes(portalReleaseViewTimestampCheck?.contype) &&
      portalReleaseViewTimestampCheck.definition.includes("last_viewed_at") &&
      ["c", 99].includes(portalReleaseGuideCheck?.contype) &&
      portalReleaseGuideCheck.definition.includes("guide_open_count") &&
      ["c", 99].includes(portalReleaseDismissCheck?.contype) &&
      portalReleaseDismissCheck.definition.includes("dismiss_count"),
    "portal_release_states must use the staff/release key and enforce bounded, timestamp-consistent engagement telemetry",
  )

  const tableRows = await queryDatabase({
    accessToken,
    ref: config.ref,
    query: `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in (${tableList})
      order by table_name;
    `,
  })
  const actualTables = tableRows.map((row) => row.table_name).sort()
  assert(
    sameValues(actualTables, TABLES),
    `Schema table mismatch: expected ${TABLES.join(", ")}, received ${actualTables.join(", ")}`,
  )

  const retiredTableRows = await queryDatabase({
    accessToken,
    ref: config.ref,
    query: `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in (${retiredTableList});
    `,
  })
  assert(
    retiredTableRows.length === 0,
    `Retired portal tables still exist: ${retiredTableRows.map((row) => row.table_name).join(", ")}`,
  )

  const requestLifecycleColumnRows = await queryDatabase({
    accessToken,
    ref: config.ref,
    query: `
      select column_name, data_type, is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'requests'
        and column_name in (
          'closure_disposition',
          'closed_at',
          'follow_up_at',
          'record_handoff_at',
          'retention_hold_at',
          'retention_hold_by',
          'retention_hold_reason'
        )
      order by column_name;
    `,
  })
  const expectedLifecycleColumns = [
    "closed_at",
    "closure_disposition",
    "follow_up_at",
    "record_handoff_at",
    "retention_hold_at",
    "retention_hold_by",
    "retention_hold_reason",
  ]
  assert(
    sameValues(
      requestLifecycleColumnRows.map((row) => row.column_name),
      expectedLifecycleColumns,
    ) &&
      requestLifecycleColumnRows.every(
        (row) => row.is_nullable === "YES" && row.column_default === null,
      ),
    "Appointment-request lifecycle columns are missing or unexpectedly non-null/defaulted",
  )

  const auditProvenanceColumnRows = await queryDatabase({
    accessToken,
    ref: config.ref,
    query: `
      select column_name, data_type, is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'audit_log'
        and column_name in ('source', 'correlation_id')
      order by column_name;
    `,
  })
  assert(
    sameValues(
      auditProvenanceColumnRows.map((row) => row.column_name),
      ["correlation_id", "source"],
    ) &&
      auditProvenanceColumnRows.every(
        (row) => row.is_nullable === "YES" && row.column_default === null,
      ) &&
      auditProvenanceColumnRows.find(
        (row) => row.column_name === "correlation_id",
      )?.data_type === "uuid" &&
      auditProvenanceColumnRows.find((row) => row.column_name === "source")
        ?.data_type === "text",
    "Audit provenance columns must be nullable uuid/text with no defaults",
  )

  const auditSourceConstraintRows = await queryDatabase({
    accessToken,
    ref: config.ref,
    query: `
      select pg_catalog.pg_get_constraintdef(oid) as definition
      from pg_catalog.pg_constraint
      where conrelid = 'public.audit_log'::pg_catalog.regclass
        and conname = 'audit_log_source_valid';
    `,
  })
  const auditSourceConstraint =
    auditSourceConstraintRows[0]?.definition?.toLowerCase() ?? ""
  assert(
    auditSourceConstraintRows.length === 1 &&
      auditSourceConstraint.includes("'staff'") &&
      auditSourceConstraint.includes("'system'") &&
      auditSourceConstraint.includes("'acceptance'"),
    "audit_log.source must allow only staff, system, acceptance, or null",
  )

  const requestConstraintRows = await queryDatabase({
    accessToken,
    ref: config.ref,
    query: `
      select conname
      from pg_catalog.pg_constraint
      where conrelid = 'public.requests'::pg_catalog.regclass
        and conname in (
          'requests_name_length',
          'requests_phone_length',
          'requests_email_length',
          'requests_closure_disposition_valid',
          'requests_closure_state_valid',
          'requests_retention_hold_state_valid'
        )
      order by conname;
    `,
  })
  const expectedRequestConstraints = [
    "requests_closure_disposition_valid",
    "requests_closure_state_valid",
    "requests_email_length",
    "requests_name_length",
    "requests_phone_length",
    "requests_retention_hold_state_valid",
  ]
  assert(
    sameValues(
      requestConstraintRows.map((row) => row.conname),
      expectedRequestConstraints,
    ),
    `Request constraints mismatch: ${requestConstraintRows.map((row) => row.conname).join(", ")}`,
  )

  const intakeLimitRows = await queryDatabase({
    accessToken,
    ref: config.ref,
    query: `
      select
        c.relpersistence,
        c.relrowsecurity,
        pg_catalog.has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
        pg_catalog.has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select,
        pg_catalog.has_table_privilege('service_role', c.oid, 'SELECT') as service_select,
        pg_catalog.has_table_privilege('service_role', c.oid, 'INSERT') as service_insert,
        pg_catalog.has_table_privilege('service_role', c.oid, 'UPDATE') as service_update,
        pg_catalog.has_table_privilege('service_role', c.oid, 'DELETE') as service_delete
      from pg_catalog.pg_class as c
      join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
      where n.nspname = 'private'
        and c.relname = 'intake_rate_limits'
        and c.relkind = 'r';
    `,
  })
  assert(
    intakeLimitRows.length === 1 &&
      ["p", 112].includes(intakeLimitRows[0].relpersistence) &&
      intakeLimitRows[0].relrowsecurity === true &&
      intakeLimitRows[0].anon_select === false &&
      intakeLimitRows[0].authenticated_select === false &&
      intakeLimitRows[0].service_select === true &&
      intakeLimitRows[0].service_insert === true &&
      intakeLimitRows[0].service_update === true &&
      intakeLimitRows[0].service_delete === true,
    "private.intake_rate_limits must be persistent, RLS-enabled, and service-role-only",
  )

  const analyticsDailyRows = await queryDatabase({
    accessToken,
    ref: config.ref,
    query: `
      select
        c.relpersistence,
        c.relrowsecurity,
        pg_catalog.has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
        pg_catalog.has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select,
        pg_catalog.has_table_privilege('service_role', c.oid, 'SELECT') as service_select,
        pg_catalog.has_table_privilege('service_role', c.oid, 'INSERT') as service_insert,
        pg_catalog.has_table_privilege('service_role', c.oid, 'UPDATE') as service_update,
        pg_catalog.has_table_privilege('service_role', c.oid, 'DELETE') as service_delete
      from pg_catalog.pg_class as c
      join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
      where n.nspname = 'private'
        and c.relname = 'analytics_daily'
        and c.relkind = 'r';
    `,
  })
  assert(
    analyticsDailyRows.length === 1 &&
      ["p", 112].includes(analyticsDailyRows[0].relpersistence) &&
      analyticsDailyRows[0].relrowsecurity === true &&
      analyticsDailyRows[0].anon_select === false &&
      analyticsDailyRows[0].authenticated_select === false &&
      analyticsDailyRows[0].service_select === true &&
      analyticsDailyRows[0].service_insert === true &&
      analyticsDailyRows[0].service_update === true &&
      analyticsDailyRows[0].service_delete === true,
    "private.analytics_daily must be persistent, RLS-enabled, and service-role-only",
  )

  const analyticsEventConstraintRows = await queryDatabase({
    accessToken,
    ref: config.ref,
    query: `
      select pg_catalog.pg_get_constraintdef(oid) as definition
      from pg_catalog.pg_constraint
      where conrelid = 'private.analytics_daily'::pg_catalog.regclass
        and conname = 'analytics_daily_event_valid';
    `,
  })
  const analyticsEventConstraint =
    analyticsEventConstraintRows[0]?.definition?.toLowerCase() ?? ""
  assert(
    analyticsEventConstraintRows.length === 1 &&
      analyticsEventConstraint.includes("'page_view'") &&
      analyticsEventConstraint.includes("'form_throttled'") &&
      analyticsEventConstraint.includes("'cta_tap_hushforms'") &&
      analyticsEventConstraint.includes("'chooser_kept_current'") &&
      analyticsEventConstraint.includes("'doc_request_by_text'"),
    "analytics_daily.event must include the frozen patient telemetry vocabulary",
  )

  const missingRlsRows = await queryDatabase({
    accessToken,
    ref: config.ref,
    query: `
      select relname
      from pg_class as c
      join pg_namespace as n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and not c.relrowsecurity
      order by relname;
    `,
  })
  assert(
    missingRlsRows.length === 0,
    `Public tables without RLS: ${missingRlsRows.map((row) => row.relname).join(", ")}`,
  )

  const policyRows = await queryDatabase({
    accessToken,
    ref: config.ref,
    query: `
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename in (${tableList})
      order by policyname;
    `,
  })
  const actualPolicies = policyRows.map((row) => row.policyname).sort()
  assert(
    sameValues(actualPolicies, POLICIES),
    `RLS policy mismatch: expected ${POLICIES.join(", ")}, received ${actualPolicies.join(", ")}`,
  )

  const privilegeRows = await queryDatabase({
    accessToken,
    ref: config.ref,
    query: `
      select
        c.relname as table_name,
        pg_catalog.has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
        pg_catalog.has_table_privilege('anon', c.oid, 'INSERT') as anon_insert,
        pg_catalog.has_table_privilege('anon', c.oid, 'UPDATE') as anon_update,
        pg_catalog.has_table_privilege('anon', c.oid, 'DELETE') as anon_delete,
        pg_catalog.has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select,
        pg_catalog.has_table_privilege('authenticated', c.oid, 'INSERT') as authenticated_insert,
        pg_catalog.has_table_privilege('authenticated', c.oid, 'UPDATE') as authenticated_update,
        pg_catalog.has_table_privilege('authenticated', c.oid, 'DELETE') as authenticated_delete,
        pg_catalog.has_table_privilege('service_role', c.oid, 'SELECT') as service_select,
        pg_catalog.has_table_privilege('service_role', c.oid, 'INSERT') as service_insert,
        pg_catalog.has_table_privilege('service_role', c.oid, 'UPDATE') as service_update,
        pg_catalog.has_table_privilege('service_role', c.oid, 'DELETE') as service_delete
      from pg_catalog.pg_class as c
      join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in (${tableList})
      order by c.relname;
    `,
  })
  assert(
    privilegeRows.length === TABLES.length,
    `Expected privilege rows for ${TABLES.length} tables, received ${privilegeRows.length}`,
  )
  for (const row of privilegeRows) {
    assert(
      !row.anon_select &&
        !row.anon_insert &&
        !row.anon_update &&
        !row.anon_delete,
      `The anon role has portal table access on ${row.table_name}`,
    )
    assert(
      !row.authenticated_select &&
        !row.authenticated_insert &&
        !row.authenticated_update &&
        !row.authenticated_delete,
      `The authenticated role has portal table access on ${row.table_name}`,
    )
    assert(
      row.service_select &&
        row.service_insert &&
        row.service_update &&
        row.service_delete,
      `The service_role lacks CRUD on ${row.table_name}`,
    )
  }

  const rpcRows = await queryDatabase({
    accessToken,
    ref: config.ref,
    query: `
      select
        p.proname,
        pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments,
        pg_catalog.pg_get_function_result(p.oid) as result_type,
        pg_catalog.pg_get_functiondef(p.oid) as definition,
        p.prosecdef,
        coalesce(pg_catalog.array_to_string(p.proconfig, ','), '') as config,
        pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
        pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
        pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE') as service_execute
      from pg_catalog.pg_proc as p
      join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in (${rpcList})
      order by p.proname;
    `,
  })
  const actualRpcs = rpcRows.map((row) => row.proname)
  assert(
    sameValues(actualRpcs, RPCS),
    `Portal RPC mismatch: expected ${RPCS.join(", ")}, received ${actualRpcs.join(", ")}`,
  )
  for (const rpc of rpcRows) {
    assert(
      rpc.identity_arguments === RPC_SIGNATURES[rpc.proname],
      `${rpc.proname} signature mismatch: ${rpc.identity_arguments}`,
    )
    assert(
      rpc.result_type === RPC_RESULTS[rpc.proname],
      `${rpc.proname} result mismatch: ${rpc.result_type}`,
    )
    assert(!rpc.prosecdef, `${rpc.proname} must use SECURITY INVOKER`)
    assert(
      rpc.config.split(",").includes('search_path=""'),
      `${rpc.proname} does not pin an empty search_path`,
    )
    assert(!rpc.anon_execute, `${rpc.proname} is executable by anon`)
    assert(
      !rpc.authenticated_execute,
      `${rpc.proname} is executable by authenticated`,
    )
    assert(rpc.service_execute, `${rpc.proname} is not executable by service_role`)
    const auditSource = AUDIT_RPC_SOURCES[rpc.proname]
    if (auditSource) {
      const definition = rpc.definition.toLowerCase()
      const auditWrites =
        definition.match(/insert into public\.audit_log/g)?.length ?? 0
      const sourceColumns = definition.match(/\bsource\s*,/g)?.length ?? 0
      const correlationColumns =
        definition.match(/\bcorrelation_id\s*,/g)?.length ?? 0
      const sourceValues =
        definition.match(new RegExp(`'${auditSource}'`, "g"))?.length ?? 0
      assert(
        auditWrites > 0 &&
          sourceColumns === auditWrites &&
          correlationColumns === auditWrites &&
          sourceValues >= auditWrites,
        `${rpc.proname} must classify every audit as ${auditSource} with one operation correlation id`,
      )
    }
    if (rpc.proname === "portal_record_staff_password_reset") {
      assert(
        rpc.definition.toLowerCase().includes("for update"),
        "portal_record_staff_password_reset must serialize against deactivation",
      )
    }
    if (rpc.proname === "portal_check_intake_rate_limit") {
      assert(
        rpc.definition.toLowerCase().includes("on conflict"),
        "portal_check_intake_rate_limit must claim buckets atomically",
      )
    }
    if (rpc.proname === "portal_record_analytics_event") {
      assert(
        rpc.definition.toLowerCase().includes("on conflict"),
        "portal_record_analytics_event must upsert rollups atomically",
      )
    }
    if (rpc.proname === "portal_log_call_outcome") {
      const definition = rpc.definition.toLowerCase()
      assert(
        definition.includes("for update") &&
          definition.includes("request.call_outcome") &&
          definition.includes("'booked'") &&
          definition.includes("'scheduled_transferred'") &&
          definition.includes("'reached_follow_up'") &&
          definition.includes("'voicemail'") &&
          definition.includes("'no_answer'") &&
          definition.includes("'wont_schedule'") &&
          definition.includes("'not_actionable'") &&
          definition.includes("'lifecycle'") &&
          definition.includes("'before'") &&
          definition.includes("'after'") &&
          definition.includes("'sequence'"),
        "portal_log_call_outcome must lock the request, audit once, preserve all seven outcomes, and snapshot lifecycle state",
      )
    }
    if (rpc.proname === "portal_undo_call_outcome") {
      const definition = rpc.definition.toLowerCase()
      assert(
        definition.includes("for update") &&
          definition.includes("'55000'") &&
          definition.includes("'call_outcome_undo'") &&
          definition.includes("'request.call_outcome_undo'") &&
          definition.includes("is distinct from") &&
          definition.includes("set status = 'undone'") &&
          definition.includes("'restored_lifecycle'"),
        "portal_undo_call_outcome must lock, reject stale state, restore atomically, preserve history, and audit lifecycle-only metadata",
      )
    }
    if (rpc.proname === "portal_update_recipient_label") {
      const definition = rpc.definition.toLowerCase()
      assert(
        definition.includes("for update") &&
          definition.includes("recipients.label_update") &&
          definition.includes("char_length") &&
          definition.includes("btrim"),
        "portal_update_recipient_label must lock, trim, cap, and audit the label change",
      )
    }
    if (rpc.proname === "portal_add_notification_recipient") {
      const definition = rpc.definition.toLowerCase()
      assert(
        definition.includes("insert into public.notification_recipients") &&
          definition.includes("recipients.add") &&
          definition.includes("lower") &&
          definition.includes("btrim") &&
          definition.includes("char_length"),
        "portal_add_notification_recipient must normalize, bound, insert, and audit the recipient",
      )
    }
    if (rpc.proname === "portal_toggle_notification_recipient") {
      const definition = rpc.definition.toLowerCase()
      assert(
        definition.includes("for update") &&
          definition.includes("recipients.toggle") &&
          definition.includes("'from'") &&
          definition.includes("'to'"),
        "portal_toggle_notification_recipient must lock, update, and audit the active state",
      )
    }
    if (rpc.proname === "portal_remove_notification_recipient") {
      const definition = rpc.definition.toLowerCase()
      assert(
        definition.includes("for update") &&
          definition.includes("delete from public.notification_recipients") &&
          definition.includes("recipients.remove"),
        "portal_remove_notification_recipient must lock, delete, and audit the recipient",
      )
    }
    if (
      rpc.proname === "portal_open_staff_release" ||
      rpc.proname === "portal_acknowledge_staff_release" ||
      rpc.proname === "portal_hide_staff_release" ||
      rpc.proname === "portal_record_staff_release_guide_open" ||
      rpc.proname === "portal_record_staff_release_dismiss"
    ) {
      const definition = rpc.definition.toLowerCase()
      assert(
        definition.includes("from public.staff_profiles") &&
          definition.includes("and active") &&
          definition.includes("and onboarded_at is not null") &&
          definition.includes("for update") &&
          definition.includes("portal_release_states") &&
          definition.includes("release_id"),
        `${rpc.proname} must authorize from a locked active onboarded staff profile and scope by release`,
      )
    }
    if (rpc.proname === "portal_open_staff_release") {
      const definition = rpc.definition.toLowerCase()
      assert(
        definition.includes("on conflict") &&
          definition.includes("view_count = view_count + 1") &&
          definition.includes("'staff.release_open'") &&
          definition.includes("'staff.release_view'"),
        "portal_open_staff_release must atomically distinguish first-open from repeat-view telemetry",
      )
    }
    if (rpc.proname === "portal_record_staff_release_guide_open") {
      const definition = rpc.definition.toLowerCase()
      assert(
        definition.includes("guide_open_count = guide_open_count + 1") &&
          definition.includes(
            "guide_opened_at = coalesce(guide_opened_at, v_event_at)",
          ) &&
          definition.includes("'staff.release_guide_open'"),
        "portal_record_staff_release_guide_open must preserve the first event and atomically count every guide open",
      )
    }
    if (rpc.proname === "portal_record_staff_release_dismiss") {
      const definition = rpc.definition.toLowerCase()
      assert(
        definition.includes("dismiss_count = dismiss_count + 1") &&
          definition.includes("'staff.release_dismiss'"),
        "portal_record_staff_release_dismiss must atomically count every dismiss",
      )
    }
    if (rpc.proname === "portal_run_data_lifecycle") {
      const definition = rpc.definition.toLowerCase()
      assert(
        definition.includes("pg_advisory_xact_lock") &&
          definition.includes("for update skip locked") &&
          definition.includes("retention_hold_at is null") &&
          definition.includes("request.retention_delete"),
        "portal_run_data_lifecycle must serialize runs, lock candidates, exclude holds, and audit deletion",
      )
    }
  }

  const retiredRpcRows = await queryDatabase({
    accessToken,
    ref: config.ref,
    query: `
      select
        p.proname,
        pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments
      from pg_catalog.pg_proc as p
      join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in (${retiredRpcList});
    `,
  })
  const retiredIdentities = retiredRpcRows.filter((row) =>
    RETIRED_RPC_SIGNATURES.some(
      (rpc) =>
        rpc.name === row.proname && rpc.signature === row.identity_arguments,
    ),
  )
  assert(
    retiredIdentities.length === 0,
    `Retired portal RPCs still exist: ${retiredIdentities.map((row) => row.proname).join(", ")}`,
  )

  const session = await signIn({
    url: config.url,
    anonKey: config.anonKey,
    email,
    password,
  })
  const { user } = session
  assert(
    user.email?.trim().toLowerCase() === email,
    "Seed admin sign-in returned the wrong user",
  )

  await Promise.all(
    TABLES.map((table) =>
      assertSelectDeniedAsUser({
        url: config.url,
        anonKey: config.anonKey,
        accessToken: session.accessToken,
        table,
        query:
          table === "portal_release_states"
            ? "select=staff_user_id&limit=1"
            : "select=id&limit=1",
      }),
    ),
  )

  await assertAtomicAuditRollback({
    target,
    url: config.url,
    serviceKey: config.serviceKey,
  })

  const encodedEmail = encodeURIComponent(email)
  const [staffRows, recipientRows] = await Promise.all([
    selectRows({
      url: config.url,
      serviceKey: config.serviceKey,
      table: "staff_profiles",
      query: `select=id,user_id,email,role,active,onboarded_at,portal_tour_dismissed_at&email=eq.${encodedEmail}`,
    }),
    selectRows({
      url: config.url,
      serviceKey: config.serviceKey,
      table: "notification_recipients",
      query: `select=id,email,active&email=eq.${encodedEmail}`,
    }),
  ])

  const staffRow = staffProfileRowSchema.safeParse(staffRows[0])
  assert(
    staffRows.length === 1 &&
      staffRow.success &&
      staffRow.data.user_id === user.id &&
      staffRow.data.role === "admin" &&
      staffRow.data.active === true,
    "Seed admin staff profile is missing or incorrect",
  )
  assert(
    recipientRows.length === 1 && recipientRows[0].active === true,
    "Seed notification recipient is missing or inactive",
  )

  console.log(
    `Verified ${target} tables (${actualTables.length}): ${actualTables.join(", ")}`,
  )
  console.log(`Verified ${target} RLS: 0 public tables without row security`)
  console.log(
    `Verified ${target} migration: ${PHASE_C_MIGRATION.version}_${PHASE_C_MIGRATION.name}`,
  )
  console.log(
    `Verified ${target} migration: ${ONBOARDING_MIGRATION.version}_${ONBOARDING_MIGRATION.name}`,
  )
  console.log(
    `Verified ${target} migration: ${PASSWORD_RESET_LOCK_MIGRATION.version}_${PASSWORD_RESET_LOCK_MIGRATION.name}`,
  )
  console.log(
    `Verified ${target} migration: ${REVIEW_QR_RETIREMENT_MIGRATION.version}_${REVIEW_QR_RETIREMENT_MIGRATION.name}`,
  )
  console.log(
    `Verified ${target} migration: ${SOFTWARE_REGISTRY_RETIREMENT_MIGRATION.version}_${SOFTWARE_REGISTRY_RETIREMENT_MIGRATION.name}`,
  )
  console.log(
    `Verified ${target} migration: ${PORTAL_TOUR_MIGRATION.version}_${PORTAL_TOUR_MIGRATION.name}`,
  )
  console.log(
    `Verified ${target} migration: ${INTAKE_RATE_LIMIT_MIGRATION.version}_${INTAKE_RATE_LIMIT_MIGRATION.name}`,
  )
  console.log(
    `Verified ${target} migration: ${DATA_LIFECYCLE_MIGRATION.version}_${DATA_LIFECYCLE_MIGRATION.name}`,
  )
  console.log(
    `Verified ${target} migration: ${CALL_OUTCOME_MIGRATION.version}_${CALL_OUTCOME_MIGRATION.name}`,
  )
  console.log(
    `Verified ${target} migration: ${AUDIT_PROVENANCE_MIGRATION.version}_${AUDIT_PROVENANCE_MIGRATION.name}`,
  )
  console.log(
    `Verified ${target} migration: ${ANALYTICS_MIGRATION.version}_${ANALYTICS_MIGRATION.name}`,
  )
  console.log(
    `Verified ${target} migration: ${PORTAL_RELEASE_STATE_MIGRATION.version}_${PORTAL_RELEASE_STATE_MIGRATION.name}`,
  )
  console.log(
    `Verified ${target} migration: ${PORTAL_RELEASE_ENGAGEMENT_MIGRATION.version}_${PORTAL_RELEASE_ENGAGEMENT_MIGRATION.name}`,
  )
  console.log(
    `Verified ${target} migration: ${PORTAL_RELEASE_GUIDE_FIX_MIGRATION.version}_${PORTAL_RELEASE_GUIDE_FIX_MIGRATION.name}`,
  )
  console.log(
    `Verified ${target} migration: ${CALL_OUTCOME_UNDO_MIGRATION.version}_${CALL_OUTCOME_UNDO_MIGRATION.name}`,
  )
  console.log(
    `Verified ${target} migration: ${RECIPIENT_MUTATIONS_MIGRATION.version}_${RECIPIENT_MUTATIONS_MIGRATION.name}`,
  )
  console.log(
    `Verified ${target} appointment-request lifecycle: nullable legacy-safe columns, constraints, preview, hold-aware deletion`,
  )
  console.log(
    `Verified ${target} intake limiter: persistent private table, RLS, service-only ACL`,
  )
  console.log(
    `Verified ${target} analytics_daily: persistent private table, RLS, service-only ACL, event vocabulary`,
  )
  console.log(
    `Verified ${target} portal_release_states: per-staff key, bounded release id and engagement counters, RLS, service-only ACL`,
  )
  console.log(
    `Verified ${target} staff_profiles.onboarded_at: nullable timestamptz, no default`,
  )
  console.log(
    `Verified ${target} staff_profiles.portal_tour_dismissed_at: nullable timestamptz, no default`,
  )
  console.log(
    `Verified ${target} audit provenance: nullable historical columns, constrained source vocabulary, correlated classified writes`,
  )
  console.log(
    `Verified ${target} policies=${actualPolicies.length}, least-privilege table ACLs=${privilegeRows.length}`,
  )
  console.log(
    `Verified ${target} service-only SECURITY INVOKER RPCs=${actualRpcs.length}`,
  )
  console.log(
    `Verified ${target} retired portal objects absent: tables=${RETIRED_TABLES.length}, RPCs=${RETIRED_RPC_SIGNATURES.length}`,
  )
  console.log(
    `Verified ${target} authenticated Data API denial across ${TABLES.length} portal tables`,
  )
  console.log(
    `Verified ${target} forced audit failure rolled back call-outcome request and event state`,
  )
  console.log(
    `Verified ${target} seed rows: staff_profiles=${staffRows.length}, notification_recipients=${recipientRows.length}`,
  )
  console.log(`Verified ${target} seed admin sign-in: ${user.id}`)
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Schema verification failed",
  )
  process.exitCode = 1
})
