import { defineConfig, devices } from "@playwright/test";

const publicSmoke = process.env.PLAYWRIGHT_PUBLIC_SMOKE === "1";

// E2E harness for the intake pipeline + staff portal. The stack runs on
// port 3100 (3000 is off-limits in this environment); webServer boots the
// same foreground command the humans use (`npm run dev:mission`), which
// first clears any zombie holding the port so tests never hit stale code.
// Reporters must never hold an unattended run open — html stays open:never.

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
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
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
    command: "npm run dev:mission",
    url: "http://localhost:3100/en",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
