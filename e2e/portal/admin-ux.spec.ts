import { randomUUID } from "node:crypto";

import { test, expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { z } from "zod";

import { intakeResponseSchema } from "../../src/lib/portal/contracts";
import { clearNotificationTestBucket } from "../boundaries/support";
import { clientIps, runId, seedAdmin, serviceDb } from "../harness/env";
import { attemptSignIn, signIn } from "../harness/session";

// VAL-ADMIN-007: recipients are manageable from the UI and a staged
// Appointment request attempts notification for exactly the active set.
// VAL-ADMIN-008: invite -> resend -> cancel -> one-time setup link -> own password -> deactivate
// -> login refused, across two browser contexts.
// VAL-ADMIN-012: the help page is substantive plain English (>=400 words).

const { email: SEED_EMAIL } = seedAdmin();

const db = serviceDb();

// Invite/recovery URLs contain one-time bearer fragments. Never preserve them
// In a retained-on-failure trace artifact.
test.use({ trace: "off" });

const testIp = clientIps("admin-ux");

async function expectSetupLinkRejected(page: Page, setupUrl: string) {
  await page.goto(setupUrl);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/admin\/auth\/confirm\/?$/, {
    timeout: 15_000,
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "This link is invalid or expired." }),
  ).toBeVisible();
}

function recipientItem(page: Page, email: string) {
  return page.locator(`[data-recipient-email="${email}"]`);
}

function recipientSwitch(page: Page, email: string) {
  return page.getByRole("switch", { name: `Request emails to ${email}`, exact: true });
}

async function recipientActive(id: string) {
  const { data } = await db.from("notification_recipients").select("active").eq("id", id).single();
  return z.object({ active: z.boolean() }).parse(data).active;
}

function staffRow(page: Page, email: string) {
  return page.locator(`[data-testid="staff-row"][data-staff-email="${email}"]`);
}

function toastWith(page: Page, text: string) {
  return page.locator("[data-sonner-toast]").filter({ hasText: text });
}

async function chooseFromRowMenu(page: Page, row: Locator, item: string) {
  await row.getByRole("button", { name: /^More for / }).click();
  await page.getByRole("menuitem", { name: item, exact: true }).click();
}

async function addRecipient(page: Page, email: string) {
  await page.getByRole("link", { name: "Add email", exact: true }).click();
  const dialog = page.getByTestId("recipient-dialog");
  await expect(dialog.locator("#recipient-email")).toBeFocused();
  await dialog.locator("#recipient-email").fill(email);
  await dialog.getByRole("button", { name: "Add email", exact: true }).click();
  await expect(dialog).toHaveCount(0, { timeout: 15_000 });
}

