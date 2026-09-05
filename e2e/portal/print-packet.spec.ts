import { createHash, randomUUID } from "node:crypto";

import { test, expect } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";

import { intakeResponseSchema } from "../../src/lib/portal/contracts";
import { loadLocalEnv, requiredEnv, serviceDb } from "../harness/env";

// The paper handoff is a truthful snapshot of the live New queue: complete,
// Oldest first, accountable without PHI, and entirely non-mutating.

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
    .select("id, status, version, follow_up_at, closure_reason, closed_at, record_handoff_at")
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
    context,
    page,
    request,
  }) => {
    const olderId = await stageRequest(request, "older");
    const newerId = await stageRequest(request, "newer");
    const older = requestPayload("older");
    const newer = requestPayload("newer");

    const [olderTime, newerTime] = await Promise.all([
      db.from("requests").update({ created_at: "2026-08-08T13:00:00.000Z" }).eq("id", olderId),
      db.from("requests").update({ created_at: "2026-08-08T14:00:00.000Z" }).eq("id", newerId),
    ]);
    expect(olderTime.error).toBeNull();
    expect(newerTime.error).toBeNull();

    const [{ count: newCount, error: countError }, beforeOlder, beforeNewer] = await Promise.all([
      db.from("requests").select("id", { count: "exact", head: true }).eq("status", "new"),
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
    const priorAuditIds = new Set(
      z
        .array(z.object({ id: z.string() }))
        .parse(priorAudits ?? [])
        .map((row) => row.id),
    );

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
    await signIn(page);

    const { data: auditsAfterHome, error: auditsAfterHomeError } = await db
      .from("audit_log")
      .select("id")
      .eq("actor_email", SEED_EMAIL.trim().toLowerCase())
      .eq("action", "requests.print_new");
    expect(auditsAfterHomeError).toBeNull();
    expect(
      z
        .array(z.object({ id: z.string() }))
        .parse(auditsAfterHome ?? [])
        .filter((row) => !priorAuditIds.has(row.id)),
      "rendering Home must not prefetch an audited print packet",
    ).toHaveLength(0);

    await page.getByTestId("print-chooser-trigger").click();
    const printLink = page.getByRole("link", {
      name: new RegExp(
        `^Print all ${newCount} new appointment ${newCount === 1 ? "request" : "requests"}`,
      ),
    });
    let packetPopupCount = 0;
    page.on("popup", () => {
      packetPopupCount += 1;
    });
    const popupPromise = page.waitForEvent("popup");
    await printLink.focus();
    await printLink.evaluate((link) => {
      if (!(link instanceof HTMLAnchorElement)) throw new Error("expected packet link");
      link.click();
      link.click();
    });
    const printPage = await popupPromise;
    await expect(page.getByTestId("home-output-feedback")).toHaveText(
      "Print dialog is opening in a new tab for the New-request packet.",
    );
    await expect(page.getByTestId("print-chooser-trigger")).toBeFocused();
    await expect.poll(() => packetPopupCount).toBe(1);

    await expect(
      printPage.getByRole("heading", {
        name: "Print new appointment requests",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(printPage).toHaveURL(/\/admin\/requests\/print\?auto=1$/);

    // Auto-print waits for the final font metrics and layout instead of
    // Racing the packet into the browser dialog on an arbitrary timer.
    await printPage.waitForTimeout(350);
    await expect(printPage.locator("html")).not.toHaveAttribute(
      "data-test-packet-print-calls",
      /.+/,
    );
    await printPage.evaluate(() => {
      window.dispatchEvent(new Event("test-release-print-layout"));
    });
    await expect(printPage.locator("html")).toHaveAttribute("data-test-packet-print-calls", "1");
    await expect(printPage.getByTestId("print-packet-feedback")).toHaveText(
      "Print dialog is opening for this packet.",
    );

    const sheets = printPage.getByTestId("print-request-sheet");
    await expect(sheets).toHaveCount(newCount ?? 0);
    const sheetText = await sheets.allTextContents();
    const packetCount = newCount ?? 0;
    expect(await sheets.locator(".portal-print-sheet-header strong").allTextContents()).toEqual(
      Array.from({ length: packetCount }, (_, index) => `${index + 1} of ${packetCount}`),
    );
    const preparedLabels = await sheets
      .locator(".portal-print-sheet-header span")
      .allTextContents();
    expect(preparedLabels).toHaveLength(packetCount);
    expect(new Set(preparedLabels).size).toBe(1);
    expect(preparedLabels[0]).toMatch(/^Prepared .+/);
    expect(await sheets.locator(".portal-paper-lines p:first-child").allTextContents()).toEqual(
      Array.from({ length: packetCount }, () => "Assigned to"),
    );
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
    await expect(olderSheet).toContainText("Status when prepared");
    await expect(olderSheet).toContainText("New — not yet contacted");
    await expect(olderSheet).toContainText("Paper handoff");
    await expect(olderSheet).toContainText("Record first in the portal");
    await expect(olderSheet).toContainText("Reached the patient — follow-up needed");
    await expect(olderSheet).toContainText("Left a voicemail");
    await expect(olderSheet).toContainText("Duplicate or not actionable");
    await expect(olderSheet).toContainText(
      "Patient won't schedule — record the contact attempt first, then close the request.",
    );
    expect(
      sheetText.every((text) =>
        text.includes(
          "Confidential patient information — clinic use only. Keep inside the clinic and dispose of securely.",
        ),
      ),
    ).toBe(true);

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await printPage.setViewportSize(viewport);
      expect(
        await printPage.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(0);
    }

    await printPage.emulateMedia({ media: "print" });
    await expect(printPage.locator(".portal-sidebar")).toBeHidden();
    await expect(printPage.getByText("Confirm the page count before printing.")).toBeHidden();
    const pageBreaks = await sheets.evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).breakAfter),
    );
    expect(pageBreaks.slice(0, -1).every((value) => value === "page")).toBe(true);
    const packetPdf = await PDFDocument.load(
      await printPage.pdf({ preferCSSPageSize: true, printBackground: true }),
    );
    expect(packetPdf.getPageCount()).toBe(newCount);
    await printPage.emulateMedia({ media: "screen" });
    await printPage.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    const packetButton = printPage.getByRole("button", {
      name: `Print ${newCount} ${newCount === 1 ? "request" : "requests"}`,
    });
    await packetButton.focus();
    await packetButton.evaluate((button) => {
      if (!(button instanceof HTMLButtonElement)) throw new Error("expected packet button");
      button.click();
      button.click();
    });
    await expect(printPage.locator("html")).toHaveAttribute("data-test-packet-print-calls", "2");
    await expect(printPage.getByTestId("print-packet-feedback")).toHaveText(
      "Print dialog is opening for this packet.",
    );
    await expect(packetButton).toBeFocused();
    await expect(packetButton).toHaveAttribute("aria-disabled", "true");
    await printPage.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    await expect(packetButton).not.toHaveAttribute("aria-disabled", "true");
    await expect(printPage.getByRole("link", { name: "Open New requests" })).toHaveAttribute(
      "href",
      "/admin/requests?status=new",
    );

    expect(await durableRequest(olderId)).toEqual(beforeOlder);
    expect(await durableRequest(newerId)).toEqual(beforeNewer);

    const { data: packetAudits, error: packetAuditError } = await db
      .from("audit_log")
      .select("id, detail")
      .eq("actor_email", SEED_EMAIL.trim().toLowerCase())
      .eq("action", "requests.print_new")
      .order("at", { ascending: false });
    expect(packetAuditError).toBeNull();
    const newAudits = z
      .array(z.object({ id: z.string(), detail: z.unknown() }))
      .parse(packetAudits ?? [])
      .filter((row) => !priorAuditIds.has(row.id));
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

    await printPage.goto("/admin/audit");
    await expect(printPage.getByTestId("recent-work-list").first()).toContainText(
      `prepared the New-request print packet (${newCount} ${
        newCount === 1 ? "request" : "requests"
      })`,
    );
  });
});
