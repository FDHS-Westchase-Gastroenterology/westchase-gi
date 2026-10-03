import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { z } from "zod";

import { insertRequest } from "../boundaries/support";
import { runId, serviceDb } from "../harness/env";
import { savePatient } from "../harness/patients";
import { createSchedulingFixture } from "../harness/scheduling";
import { signIn } from "../harness/session";

/* Issue #356: the Schedule's search and the records it opens. `/` focuses
   the search; a name or a phone finds patients and the people known only
   by a request; Return opens the record, which lives in the address; a
   request-only person books from their record and becomes a patient; a
   patient books another visit; a search that finds nobody starts a
   request with what was typed. The shared Preview database has other
   people, so every search is scoped to this run's names and number. */

/** A word only this run's people have: the run id with its digits spelled as letters. */
const tag = runId.replaceAll(/\d/gu, (digit) => "ghijklmnop"[Number(digit)]);
const Tag = `${tag.charAt(0).toUpperCase()}${tag.slice(1)}`;
/** A phone number only this run's people have. */
const line = String(Number.parseInt(runId, 16) % 10_000_000).padStart(7, "0");
const PRACTICE_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });

async function search(page: Page, query: string): Promise<Locator> {
  const field = page.getByRole("combobox", { name: "Search patients" });
  /* `/` is the Schedule's shortcut once the page has hydrated. */
  await expect(async () => {
    await page.keyboard.press("Escape");
    await page.locator("body").press("/");
    await expect(field).toBeFocused({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  await field.fill(query);
  /* The rows answer an earlier term until this one's search returns. */
  await expect(page.getByRole("status").filter({ hasText: "Searching…" })).toHaveCount(0);
  return page.getByRole("listbox", { name: "Patients" }).getByRole("option");
}

/** Hovers an open day of the card's month until its popover is up, then picks its first start. */
async function pickFirstStart(page: Page, card: Locator): Promise<void> {
  const day = card.getByRole("button", { name: /, \d+ open times?$/u }).first();
  await expect(day).toBeVisible({ timeout: 20_000 });
  const popover = page.locator(".wgi-day-popover");
  await expect(async () => {
    await page.mouse.move(0, 0);
    await day.hover();
    await expect(popover).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await popover.getByRole("group").first().getByRole("button").first().click();
}

test("search finds a patient by name or phone and opens their record from the keyboard, and the address reopens it", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, `people-${runId}`);
  const requestId = randomUUID();
  const name = `Tess ${Tag} Lindqvist`;
  const waiting = `Nadia ${Tag} Brooks`;
  try {
    const created = await savePatient(db, fixture.staff.userId, {
      kind: "create",
      patient: { name, phone: `(813) ${line.slice(0, 3)}-${line.slice(3)}` },
    });
    if (!created.ok) throw new Error("Patient fixture failed");
    fixture.patientIds.push(created.patientId);
    await insertRequest(db, { id: requestId, name: waiting, phone: "8135550100" });
    /* Booking refuses a time already past, so today's visit is booked
       ahead and moved to today. */
    const visit = fixture.booking("11:00");
    const booked = await fixture.save({
      ...visit,
      command: { ...visit.command, patientId: created.patientId },
    });
    if (!booked.ok) throw new Error("Today's booking failed");
    const today = PRACTICE_DAY.format(new Date());
    const noon = new Date(`${today}T12:00:00-04:00`);
    expect(
      (
        await db
          .from("appointments")
          .update({
            starts_at: noon.toISOString(),
            ends_at: new Date(noon.getTime() + 30 * 60_000).toISOString(),
            reserved_from: new Date(noon.getTime() - 5 * 60_000).toISOString(),
            reserved_until: new Date(noon.getTime() + 35 * 60_000).toISOString(),
          })
          .eq("id", booked.id)
      ).error,
    ).toBeNull();

    await signIn(page, fixture.staff);
    await page.goto(`/admin/schedule?view=day&date=${today}`);
    await expect(page.locator(`[data-appointment="${booked.id}"]`)).toBeVisible();

    /* A name's word starts, in any order; today's visit comes first. */
    const people = await search(page, `${tag} lind`);
    await expect(people).toHaveCount(1);
    await expect(people.first()).toContainText(name);
    await expect(people.first()).toContainText("Today, 12:00 PM with");
    const everyone = await search(page, tag);
    await expect(everyone).toHaveCount(2);
    await expect(everyone.nth(0)).toContainText(name);
    await expect(everyone.nth(1)).toContainText(waiting);
    await expect(everyone.nth(1)).toContainText("Request · Not called yet");

    /* A phone however it is typed. */
    for (const query of [line, `${line.slice(0, 3)}.${line.slice(3)}`, `+1 (813) ${line}`]) {
      const byPhone = await search(page, query);
      await expect(byPhone, query).toHaveCount(1);
      await expect(byPhone.first(), query).toContainText(name);
    }

    /* Return opens the highlighted person's record into the address, and
       their visit today wears its outline on the grid. */
    const again = await search(page, `${tag} lind`);
    await expect(again).toHaveCount(1);
    await expect(again.first()).toContainText(name);
    await page.keyboard.press("Enter");
    const sheet = page.getByRole("dialog", { name: name });
    await expect(sheet.getByRole("tab", { name: "Visits", selected: true })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`[?&]patient=${created.patientId}`, "u"));
    const outlined = page.locator(".wgi-dayview-block[data-record-open]");
    await expect(outlined.locator(`[data-appointment="${booked.id}"]`)).toBeVisible();

    await page.reload();
    await expect(sheet.getByRole("tab", { name: "Visits", selected: true })).toBeVisible();
    await expect(outlined.locator(`[data-appointment="${booked.id}"]`)).toBeVisible();

    /* Escape closes the record, takes it out of the address, and hands
       focus back to the search that found it. */
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(page).not.toHaveURL(/[?&]patient=/u);
    await expect(page.getByRole("combobox", { name: "Search patients" })).toBeFocused();
  } finally {
    expect(
      (await db.from("appointments").delete().eq("created_by", fixture.staff.userId)).error,
    ).toBeNull();
    expect((await db.from("requests").delete().eq("id", requestId)).error).toBeNull();
    await fixture.dispose();
  }
});

test("a person known only by a request books from their record and becomes a patient", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, `people-book-${runId}`);
  const requestId = randomUUID();
  const name = `Owen ${Tag} Abara`;
  try {
    expect(
      (
        await db
          .from("scheduling_locations")
          .update({ request_location: "tampa" })
          .eq("id", fixture.locationIds[0])
      ).error,
    ).toBeNull();
    /* A number too short for the patient record stays on the request. */
    expect(
      (
        await db.from("requests").insert({
          id: requestId,
          name,
          phone: "555-0123",
          email: `people-book-${runId}@example.test`,
          location: "tampa",
          preferred_time: "morning",
          locale: "en",
          source_path: `/e2e/schedule-people/${runId}`,
        })
      ).error,
    ).toBeNull();

    await signIn(page, fixture.staff);
    await page.goto("/admin/schedule?view=day");
    const found = await search(page, `${tag} owen`);
    await expect(found).toHaveCount(1);
    await expect(found.first()).toContainText(name);
    await expect(found.first()).toContainText("Request · Not called yet");
    await page.keyboard.press("Enter");
    const sheet = page.getByRole("dialog", { name: name });
    await expect(sheet.getByText(/^Not booked yet/u)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`[?&]request=${requestId}`, "u"));
    await expect(sheet.getByRole("tab")).toHaveCount(0);

    await sheet.getByRole("button", { name: "Book appointment" }).click();
    const card = page.locator(".wgi-sheet-card");
    await card.getByLabel("Visit type").selectOption(fixture.typeId);
    await pickFirstStart(page, card);
    await card.getByRole("button", { name: "Book", exact: true }).click();

    /* The record on screen becomes the new patient's. */
    await expect(sheet.getByRole("tab", { name: "Visits" })).toBeVisible();
    await expect(page).toHaveURL(/[?&]patient=/u);
    await expect(page).not.toHaveURL(/[?&]request=/u);

    const links = await db
      .from("patient_request_links")
      .select("patient_id")
      .eq("request_id", requestId);
    expect(links.error).toBeNull();
    const [{ patient_id: patientId }] = z
      .tuple([z.object({ patient_id: z.uuid() })])
      .parse(links.data);
    fixture.patientIds.push(patientId);
    expect(page.url()).toContain(`patient=${patientId}`);
    const patient = await db
      .from("patients")
      .select("name,phone,email")
      .eq("id", patientId)
      .single();
    expect(patient.data).toEqual({
      name,
      phone: null,
      email: `people-book-${runId}@example.test`,
    });
    const request = await db.from("requests").select("status").eq("id", requestId).single();
    expect(request.data).toEqual({ status: "booked" });
    const visits = await db
      .from("appointments")
      .select("source_request_id,location_id")
      .eq("patient_id", patientId);
    expect(visits.data).toEqual([
      { source_request_id: requestId, location_id: fixture.locationIds[0] },
    ]);
  } finally {
    expect(
      (await db.from("appointments").delete().eq("created_by", fixture.staff.userId)).error,
    ).toBeNull();
    await db.from("patient_request_links").delete().eq("request_id", requestId);
    expect((await db.from("requests").delete().eq("id", requestId)).error).toBeNull();
    await fixture.dispose();
  }
});

