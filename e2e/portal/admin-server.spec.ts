import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";
import { z } from "zod";

import { asJsonString, jsonObjectSchema } from "../../src/lib/json";
import type { JsonObject } from "../../src/lib/json";
import type { PasswordAuthFlow } from "../../src/lib/portal/contracts";
import { expectDenied, requireDecoded } from "../harness/assert";
import { publishableDb, runId, seedAdmin, serviceDb } from "../harness/env";
import { signIn } from "../harness/session";

const inviteDetailSchema = z.looseObject({
  resend: z.boolean().optional(),
  link_type: z.string().optional(),
});
const idRowSchema = z.object({ id: z.string() });
const cleanupProfileSchema = z.object({
  id: z.string(),
  user_id: z.string().nullable(),
});
const staffProfileRowSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  email: z.string(),
  role: z.string(),
  active: z.boolean(),
  onboarded_at: z.string().nullable(),
});
const recipientRowSchema = z.object({
  id: z.string(),
  active: z.boolean(),
});
const auditRowSchema = z.object({
  actor_email: z.string(),
  action: z.string(),
  entity: z.string(),
  entity_id: z.string(),
  source: z.string(),
  correlation_id: z.string(),
  at: z.string(),
  detail: z.unknown().optional(),
});

const { email: SEED_ADMIN_EMAIL } = seedAdmin();
const GENERIC_LOGIN_ERROR = "Unable to sign in. Check your credentials and try again.";
const CSV_HEADER = [
  "id",
  "created_at",
  "status",
  "name",
  "phone",
  "email",
  "location",
  "preferred_time",
  "locale",
  "source_path",
  "message",
] as const;

const db = serviceDb();
const staffEmail = `portal-staff-${runId}@example.test`;
const targetEmail = `portal-target-${runId}@example.test`;
const recipientEmail = `portal-recipient-${runId}@example.test`;
const deniedRecipientEmail = `portal-denied-${runId}@example.test`;

let adminContext: BrowserContext | null = null;
let staffContext: BrowserContext | null = null;
let adminPage: Page | null = null;
let staffPage: Page | null = null;
let staffUserId: string | null = null;
let targetUserId: string | null = null;
let staffProfileId: string | null = null;
let targetProfileId: string | null = null;
let recipientId: string | null = null;
const requestIds = new Set<string>();
const auditEntityIds = new Set<string>();

interface MutationResponse {
  status: number;
  body: JsonObject;
}

interface CsvFetch {
  status: number;
  contentType: string;
  contentDisposition: string;
  text: string;
}

