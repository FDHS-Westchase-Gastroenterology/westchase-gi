import { randomUUID } from "node:crypto";

import { test, expect } from "@playwright/test";
import { z } from "zod";

import { requireDecoded } from "../harness/assert";
import { serviceDb } from "../harness/env";
import {
  SEED_EMAIL,
  SEED_PASSWORD,
  correlationIdRowSchema,
  dropRecipientRpcs,
  expectUuid,
  mutateSettings,
  queryTestDatabase,
  restoreRecipientRpcs,
} from "./support";

test.use({ trace: "off" });

test.describe("Notification recipient RPCs and the compatibility bridge", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "The dependency contract runs once.");
  });

  test("adds, toggles, and removes recipients with atomic classified audits", async () => {
    const db = serviceDb();
    const actor = `recipient-atomic-${randomUUID()}@example.test`;
    const rawEmail = `Recipient-Atomic-${randomUUID()}@Example.Test`;
    const email = rawEmail.toLowerCase();
    const failedAddEmail = `recipient-failed-${randomUUID()}@example.test`;
    let recipientId: string | null = null;

    try {
      const added = await db.rpc("portal_add_notification_recipient", {
        p_actor_email: actor,
        p_email: `  ${rawEmail}  `,
        p_label: "  Front desk  ",
        p_active: true,
      });
      expect(added.error).toBeNull();
      expectUuid(z.string().parse(added.data));
      recipientId = String(added.data);

      const inserted = await db
        .from("notification_recipients")
        .select("email, label, active")
        .eq("id", recipientId)
        .single();
      expect(inserted.error).toBeNull();
      expect(inserted.data).toEqual({
        email,
        label: "Front desk",
        active: true,
      });

      const duplicate = await db.rpc("portal_add_notification_recipient", {
        p_actor_email: actor,
        p_email: email.toUpperCase(),
        p_label: null,
        p_active: true,
      });
      expect(duplicate.error?.code).toBe("23505");

      const noOp = await db.rpc("portal_toggle_notification_recipient", {
        p_actor_email: actor,
        p_recipient_id: recipientId,
        p_active: true,
      });
      expect(noOp.error).toBeNull();
      expect(noOp.data).toBe(false);

      const failedToggle = await db.rpc("portal_toggle_notification_recipient", {
        p_actor_email: "",
        p_recipient_id: recipientId,
        p_active: false,
      });
      expect(failedToggle.error?.code).toBe("23514");
      expect(
        (await db.from("notification_recipients").select("active").eq("id", recipientId).single())
          .data?.active,
      ).toBe(true);

      const toggled = await db.rpc("portal_toggle_notification_recipient", {
        p_actor_email: actor,
        p_recipient_id: recipientId,
        p_active: false,
      });
      expect(toggled.error).toBeNull();
      expect(toggled.data).toBe(true);

      const failedRemove = await db.rpc("portal_remove_notification_recipient", {
        p_actor_email: "",
        p_recipient_id: recipientId,
      });
      expect(failedRemove.error?.code).toBe("23514");
      expect(
        (await db.from("notification_recipients").select("active").eq("id", recipientId).single())
          .data?.active,
      ).toBe(false);

      const removed = await db.rpc("portal_remove_notification_recipient", {
        p_actor_email: actor,
        p_recipient_id: recipientId,
      });
      expect(removed.error).toBeNull();
      expect(removed.data).toBe(true);
      expect(
        (await db.from("notification_recipients").select("id").eq("id", recipientId).maybeSingle())
          .data,
      ).toBeNull();

      const audits = await db
        .from("audit_log")
        .select("action, source, correlation_id, detail")
        .eq("entity_id", recipientId);
      expect(audits.error).toBeNull();
      expect(audits.data).toHaveLength(3);
      expect(audits.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            action: "recipients.add",
            source: "staff",
            detail: { active: true, has_label: true },
          }),
          expect.objectContaining({
            action: "recipients.toggle",
            source: "staff",
            detail: { from: true, to: false },
          }),
          expect.objectContaining({
            action: "recipients.remove",
            source: "staff",
            detail: { active: false },
          }),
        ]),
      );
      const correlationIds = new Set(
        requireDecoded(
          z.array(correlationIdRowSchema).safeParse(audits.data ?? []),
          "Recipient audit correlation ids could not be decoded",
        ).map((row) => row.correlation_id),
      );
      expect(correlationIds.size).toBe(3);
      for (const correlationId of correlationIds) {
        expectUuid(z.string().parse(correlationId));
      }

      for (const mutation of [
        db.rpc("portal_toggle_notification_recipient", {
          p_actor_email: actor,
          p_recipient_id: randomUUID(),
          p_active: false,
        }),
        db.rpc("portal_remove_notification_recipient", {
          p_actor_email: actor,
          p_recipient_id: randomUUID(),
        }),
      ]) {
        expect((await mutation).error?.code).toBe("P0002");
      }

      const failedAdd = await db.rpc("portal_add_notification_recipient", {
        p_actor_email: "",
        p_email: failedAddEmail,
        p_label: null,
        p_active: true,
      });
      expect(failedAdd.error?.code).toBe("23514");
      expect(
        (await db.from("notification_recipients").select("id").eq("email", failedAddEmail)).data,
      ).toHaveLength(0);
    } finally {
      if (recipientId !== null && recipientId !== "") {
        await db.from("audit_log").delete().eq("entity_id", recipientId);
        await db.from("notification_recipients").delete().eq("id", recipientId);
      }
      await db.from("notification_recipients").delete().in("email", [email, failedAddEmail]);
    }
  });

  test("bridges only missing recipient RPCs and compensates compatibility failures", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    test.skip(
      process.env.SUPABASE_PROJECT_REF !== "local" && process.env.SUPABASE_PREVIEW_BRANCH !== "1",
      "RPC removal and forced audit failures require an isolated test database.",
    );

    const db = serviceDb();
    const permissionEmail = `recipient-permission-${randomUUID()}@example.test`;
    const failedAddEmail = `recipient-compat-failed-${randomUUID()}@example.test`;
    const recipientEmail = `recipient-compat-${randomUUID()}@example.test`;
    const auditConstraint = "audit_log_test_reject_recipient_compatibility";
    let recipientId: string | null = null;

    const clearAuditConstraint = () => {
      queryTestDatabase(
        `alter table public.audit_log drop constraint if exists ${auditConstraint}`,
      );
    };
    const rejectAuditAction = (action: string) => {
      clearAuditConstraint();
      queryTestDatabase(
        `alter table public.audit_log add constraint ${auditConstraint} check (action <> '${action}') not valid`,
      );
    };
    const recipientRows = (email: string) =>
      db.from("notification_recipients").select("id, active").eq("email", email);

    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(SEED_EMAIL);
    await page.getByLabel("Password").fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/?$/);

    try {
      queryTestDatabase(`
        revoke execute on function public.portal_add_notification_recipient(
          text,
          text,
          text,
          boolean
        ) from service_role;
      `);
      try {
        const permissionProbe = await db.rpc("portal_add_notification_recipient", {
          p_actor_email: SEED_EMAIL,
          p_email: permissionEmail,
          p_label: null,
          p_active: true,
        });
        expect(permissionProbe.error?.code).toBe("42501");

        const denied = await mutateSettings(page, "recipient.add", {
          email: permissionEmail,
          label: "Permission failure must stay closed",
          active: true,
        });
        expect(denied.status).toBe(503);
        expect(denied.body).toMatchObject({
          ok: false,
          code: "unavailable",
        });
        expect((await recipientRows(permissionEmail)).data).toHaveLength(0);
      } finally {
        queryTestDatabase(`
          grant execute on function public.portal_add_notification_recipient(
            text,
            text,
            text,
            boolean
          ) to service_role;
        `);
      }

      dropRecipientRpcs();
      const missingProbes = [
        () =>
          db.rpc("portal_add_notification_recipient", {
            p_actor_email: "",
            p_email: `recipient-probe-${randomUUID()}@example.test`,
            p_label: null,
            p_active: true,
          }),
        () =>
          db.rpc("portal_toggle_notification_recipient", {
            p_actor_email: SEED_EMAIL,
            p_recipient_id: randomUUID(),
            p_active: false,
          }),
        () =>
          db.rpc("portal_remove_notification_recipient", {
            p_actor_email: SEED_EMAIL,
            p_recipient_id: randomUUID(),
          }),
      ];
      for (const probe of missingProbes) {
        await expect
          .poll(async () => (await probe()).error?.code, { timeout: 15_000 })
          .toBe("PGRST202");
      }

      rejectAuditAction("recipients.add");
      const failedAdd = await mutateSettings(page, "recipient.add", {
        email: failedAddEmail,
        label: "Forced compatibility rollback",
        active: true,
      });
      expect(failedAdd.status).toBe(503);
      expect(failedAdd.body).toMatchObject({
        ok: false,
        code: "unavailable",
      });
      expect((await recipientRows(failedAddEmail)).data).toHaveLength(0);
      clearAuditConstraint();

      const added = await mutateSettings(page, "recipient.add", {
        email: recipientEmail,
        label: "Compatibility recipient",
        active: true,
      });
      expect(added.status).toBe(201);
      expect(added.body.ok).toBe(true);

      const inserted = await recipientRows(recipientEmail);
      expect(inserted.error).toBeNull();
      expect(inserted.data).toHaveLength(1);
      expect(inserted.data?.[0].active).toBe(true);
      recipientId = z.string().parse(inserted.data?.[0].id);
      expectUuid(recipientId);

      const duplicate = await mutateSettings(page, "recipient.add", {
        email: recipientEmail.toUpperCase(),
        label: "Duplicate compatibility recipient",
        active: true,
      });
      expect(duplicate.status).toBe(409);
      expect(duplicate.body).toMatchObject({ ok: false, code: "conflict" });

      rejectAuditAction("recipients.toggle");
      const failedToggle = await mutateSettings(page, "recipient.toggle", {
        recipientId,
        active: false,
      });
      expect(failedToggle.status).toBe(503);
      expect(failedToggle.body).toMatchObject({
        ok: false,
        code: "unavailable",
      });
      expect((await recipientRows(recipientEmail)).data?.[0].active).toBe(true);
      clearAuditConstraint();

      const toggled = await mutateSettings(page, "recipient.toggle", {
        recipientId,
        active: false,
      });
      expect(toggled.status).toBe(200);
      expect(toggled.body.ok).toBe(true);
      expect((await recipientRows(recipientEmail)).data?.[0].active).toBe(false);

      const missingId = randomUUID();
      const missingToggle = await mutateSettings(page, "recipient.toggle", {
        recipientId: missingId,
        active: false,
      });
      expect(missingToggle.status).toBe(404);
      expect(missingToggle.body).toMatchObject({
        ok: false,
        code: "not_found",
      });

      rejectAuditAction("recipients.remove");
      const failedRemove = await mutateSettings(page, "recipient.remove", {
        id: recipientId,
      });
      expect(failedRemove.status).toBe(503);
      expect(failedRemove.body).toMatchObject({
        ok: false,
        code: "unavailable",
      });
      expect((await recipientRows(recipientEmail)).data?.[0].active).toBe(false);
      clearAuditConstraint();

      const removed = await mutateSettings(page, "recipient.remove", {
        id: recipientId,
      });
      expect(removed.status).toBe(200);
      expect(removed.body.ok).toBe(true);
      expect((await recipientRows(recipientEmail)).data).toHaveLength(0);

      const missingRemove = await mutateSettings(page, "recipient.remove", {
        id: missingId,
      });
      expect(missingRemove.status).toBe(404);
      expect(missingRemove.body).toMatchObject({
        ok: false,
        code: "not_found",
      });

      const audits = await db
        .from("audit_log")
        .select("action, source, correlation_id, detail")
        .eq("entity_id", recipientId);
      expect(audits.error).toBeNull();
      expect(audits.data).toHaveLength(3);
      expect(audits.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            action: "recipients.add",
            source: "staff",
            detail: { active: true, has_label: true },
          }),
          expect.objectContaining({
            action: "recipients.toggle",
            source: "staff",
            detail: { from: true, to: false },
          }),
          expect.objectContaining({
            action: "recipients.remove",
            source: "staff",
            detail: { active: false },
          }),
        ]),
      );
      for (const audit of requireDecoded(
        z.array(correlationIdRowSchema).safeParse(audits.data ?? []),
        "Compatibility recipient audits could not be decoded",
      )) {
        expectUuid(audit.correlation_id);
      }
    } finally {
      try {
        clearAuditConstraint();
      } finally {
        try {
          restoreRecipientRpcs();
          await expect
            .poll(
              async () =>
                (
                  await db.rpc("portal_toggle_notification_recipient", {
                    p_actor_email: SEED_EMAIL,
                    p_recipient_id: randomUUID(),
                    p_active: false,
                  })
                ).error?.code,
              { timeout: 15_000 },
            )
            .toBe("P0002");
        } finally {
          if (recipientId !== null && recipientId !== "") {
            await db.from("audit_log").delete().eq("entity_id", recipientId);
            await db.from("notification_recipients").delete().eq("id", recipientId);
          }
          await db
            .from("notification_recipients")
            .delete()
            .in("email", [permissionEmail, failedAddEmail, recipientEmail]);
        }
      }
    }
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
    const insertedRow = requireDecoded(
      z
        .object({
          email: z.string(),
          label: z.string().nullable(),
          active: z.boolean(),
          created_at: z.string(),
          updated_at: z.string(),
        })
        .safeParse(inserted.data),
      "Recipient label fixture was not created",
    );

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
        email: insertedRow.email,
        label: "After",
        active: insertedRow.active,
        created_at: insertedRow.created_at,
      });
      expect(updated.data?.updated_at).not.toBe(insertedRow.updated_at);

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
      expectUuid(z.string().parse(firstAudits.data?.[0].correlation_id));

      for (const invalidLabel of ["   ", "L".repeat(121)]) {
        const rejected = await db.rpc("portal_update_recipient_label", {
          p_actor_email: actor,
          p_recipient_id: recipientId,
          p_label: invalidLabel,
        });
        expect(rejected.error?.code).toBe("22023");
      }
      expect(
        (await db.from("notification_recipients").select("label").eq("id", recipientId).single())
          .data?.label,
      ).toBe("After");
      expect(
        (await db.from("audit_log").select("id").eq("entity_id", recipientId)).data,
      ).toHaveLength(1);

      const cleared = await db.rpc("portal_update_recipient_label", {
        p_actor_email: actor,
        p_recipient_id: recipientId,
        p_label: null,
      });
      expect(cleared.error).toBeNull();
      expect(cleared.data).toBe(true);
      expect(
        (await db.from("notification_recipients").select("label").eq("id", recipientId).single())
          .data?.label,
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
      expect(finalAudits.data?.[1].correlation_id).not.toBe(finalAudits.data?.[0].correlation_id);
    } finally {
      await db.from("audit_log").delete().eq("entity_id", recipientId);
      await db.from("notification_recipients").delete().eq("id", recipientId);
    }
  });
});
