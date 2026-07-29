import { randomUUID } from "node:crypto";
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { loadLocalEnv, serviceDb } from "./support";

loadLocalEnv();

const db = serviceDb();
const releaseId = "2026-07-29-request-workflow";
const runId = randomUUID().slice(0, 8);
const staffEmail = `release-${runId}@example.test`;
const staffPassword = `Release-${randomUUID()}-aA1!`;

async function signIn(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(staffEmail);
  await page.getByLabel("Password").fill(staffPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 15_000 });
}

test.describe("portal release briefing", () => {
  test.describe.configure({ mode: "serial" });

  let staffUserId = "";
  let secondContext: BrowserContext | null = null;

  test.beforeAll(async () => {
    const created = await db.auth.admin.createUser({
      email: staffEmail,
      password: staffPassword,
      email_confirm: true,
    });
    expect(created.error).toBeNull();
    staffUserId = created.data.user?.id ?? "";
    if (!staffUserId) throw new Error("Release briefing staff fixture failed");

    const { error } = await db.from("staff_profiles").insert({
      user_id: staffUserId,
      email: staffEmail,
      display_name: "TEST Release Briefing Staff",
      role: "staff",
      active: true,
      onboarded_at: "2026-07-01T13:00:00.000Z",
      portal_tour_dismissed_at: "2026-07-01T13:05:00.000Z",
    });
    expect(error).toBeNull();
  });

  test.afterAll(async () => {
    await secondContext?.close().catch(() => undefined);
    if (!staffUserId) return;
    await db
      .from("portal_release_states")
      .delete()
      .eq("staff_user_id", staffUserId);
    await db.from("audit_log").delete().eq("actor_email", staffEmail);
    await db.from("staff_profiles").delete().eq("user_id", staffUserId);
    await db.auth.admin.deleteUser(staffUserId);
  });

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "JS portal UI");
  });

  test("reveals once, follows staff for 48 hours, and links to the permanent guide", async ({
    browser,
    page,
  }) => {
    await signIn(page);

    const announcement = page.getByTestId("portal-release-announcement");
    const openButton = announcement.getByRole("button", {
      name: "See what changed",
    });
    await expect(announcement).toBeVisible();
    await expect(page.getByTestId("portal-release-utility")).toHaveCount(0);

    // Keyboard activation stays immediate: the rare fracture animation is
    // reserved for direct pointer opening, per the portal motion standard.
    await openButton.focus();
    await page.keyboard.press("Enter");
    const homeSummary = page.locator("#portal-release-home-summary");
    await expect(homeSummary).toBeVisible();
    await expect(homeSummary).toHaveAttribute("data-animate", "false");
    await expect(
      homeSummary.getByRole("heading", {
        name: "A smoother way to work requests",
      }),
    ).toBeVisible();
    for (const sentence of [
      "Choose Contacted, Scheduled, or Closed.",
      "The result, note, and callback date stay together.",
      "Due callbacks return. Scheduled requests stay visible.",
    ]) {
      await expect(homeSummary).toContainText(sentence);
    }

    await expect
      .poll(async () => {
        const { data } = await db
          .from("portal_release_states")
          .select("first_opened_at, acknowledged_at, hidden_at")
          .eq("staff_user_id", staffUserId)
          .eq("release_id", releaseId)
          .maybeSingle();
        return data;
      })
      .toMatchObject({
        acknowledged_at: null,
        hidden_at: null,
      });

    // Reset only this disposable fixture to exercise the pointer-authored
    // first opening independently from the keyboard path above.
    await db
      .from("portal_release_states")
      .delete()
      .eq("staff_user_id", staffUserId)
      .eq("release_id", releaseId);
    await page.reload();
    await expect(announcement).toBeVisible();
    await openButton.click();
    await expect(homeSummary).toBeVisible();
    await expect(homeSummary).toHaveAttribute("data-animate", "true");
    await expect(
      announcement.locator(".release-seal[data-broken='true']"),
    ).toBeVisible();

    await homeSummary
      .getByRole("button", { name: "Close what’s new" })
      .click();
    await expect(announcement).toHaveCount(0);

    const utility = page.getByTestId("portal-release-utility");
    await expect(utility).toBeVisible();
    await page.getByRole("link", { name: /^Appointment requests/ }).click();
    await expect(page).toHaveURL(/\/admin\/requests\/?$/);
    await expect(utility).toBeVisible();

    await utility.getByRole("button", { name: /What’s new/ }).click();
    const quickSummary = page.locator("#portal-release-quick-summary");
    await expect(quickSummary).toBeVisible();
    await quickSummary.getByRole("button", { name: "Got it" }).click();
    await expect(quickSummary).toBeHidden();
    await expect(utility).toBeVisible();

    // The state is account-wide, rather than tied to this browser.
    secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    await signIn(secondPage);
    await expect(
      secondPage.getByTestId("portal-release-announcement"),
    ).toHaveCount(0);
    await expect(secondPage.getByTestId("portal-release-utility")).toBeVisible();

    await utility.getByRole("button", { name: /What’s new/ }).click();
    await quickSummary
      .getByRole("link", { name: "See the 2-minute guide" })
      .click();
    await expect(page).toHaveURL(
      /\/admin\/help#appointment-workflow-guide$/,
    );
    await expect(
      page.getByRole("heading", { name: "Work an appointment request" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Which status should I choose?" }),
    ).toBeVisible();

    await utility.getByRole("button", { name: /What’s new/ }).click();
    await page
      .locator("#portal-release-quick-summary")
      .getByRole("button", { name: "Hide this update now" })
      .click();
    await expect(utility).toHaveCount(0);
    await page.goto("/admin/settings");
    await expect(page.getByTestId("portal-release-utility")).toHaveCount(0);

    const { data: finalState, error: finalStateError } = await db
      .from("portal_release_states")
      .select("first_opened_at, acknowledged_at, hidden_at")
      .eq("staff_user_id", staffUserId)
      .eq("release_id", releaseId)
      .single();
    expect(finalStateError).toBeNull();
    expect(typeof finalState?.first_opened_at).toBe("string");
    expect(typeof finalState?.acknowledged_at).toBe("string");
    expect(typeof finalState?.hidden_at).toBe("string");
  });
});
