import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv, requiredEnv, serviceDb } from "./support";
import {
  INTAKE_RATE_LIMIT,
  REQUEST_FIELD_LIMITS,
} from "../src/lib/portal/contracts";

loadLocalEnv();

const SUPABASE_URL = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_KEY = requiredEnv(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
);
const SEED_EMAIL = requiredEnv("PORTAL_SEED_ADMIN_EMAIL");
const SEED_PASSWORD = requiredEnv("PORTAL_SEED_ADMIN_PASSWORD");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PATIENT_PHONE = "8135550199";

function publicClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function expectPermissionDenied(result: {
  error: { code?: string } | null;
  status: number;
}): void {
  expect(result.error?.code).toBe("42501");
  expect([401, 403]).toContain(result.status);
}

function expectUuid(value: unknown): void {
  expect(value).toMatch(UUID_RE);
}

function expectNoPatientLeak(blob: unknown, note?: string | null): void {
  const text = JSON.stringify(blob);
  expect(text).not.toContain(note ?? "TEST patient value that is never present");
  expect(text).not.toContain(PATIENT_PHONE);
}

async function insertRequest(
  db: ReturnType<typeof serviceDb>,
  row: Record<string, unknown> & { id: string; name: string },
) {
  const inserted = await db.from("requests").insert({
    phone: PATIENT_PHONE,
    email: null,
    location: "tampa",
    preferred_time: "morning",
    message: null,
    locale: "en",
    source_path: "/e2e/dependency-contract",
    ...row,
  });
  expect(inserted.error).toBeNull();
}

async function expectDeniedSurface(
  client: ReturnType<typeof publicClient>,
  opts: { actorEmail: string; userId: string; hashLabel: string },
) {
  const { actorEmail, userId, hashLabel } = opts;
  const release = (fn: string) =>
    client.rpc(fn, { p_user_id: userId, p_release_id: "dependency-contract" });
  for (const probe of [
    () => client.from("staff_profiles").select("id"),
    () =>
      client.rpc("portal_check_intake_rate_limit", {
        p_client_hash: createHash("sha256").update(hashLabel).digest("hex"),
        p_limit: 1,
        p_window_seconds: 1,
      }),
    () =>
      client.rpc("portal_preview_data_lifecycle", {
        p_now: new Date().toISOString(),
      }),
    () =>
      client.rpc("portal_log_call_outcome", {
        p_actor_email: actorEmail,
        p_request_id: randomUUID(),
        p_outcome: "no_answer",
      }),
    () =>
      client.rpc("portal_undo_call_outcome", {
        p_actor_email: actorEmail,
        p_request_id: randomUUID(),
        p_event_id: randomUUID(),
      }),
    () =>
      client.rpc("portal_update_recipient_label", {
        p_actor_email: actorEmail,
        p_recipient_id: randomUUID(),
        p_label: "Blocked",
      }),
    () => client.from("portal_release_states").select("staff_user_id"),
    () => release("portal_open_staff_release"),
    () => release("portal_acknowledge_staff_release"),
    () => release("portal_hide_staff_release"),
    () => release("portal_record_staff_release_guide_open"),
    () => release("portal_record_staff_release_dismiss"),
  ]) {
    expectPermissionDenied(await probe());
  }
}

test.use({ trace: "off" });

