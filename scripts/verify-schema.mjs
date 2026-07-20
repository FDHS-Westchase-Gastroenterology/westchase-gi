const TABLES = [
  "audit_log",
  "notification_recipients",
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
  portal_add_request_note:
    "p_actor_email text, p_request_id uuid, p_note text, p_note_length integer",
  portal_complete_staff_onboarding: "p_user_id uuid",
  portal_record_staff_password_reset: "p_user_id uuid",
  portal_set_staff_tour_dismissed: "p_user_id uuid, p_dismissed boolean",
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
  portal_add_request_note: "uuid",
  portal_complete_staff_onboarding: "boolean",
  portal_record_staff_password_reset: "boolean",
  portal_set_staff_tour_dismissed: "boolean",
  portal_update_request_status: "boolean",
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
        "SUPABASE_DEV_SECRET_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_SECRET_KEY",
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
      "SUPABASE_PROD_SECRET_KEY",
      "SUPABASE_SERVICE_ROLE_KEY_PROD",
      "SUPABASE_SECRET_KEY_PROD",
    ),
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
    const message =
      payload && typeof payload === "object"
        ? payload.message ?? payload.msg ?? payload.error_description ?? payload.error
        : null
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
  const code = payload && typeof payload === "object" ? payload.code : null
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
      `${url}/rest/v1/rpc/portal_update_request_status`,
      {
        method: "POST",
        headers: {
          ...serviceHeaders(serviceKey),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_actor_email: "",
          p_request_id: requestId,
          p_next_status: "contacted",
        }),
      },
    )
    const payload = await parseResponse(response)
    const code = payload && typeof payload === "object" ? payload.code : null
    assert(
      !response.ok && code === "23514",
      `Forced audit failure was unexpected (${response.status}${code ? `/${code}` : ""})`,
    )

    const rows = await selectRows({
      url,
      serviceKey,
      table: "requests",
      query: `select=id,status&id=eq.${encodeURIComponent(requestId)}`,
    })
    assert(
      rows.length === 1 && rows[0].status === "new",
      "Request status survived a forced audit failure",
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
  const email = requireEnv("PORTAL_SEED_ADMIN_EMAIL").trim().toLowerCase()
  const password = requireEnv("PORTAL_SEED_ADMIN_PASSWORD")
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
    if (rpc.proname === "portal_record_staff_password_reset") {
      assert(
        rpc.definition.toLowerCase().includes("for update"),
        "portal_record_staff_password_reset must serialize against deactivation",
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
        query: "select=id&limit=1",
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

  assert(
    staffRows.length === 1 &&
      staffRows[0].user_id === user.id &&
      staffRows[0].role === "admin" &&
      staffRows[0].active === true &&
      typeof staffRows[0].onboarded_at === "string" &&
      typeof staffRows[0].portal_tour_dismissed_at === "string",
    "Seed admin staff profile is missing or incorrect",
  )
  assert(
    recipientRows.length === 1 && recipientRows[0].active === true,
    "Seed notification recipient is missing or inactive",
  )

  console.log(`Verified ${target} tables (${actualTables.length}): ${actualTables.join(", ")}`)
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
    `Verified ${target} staff_profiles.onboarded_at: nullable timestamptz, no default`,
  )
  console.log(
    `Verified ${target} staff_profiles.portal_tour_dismissed_at: nullable timestamptz, no default`,
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
  console.log(`Verified ${target} forced audit failure rolled back request status`)
  console.log(
    `Verified ${target} seed rows: staff_profiles=${staffRows.length}, notification_recipients=${recipientRows.length}`,
  )
  console.log(`Verified ${target} seed admin sign-in: ${user.id}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Schema verification failed")
  process.exitCode = 1
})
