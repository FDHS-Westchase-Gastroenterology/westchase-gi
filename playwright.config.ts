import { defineConfig, devices } from "@playwright/test";

const publicSmoke = process.env.PLAYWRIGHT_PUBLIC_SMOKE === "1";

// E2E harness for the intake pipeline + staff portal. The stack runs on
// port 3100 (3000 is off-limits in this environment). Credential-bearing
// runs retain no browser artifacts.

export default defineConfig({
  testDir: "./e2e",
  // CI's public smoke has no credentials and must never touch the shared
  // development Supabase project. The normal/full suite is unchanged.
  globalSetup: publicSmoke ? undefined : "./e2e/global-setup.ts",
  globalTeardown: publicSmoke ? undefined : "./e2e/global-teardown.ts",
  // The hosted development Auth project rate-limits concurrent sign-ins and
  // email OTP requests. Keep the shared-project contract deterministic across
  // files instead of relying on every caller to remember `--workers=1`.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    screenshot: "off",
    trace: "off",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    ...(!publicSmoke ? [{
      // Pre-hydration / no-JS behavior: the native form POST fallback.
      name: "no-js",
      use: { ...devices["Desktop Chrome"], javaScriptEnabled: false },
    }] : []),
  ],
  webServer: {
    // CI builds first, so the no-secret public contract exercises the same
    // production artifact Vercel receives. Credential-bearing E2E keeps the
    // existing development server and its isolated failure-test build.
    command: publicSmoke
      ? "npm run start -- -p 3100"
      : "npm run dev:mission",
    url: "http://localhost:3100/en",
    reuseExistingServer: !publicSmoke,
    timeout: 120_000,
  },
});