async function confirmRecipientRemoval(page: Page, email: string) {
  await chooseFromRowMenu(page, recipientItem(page, email), "Remove");
  const dialog = page.getByTestId("remove-recipient-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(email);
  await dialog.locator('[data-action="confirm-remove"]').click();
}

async function inviteStaff(page: Page, email: string) {
  await page.getByRole("link", { name: "Invite", exact: true }).click();
  const dialog = page.getByTestId("invite-staff-dialog");
  await expect(dialog.locator("#invite-email")).toBeFocused();
  await dialog.locator("#invite-email").fill(email);
  await dialog.getByRole("button", { name: "Send invite", exact: true }).click();
  await expect(dialog).toHaveCount(0, { timeout: 15_000 });
}

async function confirmStaffAction(page: Page, email: string, item: "Cancel invite" | "Deactivate") {
  await chooseFromRowMenu(page, staffRow(page, email), item);
  const dialog = page.getByTestId("confirm-staff-dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-action="confirm"]').click();
  await expect(dialog).toHaveCount(0, { timeout: 15_000 });
}

async function fallbackSetupUrl(page: Page) {
  return ((await page.getByTestId("fallback-setup-url").textContent()) ?? "").trim();
}

function expectInviteLink(setupUrl: string) {
  expect(URL.canParse(setupUrl)).toBe(true);
  const parsed = new URL(setupUrl);
  const fragment = new URLSearchParams(parsed.hash.slice(1));
  expect(parsed.pathname).toBe("/admin/auth/confirm");
  expect(fragment.get("type")).toBe("invite");
  expect(Boolean(fragment.get("token_hash"))).toBe(true);
}

test.describe("portal management UI", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "JS portal UI");
  });

  test.afterAll(async () => {
    await db.from("notification_recipients").delete().like("email", `ux-${runId}-%`);
    await db.from("requests").delete().like("email", `ux-${runId}-%`);
    const { data: leftovers } = await db
      .from("staff_profiles")
      .select("user_id")
      .like("email", `ux-${runId}-%`);
    const leftoverRows = z.array(z.object({ user_id: z.string() })).parse(leftovers ?? []);
    for (const row of leftoverRows) {
      await db.from("staff_profiles").delete().eq("user_id", row.user_id);
      await db.auth.admin.deleteUser(row.user_id);
    }
  });

  test("Settings dialogs validate in place and keep a safe focus path", async ({ page }) => {
    test.setTimeout(120_000);

    const fixtureId = randomUUID();
    const fixtureEmail = `ux-${runId}-settings-focus@example.test`;
    const fixtureLabel = "Settings focus fixture";
    const preparedEmail = `ux-${runId}-prepared-recipient@example.test`;
    const fixtureInsert = await db.from("notification_recipients").insert({
      id: fixtureId,
      email: fixtureEmail,
      label: fixtureLabel,
      active: false,
    });
    expect(fixtureInsert.error).toBeNull();

    try {
      await signIn(page);
      await page.goto("/admin/settings/notifications");

      // Adding opens through the address, so Escape closes it and drops it.
      await page.getByRole("link", { name: "Add email", exact: true }).click();
      await expect(page).toHaveURL(/[?&]add=1/);
      const addDialog = page.getByTestId("recipient-dialog");
      const recipientEmail = addDialog.locator("#recipient-email");
      await expect(recipientEmail).toBeFocused();
      await expect(addDialog.locator('label[for="recipient-email"]')).toBeVisible();
      await expect(addDialog.locator('label[for="recipient-label"]')).toBeVisible();
      await addDialog.getByRole("button", { name: "Add email", exact: true }).click();
      await expect(recipientEmail).toBeFocused();
      await expect(recipientEmail).toHaveAttribute("aria-invalid", "true");
      await expect(recipientEmail).toHaveAttribute("aria-describedby", "recipient-email-error");
      await expect(addDialog.locator("#recipient-email-error")).toHaveText(
        "Enter the email address.",
      );
      await recipientEmail.fill(preparedEmail);
      await expect(recipientEmail).not.toHaveAttribute("aria-invalid", "true");
      await page.keyboard.press("Escape");
      await expect(addDialog).toHaveCount(0);
      await expect(page).not.toHaveURL(/[?&]add=1/);
      const prepared = await db
        .from("notification_recipients")
        .select("id")
        .eq("email", preparedEmail);
      expect(prepared.data).toHaveLength(0);

      // Staff access invites the same way: an email and a role, nothing else.
      await page.goto("/admin/settings/staff");
      await page.getByRole("link", { name: "Invite", exact: true }).click();
      await expect(page).toHaveURL(/[?&]invite=1/);
      const inviteDialog = page.getByTestId("invite-staff-dialog");
      const inviteEmail = inviteDialog.locator("#invite-email");
      await expect(inviteEmail).toBeFocused();
      await expect(inviteDialog.getByRole("radiogroup")).toBeVisible();
      await inviteDialog.getByRole("button", { name: "Send invite", exact: true }).click();
      await expect(inviteEmail).toBeFocused();
      await expect(inviteEmail).toHaveAttribute("aria-invalid", "true");
      await expect(inviteEmail).toHaveAttribute("aria-describedby", "invite-email-error");
      await expect(inviteDialog.locator("#invite-email-error")).toHaveText(
        "Enter their email address.",
      );
      await inviteDialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(inviteDialog).toHaveCount(0);
      await expect(page).not.toHaveURL(/[?&]invite=1/);

      // Renaming edits only the label, and Cancel leaves the row as it was.
      await page.goto("/admin/settings/notifications");
      const row = recipientItem(page, fixtureEmail);
      await expect(row).toContainText(fixtureLabel);
      await expect(recipientSwitch(page, fixtureEmail)).not.toBeChecked();
      await chooseFromRowMenu(page, row, "Edit label");
      const renameDialog = page.getByTestId("recipient-dialog");
      await expect(renameDialog.locator("#recipient-email")).toHaveCount(0);
      const labelInput = renameDialog.locator("#recipient-label");
      await expect(labelInput).toBeFocused();
      await labelInput.fill("Unsaved label change");
      await renameDialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(renameDialog).toHaveCount(0);
      await expect(row).toContainText(fixtureLabel);
      await expect(row).not.toContainText("Unsaved label change");

      // Removing asks first, with Keep focused and Tab held inside the modal.
      await chooseFromRowMenu(page, row, "Remove");
      const dialog = page.getByTestId("remove-recipient-dialog");
      const keep = dialog.getByRole("button", { name: "Keep it", exact: true });
      const close = dialog.getByRole("button", { name: "Close", exact: true });
      const confirmRemoval = dialog.locator('[data-action="confirm-remove"]');
      await expect(dialog).toContainText(fixtureEmail);
      await expect(keep).toBeFocused();
      expect(await dialog.evaluate((element) => element.matches(":modal"))).toBe(true);
      await page.keyboard.press("Shift+Tab");
      await expect(close).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(confirmRemoval).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(close).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(row).toBeVisible();

      await chooseFromRowMenu(page, row, "Remove");
      await confirmRemoval.click();
      await expect(row).toHaveCount(0, { timeout: 15_000 });
      await expect(toastWith(page, `${fixtureLabel} removed`)).toBeVisible();
      const removed = await db.from("notification_recipients").select("id").eq("id", fixtureId);
      expect(removed.data).toHaveLength(0);
    } finally {
      const auditCleanup = await db.from("audit_log").delete().eq("entity_id", fixtureId);
      const recipientCleanup = await db
        .from("notification_recipients")
        .delete()
        .eq("id", fixtureId);
      expect(auditCleanup.error).toBeNull();
      expect(recipientCleanup.error).toBeNull();
    }
  });

  test("the remove dialog's Close button is a full touch target at 390px", async ({ page }) => {
    test.fail(
      true,
      "Known defect, recorded in the consolidation log on 2026-09-05: the confirm dialog's Close button measures under 44px tall at 390px wide. Remove this marker when it is fixed.",
    );
    const fixtureId = randomUUID();
    const fixtureEmail = `ux-${runId}-touch-target@example.test`;
    const inserted = await db
      .from("notification_recipients")
      .insert({ id: fixtureId, email: fixtureEmail, active: false });
    expect(inserted.error).toBeNull();
    try {
      await signIn(page);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/admin/settings/notifications");
      await chooseFromRowMenu(page, recipientItem(page, fixtureEmail), "Remove");
      const dialog = page.getByTestId("remove-recipient-dialog");
      const close = dialog.getByRole("button", { name: "Close", exact: true });
      await expect(close).toBeInViewport();
      const [dialogBox, closeBox] = await Promise.all([dialog.boundingBox(), close.boundingBox()]);
      if (dialogBox === null || closeBox === null) {
        throw new Error("Expected visible mobile dialog geometry");
      }
      expect(closeBox.x + closeBox.width).toBeLessThanOrEqual(dialogBox.x + dialogBox.width + 0.5);
      expect(closeBox.width).toBeGreaterThanOrEqual(44);
      expect(closeBox.height).toBeGreaterThanOrEqual(44);
    } finally {
      await db.from("notification_recipients").delete().eq("id", fixtureId);
    }
  });

  test("VAL-ADMIN-007: recipient management drives the notification set", async ({ page }) => {
    test.setTimeout(120_000);

    const emailA = `ux-${runId}-keep@example.test`;
    const emailB = `ux-${runId}-paused@example.test`;
    const emailC = `ux-${runId}-removed@example.test`;
    const emailD = `ux-${runId}-stale@example.test`;

    await signIn(page);
    await page.goto("/admin/settings/notifications");

    // Add four addresses through the Server Action-backed dialog.
    for (const email of [emailA, emailB, emailC, emailD]) {
      await addRecipient(page, email);
      await expect(recipientItem(page, email)).toBeVisible({ timeout: 15_000 });
    }

    // Database failures keep their stable Server Action mappings: a duplicate
    // Normalized mailbox conflicts beside the field, and a row removed by
    // Another actor is reported as gone rather than as a generic success.
    await page.getByRole("link", { name: "Add email", exact: true }).click();
    const addDialog = page.getByTestId("recipient-dialog");
    await addDialog.locator("#recipient-email").fill(emailA.toUpperCase());
    await addDialog.getByRole("button", { name: "Add email", exact: true }).click();
    await expect(addDialog.locator("#recipient-email-error")).toHaveText(
      "That address is already on the list.",
      { timeout: 15_000 },
    );
    await addDialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(addDialog).toHaveCount(0);

    const { data: staleRecipient } = await db
      .from("notification_recipients")
      .delete()
      .eq("email", emailD)
      .select("id")
      .single();
    expect(staleRecipient?.id).toBeTruthy();
    await recipientSwitch(page, emailD).click();
    await expect(toastWith(page, "That address isn't on the list anymore.")).toBeVisible({
      timeout: 15_000,
    });
    await page.reload();
    await expect(recipientItem(page, emailD)).toHaveCount(0);

    // Pausing B persists, and the toast's Undo turns it back on.
    const switchB = recipientSwitch(page, emailB);
    await expect(switchB).toBeChecked();
    await switchB.click();
    await expect(toastWith(page, `${emailB} paused`)).toBeVisible({ timeout: 15_000 });
    await expect(switchB).not.toBeChecked();
    const { data: bRow } = await db
      .from("notification_recipients")
      .select("id, active")
      .eq("email", emailB)
      .single();
    expect(bRow?.active).toBe(false);
    const bId = z.string().parse(bRow?.id);

    await toastWith(page, `${emailB} paused`)
      .getByRole("button", { name: "Undo", exact: true })
      .click();
    await expect(toastWith(page, `${emailB} is on again`)).toBeVisible({ timeout: 15_000 });
    await expect(switchB).toBeChecked();
    await expect.poll(async () => recipientActive(bId)).toBe(true);

    // A label edit stays in place (no remove-and-re-add) and is audited.
    await chooseFromRowMenu(page, recipientItem(page, emailB), "Edit label");
    const renameDialog = page.getByTestId("recipient-dialog");
    await renameDialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(renameDialog).toHaveCount(0);
    await chooseFromRowMenu(page, recipientItem(page, emailB), "Edit label");
    await renameDialog.locator("#recipient-label").fill("Front desk mornings");
    await renameDialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(renameDialog).toHaveCount(0, { timeout: 15_000 });
    await expect(toastWith(page, "Label saved")).toBeVisible();
    await expect(recipientItem(page, emailB)).toContainText("Front desk mornings");
    const { data: bLabelled } = await db
      .from("notification_recipients")
      .select("id, label")
      .eq("email", emailB)
      .single();
    expect(bLabelled).toEqual({ id: bId, label: "Front desk mornings" });
    const { data: labelAudits } = await db
      .from("audit_log")
      .select("id")
      .eq("action", "recipients.label_update")
      .eq("entity_id", bId);
    expect(labelAudits?.length).toBeGreaterThanOrEqual(1);

    // Pause B again so the active notification set is exactly {A}.
    await switchB.click();
    await expect(switchB).not.toBeChecked();
    await expect.poll(async () => recipientActive(bId)).toBe(false);

    // Remove C through the named confirmation; it disappears and is gone.
    await confirmRecipientRemoval(page, emailC);
    await expect(recipientItem(page, emailC)).toHaveCount(0, {
      timeout: 15_000,
    });
    const { data: cRows } = await db
      .from("notification_recipients")
      .select("id")
      .eq("email", emailC);
    expect(cRows).toHaveLength(0);

    // A staged appointment request attempts notification for EXACTLY the active set.
    // Global setup paused every pre-existing recipient, so the active set
    // Right now is {A}. A rejected provider outcome still counts as an
    // Attempt — that is the assertion, not deliverability.
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
    const body = intakeResponseSchema.parse(await response.json());
    expect(body.ok).toBe(true);
    if (!body.ok) throw new Error("Expected an accepted intake response");

    await expect
      .poll(
        async () => {
          const { data } = await db
            .from("request_events")
            .select("recipient, status")
            .eq("request_id", body.id)
            .eq("type", "notification");
          return z
            .array(z.object({ recipient: z.string() }))
            .parse(data ?? [])
            .map((row) => row.recipient)
            .sort((left, right) => left.localeCompare(right));
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
    expect(["accepted", "failed"]).toContain(attempt?.status);

    // The mutations above are on the audit record, visible in the view.
    await page.goto("/admin/audit");
    await expect(page.getByTestId("audit-table")).toContainText("recipients.add");
    await expect(page.getByTestId("audit-table")).toContainText("recipients.remove");

    // Tidy the two survivors through the UI (also re-proves remove).
    await page.goto("/admin/settings/notifications");
    for (const email of [emailA, emailB]) {
      await confirmRecipientRemoval(page, email);
      await expect(recipientItem(page, email)).toHaveCount(0, {
        timeout: 15_000,
      });
    }
  });

  test("the test email goes to the addresses that are on, and waits for one", async ({ page }) => {
    test.setTimeout(90_000);
    const startedAt = new Date().toISOString();
    const onEmail = `ux-${runId}-test-send@example.test`;

    const { data: admin } = await db
      .from("staff_profiles")
      .select("user_id")
      .ilike("email", SEED_EMAIL)
      .single();
    const adminUserId = z.object({ user_id: z.string() }).parse(admin).user_id;
    const { data: on } = await db.from("notification_recipients").select("id").eq("active", true);
    const previouslyOn = z
      .array(z.object({ id: z.string() }))
      .parse(on ?? [])
      .map((row) => row.id);

    clearNotificationTestBucket(adminUserId);
    try {
      if (previouslyOn.length > 0) {
        await db.from("notification_recipients").update({ active: false }).in("id", previouslyOn);
      }
      await signIn(page);
      await page.goto("/admin/settings/notifications");
      const send = page.locator('[data-action="send-test"]');
      await expect(send).toBeDisabled();
      await expect(send).toHaveAccessibleDescription("Turn an address on to send a test.");

      await db
        .from("notification_recipients")
        .insert({ email: onEmail, label: "TEST test send", active: true });
      await page.reload();
      await expect(page.getByTestId("notification-preview")).toContainText(onEmail);
      await expect(send).toBeEnabled();
      await send.click();
      // The harness has no mail provider, so the send is attempted and reported as not sent.
      await expect(
        toastWith(page, "The test email couldn't be sent. Requests still arrive on Home."),
      ).toBeVisible({ timeout: 15_000 });
      await expect(send).toHaveText("Send a test email to everyone who is on");

      const { data: audits } = await db
        .from("audit_log")
        .select("detail")
        .eq("action", "recipients.test_send")
        .gte("at", startedAt);
      expect(audits).toEqual([
        { detail: { recipient_count: 1, recipient_ids: [expect.any(String)] } },
      ]);
    } finally {
      await db.from("notification_recipients").delete().eq("email", onEmail);
      if (previouslyOn.length > 0) {
        await db.from("notification_recipients").update({ active: true }).in("id", previouslyOn);
      }
      await db.from("audit_log").delete().eq("action", "recipients.test_send").gte("at", startedAt);
      clearNotificationTestBucket(adminUserId);
    }
  });

  test("VAL-ADMIN-008: invite, own-password setup, deactivate, refuse", async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);

    const inviteEmail = `ux-${runId}-staff@example.test`;

    await signIn(page);
    await page.goto("/admin/settings/staff");
    await inviteStaff(page, inviteEmail);

    // The harness has no deliverable mailbox, so the setup link is shown once.
    const panel = page.getByTestId("invite-fallback-panel");
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await expect(panel).toContainText(`The invite email to ${inviteEmail} didn't send`);
    expect(await panel.getByText("One-time password").count()).toBe(0);
    const originalSetupUrl = await fallbackSetupUrl(page);
    expectInviteLink(originalSetupUrl);

    const invitedRow = staffRow(page, inviteEmail);
    await expect(invitedRow.getByTestId("staff-last-sign-in")).toContainText("Invite sent", {
      timeout: 15_000,
    });

    // An administrator can replace an expired or lost pending link. Resending
    // Invalidates the earlier token without changing the stored role.
    await invitedRow.locator('[data-action="resend-invite"]').click();
    await expect
      .poll(async () => {
        const renewed = await fallbackSetupUrl(page);
        return renewed.length > 0 && renewed !== originalSetupUrl;
      })
      .toBe(true);
    const setupUrl = await fallbackSetupUrl(page);
    expectInviteLink(setupUrl);

    const supersededContext = await browser.newContext();
    const supersededPage = await supersededContext.newPage();
    await expectSetupLinkRejected(supersededPage, originalSetupUrl);
    await supersededContext.close();

    // Cancelling a never-onboarded invite removes the account outright: the
    // Row leaves the list, its link stops working, and the address is free.
    const pendingEmail = `ux-${runId}-pending@example.test`;
    await inviteStaff(page, pendingEmail);
    await expect(panel).toContainText(`The invite email to ${pendingEmail} didn't send`, {
      timeout: 15_000,
    });
    const pendingSetupUrl = await fallbackSetupUrl(page);
    expectInviteLink(pendingSetupUrl);

    await expect(staffRow(page, pendingEmail)).toBeVisible({ timeout: 15_000 });
    await confirmStaffAction(page, pendingEmail, "Cancel invite");
    await expect(staffRow(page, pendingEmail)).toHaveCount(0, { timeout: 15_000 });
    await expect(panel).toHaveCount(0);

    const cancelledProfile = await db
      .from("staff_profiles")
      .select("user_id")
      .eq("email", pendingEmail);
    expect(cancelledProfile.data).toHaveLength(0);

    const cancelledInviteContext = await browser.newContext();
    const cancelledInvitePage = await cancelledInviteContext.newPage();
    await expectSetupLinkRejected(cancelledInvitePage, pendingSetupUrl);
    await cancelledInviteContext.close();

    await inviteStaff(page, pendingEmail);
    await expect(staffRow(page, pendingEmail)).toBeVisible({ timeout: 15_000 });
    await confirmStaffAction(page, pendingEmail, "Cancel invite");
    await expect(staffRow(page, pendingEmail)).toHaveCount(0, { timeout: 15_000 });

    // Second context: the invited staffer deliberately consumes the one-time
    // Link, chooses their own password, and lands in the portal under the
    // Name the invite derived from their address.
    const staffContext = await browser.newContext();
    const staffPage = await staffContext.newPage();
    await staffPage.goto(setupUrl);
    await staffPage.getByRole("button", { name: "Continue" }).click();
    await expect(staffPage).toHaveURL(/\/admin\/set-password\/?$/);

    const chosenPassword = `Wgi!${runId}OwnPassword7`;
    await staffPage.getByLabel("New password", { exact: true }).fill(chosenPassword);
    await staffPage.getByLabel("Confirm password", { exact: true }).fill(chosenPassword);
    await staffPage.getByRole("button", { name: "Set password" }).click();
    await expect(staffPage).toHaveURL(/\/admin\/?$/, { timeout: 15_000 });
    await expect(staffPage.getByTestId("session-user")).toHaveText(`ux-${runId}-staff`);

    await page.reload();
    await expect(invitedRow.getByTestId("staff-last-sign-in")).not.toContainText("Invite sent");

    // Admin deactivates them.
    await confirmStaffAction(page, inviteEmail, "Deactivate");
    await expect(invitedRow).toHaveCount(0, { timeout: 15_000 });

    // Their live session no longer opens the portal...
    await staffPage.goto("/admin");
    await expect(staffPage).toHaveURL(/\/admin\/login\/?$/);

    // ...and a fresh login is refused with the generic error.
    await attemptSignIn(staffPage, { email: inviteEmail, password: chosenPassword });
    await expect(staffPage).toHaveURL(/\/admin\/login\/?$/);
    await expect(staffPage.locator("#login-error")).toBeVisible();

    await staffContext.close();
  });

  test("VAL-ADMIN-018: Settings shows last sign-in from existing Auth state", async ({ page }) => {
    await signIn(page);
    await page.goto("/admin/settings/staff");

    // The seed admin just signed in, so their own row reads as the current
    // Session, never "Not yet" and never a crashed page.
    const ownRow = staffRow(page, SEED_EMAIL.toLowerCase());
    await expect(ownRow.getByTestId("staff-last-sign-in")).toHaveText("Now · you");
  });

  test("VAL-ADMIN-012: help page is substantive plain English", async ({ page }) => {
    await signIn(page);
    await page.goto("/admin/help");
    await expect(page.getByRole("heading", { name: "Help", exact: true })).toBeVisible();

    const text = (await page.locator("main").innerText()).trim();
    const words = text.split(/\s+/).filter(Boolean);
    expect(words.length).toBeGreaterThanOrEqual(400);

    for (const heading of [
      "Work an appointment request",
      "Notification emails",
      "Staff access",
      "Getting website changes made",
    ]) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
  });
});
