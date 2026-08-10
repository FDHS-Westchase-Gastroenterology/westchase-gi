import { createHash, randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { loadLocalEnv, requiredEnv, serviceDb } from "./support";

// The portal home page: staff land on a greeting and their tasks, not on
// software. The queue overview count is real data, paper handoff is one
// truthful action away, and occasional tools stay out of the primary path.

loadLocalEnv();

const SEED_EMAIL = requiredEnv("PORTAL_SEED_ADMIN_EMAIL");
const SEED_PASSWORD = requiredEnv("PORTAL_SEED_ADMIN_PASSWORD");

const db = serviceDb();
const runId = randomUUID().slice(0, 8);

function testIp(label: string): string {
  const hex = createHash("sha256").update(`${runId}:${label}`).digest("hex");
  return `2001:db8:${hex.slice(0, 4)}:${hex.slice(4, 8)}::6`;
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 15_000 });
}

test.describe("portal home", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "JS portal UI");
  });

  test.afterAll(async () => {
    await db.from("requests").delete().like("email", `home-${runId}-%`);
  });

  test("admin lands on a greeting, live queue status, and the full task list", async ({
    page,
  }) => {
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

    await signIn(page, SEED_EMAIL, SEED_PASSWORD);

    // Greeting: practice-local time of day plus the profile's first name.
    const { data: profile } = await db
      .from("staff_profiles")
      .select("display_name")
      .eq("email", SEED_EMAIL.toLowerCase())
      .single();
    const firstName = String(profile?.display_name ?? "").trim().split(/\s+/)[0];
    expect(firstName.length).toBeGreaterThan(0);
    const greeting = page.getByTestId("home-greeting");
    await expect(greeting).toBeVisible();
    await expect(greeting).toContainText(
      /Good (morning|afternoon|evening), /,
    );
    await expect(greeting).toContainText(firstName);

    // The practice-local after-hours cue starts at 7 p.m. Eastern.
    const [easternHour, easternMinute] = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "America/New_York",
    })
      .format(new Date())
      .split(":")
      .map(Number);
    const easternMinutes = easternHour * 60 + easternMinute;
    await expect(page.getByTestId("after-hours")).toHaveCount(
      easternMinutes >= 19 * 60 || easternMinutes < 5 * 60 + 30 ? 1 : 0,
    );

    // The overview count is the database's new-count, phrased as a sentence.
    const { count: newCount, error: countError } = await db
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");
    expect(countError).toBeNull();
    expect(newCount ?? 0).toBeGreaterThanOrEqual(1);
    const headline = page.getByTestId("queue-overview-headline");
    await expect(headline).toHaveText(
      new RegExp(
        `^${newCount} new appointment request${newCount === 1 ? " is" : "s are"} waiting\\.$`,
      ),
    );

    // Age context renders exactly when the oldest new request predates the
    // current practice-local calendar day (label logic is unit-tested in
    // src/lib/portal/business-time.test.mjs; this pins the wiring).
    const { data: oldestNew, error: oldestError } = await db
      .from("requests")
      .select("created_at")
      .eq("status", "new")
      .order("created_at", { ascending: true })
      .limit(1);
    expect(oldestError).toBeNull();
    const nyDay = (value: string | Date) =>
      new Date(value).toLocaleDateString("en-CA", {
        timeZone: "America/New_York",
      });
    const oldestIsPastDay =
      oldestNew?.[0] != null &&
      nyDay(oldestNew[0].created_at) < nyDay(new Date());
    const oldestLine = page.getByTestId("queue-overview-oldest");
    await expect(oldestLine).toHaveCount(oldestIsPastDay ? 1 : 0);
    if (oldestIsPastDay) {
      await expect(oldestLine).toHaveText(
        /^(Waiting|Oldest waiting) since .+\.$/,
      );
    }

    // The zero-recipients safety net appears exactly when no active
    // notification recipient exists.
    const { count: activeRecipients, error: recipientsError } = await db
      .from("notification_recipients")
      .select("id", { count: "exact", head: true })
      .eq("active", true);
    expect(recipientsError).toBeNull();
    await expect(page.getByTestId("no-recipients-warning")).toHaveCount(
      (activeRecipients ?? 0) === 0 ? 1 : 0,
    );
    // The staged request (the newest) appears in the preview list and its
    // row links to the detail page.
    const preview = page.getByTestId("queue-overview-preview");
    await expect(
      preview.getByRole("link", { name: new RegExp(`TEST Home ${runId}`) }),
    ).toHaveAttribute("href", /^\/admin\/requests\/[0-9a-f-]+$/);

    // Primary nav is task-first: Home / queue / Settings / Help — the flyer
    // printer holds no tab, and Home carries the current-page marker.
    const nav = page.locator('nav[aria-label="Portal sections"]');
    await expect(nav.locator("a")).toHaveCount(4);
    await expect(nav.locator('a[aria-current="page"]')).toHaveText("Home");
    await expect(
      nav.getByRole("link", { name: "Print review flyers" }),
    ).toHaveCount(0);

    // Task list: five rows for every role — flyer printing is staff-wide
    // (product decision 2026-07-26) — each a working link. Scoped to the
    // tasks section: the zero-recipients warning may repeat a task's name.
    const tasks = page.locator('aside[aria-labelledby="desk-tools-heading"]');
    for (const [label, href] of [
      ["Print review flyers", "/admin/review-flyers"],
      ["Notification emails", "/admin/settings#notifications"],
      ["Staff access", "/admin/settings#staff"],
      ["Website status", "/admin/settings/software"],
      ["Request a website change", "/admin/help#website-changes"],
    ] as const) {
      await expect(
        tasks.getByRole("link", { name: label, exact: true }),
        `task row: ${label}`,
      ).toHaveAttribute("href", href);
    }

    // The manager's paper handoff is directly available from Home, opens a
    // dedicated print surface, and keeps the live workbench in place.
    const printLink = page.getByRole("link", {
      name: `Print all ${newCount} new appointment ${
        newCount === 1 ? "request" : "requests"
      }; opens in a new tab`,
    });
    await expect(printLink).toHaveAttribute(
      "href",
      "/admin/requests/print?auto=1",
    );
    await expect(printLink).toHaveAttribute("target", "_blank");

    // The primary action opens the Appointments workbench (DEC-UX-02: the
    // destination is named Appointments; the records remain appointment
    // requests under /admin/requests).
    await page.getByRole("link", { name: "Open Appointments" }).click();
    await expect(page).toHaveURL(/\/admin\/requests\/?$/);
    await expect(
      page.getByRole("heading", { name: "Appointments", exact: true }),
    ).toBeVisible();
    // The waiting-count badge may append a count inside the same link.
    await expect(
      page.locator('nav[aria-label="Portal sections"] a[aria-current="page"]'),
    ).toHaveText(/^Appointments/, { useInnerText: true });
    await expect(
      page.getByRole("link", {
        name: `Print ${newCount} new appointment ${
          newCount === 1 ? "request" : "requests"
        }; opens in a new tab`,
      }),
    ).toHaveAttribute("target", "_blank");
  });

  test("home flags recent notification delivery failures honestly", async ({
    page,
  }) => {
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
    const { id } = (await staged.json()) as { id: string };
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
        .gte(
          "updated_at",
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        );
      expect(error).toBeNull();
      return count ?? 0;
    }

    await signIn(page, SEED_EMAIL, SEED_PASSWORD);

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
    // warning shows only while real recent outbox trouble exists.
    await db
      .from("notification_outbox")
      .delete()
      .eq("request_id", id)
      .eq("status", "failed");
    const remaining = await recentTrouble();
    await page.reload();
    await expect(page.getByTestId("delivery-failure-warning")).toHaveCount(
      remaining > 0 ? 1 : 0,
    );

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
    expect(typeof originalProfile?.portal_tour_dismissed_at).toBe("string");
    const { data: priorTourAudits, error: priorAuditError } = await db
      .from("audit_log")
      .select("id")
      .eq("actor_email", email)
      .eq("entity_id", originalProfile!.id)
      .in("action", ["staff.tour_dismiss", "staff.tour_restart"]);
    expect(priorAuditError).toBeNull();
    const priorAuditIds = new Set(
      (priorTourAudits ?? []).map((row) => row.id),
    );

    try {
      const { error: resetError } = await db
        .from("staff_profiles")
        .update({ portal_tour_dismissed_at: null })
        .eq("id", originalProfile!.id);
      expect(resetError).toBeNull();

      await signIn(page, SEED_EMAIL, SEED_PASSWORD);
      const nudge = page.getByTestId("portal-tour-nudge");
      await expect(nudge).toBeVisible();
      await expect(
        nudge.getByRole("button", { name: "Take a quick tour" }),
      ).toBeVisible();
      await expect(
        nudge.getByRole("button", { name: "Not now" }),
      ).toBeVisible();

      await nudge.getByRole("button", { name: "Take a quick tour" }).click();
      const dialog = page.getByTestId("portal-tour-dialog");
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("heading", { name: "Home", exact: true }),
      ).toBeVisible();
      await dialog.getByRole("button", { name: "Next" }).click();
      await expect(
        dialog.getByRole("heading", {
          name: "Appointments",
          exact: true,
        }),
      ).toBeVisible();
      await dialog.getByRole("button", { name: "Next" }).click();
      await expect(
        dialog.getByRole("heading", { name: "Settings", exact: true }),
      ).toBeVisible();

      // Escape closes without dismissing; the opt-in nudge remains available.
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(nudge).toBeVisible();
      const { data: stillNull } = await db
        .from("staff_profiles")
        .select("portal_tour_dismissed_at")
        .eq("id", originalProfile!.id)
        .single();
      expect(stillNull?.portal_tour_dismissed_at).toBeNull();

      await nudge.getByRole("button", { name: "Not now" }).click();
      await expect(page).toHaveURL(/\/admin\/?$/);
      await expect(page.getByTestId("portal-tour-nudge")).toHaveCount(0);
      const { data: dismissed } = await db
        .from("staff_profiles")
        .select("portal_tour_dismissed_at")
        .eq("id", originalProfile!.id)
        .single();
      expect(typeof dismissed?.portal_tour_dismissed_at).toBe("string");

      await page.goto("/admin/help");
      const systems = page.locator("details", {
        hasText: "Show the systems explainer",
      });
      await systems.getByText("Show the systems explainer").click();
      for (const name of ["GitHub", "Vercel", "Supabase", "Porkbun"]) {
        await expect(systems.getByText(name, { exact: true })).toBeVisible();
      }

      await page
        .getByRole("button", { name: "Show the portal tour again" })
        .click();
      await expect(page).toHaveURL(/\/admin\/?$/);
      await expect(page.getByTestId("portal-tour-nudge")).toBeVisible();
      const { data: restarted } = await db
        .from("staff_profiles")
        .select("portal_tour_dismissed_at")
        .eq("id", originalProfile!.id)
        .single();
      expect(restarted?.portal_tour_dismissed_at).toBeNull();

      await page.getByRole("button", { name: "Take a quick tour" }).click();
      await page.getByTestId("portal-tour-dialog").getByRole("button", {
        name: "Next",
      }).click();
      await page.getByTestId("portal-tour-dialog").getByRole("button", {
        name: "Next",
      }).click();
      await page
        .getByTestId("portal-tour-dialog")
        .getByRole("button", { name: "Finish tour" })
        .click();
      await expect(page).toHaveURL(/\/admin\/?$/);
      await expect(page.getByTestId("portal-tour-nudge")).toHaveCount(0);
      await page.reload();
      await expect(page.getByTestId("portal-tour-nudge")).toHaveCount(0);

      const { data: completed } = await db
        .from("staff_profiles")
        .select("portal_tour_dismissed_at")
        .eq("id", originalProfile!.id)
        .single();
      expect(typeof completed?.portal_tour_dismissed_at).toBe("string");

      const { data: audits, error: auditError } = await db
        .from("audit_log")
        .select("id, action")
        .eq("actor_email", email)
        .eq("entity_id", originalProfile!.id)
        .in("action", ["staff.tour_dismiss", "staff.tour_restart"]);
      expect(auditError).toBeNull();
      expect(
        (audits ?? [])
          .filter((row) => !priorAuditIds.has(row.id))
          .map((row) => row.action),
      ).toEqual(
        expect.arrayContaining([
          "staff.tour_dismiss",
          "staff.tour_restart",
        ]),
      );

      // Finishing the tour is now distinguishable from dismissing it: one
      // completion row with the step reached, written app-side.
      const { data: completes, error: completeError } = await db
        .from("audit_log")
        .select("id, detail")
        .eq("actor_email", email)
        .eq("action", "staff.tour_complete");
      expect(completeError).toBeNull();
      expect(completes).toHaveLength(1);
      expect(completes![0].detail).toMatchObject({
        completed: true,
        step_reached: 3,
        total_steps: 3,
      });
    } finally {
      await db
        .from("staff_profiles")
        .update({
          portal_tour_dismissed_at:
            originalProfile!.portal_tour_dismissed_at,
        })
        .eq("id", originalProfile!.id);
      const { data: tourAudits } = await db
        .from("audit_log")
        .select("id")
        .eq("actor_email", email)
        .eq("entity_id", originalProfile!.id)
        .in("action", ["staff.tour_dismiss", "staff.tour_restart"]);
      const auditIds = (tourAudits ?? [])
        .map((row) => row.id)
        .filter((id) => !priorAuditIds.has(id));
      if (auditIds.length > 0) {
        await db.from("audit_log").delete().in("id", auditIds);
      }
      await db
        .from("audit_log")
        .delete()
        .eq("actor_email", email)
        .eq("action", "staff.tour_complete");
    }
  });
});
