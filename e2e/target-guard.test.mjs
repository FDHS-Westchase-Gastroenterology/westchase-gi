import assert from "node:assert/strict";
import test from "node:test";

import { assertSafeE2ETarget } from "./target-guard.ts";

const hosted = {
  NEXT_PUBLIC_SUPABASE_URL: "https://development-ref.supabase.co",
  SUPABASE_PROJECT_REF: "development-ref",
  PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF: "development-ref",
  SUPABASE_PROJECT_REF_PROD: "production-ref",
  SUPABASE_URL_PROD: "https://production-ref.supabase.co",
};

test("accepts an explicitly allowlisted hosted Development project", () => {
  assert.doesNotThrow(() => assertSafeE2ETarget(hosted));
});

test("accepts the explicit disposable-local sentinel", () => {
  assert.doesNotThrow(() =>
    assertSafeE2ETarget({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_PROJECT_REF: "local",
      PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF: "local",
    }),
  );
});

test("rejects a missing project reference", () => {
  assert.throws(
    () =>
      assertSafeE2ETarget({
        ...hosted,
        SUPABASE_PROJECT_REF: undefined,
      }),
    /missing development project reference/,
  );
});

test("rejects a missing explicit allowlist", () => {
  assert.throws(
    () =>
      assertSafeE2ETarget({
        ...hosted,
        PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF: undefined,
      }),
    /missing explicit Playwright project allowlist/,
  );
});

test("rejects a hosted target without an explicit Production reference", () => {
  assert.throws(
    () =>
      assertSafeE2ETarget({
        ...hosted,
        SUPABASE_PROJECT_REF_PROD: undefined,
      }),
    /missing Production project reference/,
  );
});

test("rejects a hosted target without an explicit Production URL", () => {
  assert.throws(
    () =>
      assertSafeE2ETarget({
        ...hosted,
        SUPABASE_URL_PROD: undefined,
      }),
    /missing Production URL/,
  );
});

test("rejects a target outside the explicit allowlist", () => {
  assert.throws(
    () =>
      assertSafeE2ETarget({
        ...hosted,
        PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF: "another-development-ref",
      }),
    /not the explicitly allowlisted project/,
  );
});

test("rejects Production even when it is allowlisted", () => {
  assert.throws(
    () =>
      assertSafeE2ETarget({
        ...hosted,
        NEXT_PUBLIC_SUPABASE_URL: "https://production-ref.supabase.co",
        SUPABASE_PROJECT_REF: "production-ref",
        PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF: "production-ref",
      }),
    /Production project rejected/,
  );
});

test("rejects the configured Production URL independently of its reference", () => {
  assert.throws(
    () =>
      assertSafeE2ETarget({
        ...hosted,
        NEXT_PUBLIC_SUPABASE_URL: "https://production-ref.supabase.co",
      }),
    /Production URL rejected/,
  );
});

test("rejects a hosted URL whose subdomain does not match the reference", () => {
  assert.throws(
    () =>
      assertSafeE2ETarget({
        ...hosted,
        NEXT_PUBLIC_SUPABASE_URL: "https://other-ref.supabase.co",
      }),
    /hosted URL does not match the project reference/,
  );
});

test("rejects an unknown non-Supabase host", () => {
  assert.throws(
    () =>
      assertSafeE2ETarget({
        ...hosted,
        NEXT_PUBLIC_SUPABASE_URL: "https://database.example.test",
      }),
    /only matching Supabase or explicit local targets are allowed/,
  );
});
