import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { diagnoseOrbEnvironment } from "../scripts/orb-env-doctor.mjs";

const repoRoot = resolve(import.meta.dirname, "..");

function healthyEnvironment(binDirectory) {
  return {
    AMP_ORB: "1",
    PATH: binDirectory,
    NEXT_PUBLIC_SUPABASE_URL: "https://development-ref.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-placeholder",
    SUPABASE_SERVICE_ROLE_KEY: "service-placeholder",
    SUPABASE_PROJECT_REF: "development-ref",
    SUPABASE_DB_PASSWORD: "database-placeholder",
    SUPABASE_DEV_POOLER_URL:
      "postgresql://postgres.development-ref@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
    PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF: "development-ref",
    SUPABASE_PROJECT_REF_PROD: "production-ref",
    SUPABASE_URL_PROD: "https://production-ref.supabase.co",
    PORTAL_BASE_URL: "http://localhost:3100",
    SUPABASE_TELEMETRY_DISABLED: "1",
    PORTAL_SEED_ADMIN_EMAIL: "preview@example.test",
    PORTAL_SEED_ADMIN_PASSWORD: "seed-password-placeholder",
    PORTAL_PREVIEW_USERNAME: "preview-reviewer",
    PORTAL_PREVIEW_PASSWORD: "preview-password-placeholder",
    VERCEL_ORG_ID: "team_preview_placeholder",
    VERCEL_PROJECT_ID: "prj_preview_placeholder",
  };
}

test("orb doctor accepts a complete Development-only environment", async () => {
  const directory = await mkdtemp(join(tmpdir(), "wgi-orb-bin-"));
  try {
    await Promise.all(
      ["node", "npm", "npx", "supabase", "vercel", "docker"].map(async (name) => {
        const path = join(directory, name);
        await writeFile(path, "#!/bin/sh\nexit 0\n");
        await chmod(path, 0o755);
      }),
    );
    assert.deepEqual(diagnoseOrbEnvironment(healthyEnvironment(directory)), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("orb doctor rejects target drift and Production credentials", async () => {
  const directory = await mkdtemp(join(tmpdir(), "wgi-orb-bin-"));
  try {
    const env = healthyEnvironment(directory);
    env.PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF = "different-ref";
    env.SUPABASE_DB_PASSWORD_PROD = "production-password-placeholder";
    env.SUPABASE_ACCESS_TOKEN = "operator-token-placeholder";
    const errors = diagnoseOrbEnvironment(env);
    assert.ok(errors.some((error) => error.includes("allowlist")));
    assert.ok(errors.some((error) => error.includes("SUPABASE_DB_PASSWORD_PROD")));
    assert.ok(errors.some((error) => error.includes("SUPABASE_ACCESS_TOKEN")));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("orb Supabase guard blocks arbitrary migration targets", async () => {
  const directory = await mkdtemp(join(tmpdir(), "wgi-orb-guard-"));
  try {
    const initialized = spawnSync("git", ["init", "--quiet"], {
      cwd: directory,
      encoding: "utf8",
    });
    assert.equal(initialized.status, 0, initialized.stderr);
    const fakeSupabase = join(directory, "supabase-real");
    await writeFile(fakeSupabase, "#!/bin/sh\nprintf '%s\\n' allowed\n");
    await chmod(fakeSupabase, 0o755);
    const env = {
      ...process.env,
      AMP_ORB: "1",
      PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF: "development-ref",
      SUPABASE_DEV_POOLER_URL:
        "postgresql://postgres.development-ref@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
      SUPABASE_REAL_BIN: fakeSupabase,
    };
    const guard = join(repoRoot, ".agents", "supabase-guard");

    const rejectedLink = spawnSync(
      guard,
      ["link", "--project-ref", "production-ref"],
      { cwd: directory, env, encoding: "utf8" },
    );
    assert.notEqual(rejectedLink.status, 0);
    assert.match(rejectedLink.stderr, /only the allowlisted Development project/);

    const rejectedUrl = spawnSync(
      guard,
      ["db", "push", "--db-url", "postgresql://example.invalid/db"],
      { cwd: directory, env, encoding: "utf8" },
    );
    assert.notEqual(rejectedUrl.status, 0);
    assert.match(rejectedUrl.stderr, /rejects arbitrary database URLs/);

    const rejectedWorkdir = spawnSync(
      guard,
      ["--workdir", directory, "db", "push", "--dry-run"],
      { cwd: directory, env, encoding: "utf8" },
    );
    assert.notEqual(rejectedWorkdir.status, 0);
    assert.match(rejectedWorkdir.stderr, /without --workdir/);

    const rejectedReset = spawnSync(guard, ["db", "reset", "--linked"], {
      cwd: directory,
      env,
      encoding: "utf8",
    });
    assert.notEqual(rejectedReset.status, 0);
    assert.match(rejectedReset.stderr, /must be explicitly local/);

    const rejectedProjectOverride = spawnSync(guard, ["db", "push"], {
      cwd: directory,
      env: { ...env, SUPABASE_PROJECT_ID: "production-ref" },
      encoding: "utf8",
    });
    assert.notEqual(rejectedProjectOverride.status, 0);
    assert.match(rejectedProjectOverride.stderr, /reject SUPABASE_PROJECT_ID/);

    await mkdir(join(directory, "supabase", ".temp"), { recursive: true });
    await writeFile(
      join(directory, "supabase", ".temp", "project-ref"),
      "development-ref\n",
    );
    await writeFile(
      join(directory, "supabase", ".temp", "pooler-url"),
      `${env.SUPABASE_DEV_POOLER_URL}\n`,
    );
    const accepted = spawnSync(guard, ["db", "push", "--dry-run"], {
      cwd: directory,
      env,
      encoding: "utf8",
    });
    assert.equal(accepted.status, 0, accepted.stderr);
    assert.match(accepted.stdout, /allowed/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
