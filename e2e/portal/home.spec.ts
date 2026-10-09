import { randomUUID } from "node:crypto";

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { z } from "zod";

import { intakeResponseSchema } from "../../src/lib/portal/contracts";
import { greetingName } from "../../src/lib/portal/staff-language";
import { clientIps, runId, seedAdmin, serviceDb } from "../harness/env";
import { signIn } from "../harness/session";

// The portal home page: staff land on a greeting and their tasks, not on
// Software. The queue overview count is real data, paper handoff is one
// Truthful action away, and occasional tools stay out of the primary path.

const { email: SEED_EMAIL } = seedAdmin();
const db = serviceDb();

const testIp = clientIps("home");

interface ThumbFrame {
  readonly transform: string;
  readonly height: number;
}

/* One string per distinct thumb, so a set of frames dedupes by value. */
const frameKey = (frame: ThumbFrame) => `${frame.transform} @ ${frame.height}`;

/**
 * Samples the rail's thumb once per frame for `ms` on the page's own frame
 * clock: the inline transform Base UI wrote and the measured height, keyed
 * by value. Runs alongside the input that follows it, so the set holds
 * exactly one member when the thumb never moved and more when it did.
 */
async function watchThumb(page: Page, ms: number): Promise<Set<string>> {
  const frames = await page.evaluate(async (duration) => {
    const thumb = document.querySelector<HTMLElement>(".wgi-list-thumb");
    const seen: string[] = [];
    const started = performance.now();
    await new Promise<void>((resolve) => {
      const tick = () => {
        seen.push(
          `${thumb?.style.transform ?? ""} @ ${thumb?.getBoundingClientRect().height ?? 0}`,
        );
        if (performance.now() - started < duration) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    return seen;
  }, ms);
  return new Set(frames);
}

test.describe("portal home", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "JS portal UI");
  });

  test.afterAll(async () => {
    await db.from("requests").delete().like("email", `home-${runId}-%`);
  });

  test("admin lands on a greeting, live queue status, and the full task list", async ({ page }) => {
    // Stage one request so the new-count branch is exercised.
    const staged = await page.request.post("/api/requests", {
      data: {
        name: `TEST Home ${runId}`,
        phone: "8135550199",
        email: `home-${runId}-patient@example.test`,
        location: "any",
        time: "any",
        locale: "en",
        sourcePath: "/en/appointment",
      },
      headers: { "X-Forwarded-For": testIp("staged") },
    });
    expect(staged.status()).toBe(201);

    await signIn(page);

    // Greeting: practice-local time of day plus a human name when one exists.
    const { data: profile } = await db
      .from("staff_profiles")
      .select("display_name")
      .eq("email", SEED_EMAIL.toLowerCase())
      .single();
    const displayName = String(profile?.display_name ?? "");
    const name = greetingName(displayName);
    const greeting = page.getByTestId("home-greeting");
    await expect(greeting).toBeVisible();
    await expect(greeting).not.toContainText("Portal");
    // The headline is the practice-local date; the greeting is its small print.
    const salutation = name === null ? "" : `, ${name}`;
    await expect(greeting).toHaveText(
      new RegExp(
        `^Good (morning|afternoon|evening)${salutation}\\. [A-Z][a-z]+day, [A-Z][a-z]+ \\d{1,2}$`,
      ),
    );

    // Notification configuration belongs in Settings, even when emails are paused.
    await expect(page.getByTestId("no-recipients-warning")).toHaveCount(0);
    // The staged request is a line on the day sheet, marked New.
    const stagedLine = page
      .getByTestId("home-line-list")
      .locator("tr", { hasText: `TEST Home ${runId}` });
    await expect(stagedLine).toHaveCount(1);
    await expect(stagedLine.locator("[data-col='status']")).toHaveText("New");

    // The desktop rail gives the work pages the same row; Settings and
    // Help sit in the account footer. Home carries the current-page marker.
    const nav = page.locator('nav[aria-label="Portal sections"]:visible');
    await expect(nav.locator("a")).toHaveText(
      [/^Home$/, /^Schedule$/, /^Activity log$/, /^Review flyers$/],
      { useInnerText: true },
    );
    await expect(nav.locator('a[aria-current="page"]')).toHaveText("Home");

    // Print opens the Print sheet: the requests Home shows, every one
    // Chosen, each chosen request one page, printed by id in a new tab.
    await page.getByTestId("home-print-requests").click();
    const printSheet = page.getByTestId("print-requests-sheet");
    await expect(printSheet).toBeVisible();
    await expect(printSheet.getByRole("heading", { name: "Print requests" })).toBeVisible();
    const printRows = page.getByTestId("print-table").locator("tbody tr");
    await expect(printRows.first()).toBeVisible();
    const printSubmit = page.getByTestId("print-requests-submit");
    await expect(printSubmit).toHaveAttribute(
      "href",
      /^\/admin\/requests\/print\?ids=[^&]+&auto=1$/,
    );
    await expect(printSubmit).toHaveAttribute("target", "_blank");
    await expect(page.getByTestId("print-summary")).toContainText("oldest first");

    // The rows walk by arrows with one tab stop (ui/table-roving): focus
    // Opens on the first row's box, follows the highlight, and Space on
    // The focused box leaves its request out and puts it back.
    const boxes = printRows.getByRole("checkbox");
    await expect(boxes.first()).toBeFocused();
    if ((await printRows.count()) > 1) {
      await page.keyboard.press("ArrowDown");
      await expect(boxes.nth(1)).toBeFocused();
      await expect(printRows.nth(1)).toHaveAttribute("data-highlighted");
      await expect(boxes.nth(0)).toHaveAttribute("tabindex", "-1");
      await page.keyboard.press("Space");
      await expect(boxes.nth(1)).not.toBeChecked();
      await page.keyboard.press("Space");
      await expect(boxes.nth(1)).toBeChecked();
      await page.keyboard.press("ArrowUp");
      await expect(boxes.first()).toBeFocused();
    }

    // Leaving everything out leaves nothing to print.
    await page.getByTestId("print-select-all").click();
    await expect(page.getByTestId("print-summary")).toHaveText(/^None of \d+ requests? chosen$/);
    await expect(printSubmit).toBeDisabled();
    await page.getByTestId("print-select-all").click();
    await expect(printSubmit).toHaveAttribute("href", /ids=/);

    await page.keyboard.press("Escape");
    await expect(printSheet).toBeHidden();
    await expect(page.getByTestId("home-print-requests")).toBeFocused();
  });

  test("the day sheet lists the newest New requests as lines", async ({ page }) => {
    await signIn(page);

    const { data: newestNew, error: newestError } = await db
      .from("requests")
      .select("id, name")
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(5);
    expect(newestError).toBeNull();
    const rows = z.array(z.object({ id: z.string(), name: z.string() })).parse(newestNew ?? []);
    expect(rows.length).toBeGreaterThan(0);

    const list = page.getByTestId("home-line-list");
    for (const row of rows) {
      await expect(list.locator("tr", { hasText: row.name })).toHaveCount(1);
    }
    await expect(page.getByTestId("home-add-patient-request")).toHaveText("Add request…");
  });

  test("a Contacted request with no call-again day is on the day sheet under Call again", async ({
    page,
  }) => {
    const id = randomUUID();
    const name = `TEST Home ${runId} missing call-again`;
    const { error: stageError } = await db.from("requests").insert({
      id,
      name,
      phone: "8135550199",
      email: `home-${runId}-missing-call-again@example.test`,
      location: "any",
      preferred_time: "any",
      message: "TEST queue-integrity fixture — no medical details.",
      locale: "en",
      source_path: "/e2e/home-missing-call-again",
      status: "contacted",
      follow_up_at: null,
    });
    expect(stageError).toBeNull();

    try {
      await signIn(page);
      const line = page.getByTestId("home-line-list").locator("tr", { hasText: name });
      await expect(line).toHaveCount(1);
      await expect(line.locator("[data-col='status']")).toHaveText("Call again");
    } finally {
      await db.from("requests").delete().eq("id", id);
      await db.from("audit_log").delete().eq("entity_id", id);
    }
  });

  test("home flags recent notification delivery failures honestly", async ({ page }) => {
    const staged = await page.request.post("/api/requests", {
      data: {
        name: `TEST Home ${runId} delivery`,
        phone: "8135550199",
        email: `home-${runId}-delivery@example.test`,
        location: "any",
        time: "any",
        locale: "en",
        sourcePath: "/en/appointment",
      },
      headers: { "X-Forwarded-For": testIp("delivery") },
    });
    expect(staged.status()).toBe(201);
    const stagedBody = intakeResponseSchema.parse(await staged.json());
    if (!stagedBody.ok) throw new Error("Expected an accepted intake response");
    const { id } = stagedBody;
    // Delivery truth now lives in the transactional outbox (DEC-22/DEC-24):
    // Home reports failed, retrying, or exhausted outbox work from the last
    // 24 hours, never the legacy request_events notification rows.
    const { data: anyRecipient, error: recipientError } = await db
      .from("notification_recipients")
      .select("id")
      .limit(1)
      .single();
    expect(recipientError).toBeNull();
    const { error: outboxError } = await db.from("notification_outbox").insert({
      request_id: id,
      kind: "new_request",
      recipient_id: anyRecipient!.id,
      status: "failed",
      normalized_outcome: "transport_failure",
    });
    expect(outboxError).toBeNull();

    async function recentTrouble(): Promise<number> {
      const { count, error } = await db
        .from("notification_outbox")
        .select("id", { count: "exact", head: true })
        .in("status", ["failed", "retry_pending", "exhausted"])
        .gte("updated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      expect(error).toBeNull();
      return count ?? 0;
    }

    await signIn(page);

    const expectedCount = await recentTrouble();
    expect(expectedCount).toBeGreaterThanOrEqual(1);
    const warning = page.getByTestId("delivery-failure-warning");
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(
      expectedCount === 1
        ? "A notification email had trouble sending in the last 24 hours."
        : `${expectedCount} notification emails had trouble sending in the last 24 hours.`,
    );

    // Removing the staged failure restores the honest quiet state: the
    // Warning shows only while real recent outbox trouble exists.
    await db.from("notification_outbox").delete().eq("request_id", id).eq("status", "failed");
    const remaining = await recentTrouble();
    await page.reload();
    await expect(page.getByTestId("delivery-failure-warning")).toHaveCount(remaining > 0 ? 1 : 0);

    await db.from("requests").delete().eq("id", id);
  });

  /* The rail's thumb is a pure function of the scroll position (issue
     #302): Base UI measures and moves it on every scroll event, nothing in
     script gives it a body, a spring, or a clock, and the browser owns
     overscroll. A push past either end leaves it exactly where the rows
     stopped, a wheel over the rail never reaches the page, keys and a
     committed filter move it with the rows, reduced motion and forced
     colors change its paint and never its geometry, and a day sheet that
     fits has no rail at all. */
  test("the day sheet thumb is the scroll position", async ({ page }) => {
    /* Enough lines to overflow the 1440×900 day sheet whatever the branch
       holds, and still overflow once a filter narrows it to Either office. */
    for (let i = 0; i < 20; i += 1) {
      const staged = await page.request.post("/api/requests", {
        data: {
          name: `TEST Home ${runId} thumb ${i}`,
          phone: "8135550199",
          email: `home-${runId}-thumb-${i}@example.test`,
          location: "any",
          time: "any",
          locale: "en",
          sourcePath: "/en/appointment",
        },
        headers: { "X-Forwarded-For": testIp(`thumb-${i}`) },
      });
      expect(staged.status()).toBe(201);
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    await expect(page.getByTestId("home-line-list")).toBeVisible();
    const viewport = page.getByRole("region", { name: "Appointment requests" });
    const rail = page.locator(".wgi-list-rail");
    const range = async () =>
      viewport.evaluate((element) => ({
        top: element.scrollTop,
        max: element.scrollHeight - element.clientHeight,
      }));

    /* Everything the thumb is: what Base UI wrote on it and what the boxes
       measure, beside the position and size the scroll offset calls for. */
    const measure = async () =>
      page.evaluate(() => {
        const rows = document.querySelector<HTMLElement>(".wgi-list-viewport");
        const track = document.querySelector<HTMLElement>(".wgi-list-rail");
        const knob = document.querySelector<HTMLElement>(".wgi-list-thumb");
        if (rows === null || track === null || knob === null) {
          throw new Error("The day sheet has no rail");
        }
        const written = /^translate3d\(0px, (-?[\d.]+)px, 0px\)$/.exec(knob.style.transform);
        const railHeight = Math.min(track.offsetHeight, rows.clientHeight);
        const expectedHeight = Math.max(16, (railHeight * rows.clientHeight) / rows.scrollHeight);
        const max = rows.scrollHeight - rows.clientHeight;
        return {
          top: rows.scrollTop,
          max,
          transform: knob.style.transform,
          y: written === null ? Number.NaN : Number(written[1]),
          expectedY: max === 0 ? 0 : (rows.scrollTop / max) * (railHeight - expectedHeight),
          height: knob.getBoundingClientRect().height,
          expectedHeight,
          width: knob.offsetWidth,
          railWidth: track.clientWidth,
          children: knob.children.length,
          background: getComputedStyle(knob).backgroundColor,
        };
      });
    const settledAt = async (fraction: number) => {
      await viewport.evaluate((element, share) => {
        element.scrollTop = Math.round((element.scrollHeight - element.clientHeight) * share);
      }, fraction);
      await expect
        .poll(async () => {
          const now = await measure();
          return {
            at: Math.abs(now.top - now.max * fraction) <= 1,
            y: Math.abs(now.y - now.expectedY) < 1,
            height: Math.abs(now.height - now.expectedHeight) < 1,
          };
        })
        .toEqual({ at: true, y: true, height: true });
      return measure();
    };
    /* The geometry Base UI owns. The thumb's width is the rail's content
       width (asserted where it matters), which forced colors narrow by the
       rail's own high-contrast border. */
    const placement = (state: Readonly<{ transform: string; height: number }>) => ({
      transform: state.transform,
      height: state.height,
    });

    expect((await range()).max).toBeGreaterThan(0);
    await expect(rail).toHaveCount(1);

    // Pure function: every scroll offset has exactly one thumb.
    for (const fraction of [0, 1 / 3, 1 / 2, 1]) {
      const at = await settledAt(fraction);
      expect(at.children).toBe(0);
      expect(at.width).toBe(at.railWidth);
      expect(Number.isNaN(at.y)).toBe(false);
    }

    // Past the end: the rows stop at the end, and the thumb stops with them
    // In every frame, no second body, no other transform, no widening.
    const rows = await viewport.boundingBox();
    if (rows === null) throw new Error("The day sheet has no box");
    await page.mouse.move(rows.x + rows.width / 2, rows.y + rows.height / 2);
    const atEnd = await settledAt(1);
    const pastEnd = watchThumb(page, 700);
    for (let i = 0; i < 6; i += 1) {
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(16);
    }
    expect(await pastEnd).toEqual(new Set([frameKey(atEnd)]));
    await expect.poll(range).toEqual({ top: atEnd.max, max: atEnd.max });
    const afterEnd = await measure();
    expect(placement(afterEnd)).toEqual(placement(atEnd));
    expect(afterEnd.children).toBe(0);
    expect(afterEnd.width).toBe(afterEnd.railWidth);

    // A wheel over the rail at the end presses nothing and never reaches
    // The page.
    const railBox = await rail.boundingBox();
    if (railBox === null) throw new Error("The rail has no box");
    await page.mouse.move(railBox.x + railBox.width / 2, railBox.y + 12);
    const overRail = watchThumb(page, 700);
    for (let i = 0; i < 6; i += 1) {
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(16);
    }
    expect(await overRail).toEqual(new Set([frameKey(atEnd)]));
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(placement(await measure())).toEqual(placement(atEnd));

    // Past the start: the same stillness at the top.
    await page.mouse.move(rows.x + rows.width / 2, rows.y + rows.height / 2);
    const atStart = await settledAt(0);
    const pastStart = watchThumb(page, 700);
    for (let i = 0; i < 6; i += 1) {
      await page.mouse.wheel(0, -200);
      await page.waitForTimeout(16);
    }
    expect(await pastStart).toEqual(new Set([frameKey(atStart)]));
    await expect.poll(range).toEqual({ top: 0, max: atStart.max });
    expect(placement(await measure())).toEqual(placement(atStart));

    // Keys move the rows, and the thumb is wherever they stop.
    await viewport.focus();
    await page.keyboard.press("End");
    await expect
      .poll(async () => {
        const now = await measure();
        return { top: now.top === now.max, y: Math.abs(now.y - now.expectedY) < 1 };
      })
      .toEqual({ top: true, y: true });
    await page.keyboard.press("Home");
    await expect
      .poll(async () => {
        const now = await measure();
        return { top: now.top, y: now.y };
      })
      .toEqual({ top: 0, y: 0 });

    // A committed filter starts the new rows at the top, thumb included.
    await settledAt(1);
    await page.getByRole("button", { name: "Add filter" }).click();
    const editor = page.getByLabel("Add filter", { exact: true });
    await editor.getByRole("button", { name: "Location", exact: true }).click();
    await editor.getByRole("button", { name: "Either office: Only" }).click();
    await expect(page).toHaveURL(/[?&]location=any(?:&|$)/);
    await page.keyboard.press("Escape");
    await expect(rail).toHaveCount(1);
    await expect
      .poll(async () => {
        const now = await measure();
        return { top: now.top, y: now.y };
      })
      .toEqual({ top: 0, y: 0 });

    // Reduced motion and forced colors change the paint, never the geometry.
    const resting = await settledAt(1 / 2);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(100);
    expect(placement(await measure())).toEqual(placement(resting));
    await page.emulateMedia({ reducedMotion: "no-preference", forcedColors: "active" });
    // Chromium serializes system colors as rgb(), so read CanvasText off a probe.
    const canvasText = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.cssText = "background: CanvasText; forced-color-adjust: none";
      document.body.append(probe);
      const painted = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return painted;
    });
    expect(canvasText).not.toBe(resting.background);
    await expect
      .poll(async () => {
        const now = await measure();
        return {
          ...placement(now),
          fills: now.width === now.railWidth,
          background: now.background,
        };
      })
      .toEqual({ ...placement(resting), fills: true, background: canvasText });
    await page.emulateMedia({ forcedColors: "none" });

    // When the day sheet fits, the rail goes and the columns stay put.
    const firstHeader = page.getByTestId("home-line-list").locator("thead th").first();
    const columnBefore = await firstHeader.boundingBox();
    await page.setViewportSize({ width: 1440, height: 6000 });
    await expect
      .poll(async () => {
        const fits = (await range()).max <= 0;
        return { fits, rails: await rail.count() };
      })
      .toEqual({ fits: true, rails: 0 });
    const columnAfter = await firstHeader.boundingBox();
    expect(columnAfter?.x).toBe(columnBefore?.x);
  });
});
