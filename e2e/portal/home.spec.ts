import { randomUUID } from "node:crypto";

import { test, expect } from "@playwright/test";
import { z } from "zod";

import { intakeResponseSchema } from "../../src/lib/portal/contracts";
import { greetingName } from "../../src/lib/portal/staff-language";
import { clientIps, runId, seedAdmin, serviceDb } from "../harness/env";
import { signIn } from "../harness/session";

// The portal home page: staff land on a greeting and their tasks, not on
// Software. The queue overview count is real data, paper handoff is one
// Truthful action away, and occasional tools stay out of the primary path.

const { email: SEED_EMAIL } = seedAdmin();
const db = serviceDb();

const testIp = clientIps("home");

test.describe("portal home", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "JS portal UI");
  });

  test.afterAll(async () => {
    await db.from("requests").delete().like("email", `home-${runId}-%`);
  });

  test("admin lands on a greeting, live queue status, and the full task list", async ({ page }) => {
    // Stage one request so the new-count branch is exercised.
    const staged = await page.request.post("/api/requests", {
      data: {
        name: `TEST Home ${runId}`,
        phone: "8135550199",
        email: `home-${runId}-patient@example.test`,
        location: "any",
        time: "any",
        locale: "en",
        sourcePath: "/en/appointment",
      },
      headers: { "X-Forwarded-For": testIp("staged") },
    });
    expect(staged.status()).toBe(201);

    await signIn(page);

    // Greeting: practice-local time of day plus a human name when one exists.
    const { data: profile } = await db
      .from("staff_profiles")
      .select("display_name")
      .eq("email", SEED_EMAIL.toLowerCase())
      .single();
    const displayName = String(profile?.display_name ?? "");
    const name = greetingName(displayName);
    const greeting = page.getByTestId("home-greeting");
    await expect(greeting).toBeVisible();
    await expect(greeting).not.toContainText("Portal");
    // The headline is the practice-local date; the greeting is its small print.
    const salutation = name === null ? "" : `, ${name}`;
    await expect(greeting).toHaveText(
      new RegExp(
        `^Good (morning|afternoon|evening)${salutation}\\. [A-Z][a-z]+day, [A-Z][a-z]+ \\d{1,2}$`,
      ),
    );

    // The print chooser names the live New count.
    const { count: newCount, error: countError } = await db
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");
    expect(countError).toBeNull();
    expect(newCount ?? 0).toBeGreaterThanOrEqual(1);

    // The zero-recipients safety net appears exactly when no active
    // Notification recipient exists.
    const { count: activeRecipients, error: recipientsError } = await db
      .from("notification_recipients")
      .select("id", { count: "exact", head: true })
      .eq("active", true);
    expect(recipientsError).toBeNull();
    await expect(page.getByTestId("no-recipients-warning")).toHaveCount(
      (activeRecipients ?? 0) === 0 ? 1 : 0,
    );
    // The staged request is a line on the day sheet, marked New.
    const stagedLine = page
      .getByTestId("home-line-list")
      .locator("li", { hasText: `TEST Home ${runId}` });
    await expect(stagedLine).toHaveCount(1);
    await expect(stagedLine.locator("[data-col='status']")).toHaveText("New");

    // Primary nav is task-first: Home / queue / Settings / Help — the flyer
    // Printer holds no tab, and Home carries the current-page marker.
    const nav = page.locator('nav[aria-label="Portal sections"]');
    await expect(nav.locator("a")).toHaveCount(4);
    await expect(nav.locator('a[aria-current="page"]')).toHaveText("Home");
    await expect(nav.getByRole("link", { name: "Review flyers" })).toHaveCount(0);

    // Other staff jobs: five links for every role — flyer printing is
    // Staff-wide (product decision 2026-07-26) — each a working link.
    const tasks = page.locator('nav[aria-label="Other staff jobs"]');
    for (const [label, href] of [
      ["Review flyers", "/admin/review-flyers"],
      ["Notification recipients", "/admin/settings#notifications"],
      ["Staff access", "/admin/settings#staff"],
      ["Website status", "/admin/settings/software"],
      ["Request a website change", "/admin/help#website-changes"],
    ] as const) {
      await expect(
        tasks.getByRole("link", { name: label, exact: true }),
        `task row: ${label}`,
      ).toHaveAttribute("href", href);
    }

    // Print opens a chooser. All New still uses the existing packet.
    await page.getByTestId("print-chooser-trigger").click();
    const printLink = page.getByRole("link", {
      name: `Print all ${newCount} new appointment ${
        newCount === 1 ? "request" : "requests"
      }; opens in a new tab`,
    });
    await expect(printLink).toHaveAttribute("href", "/admin/requests/print?auto=1");
    await expect(printLink).toHaveAttribute("target", "_blank");
    await expect(page.getByTestId("print-chooser-summary")).toHaveText(
      "Choose one or more statuses.",
    );
    await expect(page.getByRole("button", { name: "Print selected" })).toBeDisabled();
    const { count: contactedCount, error: contactedError } = await db
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "contacted");
    expect(contactedError).toBeNull();
    await page.getByTestId("print-status-contacted").check();
    if ((contactedCount ?? 0) > 0) {
      await expect(page.getByRole("link", { name: "Print selected" })).toHaveAttribute(
        "href",
        "/admin/requests/print?status=contacted&auto=1",
      );
    } else {
      await expect(page.getByRole("button", { name: "Print selected" })).toBeDisabled();
    }
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("print-chooser")).toBeHidden();
    await expect(page.getByTestId("print-chooser-trigger")).toBeFocused();

    // Appointments stays on the portal nav (DEC-UX-02: the destination is
    // Named Appointments; the records remain appointment requests under
    // /admin/requests).
    await page
      .locator('nav[aria-label="Portal sections"]')
      .getByRole("link", { name: "Appointments" })
      .click();
    await expect(page).toHaveURL(/\/admin\/requests\/?$/);
    await expect(page.getByRole("heading", { name: "Appointments", exact: true })).toBeVisible();
    // The waiting-count badge may append a count inside the same link.
    await expect(
      page.locator('nav[aria-label="Portal sections"] a[aria-current="page"]'),
    ).toHaveText(/^Appointments/, { useInnerText: true });
    await page.getByTestId("print-chooser-trigger").click();
    await expect(
      page.getByRole("link", {
        name: `Print all ${newCount} new appointment ${
          newCount === 1 ? "request" : "requests"
        }; opens in a new tab`,
      }),
    ).toHaveAttribute("target", "_blank");
  });

  test("the day sheet lists the newest New requests as lines", async ({ page }) => {
    await signIn(page);

    const { data: newestNew, error: newestError } = await db
      .from("requests")
      .select("id, name")
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(5);
    expect(newestError).toBeNull();
    const rows = z.array(z.object({ id: z.string(), name: z.string() })).parse(newestNew ?? []);
    expect(rows.length).toBeGreaterThan(0);

    const list = page.getByTestId("home-line-list");
    for (const row of rows) {
      await expect(list.locator("li", { hasText: row.name })).toHaveCount(1);
    }
    await expect(page.getByTestId("home-add-patient-request")).toHaveText("Add appointment");
  });

  test("a Contacted request with no call-again day is on the day sheet under Call again", async ({
    page,
  }) => {
    const id = randomUUID();
    const name = `TEST Home ${runId} missing call-again`;
    const { error: stageError } = await db.from("requests").insert({
      id,
      name,
      phone: "8135550199",
      email: `home-${runId}-missing-call-again@example.test`,
      location: "any",
      preferred_time: "any",
      message: "TEST queue-integrity fixture — no medical details.",
      locale: "en",
      source_path: "/e2e/home-missing-call-again",
      status: "contacted",
      follow_up_at: null,
    });
    expect(stageError).toBeNull();

    try {
      await signIn(page);
      const line = page.getByTestId("home-line-list").locator("li", { hasText: name });
      await expect(line).toHaveCount(1);
      await expect(line.locator("[data-col='status']")).toHaveText("Call again");
    } finally {
      await db.from("requests").delete().eq("id", id);
      await db.from("audit_log").delete().eq("entity_id", id);
    }
  });

  test("home flags recent notification delivery failures honestly", async ({ page }) => {
    const staged = await page.request.post("/api/requests", {
      data: {
        name: `TEST Home ${runId} delivery`,
        phone: "8135550199",
        email: `home-${runId}-delivery@example.test`,
        location: "any",
        time: "any",
        locale: "en",
        sourcePath: "/en/appointment",
      },
      headers: { "X-Forwarded-For": testIp("delivery") },
    });
    expect(staged.status()).toBe(201);
    const stagedBody = intakeResponseSchema.parse(await staged.json());
    if (!stagedBody.ok) throw new Error("Expected an accepted intake response");
    const { id } = stagedBody;
    // Delivery truth now lives in the transactional outbox (DEC-22/DEC-24):
    // Home reports failed, retrying, or exhausted outbox work from the last
    // 24 hours, never the legacy request_events notification rows.
    const { data: anyRecipient, error: recipientError } = await db
      .from("notification_recipients")
      .select("id")
      .limit(1)
      .single();
    expect(recipientError).toBeNull();
    const { error: outboxError } = await db.from("notification_outbox").insert({
      request_id: id,
      kind: "new_request",
      recipient_id: anyRecipient!.id,
      status: "failed",
      normalized_outcome: "transport_failure",
    });
    expect(outboxError).toBeNull();

    async function recentTrouble(): Promise<number> {
      const { count, error } = await db
        .from("notification_outbox")
        .select("id", { count: "exact", head: true })
        .in("status", ["failed", "retry_pending", "exhausted"])
        .gte("updated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      expect(error).toBeNull();
      return count ?? 0;
    }

    await signIn(page);

    const expectedCount = await recentTrouble();
    expect(expectedCount).toBeGreaterThanOrEqual(1);
    const warning = page.getByTestId("delivery-failure-warning");
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(
      expectedCount === 1
        ? "A notification email had trouble sending in the last 24 hours."
        : `${expectedCount} notification emails had trouble sending in the last 24 hours.`,
    );

    // Removing the staged failure restores the honest quiet state: the
    // Warning shows only while real recent outbox trouble exists.
    await db.from("notification_outbox").delete().eq("request_id", id).eq("status", "failed");
    const remaining = await recentTrouble();
    await page.reload();
    await expect(page.getByTestId("delivery-failure-warning")).toHaveCount(remaining > 0 ? 1 : 0);

    await db.from("requests").delete().eq("id", id);
  });

  test("first-login tour dismissal and Help restart persist on the staff profile", async ({
    page,
  }) => {
    const email = SEED_EMAIL.trim().toLowerCase();
    const { data: originalProfile, error: profileError } = await db
      .from("staff_profiles")
      .select("id, portal_tour_dismissed_at")
      .eq("email", email)
      .single();
    expect(profileError).toBeNull();
    expect(z.string().safeParse(originalProfile?.portal_tour_dismissed_at).success).toBe(true);
    const { data: priorTourAudits, error: priorAuditError } = await db
      .from("audit_log")
      .select("id")
      .eq("actor_email", email)
      .eq("entity_id", originalProfile!.id)
      .in("action", ["staff.tour_dismiss", "staff.tour_restart"]);
    expect(priorAuditError).toBeNull();
    const priorAuditIds = new Set(
      z
        .array(z.object({ id: z.string() }))
        .parse(priorTourAudits ?? [])
        .map((row) => row.id),
    );
    let completionIdsToClean: string[] = [];

    try {
      const { error: resetError } = await db
        .from("staff_profiles")
        .update({ portal_tour_dismissed_at: null })
        .eq("id", originalProfile!.id);
      expect(resetError).toBeNull();

      await signIn(page);
      const nudge = page.getByTestId("portal-tour-nudge");
      await expect(nudge).toBeVisible();
      await expect(nudge.getByRole("button", { name: "Take a quick tour" })).toBeVisible();
      await expect(nudge.getByRole("button", { name: "Not now" })).toBeVisible();

      const launcher = nudge.getByRole("button", { name: "Take a quick tour" });
      await launcher.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByTestId("portal-tour-dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("heading", { name: "Home", exact: true })).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Close the portal tour" })).toBeFocused();
      expect(await dialog.evaluate((element) => element.matches(":modal"))).toBe(true);
      const backgroundAction = page.getByTestId("home-add-patient-request");
      expect(
        await backgroundAction.evaluate((element) => {
          if (!(element instanceof HTMLElement)) return true;
          element.focus();
          return document.activeElement === element;
        }),
      ).toBe(false);
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(
        true,
      );

      // Native modal tab order stays within the tour. Moving through steps
      // Keeps the useful action focused even when its visible label changes.
      await page.keyboard.press("Shift+Tab");
      await expect(dialog.getByRole("button", { name: "Next" })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(
        dialog.getByRole("heading", {
          name: "Appointments",
          exact: true,
        }),
      ).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Next" })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(dialog.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Finish tour" })).toBeFocused();

      await page.keyboard.press("Shift+Tab");
      await expect(dialog.getByRole("button", { name: "Back" })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(
        dialog.getByRole("heading", { name: "Appointments", exact: true }),
      ).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Back" })).toBeFocused();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Enter");
      await expect(dialog.getByRole("button", { name: "Finish tour" })).toBeFocused();
      for (const key of ["Tab", "Tab", "Shift+Tab", "Shift+Tab"]) {
        await page.keyboard.press(key);
        expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(
          true,
        );
      }

      // The explicit close action does not complete or dismiss the tour and
      // Returns focus to the launcher that opened it.
      await dialog.getByRole("button", { name: "Close the portal tour" }).focus();
      await page.keyboard.press("Enter");
      await expect(dialog).toBeHidden();
      await expect(launcher).toBeFocused();
      await expect(nudge).toBeVisible();

      await page.keyboard.press("Enter");
      await expect(dialog).toBeVisible();

      // Escape closes without dismissing; the opt-in nudge remains available.
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(launcher).toBeFocused();
      await expect(nudge).toBeVisible();
      const { data: stillNull } = await db
        .from("staff_profiles")
        .select("portal_tour_dismissed_at")
        .eq("id", originalProfile!.id)
        .single();
      expect(stillNull?.portal_tour_dismissed_at).toBeNull();

      await page.keyboard.press("Tab");
      await expect(nudge.getByRole("button", { name: "Not now" })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/admin\/?$/);
      await expect(page.getByTestId("portal-tour-nudge")).toHaveCount(0);
      await expect(page.getByTestId("home-greeting")).toBeFocused();
      await expect(page.getByTestId("portal-tour-return-status")).toHaveText(
        "The tour is hidden. You can restart it from Help.",
      );
      await expect(page.getByTestId("portal-tour-return-status")).toHaveAttribute("role", "status");
      const { data: dismissed } = await db
        .from("staff_profiles")
        .select("portal_tour_dismissed_at")
        .eq("id", originalProfile!.id)
        .single();
      expect(z.string().safeParse(dismissed?.portal_tour_dismissed_at).success).toBe(true);

      await page.goto("/admin/help");
      const systems = page.locator("details", {
        hasText: "Show the systems explainer",
      });
      await systems.getByText("Show the systems explainer").click();
      for (const name of ["GitHub", "Vercel", "Supabase", "Porkbun"]) {
        await expect(systems.getByText(name, { exact: true })).toBeVisible();
      }

      const restart = page.getByRole("button", { name: "Show the portal tour again" });
      await restart.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/admin\/?$/);
      await expect(page.getByTestId("portal-tour-nudge")).toBeVisible();
      await expect(page.getByRole("button", { name: "Take a quick tour" })).toBeFocused();
      const { data: restarted } = await db
        .from("staff_profiles")
        .select("portal_tour_dismissed_at")
        .eq("id", originalProfile!.id)
        .single();
      expect(restarted?.portal_tour_dismissed_at).toBeNull();

      await page.keyboard.press("Enter");
      await expect(dialog).toBeVisible();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Enter");
      await page.keyboard.press("Enter");
      await expect(dialog.getByRole("button", { name: "Finish tour" })).toBeFocused();
      const { data: completionsBeforeFinish, error: completionsBeforeFinishError } = await db
        .from("audit_log")
        .select("id")
        .eq("actor_email", email)
        .eq("action", "staff.tour_complete");
      expect(completionsBeforeFinishError).toBeNull();
      const completionIdsBeforeFinish = new Set(
        z
          .array(z.object({ id: z.string() }))
          .parse(completionsBeforeFinish ?? [])
          .map((row) => row.id),
      );
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/admin\/?$/);
      await expect(page.getByTestId("portal-tour-nudge")).toHaveCount(0);
      await expect(page.getByTestId("home-greeting")).toBeFocused();
      await page.reload();
      await expect(page.getByTestId("portal-tour-nudge")).toHaveCount(0);

      const { data: completed } = await db
        .from("staff_profiles")
        .select("portal_tour_dismissed_at")
        .eq("id", originalProfile!.id)
        .single();
      expect(z.string().safeParse(completed?.portal_tour_dismissed_at).success).toBe(true);

      const { data: audits, error: auditError } = await db
        .from("audit_log")
        .select("id, action")
        .eq("actor_email", email)
        .eq("entity_id", originalProfile!.id)
        .in("action", ["staff.tour_dismiss", "staff.tour_restart"]);
      expect(auditError).toBeNull();
      expect(
        z
          .array(z.object({ id: z.string(), action: z.string() }))
          .parse(audits ?? [])
          .filter((row) => !priorAuditIds.has(row.id))
          .map((row) => row.action),
      ).toEqual(expect.arrayContaining(["staff.tour_dismiss", "staff.tour_restart"]));

      // Finishing the tour is now distinguishable from dismissing it: one
      // Completion row with the step reached, written app-side.
      const { data: completes, error: completeError } = await db
        .from("audit_log")
        .select("id, detail")
        .eq("actor_email", email)
        .eq("action", "staff.tour_complete");
      expect(completeError).toBeNull();
      const newCompletions = z
        .array(z.object({ id: z.string(), detail: z.record(z.string(), z.unknown()) }))
        .parse(completes ?? [])
        .filter((row) => !completionIdsBeforeFinish.has(row.id));
      expect(newCompletions).toHaveLength(1);
      completionIdsToClean = newCompletions.map((row) => row.id);
      expect(newCompletions[0].detail).toMatchObject({
        completed: true,
        step_reached: 3,
        total_steps: 3,
      });

      // Help restores the same launcher after completion too.
      await page.goto("/admin/help");
      const restartAfterFinish = page.getByRole("button", {
        name: "Show the portal tour again",
      });
      await restartAfterFinish.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/admin\/?$/);
      await expect(page.getByTestId("portal-tour-nudge")).toBeVisible();
      await expect(page.getByRole("button", { name: "Take a quick tour" })).toBeFocused();
    } finally {
      await db
        .from("staff_profiles")
        .update({
          portal_tour_dismissed_at: originalProfile!.portal_tour_dismissed_at,
        })
        .eq("id", originalProfile!.id);
      const { data: tourAudits } = await db
        .from("audit_log")
        .select("id")
        .eq("actor_email", email)
        .eq("entity_id", originalProfile!.id)
        .in("action", ["staff.tour_dismiss", "staff.tour_restart"]);
      const auditIds = z
        .array(z.object({ id: z.string() }))
        .parse(tourAudits ?? [])
        .map((row) => row.id)
        .filter((id) => !priorAuditIds.has(id));
      if (auditIds.length > 0) {
        await db.from("audit_log").delete().in("id", auditIds);
      }
      if (completionIdsToClean.length > 0) {
        await db.from("audit_log").delete().in("id", completionIdsToClean);
      }
    }
  });
});
