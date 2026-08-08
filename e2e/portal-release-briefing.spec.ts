import { randomUUID } from "node:crypto";

import { test, expect } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import { z } from "zod";

import { loadLocalEnv, serviceDb } from "./support";

loadLocalEnv();

const db = serviceDb();
const releaseId = "2026-08-06-appointment-workflow";
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
      role: "admin",
      active: true,
      onboarded_at: "2026-07-01T13:00:00.000Z",
      portal_tour_dismissed_at: "2026-07-01T13:05:00.000Z",
    });
    expect(error).toBeNull();
  });

  test.afterAll(async () => {
    await secondContext?.close().catch(() => undefined);
    if (!staffUserId) return;
    await db.from("portal_release_states").delete().eq("staff_user_id", staffUserId);
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

    // Keyboard activation stays immediate: the rare list-to-check transition
    // Is reserved for direct pointer opening, per the portal motion standard.
    await openButton.focus();
    await page.keyboard.press("Enter");
    const homeSummary = page.locator("#portal-release-home-summary");
    await expect(homeSummary).toBeVisible();
    await expect(homeSummary).toHaveAttribute("data-animate", "false");
    await expect(
      homeSummary.getByRole("heading", {
        name: "Record what happened — the portal does the rest",
      }),
    ).toBeVisible();
    for (const sentence of [
      "Pick the call's real outcome — the portal sets the status itself.",
      "Outcome, call-again timing, and note save together. Undo restores everything.",
      "New requests and due call-agains rise. Scheduled requests stay visible.",
    ]) {
      await expect(homeSummary).toContainText(sentence);
    }

    await expect
      .poll(async () => {
        const { data } = await db
          .from("portal_release_states")
          .select(
            "first_opened_at, last_viewed_at, view_count, acknowledged_at, hidden_at, guide_open_count, dismiss_count",
          )
          .eq("staff_user_id", staffUserId)
          .eq("release_id", releaseId)
          .maybeSingle();
        return data;
      })
      .toMatchObject({
        view_count: 1,
        acknowledged_at: null,
        hidden_at: null,
        guide_open_count: 0,
        dismiss_count: 0,
      });

    // Reset only this isolated fixture to exercise the pointer-authored
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
    await expect(announcement.locator(".release-signal[data-resolved='true']")).toBeVisible();

    await homeSummary.getByRole("button", { name: "Close what’s new" }).click();
    await expect(announcement).toHaveCount(0);

    const utility = page.getByTestId("portal-release-utility");
    await expect(utility).toBeVisible();
    await page.getByRole("link", { name: /^Appointments/ }).click();
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
    await expect(secondPage.getByTestId("portal-release-announcement")).toHaveCount(0);
    await expect(secondPage.getByTestId("portal-release-utility")).toBeVisible();

    await utility.getByRole("button", { name: /What’s new/ }).click();
    await quickSummary.getByRole("button", { name: "See the 2-minute guide" }).click();
    await expect(page).toHaveURL(/\/admin\/help#appointment-workflow-guide$/);
    await expect(page.getByRole("heading", { name: "Work an appointment request" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "What do the statuses mean?" }),
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
      .select(
        "first_opened_at, last_viewed_at, view_count, acknowledged_at, hidden_at, guide_opened_at, last_guide_opened_at, guide_open_count, last_dismissed_at, dismiss_count",
      )
      .eq("staff_user_id", staffUserId)
      .eq("release_id", releaseId)
      .single();
    expect(finalStateError).toBeNull();
    expect(z.string().safeParse(finalState?.first_opened_at).success).toBe(true);
    expect(z.string().safeParse(finalState?.last_viewed_at).success).toBe(true);
    expect(finalState?.view_count).toBe(4);
    expect(z.string().safeParse(finalState?.acknowledged_at).success).toBe(true);
    expect(z.string().safeParse(finalState?.hidden_at).success).toBe(true);
    expect(z.string().safeParse(finalState?.guide_opened_at).success).toBe(true);
    expect(z.string().safeParse(finalState?.last_guide_opened_at).success).toBe(true);
    expect(finalState?.guide_open_count).toBe(1);
    expect(z.string().safeParse(finalState?.last_dismissed_at).success).toBe(true);
    expect(finalState?.dismiss_count).toBe(1);

    await page.goto("/admin/audit");
    const engagement = page.getByTestId("release-engagement");
    await expect(
      engagement.getByRole("heading", {
        name: "Release update engagement",
      }),
    ).toBeVisible();
    const engagementRow = engagement
      .getByRole("row")
      .filter({ hasText: "TEST Release Briefing Staff" });
    await expect(engagementRow).toContainText("4 views");
    await expect(engagementRow).toContainText("1 open");
    await expect(engagementRow).toContainText("Hidden early");

    await page.setViewportSize({ width: 390, height: 844 });
    const engagementCard = engagement
      .getByTestId("release-engagement-cards")
      .getByRole("listitem")
      .filter({ hasText: "TEST Release Briefing Staff" });
    await expect(engagementCard).toBeVisible();
    await expect(engagementCard).toContainText("4 views");
    await expect(engagementCard).toContainText("1 open");
    await expect(engagementCard).toContainText("Hidden early");
  });
});
