import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { auditFixtureSettings } from "../../../e2e/harness/audit-fixtures";

const BRANCH_REF = "abcdefghijklmnopqrst";
const PRODUCTION_REF = "tsrqponmlkjihgfedcba";
const OTHER_REF = "zyxwvutsrqponmlkjihg";

function poolerUrl(ref: string): string {
  return `postgres://postgres.${ref}:secret@aws-0-us-east-2.pooler.supabase.com:6543/postgres`;
}

/** The environment CI's supabase-integration job writes for a Preview Branch. */
const BRANCH_ENV = {
  SUPABASE_BRANCH_PROJECT_REF: BRANCH_REF,
  SUPABASE_PROJECT_REF: BRANCH_REF,
  PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF: BRANCH_REF,
  NEXT_PUBLIC_SUPABASE_URL: `https://${BRANCH_REF}.supabase.co`,
  SUPABASE_PREVIEW_BRANCH: "1",
  SUPABASE_PROJECT_REF_PROD: PRODUCTION_REF,
  SUPABASE_URL_PROD: `https://${PRODUCTION_REF}.supabase.co`,
  POSTGRES_URL: poolerUrl(BRANCH_REF),
} as const;

void describe("auditFixtureSettings", () => {
  void it("connects to the allowlisted Preview Branch over verified TLS", () => {
    const settings = auditFixtureSettings(BRANCH_ENV);
    assert.equal(settings.username, `postgres.${BRANCH_REF}`);
    assert.notEqual(settings.ssl, false);
  });

  void it("refuses a POSTGRES_URL that names Production, before connecting", () => {
    const production = [
      poolerUrl(PRODUCTION_REF),
      `postgresql://postgres:secret@db.${PRODUCTION_REF}.supabase.co:5432/postgres`,
    ];
    for (const postgresUrl of production) {
      assert.throws(() => auditFixtureSettings({ ...BRANCH_ENV, POSTGRES_URL: postgresUrl }), {
        message: "Audit fixture cleanup refused: Production project rejected",
      });
    }
  });

  void it("refuses a POSTGRES_URL for any project but the allowlisted branch", () => {
    assert.throws(
      () => auditFixtureSettings({ ...BRANCH_ENV, POSTGRES_URL: poolerUrl(OTHER_REF) }),
      {
        message: "Audit fixture cleanup refused: POSTGRES_URL is not the allowlisted branch",
      },
    );
  });

  void it("refuses when the e2e target guard does", () => {
    assert.throws(
      () => auditFixtureSettings({ ...BRANCH_ENV, SUPABASE_PREVIEW_BRANCH: undefined }),
      /^Error: E2E safety check failed/u,
    );
    assert.throws(
      () => auditFixtureSettings({ ...BRANCH_ENV, SUPABASE_PROJECT_REF_PROD: undefined }),
      /^Error: E2E safety check failed: missing Production project reference/u,
    );
  });

  void it("refuses a local stack, whose database names no Supabase project", () => {
    assert.throws(
      () =>
        auditFixtureSettings({
          SUPABASE_PROJECT_REF: "local",
          PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF: "local",
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
          POSTGRES_URL: "postgres://postgres:postgres@127.0.0.1:54322/postgres",
        }),
      { message: "Audit fixture cleanup refused: POSTGRES_URL names no Supabase project" },
    );
  });
});
