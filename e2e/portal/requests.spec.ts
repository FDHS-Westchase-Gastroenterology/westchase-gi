import { randomUUID } from "node:crypto";

import { test, expect } from "@playwright/test";
import type { Page, APIRequestContext } from "@playwright/test";
import { z } from "zod";

import { followUpWhenLabel } from "../../src/app/admin/(portal)/requests/format";
import { asJsonObject, asJsonString, jsonSchema } from "../../src/lib/json";
import { resolveFollowUpAt } from "../../src/lib/portal/business-time";
import { intakeResponseSchema } from "../../src/lib/portal/contracts";
import { clientIps, runId, seedAdmin, serviceDb } from "../harness/env";
import { signIn } from "../harness/session";

const noteMetaSchema = z.object({
  text: z.string().optional(),
  author_email: z.string().optional(),
});
const transitionRowSchema = z.object({
  command: z.string(),
  from_state: z.string(),
  to_state: z.string(),
});
const undoTransitionRowSchema = transitionRowSchema.extend({
  compensates_transition_id: z.string().nullable(),
});
const createdRequestRowSchema = z.object({ id: z.uuid() });

// VAL-ADMIN-003: the queue leads with the oldest unworked requests first.
// VAL-ADMIN-004: status filtering matches SQL counts exactly.
// VAL-ADMIN-005: detail shows all fields; the full appointment-request lifecycle persists.
// VAL-ADMIN-006: staff notes persist with attribution and re-render.

const { email: SEED_EMAIL } = seedAdmin();

const db = serviceDb();

const testIp = clientIps("requests");

// The portal owns the appointment calendar, so a Scheduled save must name the
// Day and wall-clock time of the appointment before Save becomes available.
async function nameTheAppointment(page: Page, daysAhead: number): Promise<void> {
  const day = new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);
  await page.getByTestId("appointment-day").fill(day);
  await page.getByTestId("appointment-time").fill("14:30");
}

function expectedReopenHistoryLine(kind: "tomorrow_morning" | "friday"): string {
  const callAgainAt = resolveFollowUpAt({ kind });
  if (callAgainAt === null || callAgainAt === "") {
    throw new Error("Call-again time for the chosen reopen day could not be resolved");
  }
  return `Reopened — returned to Contacted — call again ${followUpWhenLabel(callAgainAt)}`;
}

function payload(label: string) {
  return {
    name: `TEST Queue ${runId} ${label}`,
    phone: "8135550177",
    email: `queue-${runId}-${label}@example.test`,
    location: "tampa",
    time: "morning",
    message: `TEST staged request ${label} - no medical details.`,
    locale: "en",
    sourcePath: "/en/appointment",
  };
}

async function stageRequest(request: APIRequestContext, label: string): Promise<string> {
  const response = await request.post("/api/requests", {
    data: payload(label),
    headers: { "X-Forwarded-For": testIp(label) },
  });
  expect(response.status()).toBe(201);
  const body = intakeResponseSchema.parse(await response.json());
  expect(body.ok).toBe(true);
  if (!body.ok) throw new Error("Expected an accepted intake response");
  return body.id;
}

// The Appointments views are presentation views over durable statuses:
// The Scheduled view reads `booked` (plus `scheduled` rows that may exist
// Only mid-deploy). The word "scheduled" is never a durable status.
const VIEW_DB_STATUSES = {
  new: ["new"],
  contacted: ["contacted"],
  scheduled: ["booked", "scheduled"],
  closed: ["closed"],
} as const;

