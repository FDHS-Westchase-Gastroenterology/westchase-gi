import { defineConfig, devices } from "@playwright/test";

const publicSmoke = process.env.PLAYWRIGHT_PUBLIC_SMOKE === "1";
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();

function playwrightUse() {
  const use = {
    baseURL: "http://localhost:3100",
    screenshot: "off" as const,
    trace: "off" as const,
    video: "off" as const,
  };
  if (chromiumExecutablePath !== undefined && chromiumExecutablePath !== "") {
    return {
      ...use,
      launchOptions: { executablePath: chromiumExecutablePath },
    };
  }
  return use;
}

// E2E harness for the intake pipeline + staff portal. The stack runs on
// Port 3100 (3000 is off-limits in this environment); webServer boots the
// Same foreground command the humans use (`npm run dev:mission`), which
// First clears any zombie holding the port so tests never hit stale code.
// Credential-bearing runs retain no browser artifacts.

export default defineConfig({
  testDir: "./e2e",
  // CI's public smoke has no credentials and must never touch the shared
  // Preview Branch. The normal/full suite is unchanged.
  globalSetup: publicSmoke ? undefined : "./e2e/global-setup.ts",
  globalTeardown: publicSmoke ? undefined : "./e2e/global-teardown.ts",
  // Hosted Auth rate-limits concurrent sign-ins and email OTP requests. Keep
  // The branch contract deterministic across files instead of relying on every
  // Caller to remember `--workers=1`.
  fullyParallel: false,
  workers: 1,
  forbidOnly: process.env.CI !== undefined && process.env.CI !== "",
  retries: 0,
  reporter: "list",
  use: playwrightUse(),
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    ...(!publicSmoke
      ? [
          {
            // Pre-hydration / no-JS behavior: the native form POST fallback.
            name: "no-js",
            use: { ...devices["Desktop Chrome"], javaScriptEnabled: false },
          },
        ]
      : []),
  ],
  webServer: {
    command: "npm run dev:mission",
    url: "http://localhost:3100/en",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
