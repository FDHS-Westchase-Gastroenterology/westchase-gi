import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readdirSync } from "node:fs";
import { loadLocalEnv, requiredEnv, serviceDb } from "./support";

loadLocalEnv();

const MIGRATION_VERSIONS = readdirSync("supabase/migrations")
  .flatMap((name) => name.match(/^(\d{14})_.*\.sql$/)?.[1] ?? [])
  .sort();
const SUPABASE_URL = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_KEY = requiredEnv(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
);

test.use({ trace: "off" });

test("preview readiness exposes only the deployed schema marker", async ({
  request,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "The dependency contract runs once.",
  );

  const response = await request.get("/api/preview-readiness");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toEqual({
    ready: true,
    migrationVersions: MIGRATION_VERSIONS,
    commitSha: "disposable-preview-sha",
    pullRequestId: "1",
  });

  const serviceResult = await serviceDb().rpc(
    "portal_preview_schema_readiness",
  );
  expect(serviceResult.error).toBeNull();
  expect(serviceResult.data).toEqual(MIGRATION_VERSIONS);

  const publicResult = await createClient(SUPABASE_URL, SUPABASE_KEY).rpc(
    "portal_preview_schema_readiness",
  );
  expect(publicResult.error?.code).toBe("42501");
  expect([401, 403]).toContain(publicResult.status);
});
