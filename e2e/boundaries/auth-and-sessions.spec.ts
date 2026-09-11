import { randomUUID } from "node:crypto";

import { test, expect } from "@playwright/test";

import { expectDenied } from "../harness/assert";
import { publishableDb, serviceDb } from "../harness/env";
import { SEED_EMAIL, SEED_PASSWORD, expectDeniedSurface } from "./support";

test.use({ trace: "off" });

test.describe("Auth refresh, SSR cookie sessions, and the closed Data API", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "The dependency contract runs once.");
  });

  test("preserves direct Auth refresh and the portal's SSR cookie session", async ({ page }) => {
    const client = publishableDb();
    const signIn = await client.auth.signInWithPassword({
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
    });
    expect(signIn.error).toBeNull();
    expect(signIn.data.session?.access_token).toBeTruthy();
    expect(signIn.data.user?.email).toBe(SEED_EMAIL);

    const refresh = await client.auth.refreshSession();
    expect(refresh.error).toBeNull();
    expect(refresh.data.session?.access_token).toBeTruthy();
    expect(refresh.data.user?.id).toBe(signIn.data.user?.id);

    const verified = await client.auth.getUser();
    expect(verified.error).toBeNull();
    expect(verified.data.user?.id).toBe(signIn.data.user?.id);
    expect((await client.auth.signOut({ scope: "local" })).error).toBeNull();

    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(SEED_EMAIL);
    await page.getByLabel("Password").fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/?$/);
    const { data: sessionProfile } = await serviceDb()
      .from("staff_profiles")
      .select("display_name")
      .eq("email", SEED_EMAIL.toLowerCase())
      .single();
    const sessionName = String(sessionProfile?.display_name ?? "");
    expect(sessionName).not.toBe("");
    await expect(page.getByTestId("session-user")).toContainText(sessionName);

    await page.reload();
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByTestId("session-user")).toContainText(sessionName);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login\/?$/);
  });

  test("keeps direct Data API access closed while the service client can read", async () => {
    const anon = publishableDb();
    await expectDeniedSurface(anon, {
      actorEmail: "anon@example.test",
      userId: randomUUID(),
      hashLabel: "anon",
    });

    const authenticated = publishableDb();
    const signIn = await authenticated.auth.signInWithPassword({
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
    });
    expect(signIn.error).toBeNull();

    try {
      await expectDeniedSurface(authenticated, {
        actorEmail: SEED_EMAIL,
        userId: signIn.data.user?.id ?? randomUUID(),
        hashLabel: "authenticated",
      });
      expectDenied(
        await authenticated
          .from("staff_profiles")
          .update({ display_name: "TEST forbidden" })
          .eq("user_id", signIn.data.user?.id ?? "")
          .select("id"),
      );

      const serviceRead = await serviceDb()
        .from("staff_profiles")
        .select("user_id, email, role, active")
        .eq("user_id", signIn.data.user?.id ?? "")
        .single();
      expect(serviceRead.error).toBeNull();
      expect(serviceRead.data).toMatchObject({
        email: SEED_EMAIL,
        role: "admin",
        active: true,
      });
    } finally {
      await authenticated.auth.signOut({ scope: "local" });
    }
  });
});
