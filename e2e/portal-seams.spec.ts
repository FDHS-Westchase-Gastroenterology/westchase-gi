import { test, expect, type Page } from "@playwright/test";
import { loadLocalEnv, requiredEnv } from "./support";

// VAL-REG-003: the GitHub/Vercel seams are truthful and inert — no
// portal page makes any live call to either provider.
// VAL-REG-005: the assistant affordance is a portal-wide docked widget
// with an expandable panel, conservative copy, and no dedicated page.
// (VAL-REG-004 — the activation runbook — is verified by file
// inspection in the packet's verificationSteps.)

loadLocalEnv();

const SEED_EMAIL = requiredEnv("PORTAL_SEED_ADMIN_EMAIL");
const SEED_PASSWORD = requiredEnv("PORTAL_SEED_ADMIN_PASSWORD");

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

test("VAL-REG-003: seam panels are truthful and no provider is ever called", async ({
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

  // The panels state the truthful inert status and what they WILL manage.
  await page.goto("/admin/settings/software");
  for (const provider of ["github", "vercel"] as const) {
    const panel = page.getByTestId(`integration-${provider}`);
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId("integration-status")).toContainText(
      "Not connected — activates after ownership transfer",
    );
    await expect(panel).toContainText("Once connected, it will manage");
  }

  // Every portal page renders without touching either provider.
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
