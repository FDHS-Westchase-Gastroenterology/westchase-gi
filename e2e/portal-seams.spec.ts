import { test, expect, type Page } from "@playwright/test";
import { loadLocalEnv, requiredEnv } from "./support";

// VAL-REG-003: GitHub status is live when configured, its credential path
// stays server-only, and the Vercel seam remains truthfully inert.
// VAL-REG-005: the assistant affordance is a portal-wide docked widget
// with an expandable panel, conservative copy, and no dedicated page.
// (VAL-REG-004 — the activation runbook — is verified by file
// inspection in the packet's verificationSteps.)

loadLocalEnv();

const SEED_EMAIL = requiredEnv("PORTAL_SEED_ADMIN_EMAIL");
const SEED_PASSWORD = requiredEnv("PORTAL_SEED_ADMIN_PASSWORD");
const GITHUB_CONFIGURATION_COUNT = [
  "PORTAL_GITHUB_APP_ID",
  "PORTAL_GITHUB_APP_INSTALLATION_ID",
  "PORTAL_GITHUB_APP_PRIVATE_KEY",
].filter((name) => Boolean(process.env[name]?.trim())).length;

const FORBIDDEN_HOSTS = [
  "api.github.com",
  "github.com",
  "api.vercel.com",
  "vercel.com",
];

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(SEED_EMAIL);
  await page.getByLabel("Password").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 15_000 });
}

const PORTAL_PAGES = [
  "/admin",
  "/admin/settings",
  "/admin/settings/software",
  "/admin/audit",
  "/admin/help",
];

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "JS portal UI");
});

test("VAL-REG-003: GitHub status is live server-side and Vercel stays inert", async ({
  page,
}) => {
  test.setTimeout(120_000);

  const offSiteHits: string[] = [];
  page.on("request", (request) => {
    const host = new URL(request.url()).hostname;
    if (
      FORBIDDEN_HOSTS.some(
        (forbidden) => host === forbidden || host.endsWith(`.${forbidden}`),
      )
    ) {
      offSiteHits.push(request.url());
    }
  });

  await signIn(page);

  // GitHub reports live installation data only when all three server-side
  // credentials exist; missing or partial configuration degrades cleanly.
  await page.goto("/admin/settings/software");
  const githubPanel = page.getByTestId("integration-github");
  await expect(githubPanel).toBeVisible();
  if (GITHUB_CONFIGURATION_COUNT === 3) {
    await expect(githubPanel.getByTestId("integration-status")).toContainText(
      "Connected — FDHS-Westchase-Gastroenterology",
    );
    await expect(githubPanel).toContainText(
      "FDHS-Westchase-Gastroenterology/westchase-gi",
    );
    await expect(githubPanel).toContainText("Installation scope");
    await expect(githubPanel).toContainText(/Selected repositories|All repositories/);
  } else {
    await expect(githubPanel.getByTestId("integration-status")).toContainText(
      GITHUB_CONFIGURATION_COUNT === 0
        ? "Not configured"
        : "Connection unavailable",
    );
    await expect(githubPanel).toContainText("Once connected, it will manage");
  }

  const vercelPanel = page.getByTestId("integration-vercel");
  await expect(vercelPanel).toBeVisible();
  await expect(vercelPanel.getByTestId("integration-status")).toContainText(
    "Not configured",
  );
  await expect(vercelPanel).toContainText("Once connected, it will manage");

  // Provider requests originate on the server, never in the browser bundle.
  for (const path of PORTAL_PAGES) {
    await page.goto(path);
    await page.waitForLoadState("load");
  }
  expect(offSiteHits, `provider calls detected: ${offSiteHits.join(", ")}`)
    .toHaveLength(0);

  await page.screenshot({
    path: "test-results/portal-seams/registry-connections.png",
    fullPage: true,
  });
});

test("VAL-REG-005: assistant widget is portal-wide, expandable, conservative", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page);

  // Stage one request so a detail page exists for the portal-wide check.
  const response = await page.request.post("/api/requests", {
    data: {
      name: "TEST Assistant Widget",
      phone: "8135550188",
      email: "assistant-widget@example.test",
      location: "any",
      time: "any",
      locale: "en",
      sourcePath: "/en/appointment",
    },
    headers: { "X-Forwarded-For": "2001:db8:5ea3:1::5" },
  });
  expect(response.status()).toBe(201);
  const { id } = (await response.json()) as { id: string };

  const everyPage = [...PORTAL_PAGES, `/admin/requests/${id}`];
  for (const path of everyPage) {
    await page.goto(path);
    await expect(
      page.getByTestId("assistant-launcher"),
      `launcher missing on ${path}`,
    ).toBeVisible();
  }

  // The launcher opens an expandable panel — not a navigation.
  await page.goto("/admin");
  await page.getByTestId("assistant-launcher").click();
  await expect(page).toHaveURL(/\/admin\/?$/);
  const panel = page.getByTestId("assistant-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("planned");

  await page.getByTestId("assistant-expand").click();
  await expect(panel).toHaveAttribute("data-expanded", "true");

  // Conservative phrasing: no compliance or availability promises.
  const text = (await panel.innerText()).toLowerCase();
  for (const banned of ["hipaa", "fda", "available now", "24/7"]) {
    expect(text, `panel copy contains "${banned}"`).not.toContain(banned);
  }

  // No dedicated assistant page or nav entry exists.
  await expect(
    page.locator('nav[aria-label="Portal sections"] a', {
      hasText: "Assistant",
    }),
  ).toHaveCount(0);
  const assistantPage = await page.request.get("/admin/assistant", {
    maxRedirects: 0,
  });
  expect([404, 307]).toContain(assistantPage.status());

  await page.screenshot({
    path: "test-results/portal-seams/assistant-panel.png",
    fullPage: true,
  });

  // Cleanup the staged request.
  const { serviceDb } = await import("./support");
  await serviceDb().from("requests").delete().eq("id", id);
});
