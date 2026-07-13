import { createHash, randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { loadLocalEnv, requiredEnv, serviceDb } from "./support";

// VAL-ADMIN-007: recipients are manageable from the UI and a staged
// submission attempts notification for exactly the active set.
// VAL-ADMIN-008: invite -> one-time password -> login -> deactivate ->
// login refused, across two browser contexts.
// VAL-ADMIN-012: the help page is substantive plain English (>=400 words).

loadLocalEnv();

const SEED_EMAIL = requiredEnv("PORTAL_SEED_ADMIN_EMAIL");
const SEED_PASSWORD = requiredEnv("PORTAL_SEED_ADMIN_PASSWORD");

const db = serviceDb();
const runId = randomUUID().slice(0, 8);

function testIp(label: string): string {
  const hex = createHash("sha256").update(`${runId}:${label}`).digest("hex");
  return `2001:db8:${hex.slice(0, 4)}:${hex.slice(4, 8)}::4`;
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** Successful sign-ins must settle on /admin BEFORE further navigation —
 * a goto that races the login action loses the session cookie write. */
async function signInExpectingPortal(
  page: Page,
  email: string,
  password: string,
) {
  await signIn(page, email, password);
  await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 15_000 });
}

function recipientItem(page: Page, email: string) {
  return page.locator(`[data-recipient-email="${email}"]`);
}

