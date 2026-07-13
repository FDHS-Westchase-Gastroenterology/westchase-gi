import { defineConfig, devices } from "@playwright/test";

// E2E harness for the intake pipeline + staff portal. The stack runs on
// port 3100 (3000 is off-limits in this environment); webServer boots the
// same foreground command the humans use (`npm run dev:mission`), which
// first clears any zombie holding the port so tests never hit stale code.
// Reporters must never hold an unattended run open — html stays open:never.

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: true,
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
    {
      // Pre-hydration / no-JS behavior: the native form POST fallback.
      name: "no-js",
      use: { ...devices["Desktop Chrome"], javaScriptEnabled: false },
    },
  ],
  webServer: {
    command: "npm run dev:mission",
    url: "http://localhost:3100/en",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
