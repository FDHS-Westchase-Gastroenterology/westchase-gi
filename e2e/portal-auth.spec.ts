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
  expect(result.error).not.toBeNull();
  expect(
    result.error?.code === "42501" ||
      result.status === 401 ||
      result.status === 403,
  ).toBe(true);
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
      (await page.getByTestId("session-email").textContent()) ?? ""
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

  test("VAL-ADMIN-013: anon reads and authenticated registry writes remain closed", async () => {
    const anon = browserDb();
    const db = serviceDb();

    for (const table of [
      "requests",
      "notification_recipients",
      "staff_profiles",
      "audit_log",
    ] as const) {
      const result = await anon.from(table).select("id");
      expectAnonymousReadClosed(result);
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
