import { randomUUID } from "node:crypto";

import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { StaffRole } from "../../src/lib/portal/contracts";
import { seedAdmin, serviceDb } from "./env";
import type { Credentials } from "./env";

/* Staff sessions for the portal specs: one way to sign in, one way to mint a
   throwaway staff account and remove it afterwards. */

/** Submits the sign-in form without waiting; for asserting a refusal. */
export async function attemptSignIn(page: Page, credentials: Credentials): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/**
 * Records the account's first-sign-in tour as finished unless it already has
 * a record, so a spec about something else signs in to the screen it tests
 * rather than to the tour (tours.ts). The tour specs sign in with `tour`.
 */
async function settleTour(email: string): Promise<void> {
  const db = serviceDb();
  const { data: profile, error } = await db
    .from("staff_profiles")
    .select("user_id, role")
    .eq("email", email)
    .maybeSingle<{ user_id: string; role: StaffRole }>();
  if (error !== null) throw new Error(`Tour fixture lookup failed: ${error.code}`);
  if (profile === null) return;
  const settled = await db.from("staff_tours").upsert(
    {
      staff_user_id: profile.user_id,
      tour: profile.role === "admin" ? "admin" : "front_desk",
      status: "finished",
    },
    { onConflict: "staff_user_id,tour", ignoreDuplicates: true },
  );
  if (settled.error !== null) throw new Error(`Tour fixture failed: ${settled.error.code}`);
}

/**
 * Signs in and settles on /admin before returning. A goto that races the
 * login action loses the session cookie write, so callers must not navigate
 * until this resolves. The account's tour is settled first unless the spec
 * is about the tour.
 */
export async function signIn(
  page: Page,
  credentials: Credentials = seedAdmin(),
  options: Readonly<{ tour?: boolean }> = {},
): Promise<void> {
  if (options.tour !== true) await settleTour(credentials.email);
  await attemptSignIn(page, credentials);
  // Sign-in lands an admin's first tour on Settings › Providers, where it starts.
  const landing = options.tour === true ? /\/admin(\/settings\/providers)?\/?$/ : /\/admin\/?$/;
  await expect(page).toHaveURL(landing, { timeout: 15_000 });
}

export interface StaffFixture extends Credentials {
  readonly userId: string;
  /** Removes the profile and the Auth user; safe to call in a finally block. */
  dispose(): Promise<void>;
}

/**
 * An onboarded staff account that exists only for one spec. The address is
 * on the reserved .test TLD so global setup's stale-fixture sweep can never
 * touch a seed or real account.
 */
export async function createStaffFixture(
  db: SupabaseClient,
  options: Readonly<{ prefix: string; displayName: string; role?: StaffRole }>,
): Promise<StaffFixture> {
  const email = `${options.prefix}-${randomUUID().slice(0, 8)}@example.test`;
  const password = `Fx-${randomUUID()}-aA1!`;
  const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull();
  const userId = created.data.user?.id;
  if (userId === undefined || userId === "") {
    throw new Error(`Staff fixture creation failed for ${options.prefix}`);
  }
  const profile = await db.from("staff_profiles").insert({
    user_id: userId,
    email,
    display_name: options.displayName,
    role: options.role ?? "staff",
    active: true,
    onboarded_at: new Date().toISOString(),
  });
  if (profile.error) {
    await db.auth.admin.deleteUser(userId);
    throw new Error(`Staff fixture profile failed for ${options.prefix}: ${profile.error.code}`);
  }
  return {
    email,
    password,
    userId,
    async dispose() {
      await db.from("staff_profiles").delete().eq("user_id", userId);
      await db.auth.admin.deleteUser(userId);
    },
  };
}
