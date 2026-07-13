const TABLES = [
  "audit_log",
  "notification_recipients",
  "registry_assets",
  "registry_grants",
  "request_events",
  "requests",
  "staff_profiles",
]

const POLICIES = [
  "audit_log_staff_read",
  "notification_recipients_staff_read",
  "registry_assets_portal_read",
  "registry_grants_portal_read",
  "request_events_staff_read",
  "requests_staff_read",
  "staff_profiles_self_read",
]

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

async function readResponse(response, operation) {
  const text = await response.text()
  let payload = null

  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

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

async function selectRowsAsUser({
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
  const payload = await readResponse(response, `Authenticated read of ${table}`)

  if (!Array.isArray(payload)) {
    throw new Error(`Authenticated read of ${table} returned an unexpected shape`)
  }

  return payload
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

  const anonGrantRows = await queryDatabase({
    accessToken,
    ref: config.ref,
    query: `
      select table_name, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name in (${tableList})
        and grantee = 'anon'
      order by table_name, privilege_type;
    `,
  })
  assert(anonGrantRows.length === 0, "The anon role has direct portal table grants")

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

  const authenticatedReads = await Promise.all(
    TABLES.map((table) =>
      selectRowsAsUser({
        url: config.url,
        anonKey: config.anonKey,
        accessToken: session.accessToken,
        table,
        query: "select=id&limit=1",
      }),
    ),
  )

  const encodedEmail = encodeURIComponent(email)
  const [staffRows, recipientRows, registryRows] = await Promise.all([
    selectRows({
      url: config.url,
      serviceKey: config.serviceKey,
      table: "staff_profiles",
      query: `select=id,user_id,email,role,active&email=eq.${encodedEmail}`,
    }),
    selectRows({
      url: config.url,
      serviceKey: config.serviceKey,
      table: "notification_recipients",
      query: `select=id,email,active&email=eq.${encodedEmail}`,
    }),
    selectRows({
      url: config.url,
      serviceKey: config.serviceKey,
      table: "registry_assets",
      query: "select=id,name,status&order=name.asc",
    }),
  ])

  assert(
    staffRows.length === 1 &&
      staffRows[0].user_id === user.id &&
      staffRows[0].role === "admin" &&
      staffRows[0].active === true,
    "Seed admin staff profile is missing or incorrect",
  )
  assert(
    recipientRows.length === 1 && recipientRows[0].active === true,
    "Seed notification recipient is missing or inactive",
  )

  const registryNames = registryRows.map((row) => row.name)
  for (const requiredName of [
    "Westchase GI website",
    "Review QR print tool",
    "Staff admin portal",
  ]) {
    assert(
      registryNames.includes(requiredName),
      `Registry seed is missing: ${requiredName}`,
    )
  }

  console.log(`Verified ${target} tables (${actualTables.length}): ${actualTables.join(", ")}`)
  console.log(`Verified ${target} RLS: 0 public tables without row security`)
  console.log(
    `Verified ${target} policies=${actualPolicies.length}, anon_table_grants=${anonGrantRows.length}`,
  )
  console.log(
    `Verified ${target} authenticated RLS reads across ${authenticatedReads.length} portal tables`,
  )
  console.log(
    `Verified ${target} seed rows: staff_profiles=${staffRows.length}, notification_recipients=${recipientRows.length}, registry_assets=${registryRows.length}`,
  )
  console.log(`Verified ${target} seed admin sign-in: ${user.id} (${user.email})`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Schema verification failed")
  process.exitCode = 1
})
