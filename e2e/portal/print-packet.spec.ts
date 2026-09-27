import { randomUUID } from "node:crypto";

import { test, expect } from "@playwright/test";
import type { APIRequestContext, BrowserContext, Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";

import { intakeResponseSchema } from "../../src/lib/portal/contracts";
import { clientIps, runId, seedAdmin, serviceDb } from "../harness/env";
import { signIn } from "../harness/session";

// The paper handoff is a truthful snapshot: every New request, or exactly the
// Requests staff chose, oldest first, one printed page each, accountable
// Without patient details in the audit, and entirely non-mutating.

const { email: SEED_EMAIL } = seedAdmin();
const db = serviceDb();
const testAuditIds: string[] = [];

const testIp = clientIps("print-packet");

const NO_DETAILS = "No patient details were shown and no appointment request changed.";
const CONFIDENTIAL = "Confidential patient information — clinic use only.";

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

async function stageRequest(request: APIRequestContext, label: "older" | "newer"): Promise<string> {
  const response = await request.post("/api/requests", {
    data: requestPayload(label),
    headers: { "X-Forwarded-For": testIp(label) },
  });
  expect(response.status()).toBe(201);
  const body = intakeResponseSchema.parse(await response.json());
  if (!body.ok) throw new Error("Expected an accepted intake response");
  return body.id;
}

/* Both fixtures, staged once for the serial file and dated an hour apart so
   "oldest first" is decided by the fixtures rather than by insert timing. */
let staged: Promise<{ olderId: string; newerId: string }> | null = null;

async function stagedPair(request: APIRequestContext) {
  staged ??= (async () => {
    const olderId = await stageRequest(request, "older");
    const newerId = await stageRequest(request, "newer");
    const [olderTime, newerTime] = await Promise.all([
      db.from("requests").update({ created_at: "2026-08-08T13:00:00.000Z" }).eq("id", olderId),
      db.from("requests").update({ created_at: "2026-08-08T14:00:00.000Z" }).eq("id", newerId),
    ]);
    expect(olderTime.error).toBeNull();
    expect(newerTime.error).toBeNull();
    return { olderId, newerId };
  })();
  return staged;
}

async function durableRequest(id: string) {
  const { data, error } = await db
    .from("requests")
    .select("id, status, version, follow_up_at, closure_reason, closed_at, record_handoff_at")
    .eq("id", id)
    .single();
  expect(error).toBeNull();
  return data;
}

const auditRowsSchema = z.array(z.object({ id: z.string(), detail: z.unknown() }));

async function printAudits() {
  const { data, error } = await db
    .from("audit_log")
    .select("id, detail")
    .eq("actor_email", SEED_EMAIL.trim().toLowerCase())
    .eq("action", "requests.print_new")
    .order("at", { ascending: false });
  expect(error).toBeNull();
  return auditRowsSchema.parse(data ?? []);
}

async function printAuditIds(): Promise<Set<string>> {
  return new Set((await printAudits()).map((row) => row.id));
}

async function newPrintAudits(prior: ReadonlySet<string>) {
  return (await printAudits()).filter((row) => !prior.has(row.id));
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Playwright's BrowserContext carries framework member types that cannot be made readonly
async function holdPrintLayout(context: BrowserContext) {
  await context.addInitScript(() => {
    let releaseFonts = () => {};
    const fontsReady = new Promise<void>((resolve) => {
      releaseFonts = resolve;
    });
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: fontsReady },
    });
    window.addEventListener("test-release-print-layout", releaseFonts, {
      once: true,
    });
    window.print = () => {
      const calls = Number.parseInt(
        document.documentElement.dataset.testPacketPrintCalls ?? "0",
        10,
      );
      document.documentElement.dataset.testPacketPrintCalls = String(calls + 1);
    };
  });
}

async function expectNoPacket(page: Page, names: readonly string[]) {
  await expect(page.getByText(NO_DETAILS)).toBeVisible();
  await expect(page.locator(".printed-page")).toHaveCount(0);
  for (const name of names) await expect(page.getByText(name)).toHaveCount(0);
}

