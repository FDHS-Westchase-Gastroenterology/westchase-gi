import { createHash, randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  loadLocalEnv,
  requiredEnv,
  serviceDb,
} from "./support";

loadLocalEnv();

const SUPABASE_URL = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_KEY = requiredEnv(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
);
const SEED_ADMIN_EMAIL = requiredEnv("PORTAL_SEED_ADMIN_EMAIL");
const SEED_ADMIN_PASSWORD = requiredEnv("PORTAL_SEED_ADMIN_PASSWORD");
const PREVIEW_USERNAME = process.env.PORTAL_PREVIEW_USERNAME ?? "";
const PREVIEW_PASSWORD = process.env.PORTAL_PREVIEW_PASSWORD ?? "";
const GENERIC_LOGIN_ERROR =
  "Unable to sign in. Check your credentials and try again.";
const RESET_REQUEST_MESSAGE =
  "If an active staff account exists for that email, you’ll receive a password reset link.";

interface RestResult {
  data: unknown;
  error: { code?: string } | null;
  status: number;
}

const idRowSchema = z.object({ id: z.string() });
const staffIdentitySchema = z.object({
  user_id: z.string(),
  display_name: z.string(),
});
const displayNameRowSchema = z.object({
  display_name: z.string(),
});

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function requireText(
  value: string | null | undefined,
  message: string,
): string {
  if (value === null || value === undefined || value === "") {
    throw new Error(message);
  }
  return value;
}

type SafeParseResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: unknown };

function requireDecoded<T>(parsed: SafeParseResult<T>, message: string): T {
  expect(parsed.success).toBe(true);
  if (!parsed.success) throw new Error(message);
  return parsed.data;
}