test("a patient's record books them another visit with no request behind it", async ({ page }) => {
  test.setTimeout(120_000);
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, `people-again-${runId}`);
  const name = `Ruth ${Tag} Reyes`;
  try {
    const created = await savePatient(db, fixture.staff.userId, {
      kind: "create",
      patient: { name, phone: "8135550142" },
    });
    if (!created.ok) throw new Error("Patient fixture failed");
    fixture.patientIds.push(created.patientId);
    const visit = fixture.booking("10:00");
    expect(
      await fixture.save({ ...visit, command: { ...visit.command, patientId: created.patientId } }),
    ).toMatchObject({ ok: true });

    await signIn(page, fixture.staff);
    await page.goto(`/admin/schedule?view=day&patient=${created.patientId}`);
    const sheet = page.getByRole("dialog", { name: name });
    await expect(sheet.locator(".wgi-visit")).toHaveCount(1);

    await sheet.getByRole("button", { name: "Book another" }).click();
    const card = page.locator(".wgi-sheet-card");
    await expect(card).toContainText("Another visit");
    await card.getByLabel("Visit type").selectOption(fixture.typeId);
    await pickFirstStart(page, card);
    await card.getByRole("button", { name: "Book", exact: true }).click();
    await expect(card).toHaveCount(0);
    await expect(sheet.locator(".wgi-visit")).toHaveCount(2);
    await expect(sheet.getByRole("button", { name: "Book another" })).toBeFocused();

    const visits = await db
      .from("appointments")
      .select("source_request_id,status")
      .eq("patient_id", created.patientId);
    expect(visits.data).toEqual([
      { source_request_id: null, status: "scheduled" },
      { source_request_id: null, status: "scheduled" },
    ]);
  } finally {
    expect(
      (await db.from("appointments").delete().eq("created_by", fixture.staff.userId)).error,
    ).toBeNull();
    await fixture.dispose();
  }
});

