import { randomUUID } from "node:crypto";

import { test, expect } from "@playwright/test";
import { z } from "zod";

import { asJsonObject } from "../../src/lib/json";
import { requireDecoded, requireText } from "../harness/assert";
import { serviceDb } from "../harness/env";
import {
  SEED_EMAIL,
  expectUuid,
  releaseAuditSchema,
  releaseProfileSchema,
  releaseStateSchema,
  seedProfileSchema,
  staffUserIdRowSchema,
} from "./support";

test.use({ trace: "off" });

test.describe("Release engagement RPCs", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "The dependency contract runs once.");
  });

  test("keeps portal release engagement per staff with atomic counters and audits", async () => {
    const db = serviceDb();
    const releaseId = `dependency-${randomUUID()}`;
    const legacyReleaseId = `legacy-release-${randomUUID()}`;
    const secondEmail = `release-second-${randomUUID()}@example.test`;
    const pendingEmail = `release-pending-${randomUUID()}@example.test`;
    const inactiveEmail = `release-inactive-${randomUUID()}@example.test`;
    const createdUserIds: string[] = [];
    const profileIds: string[] = [];

    const createProfile = async ({
      email,
      active,
      onboarded,
    }: Readonly<{
      email: string;
      active: boolean;
      onboarded: boolean;
    }>) => {
      const createdUser = await db.auth.admin.createUser({
        email,
        email_confirm: true,
        password: `T3st-${randomUUID()}!`,
      });
      expect(createdUser.error).toBeNull();
      const userId = requireText(
        createdUser.data.user?.id,
        "Release-state Auth fixture was not created",
      );
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
    const seed = requireDecoded(
      seedProfileSchema.safeParse(seedProfile),
      "Seed staff profile is missing",
    );

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
        p_user_id: seed.user_id,
        p_release_id: releaseId,
      });
      expect(firstOpen.error).toBeNull();
      expect(firstOpen.data).toBe(true);

      const openedState = await db
        .from("portal_release_states")
        .select(
          "first_opened_at, last_viewed_at, view_count, acknowledged_at, hidden_at, guide_opened_at, last_guide_opened_at, guide_open_count, last_dismissed_at, dismiss_count",
        )
        .eq("staff_user_id", seed.user_id)
        .eq("release_id", releaseId)
        .single();
      expect(openedState.error).toBeNull();
      const opened = requireDecoded(
        releaseStateSchema.safeParse(openedState.data),
        "Opened release state could not be decoded",
      );
      expect(opened).toMatchObject({
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
      expect(opened.last_viewed_at).toBe(opened.first_opened_at);
      const firstOpenedAt = opened.first_opened_at;

      const repeatedOpen = await db.rpc("portal_open_staff_release", {
        p_user_id: seed.user_id,
        p_release_id: releaseId,
      });
      expect(repeatedOpen.error).toBeNull();
      expect(repeatedOpen.data).toBe(false);

      const firstGuideOpen = await db.rpc("portal_record_staff_release_guide_open", {
        p_user_id: seed.user_id,
        p_release_id: releaseId,
      });
      expect(firstGuideOpen.error).toBeNull();
      expect(firstGuideOpen.data).toBe(true);

      const firstDismiss = await db.rpc("portal_record_staff_release_dismiss", {
        p_user_id: seed.user_id,
        p_release_id: releaseId,
      });
      expect(firstDismiss.error).toBeNull();
      expect(firstDismiss.data).toBe(true);

      const beforeConcurrentEvents = await db
        .from("portal_release_states")
        .select("guide_opened_at")
        .eq("staff_user_id", seed.user_id)
        .eq("release_id", releaseId)
        .single();
      expect(beforeConcurrentEvents.error).toBeNull();
      const firstGuideOpenedAt = requireDecoded(
        z.object({ guide_opened_at: z.string() }).safeParse(beforeConcurrentEvents.data),
        "Guide-open timestamp could not be decoded",
      ).guide_opened_at;

      const concurrentEvents = await Promise.all([
        ...Array.from({ length: 4 }, () =>
          db.rpc("portal_open_staff_release", {
            p_user_id: seed.user_id,
            p_release_id: releaseId,
          }),
        ),
        ...Array.from({ length: 3 }, () =>
          db.rpc("portal_record_staff_release_guide_open", {
            p_user_id: seed.user_id,
            p_release_id: releaseId,
          }),
        ),
        ...Array.from({ length: 2 }, () =>
          db.rpc("portal_record_staff_release_dismiss", {
            p_user_id: seed.user_id,
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
        .eq("staff_user_id", seed.user_id)
        .eq("release_id", releaseId)
        .single();
      expect(countedState.error).toBeNull();
      const counted = requireDecoded(
        releaseStateSchema.safeParse(countedState.data),
        "Counted release state could not be decoded",
      );
      expect(counted).toMatchObject({
        first_opened_at: firstOpenedAt,
        last_viewed_at: expect.any(String),
        view_count: 6,
        guide_opened_at: firstGuideOpenedAt,
        last_guide_opened_at: expect.any(String),
        guide_open_count: 4,
        last_dismissed_at: expect.any(String),
        dismiss_count: 3,
      });
      expect(Date.parse(counted.last_viewed_at)).toBeGreaterThanOrEqual(Date.parse(firstOpenedAt));
      const lastGuideOpenedAt = requireText(
        counted.last_guide_opened_at,
        "Last guide-open timestamp is missing",
      );
      expect(Date.parse(lastGuideOpenedAt)).toBeGreaterThanOrEqual(Date.parse(firstGuideOpenedAt));

      const acknowledged = await db.rpc("portal_acknowledge_staff_release", {
        p_user_id: seed.user_id,
        p_release_id: releaseId,
      });
      expect(acknowledged.error).toBeNull();
      expect(acknowledged.data).toBe(true);
      const repeatedAcknowledgement = await db.rpc("portal_acknowledge_staff_release", {
        p_user_id: seed.user_id,
        p_release_id: releaseId,
      });
      expect(repeatedAcknowledgement.error).toBeNull();
      expect(repeatedAcknowledgement.data).toBe(false);

      const acknowledgedState = await db
        .from("portal_release_states")
        .select("first_opened_at, acknowledged_at, hidden_at")
        .eq("staff_user_id", seed.user_id)
        .eq("release_id", releaseId)
        .single();
      expect(acknowledgedState.error).toBeNull();
      const acknowledgedRow = requireDecoded(
        z
          .object({
            first_opened_at: z.string(),
            acknowledged_at: z.string().nullable(),
            hidden_at: z.string().nullable(),
          })
          .safeParse(acknowledgedState.data),
        "Acknowledged release state could not be decoded",
      );
      expect(acknowledgedRow).toMatchObject({
        first_opened_at: firstOpenedAt,
        acknowledged_at: expect.any(String),
        hidden_at: null,
      });

      const hidden = await db.rpc("portal_hide_staff_release", {
        p_user_id: seed.user_id,
        p_release_id: releaseId,
      });
      expect(hidden.error).toBeNull();
      expect(hidden.data).toBe(true);
      const repeatedHide = await db.rpc("portal_hide_staff_release", {
        p_user_id: seed.user_id,
        p_release_id: releaseId,
      });
      expect(repeatedHide.error).toBeNull();
      expect(repeatedHide.data).toBe(false);

      const finalState = await db
        .from("portal_release_states")
        .select(
          "first_opened_at, last_viewed_at, view_count, acknowledged_at, hidden_at, guide_opened_at, last_guide_opened_at, guide_open_count, last_dismissed_at, dismiss_count",
        )
        .eq("staff_user_id", seed.user_id)
        .eq("release_id", releaseId)
        .single();
      expect(finalState.error).toBeNull();
      expect(finalState.data).toMatchObject({
        first_opened_at: firstOpenedAt,
        view_count: 6,
        acknowledged_at: acknowledgedRow.acknowledged_at,
        hidden_at: expect.any(String),
        guide_opened_at: firstGuideOpenedAt,
        guide_open_count: 4,
        dismiss_count: 3,
      });

      const seedAudits = await db
        .from("audit_log")
        .select("action, entity, entity_id, source, correlation_id, detail")
        .eq("entity_id", seed.id)
        .contains("detail", { release_id: releaseId })
        .order("at");
      expect(seedAudits.error).toBeNull();
      const seedAuditRows = requireDecoded(
        z.array(releaseAuditSchema).safeParse(seedAudits.data ?? []),
        "Release audit rows could not be decoded",
      );
      expect(seedAuditRows).toHaveLength(15);
      expect(
        seedAuditRows.reduce<Record<string, number>>(
          (counts: Readonly<Record<string, number>>, { action }) => ({
            ...counts,
            [action]: (counts[action] ?? 0) + 1,
          }),
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
      for (const audit of seedAuditRows) {
        expect(audit).toMatchObject({
          entity: "portal_release_states",
          entity_id: seed.id,
          source: "staff",
          detail: { release_id: releaseId },
        });
        expectUuid(audit.correlation_id);
        const auditDetail = asJsonObject(audit.detail);
        expect(auditDetail !== null ? Object.keys(auditDetail) : []).toEqual(["release_id"]);
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
      const isolatedUserIds = requireDecoded(
        z.array(staffUserIdRowSchema).safeParse(isolatedStates.data ?? []),
        "Isolated release states could not be decoded",
      ).map(({ staff_user_id }) => staff_user_id);
      expect(isolatedUserIds).toEqual(
        [seed.user_id, second.userId].sort((left, right) => left.localeCompare(right)),
      );

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
        reportRows.data?.every(({ profile }) => releaseProfileSchema.safeParse(profile).success),
      ).toBe(true);

      for (const rejectedUserId of [pending.userId, inactive.userId, randomUUID()]) {
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
        (await db.from("portal_release_states").select("staff_user_id").eq("release_id", releaseId))
          .data,
      ).toHaveLength(2);

      for (const invalidReleaseId of ["", " has-spaces", "x".repeat(81)]) {
        for (const mutation of [
          "portal_open_staff_release",
          "portal_record_staff_release_guide_open",
          "portal_record_staff_release_dismiss",
        ] as const) {
          const rejected = await db.rpc(mutation, {
            p_user_id: seed.user_id,
            p_release_id: invalidReleaseId,
          });
          expect(rejected.error?.code).toBe("22023");
        }
      }

      const legacyReleaseInsert = await db
        .from("portal_release_states")
        .insert({
          staff_user_id: second.userId,
          release_id: legacyReleaseId,
        })
        .select("first_opened_at, last_viewed_at, view_count")
        .single();
      expect(legacyReleaseInsert.error).toBeNull();
      expect(legacyReleaseInsert.data).toMatchObject({
        first_opened_at: expect.any(String),
        last_viewed_at: expect.any(String),
        view_count: 1,
      });
      expect(legacyReleaseInsert.data?.last_viewed_at).toBe(
        legacyReleaseInsert.data?.first_opened_at,
      );
      await db.from("portal_release_states").delete().eq("release_id", legacyReleaseId);
    } finally {
      await db
        .from("portal_release_states")
        .delete()
        .in("release_id", [releaseId, legacyReleaseId]);
      await db.from("audit_log").delete().contains("detail", { release_id: releaseId });
      if (profileIds.length > 0) {
        await db.from("staff_profiles").delete().in("id", profileIds);
      }
      for (const userId of createdUserIds) {
        await db.auth.admin.deleteUser(userId);
      }
    }
  });
});
