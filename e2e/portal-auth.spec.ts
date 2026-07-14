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
