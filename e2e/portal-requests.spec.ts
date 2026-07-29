import { createHash, randomUUID } from "node:crypto";
import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { loadLocalEnv, requiredEnv, serviceDb } from "./support";

// VAL-ADMIN-003: the queue leads with the oldest unworked requests first.
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

  test("VAL-ADMIN-003: the queue leads with the oldest unworked requests first", async ({
    page,
    request,
  }) => {
    const firstId = await stageRequest(request, "older");
    const secondId = await stageRequest(request, "newer");

    await signIn(page);
    await page.goto("/admin/requests");

    // Attention-first: between two unworked New requests, the older one —
    // the one that has waited longer — comes before the newer one.
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
    const { error: notificationError } = await db
      .from("request_events")
      .insert([
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
    // The breadcrumb's current page is the request's name, not "Detail".
    await expect(
      page.getByRole("navigation", { name: "Breadcrumb" }),
    ).toContainText(staged.name);
    await expect(page.getByText(staged.phone).first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: staged.email }),
    ).toHaveAttribute("href", `mailto:${staged.email}`);
    await expect(page.getByText("Tampa", { exact: true })).toBeVisible();
    await expect(page.getByText("Morning", { exact: true })).toBeVisible();
    await expect(page.getByTestId("request-message")).toContainText(
      staged.message,
    );
    await expect(page.getByText("/en/appointment").first()).toBeVisible();
    const notifications = page
      .getByRole("heading", { name: "Notifications" })
      .locator("..");
    // Every recorded delivery attempt renders — no address is hidden.
    await expect(notifications).toContainText(visibleRecipient);
    await expect(notifications).toContainText("jason.gitdev@gmail.com");

    const composer = page.getByTestId("call-outcome-composer");
    async function saveLifecycle(
      destination: "Contacted" | "Scheduled" | "Closed",
      detail?: string,
    ) {
      await composer.getByText(destination, { exact: true }).click();
      if (detail) {
        await composer.getByText(detail, { exact: true }).click();
      }
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

    // A call-again outcome requires the follow-up choice before saving.
    await composer.getByText("Contacted", { exact: true }).click();
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
    await expect(
      page
        .getByTestId("lifecycle-destinations")
        .getByText("Contacted", { exact: true }),
    ).toHaveCount(0);

    // The daily success path: Scheduled means booked and stays open.
    await saveLifecycle("Scheduled");
    expect((await statusOf())?.status).toBe("scheduled");
    await expect(
      page
        .getByTestId("lifecycle-destinations")
        .getByText("Scheduled", { exact: true }),
    ).toHaveCount(0);

    // Closed then asks for the classification the database needs.
    await saveLifecycle("Closed", "Patient won't schedule");
    const closed = await statusOf();
    expect(closed?.status).toBe("closed");
    expect(closed?.closure_disposition).toBe("unconverted");
    expect(closed?.follow_up_at).toBeNull();

    // A closed request can be deliberately reopened into a non-current status.
    await saveLifecycle("Contacted", "Reached the patient — follow-up needed");
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
            // One page holds at most REQUEST_PAGE_SIZE (50) rows; the SQL
            // count may exceed it, so the honest expectation is a full or
            // partial first page matching the count at the same instant.
            const consistent =
              chip === sql && shown === Math.min(sql, 50) && badgesOk;
            return consistent
              ? "consistent"
              : `chip=${chip} shown=${shown} sql=${sql} badgesOk=${badgesOk}`;
          },
          { timeout: 45_000, intervals: [500, 1_000, 2_000] },
        )
        .toBe("consistent");
    }
  });

  test("VAL-ADMIN-017: the default queue leads with attention and details chain prev/next", async ({
    page,
  }) => {
    const token = `p2queue-${runId}`;
    const nowMs = Date.now();
    const dayMs = 86_400_000;
    const stagedRows = [
      {
        suffix: "closed",
        status: "closed",
        created_at: new Date(nowMs - 5 * dayMs).toISOString(),
      },
      {
        suffix: "scheduled",
        status: "scheduled",
        created_at: new Date(nowMs - 2 * dayMs).toISOString(),
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
      const { error } = await db.from("requests").insert({
        id,
        name: `TEST Queue ${runId} ${row.suffix}`,
        phone: "8135550166",
        email: `${token}-${row.suffix}@example.test`,
        location: "tampa",
        preferred_time: "morning",
        message: "TEST attention-order fixture.",
        locale: "en",
        source_path: "/e2e/p2queue",
        status: row.status,
        created_at: row.created_at,
        ...(row.follow_up_at ? { follow_up_at: row.follow_up_at } : {}),
      });
      expect(error).toBeNull();
    }

    try {
      await signIn(page);
      await page.goto(`/admin/requests?q=${token}`);

      const names = await page.getByTestId("request-name").allTextContents();
      const orderOf = (suffix: string) =>
        names.findIndex((name) => name.includes(` ${suffix}`));
      const positions = [
        "older",
        "newer",
        "due",
        "stale",
        "scheduled",
        "closed",
      ].map(orderOf);
      expect(positions.every((position) => position >= 0)).toBe(true);
      expect([...positions].sort((a, b) => a - b)).toEqual(positions);

      await expect(
        page.getByTestId("request-next-action").first(),
      ).toBeVisible();
      const hints = await page
        .getByTestId("request-next-action")
        .allTextContents();
      expect(hints.some((hint) => hint.startsWith("Call again — due"))).toBe(
        true,
      );
      expect(hints.some((hint) => hint.startsWith("Silent"))).toBe(true);
      expect(hints.some((hint) => hint === "On the schedule")).toBe(true);

      // Continuity: the due row chains to its attention-order neighbors.
      await page.goto(`/admin/requests/${idsByKey.get("due")}?q=${token}`);
      const prevLink = page.getByTestId("prev-request");
      const nextLink = page.getByTestId("next-request");
      await expect(prevLink).toHaveAttribute(
        "href",
        new RegExp(idsByKey.get("newer")!),
      );
      await expect(nextLink).toHaveAttribute(
        "href",
        new RegExp(idsByKey.get("stale")!),
      );

      // The due row is already Contacted, so that current state is not offered.
      // One save moves it to Scheduled; continuation appears only after success.
      const composer = page.getByTestId("call-outcome-composer");
      await expect(
        composer
          .getByTestId("lifecycle-destinations")
          .getByText("Contacted", { exact: true }),
      ).toHaveCount(0);
      await expect(page.getByTestId("save-outcome")).toHaveText(
        "Save appointment request status",
      );
      await expect(page.getByTestId("save-outcome")).toBeDisabled();
      await expect(page.getByTestId("save-outcome-next")).toHaveCount(0);
      await composer.getByText("Scheduled", { exact: true }).click();
      await expect(page.getByTestId("save-outcome")).toHaveText(
        "Save as Scheduled",
      );
      await page.getByTestId("save-outcome").click();
      await expect(page.getByTestId("composer-feedback")).toBeVisible();
      await page.getByTestId("open-next-request").click();
      await expect(page).toHaveURL(
        new RegExp(`/admin/requests/${idsByKey.get("stale")}`),
      );

      const { data: savedRow, error: savedRowError } = await db
        .from("requests")
        .select("status")
        .eq("id", idsByKey.get("due")!)
        .single();
      expect(savedRowError).toBeNull();
      expect(savedRow?.status).toBe("scheduled");

      const { data: statusAudits, error: statusAuditError } = await db
        .from("audit_log")
        .select("detail")
        .eq("entity_id", idsByKey.get("due")!)
        .eq("action", "request.status_change");
      expect(statusAuditError).toBeNull();
      expect(statusAudits).toHaveLength(1);
      expect((statusAudits![0].detail as { to?: string }).to).toBe("scheduled");
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
    await notesSection
      .getByRole("button", { name: "Add note", exact: true })
      .click();
    const noteField = notesSection.getByLabel("Note", { exact: true });
    await expect(noteField).toBeFocused();
    await expect(
      notesSection.getByRole("button", { name: "Save note" }),
    ).toBeDisabled();
    await noteField.fill(noteText);
    await notesSection.getByRole("button", { name: "Save note" }).click();
    await expect(
      notesSection.getByTestId("request-note-feedback"),
    ).toContainText("Note added.");

    const notes = page.getByTestId("note-list");
    await expect(notes).toContainText(noteText);
    const { data: unchangedNewStatus, error: initialStatusError } = await db
      .from("requests")
      .select("status")
      .eq("id", id)
      .single();
    expect(initialStatusError).toBeNull();
    expect(unchangedNewStatus?.status).toBe("new");

    const composer = page.getByTestId("call-outcome-composer");
    await expect(composer.getByLabel("Note", { exact: true })).toHaveCount(0);
    await composer.getByText("Contacted", { exact: true }).click();
    await composer
      .getByText("Left a voicemail — call again", { exact: true })
      .click();
    await composer.getByText("Tomorrow morning", { exact: true }).click();
    await page.getByTestId("save-outcome").click();
    await expect(page.getByTestId("composer-feedback")).toBeVisible();

    const { data: authorProfile } = await db
      .from("staff_profiles")
      .select("display_name")
      .eq("email", SEED_EMAIL.toLowerCase())
      .single();
    await expect(notes).toContainText(
      String(authorProfile?.display_name ?? ""),
    );
    await expect(page.getByTestId("request-activity")).toContainText(
      "Left a voicemail",
    );

    await page.reload();
    await expect(page.getByTestId("note-list")).toContainText(noteText);

    // Appointment request notes have one consistent entry point, independent
    // from the status workflow.
    await notesSection
      .getByRole("button", { name: "Add note", exact: true })
      .click();
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
    // the note must still be the obvious patient handoff when the row opens.
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
        document.documentElement.dataset.testRequestPrint = "called";
      };
    });
    await page.getByRole("button", { name: "Print patient page" }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-test-request-print",
      "called",
    );

    // Print keeps the complete patient handoff and removes portal controls
    // and delivery diagnostics. The request root must be allowed to paginate.
    await page.emulateMedia({ media: "print" });
    await expect(page.getByTestId("request-detail-name")).toBeVisible();
    await expect(page.getByText(staged.message)).toBeVisible();
    await expect(page.getByTestId("note-list")).toContainText(handoffText);
    await expect(page.getByTestId("request-activity")).toContainText(
      "Left a voicemail",
    );
    await expect(page.getByTestId("call-outcome-composer")).toBeHidden();
    await expect(
      page.getByRole("heading", { name: "Notifications" }),
    ).toBeHidden();
    await expect(
      page.getByRole("navigation", { name: "Breadcrumb" }),
    ).toBeHidden();
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
      const event = events?.find(
        (candidate) =>
          (candidate.meta as Record<string, unknown> | null)?.text ===
          expectedText,
      );
      expect(event).toBeTruthy();
      const meta = (event?.meta ?? {}) as Record<string, unknown>;
      expect(String(meta.author_email).toLowerCase()).toBe(
        SEED_EMAIL.toLowerCase(),
      );
    }

    const { data: outcomeAudits, error: outcomeAuditError } = await db
      .from("audit_log")
      .select("detail")
      .eq("entity_id", id)
      .eq("action", "request.call_outcome");
    expect(outcomeAuditError).toBeNull();
    expect(outcomeAudits).toHaveLength(1);
    const detail = outcomeAudits![0].detail as Record<string, unknown>;
    expect(detail.outcome).toBe("voicemail");
    expect(detail.note_attached).toBe(false);
    expect(detail).not.toHaveProperty("note_length");
    expect(JSON.stringify(detail)).not.toContain(noteText);
  });
});
