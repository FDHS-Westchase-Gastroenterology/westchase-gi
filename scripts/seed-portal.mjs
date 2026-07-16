const TARGETS = new Set(["dev", "prod"])

function parseTarget(args) {
  const inline = args.find((arg) => arg.startsWith("--target="))
  const flagIndex = args.indexOf("--target")
  const value =
    inline?.slice("--target=".length) ??
    (flagIndex >= 0 ? args[flagIndex + 1] : undefined)

  if (!value || !TARGETS.has(value)) {
    throw new Error("Usage: node scripts/seed-portal.mjs --target dev|prod")
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
      url: requireEnv("SUPABASE_DEV_URL", "NEXT_PUBLIC_SUPABASE_URL"),
      serviceKey: requireEnv(
        "SUPABASE_DEV_SERVICE_ROLE_KEY",
        "SUPABASE_DEV_SECRET_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_SECRET_KEY",
      ),
    }
  }

  return {
    url: requireEnv("SUPABASE_PROD_URL", "SUPABASE_URL_PROD"),
    serviceKey: requireEnv(
      "SUPABASE_PROD_SERVICE_ROLE_KEY",
      "SUPABASE_PROD_SECRET_KEY",
      "SUPABASE_SERVICE_ROLE_KEY_PROD",
      "SUPABASE_SECRET_KEY_PROD",
    ),
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
  const response = await fetch(endpoint, {
    method: existing ? "PUT" : "POST",
    headers: authHeaders(serviceKey),
    body: JSON.stringify({
      ...(!existing ? { email: normalizedEmail } : {}),
      password,
      email_confirm: true,
      app_metadata: appMetadata,
    }),
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
  const email = requireEnv("PORTAL_SEED_ADMIN_EMAIL")
  const password = requireEnv("PORTAL_SEED_ADMIN_PASSWORD")

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

  const registryCount = await upsertRows({
    url,
    serviceKey,
    table: "registry_assets",
    onConflict: "name",
    rows: [
      {
        name: "Westchase GI website",
        kind: "Website",
        repo: "FDHS-Westchase-Gastroenterology/westchase-gi",
        live_url: "https://westchase-gi.vercel.app",
        hosting: "Vercel project: westchase-gi (clinic-owned Hobby account)",
        maintainer: "Clinic-owned; ASTXRTYS — Write collaborator",
        status: "active",
        notes: null,
      },
      {
        name: "Staff admin portal",
        kind: "Admin portal",
        repo: "FDHS-Westchase-Gastroenterology/westchase-gi",
        live_url: "https://westchase-gi.vercel.app/admin",
        hosting: "Vercel project: westchase-gi (clinic-owned Hobby account)",
        maintainer: "Clinic-owned; ASTXRTYS — Write collaborator",
        status: "in development",
        notes: "Staff request portal in the website repository.",
      },
    ],
  })

  console.log(`Seeded ${target} auth user: ${user.id} (${user.email})`)
  console.log(
    `Seeded ${target} rows: staff_profiles=${staffCount}, notification_recipients=${recipientCount}, registry_assets=${registryCount}`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Portal seed failed")
  process.exitCode = 1
})