test("a search that finds nobody starts a request with the name, or the number, that was typed", async ({
  page,
}) => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, `people-new-${runId}`);
  try {
    await signIn(page, fixture.staff);
    await page.goto("/admin/schedule?view=day");
    await search(page, `zed ${tag}`);
    const start = page.getByRole("button", { name: `Start a request for Zed ${Tag}` });
    await expect(start).toBeVisible();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Add request" });
    await expect(dialog.getByLabel("Patient name")).toHaveValue(`Zed ${Tag}`);
    await expect(dialog.getByLabel("Phone")).toHaveValue("");
    // Escape is its way out; focus goes back to the search field.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("combobox", { name: "Search patients" })).toBeFocused();

    const number = `(941) ${line.slice(0, 3)}-${line.slice(3)}`;
    await search(page, number);
    await page.getByRole("button", { name: "Start a request with this number" }).click();
    await expect(dialog.getByLabel("Phone")).toHaveValue(number);
    await expect(dialog.getByLabel("Patient name")).toHaveValue("");
  } finally {
    await fixture.dispose();
  }
});

test("a signed-out visitor to a record's address reaches sign-in and no record", async ({
  page,
}) => {
  await page.goto(`/admin/schedule?view=day&patient=${randomUUID()}`);
  await expect(page).toHaveURL(/\/admin\/login/u);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Home's full record lives in the address: reload reopens it and Back closes it", async ({
  page,
}) => {
  const db = serviceDb();
  const fixture = await createSchedulingFixture(db, `people-home-${runId}`);
  const requestId = randomUUID();
  const name = `TEST Home address ${runId}`;
  try {
    await insertRequest(db, { id: requestId, name, phone: "8135550177" });
    await signIn(page, fixture.staff);
    await page.goto("/admin?status=any");
    await page.getByRole("button", { name: `Open request for ${name}`, exact: true }).click();
    await page
      .locator(".wgi-record-card")
      .getByRole("button", { name: "Open full record" })
      .click();
    const sheet = page.locator(".wgi-sheet");
    await expect(sheet).toContainText(name);
    await expect(page).toHaveURL(new RegExp(`[?&]request=${requestId}`, "u"));

    await page.reload();
    await expect(sheet).toContainText(name);
    await page.goBack();
    await expect(page).not.toHaveURL(/[?&]request=/u);
    await expect(sheet).toHaveCount(0);
    await page.goForward();
    await expect(sheet).toContainText(name);

    /* An address naming a request that is not on Home opens nothing and says so. */
    await page.goto(`/admin?status=any&request=${randomUUID()}`);
    await expect(page.getByText("That record couldn't be opened.")).toBeVisible();
    await expect(page).not.toHaveURL(/[?&]request=/u);
  } finally {
    expect((await db.from("requests").delete().eq("id", requestId)).error).toBeNull();
    await fixture.dispose();
  }
});
