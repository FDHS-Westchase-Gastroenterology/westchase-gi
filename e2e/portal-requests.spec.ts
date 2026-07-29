import { createHash, randomUUID } from "node:crypto";
import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { loadLocalEnv, requiredEnv, serviceDb } from "./support";

// VAL-ADMIN-003: queue lists real submissions newest-first with badges.
// VAL-ADMIN-004: status filtering matches SQL counts exactly.
// VAL-ADMIN-005: detail shows all fields; the full lifecycle persists.
// VAL-ADMIN-006: staff notes persist with attribution and re-render.

loadLocalEnv();

const SEED_EMAIL = requiredEnv("PORTAL_SEED_ADMIN_EMAIL");
const SEED_PASSWORD = requiredEnv("PORTAL_SEED_ADMIN_PASSWORD");

const db = serviceDb();
const runId = randomUUID().slice(0, 8);

function testIp(label: string): string {
  const hex = createHash("sha256").update(`${runId}:${label}`).digest("hex");
  return `2001:db8:${hex.slice(0, 4)}:${hex.slice(4, 8)}::3`;
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

async function stageRequest(
  request: APIRequestContext,
  label: string,
): Promise<string> {
  const response = await request.post("/api/requests", {
    data: payload(label),
    headers: { "X-Forwarded-For": testIp(label) },
  });
  expect(response.status()).toBe(201);
  const body = (await response.json()) as { ok: boolean; id: string };
  expect(body.ok).toBe(true);
  return body.id;
}

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(SEED_EMAIL);
  await page.getByLabel("Password").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
}

async function sqlCount(status: string): Promise<number> {
  const { count, error } = await db
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("status", status);
  expect(error).toBeNull();
  return count ?? 0;
}

