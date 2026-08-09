import { createHash, randomUUID } from "node:crypto";
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { loadLocalEnv, requiredEnv, serviceDb } from "./support";

// The paper handoff is a truthful snapshot of the live New queue: complete,
// oldest first, accountable without PHI, and entirely non-mutating.

loadLocalEnv();

const SEED_EMAIL = requiredEnv("PORTAL_SEED_ADMIN_EMAIL");
const SEED_PASSWORD = requiredEnv("PORTAL_SEED_ADMIN_PASSWORD");
const db = serviceDb();
const runId = randomUUID().slice(0, 8);
const testAuditIds: string[] = [];

function testIp(label: string): string {
  const hex = createHash("sha256").update(`${runId}:${label}`).digest("hex");
  return `2001:db8:${hex.slice(0, 4)}:${hex.slice(4, 8)}::9`;
}

function requestPayload(label: string) {
  const message =
    label === "older"
      ? `TEST maximum-length pagination fixture. ${"Complete fictional context without medical details. ".repeat(50)}`.slice(
          0,
          2_000,
        )
      : `TEST paper handoff ${label}; no medical details.`;
  return {
    name: `TEST Print Packet ${runId} ${label}`,
    phone: label === "older" ? "8135550141" : "8135550142",
    email: `print-${runId}-${label}@example.test`,
    location: label === "older" ? "tampa" : "lutz",
    time: label === "older" ? "morning" : "afternoon",
    message,
    locale: label === "older" ? "en" : "es",
    sourcePath: label === "older" ? "/en/appointment" : "/es/appointment",
  };
}

async function stageRequest(
  request: APIRequestContext,
  label: "older" | "newer",
): Promise<string> {
  const response = await request.post("/api/requests", {
    data: requestPayload(label),
    headers: { "X-Forwarded-For": testIp(label) },
  });
  expect(response.status()).toBe(201);
  const body = (await response.json()) as { id: string };
  return body.id;
}

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(SEED_EMAIL);
  await page.getByLabel("Password").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
}

async function durableRequest(id: string) {
  const { data, error } = await db
    .from("requests")
    .select(
      "id, status, version, follow_up_at, closure_reason, closed_at, record_handoff_at",
    )
    .eq("id", id)
    .single();
  expect(error).toBeNull();
  return data;
}

test.describe("new appointment-request print packet", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "JS portal UI");
  });

  test.afterAll(async () => {
    await db.from("requests").delete().like("email", `print-${runId}-%`);
    if (testAuditIds.length > 0) {
      await db.from("audit_log").delete().in("id", testAuditIds);
    }
  });

  test("prints every New request oldest first without changing request truth", async ({
    page,
    request,
  }) => {
    const olderId = await stageRequest(request, "older");
    const newerId = await stageRequest(request, "newer");
    const older = requestPayload("older");
    const newer = requestPayload("newer");

    const [olderTime, newerTime] = await Promise.all([
      db
        .from("requests")
        .update({ created_at: "2026-08-08T13:00:00.000Z" })
        .eq("id", olderId),
      db
        .from("requests")
        .update({ created_at: "2026-08-08T14:00:00.000Z" })
        .eq("id", newerId),
    ]);
    expect(olderTime.error).toBeNull();
    expect(newerTime.error).toBeNull();

    const [{ count: newCount, error: countError }, beforeOlder, beforeNewer] =
      await Promise.all([
        db
          .from("requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
        durableRequest(olderId),
        durableRequest(newerId),
      ]);
    expect(countError).toBeNull();
    expect(newCount).not.toBeNull();

    const { data: priorAudits, error: priorAuditError } = await db
      .from("audit_log")
      .select("id")
      .eq("actor_email", SEED_EMAIL.trim().toLowerCase())
      .eq("action", "requests.print_new");
    expect(priorAuditError).toBeNull();
    const priorAuditIds = new Set((priorAudits ?? []).map((row) => row.id));

    await page.addInitScript(() => {
      window.print = () => {
        document.documentElement.dataset.testPacketPrint = "called";
      };
    });
    await signIn(page);
    await page.goto("/admin/requests/print?auto=1");

    await expect(
      page.getByRole("heading", {
        name: "Print new appointment requests",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute(
      "data-test-packet-print",
      "called",
    );

    const sheets = page.getByTestId("print-request-sheet");
    await expect(sheets).toHaveCount(newCount ?? 0);
    const sheetText = await sheets.allTextContents();
    const olderIndex = sheetText.findIndex((text) => text.includes(older.name));
    const newerIndex = sheetText.findIndex((text) => text.includes(newer.name));
    expect(olderIndex).toBeGreaterThanOrEqual(0);
    expect(newerIndex).toBeGreaterThanOrEqual(0);
    expect(olderIndex).toBeLessThan(newerIndex);

    const olderSheet = sheets.filter({ hasText: older.name });
    await expect(olderSheet).toContainText(older.phone);
    await expect(olderSheet).toContainText(older.email);
    await expect(olderSheet).toContainText("Tampa");
    await expect(olderSheet).toContainText("Morning");
    await expect(olderSheet).toContainText(older.message);
    await expect(olderSheet).toContainText("New — not yet contacted");
    await expect(olderSheet).toContainText("Paper handoff");
    await expect(olderSheet).toContainText("Record first in the portal");
    await expect(olderSheet).toContainText(
      "Reached the patient — follow-up needed",
    );
    await expect(olderSheet).toContainText("Left a voicemail");
    await expect(olderSheet).toContainText("Duplicate or not actionable");
    await expect(olderSheet).toContainText(
      "Patient won't schedule — record the contact attempt first, then close the request.",
    );

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(0);
    }

    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".portal-sidebar")).toBeHidden();
    await expect(page.getByText("Review the count before printing.")).toBeHidden();
    const pageBreaks = await sheets.evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).breakAfter),
    );
    expect(pageBreaks.slice(0, -1).every((value) => value === "page")).toBe(true);
    const packetPdf = await PDFDocument.load(
      await page.pdf({ preferCSSPageSize: true, printBackground: true }),
    );
    expect(packetPdf.getPageCount()).toBe(newCount);
    await page.emulateMedia({ media: "screen" });
    await expect(
      page.getByRole("link", { name: "Open New requests" }),
    ).toHaveAttribute("href", "/admin/requests?status=new");

    expect(await durableRequest(olderId)).toEqual(beforeOlder);
    expect(await durableRequest(newerId)).toEqual(beforeNewer);

    const { data: packetAudits, error: packetAuditError } = await db
      .from("audit_log")
      .select("id, detail")
      .eq("actor_email", SEED_EMAIL.trim().toLowerCase())
      .eq("action", "requests.print_new")
      .order("at", { ascending: false });
    expect(packetAuditError).toBeNull();
    const newAudits = (packetAudits ?? []).filter(
      (row) => !priorAuditIds.has(row.id),
    );
    expect(newAudits).toHaveLength(1);
    testAuditIds.push(newAudits[0].id);
    expect(newAudits[0].detail).toEqual({
      row_count: newCount,
      status_filter: "new",
    });
    const serializedDetail = JSON.stringify(newAudits[0].detail);
    for (const patientValue of [
      olderId,
      newerId,
      older.name,
      newer.name,
      older.email,
      newer.email,
      older.phone,
      newer.phone,
    ]) {
      expect(serializedDetail).not.toContain(patientValue);
    }

    await page.goto("/admin/audit");
    await expect(page.getByTestId("recent-work-list").first()).toContainText(
      `prepared the New-request print packet (${newCount} ${
        newCount === 1 ? "request" : "requests"
      })`,
    );
  });
});