async function sqlCount(view: keyof typeof VIEW_DB_STATUSES): Promise<number> {
  const { count, error } = await db
    .from("requests")
    .select("id", { count: "exact", head: true })
    .in("status", VIEW_DB_STATUSES[view]);
  expect(error).toBeNull();
  return count ?? 0;
}

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
      await expect(page.getByRole("heading", { name: "Add appointment request" })).toBeVisible();
      await expect(page.getByText("Keep this to scheduling.")).toBeVisible();

      const form = page.getByRole("form", { name: "Add appointment request" });
      const name = form.locator("#staff-request-name");
      const phone = form.locator("#staff-request-phone");
      const idempotency = form.locator('input[name="idempotencyKey"]');
      const originalKey = await idempotency.inputValue();

      // Server validation preserves the draft and the idempotency key. This
      // Lets staff correct one field without retyping or risking a duplicate
      // After an ambiguous save attempt.
      await name.fill(patientName);
      await form.locator("#staff-request-message").fill(schedulingNote);
      await page.getByTestId("submit-staff-request").click();
      await expect(phone).toBeFocused();
      await expect(page.getByTestId("staff-request-error")).toContainText(
        "Check the highlighted fields.",
      );
      await expect(name).toHaveValue(patientName);
      await expect(form.locator("#staff-request-message")).toHaveValue(schedulingNote);
      await expect(idempotency).toHaveValue(originalKey);

      await phone.fill("8135550188");
      await form.locator("#staff-request-email").fill(patientEmail);
      await form.locator("#staff-request-location").selectOption("lutz");
      await form.locator("#staff-request-time").selectOption("afternoon");
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

      await page.goto(`/admin/requests/${requestId}`);
      await expect(page.getByTestId("request-detail-name")).toHaveText(patientName);
      await expect(page.getByTestId("request-intake-meta")).toContainText("Added by staff");
      await expect(page.getByTestId("request-history")).toContainText(
        "Appointment request added by staff",
      );
      await expect(page.locator('[data-status="new"]')).toBeVisible();

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

      // The acknowledgement consumes only its own query flag. Queue scope
      // Remains a valid deep link, and the banner survives this first paint
      // But not the next note or workflow result.
      await page.goto(
        `/admin/requests/${requestId!}?status=new&q=deep-link-check&page=2&created=1#request-notes`,
      );
      await expect(page).toHaveURL(
        new RegExp(
          `/admin/requests/${requestId!}\\?status=new&q=deep-link-check&page=2#request-notes$`,
        ),
      );
      await expect(page.getByTestId("staff-request-created")).toBeVisible();

      const notesSection = page.getByTestId("request-notes");
      await notesSection.getByRole("button", { name: "Add note", exact: true }).click();
      const noteField = notesSection.getByLabel("Note", { exact: true });

      // A recoverable field error belongs to the draft. A later output status
      // May coexist with it, but must not detach or erase its recovery text.
      await noteField.fill("   ");
      await notesSection.locator("form").evaluate((form) => {
        if (!(form instanceof HTMLFormElement)) throw new Error("Expected the note form");
        form.requestSubmit();
      });
      const noteError = notesSection.getByTestId("request-note-feedback");
      await expect(noteError).toContainText("Your note is still here");
      await expect(noteField).toHaveAttribute("aria-describedby", /request-note-error/);
      await page.evaluate(() => {
        window.print = () => {
          document.documentElement.dataset.testRequestPrintCalls = String(
            Number(document.documentElement.dataset.testRequestPrintCalls ?? "0") + 1,
          );
        };
      });
      const requestPrint = page.getByRole("button", { name: "Print request" });
      await requestPrint.click();
      await expect(page.getByTestId("request-print-feedback")).toHaveText(
        "Print dialog is opening for this request.",
      );
      await expect(requestPrint).toBeFocused();
      await expect(noteError).toContainText("Your note is still here");
      await expect(noteField).toHaveAttribute("aria-describedby", /request-note-error/);

      await noteField.fill("TEST creation acknowledgement replacement note.");
      await expect(noteError).toHaveCount(0);
      await expect(noteField).not.toHaveAttribute("aria-describedby", /request-note-error/);
      await notesSection.getByRole("button", { name: "Save note" }).click();
      await expect(notesSection.getByTestId("request-note-feedback")).toHaveText("Note added.");
      await expect(notesSection.getByRole("button", { name: "Add note" })).toBeFocused();
      await expect(page.getByTestId("staff-request-created")).toHaveCount(0);
      await expect(page).toHaveURL(
        new RegExp(
          `/admin/requests/${requestId!}\\?status=new&q=deep-link-check&page=2#request-notes$`,
        ),
      );

      // Server actions must not restore the consumed flag from Next's route
      // State. A hard reload keeps the queue scope and does not replay success.
      await page.reload();
      await expect(page).toHaveURL(
        new RegExp(
          `/admin/requests/${requestId!}\\?status=new&q=deep-link-check&page=2#request-notes$`,
        ),
      );
      await expect(page.getByTestId("staff-request-created")).toHaveCount(0);
      await expect(
        notesSection.getByText("TEST creation acknowledgement replacement note."),
      ).toBeVisible();

      // Dismissing the newer note result must not resurrect the consumed
      // Creation acknowledgement underneath it.
      await notesSection.getByRole("button", { name: "Add note" }).click();
      await expect(notesSection.getByLabel("Note", { exact: true })).toBeFocused();
      await expect(page.getByTestId("staff-request-created")).toHaveCount(0);
      await notesSection.getByRole("button", { name: "Cancel" }).click();
      await expect(notesSection.getByRole("button", { name: "Add note" })).toBeFocused();

      const workflowPanel = page.getByTestId("workflow-panel");
      await workflowPanel.getByText("Left a voicemail — call again", { exact: true }).click();
      await workflowPanel.getByText("Tomorrow morning", { exact: true }).click();
      await page.getByTestId("save-workflow").click();
      await expect(page.getByTestId("workflow-feedback")).toContainText("Saved");
      await expect(page.getByTestId("workflow-feedback")).not.toBeFocused();
      await expect(notesSection.getByTestId("request-note-feedback")).toHaveCount(0);
      await expect(page.getByTestId("staff-request-created")).toHaveCount(0);
      await expect(notesSection.getByLabel("Note", { exact: true })).toBeHidden();
      await expect(notesSection.getByRole("button", { name: "Add note" })).toBeVisible();
      await expect(page).toHaveURL(
        new RegExp(
          `/admin/requests/${requestId!}\\?status=new&q=deep-link-check&page=2#request-notes$`,
        ),
      );

      await page.reload();
      await expect(page).toHaveURL(
        new RegExp(
          `/admin/requests/${requestId!}\\?status=new&q=deep-link-check&page=2#request-notes$`,
        ),
      );
      await expect(page.getByTestId("staff-request-created")).toHaveCount(0);
      await expect(
        notesSection.getByText("TEST creation acknowledgement replacement note."),
      ).toBeVisible();

      await page.getByTestId("undo-latest").click();
      await expect(page.getByTestId("workflow-feedback")).toContainText(
        "Undone — this request is New again.",
      );
      await expect(notesSection.getByTestId("request-note-feedback")).toHaveCount(0);
      await expect(page.getByTestId("staff-request-created")).toHaveCount(0);

      // The human audit view names the work in plain language — never the
      // Raw request.create action identifier.
      await page.goto("/admin/audit");
      const recentWork = page.getByTestId("recent-work-list").first();
      await expect(recentWork).toBeVisible();
      await expect(recentWork).toContainText("added an appointment request");
      await expect(recentWork).not.toContainText("request.create");

      await page.goto(`/admin/requests?q=${encodeURIComponent(patientEmail)}`);
      const rowLink = page.getByTestId("request-row").filter({ hasText: patientName });
      await expect(rowLink).toBeVisible();
      await expect(rowLink.locator('[data-status="new"]')).toBeVisible();
      await expect(page.getByTestId("appointments-add-patient-request")).toHaveAttribute(
        "href",
        "/admin/requests/new?from=appointments",
      );
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

  test("VAL-ADMIN-003: the queue leads with the oldest unworked requests first", async ({
    page,
    request,
  }) => {
    const firstId = await stageRequest(request, "older");
    const secondId = await stageRequest(request, "newer");

    await signIn(page);
    await page.goto("/admin/requests");

    // Attention-first: between two unworked New requests, the older one —
    // The one that has waited longer — comes before the newer one.
    const names = await page.getByTestId("request-name").allTextContents();
    const newerIndex = names.findIndex((name) => name.includes("newer"));
    const olderIndex = names.findIndex((name) => name.includes("older"));
    expect(newerIndex).toBeGreaterThanOrEqual(0);
    expect(olderIndex).toBeGreaterThanOrEqual(0);
    expect(olderIndex).toBeLessThan(newerIndex);

    // Both staged rows carry the New badge in the queue.
    const newerRow = page
      .locator('[data-testid="request-row"]', {
        hasText: `TEST Queue ${runId} newer`,
      })
      .first();
    await expect(newerRow.locator('[data-status="new"]')).toBeVisible();

    // A fresh appointment request appears after refresh with status new.
    const thirdId = await stageRequest(request, "fresh");
    await page.reload();
    const freshRow = page
      .locator('[data-testid="request-row"]', {
        hasText: `TEST Queue ${runId} fresh`,
      })
      .first();
    await expect(freshRow).toBeVisible();
    await expect(freshRow.locator('[data-status="new"]')).toBeVisible();

    expect(firstId && secondId && thirdId).toBeTruthy();
  });

  test("VAL-ADMIN-005: detail prioritizes contact context and the workflow panel drives the appointment-request lifecycle", async ({
    page,
    request,
  }) => {
    test.slow();
    const id = await stageRequest(request, "lifecycle");
    const staged = payload("lifecycle");
    const visibleRecipient = `queue-${runId}-recipient@example.test`;
    const { error: notificationError } = await db.from("request_events").insert([
      {
        request_id: id,
        type: "notification",
        recipient: "jason.gitdev@gmail.com",
        status: "accepted",
      },
      {
        request_id: id,
        type: "notification",
        recipient: visibleRecipient,
        status: "accepted",
      },
    ]);
    expect(notificationError).toBeNull();

    await signIn(page);
    await page.goto(`/admin/requests/${id}`);

    await expect(page.getByTestId("request-detail-name")).toHaveText(staged.name);
    // The detail workspace preserves a clear return path to the same queue.
    await expect(page.getByRole("link", { name: "Back to Appointments" })).toHaveAttribute(
      "href",
      "/admin/requests",
    );
    const details = page.locator('section[aria-labelledby="request-details-heading"]');
    // A dialable href is E.164: numbers are stored as submitted, and a staff
    // Surface exists to be tapped once and connect.
    await expect(details.getByTestId("request-phone-link")).toHaveAttribute(
      "href",
      `tel:+1${staged.phone}`,
    );
    await expect(details.getByRole("link", { name: /^Call patient/ })).toBeVisible();
    await expect(details.getByTestId("request-phone-link")).toContainText("(813) 555-0177");
    await expect(details.getByTestId("request-email-link")).toHaveAttribute(
      "href",
      `mailto:${staged.email}`,
    );
    await expect(details.getByRole("link", { name: /^Email patient/ })).toBeVisible();
    await expect(details.getByTestId("request-preferences")).toContainText("Tampa");
    await expect(details.getByTestId("request-preferences")).toContainText("Morning");
    await expect(details.getByTestId("request-intake-meta")).toContainText("Received");
    await expect(details.getByTestId("request-intake-meta")).toContainText("English form");
    await expect(page.getByTestId("request-message")).toContainText(staged.message);
    await expect(page.getByText("/en/appointment", { exact: true })).toHaveCount(0);
    // Every recorded delivery attempt renders in Request history — no
    // Address is hidden (staff addresses are operational, not PHI).
    const history = page.getByTestId("request-history");
    await expect(history).toContainText(visibleRecipient);
    await expect(history).toContainText("jason.gitdev@gmail.com");

    const panel = page.getByTestId("workflow-panel");
    const feedback = page.getByTestId("workflow-feedback");
    async function statusOf() {
      const { data, error } = await db
        .from("requests")
        .select(
          "status, closure_reason, closed_at, follow_up_at, record_handoff_at, appointment_at",
        )
        .eq("id", id)
        .single();
      expect(error).toBeNull();
      return data;
    }

    // Every Contacted-producing outcome requires a call-again choice. The
    // Reached path was the audit gap: Save stays unavailable, and the choice
    // Group itself explains what is missing before staff choose a time.
    await panel.getByText("Reached the patient — follow-up needed", { exact: true }).click();
    await expect(page.getByTestId("save-workflow")).toBeDisabled();
    await expect(page.getByTestId("call-again-required-explanation")).toContainText(
      "Choose one before Save",
    );
    await panel.getByText("Pick a day…", { exact: true }).click();
    const customDay = page.getByTestId("call-again-day");
    const dayLabel = page.getByText("Call again on", { exact: false });
    await expect(dayLabel).toBeVisible();
    await expect(dayLabel).toHaveAttribute("for", "call-again-day");
    await expect(customDay).toHaveAccessibleName(/Call again on/);
    await expect(customDay).toHaveAttribute("aria-required", "true");
    await expect(customDay).toHaveAttribute("aria-describedby", /call-again-day-hint/);
    await expect(page.locator("#call-again-day-hint")).toContainText(
      "Required when Pick a day is selected",
    );
    await expect(page.locator("#call-again-day-hint")).toContainText("Save stays unavailable");
    const pickADay = page.locator("#call-again-kind-day");
    await expect(pickADay).toHaveAttribute("aria-controls", "call-again-day");
    const minimumDay = await customDay.getAttribute("min");
    expect(minimumDay).not.toBeNull();
    if (minimumDay === null) throw new Error("Custom call-again input is missing its minimum day");
    const minimumDayMs = Date.parse(`${minimumDay}T00:00:00.000Z`);
    const beforeMinimum = new Date(minimumDayMs - 86_400_000).toISOString().slice(0, 10);
    const validCustomDay = new Date(minimumDayMs + 2 * 86_400_000).toISOString().slice(0, 10);
    await customDay.fill(beforeMinimum);
    await expect(page.getByTestId("save-workflow")).toBeDisabled();
    await expect(customDay).toHaveAttribute("aria-invalid", "true");
    await expect(customDay).toHaveAttribute("aria-describedby", /call-again-error/);
    const callAgainError = page.locator("#call-again-error");
    await expect(callAgainError).toHaveAttribute("role", "alert");
    await expect(callAgainError).toHaveText("Choose today or a day within the next 90 days.");
    await customDay.fill(validCustomDay);
    await expect(page.getByTestId("save-workflow")).toBeEnabled();
    await expect(customDay).not.toHaveAttribute("aria-invalid", "true");
    await page.getByTestId("save-workflow").click();
    await expect(feedback).toContainText("resurface");
    const afterReached = await statusOf();
    expect(afterReached?.status).toBe("contacted");
    expect(afterReached?.follow_up_at).toBeTruthy();
    await expect(page.getByTestId("workflow-current-state")).toContainText("Contacted");
    await expect(page.getByTestId("workflow-current-state")).toContainText("call again");

    // The three preset shapes use the same required Reached path and each
    // Saves a concrete call-again time. Repeated Contacted attempts remain
    // Separate history instead of overwriting the original action.
    for (const preset of ["This afternoon", "Tomorrow morning", "Friday"] as const) {
      await panel.getByText("Reached the patient — follow-up needed", { exact: true }).click();
      await panel.getByText(preset, { exact: true }).click();
      await page.getByTestId("save-workflow").click();
      await expect(feedback).toContainText("resurface");
    }

    // The daily success path: booked in the practice system, presented as
    // Scheduled everywhere. The durable row is `booked`; the word
    // "scheduled" is presentation-only.
    // Booking now owns the appointment calendar, so Scheduled cannot be
    // Recorded without saying when the appointment is.
    await panel.getByText("Appointment booked", { exact: true }).click();
    await expect(page.getByTestId("save-workflow")).toBeDisabled();
    await nameTheAppointment(page, 7);
    await expect(page.getByTestId("save-workflow")).toBeEnabled();
    await page.getByTestId("save-workflow").click();
    await expect(feedback).toContainText("marked Scheduled");
    const afterBooked = await statusOf();
    expect(afterBooked?.status).toBe("booked");
    expect(afterBooked?.record_handoff_at).toBeTruthy();
    expect(afterBooked?.appointment_at).toBeTruthy();
    await expect(page.getByTestId("workflow-current-state")).toContainText("Scheduled");

    // Reopen asks for the next call before touching the resolved record.
    // Cancel after making a choice leaves both the request and its evidence
    // Chain exactly as they were.
    const { count: transitionsBeforeCancel, error: transitionsBeforeCancelError } = await db
      .from("request_transitions")
      .select("id", { count: "exact", head: true })
      .eq("request_id", id);
    expect(transitionsBeforeCancelError).toBeNull();
    await page.getByTestId("reopen-request").click();
    await expect(page.getByTestId("confirm-reopen")).toBeDisabled();
    await page.getByTestId("reopen-controls").getByText("Friday", { exact: true }).click();
    await page.getByTestId("cancel-reopen").click();
    await expect(page.getByTestId("reopen-controls")).toHaveCount(0);
    expect(await statusOf()).toEqual(afterBooked);
    const { count: transitionsAfterCancel, error: transitionsAfterCancelError } = await db
      .from("request_transitions")
      .select("id", { count: "exact", head: true })
      .eq("request_id", id);
    expect(transitionsAfterCancelError).toBeNull();
    expect(transitionsAfterCancel).toBe(transitionsBeforeCancel);

    // A confirmed Reopen enters Contacted with the chosen call-again time.
    await page.getByTestId("reopen-request").click();
    await page
      .getByTestId("reopen-controls")
      .getByText("Tomorrow morning", { exact: true })
      .click();
    await page.getByTestId("confirm-reopen").click();
    await expect(feedback).toContainText("Reopened — back to Contacted");
    const reopened = await statusOf();
    expect(reopened?.status).toBe("contacted");
    expect(reopened?.record_handoff_at).toBeNull();
    expect(reopened?.follow_up_at).toBeTruthy();
    // Reopening un-books the request, so the appointment it held is gone.
    expect(reopened?.appointment_at).toBeNull();
    const newestHistory = page.getByTestId("request-history").locator("li").first();
    await expect(newestHistory).toContainText(expectedReopenHistoryLine("tomorrow_morning"));
    await expect(newestHistory).not.toContainText("no call-again day was set");

    // Undo restores the exact prior Scheduled snapshot, including its
    // Handoff clock and cleared call-again/closure fields. The original
    // Reopen remains visible as later-undone evidence.
    await page.getByTestId("undo-latest").click();
    await expect(feedback).toContainText("Undone — this request is Scheduled again.");
    expect(await statusOf()).toEqual(afterBooked);
    await expect(page.getByTestId("request-history")).toContainText("later undone");

    // Reopen once more so this same fictional request can exercise the
    // Distinct Closed outcome below.
    await page.getByTestId("reopen-request").click();
    await page.getByTestId("reopen-controls").getByText("Friday", { exact: true }).click();
    await page.getByTestId("confirm-reopen").click();
    await expect(feedback).toContainText("Reopened — back to Contacted");
    await expect(page.getByTestId("request-history").locator("li").first()).toContainText(
      expectedReopenHistoryLine("friday"),
    );

    // Closing records the concrete reason the database needs.
    await panel.getByText("Patient won't schedule", { exact: true }).click();
    await page.getByTestId("save-workflow").click();
    await expect(feedback).toContainText("closed");
    const closed = await statusOf();
    expect(closed?.status).toBe("closed");
    expect(closed?.closure_reason).toBe("wont_schedule");
    expect(closed?.closed_at).toBeTruthy();
    expect(closed?.follow_up_at).toBeNull();
    expect(closed?.appointment_at).toBeNull();
    // The call sheet is the request's stable anchor. Contact details,
    // Preferences, and the patient note remain available after resolution.
    await expect(details.getByTestId("request-phone-link")).toBeVisible();
    await expect(details.getByTestId("request-preferences")).toContainText("Tampa");
    await expect(details.getByTestId("request-message")).toContainText(staged.message);

    // Every accepted command leaves exactly one immutable transition and
    // One PHI-free workflow audit entry; the retired generic status
    // Setter's audit action never appears.
    const { data: transitions, error: transitionsError } = await db
      .from("request_transitions")
      .select("command, from_state, to_state")
      .eq("request_id", id)
      .order("occurred_at");
    expect(transitionsError).toBeNull();
    expect(
      z
        .array(transitionRowSchema)
        .parse(transitions ?? [])
        .map((row) => [row.command, row.from_state, row.to_state]),
    ).toEqual([
      ["record_contact_attempt", "new", "contacted"],
      ["record_contact_attempt", "contacted", "contacted"],
      ["record_contact_attempt", "contacted", "contacted"],
      ["record_contact_attempt", "contacted", "contacted"],
      ["confirm_booking_handoff", "contacted", "booked"],
      ["reopen_request", "booked", "contacted"],
      ["undo_latest_transition", "contacted", "booked"],
      ["reopen_request", "booked", "contacted"],
      ["close_request", "contacted", "closed"],
    ]);

    const { data: workflowAudits, error: workflowAuditError } = await db
      .from("audit_log")
      .select("detail")
      .eq("entity_id", id)
      .eq("action", "request.workflow_command");
    expect(workflowAuditError).toBeNull();
    expect(workflowAudits).toHaveLength(9);
    for (const audit of workflowAudits ?? []) {
      const detailText = JSON.stringify(audit.detail);
      expect(detailText).not.toContain(staged.name);
      expect(detailText).not.toContain(staged.phone);
    }

    const { data: statusAudits, error: statusAuditError } = await db
      .from("audit_log")
      .select("detail")
      .eq("entity_id", id)
      .eq("action", "request.status_change");
    expect(statusAuditError).toBeNull();
    expect(statusAudits).toHaveLength(0);

    // The human Recent work view never shows the raw workflow-command
    // Identifier; the Technical record beneath keeps it for administrators.
    await page.goto("/admin/audit");
    const recentWork = page.getByTestId("recent-work-list").first();
    await expect(recentWork).toBeVisible();
    await expect(recentWork).not.toContainText("request.workflow_command");
    await expect(page.getByTestId("audit-table")).toContainText("request.workflow_command");
  });

  test("VAL-ADMIN-005b: unsafe legacy email never becomes a mail link", async ({ page }) => {
    const unsafeEmail = `queue-${runId}-unsafe@example.test?subject=Injected`;
    const { data, error } = await db
      .from("requests")
      .insert({
        name: `TEST Queue ${runId} unsafe email`,
        phone: "8135550178",
        email: unsafeEmail,
        location: "tampa",
        preferred_time: "morning",
        message: "TEST unsafe legacy email - no medical details.",
        locale: "en",
        source_path: "/en/appointment",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    if (!data) throw new Error("Unsafe email fixture was not created");

    await signIn(page);
    await page.goto(`/admin/requests/${data.id}`);

    const fallback = page.getByTestId("request-email-unavailable");
    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText("No email provided");
    await expect(fallback.locator('a[href^="mailto:"]')).toHaveCount(0);
  });

  test("VAL-ADMIN-005c: long intake content reflows without clipping", async ({ page }) => {
    const longEmail = `queue-${runId}-edge@${"a".repeat(50)}.${"b".repeat(50)}.${"c".repeat(50)}.test`;
    const longMessage = `TEST ${"unbrokenintakedetail".repeat(90)}`;
    const { data, error } = await db
      .from("requests")
      .insert({
        name: `TEST Queue ${runId} long content`,
        phone: "18135550179",
        email: longEmail,
        location: "any",
        preferred_time: "any",
        message: longMessage,
        locale: "vi",
        source_path: "/vi/appointment",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    if (!data) throw new Error("Long-content fixture was not created");

    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await page.goto(`/admin/requests/${data.id}`);

    const details = page.locator('section[aria-labelledby="request-details-heading"]');
    await expect(details).toBeVisible();
    const layout = await details.evaluate((section) => {
      const emailCopy = section.querySelector(
        '[data-testid="request-email-link"] .portal-request-contact-copy',
      );
      const message = section.querySelector('[data-testid="request-message"]');
      if (!(emailCopy instanceof HTMLElement) || !(message instanceof HTMLElement)) {
        throw new Error("Long-content wrapping targets are not ready");
      }
      const rect = section.getBoundingClientRect();
      return {
        x: rect.x,
        width: rect.width,
        wrapping: [
          { clientWidth: emailCopy.clientWidth, scrollWidth: emailCopy.scrollWidth },
          { clientWidth: message.clientWidth, scrollWidth: message.scrollWidth },
        ],
      };
    });
    for (const box of layout.wrapping) {
      expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth + 1);
    }
    expect(layout.x + layout.width).toBeLessThanOrEqual(390);

    await page.emulateMedia({ media: "print" });
    await expect(details).toHaveCSS("overflow", "visible");
    const printMessage = await details.getByTestId("request-message").evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(printMessage.scrollWidth).toBeLessThanOrEqual(printMessage.clientWidth + 1);
  });

  // The outcome surface's interaction contract: one native radio group.
  // One keyboard sequence covers every outcome.
  // The call-again plan appears directly beneath the selected continuing-work row.
  // Reduced motion makes the reveal instant.
  // The mobile commit shelf clears the fixed bottom index.
  test("VAL-ADMIN-018: outcome decisions stay one keyboard sequence with an in-place plan", async ({
    page,
    request,
  }) => {
    const id = await stageRequest(request, "keyboard");
    await signIn(page);
    await page.goto(`/admin/requests/${id}`);

    const panel = page.getByTestId("workflow-panel");
    const group = page.getByRole("group", { name: "What happened?" });
    await expect(group).toBeVisible();
    const radios = group.getByRole("radio");
    // A NEW request exposes the attempt, booking, and non-contact closure outcomes.
    // The captions mark the kinds without forking the group.
    await expect(radios).toHaveCount(5);
    await expect(panel.getByText("Continue working", { exact: true })).toBeVisible();
    await expect(panel.getByText("Appointment completed", { exact: true })).toBeVisible();
    await expect(panel.getByText("Close without an appointment", { exact: true })).toBeVisible();

    // Arrow keys walk the whole set in DOM order and check as they go.
    const first = radios.first();
    await first.focus();
    await expect(first).toBeFocused();
    const values = await radios.evaluateAll((inputs) =>
      inputs.map((input) => (input instanceof HTMLInputElement ? input.value : "(not-an-input)")),
    );
    for (let index = 1; index < values.length; index += 1) {
      await page.keyboard.press("ArrowDown");
      const state = await page.evaluate(() => {
        const active = document.activeElement;
        return active instanceof HTMLInputElement
          ? { value: active.value, checked: active.checked }
          : { value: "(none)", checked: false };
      });
      expect(state.value).toBe(values[index]);
      expect(state.checked).toBe(true);
    }

    // The call-again plan appears directly beneath the selected row, not after the whole list.
    const voicemail = group.getByRole("radio", { name: /Left a voicemail/ });
    await voicemail.focus();
    await page.keyboard.press("Space");
    await expect(voicemail).toBeChecked();
    const reveal = panel.locator(".portal-choice-reveal");
    await expect(reveal).toBeVisible();
    const adjacent = await reveal.evaluate((node) => {
      const sibling = node.previousElementSibling;
      const input = sibling?.querySelector("input[type=radio]");
      return {
        siblingIsRow: sibling?.classList.contains("portal-choice-row") ?? false,
        siblingValue: input instanceof HTMLInputElement ? input.value : null,
      };
    });
    expect(adjacent.siblingIsRow).toBe(true);
    expect(adjacent.siblingValue).toBe("attempt:voicemail");

    // Tab reaches the dependent plan straight after the selected choice.
    await page.keyboard.press("Tab");
    const planFocus = await page.evaluate(() =>
      document.activeElement instanceof HTMLInputElement
        ? { name: document.activeElement.name, value: document.activeElement.value }
        : null,
    );
    expect(planFocus?.name).toBe("call-again");

    // ArrowDown from the voicemail row lands on the next outcome, not the plan's fields.
    await voicemail.focus();
    await page.keyboard.press("ArrowDown");
    const afterSkip = await page.evaluate(() =>
      document.activeElement instanceof HTMLInputElement ? document.activeElement.value : null,
    );
    expect(afterSkip).toBe("attempt:no_answer");

    // Reduced motion makes the reveal effectively instant.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(reveal).toHaveCSS("animation-name", "none");
    await page.emulateMedia({ reducedMotion: null });
    await expect(reveal).toHaveCSS("animation-name", "portal-choice-reveal-in");

    // The mobile commit shelf sticks only with a choice active.
    // It clears the fixed bottom navigation.
    await page.setViewportSize({ width: 390, height: 844 });
    await panel.scrollIntoViewIfNeeded();
    const shelf = panel.locator(".portal-commit-shelf");
    await expect(shelf).toBeVisible();
    await expect(shelf).toHaveCSS("position", "sticky");
    const clearance = await page.evaluate<number | null>(() => {
      const save = document.querySelector('[data-testid="save-workflow"]');
      const nav = document.querySelector(".portal-sidebar");
      if (!save || !nav) return null;
      return Math.round(nav.getBoundingClientRect().top - save.getBoundingClientRect().bottom);
    });
    expect(clearance ?? -1).toBeGreaterThanOrEqual(0);
  });

  test("VAL-ADMIN-004: status filters match SQL counts exactly", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page);

    // Parallel spec files stage and delete requests while this test runs,
    // So a single page-render + SQL-read pair can legitimately disagree.
    // The assertion samples until one snapshot is INTERNALLY consistent —
    // Chip count, visible rows, and SQL agree exactly at the same instant.
    // Exactness is preserved; transient churn just retries the sample.
    for (const view of ["new", "contacted", "scheduled", "closed"] as const) {
      await expect
        .poll(
          async () => {
            await page.goto(`/admin/requests?status=${view}`);
            const chip = Number(await page.locator(`[data-filter-count="${view}"]`).textContent());
            const shown = await page.locator('[data-testid="request-row"]').count();
            const badges = await page
              .locator('[data-testid="request-row"] [data-status]')
              .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-status")));
            const sql = await sqlCount(view);

            // Rows in a view always wear that view's presentation status:
            // Durable `booked` renders as `scheduled`, never as itself.
            const badgesOk = badges.every((badge) => badge === view);
            // One page holds at most REQUEST_PAGE_SIZE (50) rows; the SQL
            // Count may exceed it, so the honest expectation is a full or
            // Partial first page matching the count at the same instant.
            const consistent = chip === sql && shown === Math.min(sql, 50) && badgesOk;
            return consistent
              ? "consistent"
              : `chip=${chip} shown=${shown} sql=${sql} badgesOk=${badgesOk}`;
          },
          { timeout: 45_000, intervals: [500, 1_000, 2_000] },
        )
        .toBe("consistent");
    }
  });

  test("search result counts stay unique across chips, range, and rows", async ({ page }) => {
    const token = `searchtruth-${runId}`;
    const nowMs = Date.now();
    const ids: string[] = [];

    const insertRequest = async ({
      closedAt,
      closureReason,
      status,
      suffix,
    }: Readonly<{
      closedAt?: string;
      closureReason?: string;
      status: "new" | "closed";
      suffix: string;
    }>) => {
      const id = randomUUID();
      ids.push(id);
      const row = {
        id,
        name: `TEST Search ${token} ${suffix}`,
        phone: "8135550199",
        email: `queue-${runId}-search-${suffix}@example.test`,
        location: "tampa",
        preferred_time: "morning",
        message: "TEST search-truth fixture — no medical details.",
        locale: "en",
        source_path: "/e2e/search-truth",
        status,
        created_at: new Date(nowMs).toISOString(),
      };
      const { error } =
        closedAt !== undefined && closureReason !== undefined
          ? await db.from("requests").insert({
              ...row,
              closed_at: closedAt,
              closure_reason: closureReason,
            })
          : await db.from("requests").insert(row);
      expect(error).toBeNull();
      return id;
    };

    const closedAt = new Date(nowMs).toISOString();
    await insertRequest({
      suffix: "decoy-a",
      status: "closed",
      closedAt,
      closureReason: "not_actionable",
    });
    await insertRequest({
      suffix: "decoy-b",
      status: "closed",
      closedAt,
      closureReason: "not_actionable",
    });
    const matchClosed = await insertRequest({
      suffix: "match",
      status: "closed",
      closedAt,
      closureReason: "not_actionable",
    });
    await insertRequest({ suffix: "open-a", status: "new" });
    await insertRequest({ suffix: "open-b", status: "new" });

    const { error: eventsError } = await db.from("request_events").insert([
      {
        request_id: matchClosed,
        type: "note",
        status: "recorded",
        meta: { text: "TEST search-truth note 1.", author_email: SEED_EMAIL.toLowerCase() },
      },
      {
        request_id: matchClosed,
        type: "note",
        status: "recorded",
        meta: { text: "TEST search-truth note 2.", author_email: SEED_EMAIL.toLowerCase() },
      },
      {
        request_id: matchClosed,
        type: "contact_attempt",
        status: "recorded",
        meta: { outcome: "reached_follow_up", author_email: SEED_EMAIL.toLowerCase() },
      },
    ]);
    expect(eventsError).toBeNull();
    const { error: auditError } = await db.from("audit_log").insert([
      {
        actor_email: SEED_EMAIL.toLowerCase(),
        action: "request.note",
        entity: "requests",
        entity_id: matchClosed,
        detail: {},
      },
      {
        actor_email: SEED_EMAIL.toLowerCase(),
        action: "request.note",
        entity: "requests",
        entity_id: matchClosed,
        detail: {},
      },
    ]);
    expect(auditError).toBeNull();

    const expectUniqueResult = async (
      rowCount: number,
      summary: string,
      announcement: string,
      chips: Readonly<Record<"all" | "new" | "contacted" | "scheduled" | "closed", number>>,
    ) => {
      await expect(page.getByTestId("request-row")).toHaveCount(rowCount);
      if (rowCount > 0) {
        await expect(page.getByTestId("request-page-summary")).toHaveText(summary);
      }
      await expect(page.getByTestId("request-search-status")).toHaveText(announcement);
      for (const [key, count] of Object.entries(chips)) {
        await expect(page.locator(`[data-filter-count="${key}"]`)).toHaveText(String(count));
      }
    };

    try {
      await signIn(page);
      await page.goto("/admin/requests");
      await page.getByLabel("Search requests").fill(`zzz-${token}-nomatch`);
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(`zzz-${token}-nomatch`)}`));
      await expect(page.getByRole("button", { name: "Search", exact: true })).toBeFocused();
      await expect(
        page.getByRole("heading", { name: "No appointment requests match that search" }),
      ).toBeVisible();
      await expect(page.getByText("Try a name, phone number, or email address.")).toBeVisible();
      await expectUniqueResult(0, "", "No appointment requests match that search.", {
        all: 0,
        new: 0,
        contacted: 0,
        scheduled: 0,
        closed: 0,
      });

      await page.getByLabel("Search requests").fill(`TEST Search ${token} match`);
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await expect(page.getByRole("button", { name: "Search", exact: true })).toBeFocused();
      await expectUniqueResult(1, "Showing 1–1 of 1", "1 matching appointment request.", {
        all: 1,
        new: 0,
        contacted: 0,
        scheduled: 0,
        closed: 1,
      });
      await expect(page.getByTestId("request-name")).toHaveText(`TEST Search ${token} match`);
      const matchQuery = new URLSearchParams({ q: `TEST Search ${token} match` }).toString();
      await expect(page.getByTestId("export-csv")).toHaveAttribute(
        "href",
        `/admin/requests/export?${matchQuery}`,
      );
      const exportCsv = page.getByTestId("export-csv");
      await expect(exportCsv).toHaveAccessibleDescription(
        "Exports all 1 result in the current search and All view.",
      );
      const search = `TEST Search ${token} match`;
      let matchingExportDownloads = 0;
      page.on("download", (download) => {
        const url = new URL(download.url());
        if (url.pathname === "/admin/requests/export" && url.searchParams.get("q") === search) {
          matchingExportDownloads += 1;
        }
      });
      const downloadPromise = page.waitForEvent("download");
      await exportCsv.focus();
      await exportCsv.evaluate((element) => {
        if (!(element instanceof HTMLAnchorElement)) throw new Error("expected export link");
        element.click();
        element.click();
      });
      const downloadedCsv = await downloadPromise;
      await expect(page.getByTestId("requests-output-feedback")).toHaveText(
        "CSV download started for 1 current result.",
      );
      await expect(exportCsv).toBeFocused();
      await expect(exportCsv).toHaveAttribute("aria-disabled", "true");
      await expect.poll(() => matchingExportDownloads).toBe(1);
      await expect(exportCsv).not.toHaveAttribute("aria-disabled", "true", { timeout: 3_000 });
      await downloadedCsv.delete();

      await page.goto(`/admin/requests?${matchQuery}&page=9`);
      await expect
        .poll(() => {
          const url = new URL(page.url());
          return `${url.searchParams.get("q")}|${url.searchParams.get("page") ?? ""}`;
        })
        .toBe(`TEST Search ${token} match|`);
      await expectUniqueResult(1, "Showing 1–1 of 1", "1 matching appointment request.", {
        all: 1,
        new: 0,
        contacted: 0,
        scheduled: 0,
        closed: 1,
      });

      await page.locator('[data-filter="new"]').click();
      await expect(page).toHaveURL(/status=new/);
      await expect(page.getByLabel("Search requests")).toHaveValue(`TEST Search ${token} match`);
      await expect(
        page.getByRole("heading", { name: "No appointment requests match that search" }),
      ).toBeVisible();
      await expectUniqueResult(0, "", "No appointment requests match that search.", {
        all: 1,
        new: 0,
        contacted: 0,
        scheduled: 0,
        closed: 1,
      });
      await expect(exportCsv).toHaveAccessibleDescription(
        "Exports all 0 results in the current search and New filter.",
      );

      await page.locator('[data-filter="all"]').click();
      await expect(page.getByLabel("Search requests")).toHaveValue(`TEST Search ${token} match`);
      await expectUniqueResult(1, "Showing 1–1 of 1", "1 matching appointment request.", {
        all: 1,
        new: 0,
        contacted: 0,
        scheduled: 0,
        closed: 1,
      });

      await page.getByLabel("Search requests").fill(`TEST Search ${token} open`);
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await expectUniqueResult(2, "Showing 1–2 of 2", "2 matching appointment requests.", {
        all: 2,
        new: 2,
        contacted: 0,
        scheduled: 0,
        closed: 0,
      });

      await page.getByTestId("request-search-clear").click();
      await expect(page).toHaveURL(/\/admin\/requests\/?$/);
      await expect(page.getByLabel("Search requests")).toBeFocused();
      await expect(page.getByLabel("Search requests")).toHaveValue("");
      const restored = Number(await page.locator('[data-filter-count="all"]').textContent());
      await expect(page.getByTestId("request-search-status")).toHaveText(
        restored === 1 ? "1 appointment request." : `${restored} appointment requests.`,
      );
      expect(restored).toBeGreaterThanOrEqual(5);
    } finally {
      if (ids.length > 0) {
        await db.from("requests").delete().in("id", ids);
        await db.from("audit_log").delete().eq("entity_id", matchClosed);
      }
    }
  });

  test("VAL-ADMIN-017: the default queue leads with attention and details chain prev/next", async ({
    page,
  }) => {
    const token = `p2queue-${runId}`;
    const nowMs = Date.now();
    const dayMs = 86_400_000;
    // Staged rows satisfy the workflow-shape constraint: booked rows carry
    // Their handoff time, classified closed rows carry closed_at + reason.
    const stagedRows = [
      {
        suffix: "closed",
        status: "closed",
        created_at: new Date(nowMs - 5 * dayMs).toISOString(),
        closed_at: new Date(nowMs - 4 * dayMs).toISOString(),
        closure_reason: "not_actionable",
      },
      {
        suffix: "scheduled",
        status: "booked",
        created_at: new Date(nowMs - 2 * dayMs).toISOString(),
        record_handoff_at: new Date(nowMs - dayMs).toISOString(),
      },
      {
        suffix: "stale",
        status: "contacted",
        created_at: new Date(nowMs - 4 * dayMs).toISOString(),
      },
      {
        suffix: "due",
        status: "contacted",
        created_at: new Date(nowMs - dayMs).toISOString(),
        follow_up_at: new Date(nowMs).toISOString(),
      },
      {
        suffix: "newer",
        status: "new",
        created_at: new Date(nowMs - dayMs).toISOString(),
      },
      {
        suffix: "older",
        status: "new",
        created_at: new Date(nowMs - 3 * dayMs).toISOString(),
      },
    ];
    const idsByKey = new Map<string, string>();
    for (const row of stagedRows) {
      const id = randomUUID();
      idsByKey.set(row.suffix, id);
      const { suffix, ...columns } = row;
      const { error } = await db.from("requests").insert({
        id,
        name: `TEST Queue ${runId} ${suffix}`,
        phone: "8135550166",
        email: `${token}-${suffix}@example.test`,
        location: "tampa",
        preferred_time: "morning",
        message: "TEST attention-order fixture.",
        locale: "en",
        source_path: "/e2e/p2queue",
        ...columns,
      });
      expect(error).toBeNull();
    }
    const { error: legacyAttemptError } = await db.from("request_events").insert({
      request_id: idsByKey.get("stale")!,
      type: "contact_attempt",
      status: "recorded",
      created_at: new Date(nowMs - 3 * dayMs).toISOString(),
      meta: {
        outcome: "reached_follow_up",
        author_email: SEED_EMAIL.toLowerCase(),
      },
    });
    expect(legacyAttemptError).toBeNull();

    try {
      await signIn(page);
      await page.goto(`/admin/requests?q=${token}`);

      const names = await page.getByTestId("request-name").allTextContents();
      const orderOf = (suffix: string) => names.findIndex((name) => name.includes(` ${suffix}`));
      const positions = ["older", "newer", "due", "stale", "scheduled", "closed"].map(orderOf);
      expect(positions.every((position) => position >= 0)).toBe(true);
      expect([...positions].sort((a, b) => a - b)).toEqual(positions);

      await expect(page.getByTestId("request-next-action").first()).toBeVisible();
      const hints = await page.getByTestId("request-next-action").allTextContents();
      expect(hints.some((hint) => hint.startsWith("Call again — due"))).toBe(true);
      expect(hints.some((hint) => hint.startsWith("Set a call-again day"))).toBe(true);
      expect(hints.some((hint) => hint === "On the schedule")).toBe(true);

      // The waiting age and the location must read as one phrase in rendered
      // DOM text: the separator is real text, never a CSS-only ::before glyph.
      const waitingRow = page
        .getByTestId("request-row")
        .filter({ hasText: `TEST Queue ${runId} older` });
      await expect(waitingRow).toContainText(
        /Waiting since .+ · (?:Tampa|Lutz|Either office) · (?:Morning|Afternoon|Any time)/,
        { useInnerText: true },
      );

      // A legacy Contacted/null row never has a blank Next step. Its queue
      // Action targets the dedicated correction control, where no date is
      // Guessed and Save stays unavailable until staff choose one.
      const staleRow = page
        .getByTestId("request-row")
        .filter({ hasText: `TEST Queue ${runId} stale` });
      await expect(staleRow.getByTestId("request-next-action")).toContainText(
        "Set a call-again day",
      );
      await expect(staleRow).toHaveAttribute("href", /#set-call-again$/);
      await staleRow.click();
      await expect(page).toHaveURL(/#set-call-again$/);
      const correction = page.getByTestId("set-call-again-controls");
      await expect(correction).toBeFocused();
      await expect(page.getByTestId("workflow-current-state")).toContainText(
        "call-again day missing",
      );
      await expect(page.getByTestId("set-call-again-submit")).toBeDisabled();
      await expect(page.getByTestId("request-history")).toContainText(
        "Reached the patient — follow-up needed — no call-again day was set",
      );
      await correction.getByText("Tomorrow morning", { exact: true }).click();
      await page.getByTestId("set-call-again-submit").click();
      await expect(page.getByTestId("workflow-feedback")).toContainText("Saved — call again");
      const corrected = await db
        .from("requests")
        .select("status, follow_up_at")
        .eq("id", idsByKey.get("stale")!)
        .single();
      expect(corrected.error).toBeNull();
      expect(corrected.data?.status).toBe("contacted");
      expect(corrected.data?.follow_up_at).toBeTruthy();
      await expect(page.getByTestId("request-history")).toContainText("Call-again day set");

      // The correction is reversible to the exact legacy null snapshot;
      // Both the original missing evidence and its correction stay in history.
      await page.getByTestId("undo-latest").click();
      await expect(page.getByTestId("workflow-feedback")).toContainText(
        "Undone — this request is Contacted again.",
      );
      const restoredLegacy = await db
        .from("requests")
        .select("status, follow_up_at")
        .eq("id", idsByKey.get("stale")!)
        .single();
      expect(restoredLegacy.error).toBeNull();
      expect(restoredLegacy.data).toEqual({ status: "contacted", follow_up_at: null });
      await expect(page.getByTestId("request-history")).toContainText("Call-again day set");
      await expect(page.getByTestId("request-history")).toContainText(
        "Undo — restored to Contacted",
      );

      // Continuity: the due row chains to its attention-order neighbors.
      await page.goto(`/admin/requests/${idsByKey.get("due")}?q=${token}`);
      const prevLink = page.getByTestId("prev-request");
      const nextLink = page.getByTestId("next-request");
      await expect(prevLink).toHaveAttribute("href", new RegExp(idsByKey.get("newer")!));
      await expect(nextLink).toHaveAttribute("href", new RegExp(idsByKey.get("stale")!));

      // The panel only offers legal commands — never the request's own
      // Current state. One save books it; continuation appears only after
      // A confirmed success.
      const panel = page.getByTestId("workflow-panel");
      const feedback = page.getByTestId("workflow-feedback");
      await expect(page.getByTestId("save-workflow")).toHaveText("Save");
      await expect(page.getByTestId("save-workflow")).toBeDisabled();
      await expect(page.getByTestId("open-next-request")).toHaveCount(0);
      await panel.getByText("Appointment booked", { exact: true }).click();
      await nameTheAppointment(page, 9);
      await page.getByTestId("save-workflow").click();
      await expect(feedback).toContainText("marked Scheduled");
      await expect(page.getByTestId("undo-latest")).toHaveText("Undo");

      // Undo is a real atomic reversal — a compensating transition that
      // Restores the prior snapshot — not a local form reset.
      await page.getByTestId("undo-latest").click();
      await expect(feedback).toContainText("Undone — this request is Contacted again.");
      const { data: undoneRow, error: undoneRowError } = await db
        .from("requests")
        .select("status, follow_up_at")
        .eq("id", idsByKey.get("due")!)
        .single();
      expect(undoneRowError).toBeNull();
      expect(undoneRow?.status).toBe("contacted");
      // The snapshot restore brings back the call-again time, not just the state.
      expect(undoneRow?.follow_up_at).toBeTruthy();
      const history = page.getByTestId("request-history");
      await expect(
        history.getByText("Marked Scheduled — appointment booked").first(),
      ).toBeVisible();
      await expect(history).toContainText("Undo — restored to Contacted");

      // A new save creates the next undo point and offers queue continuation.
      await panel.getByText("Appointment booked", { exact: true }).click();
      await nameTheAppointment(page, 9);
      await page.getByTestId("save-workflow").click();
      await expect(feedback).toContainText("marked Scheduled");
      await page.getByTestId("open-next-request").click();
      await expect(page).toHaveURL(new RegExp(`/admin/requests/${idsByKey.get("stale")}`));

      const { data: savedRow, error: savedRowError } = await db
        .from("requests")
        .select("status")
        .eq("id", idsByKey.get("due")!)
        .single();
      expect(savedRowError).toBeNull();
      expect(savedRow?.status).toBe("booked");

      // The evidence chain: booked, compensating undo, booked again.
      const { data: transitions, error: transitionsError } = await db
        .from("request_transitions")
        .select("command, from_state, to_state, compensates_transition_id")
        .eq("request_id", idsByKey.get("due")!)
        .order("occurred_at");
      expect(transitionsError).toBeNull();
      expect(
        z
          .array(undoTransitionRowSchema)
          .parse(transitions ?? [])
          .map((row) => [row.command, row.from_state, row.to_state]),
      ).toEqual([
        ["confirm_booking_handoff", "contacted", "booked"],
        ["undo_latest_transition", "booked", "contacted"],
        ["confirm_booking_handoff", "contacted", "booked"],
      ]);
      expect(transitions?.[1]?.compensates_transition_id).toBeTruthy();
    } finally {
      const ids = [...idsByKey.values()];
      await db.from("requests").delete().in("id", ids);
      await db.from("audit_log").delete().in("entity_id", ids);
    }
  });

  test("VAL-ADMIN-006: notes persist with attribution and survive reload", async ({
    page,
    request,
  }) => {
    const id = await stageRequest(request, "notes");
    const staged = payload("notes");
    const noteText = `TEST note ${runId} — left a voicemail, call back tomorrow.`;
    const handoffText = `TEST handoff ${runId} — patient asked for a later callback.`;

    await signIn(page);
    await page.goto(`/admin/requests/${id}`);

    const notesSection = page.getByTestId("request-notes");
    await expect(
      notesSection.getByRole("heading", {
        name: "Appointment request notes",
        exact: true,
      }),
    ).toBeVisible();
    await expect(notesSection.getByLabel("Note", { exact: true })).toBeHidden();
    await notesSection.getByRole("button", { name: "Add note", exact: true }).click();
    const noteField = notesSection.getByLabel("Note", { exact: true });
    await expect(noteField).toBeFocused();
    await expect(notesSection.getByRole("button", { name: "Save note" })).toBeDisabled();
    await noteField.fill(noteText);
    await notesSection.getByRole("button", { name: "Save note" }).click();
    await expect(notesSection.getByTestId("request-note-feedback")).toContainText("Note added.");

    const notes = page.getByTestId("note-list");
    await expect(notes).toContainText(noteText);
    const { data: unchangedNewStatus, error: initialStatusError } = await db
      .from("requests")
      .select("status")
      .eq("id", id)
      .single();
    expect(initialStatusError).toBeNull();
    expect(unchangedNewStatus?.status).toBe("new");

    // The workflow panel records outcomes; notes have their own surface.
    const panel = page.getByTestId("workflow-panel");
    await expect(panel.getByLabel("Note", { exact: true })).toHaveCount(0);
    await panel.getByText("Left a voicemail — call again", { exact: true }).click();
    await panel.getByText("Tomorrow morning", { exact: true }).click();
    await page.getByTestId("save-workflow").click();
    await expect(page.getByTestId("workflow-feedback")).toContainText("Saved");

    const { data: authorProfile } = await db
      .from("staff_profiles")
      .select("display_name")
      .eq("email", SEED_EMAIL.toLowerCase())
      .single();
    await expect(notes).toContainText(String(authorProfile?.display_name ?? ""));
    await expect(page.getByTestId("request-history")).toContainText("Left a voicemail");

    await page.reload();
    await expect(page.getByTestId("note-list")).toContainText(noteText);

    // Appointment request notes have one consistent entry point, independent
    // From the status workflow.
    await notesSection.getByRole("button", { name: "Add note", exact: true }).click();
    await notesSection.getByLabel("Note", { exact: true }).fill(handoffText);
    await notesSection.getByRole("button", { name: "Save note" }).click();
    await expect(page.getByTestId("note-list")).toContainText(handoffText);

    const { data: unchangedStatus, error: statusError } = await db
      .from("requests")
      .select("status")
      .eq("id", id)
      .single();
    expect(statusError).toBeNull();
    expect(unchangedStatus?.status).toBe("contacted");

    // Re-enter through the staff's Contacted queue, not a direct test URL:
    // The note must still be the obvious patient handoff when the row opens.
    await page.goto(
      `/admin/requests?status=contacted&q=${encodeURIComponent(payload("notes").name)}`,
    );
    await page.getByTestId("request-row").click();
    await expect(
      page.getByRole("heading", {
        name: "Appointment request notes",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByTestId("note-list")).toContainText(noteText);
    await expect(page.getByTestId("note-list")).toContainText(handoffText);

    // The explicit print action invokes the browser print surface.
    await page.evaluate(() => {
      window.print = () => {
        const root = document.documentElement;
        root.dataset.testRequestPrintCalls = String(
          Number(root.dataset.testRequestPrintCalls ?? "0") + 1,
        );
      };
    });
    const { data: beforePrint, error: beforePrintError } = await db
      .from("requests")
      .select("status, version, follow_up_at, closure_reason, closed_at, record_handoff_at")
      .eq("id", id)
      .single();
    expect(beforePrintError).toBeNull();
    const printRequest = page.getByTestId("print-request");
    await printRequest.focus();
    await printRequest.evaluate((button) => {
      if (!(button instanceof HTMLButtonElement)) throw new Error("expected print button");
      button.click();
      button.click();
    });
    await expect(page.locator("html")).toHaveAttribute("data-test-request-print-calls", "1");
    await expect(page.getByTestId("request-print-feedback")).toHaveText(
      "Print dialog is opening for this request.",
    );
    await expect(printRequest).toBeFocused();
    await expect(printRequest).toHaveAttribute("aria-disabled", "true");
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    await expect(printRequest).not.toHaveAttribute("aria-disabled", "true");
    const { data: afterPrint, error: afterPrintError } = await db
      .from("requests")
      .select("status, version, follow_up_at, closure_reason, closed_at, record_handoff_at")
      .eq("id", id)
      .single();
    expect(afterPrintError).toBeNull();
    expect(afterPrint).toEqual(beforePrint);

    // Print keeps the complete patient handoff and removes portal controls
    // And delivery diagnostics. The request root must be allowed to paginate.
    await page.emulateMedia({ media: "print" });
    await expect(page.getByTestId("request-detail-name")).toBeVisible();
    await expect(page.getByText(staged.message)).toBeVisible();
    await expect(page.getByTestId("note-list")).toContainText(handoffText);
    await expect(page.getByTestId("request-history")).toContainText("Left a voicemail");
    await expect(page.getByTestId("workflow-panel")).toBeHidden();
    await expect(page.getByRole("link", { name: "Back to Appointments" })).toBeHidden();
    expect(
      await page
        .locator(".request-detail-print")
        .evaluate((element) => getComputedStyle(element).breakInside),
    ).toBe("auto");
    await page.emulateMedia({ media: "screen" });

    const { data: events, error } = await db
      .from("request_events")
      .select("type, meta")
      .eq("request_id", id)
      .eq("type", "note");
    expect(error).toBeNull();
    expect(events).toHaveLength(2);
    for (const expectedText of [noteText, handoffText]) {
      const event = events?.find((candidate) => {
        const meta = noteMetaSchema.safeParse(candidate.meta);
        return meta.success && meta.data.text === expectedText;
      });
      expect(event).toBeTruthy();
      const meta = noteMetaSchema.parse(event?.meta ?? {});
      expect(meta.author_email?.toLowerCase()).toBe(SEED_EMAIL.toLowerCase());
    }

    // The workflow audit records the command shape only — never note text.
    const { data: workflowAudits, error: workflowAuditError } = await db
      .from("audit_log")
      .select("detail")
      .eq("entity_id", id)
      .eq("action", "request.workflow_command");
    expect(workflowAuditError).toBeNull();
    expect(workflowAudits).toHaveLength(1);
    const detail = asJsonObject(jsonSchema.parse(workflowAudits![0].detail ?? null));
    expect(asJsonString(detail?.command)).toBe("record_contact_attempt");
    expect(JSON.stringify(detail)).not.toContain(noteText);
    expect(JSON.stringify(detail)).not.toContain(handoffText);
  });
});
