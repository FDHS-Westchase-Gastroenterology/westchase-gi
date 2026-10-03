import { randomUUID } from "node:crypto";

import { test, expect } from "@playwright/test";
import { z } from "zod";

import { NOTIFICATION_TEST_RATE_LIMIT } from "../../src/lib/portal/contracts";
import { requireDecoded } from "../harness/assert";
import { serviceDb } from "../harness/env";
import { signIn } from "../harness/session";
import { SEED_EMAIL, clearNotificationTestBucket, mutateSettings } from "./support";

test.use({ trace: "off" });

const activeRowSchema = z.array(z.object({ id: z.string() }));
const testSendAuditSchema = z.array(
  z.object({
    actor_email: z.string(),
    entity: z.string(),
    entity_id: z.string().nullable(),
    source: z.string(),
    detail: z.object({
      recipient_count: z.number(),
      recipient_ids: z.array(z.string()),
    }),
  }),
);

test.describe("The Settings › Notifications test send", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "The dependency contract runs once.");
  });

  test("sends to every address that is on, refuses when none is, rate-limits and audits", async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000);
    test.skip(
      process.env.SUPABASE_PROJECT_REF !== "local" && process.env.SUPABASE_PREVIEW_BRANCH !== "1",
      "Pausing every address and resetting the rate limit require an isolated test database.",
    );

    const db = serviceDb();
    const startedAt = new Date().toISOString();
    const onEmail = `test-send-on-${randomUUID()}@example.test`;
    const pausedEmail = `test-send-paused-${randomUUID()}@example.test`;

    const { data: admin, error: adminError } = await db
      .from("staff_profiles")
      .select("user_id")
      .ilike("email", SEED_EMAIL)
      .single();
    expect(adminError).toBeNull();
    const adminUserId = requireDecoded(
      z.object({ user_id: z.string() }).safeParse(admin),
      "The seed admin has no staff profile",
    ).user_id;

    const activeIds = async () =>
      requireDecoded(
        activeRowSchema.safeParse(
          (await db.from("notification_recipients").select("id").eq("active", true)).data,
        ),
        "Active recipients could not be read",
      ).map((row) => row.id);
    const previouslyOn = await activeIds();

    const testSendAudits = async () => {
      const { data, error } = await db
        .from("audit_log")
        .select("actor_email, entity, entity_id, source, detail")
        .eq("action", "recipients.test_send")
        .gte("at", startedAt)
        .order("at", { ascending: true });
      expect(error).toBeNull();
      return requireDecoded(
        testSendAuditSchema.safeParse(data),
        "Test-send audits could not be decoded",
      );
    };

    clearNotificationTestBucket(adminUserId);
    await signIn(page);

    try {
      // Anonymous callers never reach the mutation.
      const anonymousContext = await browser.newContext();
      try {
        const anonymousPage = await anonymousContext.newPage();
        await anonymousPage.goto("/en");
        const anonymous = await mutateSettings(anonymousPage, "recipient.test", {});
        expect(anonymous.status).toBe(401);
      } finally {
        await anonymousContext.close();
      }

      // With every address paused there is nobody to send to: refused, nothing audited, and the
      // Refusal does not spend the admin's allowance.
      if (previouslyOn.length > 0) {
        const { error } = await db
          .from("notification_recipients")
          .update({ active: false })
          .in("id", previouslyOn);
        expect(error).toBeNull();
      }
      const noneOn = await mutateSettings(page, "recipient.test", {});
      expect(noneOn.status).toBe(409);
      expect(noneOn.body).toMatchObject({ ok: false, code: "none_on" });
      expect(await testSendAudits()).toHaveLength(0);

      // One address on and one paused: the send goes to the one that is on.
      const { data: fixtures, error: fixtureError } = await db
        .from("notification_recipients")
        .insert([
          { email: onEmail, label: "TEST test send on", active: true },
          { email: pausedEmail, label: "TEST test send paused", active: false },
        ])
        .select("id, email");
      expect(fixtureError).toBeNull();
      const fixtureRows = requireDecoded(
        z.array(z.object({ id: z.string(), email: z.string() })).safeParse(fixtures),
        "Test-send fixtures were not created",
      );
      const onId = fixtureRows.find((row) => row.email === onEmail)?.id;
      const pausedId = fixtureRows.find((row) => row.email === pausedEmail)?.id;

      const sent = await mutateSettings(page, "recipient.test", {});
      expect(sent.status).toBe(200);
      // The harness has no mail provider, so nothing is accepted; the count still names who.
      expect(sent.body).toEqual({ ok: true, recipientCount: 1, accepted: 0 });

      const audits = await testSendAudits();
      expect(audits).toHaveLength(1);
      const audit = audits.at(0);
      if (audit === undefined) throw new Error("The test send wrote no audit row");
      expect(audit.actor_email.toLowerCase()).toBe(SEED_EMAIL.toLowerCase());
      expect(audit).toMatchObject({
        entity: "notification_recipients",
        entity_id: null,
        source: "staff",
        detail: { recipient_count: 1, recipient_ids: [onId] },
      });
      expect(audit.detail.recipient_ids).not.toContain(pausedId);
      expect(JSON.stringify(audit.detail)).not.toContain("@");

      // The allowance is a few sends per admin per window; the next one is refused unaudited.
      for (let sentSoFar = 1; sentSoFar < NOTIFICATION_TEST_RATE_LIMIT.limit; sentSoFar += 1) {
        const again = await mutateSettings(page, "recipient.test", {});
        expect(again.status).toBe(200);
      }
      const limited = await mutateSettings(page, "recipient.test", {});
      expect(limited.status).toBe(429);
      expect(limited.body).toMatchObject({ ok: false, code: "limit" });
      expect(await testSendAudits()).toHaveLength(NOTIFICATION_TEST_RATE_LIMIT.limit);
    } finally {
      await db.from("notification_recipients").delete().in("email", [onEmail, pausedEmail]);
      if (previouslyOn.length > 0) {
        await db.from("notification_recipients").update({ active: true }).in("id", previouslyOn);
      }
      await db.from("audit_log").delete().eq("action", "recipients.test_send").gte("at", startedAt);
      clearNotificationTestBucket(adminUserId);
    }
  });
});
