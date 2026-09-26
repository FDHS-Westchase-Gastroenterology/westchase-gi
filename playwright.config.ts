import { defineConfig, devices } from "@playwright/test";

/* Three folders, two projects. The folder says what a spec needs:
   e2e/public runs with no credentials (the CI quality job); e2e/portal and
   e2e/boundaries run against an allowlisted Supabase Preview Branch (the
   supabase-integration job). Select by path: `npx playwright test e2e/public`.
   Projects stay `chromium` and `no-js` because every spec's skip guard reads
   the project name. The stack runs on port 3100 (3000 is off-limits here);
   webServer boots the same command the humans use (`npm run dev:mission`),
   which first clears any zombie holding the port so tests never hit stale
   code. Credential-bearing runs retain no browser artifacts. */

const publicOnly = process.env.PLAYWRIGHT_PUBLIC === "1";
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

export default defineConfig({
  testDir: "./e2e",
  testMatch: /(?:^|\/)(?:public|portal|boundaries)\/[^/]+\.spec\.ts$/,
  // Public runs have no credentials and must never touch the shared Preview
  // Branch, so they skip the recipient snapshot and fixture sweep.
  globalSetup: publicOnly ? undefined : "./e2e/harness/global-setup.ts",
  globalTeardown: publicOnly ? undefined : "./e2e/harness/global-teardown.ts",
  // Hosted Auth rate-limits concurrent sign-ins and email OTP requests, so
  // The suite is serial by configuration rather than by every caller
  // Remembering `--workers=1`.
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
    {
      // Pre-hydration / no-JS behavior: the native form POST fallback and the
      // Language chooser without scripts. Only the two specs with no-JS tests.
      name: "no-js",
      testMatch: /(?:^|\/)(?:public\/language-chooser|portal\/intake-form)\.spec\.ts$/,
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