function browserDb() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function expectDenied(result: Readonly<RestResult>): void {
  expect(result.error?.code).toBe("42501");
  expect([401, 403]).toContain(result.status);
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function expectAnonymousReadClosed(result: Readonly<RestResult>): void {
  const rows = Array.isArray(result.data) ? result.data : [];
  expect(rows).toHaveLength(0);

  if (result.error) {
    expect(
      result.error.code === "42501" ||
        result.status === 401 ||
        result.status === 403,
    ).toBe(true);
  }
}

test.use({ trace: "off" });

test.describe("portal authentication and direct REST boundaries", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Credential and RLS checks run once.",
    );
  });

  test("VAL-ADMIN-019: Preview alias creates a real seeded admin session", async ({
    page,
  }) => {
    test.skip(
      process.env.VERCEL_ENV !== "preview" ||
        !PREVIEW_USERNAME ||
        !PREVIEW_PASSWORD,
      "Preview alias is exercised only by the explicit Preview auth run.",
    );

    await page.goto("/admin/login");
    await expect(page.getByLabel("Email")).toHaveAttribute("type", "text");
    await page.getByLabel("Email").fill(PREVIEW_USERNAME);
    await page.getByLabel("Password").fill(PREVIEW_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/?$/);

    const renderedIdentity = (
      (await page.getByTestId("session-user").textContent()) ?? ""
    ).trim();
    expect(renderedIdentity).not.toBe("");
    const { data: sessionProfile } = await serviceDb()
      .from("staff_profiles")
      .select("display_name")
      .eq("email", SEED_ADMIN_EMAIL.toLowerCase())
      .single();
    expect(digest(renderedIdentity)).toBe(
      digest(String(sessionProfile?.display_name ?? "")),
    );

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login\/?$/);
  });

  test("VAL-ADMIN-001: portal redirects, signs in, signs out, and rejects deactivated staff", async ({
    page,
    request,
  }) => {
    const rawResponse = await request.get("/admin", { maxRedirects: 0 });
    expect(rawResponse.status()).toBe(307);
    expect(
      new URL(
        rawResponse.headers().location,
        "http://localhost:3100",
      ).pathname,
    ).toBe("/admin/login");

    await page.goto("/admin/login");
    if (process.env.VERCEL_ENV !== "preview") {
      await expect(page.getByLabel("Email")).toHaveAttribute("type", "email");
    }
    await page.getByLabel("Email").fill("nobody@example.test");
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("#login-error")).toHaveText(
      GENERIC_LOGIN_ERROR,
    );

    await page.getByLabel("Email").fill(SEED_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(SEED_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/?$/);

    const renderedIdentity = (
      (await page.getByTestId("session-user").textContent()) ?? ""
    ).trim();
    expect(renderedIdentity).not.toBe("");
    const { data: sessionProfile } = await serviceDb()
      .from("staff_profiles")
      .select("display_name")
      .eq("email", SEED_ADMIN_EMAIL.toLowerCase())
      .single();
    expect(digest(renderedIdentity)).toBe(
      digest(String(sessionProfile?.display_name ?? "")),
    );

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login\/?$/);

    // Deactivation lockout is proven on a THROWAWAY account: toggling the
    // Shared seed admin raced parallel spec files signed in as that user.
    const db = serviceDb();
    const lockoutEmail = `lockout-${randomUUID().slice(0, 8)}@example.test`;
    const lockoutPassword = `Lk-${randomUUID()}`;
    const { data: created, error: createError } =
      await db.auth.admin.createUser({
        email: lockoutEmail,
        password: lockoutPassword,
        email_confirm: true,
      });
    expect(createError).toBeNull();
    const lockoutUserId = requireText(
      created.user?.id,
      "Lockout user creation failed",
    );

    try {
      const { error: profileInsertError } = await db
        .from("staff_profiles")
        .insert({
          user_id: lockoutUserId,
          email: lockoutEmail,
          display_name: "TEST Lockout",
          role: "staff",
          active: true,
          onboarded_at: new Date().toISOString(),
        });
      expect(profileInsertError).toBeNull();

      // Active: the account signs in.
      await page.getByLabel("Email").fill(lockoutEmail);
      await page.getByLabel("Password").fill(lockoutPassword);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page).toHaveURL(/\/admin\/?$/);
      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page).toHaveURL(/\/admin\/login\/?$/);

      // Deactivated: the same credentials are refused.
      const { error: deactivateError } = await db
        .from("staff_profiles")
        .update({ active: false })
        .eq("user_id", lockoutUserId);
      expect(deactivateError).toBeNull();

      await page.getByLabel("Email").fill(lockoutEmail);
      await page.getByLabel("Password").fill(lockoutPassword);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page).toHaveURL(/\/admin\/login\/?$/);
      await expect(page.locator("#login-error")).toHaveText(
        GENERIC_LOGIN_ERROR,
      );
    } finally {
      await db.from("staff_profiles").delete().eq("user_id", lockoutUserId);
      await db.auth.admin.deleteUser(lockoutUserId);
    }
  });

  test("VAL-ADMIN-014: forgot-password responses do not disclose account state", async ({
    page,
    request,
  }) => {
    const protectedResponse = await request.get("/admin/set-password", {
      maxRedirects: 0,
    });
    expect(protectedResponse.status()).toBe(307);
    expect(
      new URL(
        protectedResponse.headers().location,
        "http://localhost:3100",
      ).pathname,
    ).toBe("/admin/login");

    const db = serviceDb();
    const accounts: { id: string; email: string }[] = [];

    try {
      for (const active of [true, false]) {
        const email =
          (active ? "reset-active-" : "reset-inactive-") +
          randomUUID().slice(0, 8) +
          "@example.test";
        const { data, error } = await db.auth.admin.createUser({
          email,
          password: "Before-" + randomUUID() + "-aA1!",
          email_confirm: true,
        });
        expect(error).toBeNull();
        if (!data.user) throw new Error("Reset fixture creation failed");
        accounts.push({ id: data.user.id, email });

        const profile = await db.from("staff_profiles").insert({
          user_id: data.user.id,
          email,
          display_name: active
            ? "TEST Active Reset"
            : "TEST Inactive Reset",
          role: "staff",
          active,
          onboarded_at: new Date().toISOString(),
        });
        expect(profile.error).toBeNull();
      }

      const outcomes: string[] = [];

      // The sign-in card owns the normal entry point: preserve a previously
      // Entered address, move focus, and do not navigate or send on mode
      // Change alone.
      await page.goto("/admin/login");
      await page.getByLabel("Email").fill(accounts[0].email);
      const togglePosts: string[] = [];
      page.on("request", (outgoingRequest) => {
        if (outgoingRequest.method() === "POST") {
          togglePosts.push(outgoingRequest.url());
        }
      });
      await page.getByRole("button", { name: "Forgot password?" }).click();
      await page.waitForTimeout(100);
      expect(togglePosts).toHaveLength(0);
      await expect(page).toHaveURL(/\/admin\/login\/?$/);
      const inlineEmail = page.getByLabel("Email");
      await expect(inlineEmail).toBeFocused();
      await expect(inlineEmail).toHaveValue(accounts[0].email);
      await page.getByRole("button", { name: "Send reset link" }).click();
      const activeResult = page.getByTestId("reset-request-result");
      await expect(activeResult).toHaveText(RESET_REQUEST_MESSAGE);
      outcomes.push((await activeResult.textContent())?.trim() ?? "");
      await expect(page.getByTestId("reset-request-email")).toHaveText(
        accounts[0].email,
      );
      await expect(page.getByText(/Inbox and Spam or Junk/)).toBeVisible();
      await expect(page.getByText(/expires in one hour/)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Resend in 60s/ }),
      ).toBeDisabled();

      await page.getByRole("button", { name: "Change email" }).click();
      await expect(page.getByLabel("Email")).toBeFocused();
      await expect(page.getByLabel("Email")).toHaveValue(accounts[0].email);
      await page.getByRole("button", { name: "Back to sign in" }).click();
      await expect(page.getByLabel("Email")).toHaveValue(accounts[0].email);

      for (const email of [
        accounts[1].email,
        "unknown-" + randomUUID().slice(0, 8) + "@example.test",
      ]) {
        await page.goto("/admin/forgot-password");
        await page.getByLabel("Email").fill(email);
        await page.getByRole("button", { name: "Send reset link" }).click();
        const result = page.getByTestId("reset-request-result");
        await expect(result).toHaveText(RESET_REQUEST_MESSAGE);
        outcomes.push((await result.textContent())?.trim() ?? "");
      }

      expect(new Set(outcomes)).toEqual(new Set([RESET_REQUEST_MESSAGE]));
    } finally {
      for (const account of accounts) {
        await db.from("staff_profiles").delete().eq("user_id", account.id);
        await db.auth.admin.deleteUser(account.id);
      }
    }
  });

  test("VAL-ADMIN-017: Auth denies public signup and enforces the portal password minimum", async () => {
    const db = serviceDb();
    const signupClient = browserDb();
    const squatEmail =
      "signup-denied-" + randomUUID().slice(0, 8) + "@example.test";
    let unexpectedSignupId: string | null = null;

    try {
      const signup = await signupClient.auth.signUp({
        email: squatEmail,
        password: "Denied-" + randomUUID() + "-aA1!",
      });
      unexpectedSignupId = signup.data.user?.id ?? null;
      expect(signup.error).not.toBeNull();
      expect(signup.data.user).toBeNull();
    } finally {
      await signupClient.auth.signOut();
      if (unexpectedSignupId !== null && unexpectedSignupId !== "") {
        await db.auth.admin.deleteUser(unexpectedSignupId);
      }
    }

    const email =
      "password-policy-" + randomUUID().slice(0, 8) + "@example.test";
    const originalPassword = "Original-" + randomUUID() + "-aA1!";
    const created = await db.auth.admin.createUser({
      email,
      password: originalPassword,
      email_confirm: true,
    });
    expect(created.error).toBeNull();
    const userId = requireText(
      created.data.user?.id,
      "Password-policy fixture failed",
    );

    const authenticated = browserDb();
    try {
      const signIn = await authenticated.auth.signInWithPassword({
        email,
        password: originalPassword,
      });
      expect(signIn.error).toBeNull();

      const weakUpdate = await authenticated.auth.updateUser({
        password: "Short7!",
      });
      expect(weakUpdate.error).not.toBeNull();

      await authenticated.auth.signOut();
      const originalStillWorks = await authenticated.auth.signInWithPassword({
        email,
        password: originalPassword,
      });
      expect(originalStillWorks.error).toBeNull();
    } finally {
      await authenticated.auth.signOut();
      await db.auth.admin.deleteUser(userId);
    }
  });

  test("VAL-ADMIN-015: invite verification is deliberate, pending access is denied, and onboarding is single-use", async ({
    page,
  }) => {
    const db = serviceDb();
    const email =
      "invite-auth-" + randomUUID().slice(0, 8) + "@example.test";
    const password = "Invited-" + randomUUID() + "-aA1!";
    const generated = await db.auth.admin.generateLink({
      type: "invite",
      email,
    });
    expect(generated.error).toBeNull();
    const userId = requireText(
      generated.data.user?.id,
      "Invite link generation failed",
    );
    const tokenHash = requireText(
      generated.data.properties?.hashed_token,
      "Invite link generation failed",
    );

    let profileId: string | null = null;
    try {
      const profile = await db
        .from("staff_profiles")
        .insert({
          user_id: userId,
          email,
          display_name: "TEST Invited Staff",
          role: "staff",
          active: true,
          onboarded_at: null,
        })
        .select("id")
        .single();
      expect(profile.error).toBeNull();
      profileId = requireDecoded(
        idRowSchema.safeParse(profile.data),
        "Invite profile creation failed",
      ).id;

      const confirmPath =
        "/admin/auth/confirm#token_hash=" +
        encodeURIComponent(tokenHash) +
        "&type=invite";
      await page.goto(confirmPath);
      const continueButton = page.getByRole("button", { name: "Continue" });
      await expect(continueButton).toBeVisible();
      await expect
        .poll(async () => page.evaluate(() => window.location.hash))
        .toBe("");
      await continueButton.click();
      await expect(page).toHaveURL(/\/admin\/set-password\/?$/);

      // VerifyOtp has established an Auth session, but pending database state
      // Remains authoritative until the password-and-audit RPC completes.
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/admin\/login\/?$/);
      await page.goto("/admin/set-password");
      await expect(page.getByLabel("New password")).toBeVisible();

      await page.getByLabel("New password").fill(password);
      await page.getByLabel("Confirm password").fill(password);
      await page.getByRole("button", { name: "Set password" }).click();
      await expect(page).toHaveURL(/\/admin\/?$/);
      await expect(page.getByTestId("session-user")).toContainText(
        "TEST Invited Staff",
      );
      await expect(page.getByText("staff", { exact: true })).toBeVisible();

      const completedProfile = await db
        .from("staff_profiles")
        .select("role, active, onboarded_at")
        .eq("id", profileId)
        .single();
      expect(completedProfile.error).toBeNull();
      expect(completedProfile.data?.role).toBe("staff");
      expect(completedProfile.data?.active).toBe(true);
      expect(z.string().safeParse(completedProfile.data?.onboarded_at).success).toBe(
        true,
      );

      const audit = await db
        .from("audit_log")
        .select("action")
        .eq("entity_id", profileId)
        .eq("action", "staff.onboard");
      expect(audit.error).toBeNull();
      expect(audit.data).toHaveLength(1);

      await page.getByRole("button", { name: "Sign out" }).click();
      await page.goto(confirmPath);
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: "invalid or expired" }),
      ).toBeVisible();
    } finally {
      if (profileId !== null && profileId !== "") {
        await db.from("audit_log").delete().eq("entity_id", profileId);
      }
      await db.from("staff_profiles").delete().eq("user_id", userId);
      await db.auth.admin.deleteUser(userId);
    }
  });

  test("VAL-ADMIN-020: recovery rejects superseded links without consuming valid links on refresh or validation", async ({
    page,
  }) => {
    const db = serviceDb();
    const email =
      "recovery-validation-" + randomUUID().slice(0, 8) + "@example.test";
    const originalPassword = `Original-${randomUUID()}-aA1!`;
    const validPassword = `Replacement-${randomUUID()}-aA1!`;
    const created = await db.auth.admin.createUser({
      email,
      password: originalPassword,
      email_confirm: true,
    });
    expect(created.error).toBeNull();
    const userId = requireText(
      created.data.user?.id,
      "Recovery validation fixture failed",
    );

    let profileId: string | null = null;
    try {
      const profile = await db
        .from("staff_profiles")
        .insert({
          user_id: userId,
          email,
          display_name: "TEST Recovery Validation",
          role: "staff",
          active: true,
          onboarded_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      expect(profile.error).toBeNull();
      profileId = requireDecoded(
        idRowSchema.safeParse(profile.data),
        "Recovery validation profile failed",
      ).id;

      const generated = await db.auth.admin.generateLink({
        type: "recovery",
        email,
      });
      expect(generated.error).toBeNull();
      const supersededTokenHash = requireText(
        generated.data.properties?.hashed_token,
        "Superseded recovery link failed",
      );

      const latestGenerated = await db.auth.admin.generateLink({
        type: "recovery",
        email,
      });
      expect(latestGenerated.error).toBeNull();
      const tokenHash = requireText(
        latestGenerated.data.properties?.hashed_token,
        "Recovery validation link failed",
      );
      const confirmPath =
        "/admin/auth/confirm#token_hash=" +
        encodeURIComponent(tokenHash) +
        "&type=recovery";

      await page.goto(
        "/admin/auth/confirm#token_hash=" +
          encodeURIComponent(supersededTokenHash) +
          "&type=recovery",
      );
      await page.getByLabel("New password").fill(validPassword);
      await page.getByLabel("Confirm password").fill(validPassword);
      await page
        .getByRole("button", { name: "Set password and continue" })
        .click();
      await expect(
        page.getByRole("alert").filter({ hasText: "invalid or expired" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Request a new link" }).first(),
      ).toBeVisible();

      await page.goto(confirmPath);
      await expect(page.getByLabel("New password")).toBeVisible();
      await expect
        .poll(async () => page.evaluate(() => window.location.hash))
        .toBe("");
      await page.reload();
      await expect(page).toHaveURL(/\/admin\/auth\/confirm\/?$/);
      await expect(
        page.getByRole("link", { name: "Request a new link" }).first(),
      ).toBeVisible();

      // Reopening the email link is still valid because page load and refresh
      // Did not verify the bearer.
      await page.goto(confirmPath);
      const newPasswordInput = page.getByLabel("New password");
      const confirmationInput = page.getByLabel("Confirm password");
      await expect(newPasswordInput).toHaveAttribute(
        "autocomplete",
        "new-password",
      );
      await expect(confirmationInput).toHaveAttribute(
        "autocomplete",
        "new-password",
      );

      // Browser-known minimum failure does not dispatch the action.
      await newPasswordInput.fill("12345678901");
      await confirmationInput.fill("12345678901");
      await page
        .getByRole("button", { name: "Set password and continue" })
        .click();
      expect(
        await newPasswordInput.evaluate(
          (input: HTMLInputElement) => input.validationMessage.length,
        ),
      ).toBeGreaterThan(0);

      // Server-known mismatch also returns before verifyOtp. Enter-key
      // Submission is part of the keyboard contract.
      await newPasswordInput.fill(validPassword);
      await confirmationInput.fill(`${validPassword}-different`);
      await confirmationInput.press("Enter");
      await expect(page.locator("#password-error")).toHaveText(
        "The passwords do not match.",
      );
      const beforeSuccessAudit = await db
        .from("audit_log")
        .select("action")
        .eq("entity_id", profileId)
        .eq("action", "staff.password_reset");
      expect(beforeSuccessAudit.error).toBeNull();
      expect(beforeSuccessAudit.data).toHaveLength(0);

      // GoTrue rejects reusing the current password after verifyOtp. The
      // Signed retry marker must keep this bounded verified flow usable
      // Without a second email or a second audit event.
      await newPasswordInput.fill(originalPassword);
      await confirmationInput.fill(originalPassword);
      await page
        .getByRole("button", { name: "Set password and continue" })
        .click();
      await expect(page.locator("#password-error")).toContainText(
        "We couldn’t use that password.",
      );
      const afterProviderRejectionAudit = await db
        .from("audit_log")
        .select("action")
        .eq("entity_id", profileId)
        .eq("action", "staff.password_reset");
      expect(afterProviderRejectionAudit.error).toBeNull();
      expect(afterProviderRejectionAudit.data).toHaveLength(0);

      await newPasswordInput.fill(validPassword);
      await confirmationInput.fill(validPassword);
      await page
        .getByRole("button", { name: "Set password and continue" })
        .click();
      await expect(page).toHaveURL(/\/admin\/?$/);
      const afterSuccessAudit = await db
        .from("audit_log")
        .select("action")
        .eq("entity_id", profileId)
        .eq("action", "staff.password_reset");
      expect(afterSuccessAudit.error).toBeNull();
      expect(afterSuccessAudit.data).toHaveLength(1);
    } finally {
      if (profileId !== null && profileId !== "") {
        await db.from("audit_log").delete().eq("entity_id", profileId);
      }
      await db.from("staff_profiles").delete().eq("user_id", userId);
      await db.auth.admin.deleteUser(userId);
    }
  });

  test("VAL-ADMIN-016: recovery changes an active password once, audits it, and rejects deactivated staff", async ({
    page,
  }) => {
    const db = serviceDb();
    const email =
      "recovery-auth-" + randomUUID().slice(0, 8) + "@example.test";
    const oldPassword = "Before-" + randomUUID() + "-aA1!";
    const newPassword = "After-" + randomUUID() + "-aA1!";
    const created = await db.auth.admin.createUser({
      email,
      password: oldPassword,
      email_confirm: true,
      app_metadata: { role: "staff" },
    });
    expect(created.error).toBeNull();
    const userId = requireText(
      created.data.user?.id,
      "Recovery user creation failed",
    );

    let profileId: string | null = null;
    try {
      const profile = await db
        .from("staff_profiles")
        .insert({
          user_id: userId,
          email,
          display_name: "TEST Recovery Staff",
          role: "staff",
          active: true,
          onboarded_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      expect(profile.error).toBeNull();
      profileId = requireDecoded(
        idRowSchema.safeParse(profile.data),
        "Recovery profile creation failed",
      ).id;

      let deliberateActivations = 0;
      await page.goto("/admin/login");
      await page.getByLabel("Email").fill(email);
      await page.getByRole("button", { name: "Forgot password?" }).click();
      deliberateActivations += 1;
      await expect(page).toHaveURL(/\/admin\/login\/?$/);
      await expect(page.getByLabel("Email")).toBeFocused();
      await expect(page.getByLabel("Email")).toHaveValue(email);

      await page.getByRole("button", { name: "Send reset link" }).click();
      deliberateActivations += 1;
      await expect(page.getByTestId("reset-request-result")).toHaveText(
        RESET_REQUEST_MESSAGE,
      );

      // Generated-link seam stands in for opening hosted SMTP while keeping
      // Bearer values out of retained artifacts and test output.
      const generated = await db.auth.admin.generateLink({
        type: "recovery",
        email,
      });
      expect(generated.error).toBeNull();
      const tokenHash = requireText(
        generated.data.properties?.hashed_token,
        "Recovery link generation failed",
      );
      const confirmPath =
        "/admin/auth/confirm#token_hash=" +
        encodeURIComponent(tokenHash) +
        "&type=recovery";

      await page.goto(confirmPath);
      deliberateActivations += 1;
      await expect
        .poll(async () => page.evaluate(() => window.location.hash))
        .toBe("");
      await expect(page.getByLabel("New password")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Continue", exact: true }),
      ).toHaveCount(0);
      await page.getByLabel("New password").fill(newPassword);
      await page.getByLabel("Confirm password").fill(newPassword);
      await page
        .getByRole("button", { name: "Set password and continue" })
        .click();
      deliberateActivations += 1;
      expect(deliberateActivations).toBe(4);
      await expect(page).toHaveURL(/\/admin\/?$/);
      await expect(page.getByTestId("session-user")).toContainText(
        "TEST Recovery Staff",
      );
      await expect(page.getByLabel("Password")).toHaveCount(0);
      await page.reload();
      await expect(page).toHaveURL(/\/admin\/?$/);
      await expect(page.getByTestId("session-user")).toContainText(
        "TEST Recovery Staff",
      );

      const audit = await db
        .from("audit_log")
        .select("action")
        .eq("entity_id", profileId)
        .eq("action", "staff.password_reset");
      expect(audit.error).toBeNull();
      expect(audit.data).toHaveLength(1);

      // The bearer was consumed by the combined submit and cannot be reused.
      await page.getByRole("button", { name: "Sign out" }).click();
      await page.goto(confirmPath);
      await page.getByLabel("New password").fill(newPassword);
      await page.getByLabel("Confirm password").fill(newPassword);
      await page
        .getByRole("button", { name: "Set password and continue" })
        .click();
      await expect(
        page.getByRole("alert").filter({ hasText: "invalid or expired" }),
      ).toBeVisible();

      await page.goto("/admin/login");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(oldPassword);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.locator("#login-error")).toHaveText(
        GENERIC_LOGIN_ERROR,
      );
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(newPassword);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page).toHaveURL(/\/admin\/?$/);
      await page.getByRole("button", { name: "Sign out" }).click();

      const deactivatedEmail =
        "recovery-deactivated-" +
        randomUUID().slice(0, 8) +
        "@example.test";
      const deactivated = await db.auth.admin.createUser({
        email: deactivatedEmail,
        password: "Inactive-" + randomUUID() + "-aA1!",
        email_confirm: true,
      });
      expect(deactivated.error).toBeNull();
      const deactivatedId = requireText(
        deactivated.data.user?.id,
        "Deactivated fixture failed",
      );

      try {
        const deactivatedProfile = await db.from("staff_profiles").insert({
          user_id: deactivatedId,
          email: deactivatedEmail,
          display_name: "TEST Deactivated Recovery",
          role: "staff",
          active: false,
          onboarded_at: new Date().toISOString(),
        });
        expect(deactivatedProfile.error).toBeNull();

        const deactivatedLink = await db.auth.admin.generateLink({
          type: "recovery",
          email: deactivatedEmail,
        });
        expect(deactivatedLink.error).toBeNull();
        const deactivatedToken = requireText(
          deactivatedLink.data.properties?.hashed_token,
          "Deactivated recovery link generation failed",
        );

        await page.goto(
          "/admin/auth/confirm#token_hash=" +
            encodeURIComponent(deactivatedToken) +
            "&type=recovery",
        );
        await page.getByLabel("New password").fill(newPassword);
        await page.getByLabel("Confirm password").fill(newPassword);
        await page
          .getByRole("button", { name: "Set password and continue" })
          .click();
        await expect(
          page.getByRole("alert").filter({ hasText: "invalid or expired" }),
        ).toBeVisible();
        const deniedProfile = await db
          .from("staff_profiles")
          .select("active, onboarded_at")
          .eq("user_id", deactivatedId)
          .single();
        expect(deniedProfile.data?.active).toBe(false);
        expect(z.string().safeParse(deniedProfile.data?.onboarded_at).success).toBe(
          true,
        );
      } finally {
        await db
          .from("staff_profiles")
          .delete()
          .eq("user_id", deactivatedId);
        await db.auth.admin.deleteUser(deactivatedId);
      }
    } finally {
      if (profileId !== null && profileId !== "") {
        await db.from("audit_log").delete().eq("entity_id", profileId);
      }
      await db.from("staff_profiles").delete().eq("user_id", userId);
      await db.auth.admin.deleteUser(userId);
    }
  });

  test("VAL-ADMIN-016: recovery refuses missing and non-onboarded staff profiles", async ({
    page,
  }) => {
    const db = serviceDb();

    for (const eligibility of ["missing", "non-onboarded"] as const) {
      const email =
        `recovery-${eligibility}-` +
        randomUUID().slice(0, 8) +
        "@example.test";
      const originalPassword = `Original-${randomUUID()}-aA1!`;
      const attemptedPassword = `Attempted-${randomUUID()}-aA1!`;
      const created = await db.auth.admin.createUser({
        email,
        password: originalPassword,
        email_confirm: true,
      });
      expect(created.error).toBeNull();
      const userId = requireText(
        created.data.user?.id,
        "Ineligible recovery fixture failed",
      );

      let profileId: string | null = null;
      try {
        if (eligibility === "non-onboarded") {
          const profile = await db
            .from("staff_profiles")
            .insert({
              user_id: userId,
              email,
              display_name: "TEST Non-onboarded Recovery",
              role: "staff",
              active: true,
              onboarded_at: null,
            })
            .select("id")
            .single();
          expect(profile.error).toBeNull();
          profileId = requireDecoded(
            idRowSchema.safeParse(profile.data),
            "Non-onboarded recovery profile failed",
          ).id;
        }

        const generated = await db.auth.admin.generateLink({
          type: "recovery",
          email,
        });
        expect(generated.error).toBeNull();
        const tokenHash = requireText(
          generated.data.properties?.hashed_token,
          "Ineligible recovery link failed",
        );

        // Force a fresh document so the two identity fixtures cannot share
        // Mounted server-action or fragment state. Same-tab replacement is
        // Exercised separately by VAL-ADMIN-020.
        await page.goto("about:blank");
        await page.goto(
          "/admin/auth/confirm#token_hash=" +
            encodeURIComponent(tokenHash) +
            "&type=recovery",
        );
        await expect
          .poll(async () => page.evaluate(() => window.location.hash))
          .toBe("");
        await page.getByLabel("New password").fill(attemptedPassword);
        await page.getByLabel("Confirm password").fill(attemptedPassword);
        await page
          .getByRole("button", { name: "Set password and continue" })
          .click();
        await expect(
          page.getByRole("alert").filter({ hasText: "invalid or expired" }),
        ).toBeVisible();
        await expect(page).toHaveURL(/\/admin\/auth\/confirm\/?$/);

        if (profileId !== null && profileId !== "") {
          const audit = await db
            .from("audit_log")
            .select("action")
            .eq("entity_id", profileId)
            .eq("action", "staff.password_reset");
          expect(audit.error).toBeNull();
          expect(audit.data).toHaveLength(0);
        }

        const loginProbe = browserDb();
        const oldPasswordStillWorks = await loginProbe.auth.signInWithPassword({
          email,
          password: originalPassword,
        });
        expect(oldPasswordStillWorks.error).toBeNull();
        expect(oldPasswordStillWorks.data.user?.id).toBe(userId);
        await loginProbe.auth.signOut();
      } finally {
        if (profileId !== null && profileId !== "") {
          await db.from("audit_log").delete().eq("entity_id", profileId);
        }
        await db.from("staff_profiles").delete().eq("user_id", userId);
        await db.auth.admin.deleteUser(userId);
      }
    }
  });

  test("VAL-ADMIN-013: direct table and RPC access remain closed", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const anon = browserDb();
    const db = serviceDb();
    const tables = [
      "requests",
      "request_events",
      "notification_recipients",
      "staff_profiles",
      "audit_log",
    ] as const;
    const missingId = randomUUID();
    const rpcCalls = [
      {
        name: "portal_update_request_status",
        args: {
          p_actor_email: "",
          p_request_id: missingId,
          p_next_status: "new",
        },
      },
      {
        name: "portal_add_request_note",
        args: {
          p_actor_email: "",
          p_request_id: missingId,
          p_note: "TEST denied note",
          p_note_length: 16,
        },
      },
      {
        name: "portal_check_intake_rate_limit",
        args: {
          p_client_hash: "a".repeat(64),
          p_limit: 1,
          p_window_seconds: 1,
        },
      },
      {
        name: "portal_close_request",
        args: {
          p_actor_email: "",
          p_request_id: missingId,
          p_disposition: "unconverted",
        },
      },
      {
        name: "portal_complete_staff_onboarding",
        args: { p_user_id: missingId },
      },
      {
        name: "portal_delete_request_early",
        args: {
          p_actor_email: "",
          p_request_id: missingId,
          p_authorization_ref: "TEST-1",
        },
      },
      {
        name: "portal_preview_data_lifecycle",
        args: { p_now: new Date().toISOString() },
      },
      {
        name: "portal_record_staff_password_reset",
        args: { p_user_id: missingId },
      },
      {
        name: "portal_run_data_lifecycle",
        args: {
          p_actor_email: "",
          p_now: new Date().toISOString(),
        },
      },
      {
        name: "portal_set_request_legal_hold",
        args: {
          p_actor_email: "",
          p_request_id: missingId,
          p_held: true,
          p_reason: "TEST",
        },
      },
    ];

    for (const table of tables) {
      const result = await anon.from(table).select("id");
      expectAnonymousReadClosed(result);
    }
    for (const call of rpcCalls) {
      expectDenied(await anon.rpc(call.name, call.args));
    }

    const staleEmail = `stale-${randomUUID().slice(0, 8)}@example.test`;
    const stalePassword = `St-${randomUUID()}-aA1!`;
    const { data: staleUser, error: staleCreateError } =
      await db.auth.admin.createUser({
        email: staleEmail,
        password: stalePassword,
        email_confirm: true,
        app_metadata: { role: "staff" },
      });
    expect(staleCreateError).toBeNull();
    const staleUserId = requireText(
      staleUser.user?.id,
      "Stale-token user creation failed",
    );

    const staleClient = browserDb();
    try {
      const { error: staleProfileError } = await db
        .from("staff_profiles")
        .insert({
          user_id: staleUserId,
          email: staleEmail,
          display_name: "TEST Stale Token",
          role: "staff",
          active: true,
          onboarded_at: new Date().toISOString(),
        });
      expect(staleProfileError).toBeNull();

      await page.goto("/admin/login");
      await page.getByLabel("Email").fill(staleEmail);
      await page.getByLabel("Password").fill(stalePassword);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 15_000 });
      for (const path of [
        "/admin",
        "/admin/settings",
        "/admin/settings/software",
      ]) {
        await page.goto(path);
        await expect(page).toHaveURL(new RegExp(`${path}/?$`));
        await expect(page.getByTestId("session-user")).toContainText(
          "TEST Stale Token",
        );
        if (path === "/admin") {
          await expect(page.getByTestId("home-greeting")).toBeVisible();
        } else if (path === "/admin/settings") {
          await expect(page.getByTestId("recipients-manager")).toBeVisible();
        } else {
          await expect(
            page.getByTestId("managed-product"),
          ).toBeVisible();
        }
      }

      const staleSignIn = await staleClient.auth.signInWithPassword({
        email: staleEmail,
        password: stalePassword,
      });
      expect(staleSignIn.error).toBeNull();
      expect(staleSignIn.data.user?.app_metadata.role).toBe("staff");

      const { error: staleDeactivateError } = await db
        .from("staff_profiles")
        .update({ active: false })
        .eq("user_id", staleUserId);
      expect(staleDeactivateError).toBeNull();

      for (const table of tables) {
        expectDenied(await staleClient.from(table).select("id"));
      }
      for (const call of rpcCalls) {
        expectDenied(await staleClient.rpc(call.name, call.args));
      }
    } finally {
      await staleClient.auth.signOut({ scope: "local" });
      await db.from("staff_profiles").delete().eq("user_id", staleUserId);
      await db.auth.admin.deleteUser(staleUserId);
    }

    const authenticated = browserDb();
    const signIn = await authenticated.auth.signInWithPassword({
      email: SEED_ADMIN_EMAIL,
      password: SEED_ADMIN_PASSWORD,
    });
    expect(signIn.error).toBeNull();
    expect(Boolean(signIn.data.session?.access_token)).toBe(true);
    expect(signIn.data.user?.id).toBeTruthy();
    if (signIn.data.user === null) {
      throw new Error("Seeded Auth user is missing");
    }

    const { data: profile, error: profileError } = await db
      .from("staff_profiles")
      .select("user_id, display_name")
      .eq("user_id", signIn.data.user.id)
      .single();
    expect(profileError).toBeNull();
    const seededProfile = staffIdentitySchema.safeParse(profile);
    expect(seededProfile.success).toBe(true);
    if (!seededProfile.success) {
      throw new Error("Seeded staff profile is missing");
    }

    const attemptedDisplayName = `TEST denied ${randomUUID()}`;

    try {
      const profileWrite = await authenticated
        .from("staff_profiles")
        .update({ display_name: attemptedDisplayName })
        .eq("user_id", seededProfile.data.user_id)
        .select("id");
      expectDenied(profileWrite);

      const profileCheck = await db
        .from("staff_profiles")
        .select("display_name")
        .eq("user_id", seededProfile.data.user_id)
        .single();
      expect(profileCheck.error).toBeNull();
      const checkedName = displayNameRowSchema.safeParse(profileCheck.data);
      expect(checkedName.success).toBe(true);
      if (!checkedName.success) {
        throw new Error("Seeded staff profile name is missing");
      }
      expect(digest(checkedName.data.display_name)).toBe(
        digest(seededProfile.data.display_name),
      );
    } finally {
      const currentProfile = await db
        .from("staff_profiles")
        .select("display_name")
        .eq("user_id", seededProfile.data.user_id)
        .single();
      const currentName = displayNameRowSchema.safeParse(currentProfile.data);
      if (
        currentProfile.error === null &&
        currentName.success &&
        currentName.data.display_name !== seededProfile.data.display_name
      ) {
        await db
          .from("staff_profiles")
          .update({ display_name: seededProfile.data.display_name })
          .eq("user_id", seededProfile.data.user_id);
      }

      await authenticated.auth.signOut({ scope: "local" });
    }
  });
});
