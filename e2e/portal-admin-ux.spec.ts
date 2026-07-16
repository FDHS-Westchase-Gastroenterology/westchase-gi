import { createHash, randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { loadLocalEnv, requiredEnv, serviceDb } from "./support";

// VAL-ADMIN-007: recipients are manageable from the UI and a staged
// submission attempts notification for exactly the active set.
// VAL-ADMIN-008: invite -> one-time setup link -> own password -> deactivate
// -> login refused, across two browser contexts.
// VAL-ADMIN-012: the help page is substantive plain English (>=400 words).

loadLocalEnv();

const SEED_EMAIL = requiredEnv("PORTAL_SEED_ADMIN_EMAIL");
const SEED_PASSWORD = requiredEnv("PORTAL_SEED_ADMIN_PASSWORD");

const db = serviceDb();
const runId = randomUUID().slice(0, 8);

// Invite/recovery URLs contain one-time bearer fragments. Never preserve them
// in a retained-on-failure trace artifact.
test.use({ trace: "off" });

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

async function expectSetupLinkRejected(page: Page, setupUrl: string) {
  await page.goto(setupUrl);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/admin\/auth\/confirm\/?$/, {
    timeout: 15_000,
  });
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "This link is invalid or expired." }),
  ).toBeVisible();
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
      await expect(page.getByTestId("recipient-delivery-status")).toContainText(
        "Recipient added, but confirmation email delivery could not be confirmed.",
      );
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

  test("VAL-ADMIN-008: invite, own-password setup, deactivate, refuse", async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);
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

    const panel = page.getByTestId("invite-fallback-panel");
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await expect(panel.locator("p").first()).toHaveText(
      `Invitation created for ${inviteEmail}`,
    );
    expect(await panel.getByText("One-time password").count()).toBe(0);
    const originalSetupUrl = (
      (await page.getByTestId("fallback-setup-url").textContent()) ?? ""
    ).trim();
    expect(URL.canParse(originalSetupUrl)).toBe(true);
    const parsedSetupUrl = new URL(originalSetupUrl);
    const setupFragment = new URLSearchParams(parsedSetupUrl.hash.slice(1));
    expect(parsedSetupUrl.pathname).toBe("/admin/auth/confirm");
    expect(setupFragment.get("type")).toBe("invite");
    expect(Boolean(setupFragment.get("token_hash"))).toBe(true);

    const invitedRow = page.locator(`[data-staff-email="${inviteEmail}"]`);
    await expect(invitedRow).toContainText("Pending setup");

    // An administrator can replace an expired/lost pending link. Reissuing
    // invalidates the earlier token without changing the stored role.
    await invitedRow.locator('[data-action="resend-invite"]').click();
    await expect
      .poll(async () => {
        const renewed =
          (await page.getByTestId("fallback-setup-url").textContent()) ?? "";
        return renewed.trim().length > 0 && renewed.trim() !== originalSetupUrl;
      })
      .toBe(true);
    const setupUrl = (
      (await page.getByTestId("fallback-setup-url").textContent()) ?? ""
    ).trim();
    expect(URL.canParse(setupUrl)).toBe(true);
    const renewedSetupUrl = new URL(setupUrl);
    const renewedFragment = new URLSearchParams(
      renewedSetupUrl.hash.slice(1),
    );
    expect(renewedSetupUrl.pathname).toBe("/admin/auth/confirm");
    expect(renewedFragment.get("type")).toBe("invite");
    expect(Boolean(renewedFragment.get("token_hash"))).toBe(true);

    // Reissuing the invitation must supersede the original bearer link. Its
    // Continue action stays on the confirmation screen with the generic
    // expired-link outcome rather than establishing a password session.
    const supersededContext = await browser.newContext();
    const supersededPage = await supersededContext.newPage();
    await expectSetupLinkRejected(supersededPage, originalSetupUrl);
    await supersededContext.close();

    // A never-onboarded invitation is also revoked when an administrator
    // deactivates it. The row disappears from the default list immediately,
    // and its previously issued bearer link cannot reach password setup.
    const pendingEmail = `ux-${runId}-pending@example.test`;
    await page.locator("#invite-email").fill(pendingEmail);
    await page.locator("#invite-name").fill("TEST Pending Invite");
    await page.getByRole("button", { name: "Invite", exact: true }).click();
    await expect(panel.locator("p").first()).toHaveText(
      `Invitation created for ${pendingEmail}`,
      { timeout: 15_000 },
    );
    const pendingSetupUrl = (
      (await page.getByTestId("fallback-setup-url").textContent()) ?? ""
    ).trim();
    expect(URL.canParse(pendingSetupUrl)).toBe(true);

    const pendingRow = page.locator(`[data-staff-email="${pendingEmail}"]`);
    await expect(pendingRow).toContainText("Pending setup");
    await pendingRow.locator('[data-action="deactivate"]').click();
    await expect(pendingRow).toHaveCount(0, { timeout: 15_000 });

    const deactivatedInviteContext = await browser.newContext();
    const deactivatedInvitePage = await deactivatedInviteContext.newPage();
    await expectSetupLinkRejected(deactivatedInvitePage, pendingSetupUrl);
    await deactivatedInviteContext.close();

    // Second context: the invited staffer deliberately consumes the one-time
    // link, chooses their own password, and lands in the portal.
    const staffContext = await browser.newContext();
    const staffPage = await staffContext.newPage();
    await staffPage.goto(setupUrl);
    await staffPage.getByRole("button", { name: "Continue" }).click();
    await expect(staffPage).toHaveURL(/\/admin\/set-password\/?$/);

    const chosenPassword = `Wgi!${runId}OwnPassword7`;
    await staffPage.getByLabel("New password", { exact: true }).fill(chosenPassword);
    await staffPage
      .getByLabel("Confirm password", { exact: true })
      .fill(chosenPassword);
    await staffPage.getByRole("button", { name: "Set password" }).click();
    await expect(staffPage).toHaveURL(/\/admin\/?$/, { timeout: 15_000 });
    await expect(staffPage.getByTestId("session-user")).toHaveText(
      inviteEmail,
    );

    await page.reload();
    await expect(invitedRow).not.toContainText("Pending setup");

    // Admin deactivates them.
    await invitedRow.locator('[data-action="deactivate"]').click();
    await expect(invitedRow).toHaveCount(0, { timeout: 15_000 });

    // Their live session no longer opens the portal...
    await staffPage.goto("/admin");
    await expect(staffPage).toHaveURL(/\/admin\/login\/?$/);

    // ...and a fresh login is refused with the generic error.
    await signIn(staffPage, inviteEmail, chosenPassword);
    await expect(staffPage).toHaveURL(/\/admin\/login\/?$/);
    await expect(staffPage.locator("#login-error")).toBeVisible();

    await staffContext.close();
  });

  test("VAL-ADMIN-012: help page is substantive plain English", async ({
    page,
  }) => {
    await signInExpectingPortal(page, SEED_EMAIL, SEED_PASSWORD);
    await page.goto("/admin/help");
    await expect(
      page.getByRole("heading", { name: "Help", exact: true }),
    ).toBeVisible();

    const text = (await page.locator("main").innerText()).trim();
    const words = text.split(/\s+/).filter(Boolean);
    expect(words.length).toBeGreaterThanOrEqual(400);

    for (const heading of [
      "Triaging appointment requests and statuses",
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
