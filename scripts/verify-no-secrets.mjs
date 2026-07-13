#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const serviceKeyNames = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_DEV_SERVICE_ROLE_KEY",
  "SUPABASE_DEV_SECRET_KEY",
  "SUPABASE_PROD_SERVICE_ROLE_KEY",
  "SUPABASE_PROD_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY_PROD",
  "SUPABASE_SECRET_KEY_PROD",
]
const secretPatterns = [
  {
    label: "Supabase access-token prefix",
    regex: /(?<![A-Za-z0-9_])sbp_[A-Za-z0-9]{10,}(?![A-Za-z0-9_])/,
  },
  {
    label: "Supabase secret-key prefix",
    regex: /(?<![A-Za-z0-9_])sb_secret_[A-Za-z0-9]{5,}(?![A-Za-z0-9_])/,
  },
  {
    label: "Resend API-key prefix",
    regex: /(?<![A-Za-z0-9_])re_[A-Za-z0-9]{16,}(?![A-Za-z0-9_])/,
  },
]

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  })

  if (result.status !== 0) {
    throw new Error(`git ${args[0]} failed`)
  }

  return result.stdout
}

function parseDotEnv(contents) {
  const values = new Map()

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) {
      continue
    }

    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(
      line,
    )
    if (!match) {
      continue
    }

    let value = match[2].trim()
    const quote = value[0]
    if (
      (quote === '"' || quote === "'") &&
      value.length >= 2 &&
      value.at(-1) === quote
    ) {
      value = value.slice(1, -1)
    } else {
      value = value.replace(/\s+#.*$/, "").trim()
    }

    values.set(match[1], value)
  }

  return values
}

function readServiceKeyPrefix() {
  const envValues = parseDotEnv(
    readFileSync(resolve(repoRoot, ".env.local"), "utf8"),
  )

  for (const name of serviceKeyNames) {
    const value = envValues.get(name)
    if (value) {
      if (value.length < 12) {
        throw new Error("The configured Supabase service key is unexpectedly short")
      }
      return value.slice(0, 12)
    }
  }

  throw new Error("No Supabase service key is configured in .env.local")
}

function patchContext(line, context) {
  if (line.startsWith("\u001e")) {
    context.commit = line.slice(1).trim()
    context.file = "<commit-message>"
    return
  }

  if (line.startsWith("diff --git ")) {
    context.file = "<unknown-file>"
    return
  }

  if (line.startsWith("--- a/")) {
    context.file = line.slice("--- a/".length)
    return
  }

  if (line.startsWith("+++ b/")) {
    context.file = line.slice("+++ b/".length)
  }
}

function addFinding(findings, finding) {
  const key = `${finding.commit}|${finding.file}|${finding.label}`
  if (!findings.has(key)) {
    findings.set(key, finding)
  }
}

function scanMissionPatch(history, findings) {
  const context = {
    commit: "<unknown-commit>",
    file: "<commit-message>",
  }

  for (const line of history.split(/\r?\n/)) {
    patchContext(line, context)

    for (const { label, regex } of secretPatterns) {
      if (regex.test(line)) {
        addFinding(findings, { ...context, label })
      }
    }
  }
}

function scanLivePrefix(history, serviceKeyPrefix, findings) {
  const context = {
    commit: "<unknown-commit>",
    file: "<commit-message>",
  }

  for (const line of history.split(/\r?\n/)) {
    patchContext(line, context)
    if (line.includes(serviceKeyPrefix)) {
      addFinding(findings, {
        ...context,
        label: "Live Supabase service-key prefix",
      })
    }
  }
}

function scanForbiddenPaths(history, findings) {
  let commit = "<unknown-commit>"

  for (const rawLine of history.split(/\r?\n/)) {
    if (rawLine.startsWith("\u001e")) {
      commit = rawLine.slice(1).trim()
      continue
    }

    const path = rawLine.trim().replaceAll("\\", "/")
    if (!path) {
      continue
    }

    const isLocalEnv = path === ".env.local" || path.endsWith("/.env.local")
    // Any path segment named "secrets" is forbidden in this repo's history
    // (strictly broader than the specific store it guards against).
    const isSecretsPath = /(^|\/)secrets(\/|$)/.test(path)
    if (isLocalEnv || isSecretsPath) {
      addFinding(findings, {
        commit,
        file: path,
        label: "Forbidden staged path",
      })
    }
  }
}

function shortCommit(commit) {
  return /^[0-9a-f]{40}$/i.test(commit) ? commit.slice(0, 12) : commit
}

function main() {
  const findings = new Map()
  const serviceKeyPrefix = readServiceKeyPrefix()
  const missionPatch = runGit([
    "log",
    "-p",
    "--no-ext-diff",
    "--no-color",
    "--format=%x1e%H%n%B",
    "main..HEAD",
  ])
  const fullPatch = runGit([
    "log",
    "--all",
    "-p",
    "--no-ext-diff",
    "--no-color",
    "--format=%x1e%H%n%B",
  ])
  const allPaths = runGit([
    "log",
    "--all",
    "--name-only",
    "--format=%x1e%H",
  ])

  scanMissionPatch(missionPatch, findings)
  scanLivePrefix(fullPatch, serviceKeyPrefix, findings)
  scanForbiddenPaths(allPaths, findings)

  if (findings.size > 0) {
    console.error(
      `Secret-history verification failed with ${findings.size} redacted finding(s):`,
    )
    for (const finding of findings.values()) {
      console.error(
        `- ${finding.label}: ${finding.file} @ ${shortCommit(finding.commit)}`,
      )
    }
    process.exitCode = 1
    return
  }

  console.log(
    "Secret-history verification passed: mission patches are clean, forbidden paths were never staged, and the live service-key prefix is absent from all refs.",
  )
}

try {
  main()
} catch (error) {
  console.error(
    `Secret-history verification could not complete: ${
      error instanceof Error ? error.message : "unknown error"
    }`,
  )
  process.exitCode = 1
}
