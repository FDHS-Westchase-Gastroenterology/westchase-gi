import { test, expect } from "@playwright/test";
import { z } from "zod";

import { intakeResponseSchema } from "../../src/lib/portal/contracts";
import { clientIps, runId, seedAdmin, serviceDb } from "../harness/env";
import { signIn } from "../harness/session";

const noteMetaSchema = z.object({
  text: z.string().optional(),
  author_email: z.string().optional(),
});
const createdRequestRowSchema = z.object({ id: z.uuid() });

// Server contracts for staff-created requests and staff notes, driven through
// The surfaces that own them: Home's add dialog and the Schedule's record sheet.

const { email: SEED_EMAIL } = seedAdmin();

const db = serviceDb();

const testIp = clientIps("requests");

test.describe("portal requests operation", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "JS portal UI");
  });

  test.afterAll(async () => {
    await db.from("requests").delete().like("email", `queue-${runId}-%`);
  });

  test("staff can add an appointment request from Home without creating website-notification work", async ({
    page,
  }) => {
    const patientName = `TEST Queue ${runId} staff entry`;
    const patientEmail = `queue-${runId}-staff@example.test`;
    const schedulingNote = "TEST Staff entry — afternoons work best; no medical details.";
    let requestId: string | null = null;

    try {
      await signIn(page);
      await page.getByTestId("home-add-patient-request").click();
      await expect(page).toHaveURL(/\/admin\/?$/);
      await expect(page.getByTestId("add-appointment-dialog")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Add request" })).toBeVisible();
      await expect(page.getByText("Keep this to scheduling.")).toBeVisible();

      const form = page.getByRole("form", { name: "Add request" });
      const name = form.locator("#staff-request-name");
      const phone = form.locator("#staff-request-phone");
      const idempotency = form.locator('input[name="idempotencyKey"]');
      const originalKey = await idempotency.inputValue();

      // The sheet checks every field before it posts: the first one to fix
      // Takes focus and names its fix, the draft and the idempotency key
      // Stay, and nothing reaches the server until the fix is made.
      await name.fill(patientName);
      await form.locator("#staff-request-message").fill(schedulingNote);
      await page.getByTestId("submit-staff-request").click();
      await expect(phone).toBeFocused();
      await expect(phone).toHaveAttribute("aria-invalid", "true");
      await expect(form).toContainText("Enter all 10 digits, with the area code.");
      await expect(page.getByTestId("staff-request-error")).toHaveCount(0);
      await expect(name).toHaveValue(patientName);
      await expect(form.locator("#staff-request-message")).toHaveValue(schedulingNote);
      await expect(idempotency).toHaveValue(originalKey);

      await phone.fill("8135550188");
      await expect(phone).not.toHaveAttribute("aria-invalid", "true");
      await form.locator("#staff-request-email").fill(patientEmail);
      await form
        .getByRole("radiogroup", { name: "Office" })
        .getByRole("radio", { name: "Lutz" })
        .click();
      await form
        .getByRole("radiogroup", { name: "Time" })
        .getByRole("radio", { name: "Afternoon" })
        .click();
      await expect(form.locator('input[name="location"]:checked')).toHaveValue("lutz");
      await expect(form.locator('input[name="time"]:checked')).toHaveValue("afternoon");
      await page.getByTestId("submit-staff-request").click();

      await expect(page.getByTestId("add-appointment-dialog")).toBeHidden({ timeout: 15_000 });
      await expect(page.getByText(`${patientName} is on the line under New.`)).toBeVisible();

      const { data: createdRow, error: createdRowError } = await db
        .from("requests")
        .select("id")
        .eq("email", patientEmail)
        .single();
      expect(createdRowError).toBeNull();
      const parsedCreatedRow = createdRequestRowSchema.safeParse(createdRow);
      requestId = parsedCreatedRow.success ? parsedCreatedRow.data.id : null;
      expect(requestId).not.toBeNull();

      const { data: row, error: rowError } = await db
        .from("requests")
        .select("status, source_path, locale")
        .eq("id", requestId!)
        .single();
      expect(rowError).toBeNull();
      expect(row).toMatchObject({
        status: "new",
        source_path: "/admin/requests/new",
        locale: "en",
      });

      const { data: creationEvents, error: eventError } = await db
        .from("request_events")
        .select("type, status, meta")
        .eq("request_id", requestId!)
        .eq("type", "created");
      expect(eventError).toBeNull();
      expect(creationEvents).toHaveLength(1);
      expect(creationEvents?.[0]).toMatchObject({
        type: "created",
        status: "recorded",
        meta: { origin: "staff" },
      });

      const { data: creationAudits, error: auditError } = await db
        .from("audit_log")
        .select("actor_email, action, source, detail")
        .eq("entity_id", requestId!)
        .eq("action", "request.create");
      expect(auditError).toBeNull();
      expect(creationAudits).toHaveLength(1);
      expect(creationAudits?.[0]).toMatchObject({
        actor_email: SEED_EMAIL.toLowerCase(),
        action: "request.create",
        source: "staff",
        detail: { origin: "staff" },
      });
      const auditJson = JSON.stringify(creationAudits?.[0]?.detail ?? null);
      expect(auditJson).not.toContain(patientName);
      expect(auditJson).not.toContain("8135550188");
      expect(auditJson).not.toContain(patientEmail);

      const { count: outboxCount, error: outboxError } = await db
        .from("notification_outbox")
        .select("id", { count: "exact", head: true })
        .eq("request_id", requestId!);
      expect(outboxError).toBeNull();
      expect(outboxCount).toBe(0);

      const { data: receipt, error: receiptError } = await db
        .from("staff_request_receipts")
        .select("idempotency_key, request_id")
        .eq("idempotency_key", originalKey)
        .single();
      expect(receiptError).toBeNull();
      expect(receipt).toMatchObject({ idempotency_key: originalKey, request_id: requestId });

      // The Activity log names the work in plain language — never the
      // Raw request.create action identifier.
      await page.goto("/admin/audit");
      const activity = page.getByTestId("activity-feed");
      await expect(activity).toBeVisible();
      await expect(activity).toContainText("added an appointment request");
      await expect(activity).not.toContainText("request.create");
    } finally {
      const ids = new Set<string>();
      if (requestId !== null) ids.add(requestId);
      const { data: rows } = await db.from("requests").select("id").eq("email", patientEmail);
      for (const row of z.array(z.object({ id: z.string() })).parse(rows ?? [])) {
        ids.add(row.id);
      }
      if (ids.size > 0) {
        const stagedIds = [...ids];
        await db.from("requests").delete().in("id", stagedIds);
        await db.from("audit_log").delete().in("entity_id", stagedIds);
      }
    }
  });

  test("VAL-ADMIN-006: notes persist with attribution and survive reload", async ({
    page,
    request,
  }) => {
    const patientName = `TEST Queue ${runId} notes`;
    const staged = await request.post("/api/requests", {
      data: {
        name: patientName,
        phone: "8135550177",
        email: `queue-${runId}-notes@example.test`,
        location: "tampa",
        time: "morning",
        message: "TEST staged request notes - no medical details.",
        locale: "en",
        sourcePath: "/en/appointment",
      },
      headers: { "X-Forwarded-For": testIp("notes") },
    });
    expect(staged.status()).toBe(201);
    const body = intakeResponseSchema.parse(await staged.json());
    if (!body.ok) throw new Error("Expected an accepted intake response");
    const { id } = body;
    const noteText = `TEST note ${runId} — prefers a call after 3pm.`;

    try {
      await signIn(page);
      await page.goto(`/admin/schedule?request=${id}`);
      const sheet = page.getByRole("dialog", { name: patientName });
      await expect(sheet).toBeVisible();

      await sheet.getByRole("button", { name: "Add a note" }).click();
      await page.getByRole("textbox", { name: "Note" }).fill(noteText);
      await page.getByRole("button", { name: "Save note" }).click();
      await expect(page.getByTestId("request-note-toast")).toContainText("Note added.");

      await page.reload();
      await expect(page.getByRole("dialog", { name: patientName })).toContainText(noteText);

      const { data: unchangedStatus, error: statusError } = await db
        .from("requests")
        .select("status")
        .eq("id", id)
        .single();
      expect(statusError).toBeNull();
      expect(unchangedStatus?.status).toBe("new");

      const { data: events, error } = await db
        .from("request_events")
        .select("type, meta")
        .eq("request_id", id)
        .eq("type", "note");
      expect(error).toBeNull();
      expect(events).toHaveLength(1);
      const meta = noteMetaSchema.parse(events?.[0]?.meta ?? {});
      expect(meta.text).toBe(noteText);
      expect(meta.author_email?.toLowerCase()).toBe(SEED_EMAIL.toLowerCase());
    } finally {
      await db.from("requests").delete().eq("id", id);
      await db.from("audit_log").delete().eq("entity_id", id);
    }
  });
});
