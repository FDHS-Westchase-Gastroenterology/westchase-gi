import { randomUUID } from "node:crypto";
import {
  expect,
  test,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv, requiredEnv, serviceDb } from "./support";

loadLocalEnv();

const SUPABASE_URL = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_KEY = requiredEnv(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
);
const SEED_ADMIN_EMAIL = requiredEnv("PORTAL_SEED_ADMIN_EMAIL");
const SEED_ADMIN_PASSWORD = requiredEnv("PORTAL_SEED_ADMIN_PASSWORD");
const GENERIC_LOGIN_ERROR =
  "Unable to sign in. Check your credentials and try again.";
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
const runId = randomUUID().slice(0, 8);
const staffEmail = `portal-staff-${runId}@example.test`;
const targetEmail = `portal-target-${runId}@example.test`;
const recipientEmail = `portal-recipient-${runId}@example.test`;
const deniedRecipientEmail = `portal-denied-${runId}@example.test`;
const registryAttemptId = randomUUID();

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

type MutationResponse = {
  status: number;
  body: Record<string, unknown>;
};

type RestResult = {
  error: { code?: string } | null;
  status: number;
};

type CsvFetch = {
  status: number;
  contentType: string;
  contentDisposition: string;
  text: string;
};

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
}

async function mutate(
  page: Page,
  operation: string,
  input: Record<string, unknown>,
): Promise<MutationResponse> {
  return page.evaluate(
    async ({ operation: selectedOperation, input: selectedInput }) => {
      const response = await fetch("/admin/settings/mutations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: selectedOperation,
          input: selectedInput,
        }),
      });
      const body = (await response.json()) as Record<string, unknown>;
      return { status: response.status, body };
    },
    { operation, input },
  );
}

function oneTimePassword(response: MutationResponse): string {
  expect(response.status).toBe(201);
  expect(response.body.ok).toBe(true);
  const password = response.body.tempPassword;
  expect(typeof password).toBe("string");
  expect((password as string).length).toBeGreaterThanOrEqual(20);
  return password as string;
}

