import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { crc32 } from "node:zlib";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { runId, serviceDb } from "../harness/env";
import { createSchedulingFixture, schedulingFixtureDate } from "../harness/scheduling";
import { createStaffFixture, signIn } from "../harness/session";

/* Issue #357: the Activity log at /admin/audit. The shared Preview database
   holds other people's work, so every list assertion is scoped to this run's
   provider through the provider filter. Fixtures are made and removed here. */

function practiceToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function escaped(text: string) {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
}

function chip(page: Page, group: "activity-categories" | "activity-actions", label: string) {
  return page.getByTestId(group).getByRole("button", { name: label, exact: true });
}

test("the log filters by provider, change and date in the address, survives a reload, clears, and opens a row on the schedule", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const db = serviceDb();
  const prefix = `log-${runId}`;
  const fixture = await createSchedulingFixture(db, prefix);
  const name = (label: string) => `TEST ${prefix} ${label}`;
  try {
    const date = schedulingFixtureDate();
    const booked: string[] = [];
    for (const time of ["10:00", "11:00"]) {
      const outcome = await fixture.save(fixture.booking(time));
      if (!outcome.ok) throw new Error(`Booking at ${time} failed`);
      booked.push(outcome.id);
    }
    const cancelled = await fixture.save({
      action: "command",
      idempotencyKey: randomUUID(),
      command: { kind: "cancel", id: booked[1], expectedVersion: 1, reason: "TEST mistake" },
    });
    expect(cancelled.ok).toBe(true);
    const provider = fixture.providerIds[0];

    await signIn(page, fixture.staff);
    await page.goto("/admin/audit");
    await expect(page.getByRole("heading", { name: "Activity log", level: 1 })).toBeVisible();
    // An administrator sees every chip, Settings included, and the Technical record.
    await expect(chip(page, "activity-categories", "Settings")).toBeVisible();
    await expect(page.getByTestId("audit-table")).toBeVisible();

    /* Provider: the menu writes the address in place. */
    await page.getByTestId("activity-provider-trigger").click();
    await page.getByRole("menuitemradio", { name: name("First") }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/audit\\?provider=${provider}$`, "u"));
    await expect(page.getByTestId("activity-provider-trigger")).toContainText(name("First"));
    // Two bookings, the cancellation, and the provider's hours being set.
    const rows = page.getByTestId("activity-feed").locator("li[data-activity-row]");
    await expect(rows).toHaveCount(4);
    await expect(page.getByTestId("activity-hidden")).toContainText("hidden by these filters");

    /* Appointments, then Cancelled: one row, and the address carries both. */
    await chip(page, "activity-categories", "Appointments").click();
    await expect(page).toHaveURL(/category=appointments/u);
    await chip(page, "activity-actions", "Cancelled").click();
    await expect(page).toHaveURL(
      `/admin/audit?category=appointments&action=cancelled&provider=${provider}`,
    );
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(name("First"));

    /* A reload reads the same view back from the address. */
    await page.reload();
    await expect(chip(page, "activity-categories", "Appointments")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(chip(page, "activity-actions", "Cancelled")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(rows).toHaveCount(1);

    /* The row opens to its detail and its place on the schedule. */
    await rows.first().getByTestId("activity-row-summary").click();
    const detail = rows.first().getByTestId("activity-row-detail");
    await expect(detail).toBeVisible();
    await expect(detail.getByRole("link", { name: "Open record" })).toHaveAttribute(
      "href",
      `/admin/schedule?patient=${fixture.patientIds[0]}`,
    );
    const onSchedule = detail.getByRole("link", { name: "Show on schedule" });
    await expect(onSchedule).toHaveAttribute("href", `/admin/schedule?view=day&date=${date}`);

    /* Today keeps this run's work and writes the day into the address. */
    await page.getByTestId("activity-date-trigger").click();
    await page
      .getByTestId("activity-date-popover")
      .getByRole("button", { name: "Today", exact: true })
      .click();
    const today = practiceToday();
    await expect(page).toHaveURL(new RegExp(`from=${today}&to=${today}`, "u"));
    await expect(page.getByTestId("activity-date-trigger")).toContainText("Today");
    await expect(rows).toHaveCount(1);

    /* Clear all returns the whole log at the bare address. */
    await page.getByTestId("activity-clear-all").first().click();
    await expect(page).toHaveURL(/\/admin\/audit$/u);
    await expect(page.getByTestId("activity-provider-trigger")).toContainText("Any provider");
    await expect(page.getByTestId("activity-actions")).toHaveCount(0);

    /* Search lives in the page only and never reaches the address. */
    await page.goto(`/admin/audit?provider=${provider}`);
    await page.getByTestId("activity-search").fill("cancelled");
    await expect(rows).toHaveCount(1);
    await expect(page).toHaveURL(new RegExp(`/admin/audit\\?provider=${provider}$`, "u"));

    /* Show on schedule lands on that day. */
    await page.goto(`/admin/audit?category=appointments&action=cancelled&provider=${provider}`);
    await rows.first().getByTestId("activity-row-summary").click();
    await rows.first().getByRole("link", { name: "Show on schedule" }).click();
    await expect(page).toHaveURL(new RegExp(`view=day&date=${escaped(date)}`, "u"));
  } finally {
    await fixture.dispose();
  }
});

test("front desk reads the log without the Settings filter or the Technical record", async ({
  page,
}) => {
  const db = serviceDb();
  const desk = await createStaffFixture(db, {
    prefix: `log-desk-${runId}`,
    displayName: "TEST Front Desk",
  });
  try {
    await signIn(page, desk);
    await page.goto("/admin/audit?category=settings");
    await expect(page.getByTestId("activity-log")).toBeVisible();
    await expect(chip(page, "activity-categories", "Appointments")).toBeVisible();
    await expect(chip(page, "activity-categories", "Settings")).toHaveCount(0);
    await expect(chip(page, "activity-categories", "Everything")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("audit-table")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Technical record" })).toHaveCount(0);
  } finally {
    const audits = await db.from("audit_log").delete().eq("actor_email", desk.email);
    expect(audits.error).toBeNull();
    await desk.dispose();
  }
});

test("a log that cannot be read says so and reads again on Try again", async ({ page }) => {
  const db = serviceDb();
  const desk = await createStaffFixture(db, {
    prefix: `log-err-${runId}`,
    displayName: "TEST Front Desk",
  });
  try {
    await signIn(page, desk);
    await page.goto("/admin/audit");
    await expect(page.getByTestId("activity-log")).toBeVisible();
    const refuse = async (route: Parameters<Parameters<Page["route"]>[1]>[0]) => {
      if (route.request().method() === "POST") await route.abort();
      else await route.continue();
    };
    await page.route("**/admin/audit**", refuse);
    await chip(page, "activity-categories", "Appointments").click();
    const error = page.getByTestId("activity-error");
    await expect(error).toBeVisible();
    await expect(error).toContainText("The log could not be loaded");
    await page.unroute("**/admin/audit**", refuse);
    await error.getByRole("button", { name: "Try again" }).click();
    await expect(error).toHaveCount(0);
    await expect(page.getByTestId("activity-feed")).not.toHaveAttribute("aria-busy", "true");
  } finally {
    const audits = await db.from("audit_log").delete().eq("actor_email", desk.email);
    expect(audits.error).toBeNull();
    await desk.dispose();
  }
});

interface ZipEntry {
  readonly name: string;
  readonly crc: number;
  readonly size: number;
  readonly data: Buffer;
}

/** The entries of a stored (method 0) zip, read through its central directory. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- a Buffer's type cannot be made readonly
function readStoredZip(archive: Buffer): ZipEntry[] {
  const end = archive.length - 22;
  expect(archive.readUInt32LE(end)).toBe(0x06_05_4b_50);
  const count = archive.readUInt16LE(end + 10);
  let at = archive.readUInt32LE(end + 16);
  const entries: ZipEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    expect(archive.readUInt32LE(at)).toBe(0x02_01_4b_50);
    const method = archive.readUInt16LE(at + 10);
    const crc = archive.readUInt32LE(at + 16);
    const size = archive.readUInt32LE(at + 20);
    expect(archive.readUInt32LE(at + 24)).toBe(size);
    const nameLength = archive.readUInt16LE(at + 28);
    const local = archive.readUInt32LE(at + 42);
    const name = archive.toString("ascii", at + 46, at + 46 + nameLength);
    expect(method, `${name} is stored`).toBe(0);
    expect(archive.readUInt32LE(local), `${name} local header`).toBe(0x04_03_4b_50);
    expect(archive.readUInt32LE(local + 14), `${name} local CRC`).toBe(crc);
    const start = local + 30 + archive.readUInt16LE(local + 26) + archive.readUInt16LE(local + 28);
    entries.push({ name, crc, size, data: archive.subarray(start, start + size) });
    at += 46 + nameLength;
  }
  return entries;
}

function flyerFile(name: string) {
  return readFileSync(join(process.cwd(), "private", "review-flyers", name));
}

test("a flyer downloads as its PDF and as one .zip of all three files", async ({ page }) => {
  test.setTimeout(120_000);
  const db = serviceDb();
  const desk = await createStaffFixture(db, {
    prefix: `log-flyer-${runId}`,
    displayName: "TEST Front Desk",
  });
  try {
    await signIn(page, desk);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/admin/review-flyers");
    const trigger = page.getByTestId("review-flyer-download-awad");

    await trigger.click();
    const pdfDownload = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "PDF: For printing at a print shop" }).click();
    const pdf = await pdfDownload;
    expect(pdf.suggestedFilename()).toBe("Dr-Awad-Review-Flyer.pdf");
    const pdfPath = await pdf.path();
    expect(readFileSync(pdfPath).equals(flyerFile("Dr-Awad-Review-Flyer.pdf"))).toBe(true);
    await expect(page.getByTestId("review-flyer-output-feedback")).toHaveText(
      "Flyer PDF download started for Dr. Amir Awad.",
    );

    await trigger.click();
    const zipDownload = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "All three, as one .zip" }).click();
    const zip = await zipDownload;
    expect(zip.suggestedFilename()).toBe("Dr-Awad-Review.zip");
    // A second file chosen right after the first still downloads.
    await expect(page.getByTestId("review-flyer-output-feedback")).toHaveText(
      "The .zip of all three files started downloading for Dr. Amir Awad.",
    );
    const entries = readStoredZip(readFileSync(await zip.path()));
    expect(entries.map((entry) => entry.name)).toEqual([
      "Dr-Awad-Review-Flyer.pdf",
      "Dr-Awad-Review-QR.svg",
      "Dr-Awad-Review-QR.png",
    ]);
    for (const entry of entries) {
      const file = flyerFile(entry.name);
      expect(entry.size, `${entry.name} size`).toBe(file.byteLength);
      expect(entry.crc, `${entry.name} CRC`).toBe(crc32(file));
      expect(crc32(entry.data), `${entry.name} data CRC`).toBe(entry.crc);
      expect(entry.data.equals(file), `${entry.name} bytes`).toBe(true);
    }
    await pdf.delete();
    await zip.delete();
  } finally {
    const audits = await db.from("audit_log").delete().eq("actor_email", desk.email);
    expect(audits.error).toBeNull();
    await desk.dispose();
  }
});