test.describe("portal requests operation", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "JS portal UI");
  });

  test.afterAll(async () => {
    await db.from("requests").delete().like("email", `queue-${runId}-%`);
  });

  test("VAL-ADMIN-003: fresh submissions appear in the queue newest-first", async ({
    page,
    request,
  }) => {
    const firstId = await stageRequest(request, "older");
    const secondId = await stageRequest(request, "newer");

    await signIn(page);
    await page.goto("/admin/requests");

    const names = await page.getByTestId("request-name").allTextContents();
    const newerIndex = names.findIndex((name) => name.includes("newer"));
    const olderIndex = names.findIndex((name) => name.includes("older"));
    expect(newerIndex).toBeGreaterThanOrEqual(0);
    expect(olderIndex).toBeGreaterThanOrEqual(0);
    expect(newerIndex).toBeLessThan(olderIndex);

    // Both staged rows carry the New badge in the queue.
    const newerRow = page
      .locator('[data-testid="request-row"]', {
        hasText: `TEST Queue ${runId} newer`,
      })
      .first();
    await expect(newerRow.locator('[data-status="new"]')).toBeVisible();

    // A fresh submission appears after refresh with status new.
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

  test("VAL-ADMIN-005: detail shows every field and the composer drives the lifecycle", async ({
    page,
    request,
  }) => {
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

    await expect(page.getByTestId("request-detail-name")).toHaveText(
      staged.name,
    );
    await expect(page.getByText(staged.phone).first()).toBeVisible();
    await expect(page.getByRole("link", { name: staged.email })).toHaveAttribute(
      "href",
      `mailto:${staged.email}`,
    );
    await expect(page.getByText("Tampa", { exact: true })).toBeVisible();
    await expect(page.getByText("Morning", { exact: true })).toBeVisible();
    await expect(page.getByTestId("request-message")).toContainText(
      staged.message,
    );
    await expect(page.getByText("/en/appointment").first()).toBeVisible();
    const notifications = page
      .getByRole("heading", { name: "Notifications" })
      .locator("..");
    await expect(notifications).toContainText(visibleRecipient);
    await expect(notifications).not.toContainText("jason.gitdev@gmail.com");

    const composer = page.getByTestId("call-outcome-composer");
    // The radios are sr-only inside visible labels — click the label text
    // the way a staff member does.
    async function saveOutcome(label: string) {
      await composer.getByText(label, { exact: true }).click();
      await page.getByTestId("save-outcome").click();
      await expect(page.getByTestId("composer-feedback")).toBeVisible();
    }
    async function statusOf() {
      const { data, error } = await db
        .from("requests")
        .select("status, closure_disposition, follow_up_at")
        .eq("id", id)
        .single();
      expect(error).toBeNull();
      return data;
    }

    // The daily success path: booked lands on Scheduled and stays open.
    await saveOutcome("Appointment is booked");
    expect((await statusOf())?.status).toBe("scheduled");

    // A call-again outcome requires the follow-up choice before saving.
    await composer.getByText("No answer — call again", { exact: true }).click();
    await expect(page.getByTestId("save-outcome")).toBeDisabled();
    await composer.getByText("Tomorrow morning", { exact: true }).click();
    await page.getByTestId("save-outcome").click();
    await expect(page.getByTestId("composer-feedback")).toContainText(
      "resurface",
    );
    const afterNoAnswer = await statusOf();
    expect(afterNoAnswer?.status).toBe("contacted");
    expect(afterNoAnswer?.follow_up_at).toBeTruthy();

    // A closing outcome leaves the active queue with a classification.
    await saveOutcome("Patient won't schedule");
    const closed = await statusOf();
    expect(closed?.status).toBe("closed");
    expect(closed?.closure_disposition).toBe("unconverted");
    expect(closed?.follow_up_at).toBeNull();

    // Recording another call outcome reopens the closed request and clears
    // the classification.
    await composer
      .getByText("Reached the patient — follow-up needed", { exact: true })
      .click();
    await page.getByTestId("save-outcome").click();
    await expect(page.getByTestId("composer-feedback")).toBeVisible();
    const reopened = await statusOf();
    expect(reopened?.status).toBe("contacted");
    expect(reopened?.closure_disposition).toBeNull();

    const { data: outcomeAudits, error: outcomeAuditError } = await db
      .from("audit_log")
      .select("detail")
      .eq("entity_id", id)
      .eq("action", "request.call_outcome");
    expect(outcomeAuditError).toBeNull();
    const outcomes = (outcomeAudits ?? []).map(
      (row) => (row.detail as { outcome?: string }).outcome,
    );
    expect(outcomes.sort()).toEqual(
      ["no_answer", "reached_follow_up", "wont_schedule"].sort(),
    );

    const { data: statusAudits, error: statusAuditError } = await db
      .from("audit_log")
      .select("detail")
      .eq("entity_id", id)
      .eq("action", "request.status_change");
    expect(statusAuditError).toBeNull();
    expect(statusAudits).toHaveLength(1);
    expect((statusAudits![0].detail as { to?: string }).to).toBe("scheduled");
  });

  test("VAL-ADMIN-005b: unsafe legacy email uses the phone fallback", async ({
    page,
  }) => {
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

    const fallback = page.getByText(
      "Not provided — call the phone number above",
    );
    await expect(fallback).toBeVisible();
    await expect(
      fallback.locator("..").locator('a[href^="mailto:"]'),
    ).toHaveCount(0);
  });

  test("VAL-ADMIN-004: status filters match SQL counts exactly", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signIn(page);

    // Parallel spec files stage and delete requests while this test runs,
    // so a single page-render + SQL-read pair can legitimately disagree.
    // The assertion samples until one snapshot is INTERNALLY consistent —
    // chip count, visible rows, and SQL agree exactly at the same instant.
    // Exactness is preserved; transient churn just retries the sample.
    for (const status of ["new", "contacted", "scheduled", "closed"]) {
      await expect
        .poll(
          async () => {
            await page.goto(`/admin/requests?status=${status}`);
            const chip = Number(
              await page
                .locator(`[data-filter-count="${status}"]`)
                .textContent(),
            );
            const shown = await page
              .locator('[data-testid="request-row"]')
              .count();
            const badges = await page
              .locator('[data-testid="request-row"] [data-status]')
              .evaluateAll((nodes) =>
                nodes.map((node) => node.getAttribute("data-status")),
              );
            const sql = await sqlCount(status);

            const badgesOk = badges.every((badge) => badge === status);
            const consistent =
              chip === sql && shown === Math.min(sql, 200) && badgesOk;
            return consistent
              ? "consistent"
              : `chip=${chip} shown=${shown} sql=${sql} badgesOk=${badgesOk}`;
          },
          { timeout: 45_000, intervals: [500, 1_000, 2_000] },
        )
        .toBe("consistent");
    }
  });

  test("VAL-ADMIN-006: notes persist with attribution and survive reload", async ({
    page,
    request,
  }) => {
    const id = await stageRequest(request, "notes");
    const noteText = `TEST note ${runId} — left a voicemail, call back tomorrow.`;

    await signIn(page);
    await page.goto(`/admin/requests/${id}`);

    const composer = page.getByTestId("call-outcome-composer");
    await composer
      .getByText("Left a voicemail — call again", { exact: true })
      .click();
    await composer.getByText("Tomorrow morning", { exact: true }).click();
    await page.getByLabel(/Add a note/).fill(noteText);
    await page.getByTestId("save-outcome").click();
    await expect(page.getByTestId("composer-feedback")).toBeVisible();

    const history = page.getByTestId("work-history");
    await expect(history).toContainText(noteText);
    await expect(history).toContainText("Left a voicemail");
    await expect(history).toContainText(SEED_EMAIL.toLowerCase());

    await page.reload();
    await expect(page.getByTestId("work-history")).toContainText(noteText);

    const { data: events, error } = await db
      .from("request_events")
      .select("type, meta")
      .eq("request_id", id)
      .eq("type", "note");
    expect(error).toBeNull();
    expect(events).toHaveLength(1);
    const meta = (events![0].meta ?? {}) as Record<string, unknown>;
    expect(meta.text).toBe(noteText);
    expect(String(meta.author_email).toLowerCase()).toBe(
      SEED_EMAIL.toLowerCase(),
    );

    const { data: outcomeAudits, error: outcomeAuditError } = await db
      .from("audit_log")
      .select("detail")
      .eq("entity_id", id)
      .eq("action", "request.call_outcome");
    expect(outcomeAuditError).toBeNull();
    expect(outcomeAudits).toHaveLength(1);
    const detail = outcomeAudits![0].detail as Record<string, unknown>;
    expect(detail.outcome).toBe("voicemail");
    expect(detail.note_attached).toBe(true);
    expect(detail.note_length).toBe(noteText.length);
    expect(JSON.stringify(detail)).not.toContain(noteText);
  });
});