test.describe("Supabase dependency contract", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "The dependency contract runs once.",
    );
  });

  test("preserves direct Auth refresh and the portal's SSR cookie session", async ({
    page,
  }) => {
    const client = publicClient();
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
    const anon = publicClient();
    await expectDeniedSurface(anon, {
      actorEmail: "anon@example.test",
      userId: randomUUID(),
      hashLabel: "anon",
    });

    const authenticated = publicClient();
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
      expectPermissionDenied(
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

  test("keeps portal release engagement per staff with atomic counters and audits", async () => {
    const db = serviceDb();
    const releaseId = `dependency-${randomUUID()}`;
    const legacyShapeReleaseId = `legacy-shape-${randomUUID()}`;
    const secondEmail = `release-second-${randomUUID()}@example.test`;
    const pendingEmail = `release-pending-${randomUUID()}@example.test`;
    const inactiveEmail = `release-inactive-${randomUUID()}@example.test`;
    const createdUserIds: string[] = [];
    const profileIds: string[] = [];

    const createProfile = async ({
      email,
      active,
      onboarded,
    }: {
      email: string;
      active: boolean;
      onboarded: boolean;
    }) => {
      const createdUser = await db.auth.admin.createUser({
        email,
        email_confirm: true,
        password: `T3st-${randomUUID()}!`,
      });
      expect(createdUser.error).toBeNull();
      const userId = createdUser.data.user?.id;
      if (!userId)
        throw new Error("Release-state Auth fixture was not created");
      createdUserIds.push(userId);

      const profileId = randomUUID();
      const inserted = await db.from("staff_profiles").insert({
        id: profileId,
        user_id: userId,
        email,
        display_name: "TEST release-state staff",
        role: "staff",
        active,
        onboarded_at: onboarded ? new Date().toISOString() : null,
      });
      expect(inserted.error).toBeNull();
      profileIds.push(profileId);
      return { userId, profileId };
    };

    const { data: seedProfile, error: seedProfileError } = await db
      .from("staff_profiles")
      .select("id, user_id, email")
      .eq("email", SEED_EMAIL)
      .single();
    expect(seedProfileError).toBeNull();
    if (!seedProfile) throw new Error("Seed staff profile is missing");

    try {
      const second = await createProfile({
        email: secondEmail,
        active: true,
        onboarded: true,
      });
      const pending = await createProfile({
        email: pendingEmail,
        active: true,
        onboarded: false,
      });
      const inactive = await createProfile({
        email: inactiveEmail,
        active: false,
        onboarded: true,
      });

      const firstOpen = await db.rpc("portal_open_staff_release", {
        p_user_id: seedProfile.user_id,
        p_release_id: releaseId,
      });
      expect(firstOpen.error).toBeNull();
      expect(firstOpen.data).toBe(true);

      const openedState = await db
        .from("portal_release_states")
        .select(
          "first_opened_at, last_viewed_at, view_count, acknowledged_at, hidden_at, guide_opened_at, last_guide_opened_at, guide_open_count, last_dismissed_at, dismiss_count",
        )
        .eq("staff_user_id", seedProfile.user_id)
        .eq("release_id", releaseId)
        .single();
      expect(openedState.error).toBeNull();
      expect(openedState.data).toMatchObject({
        first_opened_at: expect.any(String),
        last_viewed_at: expect.any(String),
        view_count: 1,
        acknowledged_at: null,
        hidden_at: null,
        guide_opened_at: null,
        last_guide_opened_at: null,
        guide_open_count: 0,
        last_dismissed_at: null,
        dismiss_count: 0,
      });
      expect(openedState.data?.last_viewed_at).toBe(
        openedState.data?.first_opened_at,
      );
      const firstOpenedAt = openedState.data?.first_opened_at;

      const repeatedOpen = await db.rpc("portal_open_staff_release", {
        p_user_id: seedProfile.user_id,
        p_release_id: releaseId,
      });
      expect(repeatedOpen.error).toBeNull();
      expect(repeatedOpen.data).toBe(false);

      const firstGuideOpen = await db.rpc(
        "portal_record_staff_release_guide_open",
        {
          p_user_id: seedProfile.user_id,
          p_release_id: releaseId,
        },
      );
      expect(firstGuideOpen.error).toBeNull();
      expect(firstGuideOpen.data).toBe(true);

      const firstDismiss = await db.rpc("portal_record_staff_release_dismiss", {
        p_user_id: seedProfile.user_id,
        p_release_id: releaseId,
      });
      expect(firstDismiss.error).toBeNull();
      expect(firstDismiss.data).toBe(true);

      const beforeConcurrentEvents = await db
        .from("portal_release_states")
        .select("guide_opened_at")
        .eq("staff_user_id", seedProfile.user_id)
        .eq("release_id", releaseId)
        .single();
      expect(beforeConcurrentEvents.error).toBeNull();
      const firstGuideOpenedAt = beforeConcurrentEvents.data?.guide_opened_at;

      const concurrentEvents = await Promise.all([
        ...Array.from({ length: 4 }, () =>
          db.rpc("portal_open_staff_release", {
            p_user_id: seedProfile.user_id,
            p_release_id: releaseId,
          }),
        ),
        ...Array.from({ length: 3 }, () =>
          db.rpc("portal_record_staff_release_guide_open", {
            p_user_id: seedProfile.user_id,
            p_release_id: releaseId,
          }),
        ),
        ...Array.from({ length: 2 }, () =>
          db.rpc("portal_record_staff_release_dismiss", {
            p_user_id: seedProfile.user_id,
            p_release_id: releaseId,
          }),
        ),
      ]);
      for (const event of concurrentEvents) {
        expect(event.error).toBeNull();
      }

      const countedState = await db
        .from("portal_release_states")
        .select(
          "first_opened_at, last_viewed_at, view_count, guide_opened_at, last_guide_opened_at, guide_open_count, last_dismissed_at, dismiss_count",
        )
        .eq("staff_user_id", seedProfile.user_id)
        .eq("release_id", releaseId)
        .single();
      expect(countedState.error).toBeNull();
      expect(countedState.data).toMatchObject({
        first_opened_at: firstOpenedAt,
        last_viewed_at: expect.any(String),
        view_count: 6,
        guide_opened_at: firstGuideOpenedAt,
        last_guide_opened_at: expect.any(String),
        guide_open_count: 4,
        last_dismissed_at: expect.any(String),
        dismiss_count: 3,
      });
      expect(
        Date.parse(countedState.data?.last_viewed_at ?? ""),
      ).toBeGreaterThanOrEqual(Date.parse(firstOpenedAt ?? ""));
      expect(
        Date.parse(countedState.data?.last_guide_opened_at ?? ""),
      ).toBeGreaterThanOrEqual(Date.parse(firstGuideOpenedAt ?? ""));

      const acknowledged = await db.rpc("portal_acknowledge_staff_release", {
        p_user_id: seedProfile.user_id,
        p_release_id: releaseId,
      });
      expect(acknowledged.error).toBeNull();
      expect(acknowledged.data).toBe(true);
      const repeatedAcknowledgement = await db.rpc(
        "portal_acknowledge_staff_release",
        {
          p_user_id: seedProfile.user_id,
          p_release_id: releaseId,
        },
      );
      expect(repeatedAcknowledgement.error).toBeNull();
      expect(repeatedAcknowledgement.data).toBe(false);

      const acknowledgedState = await db
        .from("portal_release_states")
        .select("first_opened_at, acknowledged_at, hidden_at")
        .eq("staff_user_id", seedProfile.user_id)
        .eq("release_id", releaseId)
        .single();
      expect(acknowledgedState.error).toBeNull();
      expect(acknowledgedState.data).toMatchObject({
        first_opened_at: firstOpenedAt,
        acknowledged_at: expect.any(String),
        hidden_at: null,
      });

      const hidden = await db.rpc("portal_hide_staff_release", {
        p_user_id: seedProfile.user_id,
        p_release_id: releaseId,
      });
      expect(hidden.error).toBeNull();
      expect(hidden.data).toBe(true);
      const repeatedHide = await db.rpc("portal_hide_staff_release", {
        p_user_id: seedProfile.user_id,
        p_release_id: releaseId,
      });
      expect(repeatedHide.error).toBeNull();
      expect(repeatedHide.data).toBe(false);

      const finalState = await db
        .from("portal_release_states")
        .select(
          "first_opened_at, last_viewed_at, view_count, acknowledged_at, hidden_at, guide_opened_at, last_guide_opened_at, guide_open_count, last_dismissed_at, dismiss_count",
        )
        .eq("staff_user_id", seedProfile.user_id)
        .eq("release_id", releaseId)
        .single();
      expect(finalState.error).toBeNull();
      expect(finalState.data).toMatchObject({
        first_opened_at: firstOpenedAt,
        view_count: 6,
        acknowledged_at: acknowledgedState.data?.acknowledged_at,
        hidden_at: expect.any(String),
        guide_opened_at: firstGuideOpenedAt,
        guide_open_count: 4,
        dismiss_count: 3,
      });

      const seedAudits = await db
        .from("audit_log")
        .select("action, entity, entity_id, source, correlation_id, detail")
        .eq("entity_id", seedProfile.id)
        .contains("detail", { release_id: releaseId })
        .order("at");
      expect(seedAudits.error).toBeNull();
      expect(seedAudits.data).toHaveLength(15);
      expect(
        (seedAudits.data ?? []).reduce<Record<string, number>>(
          (counts, { action }) => {
            counts[action] = (counts[action] ?? 0) + 1;
            return counts;
          },
          {},
        ),
      ).toEqual({
        "staff.release_open": 1,
        "staff.release_view": 5,
        "staff.release_guide_open": 4,
        "staff.release_dismiss": 3,
        "staff.release_acknowledge": 1,
        "staff.release_hide": 1,
      });
      for (const audit of seedAudits.data ?? []) {
        expect(audit).toMatchObject({
          entity: "portal_release_states",
          entity_id: seedProfile.id,
          source: "staff",
          detail: { release_id: releaseId },
        });
        expectUuid(audit.correlation_id);
        expect(Object.keys(audit.detail ?? {})).toEqual(["release_id"]);
      }

      for (const mutation of [
        "portal_record_staff_release_guide_open",
        "portal_record_staff_release_dismiss",
      ] as const) {
        const missingState = await db.rpc(mutation, {
          p_user_id: second.userId,
          p_release_id: releaseId,
        });
        expect(missingState.error?.code).toBe("P0002");
      }
      const missingStateAudits = await db
        .from("audit_log")
        .select("id")
        .eq("entity_id", second.profileId)
        .contains("detail", { release_id: releaseId });
      expect(missingStateAudits.error).toBeNull();
      expect(missingStateAudits.data).toEqual([]);

      const secondOpen = await db.rpc("portal_open_staff_release", {
        p_user_id: second.userId,
        p_release_id: releaseId,
      });
      expect(secondOpen.error).toBeNull();
      expect(secondOpen.data).toBe(true);
      const isolatedStates = await db
        .from("portal_release_states")
        .select("staff_user_id")
        .eq("release_id", releaseId)
        .order("staff_user_id");
      expect(isolatedStates.error).toBeNull();
      expect(
        isolatedStates.data?.map(({ staff_user_id }) => staff_user_id),
      ).toEqual([seedProfile.user_id, second.userId].sort());

      const reportRows = await db
        .from("portal_release_states")
        .select(
          "staff_user_id, profile:staff_profiles!portal_release_states_staff_user_id_fkey(display_name,email,active)",
        )
        .eq("release_id", releaseId)
        .order("staff_user_id");
      expect(reportRows.error).toBeNull();
      expect(reportRows.data).toHaveLength(2);
      expect(
        reportRows.data?.every(
          ({ profile }) =>
            profile !== null &&
            typeof profile === "object" &&
            "display_name" in profile &&
            "email" in profile &&
            "active" in profile,
        ),
      ).toBe(true);

      for (const rejectedUserId of [
        pending.userId,
        inactive.userId,
        randomUUID(),
      ]) {
        for (const mutation of [
          "portal_open_staff_release",
          "portal_record_staff_release_guide_open",
          "portal_record_staff_release_dismiss",
        ] as const) {
          const rejected = await db.rpc(mutation, {
            p_user_id: rejectedUserId,
            p_release_id: releaseId,
          });
          expect(rejected.error?.code).toBe("P0002");
        }
      }
      expect(
        (
          await db
            .from("portal_release_states")
            .select("staff_user_id")
            .eq("release_id", releaseId)
        ).data,
      ).toHaveLength(2);

      for (const invalidReleaseId of ["", " has-spaces", "x".repeat(81)]) {
        for (const mutation of [
          "portal_open_staff_release",
          "portal_record_staff_release_guide_open",
          "portal_record_staff_release_dismiss",
        ] as const) {
          const rejected = await db.rpc(mutation, {
            p_user_id: seedProfile.user_id,
            p_release_id: invalidReleaseId,
          });
          expect(rejected.error?.code).toBe("22023");
        }
      }

      const legacyShapeInsert = await db
        .from("portal_release_states")
        .insert({
          staff_user_id: second.userId,
          release_id: legacyShapeReleaseId,
        })
        .select("first_opened_at, last_viewed_at, view_count")
        .single();
      expect(legacyShapeInsert.error).toBeNull();
      expect(legacyShapeInsert.data).toMatchObject({
        first_opened_at: expect.any(String),
        last_viewed_at: expect.any(String),
        view_count: 1,
      });
      expect(legacyShapeInsert.data?.last_viewed_at).toBe(
        legacyShapeInsert.data?.first_opened_at,
      );
      await db
        .from("portal_release_states")
        .delete()
        .eq("release_id", legacyShapeReleaseId);
    } finally {
      await db
        .from("portal_release_states")
        .delete()
        .in("release_id", [releaseId, legacyShapeReleaseId]);
      await db
        .from("audit_log")
        .delete()
        .contains("detail", { release_id: releaseId });
      if (profileIds.length > 0) {
        await db.from("staff_profiles").delete().in("id", profileIds);
      }
      for (const userId of createdUserIds) {
        await db.auth.admin.deleteUser(userId);
      }
    }
  });

  test("persists an intake row and resolves its PostgREST relationship", async ({
    request,
  }) => {
    const token = randomUUID().slice(0, 8);
    const sourcePath = `/e2e/supabase-dependency/${token}`;
    const response = await request.post("/api/requests", {
      data: {
        name: `TEST Supabase ${token}`,
        phone: PATIENT_PHONE,
        email: `supabase-${token}@example.test`,
        location: "tampa",
        time: "morning",
        message: "TEST dependency contract — no medical details.",
        locale: "en",
        sourcePath,
      },
      headers: { "X-Forwarded-For": `2001:db8:${token.slice(0, 4)}::9` },
    });
    expect(response.status()).toBe(201);
    const body = (await response.json()) as { ok: boolean; id?: string };
    expect(body.ok).toBe(true);
    if (!body.id) throw new Error("Intake API did not return a request id");

    const db = serviceDb();
    try {
      const event = await db.from("request_events").insert({
        request_id: body.id,
        type: "dependency-contract",
        status: "recorded",
      });
      expect(event.error).toBeNull();

      const joined = await db
        .from("requests")
        .select("id, source_path, status, request_events(id, type, status)")
        .eq("id", body.id)
        .single();
      expect(joined.error).toBeNull();
      expect(joined.data).toMatchObject({
        id: body.id,
        source_path: sourcePath,
        status: "new",
      });
      expect(joined.data?.request_events).toEqual([
        expect.objectContaining({
          type: "dependency-contract",
          status: "recorded",
        }),
      ]);
    } finally {
      await db.from("requests").delete().eq("id", body.id);
    }
  });

  test("shares one atomic intake limit across fresh service clients and expiry", async () => {
    const claim = async (
      hash: string,
      limit: number,
      windowSeconds: number,
    ) => {
      const result = await serviceDb().rpc("portal_check_intake_rate_limit", {
        p_client_hash: hash,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });
      expect(result.error).toBeNull();
      return result.data;
    };
    const hash = (label: string) =>
      createHash("sha256").update(`${randomUUID()}:${label}`).digest("hex");

    const restartHash = hash("restart");
    await expect(claim(restartHash, 2, 1)).resolves.toBe(true);
    await expect(claim(restartHash, 2, 1)).resolves.toBe(true);
    await expect(claim(restartHash, 2, 1)).resolves.toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    await expect(claim(restartHash, 2, 1)).resolves.toBe(true);

    const concurrentHash = hash("concurrent");
    const claims = await Promise.all(
      Array.from({ length: INTAKE_RATE_LIMIT.limit + 3 }, () =>
        claim(
          concurrentHash,
          INTAKE_RATE_LIMIT.limit,
          INTAKE_RATE_LIMIT.windowSeconds,
        ),
      ),
    );
    expect(claims.filter(Boolean)).toHaveLength(INTAKE_RATE_LIMIT.limit);
    expect(claims.filter((allowed) => !allowed)).toHaveLength(3);
  });

  test("updates recipient labels in place with one classified audit per change", async () => {
    const db = serviceDb();
    const recipientId = randomUUID();
    const actor = `recipient-label-${randomUUID()}@example.test`;
    const email = `recipient-label-${randomUUID()}@example.test`;
    const inserted = await db
      .from("notification_recipients")
      .insert({
        id: recipientId,
        email,
        label: "Before",
        active: false,
      })
      .select("email, label, active, created_at, updated_at")
      .single();
    expect(inserted.error).toBeNull();
    if (!inserted.data)
      throw new Error("Recipient label fixture was not created");

    try {
      const changed = await db.rpc("portal_update_recipient_label", {
        p_actor_email: actor,
        p_recipient_id: recipientId,
        p_label: "  After  ",
      });
      expect(changed.error).toBeNull();
      expect(changed.data).toBe(true);

      const updated = await db
        .from("notification_recipients")
        .select("email, label, active, created_at, updated_at")
        .eq("id", recipientId)
        .single();
      expect(updated.error).toBeNull();
      expect(updated.data).toMatchObject({
        email: inserted.data.email,
        label: "After",
        active: inserted.data.active,
        created_at: inserted.data.created_at,
      });
      expect(updated.data?.updated_at).not.toBe(inserted.data.updated_at);

      const firstAudits = await db
        .from("audit_log")
        .select("action, source, correlation_id, detail")
        .eq("entity_id", recipientId);
      expect(firstAudits.error).toBeNull();
      expect(firstAudits.data).toHaveLength(1);
      expect(firstAudits.data?.[0]).toMatchObject({
        action: "recipients.label_update",
        source: "staff",
        detail: { from: "Before", to: "After" },
      });
      expectUuid(firstAudits.data?.[0].correlation_id);

      for (const invalidLabel of ["   ", "L".repeat(121)]) {
        const rejected = await db.rpc("portal_update_recipient_label", {
          p_actor_email: actor,
          p_recipient_id: recipientId,
          p_label: invalidLabel,
        });
        expect(rejected.error?.code).toBe("22023");
      }
      expect(
        (
          await db
            .from("notification_recipients")
            .select("label")
            .eq("id", recipientId)
            .single()
        ).data?.label,
      ).toBe("After");
      expect(
        (await db.from("audit_log").select("id").eq("entity_id", recipientId))
          .data,
      ).toHaveLength(1);

      const cleared = await db.rpc("portal_update_recipient_label", {
        p_actor_email: actor,
        p_recipient_id: recipientId,
        p_label: null,
      });
      expect(cleared.error).toBeNull();
      expect(cleared.data).toBe(true);
      expect(
        (
          await db
            .from("notification_recipients")
            .select("label")
            .eq("id", recipientId)
            .single()
        ).data?.label,
      ).toBeNull();
      const finalAudits = await db
        .from("audit_log")
        .select("source, correlation_id, detail")
        .eq("entity_id", recipientId)
        .order("at");
      expect(finalAudits.data).toHaveLength(2);
      expect(finalAudits.data?.[1]).toMatchObject({
        source: "staff",
        detail: { from: "After", to: null },
      });
      expect(finalAudits.data?.[1].correlation_id).not.toBe(
        finalAudits.data?.[0].correlation_id,
      );
    } finally {
      await db.from("audit_log").delete().eq("entity_id", recipientId);
      await db.from("notification_recipients").delete().eq("id", recipientId);
    }
  });

  test("records and undoes all seven call outcomes atomically", async () => {
    const db = serviceDb();
    const actor = `call-outcome-${randomUUID()}@example.test`;
    const followUpAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const requestIds: string[] = [];
    const cases = [
      {
        outcome: "booked",
        note: "TEST appointment booked.",
        followUpAt: null,
        status: "scheduled",
        disposition: null,
        handedOff: false,
      },
      {
        outcome: "scheduled_transferred",
        note: "TEST appointment transferred.",
        followUpAt: null,
        status: "closed",
        disposition: "converted",
        handedOff: true,
      },
      {
        outcome: "reached_follow_up",
        note: "TEST patient asked for another call.",
        followUpAt,
        status: "contacted",
        disposition: null,
        handedOff: false,
      },
      {
        outcome: "voicemail",
        note: "TEST voicemail left.",
        followUpAt,
        status: "contacted",
        disposition: null,
        handedOff: false,
      },
      {
        outcome: "no_answer",
        note: null,
        followUpAt: null,
        status: "contacted",
        disposition: null,
        handedOff: false,
      },
      {
        outcome: "wont_schedule",
        note: null,
        followUpAt: null,
        status: "closed",
        disposition: "unconverted",
        handedOff: false,
      },
      {
        outcome: "not_actionable",
        note: "TEST duplicate request.",
        followUpAt: null,
        status: "closed",
        disposition: "unconverted",
        handedOff: false,
      },
    ] as const;

    try {
      for (const item of cases) {
        const requestId = randomUUID();
        requestIds.push(requestId);
        await insertRequest(db, {
          id: requestId,
          name: `TEST call outcome ${item.outcome}`,
          source_path: "/e2e/call-outcome",
        });

        const result = await db.rpc("portal_log_call_outcome", {
          p_actor_email: actor,
          p_request_id: requestId,
          p_outcome: item.outcome,
          p_note: item.note,
          p_follow_up_at: item.followUpAt,
        });
        expect(result.error).toBeNull();
        expectUuid(result.data);
        const eventId = String(result.data);

        const row = await db
          .from("requests")
          .select(
            "status, follow_up_at, closure_disposition, closed_at, record_handoff_at",
          )
          .eq("id", requestId)
          .single();
        expect(row.error).toBeNull();
        expect(row.data).toMatchObject({
          status: item.status,
          closure_disposition: item.disposition,
        });
        expect(
          row.data?.follow_up_at
            ? new Date(row.data.follow_up_at).toISOString()
            : null,
        ).toBe(item.followUpAt);
        expect(Boolean(row.data?.closed_at)).toBe(item.status === "closed");
        expect(Boolean(row.data?.record_handoff_at)).toBe(item.handedOff);

        const events = await db
          .from("request_events")
          .select("id, type, status, meta")
          .eq("request_id", requestId);
        expect(events.error).toBeNull();
        const outcomeEvents = (events.data ?? []).filter(
          ({ type }) => type === "call_outcome",
        );
        const noteEvents = (events.data ?? []).filter(
          ({ type }) => type === "note",
        );
        expect(outcomeEvents).toHaveLength(1);
        expect(outcomeEvents[0]).toMatchObject({
          id: eventId,
          status: "recorded",
          meta: {
            outcome: item.outcome,
            author_email: actor,
            lifecycle: {
              version: 1,
              before: {
                status: "new",
                follow_up_at: null,
                closure_disposition: null,
                closed_at: null,
                record_handoff_at: null,
              },
              after: {
                status: item.status,
                closure_disposition: item.disposition,
              },
            },
          },
        });
        expect(outcomeEvents[0].meta?.lifecycle?.sequence).toBe(1);
        expect(
          typeof outcomeEvents[0].meta?.follow_up_at === "string"
            ? new Date(outcomeEvents[0].meta.follow_up_at).toISOString()
            : null,
        ).toBe(item.followUpAt);
        expect(noteEvents).toHaveLength(item.note ? 1 : 0);
        if (item.note) {
          expect(noteEvents[0]).toMatchObject({
            status: "recorded",
            meta: { text: item.note, author_email: actor },
          });
        }

        const audits = await db
          .from("audit_log")
          .select("action, source, correlation_id, detail")
          .eq("entity_id", requestId);
        expect(audits.error).toBeNull();
        expect(audits.data).toHaveLength(1);
        expect(audits.data?.[0]).toMatchObject({
          action: "request.call_outcome",
          source: "staff",
          detail: {
            outcome: item.outcome,
            to: item.status,
            note_attached: Boolean(item.note),
            ...(item.note ? { note_length: item.note.length } : {}),
          },
        });
        expectUuid(audits.data?.[0].correlation_id);
        expect(
          typeof audits.data?.[0].detail?.follow_up_at === "string"
            ? new Date(audits.data[0].detail.follow_up_at).toISOString()
            : null,
        ).toBe(item.followUpAt);
        expectNoPatientLeak(audits.data?.[0].detail, item.note);
        expectNoPatientLeak(outcomeEvents[0].meta, item.note);

        const undone = await db.rpc("portal_undo_call_outcome", {
          p_actor_email: actor,
          p_request_id: requestId,
          p_event_id: eventId,
        });
        expect(undone.error).toBeNull();
        expect(undone.data).toEqual({ status: "new" });

        const restored = await db
          .from("requests")
          .select(
            "status, follow_up_at, closure_disposition, closed_at, record_handoff_at",
          )
          .eq("id", requestId)
          .single();
        expect(restored.data).toEqual({
          status: "new",
          follow_up_at: null,
          closure_disposition: null,
          closed_at: null,
          record_handoff_at: null,
        });

        const finalEvents = await db
          .from("request_events")
          .select("id, type, status, meta")
          .eq("request_id", requestId);
        expect(finalEvents.error).toBeNull();
        const original = finalEvents.data?.find(({ id }) => id === eventId);
        expect(original).toMatchObject({
          type: "call_outcome",
          status: "undone",
          meta: { outcome: item.outcome },
        });
        const undoEvents = (finalEvents.data ?? []).filter(
          ({ type }) => type === "call_outcome_undo",
        );
        expect(undoEvents).toHaveLength(1);
        expect(undoEvents[0]).toMatchObject({
          status: "recorded",
          meta: {
            target_event_id: eventId,
            outcome: item.outcome,
            author_email: actor,
            restored_status: "new",
          },
        });
        expect(
          (finalEvents.data ?? []).filter(({ type }) => type === "note"),
        ).toHaveLength(item.note ? 1 : 0);

        const undoAudits = await db
          .from("audit_log")
          .select("action, source, correlation_id, detail")
          .eq("entity_id", requestId)
          .eq("action", "request.call_outcome_undo");
        expect(undoAudits.error).toBeNull();
        expect(undoAudits.data).toHaveLength(1);
        expect(undoAudits.data?.[0]).toMatchObject({
          action: "request.call_outcome_undo",
          source: "staff",
          detail: {
            target_event_id: eventId,
            outcome: item.outcome,
            from: item.status,
            to: "new",
            restored_lifecycle: {
              status: "new",
              follow_up_at: null,
              closure_disposition: null,
              closed_at: null,
              record_handoff_at: null,
            },
          },
        });
        expectUuid(undoAudits.data?.[0].correlation_id);
        expectNoPatientLeak(undoAudits.data?.[0].detail, item.note);

        const duplicateUndo = await db.rpc("portal_undo_call_outcome", {
          p_actor_email: actor,
          p_request_id: requestId,
          p_event_id: eventId,
        });
        expect(duplicateUndo.error?.code).toBe("55000");
        expect(
          (
            await db
              .from("request_events")
              .select("id")
              .eq("request_id", requestId)
              .eq("type", "call_outcome_undo")
          ).data,
        ).toHaveLength(1);
      }

      const rollbackId = randomUUID();
      requestIds.push(rollbackId);
      await insertRequest(db, {
        id: rollbackId,
        name: "TEST atomic call-outcome rollback",
        source_path: "/e2e/call-outcome-rollback",
      });

      const forcedAuditFailure = await db.rpc("portal_log_call_outcome", {
        p_actor_email: "",
        p_request_id: rollbackId,
        p_outcome: "voicemail",
        p_note: "TEST this write must roll back.",
        p_follow_up_at: followUpAt,
      });
      expect(forcedAuditFailure.error?.code).toBe("23514");

      const oversizedNote = await db.rpc("portal_log_call_outcome", {
        p_actor_email: actor,
        p_request_id: rollbackId,
        p_outcome: "voicemail",
        p_note: "N".repeat(2001),
        p_follow_up_at: followUpAt,
      });
      expect(oversizedNote.error?.code).toBe("22023");

      const closingFollowUp = await db.rpc("portal_log_call_outcome", {
        p_actor_email: actor,
        p_request_id: rollbackId,
        p_outcome: "wont_schedule",
        p_follow_up_at: followUpAt,
      });
      expect(closingFollowUp.error?.code).toBe("22023");

      const unknownOutcome = await db.rpc("portal_log_call_outcome", {
        p_actor_email: actor,
        p_request_id: rollbackId,
        p_outcome: "maybe_later",
      });
      expect(unknownOutcome.error?.code).toBe("22023");

      const unchanged = await db
        .from("requests")
        .select(
          "status, follow_up_at, closure_disposition, closed_at, record_handoff_at",
        )
        .eq("id", rollbackId)
        .single();
      expect(unchanged.data).toEqual({
        status: "new",
        follow_up_at: null,
        closure_disposition: null,
        closed_at: null,
        record_handoff_at: null,
      });
      expect(
        (
          await db
            .from("request_events")
            .select("id")
            .eq("request_id", rollbackId)
        ).data,
      ).toHaveLength(0);
      expect(
        (await db.from("audit_log").select("id").eq("entity_id", rollbackId))
          .data,
      ).toHaveLength(0);
    } finally {
      if (requestIds.length > 0) {
        await db.from("requests").delete().in("id", requestIds);
        await db.from("audit_log").delete().in("entity_id", requestIds);
      }
    }
  });

  test("restores every meaningful prior lifecycle shape exactly", async () => {
    const db = serviceDb();
    const actor = `undo-shapes-${randomUUID()}@example.test`;
    const requestIds: string[] = [];
    const followUpAt = "2026-08-03T14:30:00.000Z";
    const unconvertedClosedAt = "2026-07-24T15:10:00.000Z";
    const convertedClosedAt = "2026-07-25T16:20:00.000Z";
    const recordHandoffAt = "2026-07-25T16:22:00.000Z";
    const cases = [
      {
        name: "new",
        before: {
          status: "new",
          follow_up_at: null,
          closure_disposition: null,
          closed_at: null,
          record_handoff_at: null,
        },
        outcome: "booked",
      },
      {
        name: "contacted with follow-up",
        before: {
          status: "contacted",
          follow_up_at: followUpAt,
          closure_disposition: null,
          closed_at: null,
          record_handoff_at: null,
        },
        outcome: "wont_schedule",
      },
      {
        name: "scheduled",
        before: {
          status: "scheduled",
          follow_up_at: null,
          closure_disposition: null,
          closed_at: null,
          record_handoff_at: null,
        },
        outcome: "no_answer",
      },
      {
        name: "closed unconverted",
        before: {
          status: "closed",
          follow_up_at: null,
          closure_disposition: "unconverted",
          closed_at: unconvertedClosedAt,
          record_handoff_at: null,
        },
        outcome: "booked",
      },
      {
        name: "closed converted",
        before: {
          status: "closed",
          follow_up_at: null,
          closure_disposition: "converted",
          closed_at: convertedClosedAt,
          record_handoff_at: recordHandoffAt,
        },
        outcome: "voicemail",
      },
    ] as const;

    const normalizeLifecycle = (row: {
      status: string;
      follow_up_at: string | null;
      closure_disposition: string | null;
      closed_at: string | null;
      record_handoff_at: string | null;
    }) => ({
      status: row.status,
      follow_up_at: row.follow_up_at
        ? new Date(row.follow_up_at).toISOString()
        : null,
      closure_disposition: row.closure_disposition,
      closed_at: row.closed_at ? new Date(row.closed_at).toISOString() : null,
      record_handoff_at: row.record_handoff_at
        ? new Date(row.record_handoff_at).toISOString()
        : null,
    });

    try {
      for (const item of cases) {
        const requestId = randomUUID();
        requestIds.push(requestId);
        await insertRequest(db, {
          id: requestId,
          name: `TEST undo previous ${item.name}`,
          source_path: "/e2e/call-outcome-undo-shapes",
          ...item.before,
        });

        const saved = await db.rpc("portal_log_call_outcome", {
          p_actor_email: actor,
          p_request_id: requestId,
          p_outcome: item.outcome,
          p_note:
            item.name === "closed converted"
              ? "TEST note remains after lifecycle undo."
              : null,
          p_follow_up_at: null,
        });
        expect(saved.error).toBeNull();

        const undone = await db.rpc("portal_undo_call_outcome", {
          p_actor_email: actor,
          p_request_id: requestId,
          p_event_id: saved.data,
        });
        expect(undone.error).toBeNull();
        expect(undone.data).toEqual({ status: item.before.status });

        const restored = await db
          .from("requests")
          .select(
            "status, follow_up_at, closure_disposition, closed_at, record_handoff_at",
          )
          .eq("id", requestId)
          .single();
        expect(restored.error).toBeNull();
        expect(
          normalizeLifecycle(
            restored.data as Parameters<typeof normalizeLifecycle>[0],
          ),
        ).toEqual(item.before);

        if (item.name === "closed converted") {
          const notes = await db
            .from("request_events")
            .select("status, meta")
            .eq("request_id", requestId)
            .eq("type", "note");
          expect(notes.data).toEqual([
            {
              status: "recorded",
              meta: {
                text: "TEST note remains after lifecycle undo.",
                author_email: actor,
              },
            },
          ]);
        }
      }
    } finally {
      if (requestIds.length > 0) {
        await db.from("requests").delete().in("id", requestIds);
        await db.from("audit_log").delete().in("entity_id", requestIds);
      }
    }
  });

  test("rejects stale, mismatched, missing, invalid, and malformed undo tokens", async () => {
    const db = serviceDb();
    const actor = `undo-rejection-${randomUUID()}@example.test`;
    const firstRequestId = randomUUID();
    const secondRequestId = randomUUID();
    const requestIds = [firstRequestId, secondRequestId];

    try {
      await insertRequest(db, {
        id: firstRequestId,
        name: "TEST undo rejection first",
        source_path: "/e2e/call-outcome-undo-rejection",
      });
      await insertRequest(db, {
        id: secondRequestId,
        name: "TEST undo rejection second",
        source_path: "/e2e/call-outcome-undo-rejection",
      });

      const firstSave = await db.rpc("portal_log_call_outcome", {
        p_actor_email: actor,
        p_request_id: firstRequestId,
        p_outcome: "no_answer",
      });
      expect(firstSave.error).toBeNull();

      const missingRequest = await db.rpc("portal_undo_call_outcome", {
        p_actor_email: actor,
        p_request_id: randomUUID(),
        p_event_id: firstSave.data,
      });
      expect(missingRequest.error?.code).toBe("P0002");

      const missingEvent = await db.rpc("portal_undo_call_outcome", {
        p_actor_email: actor,
        p_request_id: firstRequestId,
        p_event_id: randomUUID(),
      });
      expect(missingEvent.error?.code).toBe("P0002");

      const mismatched = await db.rpc("portal_undo_call_outcome", {
        p_actor_email: actor,
        p_request_id: secondRequestId,
        p_event_id: firstSave.data,
      });
      expect(mismatched.error?.code).toBe("P0002");

      const invalidActor = await db.rpc("portal_undo_call_outcome", {
        p_actor_email: " ",
        p_request_id: firstRequestId,
        p_event_id: firstSave.data,
      });
      expect(invalidActor.error?.code).toBe("22023");

      const laterSave = await db.rpc("portal_log_call_outcome", {
        p_actor_email: actor,
        p_request_id: firstRequestId,
        p_outcome: "booked",
      });
      expect(laterSave.error).toBeNull();

      const stale = await db.rpc("portal_undo_call_outcome", {
        p_actor_email: actor,
        p_request_id: firstRequestId,
        p_event_id: firstSave.data,
      });
      expect(stale.error?.code).toBe("55000");
      const laterState = await db
        .from("requests")
        .select(
          "status, follow_up_at, closure_disposition, closed_at, record_handoff_at",
        )
        .eq("id", firstRequestId)
        .single();
      expect(laterState.data).toEqual({
        status: "scheduled",
        follow_up_at: null,
        closure_disposition: null,
        closed_at: null,
        record_handoff_at: null,
      });
      expect(
        (
          await db
            .from("request_events")
            .select("id")
            .eq("request_id", firstRequestId)
            .eq("type", "call_outcome_undo")
        ).data,
      ).toHaveLength(0);

      const malformedSave = await db.rpc("portal_log_call_outcome", {
        p_actor_email: actor,
        p_request_id: secondRequestId,
        p_outcome: "voicemail",
      });
      expect(malformedSave.error).toBeNull();
      const malformedUpdate = await db
        .from("request_events")
        .update({
          meta: {
            outcome: "voicemail",
            author_email: actor,
            lifecycle: {
              version: 1,
              sequence: 1,
              before: { status: "new" },
              after: { status: "contacted" },
            },
          },
        })
        .eq("id", malformedSave.data);
      expect(malformedUpdate.error).toBeNull();

      const malformed = await db.rpc("portal_undo_call_outcome", {
        p_actor_email: actor,
        p_request_id: secondRequestId,
        p_event_id: malformedSave.data,
      });
      expect(malformed.error?.code).toBe("22023");
      expect(
        (
          await db
            .from("requests")
            .select("status")
            .eq("id", secondRequestId)
            .single()
        ).data,
      ).toEqual({ status: "contacted" });
      expect(
        (
          await db
            .from("request_events")
            .select("status")
            .eq("id", malformedSave.data)
            .single()
        ).data,
      ).toEqual({ status: "recorded" });
    } finally {
      await db.from("requests").delete().in("id", requestIds);
      await db.from("audit_log").delete().in("entity_id", requestIds);
    }
  });

  test("rolls back an undo when its audit insert fails", async () => {
    test.skip(
      process.env.SUPABASE_PROJECT_REF !== "local",
      "The forced audit failure uses only the disposable local database.",
    );

    const db = serviceDb();
    const actor = `undo-audit-rollback-${randomUUID()}@example.test`;
    const requestId = randomUUID();
    const constraintName = "audit_log_test_reject_call_outcome_undo";
    const localWorkdirArgs = process.env.SUPABASE_DISPOSABLE_WORKDIR
      ? ["--workdir", process.env.SUPABASE_DISPOSABLE_WORKDIR]
      : [];

    try {
      await insertRequest(db, {
        id: requestId,
        name: "TEST undo audit rollback",
        source_path: "/e2e/call-outcome-undo-audit-rollback",
      });

      const saved = await db.rpc("portal_log_call_outcome", {
        p_actor_email: actor,
        p_request_id: requestId,
        p_outcome: "booked",
      });
      expect(saved.error).toBeNull();

      execFileSync(
        "supabase",
        [
          "db",
          "query",
          `alter table public.audit_log add constraint ${constraintName} check (action <> 'request.call_outcome_undo') not valid`,
          "--local",
          ...localWorkdirArgs,
          "--agent=no",
        ],
        { cwd: process.cwd(), stdio: "pipe" },
      );

      const undo = await db.rpc("portal_undo_call_outcome", {
        p_actor_email: actor,
        p_request_id: requestId,
        p_event_id: saved.data,
      });
      expect(undo.error?.code).toBe("23514");

      expect(
        (
          await db
            .from("requests")
            .select(
              "status, follow_up_at, closure_disposition, closed_at, record_handoff_at",
            )
            .eq("id", requestId)
            .single()
        ).data,
      ).toEqual({
        status: "scheduled",
        follow_up_at: null,
        closure_disposition: null,
        closed_at: null,
        record_handoff_at: null,
      });
      expect(
        (
          await db
            .from("request_events")
            .select("status")
            .eq("id", saved.data)
            .single()
        ).data,
      ).toEqual({ status: "recorded" });
      expect(
        (
          await db
            .from("request_events")
            .select("id")
            .eq("request_id", requestId)
            .eq("type", "call_outcome_undo")
        ).data,
      ).toHaveLength(0);
    } finally {
      try {
        execFileSync(
          "supabase",
          [
            "db",
            "query",
            `alter table public.audit_log drop constraint if exists ${constraintName}`,
            "--local",
            ...localWorkdirArgs,
            "--agent=no",
          ],
          { cwd: process.cwd(), stdio: "pipe" },
        );
      } finally {
        await db.from("requests").delete().eq("id", requestId);
        await db.from("audit_log").delete().eq("entity_id", requestId);
      }
    }
  });

  test("enforces intake field caps at the database boundary", async () => {
    const base = {
      name: "TEST database cap",
      phone: PATIENT_PHONE,
      email: "database-cap@example.test",
      location: "tampa",
      preferred_time: "morning",
      message: null,
      locale: "en",
      source_path: "/e2e/database-field-cap",
    };
    const oversized = [
      { ...base, name: "N".repeat(REQUEST_FIELD_LIMITS.name + 1) },
      { ...base, phone: "8".repeat(REQUEST_FIELD_LIMITS.phone + 1) },
      { ...base, email: "e".repeat(REQUEST_FIELD_LIMITS.email + 1) },
    ];

    for (const row of oversized) {
      const result = await serviceDb().from("requests").insert(row);
      expect(result.error?.code).toBe("23514");
    }
  });
});
