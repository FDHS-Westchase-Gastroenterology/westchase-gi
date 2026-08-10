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
// VAL-ADMIN-005: detail shows all fields; the full appointment-request lifecycle persists.
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

// The Appointments views are presentation views over durable statuses:
// the Scheduled view reads `booked` (plus `scheduled` rows that may exist
// only mid-deploy). The word "scheduled" is never a durable status.
const VIEW_DB_STATUSES: Record<string, string[]> = {
  new: ["new"],
  contacted: ["contacted"],
  scheduled: ["booked", "scheduled"],
  closed: ["closed"],
};

async function sqlCount(view: string): Promise<number> {
  const { count, error } = await db
    .from("requests")
    .select("id", { count: "exact", head: true })
    .in("status", VIEW_DB_STATUSES[view]);
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
    // The detail workspace preserves a clear return path to the same queue.
    await expect(
      page.getByRole("link", { name: "Back to Appointments" }),
    ).toHaveAttribute("href", "/admin/requests");
    const details = page.locator(
      'section[aria-labelledby="request-details-heading"]',
    );
    await expect(details.getByTestId("request-phone-link")).toHaveAttribute(
      "href",
      `tel:${staged.phone}`,
    );
    await expect(
      details.getByRole("link", { name: /^Call patient/ }),
    ).toBeVisible();
    await expect(details.getByTestId("request-phone-link")).toContainText(
      "(813) 555-0177",
    );
    await expect(details.getByTestId("request-email-link")).toHaveAttribute(
      "href",
      `mailto:${staged.email}`,
    );
    await expect(
      details.getByRole("link", { name: /^Email patient/ }),
    ).toBeVisible();
    await expect(details.getByTestId("request-preferences")).toContainText(
      "Tampa",
    );
    await expect(details.getByTestId("request-preferences")).toContainText(
      "Morning",
    );
    await expect(details.getByTestId("request-intake-meta")).toContainText(
      "Received",
    );
    await expect(details.getByTestId("request-intake-meta")).toContainText(
      "English form",
    );
    await expect(page.getByTestId("request-message")).toContainText(
      staged.message,
    );
    await expect(page.getByText("/en/appointment", { exact: true })).toHaveCount(
      0,
    );
    // Every recorded delivery attempt renders in Request history — no
    // address is hidden (staff addresses are operational, not PHI).
    const history = page.getByTestId("request-history");
    await expect(history).toContainText(visibleRecipient);
    await expect(history).toContainText("jason.gitdev@gmail.com");

    const panel = page.getByTestId("workflow-panel");
    const feedback = page.getByTestId("workflow-feedback");
    async function statusOf() {
      const { data, error } = await db
        .from("requests")
        .select(
          "status, closure_reason, closed_at, follow_up_at, record_handoff_at",
        )
        .eq("id", id)
        .single();
      expect(error).toBeNull();
      return data;
    }

    // A call-again outcome requires the callback day before saving:
    // the Save button stays disabled until the required choice is made.
    await panel.getByText("No answer — call again", { exact: true }).click();
    await expect(page.getByTestId("save-workflow")).toBeDisabled();
    await panel.getByText("Tomorrow morning", { exact: true }).click();
    await page.getByTestId("save-workflow").click();
    await expect(feedback).toContainText("resurface");
    const afterNoAnswer = await statusOf();
    expect(afterNoAnswer?.status).toBe("contacted");
    expect(afterNoAnswer?.follow_up_at).toBeTruthy();
    await expect(page.getByTestId("workflow-current-state")).toContainText(
      "Contacted",
    );

    // The daily success path: booked in the practice system, presented as
    // Scheduled everywhere. The durable row is `booked`; the word
    // "scheduled" is presentation-only.
    await panel.getByText("Appointment booked", { exact: true }).click();
    await page.getByTestId("save-workflow").click();
    await expect(feedback).toContainText("marked Scheduled");
    const afterBooked = await statusOf();
    expect(afterBooked?.status).toBe("booked");
    expect(afterBooked?.record_handoff_at).toBeTruthy();
    await expect(page.getByTestId("workflow-current-state")).toContainText(
      "Scheduled",
    );

    // A resolved request offers reopen — a legal command, not a status
    // picker. Reopen returns it to Contacted with history intact.
    await page.getByTestId("reopen-request").click();
    await expect(feedback).toContainText("Reopened — back to Contacted");
    const reopened = await statusOf();
    expect(reopened?.status).toBe("contacted");
    expect(reopened?.record_handoff_at).toBeNull();

    // Closing records the concrete reason the database needs.
    await panel.getByText("Patient won't schedule", { exact: true }).click();
    await page.getByTestId("save-workflow").click();
    await expect(feedback).toContainText("closed");
    const closed = await statusOf();
    expect(closed?.status).toBe("closed");
    expect(closed?.closure_reason).toBe("wont_schedule");
    expect(closed?.closed_at).toBeTruthy();
    expect(closed?.follow_up_at).toBeNull();
    // The call sheet is the request's stable anchor. Contact details,
    // preferences, and the patient note remain available after resolution.
    await expect(details.getByTestId("request-phone-link")).toBeVisible();
    await expect(details.getByTestId("request-preferences")).toContainText(
      "Tampa",
    );
    await expect(details.getByTestId("request-message")).toContainText(
      staged.message,
    );

    // Every accepted command leaves exactly one immutable transition and
    // one PHI-free workflow audit entry; the retired generic status
    // setter's audit action never appears.
    const { data: transitions, error: transitionsError } = await db
      .from("request_transitions")
      .select("command, from_state, to_state")
      .eq("request_id", id)
      .order("occurred_at");
    expect(transitionsError).toBeNull();
    expect(
      (transitions ?? []).map((row) => [
        row.command,
        row.from_state,
        row.to_state,
      ]),
    ).toEqual([
      ["record_contact_attempt", "new", "contacted"],
      ["confirm_booking_handoff", "contacted", "booked"],
      ["reopen_request", "booked", "contacted"],
      ["close_request", "contacted", "closed"],
    ]);

    const { data: workflowAudits, error: workflowAuditError } = await db
      .from("audit_log")
      .select("detail")
      .eq("entity_id", id)
      .eq("action", "request.workflow_command");
    expect(workflowAuditError).toBeNull();
    expect(workflowAudits).toHaveLength(4);
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
  });

  test("VAL-ADMIN-005b: unsafe legacy email never becomes a mail link", async ({
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

    const fallback = page.getByTestId("request-email-unavailable");
    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText("No email provided");
    await expect(fallback.locator('a[href^="mailto:"]')).toHaveCount(0);
  });

  test("VAL-ADMIN-005c: long intake content reflows without clipping", async ({
    page,
  }) => {
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

    const details = page.locator(
      'section[aria-labelledby="request-details-heading"]',
    );
    const wrappingTargets = [
      details.getByTestId("request-email-link").locator(
        ".portal-request-contact-copy",
      ),
      details.getByTestId("request-message"),
    ];
    for (const target of wrappingTargets) {
      const box = await target.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth + 1);
    }
    const cardBox = await details.boundingBox();
    expect(cardBox).not.toBeNull();
    expect((cardBox?.x ?? 0) + (cardBox?.width ?? 0)).toBeLessThanOrEqual(390);

    await page.emulateMedia({ media: "print" });
    await expect(details).toHaveCSS("overflow", "visible");
    const printMessage = await details
      .getByTestId("request-message")
      .evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
    expect(printMessage.scrollWidth).toBeLessThanOrEqual(
      printMessage.clientWidth + 1,
    );
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
    for (const view of ["new", "contacted", "scheduled", "closed"]) {
      await expect
        .poll(
          async () => {
            await page.goto(`/admin/requests?status=${view}`);
            const chip = Number(
              await page.locator(`[data-filter-count="${view}"]`).textContent(),
            );
            const shown = await page
              .locator('[data-testid="request-row"]')
              .count();
            const badges = await page
              .locator('[data-testid="request-row"] [data-status]')
              .evaluateAll((nodes) =>
                nodes.map((node) => node.getAttribute("data-status")),
              );
            const sql = await sqlCount(view);

            // Rows in a view always wear that view's presentation status:
            // durable `booked` renders as `scheduled`, never as itself.
            const badgesOk = badges.every((badge) => badge === view);
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
    // Staged rows satisfy the workflow-shape constraint: booked rows carry
    // their handoff time, classified closed rows carry closed_at + reason.
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

      // The panel only offers legal commands — never the request's own
      // current state. One save books it; continuation appears only after
      // a confirmed success.
      const panel = page.getByTestId("workflow-panel");
      const feedback = page.getByTestId("workflow-feedback");
      await expect(page.getByTestId("save-workflow")).toHaveText("Save");
      await expect(page.getByTestId("save-workflow")).toBeDisabled();
      await expect(page.getByTestId("open-next-request")).toHaveCount(0);
      await panel.getByText("Appointment booked", { exact: true }).click();
      await page.getByTestId("save-workflow").click();
      await expect(feedback).toContainText("marked Scheduled");
      await expect(page.getByTestId("undo-latest")).toHaveText("Undo");

      // Undo is a real atomic reversal — a compensating transition that
      // restores the prior snapshot — not a local form reset.
      await page.getByTestId("undo-latest").click();
      await expect(feedback).toContainText(
        "Undone — this request is Contacted again.",
      );
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
      await page.getByTestId("save-workflow").click();
      await expect(feedback).toContainText("marked Scheduled");
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
      expect(savedRow?.status).toBe("booked");

      // The evidence chain: booked, compensating undo, booked again.
      const { data: transitions, error: transitionsError } = await db
        .from("request_transitions")
        .select("command, from_state, to_state, compensates_transition_id")
        .eq("request_id", idsByKey.get("due")!)
        .order("occurred_at");
      expect(transitionsError).toBeNull();
      expect(
        (transitions ?? []).map((row) => [
          row.command,
          row.from_state,
          row.to_state,
        ]),
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

    // The workflow panel records outcomes; notes have their own surface.
    const panel = page.getByTestId("workflow-panel");
    await expect(panel.getByLabel("Note", { exact: true })).toHaveCount(0);
    await panel
      .getByText("Left a voicemail — call again", { exact: true })
      .click();
    await panel.getByText("Tomorrow morning", { exact: true }).click();
    await page.getByTestId("save-workflow").click();
    await expect(page.getByTestId("workflow-feedback")).toContainText(
      "Saved",
    );

    const { data: authorProfile } = await db
      .from("staff_profiles")
      .select("display_name")
      .eq("email", SEED_EMAIL.toLowerCase())
      .single();
    await expect(notes).toContainText(
      String(authorProfile?.display_name ?? ""),
    );
    await expect(page.getByTestId("request-history")).toContainText(
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
    await page.getByRole("button", { name: "Print request" }).click();
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
    await expect(page.getByTestId("request-history")).toContainText(
      "Left a voicemail",
    );
    await expect(page.getByTestId("workflow-panel")).toBeHidden();
    await expect(
      page.getByRole("link", { name: "Back to Appointments" }),
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

    // The workflow audit records the command shape only — never note text.
    const { data: workflowAudits, error: workflowAuditError } = await db
      .from("audit_log")
      .select("detail")
      .eq("entity_id", id)
      .eq("action", "request.workflow_command");
    expect(workflowAuditError).toBeNull();
    expect(workflowAudits).toHaveLength(1);
    const detail = workflowAudits![0].detail as Record<string, unknown>;
    expect(detail.command).toBe("record_contact_attempt");
    expect(JSON.stringify(detail)).not.toContain(noteText);
    expect(JSON.stringify(detail)).not.toContain(handoffText);
  });
});
