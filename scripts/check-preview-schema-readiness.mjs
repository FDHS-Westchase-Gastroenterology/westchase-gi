import { readdirSync } from "node:fs"

function option(args, name) {
  const prefix = `--${name}=`
  const inline = args.find((arg) => arg.startsWith(prefix))
  const flagIndex = args.indexOf(`--${name}`)
  return inline?.slice(prefix.length) ??
    (flagIndex >= 0 ? args[flagIndex + 1] : undefined)
}

function requiredOption(args, name) {
  const value = option(args, name)?.trim()
  if (!value) {
    throw new Error(
      "Usage: node scripts/check-preview-schema-readiness.mjs --url <preview-url> --migrations-dir <path> --commit-sha <sha> --pull-request-id <id>",
    )
  }
  return value
}

function expectedMigrationVersions(directory) {
  const files = readdirSync(directory).filter((name) => name.endsWith(".sql"))
  const versions = files.map((name) => {
    const match = name.match(/^(\d{14})_[a-z0-9_]+\.sql$/)
    if (!match) throw new Error(`Invalid migration filename: ${name}`)
    return match[1]
  })
  const unique = new Set(versions)
  if (unique.size !== versions.length) {
    throw new Error("Migration versions must be unique")
  }
  return [...unique].sort()
}

function previewUrl(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error("Preview readiness URL must be an absolute HTTP(S) URL")
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password
  ) {
    throw new Error("Preview readiness URL must be an absolute HTTP(S) URL")
  }
  return url
}

async function main() {
  const baseUrl = previewUrl(requiredOption(process.argv.slice(2), "url"))
  const migrationsDirectory = requiredOption(process.argv.slice(2), "migrations-dir")
  const expectedCommitSha = requiredOption(process.argv.slice(2), "commit-sha")
  const expectedPullRequestId = requiredOption(process.argv.slice(2), "pull-request-id")
  const expectedVersions = expectedMigrationVersions(migrationsDirectory)

  const readinessUrl = new URL("/api/preview-readiness", baseUrl)
  const response = await fetch(readinessUrl, { redirect: "error" })
  let payload = null
  try {
    payload = await response.json()
  } catch {
    // The stable failure below intentionally does not echo arbitrary response text.
  }

  if (
    !response.ok ||
    !payload ||
    typeof payload !== "object" ||
    payload.ready !== true ||
    payload.commitSha !== expectedCommitSha ||
    payload.pullRequestId !== expectedPullRequestId ||
    !Array.isArray(payload.migrationVersions) ||
    payload.migrationVersions.length !== expectedVersions.length ||
    !payload.migrationVersions.every(
      (version, index) => version === expectedVersions[index],
    )
  ) {
    throw new Error(
      "Preview database is not ready for the exact PR head and committed migration set; check Supabase branch binding and the Vercel redeployment",
    )
  }

  console.log(
    `Preview database is ready with ${expectedVersions.length} committed migrations`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Preview readiness failed")
  process.exitCode = 1
})
