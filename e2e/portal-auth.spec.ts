import { createHash, randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
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
const GENERIC_LOGIN_ERROR =
  "Unable to sign in. Check your credentials and try again.";
const RESET_REQUEST_MESSAGE =
  "If an active staff account exists for that email, a password reset link has been sent.";

type RestResult = {
  data: unknown;
  error: { code?: string } | null;
  status: number;
};

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
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

function expectDenied(result: RestResult): void {
  expect(result.error?.code).toBe("42501");
  expect([401, 403]).toContain(result.status);
}

function expectAnonymousReadClosed(result: RestResult): void {
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

  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Credential and RLS checks run once.",
    );
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

    const renderedEmail = (
      (await page.getByTestId("session-user").textContent()) ?? ""
    ).trim();
    expect(renderedEmail).not.toBe("");
    expect(digest(renderedEmail)).toBe(digest(SEED_ADMIN_EMAIL));

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login\/?$/);

    // Deactivation lockout is proven on a THROWAWAY account: toggling the
    // shared seed admin raced parallel spec files signed in as that user.
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
    const lockoutUserId = created?.user?.id;
    if (!lockoutUserId) throw new Error("Lockout user creation failed");

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
    const accounts: Array<{ id: string; email: string }> = [];

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
      for (const email of [
        accounts[0].email,
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
      if (unexpectedSignupId) {
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
    const userId = created.data.user?.id;
    if (!userId) throw new Error("Password-policy fixture failed");

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
    const userId = generated.data.user?.id;
    const tokenHash = generated.data.properties?.hashed_token;
    if (!userId || !tokenHash) {
      throw new Error("Invite link generation failed");
    }

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
      profileId = profile.data?.id ?? null;
      if (!profileId) throw new Error("Invite profile creation failed");

      const confirmPath =
        "/admin/auth/confirm#token_hash=" +
        encodeURIComponent(tokenHash) +
        "&type=invite";
      await page.goto(confirmPath);
      const continueButton = page.getByRole("button", { name: "Continue" });
      await expect(continueButton).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => window.location.hash))
        .toBe("");
      await continueButton.click();
      await expect(page).toHaveURL(/\/admin\/set-password\/?$/);

      // verifyOtp has established an Auth session, but pending database state
      // remains authoritative until the password-and-audit RPC completes.
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/admin\/login\/?$/);
      await page.goto("/admin/set-password");
      await expect(page.getByLabel("New password")).toBeVisible();

      await page.getByLabel("New password").fill(password);
      await page.getByLabel("Confirm password").fill(password);
      await page.getByRole("button", { name: "Set password" }).click();
      await expect(page).toHaveURL(/\/admin\/?$/);
      await expect(page.getByTestId("session-user")).toContainText(email);
      await expect(page.getByText("staff", { exact: true })).toBeVisible();

      const completedProfile = await db
        .from("staff_profiles")
        .select("role, active, onboarded_at")
        .eq("id", profileId)
        .single();
      expect(completedProfile.error).toBeNull();
      expect(completedProfile.data?.role).toBe("staff");
      expect(completedProfile.data?.active).toBe(true);
      expect(typeof completedProfile.data?.onboarded_at).toBe("string");

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
      if (profileId) {
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
    const userId = created.data.user?.id;
    if (!userId) throw new Error("Recovery user creation failed");

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
      profileId = profile.data?.id ?? null;
      if (!profileId) throw new Error("Recovery profile creation failed");

      const generated = await db.auth.admin.generateLink({
        type: "recovery",
        email,
      });
      expect(generated.error).toBeNull();
      const tokenHash = generated.data.properties?.hashed_token;
      if (!tokenHash) throw new Error("Recovery link generation failed");
      const confirmPath =
        "/admin/auth/confirm#token_hash=" +
        encodeURIComponent(tokenHash) +
        "&type=recovery";

      await page.goto(confirmPath);
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page).toHaveURL(/\/admin\/set-password\/?$/);
      await page.getByLabel("New password").fill(newPassword);
      await page.getByLabel("Confirm password").fill(newPassword);
      await page.getByRole("button", { name: "Set password" }).click();
      await expect(page).toHaveURL(/\/admin\/login\?password=updated$/);
      await expect(page.getByTestId("password-updated")).toBeVisible();

      const audit = await db
        .from("audit_log")
        .select("action")
        .eq("entity_id", profileId)
        .eq("action", "staff.password_reset");
      expect(audit.error).toBeNull();
      expect(audit.data).toHaveLength(1);

      // The bearer token was consumed by the explicit confirmation POST.
      await page.goto(confirmPath);
      await page.getByRole("button", { name: "Continue" }).click();
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
      const deactivatedId = deactivated.data.user?.id;
      if (!deactivatedId) throw new Error("Deactivated fixture failed");

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
        const deactivatedToken =
          deactivatedLink.data.properties?.hashed_token;
        if (!deactivatedToken) {
          throw new Error("Deactivated recovery link generation failed");
        }

        await page.goto(
          "/admin/auth/confirm#token_hash=" +
            encodeURIComponent(deactivatedToken) +
            "&type=recovery",
        );
        await page.getByRole("button", { name: "Continue" }).click();
        await expect(
          page.getByRole("alert").filter({ hasText: "invalid or expired" }),
        ).toBeVisible();
        const deniedProfile = await db
          .from("staff_profiles")
          .select("active, onboarded_at")
          .eq("user_id", deactivatedId)
          .single();
        expect(deniedProfile.data?.active).toBe(false);
        expect(typeof deniedProfile.data?.onboarded_at).toBe("string");
      } finally {
        await db
          .from("staff_profiles")
          .delete()
          .eq("user_id", deactivatedId);
        await db.auth.admin.deleteUser(deactivatedId);
      }
    } finally {
      if (profileId) {
        await db.from("audit_log").delete().eq("entity_id", profileId);
      }
      await db.from("staff_profiles").delete().eq("user_id", userId);
      await db.auth.admin.deleteUser(userId);
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
      "registry_assets",
      "registry_grants",
      "audit_log",
    ] as const;
    const missingId = randomUUID();
    const rpcCalls = [
      {
        name: "portal_create_registry_asset",
        args: {
          p_actor_email: "",
          p_name: `TEST denied RPC ${missingId}`,
          p_kind: "test",
          p_repo: null,
          p_live_url: null,
          p_hosting: null,
          p_maintainer: "TEST automation",
          p_status: "test",
          p_notes: null,
        },
      },
      {
        name: "portal_update_registry_asset",
        args: {
          p_actor_email: "",
          p_asset_id: missingId,
          p_name: "TEST denied RPC update",
          p_kind: "test",
          p_repo: null,
          p_live_url: null,
          p_hosting: null,
          p_maintainer: "TEST automation",
          p_status: "test",
          p_notes: null,
        },
      },
      {
        name: "portal_archive_registry_asset",
        args: { p_actor_email: "", p_asset_id: missingId },
      },
      {
        name: "portal_add_registry_grant",
        args: {
          p_actor_email: "",
          p_asset_id: missingId,
          p_person: "TEST automation",
          p_role: "test",
          p_granted_via: "e2e",
        },
      },
      {
        name: "portal_deactivate_registry_grant",
        args: { p_actor_email: "", p_grant_id: missingId },
      },
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
        name: "portal_complete_staff_onboarding",
        args: { p_user_id: missingId },
      },
      {
        name: "portal_record_staff_password_reset",
        args: { p_user_id: missingId },
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
    const staleUserId = staleUser.user?.id;
    if (!staleUserId) throw new Error("Stale-token user creation failed");

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
          staleEmail,
        );
        if (path === "/admin") {
          await expect(
            page.getByRole("heading", {
              name: "Appointment requests",
              exact: true,
            }),
          ).toBeVisible();
        } else if (path === "/admin/settings") {
          await expect(page.getByTestId("recipients-manager")).toBeVisible();
        } else {
          await expect(
            page.locator('[data-asset-name="Westchase GI website"]'),
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
    if (!signIn.data.user) throw new Error("Seeded Auth user is missing");

    const { data: profile, error: profileError } = await db
      .from("staff_profiles")
      .select("user_id, display_name")
      .eq("user_id", signIn.data.user.id)
      .single();
    expect(profileError).toBeNull();
    if (!profile) throw new Error("Seeded staff profile is missing");

    let anchorAssetId: string | null = null;
    let createdAnchorAsset = false;
    const existingAsset = await db
      .from("registry_assets")
      .select("id")
      .limit(1)
      .maybeSingle();
    expect(existingAsset.error).toBeNull();
    anchorAssetId = existingAsset.data?.id ?? null;

    if (!anchorAssetId) {
      anchorAssetId = randomUUID();
      const { error } = await db.from("registry_assets").insert({
        id: anchorAssetId,
        name: `TEST RLS anchor ${anchorAssetId}`,
        kind: "test",
        maintainer: "TEST automation",
        status: "test",
      });
      expect(error).toBeNull();
      createdAnchorAsset = true;
    }

    const attemptedAssetId = randomUUID();
    const attemptedGrantId = randomUUID();
    const attemptedDisplayName = `TEST denied ${randomUUID()}`;

    try {
      const [assetWrite, grantWrite, profileWrite] = await Promise.all([
        authenticated
          .from("registry_assets")
          .insert({
            id: attemptedAssetId,
            name: `TEST denied ${attemptedAssetId}`,
            kind: "test",
            maintainer: "TEST automation",
            status: "test",
          })
          .select("id"),
        authenticated
          .from("registry_grants")
          .insert({
            id: attemptedGrantId,
            asset_id: anchorAssetId,
            person: "TEST automation",
            role: "viewer",
            granted_via: "e2e",
          })
          .select("id"),
        authenticated
          .from("staff_profiles")
          .update({ display_name: attemptedDisplayName })
          .eq("user_id", profile.user_id)
          .select("id"),
      ]);

      expectDenied(assetWrite);
      expectDenied(grantWrite);
      expectDenied(profileWrite);

      const [assetCheck, grantCheck, profileCheck] = await Promise.all([
        db
          .from("registry_assets")
          .select("id")
          .eq("id", attemptedAssetId)
          .maybeSingle(),
        db
          .from("registry_grants")
          .select("id")
          .eq("id", attemptedGrantId)
          .maybeSingle(),
        db
          .from("staff_profiles")
          .select("display_name")
          .eq("user_id", profile.user_id)
          .single(),
      ]);

      expect(assetCheck.error).toBeNull();
      expect(grantCheck.error).toBeNull();
      expect(profileCheck.error).toBeNull();
      expect(assetCheck.data).toBeNull();
      expect(grantCheck.data).toBeNull();
      expect(
        digest(profileCheck.data?.display_name ?? ""),
      ).toBe(digest(profile.display_name));
    } finally {
      await db
        .from("registry_grants")
        .delete()
        .eq("id", attemptedGrantId);
      await db
        .from("registry_assets")
        .delete()
        .eq("id", attemptedAssetId);

      const currentProfile = await db
        .from("staff_profiles")
        .select("display_name")
        .eq("user_id", profile.user_id)
        .single();
      if (
        !currentProfile.error &&
        currentProfile.data?.display_name !== profile.display_name
      ) {
        await db
          .from("staff_profiles")
          .update({ display_name: profile.display_name })
          .eq("user_id", profile.user_id);
      }

      if (createdAnchorAsset) {
        await db
          .from("registry_assets")
          .delete()
          .eq("id", anchorAssetId);
      }
      await authenticated.auth.signOut({ scope: "local" });
    }
  });
});
