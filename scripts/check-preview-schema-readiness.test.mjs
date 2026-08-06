import { createServer } from "node:http"
import { once } from "node:events"
import { spawn } from "node:child_process"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import assert from "node:assert/strict"

async function withReadinessServer(body, run) {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" })
    response.end(JSON.stringify(body))
  })
  server.listen(0, "127.0.0.1")
  await once(server, "listening")

  try {
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Missing test port")
    await run(`http://127.0.0.1:${address.port}`)
  } finally {
    server.close()
    await once(server, "close")
  }
}

async function runCheck(url, migrationsDirectory) {
  const child = spawn(
    process.execPath,
    [
      "scripts/check-preview-schema-readiness.mjs",
      "--url",
      url,
      "--migrations-dir",
      migrationsDirectory,
      "--commit-sha",
      "exact-head-sha",
      "--pull-request-id",
      "123",
    ],
    { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
  )
  let stdout = ""
  let stderr = ""
  child.stdout.on("data", (chunk) => {
    stdout += chunk
  })
  child.stderr.on("data", (chunk) => {
    stderr += chunk
  })
  const [code] = await once(child, "close")
  return { status: code, stdout, stderr }
}

test("accepts the exact ready migration marker", async () => {
  const directory = await mkdtemp(join(tmpdir(), "preview-migrations-"))
  try {
    await writeFile(join(directory, "20260801120000_first.sql"), "select 1;\n")
    await writeFile(join(directory, "20260806160751_second.sql"), "select 1;\n")
    await withReadinessServer(
      {
        ready: true,
        migrationVersions: ["20260801120000", "20260806160751"],
        commitSha: "exact-head-sha",
        pullRequestId: "123",
      },
      async (url) => {
        const result = await runCheck(url, directory)
        assert.equal(result.status, 0)
        assert.match(result.stdout, /Preview database is ready/)
      },
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test("fails closed for a stale migration marker", async () => {
  const directory = await mkdtemp(join(tmpdir(), "preview-migrations-"))
  try {
    await writeFile(join(directory, "20260806160751_expected.sql"), "select 1;\n")
    await withReadinessServer(
      {
        ready: true,
        migrationVersions: ["20260802005123"],
        commitSha: "exact-head-sha",
        pullRequestId: "123",
      },
      async (url) => {
        const result = await runCheck(url, directory)
        assert.equal(result.status, 1)
        assert.match(result.stderr, /Preview database is not ready/)
      },
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
