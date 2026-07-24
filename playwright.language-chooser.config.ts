import { defineConfig, devices } from "@playwright/test";

// Patient-only coverage that does not mutate the development Supabase project.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "language-chooser.spec.ts",
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
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
