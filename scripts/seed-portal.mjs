import { asJsonObject, asJsonString, jsonSchema } from "../src/lib/json.ts"

const TARGETS = new Set(["local", "dev", "prod"])

function providerErrorMessage(payload) {
  const parsed = jsonSchema.safeParse(payload)
  if (!parsed.success) return null
  const object = asJsonObject(parsed.data)
  if (!object) return null
  return (
    asJsonString(object.message) ??
    asJsonString(object.msg) ??
    asJsonString(object.error_description) ??
    asJsonString(object.error)
  )
}

function parseTarget(args) {
  const inline = args.find((arg) => arg.startsWith("--target="))
  const flagIndex = args.indexOf("--target")
  const value =
    inline?.slice("--target=".length) ??
    (flagIndex >= 0 ? args[flagIndex + 1] : undefined)

  if (!value || !TARGETS.has(value)) {
    throw new Error("Usage: node scripts/seed-portal.mjs --target local|dev|prod")
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
  if (target === "local") {
    // The disposable-stack target: refuses anything but a loopback Supabase,
    // So it can never point at a hosted Development or Production project.
    const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL")
    if (!/^https?:\/\/(127\.0\.0\.1|localhost)([:/]|$)/.test(url)) {
      throw new Error(
        `--target local requires a loopback Supabase URL; got ${url}`,
      )
    }
    return { url, serviceKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY") }
  }

  if (target === "dev") {
    return {
      url: requireEnv("SUPABASE_DEV_URL", "NEXT_PUBLIC_SUPABASE_URL"),
      serviceKey: requireEnv(
        "SUPABASE_DEV_SERVICE_ROLE_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
      ),
    }
  }

  return {
    url: requireEnv("SUPABASE_PROD_URL", "SUPABASE_URL_PROD"),
    serviceKey: requireEnv(
      "SUPABASE_PROD_SERVICE_ROLE_KEY",
      "SUPABASE_SERVICE_ROLE_KEY_PROD",
    ),
  }
}

function adminCredentials(target) {
  return target === "prod"
    ? {
        email: requireEnv("PORTAL_PROD_ADMIN_EMAIL"),
        password: requireEnv("PORTAL_PROD_ADMIN_PASSWORD"),
      }
    : {
        email: requireEnv("PORTAL_SEED_ADMIN_EMAIL"),
        password: requireEnv("PORTAL_SEED_ADMIN_PASSWORD"),
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
    const message = providerErrorMessage(payload)
    throw new Error(`${operation} failed (${response.status})${message ? `: ${message}` : ""}`)
  }

  return payload
}

function authHeaders(serviceKey) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  }
}

async function listAuthUsers(url, serviceKey) {
  const users = []
  let page = 1

  while (page <= 100) {
    const response = await fetch(
      `${url}/auth/v1/admin/users?page=${page}&per_page=100`,
      { headers: authHeaders(serviceKey) },
    )
    const payload = await readResponse(response, "List auth users")
    const pageUsers = Array.isArray(payload?.users) ? payload.users : []
    users.push(...pageUsers)

    if (!payload?.next_page || pageUsers.length === 0) {
      break
    }

    page = Number(payload.next_page)
  }

  return users
}

async function ensureAdminUser({ url, serviceKey, email, password }) {
  const normalizedEmail = email.trim().toLowerCase()
  const users = await listAuthUsers(url, serviceKey)
  const existing = users.find(
    (user) => user.email?.trim().toLowerCase() === normalizedEmail,
  )

  const appMetadata = {
    ...(existing?.app_metadata ?? {}),
    role: "admin",
  }

  const endpoint = existing
    ? `${url}/auth/v1/admin/users/${encodeURIComponent(existing.id)}`
    : `${url}/auth/v1/admin/users`
  const body = {
    password,
    email_confirm: true,
    app_metadata: appMetadata,
  }
  if (!existing) {
    body.email = normalizedEmail
  }
  const response = await fetch(endpoint, {
    method: existing ? "PUT" : "POST",
    headers: authHeaders(serviceKey),
    body: JSON.stringify(body),
  })
  const payload = await readResponse(
    response,
    existing ? "Update seed admin" : "Create seed admin",
  )
  const user = payload?.user ?? payload

  if (!user?.id || !user?.email) {
    throw new Error("Auth admin API did not return the seeded user")
  }

  return user
}

async function upsertRows({
  url,
  serviceKey,
  table,
  onConflict,
  rows,
}) {
  const response = await fetch(
    `${url}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`,
    {
      method: "POST",
      headers: {
        ...authHeaders(serviceKey),
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(rows),
    },
  )
  const payload = await readResponse(response, `Seed ${table}`)

  if (!Array.isArray(payload)) {
    throw new Error(`Seed ${table} did not return rows`)
  }

  return payload.length
}

async function main() {
  const target = parseTarget(process.argv.slice(2))
  const { url, serviceKey } = projectConfig(target)
  const { email, password } = adminCredentials(target)

  const user = await ensureAdminUser({ url, serviceKey, email, password })

  const staffCount = await upsertRows({
    url,
    serviceKey,
    table: "staff_profiles",
    onConflict: "user_id",
    rows: [
      {
        user_id: user.id,
        email: user.email,
        display_name: "Portal administrator",
        role: "admin",
        active: true,
        onboarded_at: new Date().toISOString(),
        portal_tour_dismissed_at: new Date().toISOString(),
      },
    ],
  })

  const recipientCount = await upsertRows({
    url,
    serviceKey,
    table: "notification_recipients",
    onConflict: "email",
    rows: [
      {
        email: user.email,
        label: "Portal administrator",
        active: true,
      },
    ],
  })

  console.log(`Seeded ${target} auth user: ${user.id} (${user.email})`)
  console.log(
    `Seeded ${target} rows: staff_profiles=${staffCount}, notification_recipients=${recipientCount}`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Portal seed failed")
  process.exitCode = 1
})