async function mutate(page: Page, operation: string, input: JsonObject): Promise<MutationResponse> {
  const raw = await page.evaluate(async (body) => {
    const response = await fetch("/admin/settings/mutations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return { status: response.status, bodyText: await response.text() };
  }, JSON.stringify({ operation, input }));
  return {
    status: raw.status,
    body: requireDecoded(
      jsonObjectSchema.safeParse(JSON.parse(raw.bodyText)),
      "Settings mutation response was not a JSON object",
    ),
  };
}

function fallbackSetupUrl(
  response: Readonly<MutationResponse>,
  expectedStatus = 201,
  expectedType: PasswordAuthFlow = "invite",
): string {
  expect(response.status).toBe(expectedStatus);
  expect(response.body.ok).toBe(true);
  expect(response.body.delivery).toBe("failed");
  expect(Object.prototype.hasOwnProperty.call(response.body, "tempPassword")).toBe(false);
  const setupUrl = response.body.fallbackSetupUrl;
  expect(z.string().safeParse(setupUrl).success).toBe(true);
  const setupUrlString = asJsonString(setupUrl);
  if (setupUrlString === null) {
    throw new Error("expected fallbackSetupUrl string");
  }
  expect(URL.canParse(setupUrlString)).toBe(true);
  const parsed = new URL(setupUrlString);
  const fragment = new URLSearchParams(parsed.hash.slice(1));
  expect(parsed.pathname).toBe("/admin/auth/confirm");
  expect(fragment.get("type")).toBe(expectedType);
  expect(Boolean(fragment.get("token_hash"))).toBe(true);
  return setupUrlString;
}

function parseCsv(document: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < document.length; index += 1) {
    const char = document[index];

    if (quoted) {
      if (char === `"` && document[index + 1] === `"`) {
        field += `"`;
        index += 1;
      } else if (char === `"`) {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === `"`) {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r" || char === "\n") {
      if (char === "\r" && document[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function fetchCsv(page: Page, status: string, search = ""): Promise<CsvFetch> {
  return page.evaluate(
    async ({ selectedStatus, selectedSearch }) => {
      const params = new URLSearchParams({ status: selectedStatus });
      if (selectedSearch !== "") params.set("q", selectedSearch);
      const response = await fetch(`/admin/requests/export?${params.toString()}`);
      return {
        status: response.status,
        contentType: response.headers.get("content-type") ?? "",
        contentDisposition: response.headers.get("content-disposition") ?? "",
        text: await response.text(),
      };
    },
    { selectedStatus: status, selectedSearch: search },
  );
}

async function sqlCount(status: string): Promise<number> {
  const { count, error } = await db
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("status", status);
  expect(error).toBeNull();
  return count ?? 0;
}

test.use({ trace: "off" });

test.describe("portal management server boundaries", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Credential and role checks run once.");
  });

  test.afterAll(async () => {
    await Promise.allSettled([
      adminContext?.close() ?? Promise.resolve(),
      staffContext?.close() ?? Promise.resolve(),
    ]);

    const [profiles, recipients] = await Promise.all([
      db.from("staff_profiles").select("id, user_id").in("email", [staffEmail, targetEmail]),
      db
        .from("notification_recipients")
        .select("id")
        .in("email", [recipientEmail, deniedRecipientEmail]),
    ]);

    const cleanupProfiles = requireDecoded(
      z.array(cleanupProfileSchema).safeParse(profiles.data ?? []),
      "Cleanup staff profiles could not be decoded",
    );
    for (const profile of cleanupProfiles) {
      auditEntityIds.add(profile.id);
      if (profile.user_id !== null && profile.user_id !== "") {
        if (staffUserId === null || staffUserId === "") {
          staffUserId = profile.user_id;
        } else if (profile.user_id !== staffUserId) {
          targetUserId = profile.user_id;
        }
      }
    }
    const cleanupRecipients = requireDecoded(
      z.array(idRowSchema).safeParse(recipients.data ?? []),
      "Cleanup recipients could not be decoded",
    );
    for (const recipient of cleanupRecipients) {
      auditEntityIds.add(recipient.id);
    }

    await db
      .from("notification_recipients")
      .update({ active: false })
      .in("email", [recipientEmail, deniedRecipientEmail]);
    await db
      .from("notification_recipients")
      .delete()
      .in("email", [recipientEmail, deniedRecipientEmail]);
    await db.from("requests").delete().like("email", `portal-export-${runId}-%`);
    await db
      .from("audit_log")
      .delete()
      .eq("action", "requests.export")
      .eq("actor_email", staffEmail);

    if (auditEntityIds.size > 0) {
      await db
        .from("audit_log")
        .delete()
        .in("entity_id", [...auditEntityIds]);
    }

    await db.from("staff_profiles").delete().in("email", [staffEmail, targetEmail]);
    for (const userId of new Set(
      [staffUserId, targetUserId].filter((value): value is string => value !== null),
    )) {
      await db.auth.admin.deleteUser(userId);
    }
  });

  test("VAL-ADMIN-009: staff is rejected from admin-only mutations at the network boundary", async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    adminContext = await browser.newContext();
    adminPage = await adminContext.newPage();
    await signIn(adminPage);

    const staffInvite = await mutate(adminPage, "staff.invite", {
      email: staffEmail,
      displayName: `TEST Portal Staff ${runId}`,
      role: "staff",
    });
    const staffSetupUrl = fallbackSetupUrl(staffInvite);

    const targetInvite = await mutate(adminPage, "staff.invite", {
      email: targetEmail,
      displayName: `TEST Portal Target ${runId}`,
      role: "staff",
    });
    const targetSetupUrl = fallbackSetupUrl(targetInvite);
    expect(targetSetupUrl !== staffSetupUrl).toBe(true);

    const { data: profiles, error: profileError } = await db
      .from("staff_profiles")
      .select("id, user_id, email, role, active, onboarded_at")
      .in("email", [staffEmail, targetEmail]);
    expect(profileError).toBeNull();
    const profileRows = requireDecoded(
      z.array(staffProfileRowSchema).safeParse(profiles ?? []),
      "Throwaway staff profiles could not be decoded",
    );
    expect(profileRows).toHaveLength(2);

    const staffProfile = profileRows.find((profile) => profile.email === staffEmail);
    const targetProfile = profileRows.find((profile) => profile.email === targetEmail);
    if (staffProfile === undefined || targetProfile === undefined) {
      throw new Error("Throwaway staff profiles were not created");
    }

    staffUserId = staffProfile.user_id;
    targetUserId = targetProfile.user_id;
    staffProfileId = staffProfile.id;
    targetProfileId = targetProfile.id;
    auditEntityIds.add(staffProfile.id);
    auditEntityIds.add(targetProfile.id);
    expect(staffProfile.onboarded_at).toBeNull();
    expect(targetProfile.onboarded_at).toBeNull();

    const renewedTargetInvite = await mutate(adminPage, "staff.invite.resend", {
      id: targetProfile.user_id,
    });
    const renewedTargetSetupUrl = fallbackSetupUrl(renewedTargetInvite, 200);
    expect(renewedTargetSetupUrl !== targetSetupUrl).toBe(true);
    const { data: stillPendingTarget, error: pendingTargetError } = await db
      .from("staff_profiles")
      .select("role, onboarded_at")
      .eq("user_id", targetProfile.user_id)
      .single();
    expect(pendingTargetError).toBeNull();
    expect(stillPendingTarget?.role).toBe("staff");
    expect(stillPendingTarget?.onboarded_at).toBeNull();

    // Simulate an invite link that verified the address but was abandoned
    // Before password setup. Reissuing must use recovery while preserving the
    // Pending profile and its assigned role.
    const confirmedTarget = await db.auth.admin.updateUserById(targetProfile.user_id, {
      email_confirm: true,
    });
    expect(confirmedTarget.error).toBeNull();
    const recoveredTargetInvite = await mutate(adminPage, "staff.invite.resend", {
      id: targetProfile.user_id,
    });
    const recoverySetupUrl = fallbackSetupUrl(recoveredTargetInvite, 200, "recovery");
    expect(recoverySetupUrl !== renewedTargetSetupUrl).toBe(true);
    const { data: recoveryPendingTarget, error: recoveryPendingError } = await db
      .from("staff_profiles")
      .select("role, onboarded_at")
      .eq("user_id", targetProfile.user_id)
      .single();
    expect(recoveryPendingError).toBeNull();
    expect(recoveryPendingTarget?.role).toBe("staff");
    expect(recoveryPendingTarget?.onboarded_at).toBeNull();

    // This suite exercises network roles rather than the setup UI. Give both
    // Throwaway accounts known passwords and mark them onboarded directly;
    // VAL-ADMIN-008 covers the one-time browser setup flow.
    const staffPassword = `Wgi!${runId}Staff7`;
    const targetPassword = `Wgi!${runId}Target7`;
    const onboardedAt = new Date().toISOString();
    const [staffAuthUpdate, targetAuthUpdate, staffProfileUpdate, targetProfileUpdate] =
      await Promise.all([
        db.auth.admin.updateUserById(staffProfile.user_id, {
          password: staffPassword,
          email_confirm: true,
        }),
        db.auth.admin.updateUserById(targetProfile.user_id, {
          password: targetPassword,
          email_confirm: true,
        }),
        db
          .from("staff_profiles")
          .update({ onboarded_at: onboardedAt })
          .eq("user_id", staffProfile.user_id),
        db
          .from("staff_profiles")
          .update({ onboarded_at: onboardedAt })
          .eq("user_id", targetProfile.user_id),
      ]);
    expect(staffAuthUpdate.error).toBeNull();
    expect(targetAuthUpdate.error).toBeNull();
    expect(staffProfileUpdate.error).toBeNull();
    expect(targetProfileUpdate.error).toBeNull();

    const { data: targetAuth, error: targetAuthError } = await db.auth.admin.getUserById(
      targetProfile.user_id,
    );
    expect(targetAuthError).toBeNull();
    expect(targetAuth.user?.app_metadata.role).toBe("staff");

    staffContext = await browser.newContext();
    staffPage = await staffContext.newPage();
    await signIn(staffPage, { email: staffEmail, password: staffPassword });

    const deniedAdd = await mutate(staffPage, "recipient.add", {
      email: deniedRecipientEmail,
      label: "TEST denied recipient",
      active: false,
    });
    expect(deniedAdd.status).toBe(403);

    const deniedRole = await mutate(staffPage, "staff.role", {
      userId: targetProfile.user_id,
      role: "admin",
    });
    expect(deniedRole.status).toBe(403);

    const deniedDeactivate = await mutate(staffPage, "staff.deactivate", {
      id: targetProfile.user_id,
    });
    expect(deniedDeactivate.status).toBe(403);

    const deniedResend = await mutate(staffPage, "staff.invite.resend", {
      id: targetProfile.user_id,
    });
    expect(deniedResend.status).toBe(403);

    const { count: maintainerAuditsBefore, error: maintainerAuditReadError } = await db
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .like("action", "maintainers.%");
    expect(maintainerAuditReadError).toBeNull();

    for (const [operation, input] of [
      ["maintainer.invite", { username: "denied-maintainer" }],
      ["maintainer.invite.cancel", { invitationId: 1 }],
      ["maintainer.revoke", { userId: 1 }],
    ] as const) {
      const denied = await mutate(staffPage, operation, input);
      expect(denied.status).toBe(403);
    }

    const anonymousContext = await browser.newContext();
    try {
      const anonymousPage = await anonymousContext.newPage();
      await anonymousPage.goto("/en");
      for (const [operation, input] of [
        ["maintainer.invite", { username: "anonymous-maintainer" }],
        ["maintainer.invite.cancel", { invitationId: 1 }],
        ["maintainer.revoke", { userId: 1 }],
      ] as const) {
        const denied = await mutate(anonymousPage, operation, input);
        expect(denied.status).toBe(401);
      }
    } finally {
      await anonymousContext.close();
    }

    const injected = await mutate(adminPage, "maintainer.invite", {
      username: "ASTXRTYS",
      repository: "attacker/selected",
      path: "/repos/attacker/selected",
      method: "DELETE",
      permission: "admin",
    });
    expect(injected.status).toBe(400);
    const ownerRevoke = await mutate(adminPage, "maintainer.revoke", {
      userId: 305283597,
    });
    expect(ownerRevoke.status).toBe(400);

    const { count: maintainerAuditsAfter, error: maintainerAuditAfterError } = await db
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .like("action", "maintainers.%");
    expect(maintainerAuditAfterError).toBeNull();
    expect(maintainerAuditsAfter).toBe(maintainerAuditsBefore);

    const addedRecipient = await mutate(adminPage, "recipient.add", {
      email: recipientEmail,
      label: `TEST recipient ${runId}`,
      active: true,
    });
    expect(addedRecipient.status).toBe(201);
    expect(addedRecipient.body.ok).toBe(true);
    expect(addedRecipient.body.delivery).toBe("failed");

    const duplicateRecipient = await mutate(adminPage, "recipient.add", {
      email: recipientEmail.toUpperCase(),
      label: "TEST duplicate recipient",
      active: true,
    });
    expect(duplicateRecipient.status).toBe(409);
    expect(duplicateRecipient.body).toMatchObject({
      ok: false,
      code: "conflict",
    });

    const missingRecipientId = randomUUID();
    const missingToggle = await mutate(staffPage, "recipient.toggle", {
      recipientId: missingRecipientId,
      active: false,
    });
    expect(missingToggle.status).toBe(404);
    expect(missingToggle.body).toMatchObject({
      ok: false,
      code: "not_found",
    });
    const missingRemove = await mutate(adminPage, "recipient.remove", {
      id: missingRecipientId,
    });
    expect(missingRemove.status).toBe(404);
    expect(missingRemove.body).toMatchObject({
      ok: false,
      code: "not_found",
    });

    const { data: recipient, error: recipientError } = await db
      .from("notification_recipients")
      .select("id, active")
      .eq("email", recipientEmail)
      .single();
    expect(recipientError).toBeNull();
    const recipientRow = requireDecoded(
      recipientRowSchema.safeParse(recipient),
      "Throwaway recipient was not created",
    );
    recipientId = recipientRow.id;
    auditEntityIds.add(recipientRow.id);

    const toggledRecipient = await mutate(staffPage, "recipient.toggle", {
      recipientId: recipientRow.id,
      active: false,
    });
    expect(toggledRecipient.status).toBe(200);
    expect(toggledRecipient.body.ok).toBe(true);

    const deniedRemove = await mutate(staffPage, "recipient.remove", {
      id: recipientRow.id,
    });
    expect(deniedRemove.status).toBe(403);
    const recipientAfterDeniedRemove = await db
      .from("notification_recipients")
      .select("active")
      .eq("id", recipientRow.id)
      .single();
    expect(recipientAfterDeniedRemove.error).toBeNull();
    expect(recipientAfterDeniedRemove.data?.active).toBe(false);

    const staffRest = publishableDb();
    const staffSignIn = await staffRest.auth.signInWithPassword({
      email: staffEmail,
      password: staffPassword,
    });
    expect(staffSignIn.error).toBeNull();

    const profileWrite = await staffRest
      .from("staff_profiles")
      .update({ display_name: `TEST denied change ${runId}` })
      .eq("user_id", targetProfile.user_id)
      .select("id");
    expectDenied(profileWrite);
    await staffRest.auth.signOut({ scope: "local" });

    const promoted = await mutate(adminPage, "staff.role", {
      userId: targetProfile.user_id,
      role: "admin",
    });
    expect(promoted.status).toBe(200);
    expect(promoted.body.ok).toBe(true);

    const [promotedProfile, promotedAuth] = await Promise.all([
      db.from("staff_profiles").select("role").eq("user_id", targetProfile.user_id).single(),
      db.auth.admin.getUserById(targetProfile.user_id),
    ]);
    expect(promotedProfile.error).toBeNull();
    expect(promotedProfile.data?.role).toBe("admin");
    expect(promotedAuth.error).toBeNull();
    expect(promotedAuth.data.user?.app_metadata.role).toBe("admin");

    const restoredRole = await mutate(adminPage, "staff.role", {
      userId: targetProfile.user_id,
      role: "staff",
    });
    expect(restoredRole.status).toBe(200);
    expect(restoredRole.body.ok).toBe(true);

    const deactivated = await mutate(adminPage, "staff.deactivate", {
      id: targetProfile.user_id,
    });
    expect(deactivated.status).toBe(200);
    expect(deactivated.body.ok).toBe(true);

    const [deactivatedProfile, deactivatedAuth] = await Promise.all([
      db.from("staff_profiles").select("active").eq("user_id", targetProfile.user_id).single(),
      db.auth.admin.getUserById(targetProfile.user_id),
    ]);
    expect(deactivatedProfile.error).toBeNull();
    expect(deactivatedProfile.data?.active).toBe(false);
    expect(deactivatedAuth.error).toBeNull();
    expect(deactivatedAuth.data.user?.banned_until).toBeTruthy();

    const lockedContext = await browser.newContext();
    try {
      const lockedPage = await lockedContext.newPage();
      await lockedPage.goto("/admin/login");
      await lockedPage.getByLabel("Email").fill(targetEmail);
      await lockedPage.getByLabel("Password").fill(targetPassword);
      await lockedPage.getByRole("button", { name: "Sign in" }).click();
      await expect(lockedPage).toHaveURL(/\/admin\/login\/?$/);
      await expect(lockedPage.locator("#login-error")).toHaveText(GENERIC_LOGIN_ERROR);
    } finally {
      await lockedContext.close();
    }

    const removedRecipient = await mutate(adminPage, "recipient.remove", {
      id: recipientRow.id,
    });
    expect(removedRecipient.status).toBe(200);
    expect(removedRecipient.body.ok).toBe(true);

    const recipientAfterRemove = await db
      .from("notification_recipients")
      .select("id")
      .eq("id", recipientRow.id)
      .maybeSingle();
    expect(recipientAfterRemove.error).toBeNull();
    expect(recipientAfterRemove.data).toBeNull();
  });

  test("VAL-ADMIN-010: management mutations write actor, action, entity, and time", async () => {
    if (
      staffProfileId === null ||
      staffProfileId === "" ||
      targetProfileId === null ||
      targetProfileId === "" ||
      recipientId === null ||
      recipientId === ""
    ) {
      throw new Error("Role-enforcement setup did not complete");
    }

    const { data: rows, error } = await db
      .from("audit_log")
      .select("actor_email, action, entity, entity_id, source, correlation_id, at, detail")
      .in("entity_id", [staffProfileId, targetProfileId, recipientId]);
    expect(error).toBeNull();
    const auditRows = requireDecoded(
      z.array(auditRowSchema).safeParse(rows ?? []),
      "Management audit rows could not be decoded",
    );

    function assertAudit(action: string, entityId: string, actorEmail: string): void {
      const row = auditRows.find(
        (candidate) =>
          candidate.action === action &&
          candidate.entity_id === entityId &&
          candidate.actor_email.toLowerCase() === actorEmail.toLowerCase(),
      );
      expect(row).toBeTruthy();
      expect(row?.entity).toBe(
        action.startsWith("staff.") ? "staff_profiles" : "notification_recipients",
      );
      expect(Number.isNaN(Date.parse(row?.at ?? ""))).toBe(false);
      expect(row?.source).toBe("staff");
      expect(row?.correlation_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    }

    assertAudit("staff.invite", staffProfileId, SEED_ADMIN_EMAIL);
    assertAudit("staff.invite", targetProfileId, SEED_ADMIN_EMAIL);
    const resendAudits = auditRows.filter((candidate) => {
      if (candidate.action !== "staff.invite" || candidate.entity_id !== targetProfileId) {
        return false;
      }
      const detail = inviteDetailSchema.safeParse(candidate.detail);
      return detail.success && detail.data.resend === true;
    });
    expect(resendAudits).toHaveLength(2);
    const resendLinkTypes = resendAudits
      .map((row) => inviteDetailSchema.safeParse(row.detail).data?.link_type)
      .sort((left, right) => (left ?? "").localeCompare(right ?? ""));
    expect(resendLinkTypes).toEqual(["invite", "recovery"]);
    assertAudit("staff.role", targetProfileId, SEED_ADMIN_EMAIL);
    assertAudit("staff.deactivate", targetProfileId, SEED_ADMIN_EMAIL);
    assertAudit("recipients.add", recipientId, SEED_ADMIN_EMAIL);
    assertAudit("recipients.toggle", recipientId, staffEmail);
    assertAudit("recipients.remove", recipientId, SEED_ADMIN_EMAIL);

    if (!adminPage) throw new Error("Admin session is unavailable");
    const targetLogin = `audit-${runId}`;
    const { data: externalAudit, error: externalAuditError } = await db
      .from("audit_log")
      .insert({
        actor_email: SEED_ADMIN_EMAIL,
        action: "maintainers.invite",
        entity: "repository_maintainers",
        entity_id: null,
        source: "acceptance",
        correlation_id: randomUUID(),
        detail: {
          provider: "github",
          target_login: targetLogin,
          outcome: "pending",
        },
      })
      .select("id")
      .single();
    expect(externalAuditError).toBeNull();
    const externalAuditRow = requireDecoded(
      idRowSchema.safeParse(externalAudit),
      "External audit fixture was not created",
    );
    try {
      await adminPage.goto("/admin/audit");
      const auditRow = adminPage
        .getByTestId("audit-table")
        .getByRole("row")
        .filter({ hasText: targetLogin });
      await expect(auditRow).toContainText(targetLogin);
      await expect(auditRow).toContainText("Outcome unconfirmed");
    } finally {
      await db.from("audit_log").delete().eq("id", externalAuditRow.id);
    }
  });

  test("VAL-ADMIN-011: filtered CSV is parseable, exact, and access-controlled", async ({
    request,
  }) => {
    if (!staffPage) throw new Error("Staff session is unavailable");

    const formulaPrefixes = ["=", "+", "-", "@", "\t", "\r", "\n"];
    const formulaRows = formulaPrefixes.map((prefix, index) => ({
      name: `${prefix}1+1 name`,
      phone: `${prefix}81355502${index.toString().padStart(2, "0")}`,
      email: `${prefix}formula-${runId}-${index}@example.test`,
      location: "tampa",
      preferred_time: "morning",
      message: `${prefix}SUM(1,1)`,
      locale: "en",
      source_path: `${prefix}/e2e/export/${index}`,
      status: "contacted",
    }));
    const stagedRows = [
      {
        name: `TEST Export ${runId} Alpha`,
        phone: "8135550181",
        email: `portal-export-${runId}-alpha@example.test`,
        location: "tampa",
        preferred_time: "morning",
        message: `TEST export, quoted "value"\nsecond line`,
        locale: "en",
        source_path: "/en/appointment",
        status: "contacted",
      },
      {
        name: `TEST Export ${runId} Beta`,
        phone: "8135550182",
        email: `portal-export-${runId}-beta@example.test`,
        location: "lutz",
        preferred_time: "afternoon",
        message: "TEST export plain value",
        locale: "es",
        source_path: "/es/contact",
        status: "contacted",
      },
      {
        name: `TEST Export ${runId} UTF-8 José`,
        phone: "8135550183",
        email: `portal-export-${runId}-utf8@example.test`,
        location: "tampa",
        preferred_time: "afternoon",
        message: `Café, quoted "mañana"\r\n第二行`,
        locale: "es",
        source_path: "/es/appointment",
        status: "contacted",
      },
      ...formulaRows,
    ];
    const { data: inserted, error: insertError } = await db
      .from("requests")
      .insert(stagedRows)
      .select("id");
    expect(insertError).toBeNull();
    const insertedRows = requireDecoded(
      z.array(idRowSchema).safeParse(inserted ?? []),
      "Export fixture rows could not be decoded",
    );
    expect(insertedRows).toHaveLength(stagedRows.length);
    for (const row of insertedRows) requestIds.add(row.id);

    let csv: CsvFetch | null = null;
    let parsed: string[][] = [];
    let expectedCount = -1;

    // Other portal specs can move request statuses in a fully parallel suite.
    // Retry until the SQL count is stable across the export read.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const before = await sqlCount("contacted");
      const candidate = await fetchCsv(staffPage, "contacted");
      const after = await sqlCount("contacted");
      const candidateRows = parseCsv(candidate.text);
      if (before === after && candidate.status === 200 && candidateRows.length - 1 === after) {
        csv = candidate;
        parsed = candidateRows;
        expectedCount = after;
        break;
      }
    }

    expect(csv?.status).toBe(200);
    expect(csv?.contentType).toContain("text/csv");
    expect(csv?.contentType).toContain("charset=utf-8");
    expect(csv?.contentDisposition).toMatch(
      /^attachment; filename="appointment-requests-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(parsed[0]).toEqual([...CSV_HEADER]);
    expect(parsed.length - 1).toBe(expectedCount);
    expect(new Set(parsed.slice(1).map((row) => row[0])).size).toBe(expectedCount);

    for (const insertedRow of insertedRows) {
      expect(parsed.some((row) => row[0] === insertedRow.id)).toBe(true);
    }
    const quotedRow = parsed.find((row) => row[0] === insertedRows[0]?.id);
    expect(quotedRow?.[10]).toBe(stagedRows[0].message);
    const plainRow = parsed.find((row) => row[0] === insertedRows[1]?.id);
    for (const [column, value] of [
      [3, stagedRows[1].name],
      [4, stagedRows[1].phone],
      [5, stagedRows[1].email],
      [6, stagedRows[1].location],
      [7, stagedRows[1].preferred_time],
      [8, stagedRows[1].locale],
      [9, stagedRows[1].source_path],
      [10, stagedRows[1].message],
    ] as const) {
      expect(plainRow?.[column]).toBe(value);
    }
    for (const [index, formulaRow] of formulaRows.entries()) {
      const exported = parsed.find((row) => row[0] === insertedRows[index + 3]?.id);
      for (const [column, value] of [
        [3, formulaRow.name],
        [4, formulaRow.phone],
        [5, formulaRow.email],
        [9, formulaRow.source_path],
        [10, formulaRow.message],
      ] as const) {
        expect(exported?.[column]).toBe(`'${value}`);
      }
      expect(exported?.slice(6, 9)).toEqual([
        formulaRow.location,
        formulaRow.preferred_time,
        formulaRow.locale,
      ]);
    }

    // The export boundary is audited: exactly one metadata-only row for the
    // Successful read above, nothing for the rejected calls below.
    const { data: exportAudits, error: exportAuditError } = await db
      .from("audit_log")
      .select("id, actor_email, entity, entity_id, detail")
      .eq("action", "requests.export")
      .eq("actor_email", staffEmail)
      .order("at", { ascending: false })
      .limit(1);
    expect(exportAuditError).toBeNull();
    expect(exportAudits).toHaveLength(1);
    expect(exportAudits?.[0].entity).toBe("requests");
    expect(exportAudits?.[0].entity_id).toBeNull();
    expect(exportAudits?.[0].detail).toMatchObject({
      row_count: expectedCount,
      status_filter: "contacted",
      has_search: false,
    });
    expect(JSON.stringify(exportAudits?.[0].detail)).not.toContain("portal-export-");

    const scopedCsv = await fetchCsv(
      staffPage,
      "contacted",
      `portal-export-${runId}-utf8@example.test`,
    );
    expect(scopedCsv.status).toBe(200);
    expect(scopedCsv.contentType).toContain("text/csv; charset=utf-8");
    const scopedRows = parseCsv(scopedCsv.text);
    expect(scopedRows[0]).toEqual([...CSV_HEADER]);
    expect(scopedRows).toHaveLength(2);
    expect(scopedRows[1]?.[0]).toBe(insertedRows[2]?.id);
    expect(scopedRows[1]?.[2]).toBe("contacted");
    expect(scopedRows[1]?.[3]).toBe(stagedRows[2].name);
    expect(scopedRows[1]?.[5]).toBe(stagedRows[2].email);
    expect(scopedRows[1]?.[10]).toBe(stagedRows[2].message);

    const { data: scopedAudits, error: scopedAuditError } = await db
      .from("audit_log")
      .select("detail")
      .eq("action", "requests.export")
      .eq("actor_email", staffEmail)
      .order("at", { ascending: false })
      .limit(1);
    expect(scopedAuditError).toBeNull();
    expect(scopedAudits?.[0]?.detail).toMatchObject({
      row_count: 1,
      status_filter: "contacted",
      has_search: true,
    });
    expect(JSON.stringify(scopedAudits?.[0]?.detail)).not.toContain("portal-export-");

    const invalidFilter = await fetchCsv(staffPage, "not-a-status");
    expect(invalidFilter.status).toBe(400);

    const anonymous = await request.get("/admin/requests/export?status=contacted", {
      maxRedirects: 0,
    });
    expect([307, 401]).toContain(anonymous.status());
    if (anonymous.status() === 307) {
      expect(new URL(anonymous.headers().location, "http://localhost:3100").pathname).toBe(
        "/admin/login",
      );
    }

    const { count: exportAuditTotal, error: exportAuditCountError } = await db
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("action", "requests.export")
      .eq("actor_email", staffEmail);
    expect(exportAuditCountError).toBeNull();
    expect(exportAuditTotal).toBe(2);
  });

  test("VAL-ADMIN-019: Recent work renders the audit record in plain language", async () => {
    if (!adminPage) throw new Error("Admin session is unavailable");
    const token = `recentwork-${runId}`;
    const { data: staged, error: stageError } = await db
      .from("requests")
      .insert({
        name: `TEST Recent Work ${runId}`,
        phone: "8135550111",
        email: `${token}@example.test`,
        location: "tampa",
        preferred_time: "morning",
        message: "TEST recent-work fixture.",
        locale: "en",
        source_path: "/e2e/recent-work",
        // Durable workflow shape: the staff-facing Scheduled presentation
        // Rides on the `booked` state (DEC-04); the historic audit rows
        // Staged below keep their as-recorded legacy vocabulary.
        status: "booked",
        record_handoff_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    expect(stageError).toBeNull();
    const requestId = requireDecoded(
      idRowSchema.safeParse(staged),
      "Recent-work fixture was not created",
    ).id;

    const { error: auditError } = await db.from("audit_log").insert([
      {
        actor_email: SEED_ADMIN_EMAIL.toLowerCase(),
        action: "request.status_change",
        entity: "requests",
        entity_id: requestId,
        detail: { from: "new", to: "scheduled" },
      },
      {
        actor_email: SEED_ADMIN_EMAIL.toLowerCase(),
        action: "request.call_outcome",
        entity: "requests",
        entity_id: requestId,
        detail: {
          from: "scheduled",
          to: "contacted",
          outcome: "voicemail",
          follow_up_at: new Date(Date.now() + 3 * 86_400_000).toISOString(),
          note_attached: false,
        },
      },
      {
        actor_email: SEED_ADMIN_EMAIL.toLowerCase(),
        action: "requests.export",
        entity: "requests",
        entity_id: null,
        detail: { row_count: 42, status_filter: "all", has_search: false },
      },
    ]);
    expect(auditError).toBeNull();

    const { data: profile } = await db
      .from("staff_profiles")
      .select("display_name")
      .eq("email", SEED_ADMIN_EMAIL.toLowerCase())
      .single();
    const actorName = String(profile?.display_name ?? "");

    try {
      await adminPage.goto("/admin/audit");
      const recent = adminPage.getByTestId("recent-work-list").first();
      await expect(recent).toBeVisible();
      await expect(recent).toContainText(actorName);
      await expect(recent).toContainText("marked a request Scheduled");
      await expect(recent).toContainText("left a voicemail on a request");
      await expect(recent).toContainText("exported the request list (42 requests)");
      // Storage vocabulary never reaches the human view.
      await expect(recent).not.toContainText("request.status_change");
      await expect(recent).not.toContainText("requests.export");
      const statusEntry = recent.locator("li", { hasText: "marked a request Scheduled" }).first();
      await expect(statusEntry.getByRole("link", { name: "open request" })).toHaveAttribute(
        "href",
        `/admin/requests/${requestId}`,
      );

      // The exact technical record stays beneath for administrators.
      const technical = adminPage.getByTestId("audit-table");
      await expect(technical).toContainText("request.status_change");
      await expect(technical).toContainText("requests.export");
    } finally {
      await db.from("audit_log").delete().eq("entity_id", requestId);
      await db
        .from("audit_log")
        .delete()
        .eq("action", "requests.export")
        .eq("actor_email", SEED_ADMIN_EMAIL.toLowerCase())
        .contains("detail", { row_count: 42 });
      await db.from("requests").delete().eq("id", requestId);
    }
  });

  test("VAL-ADMIN-020: Recent work search, work-type filters, compaction, and URL state", async () => {
    if (!adminPage) throw new Error("Admin session is unavailable");
    const token = `activity-${runId}`;
    // Four adjacent print-packet events inside one practice day (anchored to
    // Local noon so the run never crosses midnight) plus one request action.
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    const { data: stagedRows, error: stageError } = await db
      .from("audit_log")
      .insert([
        ...Array.from({ length: 4 }, (_, index) => ({
          actor_email: SEED_ADMIN_EMAIL.toLowerCase(),
          action: "requests.print_new",
          entity: "requests",
          entity_id: null,
          detail: { row_count: 3 },
          at: new Date(noon.getTime() - index * 60_000).toISOString(),
        })),
        {
          actor_email: SEED_ADMIN_EMAIL.toLowerCase(),
          action: "request.create",
          entity: "requests",
          entity_id: null,
          detail: {},
          at: new Date(noon.getTime() - 10 * 60_000).toISOString(),
        },
      ])
      .select("id");
    expect(stageError).toBeNull();
    const fixtureIds = requireDecoded(
      z.array(idRowSchema).safeParse(stagedRows ?? []),
      "Activity fixtures were not created",
    ).map((row) => row.id);

    try {
      // Search by an action phrase through the URL.
      await adminPage.goto(`/admin/audit?q=${encodeURIComponent("print packet")}`);
      const summary = adminPage.getByTestId("recent-work-summary");
      await expect(summary).toContainText("print packet");
      const group = adminPage.getByTestId("recent-work-group");
      await expect(group).toContainText(/4 times between/);

      // Expansion reaches the exact underlying entries.
      await group.getByText("Show all 4").click();
      await expect(group).toContainText("prepared the New-request print packet (3 requests)");

      // The exact technical record keeps every underlying event.
      const technical = adminPage.getByTestId("audit-table");
      expect(await technical.getByText("requests.print_new").count()).toBeGreaterThanOrEqual(4);

      // Work-type filters narrow the same result set.
      await adminPage.goto("/admin/audit?type=people");
      await expect(summary).not.toContainText("print packet");

      // No-results copy and recovery follow the active Recent work constraints.
      const miss = `zzz-${token}`;
      await adminPage.goto(`/admin/audit?q=${encodeURIComponent(miss)}&type=requests`);
      const empty = adminPage.getByTestId("recent-work-empty");
      await expect(empty).toBeVisible();
      await expect(empty).toContainText(
        `No recent work matches for “${miss}” in Appointment requests.`,
      );
      await expect(
        empty.getByRole("link", { name: "Clear search and filters", exact: true }),
      ).toHaveAttribute("href", "/admin/audit#recent-work-search");

      await adminPage.goto(`/admin/audit?q=${encodeURIComponent(miss)}`);
      await expect(empty).toContainText(`No recent work matches for “${miss}”.`);
      await expect(empty).not.toContainText("Try different words");
      const searchRecovery = empty.getByRole("link", { name: "Clear search", exact: true });
      await expect(searchRecovery).toHaveAttribute("href", "/admin/audit#recent-work-search");
      await searchRecovery.click();
      await expect(adminPage).toHaveURL(/\/admin\/audit(?:#recent-work-search)?$/);
      await expect(adminPage.getByLabel("Search recent work")).toBeFocused();
      await expect(adminPage.getByTestId("recent-work-summary")).toBeVisible();
    } finally {
      for (const id of fixtureIds) {
        await db.from("audit_log").delete().eq("id", id);
      }
    }
  });

  test("VAL-ADMIN-021: workflow-command vocabulary, filters, adjacency, and unique search id", async () => {
    if (!adminPage) throw new Error("Admin session is unavailable");
    const token = `slice8-${runId}`;
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    const { data: staged, error: stageError } = await db
      .from("requests")
      .insert({
        name: `TEST Slice8 ${runId}`,
        phone: "8135550112",
        email: `${token}@example.test`,
        location: "tampa",
        preferred_time: "morning",
        message: "TEST slice8 workflow fixture.",
        locale: "en",
        source_path: "/e2e/slice8",
        status: "contacted",
      })
      .select("id")
      .single();
    expect(stageError).toBeNull();
    const requestId = requireDecoded(
      idRowSchema.safeParse(staged),
      "Slice 8 request fixture was not created",
    ).id;
    const commands = [
      ["record_contact_attempt", "new", "contacted", "recorded a contact attempt on a request"],
      ["confirm_booking_handoff", "contacted", "booked", "marked a request Scheduled"],
      ["close_request", "contacted", "closed", "closed a request"],
      ["reopen_request", "closed", "contacted", "reopened a request"],
      ["set_call_again", "contacted", "contacted", "corrected the call-again time on a request"],
      [
        "undo_latest_transition",
        "contacted",
        "booked",
        "undid the last change on a request — back to Scheduled",
      ],
      ["classify_legacy_closure", "closed", "closed", "classified a closed request"],
    ] as const;
    const { data: stagedRows, error: auditError } = await db
      .from("audit_log")
      .insert([
        ...commands.map(([command, from, to], index) => ({
          actor_email: SEED_ADMIN_EMAIL.toLowerCase(),
          action: "request.workflow_command",
          entity: "requests",
          entity_id: requestId,
          detail: { command, from, to, resulting_version: index + 1 },
          at: new Date(noon.getTime() - index * 1000).toISOString(),
        })),
        {
          actor_email: SEED_ADMIN_EMAIL.toLowerCase(),
          action: "requests.print_new",
          entity: "requests",
          entity_id: null,
          detail: { row_count: 17 },
          at: new Date(noon.getTime() - 20 * 60_000).toISOString(),
        },
        {
          actor_email: SEED_ADMIN_EMAIL.toLowerCase(),
          action: "request.note",
          entity: "requests",
          entity_id: requestId,
          detail: {},
          at: new Date(noon.getTime() - 21 * 60_000).toISOString(),
        },
        {
          actor_email: SEED_ADMIN_EMAIL.toLowerCase(),
          action: "requests.print_new",
          entity: "requests",
          entity_id: null,
          detail: { row_count: 17 },
          at: new Date(noon.getTime() - 22 * 60_000).toISOString(),
        },
        {
          actor_email: SEED_ADMIN_EMAIL.toLowerCase(),
          action: "recipients.add",
          entity: "notification_recipients",
          entity_id: null,
          detail: {},
          at: new Date(noon.getTime() - 30 * 60_000).toISOString(),
        },
        {
          actor_email: SEED_ADMIN_EMAIL.toLowerCase(),
          action: "maintainers.invite",
          entity: "maintainers",
          entity_id: null,
          detail: { target_login: `${token}-maintainer` },
          at: new Date(noon.getTime() - 40 * 60_000).toISOString(),
        },
      ])
      .select("id");
    expect(auditError).toBeNull();
    const fixtureIds = requireDecoded(
      z.array(idRowSchema).safeParse(stagedRows ?? []),
      "Slice 8 activity fixtures were not created",
    ).map((row) => row.id);

    try {
      await adminPage.goto("/admin/audit");
      expect(await adminPage.locator("#recent-work-search").count()).toBe(1);
      await expect(adminPage.locator("#recent-work-search")).toHaveAttribute("name", "q");
      await expect(adminPage.getByTestId("recent-work-filter-other")).toHaveCount(0);

      const recent = adminPage.getByTestId("recent-work-list").first();
      for (const [, , , phrase] of commands) {
        await expect(recent).toContainText(phrase);
      }
      await expect(recent).not.toContainText("request.workflow_command");
      await expect(recent).not.toContainText("record_contact_attempt");
      await expect(recent).not.toContainText("set_call_again");
      await expect(recent).not.toContainText("undo_latest_transition");
      await expect(recent).not.toContainText("resulting_version");
      await expect(
        recent
          .locator("li", { hasText: "recorded a contact attempt on a request" })
          .first()
          .getByRole("link", { name: "open request" }),
      ).toHaveAttribute("href", `/admin/requests/${requestId}`);
      await expect(adminPage.getByTestId("audit-table")).toContainText("request.workflow_command");

      const filters = [
        ["all", "All work"],
        ["requests", "Appointment requests"],
        ["people", "Notifications & staff"],
        ["output", "Printing & exports"],
        ["site", "Website & access"],
      ] as const;
      for (const [type, label] of filters) {
        await adminPage.getByTestId(`recent-work-filter-${type}`).click();
        await expect(adminPage.getByTestId(`recent-work-filter-${type}`)).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        await expect(adminPage.getByTestId(`recent-work-filter-${type}`)).toHaveText(label);
        if (type !== "all") {
          await expect(adminPage.getByTestId("recent-work-summary")).toContainText(label);
          await expect(adminPage).toHaveURL(new RegExp(`[?&]type=${type}\\b`));
        }
      }

      await adminPage.goto(`/admin/audit?q=${encodeURIComponent(requestId)}&type=requests`);
      await expect(adminPage.getByTestId("recent-work-list").first()).toContainText(
        "contact attempt",
      );
      await adminPage.goto("/admin/audit?q=notification%20emails&type=people");
      await expect(adminPage.getByTestId("recent-work-list").first()).toContainText(
        "notification emails",
      );
      await adminPage.goto(`/admin/audit?q=${encodeURIComponent(`${token}-maintainer`)}&type=site`);
      await expect(adminPage.getByTestId("recent-work-list").first()).toContainText(
        `${token}-maintainer`,
      );
      await adminPage.goto("/admin/audit?q=17%20requests&type=output");
      await expect(adminPage.getByTestId("recent-work-group")).toHaveCount(0);
      await expect(
        adminPage
          .getByTestId("recent-work-list")
          .getByText("prepared the New-request print packet (17 requests)"),
      ).toHaveCount(2);

      await adminPage.getByTestId("recent-work-clear").click();
      await expect(adminPage).toHaveURL(/\/admin\/audit$/);
      await expect(adminPage.getByLabel("Search recent work")).toBeFocused();
    } finally {
      for (const id of fixtureIds) {
        await db.from("audit_log").delete().eq("id", id);
      }
      await db.from("requests").delete().eq("id", requestId);
    }
  });

  test("VAL-ADMIN-022: Recent work 1,260-row lens, mixed pagers, and focus", async () => {
    if (!adminPage) throw new Error("Admin session is unavailable");
    test.setTimeout(120_000);
    const actor = `lens-${runId}@example.test`;
    const oldestId = randomUUID();
    const { data: staged, error: stageError } = await db
      .from("requests")
      .insert({
        id: oldestId,
        name: `TEST Lens ${runId}`,
        phone: "8135550113",
        email: actor,
        location: "tampa",
        preferred_time: "morning",
        message: "TEST recent-work 1260-row fixture.",
        locale: "en",
        source_path: "/e2e/recent-work-lens",
        status: "contacted",
      })
      .select("id")
      .single();
    expect(stageError).toBeNull();
    expect(requireDecoded(idRowSchema.safeParse(staged), "Lens request was not created").id).toBe(
      oldestId,
    );

    const base = Date.UTC(2042, 5, 1, 12, 0, 0);
    const rows = Array.from({ length: 1260 }, (_, index) => ({
      actor_email: actor,
      action: "request.note",
      entity: "requests",
      entity_id: index === 1259 ? oldestId : null,
      detail: {},
      at: new Date(base - index * 1000).toISOString(),
    }));
    const fixtureIds: string[] = [];
    try {
      for (let from = 0; from < rows.length; from += 250) {
        const { data, error } = await db
          .from("audit_log")
          .insert(rows.slice(from, from + 250))
          .select("id");
        expect(error).toBeNull();
        fixtureIds.push(
          ...requireDecoded(
            z.array(idRowSchema).safeParse(data ?? []),
            "Lens audit chunk was not created",
          ).map((row) => row.id),
        );
      }
      expect(fixtureIds).toHaveLength(1260);

      await adminPage.goto(`/admin/audit?q=${encodeURIComponent(actor)}`);
      const summary = adminPage.getByTestId("recent-work-summary");
      await expect(summary).toHaveText(`Showing 1–50 of 1260 entries for “${actor}”.`);
      await expect(adminPage.getByText(/Search and filters cover the/)).toHaveCount(0);

      await adminPage.goto(`/admin/audit?q=${encodeURIComponent(oldestId)}`);
      await expect(adminPage.getByTestId("recent-work-summary")).toContainText("1–1 of 1");
      await expect(adminPage.getByRole("link", { name: "open request" })).toHaveAttribute(
        "href",
        `/admin/requests/${oldestId}`,
      );

      await adminPage.goto(`/admin/audit?q=${encodeURIComponent(actor)}&rw=26`);
      await expect(summary).toHaveText(`Showing 1251–1260 of 1260 entries for “${actor}”.`);
      await expect(adminPage.getByRole("link", { name: "open request" })).toHaveAttribute(
        "href",
        `/admin/requests/${oldestId}`,
      );

      await adminPage.goto(`/admin/audit?q=${encodeURIComponent(actor)}&rw=99&page=5`);
      await expect(adminPage).toHaveURL(new RegExp(`rw=26`));
      await expect(adminPage).toHaveURL(/page=5/);
      await expect(summary).toContainText("1251–1260 of 1260");

      await adminPage.goto(`/admin/audit?q=${encodeURIComponent(actor)}&rw=2&page=5`);
      const recentNext = adminPage
        .getByTestId("recent-work-pagination")
        .getByRole("link", { name: "Next" });
      const recentNextUrl = new URL((await recentNext.getAttribute("href")) ?? "", adminPage.url());
      expect(recentNextUrl.searchParams.get("rw")).toBe("3");
      expect(recentNextUrl.searchParams.get("page")).toBe("5");
      expect(recentNextUrl.searchParams.get("q")).toBe(actor);
      await recentNext.click();
      await expect(adminPage).toHaveURL(/rw=3/);
      await expect(adminPage).toHaveURL(/page=5/);
      await expect(summary).toHaveText(`Showing 101–150 of 1260 entries for “${actor}”.`);
      await expect(
        adminPage.getByTestId("recent-work-pagination").getByText("Page 3 of 26", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(summary).toBeFocused();

      const recentPrevious = adminPage
        .getByTestId("recent-work-pagination")
        .getByRole("link", { name: "Previous" });
      const recentPreviousUrl = new URL(
        (await recentPrevious.getAttribute("href")) ?? "",
        adminPage.url(),
      );
      expect(recentPreviousUrl.searchParams.get("rw")).toBe("2");
      expect(recentPreviousUrl.searchParams.get("page")).toBe("5");
      expect(recentPreviousUrl.searchParams.get("q")).toBe(actor);
      await recentPrevious.click();
      await expect(adminPage).toHaveURL(/rw=2/);
      await expect(adminPage).toHaveURL(/page=5/);
      await expect(summary).toHaveText(`Showing 51–100 of 1260 entries for “${actor}”.`);
      await expect(
        adminPage.getByTestId("recent-work-pagination").getByText("Page 2 of 26", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(summary).toBeFocused();

      const technicalNext = adminPage
        .getByTestId("audit-pagination")
        .getByRole("link", { name: "Next" });
      const technicalNextUrl = new URL(
        (await technicalNext.getAttribute("href")) ?? "",
        adminPage.url(),
      );
      expect(technicalNextUrl.searchParams.get("rw")).toBe("2");
      expect(technicalNextUrl.searchParams.get("page")).toBe("6");
      expect(technicalNextUrl.searchParams.get("q")).toBe(actor);
      await technicalNext.click();
      await expect(adminPage).toHaveURL(/rw=2/);
      await expect(adminPage).toHaveURL(/page=6/);
      await expect(adminPage.getByTestId("audit-page-summary")).toContainText("501–600 of");
      await expect(
        adminPage.getByTestId("audit-pagination").getByText(/Page 6 of \d+/, {
          exact: true,
        }),
      ).toBeVisible();
      await expect(adminPage.getByTestId("audit-page-summary")).toBeFocused();

      const technicalPrevious = adminPage
        .getByTestId("audit-pagination")
        .getByRole("link", { name: "Previous" });
      const technicalPreviousUrl = new URL(
        (await technicalPrevious.getAttribute("href")) ?? "",
        adminPage.url(),
      );
      expect(technicalPreviousUrl.searchParams.get("rw")).toBe("2");
      expect(technicalPreviousUrl.searchParams.get("page")).toBe("5");
      expect(technicalPreviousUrl.searchParams.get("q")).toBe(actor);
      await technicalPrevious.click();
      await expect(adminPage).toHaveURL(/rw=2/);
      await expect(adminPage).toHaveURL(/page=5/);
      await expect(adminPage.getByTestId("audit-page-summary")).toContainText("401–500 of");
      await expect(
        adminPage.getByTestId("audit-pagination").getByText(/Page 5 of \d+/, {
          exact: true,
        }),
      ).toBeVisible();
      await expect(adminPage.getByTestId("audit-page-summary")).toBeFocused();

      await adminPage.getByTestId("recent-work-filter-requests").click();
      await expect(adminPage).toHaveURL(/page=5/);
      await expect(adminPage).not.toHaveURL(/rw=/);
      await expect(summary).toBeFocused();

      await adminPage.getByLabel("Search recent work").fill(actor);
      await adminPage.getByRole("button", { name: "Search", exact: true }).click();
      await expect(summary).toBeFocused();
      await expect(adminPage).toHaveURL(/page=5/);

      await adminPage.getByTestId("recent-work-clear").click();
      await expect(adminPage).toHaveURL(/\/admin\/audit\?page=5$/);
      await expect(adminPage.getByLabel("Search recent work")).toBeFocused();
    } finally {
      for (let from = 0; from < fixtureIds.length; from += 250) {
        const { error } = await db
          .from("audit_log")
          .delete()
          .in("id", fixtureIds.slice(from, from + 250));
        expect(error).toBeNull();
      }
      await db.from("audit_log").delete().eq("actor_email", actor);
      await db.from("requests").delete().eq("id", oldestId);
    }
  });
});