function expectDenied(result: RestResult): void {
  expect(result.error).not.toBeNull();
  expect(
    result.error?.code === "42501" ||
      result.status === 401 ||
      result.status === 403,
  ).toBe(true);
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

async function fetchCsv(page: Page, status: string): Promise<CsvFetch> {
  return page.evaluate(async (selectedStatus) => {
    const response = await fetch(
      `/admin/requests/export?status=${encodeURIComponent(selectedStatus)}`,
    );
    return {
      status: response.status,
      contentType: response.headers.get("content-type") ?? "",
      contentDisposition: response.headers.get("content-disposition") ?? "",
      text: await response.text(),
    };
  }, status);
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

  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Credential and role checks run once.",
    );
  });

  test.afterAll(async () => {
    await Promise.allSettled([
      adminContext?.close() ?? Promise.resolve(),
      staffContext?.close() ?? Promise.resolve(),
    ]);

    const [profiles, recipients] = await Promise.all([
      db
        .from("staff_profiles")
        .select("id, user_id")
        .in("email", [staffEmail, targetEmail]),
      db
        .from("notification_recipients")
        .select("id")
        .in("email", [recipientEmail, deniedRecipientEmail]),
    ]);

    for (const profile of profiles.data ?? []) {
      auditEntityIds.add(profile.id);
      if (profile.user_id) {
        if (!staffUserId) staffUserId = profile.user_id;
        else if (profile.user_id !== staffUserId) targetUserId = profile.user_id;
      }
    }
    for (const recipient of recipients.data ?? []) {
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
    await db.from("registry_assets").delete().eq("id", registryAttemptId);
    await db.from("requests").delete().like("email", `portal-export-${runId}-%`);

    if (auditEntityIds.size > 0) {
      await db
        .from("audit_log")
        .delete()
        .in("entity_id", [...auditEntityIds]);
    }

    await db
      .from("staff_profiles")
      .delete()
      .in("email", [staffEmail, targetEmail]);
    for (const userId of new Set(
      [staffUserId, targetUserId].filter(
        (value): value is string => value !== null,
      ),
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
    await signIn(adminPage, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD);

    const staffInvite = await mutate(adminPage, "staff.invite", {
      email: staffEmail,
      displayName: `TEST Portal Staff ${runId}`,
      role: "staff",
    });
    const staffPassword = oneTimePassword(staffInvite);

    const targetInvite = await mutate(adminPage, "staff.invite", {
      email: targetEmail,
      displayName: `TEST Portal Target ${runId}`,
      role: "staff",
    });
    const targetPassword = oneTimePassword(targetInvite);

    const { data: profiles, error: profileError } = await db
      .from("staff_profiles")
      .select("id, user_id, email, role, active")
      .in("email", [staffEmail, targetEmail]);
    expect(profileError).toBeNull();
    expect(profiles).toHaveLength(2);

    const staffProfile = profiles?.find((profile) => profile.email === staffEmail);
    const targetProfile = profiles?.find(
      (profile) => profile.email === targetEmail,
    );
    if (!staffProfile || !targetProfile) {
      throw new Error("Throwaway staff profiles were not created");
    }

    staffUserId = staffProfile.user_id;
    targetUserId = targetProfile.user_id;
    staffProfileId = staffProfile.id;
    targetProfileId = targetProfile.id;
    auditEntityIds.add(staffProfile.id);
    auditEntityIds.add(targetProfile.id);

    const { data: targetAuth, error: targetAuthError } =
      await db.auth.admin.getUserById(targetProfile.user_id);
    expect(targetAuthError).toBeNull();
    expect(targetAuth.user?.app_metadata.role).toBe("staff");

    staffContext = await browser.newContext();
    staffPage = await staffContext.newPage();
    await signIn(staffPage, staffEmail, staffPassword);

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

    const addedRecipient = await mutate(adminPage, "recipient.add", {
      email: recipientEmail,
      label: `TEST recipient ${runId}`,
      active: true,
    });
    expect(addedRecipient.status).toBe(201);
    expect(addedRecipient.body.ok).toBe(true);

    const { data: recipient, error: recipientError } = await db
      .from("notification_recipients")
      .select("id, active")
      .eq("email", recipientEmail)
      .single();
    expect(recipientError).toBeNull();
    if (!recipient) throw new Error("Throwaway recipient was not created");
    recipientId = recipient.id;
    auditEntityIds.add(recipient.id);

    const toggledRecipient = await mutate(staffPage, "recipient.toggle", {
      recipientId: recipient.id,
      active: false,
    });
    expect(toggledRecipient.status).toBe(200);
    expect(toggledRecipient.body.ok).toBe(true);

    const deniedRemove = await mutate(staffPage, "recipient.remove", {
      id: recipient.id,
    });
    expect(deniedRemove.status).toBe(403);
    const recipientAfterDeniedRemove = await db
      .from("notification_recipients")
      .select("active")
      .eq("id", recipient.id)
      .single();
    expect(recipientAfterDeniedRemove.error).toBeNull();
    expect(recipientAfterDeniedRemove.data?.active).toBe(false);

    const staffRest = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    const staffSignIn = await staffRest.auth.signInWithPassword({
      email: staffEmail,
      password: staffPassword,
    });
    expect(staffSignIn.error).toBeNull();

    const [registryWrite, profileWrite] = await Promise.all([
      staffRest
        .from("registry_assets")
        .insert({
          id: registryAttemptId,
          name: `TEST denied registry ${runId}`,
          kind: "test",
          maintainer: "TEST automation",
          status: "test",
        })
        .select("id"),
      staffRest
        .from("staff_profiles")
        .update({ display_name: `TEST denied change ${runId}` })
        .eq("user_id", targetProfile.user_id)
        .select("id"),
    ]);
    expectDenied(registryWrite);
    expectDenied(profileWrite);
    await staffRest.auth.signOut({ scope: "local" });

    const promoted = await mutate(adminPage, "staff.role", {
      userId: targetProfile.user_id,
      role: "admin",
    });
    expect(promoted.status).toBe(200);
    expect(promoted.body.ok).toBe(true);

    const [promotedProfile, promotedAuth] = await Promise.all([
      db
        .from("staff_profiles")
        .select("role")
        .eq("user_id", targetProfile.user_id)
        .single(),
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
      db
        .from("staff_profiles")
        .select("active")
        .eq("user_id", targetProfile.user_id)
        .single(),
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
      await expect(lockedPage.locator("#login-error")).toHaveText(
        GENERIC_LOGIN_ERROR,
      );
    } finally {
      await lockedContext.close();
    }

    const removedRecipient = await mutate(adminPage, "recipient.remove", {
      id: recipient.id,
    });
    expect(removedRecipient.status).toBe(200);
    expect(removedRecipient.body.ok).toBe(true);

    const recipientAfterRemove = await db
      .from("notification_recipients")
      .select("id")
      .eq("id", recipient.id)
      .maybeSingle();
    expect(recipientAfterRemove.error).toBeNull();
    expect(recipientAfterRemove.data).toBeNull();
  });

  test("VAL-ADMIN-010: management mutations write actor, action, entity, and time", async () => {
    if (
      !staffProfileId ||
      !targetProfileId ||
      !recipientId
    ) {
      throw new Error("Role-enforcement setup did not complete");
    }

    const { data: rows, error } = await db
      .from("audit_log")
      .select("actor_email, action, entity, entity_id, at")
      .in("entity_id", [staffProfileId, targetProfileId, recipientId]);
    expect(error).toBeNull();

    function assertAudit(
      action: string,
      entityId: string,
      actorEmail: string,
    ): void {
      const row = rows?.find(
        (candidate) =>
          candidate.action === action &&
          candidate.entity_id === entityId &&
          candidate.actor_email.toLowerCase() === actorEmail.toLowerCase(),
      );
      expect(row).toBeTruthy();
      expect(row?.entity).toBe(
        action.startsWith("staff.")
          ? "staff_profiles"
          : "notification_recipients",
      );
      expect(Number.isNaN(Date.parse(row?.at ?? ""))).toBe(false);
    }

    assertAudit("staff.invite", staffProfileId, SEED_ADMIN_EMAIL);
    assertAudit("staff.invite", targetProfileId, SEED_ADMIN_EMAIL);
    assertAudit("staff.role", targetProfileId, SEED_ADMIN_EMAIL);
    assertAudit("staff.deactivate", targetProfileId, SEED_ADMIN_EMAIL);
    assertAudit("recipients.add", recipientId, SEED_ADMIN_EMAIL);
    assertAudit("recipients.toggle", recipientId, staffEmail);
    assertAudit("recipients.remove", recipientId, SEED_ADMIN_EMAIL);
  });

  test("VAL-ADMIN-011: filtered CSV is parseable, exact, and access-controlled", async ({
    request,
  }) => {
    if (!staffPage) throw new Error("Staff session is unavailable");

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
    ];
    const { data: inserted, error: insertError } = await db
      .from("requests")
      .insert(stagedRows)
      .select("id");
    expect(insertError).toBeNull();
    expect(inserted).toHaveLength(2);
    for (const row of inserted ?? []) requestIds.add(row.id);

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
      if (
        before === after &&
        candidate.status === 200 &&
        candidateRows.length - 1 === after
      ) {
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

    for (const insertedRow of inserted ?? []) {
      expect(parsed.some((row) => row[0] === insertedRow.id)).toBe(true);
    }
    const quotedRow = parsed.find((row) => row[0] === inserted?.[0]?.id);
    expect(quotedRow?.[10]).toBe(stagedRows[0].message);

    const invalidFilter = await fetchCsv(staffPage, "not-a-status");
    expect(invalidFilter.status).toBe(400);

    const anonymous = await request.get(
      "/admin/requests/export?status=contacted",
      { maxRedirects: 0 },
    );
    expect([307, 401]).toContain(anonymous.status());
    if (anonymous.status() === 307) {
      expect(
        new URL(
          anonymous.headers().location,
          "http://localhost:3100",
        ).pathname,
      ).toBe("/admin/login");
    }
  });
});