test.describe("portal management UI", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "JS portal UI");
  });

  test.afterAll(async () => {
    await db
      .from("notification_recipients")
      .delete()
      .like("email", `ux-${runId}-%`);
    await db.from("requests").delete().like("email", `ux-${runId}-%`);
    const { data: leftovers } = await db
      .from("staff_profiles")
      .select("user_id")
      .like("email", `ux-${runId}-%`);
    for (const row of leftovers ?? []) {
      await db.from("staff_profiles").delete().eq("user_id", row.user_id);
      await db.auth.admin.deleteUser(row.user_id);
    }
  });

  test("VAL-ADMIN-007: recipient management drives the notification set", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    page.on("dialog", (dialog) => void dialog.accept());

    const emailA = `ux-${runId}-keep@example.test`;
    const emailB = `ux-${runId}-paused@example.test`;
    const emailC = `ux-${runId}-removed@example.test`;

    await signInExpectingPortal(page, SEED_EMAIL, SEED_PASSWORD);
    await page.goto("/admin/settings");
    await expect(page.locator("#recipient-email")).toBeVisible({
      timeout: 30_000,
    });

    // Add three recipients through the UI.
    for (const email of [emailA, emailB, emailC]) {
      await page.locator("#recipient-email").fill(email);
      await page.getByRole("button", { name: "Add", exact: true }).click();
      await expect(recipientItem(page, email)).toBeVisible({
        timeout: 15_000,
      });
    }

    // Toggle B to paused; it persists.
    await recipientItem(page, emailB).locator('[data-action="toggle"]').click();
    await expect(
      recipientItem(page, emailB).locator('[data-action="toggle"]'),
    ).toHaveText("Paused", { timeout: 15_000 });
    const { data: bRow } = await db
      .from("notification_recipients")
      .select("active")
      .eq("email", emailB)
      .single();
    expect(bRow?.active).toBe(false);

    // Remove C (native confirm accepted above); it disappears and is gone.
    await recipientItem(page, emailC).locator('[data-action="remove"]').click();
    await expect(recipientItem(page, emailC)).toHaveCount(0, {
      timeout: 15_000,
    });
    const { data: cRows } = await db
      .from("notification_recipients")
      .select("id")
      .eq("email", emailC);
    expect(cRows).toHaveLength(0);

    // A staged submission attempts notification for EXACTLY the active set.
    // Global setup paused every pre-existing recipient, so the active set
    // right now is {A}. A rejected provider outcome still counts as an
    // attempt — that is the assertion, not deliverability.
    const staged = {
      name: `TEST UX ${runId}`,
      phone: "8135550161",
      email: `ux-${runId}-patient@example.test`,
      location: "any",
      time: "any",
      locale: "en",
      sourcePath: "/en/appointment",
    };
    const response = await page.request.post("/api/requests", {
      data: staged,
      headers: { "X-Forwarded-For": testIp("notify-set") },
    });
    expect(response.status()).toBe(201);
    const body = (await response.json()) as { ok: boolean; id: string };
    expect(body.ok).toBe(true);

    await expect
      .poll(
        async () => {
          const { data } = await db
            .from("request_events")
            .select("recipient, status")
            .eq("request_id", body.id)
            .eq("type", "notification");
          return (data ?? []).map((row) => row.recipient).sort();
        },
        { timeout: 20_000 },
      )
      .toEqual([emailA]);

    const { data: attempt } = await db
      .from("request_events")
      .select("status, provider_message_id")
      .eq("request_id", body.id)
      .eq("type", "notification")
      .single();
    expect(["sent", "rejected", "failed"]).toContain(attempt?.status);

    // The mutations above are on the audit record, visible in the view.
    await page.goto("/admin/audit");
    await expect(page.getByTestId("audit-table")).toContainText(
      "recipients.add",
    );
    await expect(page.getByTestId("audit-table")).toContainText(
      "recipients.remove",
    );

    // Tidy the two survivors through the UI (also re-proves remove).
    await page.goto("/admin/settings");
    for (const email of [emailA, emailB]) {
      await recipientItem(page, email).locator('[data-action="remove"]').click();
      await expect(recipientItem(page, email)).toHaveCount(0, {
        timeout: 15_000,
      });
    }
  });

  test("VAL-ADMIN-008: invite, one-time password, login, deactivate, refuse", async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000);
    page.on("dialog", (dialog) => void dialog.accept());

    const inviteEmail = `ux-${runId}-staff@example.test`;

    await signInExpectingPortal(page, SEED_EMAIL, SEED_PASSWORD);
    await page.goto("/admin/settings");
    await expect(page.locator("#invite-email")).toBeVisible({
      timeout: 30_000,
    });

    await page.locator("#invite-email").fill(inviteEmail);
    await page.locator("#invite-name").fill("TEST Invite");
    await page.getByRole("button", { name: "Invite", exact: true }).click();

    const panel = page.getByTestId("temp-password-panel");
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await expect(panel).toContainText(inviteEmail);
    const tempPassword = (
      (await page.getByTestId("temp-password").textContent()) ?? ""
    ).trim();
    expect(tempPassword.length).toBeGreaterThanOrEqual(20);

    // Second context: the invited staffer signs in with the one-time password.
    const staffContext = await browser.newContext();
    const staffPage = await staffContext.newPage();
    await signInExpectingPortal(staffPage, inviteEmail, tempPassword);
    await expect(staffPage.getByTestId("session-user")).toHaveText(
      inviteEmail,
    );

    // Admin deactivates them.
    await page
      .locator(`[data-staff-email="${inviteEmail}"]`)
      .locator('[data-action="deactivate"]')
      .click();
    await expect(
      page.locator(`[data-staff-email="${inviteEmail}"]`),
    ).toContainText("Deactivated", { timeout: 15_000 });

    // Their live session no longer opens the portal...
    await staffPage.goto("/admin");
    await expect(staffPage).toHaveURL(/\/admin\/login\/?$/);

    // ...and a fresh login is refused with the generic error.
    await signIn(staffPage, inviteEmail, tempPassword);
    await expect(staffPage).toHaveURL(/\/admin\/login\/?$/);
    await expect(staffPage.locator("#login-error")).toBeVisible();

    await staffContext.close();
  });

  test("VAL-ADMIN-012: help page is substantive plain English", async ({
    page,
  }) => {
    await signInExpectingPortal(page, SEED_EMAIL, SEED_PASSWORD);
    await page.goto("/admin/help");

    const text = (await page.locator("main").innerText()).trim();
    const words = text.split(/\s+/).filter(Boolean);
    expect(words.length).toBeGreaterThanOrEqual(400);

    for (const heading of [
      "Triaging requests and statuses",
      "Notification emails",
      "Staff access",
      "Getting website changes made",
    ]) {
      await expect(
        page.getByRole("heading", { name: heading }),
      ).toBeVisible();
    }
  });
});
