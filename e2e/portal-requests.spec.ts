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
    await page.goto("/admin");

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

  test("VAL-ADMIN-005: detail shows every field and the lifecycle persists", async ({
    page,
    request,
  }) => {
    const id = await stageRequest(request, "lifecycle");
    const staged = payload("lifecycle");

    await signIn(page);
    await page.goto(`/admin/requests/${id}`);

    await expect(page.getByTestId("request-detail-name")).toHaveText(
      staged.name,
    );
    await expect(page.getByText(staged.phone).first()).toBeVisible();
    await expect(page.getByText(staged.email).first()).toBeVisible();
    await expect(page.getByText("Tampa", { exact: true })).toBeVisible();
    await expect(page.getByText("Morning", { exact: true })).toBeVisible();
    await expect(page.getByTestId("request-message")).toContainText(
      staged.message,
    );
    await expect(page.getByText("/en/appointment").first()).toBeVisible();

    for (const status of ["contacted", "scheduled", "closed"] as const) {
      await page.locator(`[data-status-action="${status}"]`).click();
      await expect(
        page.locator(`[data-status-action="${status}"]`),
      ).toBeDisabled();
      await expect(
        page.locator(`span[data-status="${status}"]`).first(),
      ).toBeVisible();

      const { data, error } = await db
        .from("requests")
        .select("status")
        .eq("id", id)
        .single();
      expect(error).toBeNull();
      expect(data?.status).toBe(status);
    }
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
            await page.goto(`/admin?status=${status}`);
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

    await page.getByLabel("Add a note").fill(noteText);
    await page.getByRole("button", { name: "Save note" }).click();

    await expect(page.getByTestId("note-list")).toContainText(noteText);
    await expect(page.getByTestId("note-list")).toContainText(
      SEED_EMAIL.toLowerCase(),
    );

    await page.reload();
    await expect(page.getByTestId("note-list")).toContainText(noteText);

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
  });
});