test.describe("appointment-request print packet", () => {
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
    context,
    page,
    request,
  }) => {
    const { olderId, newerId } = await stagedPair(request);
    const older = requestPayload("older");
    const newer = requestPayload("newer");

    const [{ count: newCount, error: countError }, beforeOlder, beforeNewer] = await Promise.all([
      db.from("requests").select("id", { count: "exact", head: true }).eq("status", "new"),
      durableRequest(olderId),
      durableRequest(newerId),
    ]);
    expect(countError).toBeNull();
    expect(newCount).not.toBeNull();
    const packetCount = newCount ?? 0;

    const priorAuditIds = await printAuditIds();
    await holdPrintLayout(context);
    await signIn(page);
    expect(
      await newPrintAudits(priorAuditIds),
      "rendering Home must not prefetch an audited print packet",
    ).toHaveLength(0);

    await page.goto("/admin/requests/print?auto=1");
    await expect(
      page.getByRole("heading", { name: "Print new appointment requests", exact: true }),
    ).toBeVisible();

    // Auto-print waits for the final font metrics and layout instead of
    // Racing the packet into the browser dialog on an arbitrary timer.
    await page.waitForTimeout(350);
    await expect(page.locator("html")).not.toHaveAttribute("data-test-packet-print-calls", /.+/);
    await page.evaluate(() => {
      window.dispatchEvent(new Event("test-release-print-layout"));
    });
    await expect(page.locator("html")).toHaveAttribute("data-test-packet-print-calls", "1");
    await expect(page.getByTestId("print-packet-feedback")).toHaveText(
      "Print dialog is opening for this packet.",
    );

    // One printed page per request, siblings inside the one packet.
    const sheets = page.locator(".portal-print-packet > .printed-page");
    await expect(sheets).toHaveCount(packetCount);
    expect(await sheets.locator(".printed-page-masthead strong").allTextContents()).toEqual(
      Array.from({ length: packetCount }, () => "Westchase Gastroenterology"),
    );
    expect(await sheets.locator(".printed-page-masthead span").allTextContents()).toEqual(
      Array.from(
        { length: packetCount },
        (_, index) => `Appointment request · ${index + 1} of ${packetCount}`,
      ),
    );
    const sheetText = await sheets.allTextContents();
    const olderIndex = sheetText.findIndex((text) => text.includes(older.name));
    const newerIndex = sheetText.findIndex((text) => text.includes(newer.name));
    expect(olderIndex).toBeGreaterThanOrEqual(0);
    expect(newerIndex).toBeGreaterThanOrEqual(0);
    expect(olderIndex).toBeLessThan(newerIndex);

    const olderSheet = sheets.filter({ hasText: older.name });
    await expect(olderSheet).toContainText("(813) 555-0141");
    await expect(olderSheet).toContainText(older.email);
    await expect(olderSheet).toContainText("Tampa");
    await expect(olderSheet).toContainText("Morning");
    await expect(olderSheet).toContainText(older.message);
    await expect(olderSheet.locator(".printed-page-chip")).toHaveText("New");
    await expect(olderSheet.getByRole("region", { name: "This call" })).toBeVisible();
    await expect(olderSheet.getByRole("region", { name: "This call" })).toContainText(
      "Won't schedule",
    );

    // Every page carries the confidentiality line and the same printed-at
    // Time and name: one preparation for the whole packet.
    expect(await sheets.locator(".printed-page-footer strong").allTextContents()).toEqual(
      Array.from({ length: packetCount }, () => CONFIDENTIAL),
    );
    const printedLines = await sheets.locator(".printed-page-footer span").allTextContents();
    expect(new Set(printedLines).size).toBe(1);
    expect(printedLines[0]).toMatch(/^Printed .+ by .+/);

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
    await expect(page.getByText("Confirm the page count before printing.")).toBeHidden();
    const pageBreaks = await sheets.evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).breakBefore),
    );
    expect(pageBreaks.slice(1).every((value) => value === "page")).toBe(true);
    const packetPdf = await PDFDocument.load(
      await page.pdf({ preferCSSPageSize: true, printBackground: true }),
    );
    expect(packetPdf.getPageCount()).toBe(packetCount);
    await page.emulateMedia({ media: "screen" });
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    const packetButton = page.getByRole("button", {
      name: `Print ${packetCount} ${packetCount === 1 ? "request" : "requests"}`,
    });
    await packetButton.focus();
    await packetButton.evaluate((button) => {
      if (!(button instanceof HTMLButtonElement)) throw new Error("expected packet button");
      button.click();
      button.click();
    });
    await expect(page.locator("html")).toHaveAttribute("data-test-packet-print-calls", "2");
    await expect(page.getByTestId("print-packet-feedback")).toHaveText(
      "Print dialog is opening for this packet.",
    );
    await expect(packetButton).toBeFocused();
    await expect(packetButton).toHaveAttribute("aria-disabled", "true");
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    await expect(packetButton).not.toHaveAttribute("aria-disabled", "true");
    await expect(page.getByRole("link", { name: "Open New requests" })).toHaveAttribute(
      "href",
      "/admin/requests?status=new",
    );

    expect(await durableRequest(olderId)).toEqual(beforeOlder);
    expect(await durableRequest(newerId)).toEqual(beforeNewer);

    // The audit names the packet's requests in print order, and nothing about
    // The patients themselves.
    const newAudits = await newPrintAudits(priorAuditIds);
    expect(newAudits).toHaveLength(1);
    testAuditIds.push(newAudits[0].id);
    const detail = z
      .strictObject({
        row_count: z.number(),
        status_filter: z.string(),
        request_ids: z.array(z.string()),
      })
      .parse(newAudits[0].detail);
    expect(detail.row_count).toBe(packetCount);
    expect(detail.status_filter).toBe("new");
    expect(detail.request_ids).toHaveLength(packetCount);
    expect(detail.request_ids.indexOf(olderId)).toBe(olderIndex);
    expect(detail.request_ids.indexOf(newerId)).toBe(newerIndex);
    const serializedDetail = JSON.stringify(detail);
    for (const patientValue of [
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
      `prepared the New-request print packet (${packetCount} ${
        packetCount === 1 ? "request" : "requests"
      })`,
    );
  });

  test("prints exactly the chosen requests, oldest first, whatever status is also asked", async ({
    context,
    page,
    request,
  }) => {
    const { olderId, newerId } = await stagedPair(request);
    const older = requestPayload("older");
    const newer = requestPayload("newer");
    const [beforeOlder, beforeNewer] = await Promise.all([
      durableRequest(olderId),
      durableRequest(newerId),
    ]);
    const priorAuditIds = await printAuditIds();
    await holdPrintLayout(context);
    await signIn(page);

    // `ids` wins over `status`, and chosen order does not decide print order.
    await page.goto(`/admin/requests/print?status=closed&ids=${newerId},${olderId}`);
    await expect(
      page.getByRole("heading", { name: "Print appointment requests", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("2 chosen requests, ordered oldest first for a fair paper handoff."),
    ).toBeVisible();

    const sheets = page.locator(".portal-print-packet > .printed-page");
    await expect(sheets).toHaveCount(2);
    await expect(sheets.nth(0)).toContainText(older.name);
    await expect(sheets.nth(1)).toContainText(newer.name);
    await expect(sheets.nth(1)).toContainText("(813) 555-0142");
    expect(await sheets.locator(".printed-page-masthead span").allTextContents()).toEqual([
      "Appointment request · 1 of 2",
      "Appointment request · 2 of 2",
    ]);
    await expect(sheets.nth(0).getByRole("region", { name: "This call" })).toBeVisible();
    await expect(sheets.nth(0).locator(".printed-page-footer strong")).toHaveText(CONFIDENTIAL);

    // Without auto=1 the packet waits for staff to press Print.
    await page.evaluate(() => {
      window.dispatchEvent(new Event("test-release-print-layout"));
    });
    await expect(page.getByRole("button", { name: "Print 2 requests" })).toBeVisible();
    await expect(page.locator("html")).not.toHaveAttribute("data-test-packet-print-calls", /.+/);
    await expect(page.getByRole("link", { name: "Open Requests" }).last()).toHaveAttribute(
      "href",
      "/admin/requests",
    );

    expect(await durableRequest(olderId)).toEqual(beforeOlder);
    expect(await durableRequest(newerId)).toEqual(beforeNewer);

    const newAudits = await newPrintAudits(priorAuditIds);
    expect(newAudits).toHaveLength(1);
    testAuditIds.push(newAudits[0].id);
    expect(newAudits[0].detail).toEqual({
      row_count: 2,
      status_filter: null,
      request_ids: [olderId, newerId],
    });

    await page.goto("/admin/audit");
    await expect(page.getByTestId("recent-work-list").first()).toContainText(
      "prepared a print packet of 2 requests",
    );
  });

  test("an invalid list of ids prints nothing and audits nothing", async ({ page, request }) => {
    const { olderId } = await stagedPair(request);
    const older = requestPayload("older");
    const priorAuditIds = await printAuditIds();
    await signIn(page);

    for (const ids of ["", "not-a-uuid", `${olderId},not-a-uuid`, `${olderId},`]) {
      await page.goto(`/admin/requests/print?ids=${ids}&auto=1`);
      await expect(
        page.getByRole("heading", { name: "That print list is not valid", exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("heading", { name: "Choose what to print again" })).toBeVisible();
      await expectNoPacket(page, [older.name]);
    }
    expect(await newPrintAudits(priorAuditIds)).toHaveLength(0);
  });

  test("a chosen request that no longer exists prints nothing and audits nothing", async ({
    page,
    request,
  }) => {
    const { olderId, newerId } = await stagedPair(request);
    const priorAuditIds = await printAuditIds();
    await signIn(page);

    await page.goto(`/admin/requests/print?ids=${olderId},${randomUUID()},${newerId}&auto=1`);
    await expect(
      page.getByRole("heading", { name: "A chosen request is no longer available", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Choose the requests again" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to Home" }).last()).toHaveAttribute(
      "href",
      "/admin",
    );
    await expectNoPacket(page, [requestPayload("older").name, requestPayload("newer").name]);
    expect(await newPrintAudits(priorAuditIds)).toHaveLength(0);
  });
});
