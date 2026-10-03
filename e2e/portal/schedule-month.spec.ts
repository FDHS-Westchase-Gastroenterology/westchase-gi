import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { signIn } from "../harness/session";

/* Issue #360: the Schedule's month is the registry calendar, and Page Up
   and Page Down open the month before or after with the same day focused,
   or that month's last day when it is shorter. The check reads the
   focused cell, not only the address. */

function practiceToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function shiftMonth(month: string, by: number) {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index - 1 + by, 1)).toISOString().slice(0, 7);
}

function lastDay(month: string) {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index, 0)).getUTCDate();
}

function dateIn(month: string, day: number) {
  return `${month}-${String(Math.min(day, lastDay(month))).padStart(2, "0")}`;
}

/** The ISO date of the focused month cell, or null when focus is elsewhere. */
async function focusedDay(page: Page) {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !active.classList.contains("wgi-day")) return null;
    return /\d{4}-\d{2}-\d{2}$/u.exec(active.id)?.[0] ?? null;
  });
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);
});

test("Page Up and Page Down move the month and keep the day", async ({ page }) => {
  const month = practiceToday().slice(0, 7);
  const next = shiftMonth(month, 1);
  await page.goto(`/admin/schedule?month=${month}`);
  const grid = page.getByRole("grid");
  await expect(grid).toHaveAttribute("data-slot", "calendar");

  await grid.locator('.wgi-day[tabindex="0"]').focus();
  await page.keyboard.press("End");
  await expect.poll(async () => focusedDay(page)).toBe(dateIn(month, 31));

  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(new RegExp(`month=${next}$`, "u"));
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    new Date(`${next}-15T12:00:00Z`).toLocaleDateString("en-US", {
      month: "long",
      timeZone: "UTC",
    }),
  );
  const landed = dateIn(next, lastDay(month));
  await expect.poll(async () => focusedDay(page)).toBe(landed);

  await page.keyboard.press("PageUp");
  await expect(page).toHaveURL(new RegExp(`month=${month}$`, "u"));
  await expect.poll(async () => focusedDay(page)).toBe(dateIn(month, Number(landed.slice(8, 10))));

  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () => focusedDay(page))
    .not.toBe(dateIn(month, Number(landed.slice(8, 10))));

  /* The shortcuts list has no button in the month: ? opens it, and
     Escape gives focus back to the day it was asked from. */
  const asked = await focusedDay(page);
  await page.keyboard.press("?");
  const list = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(list).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(list).toHaveCount(0);
  await expect.poll(async () => focusedDay(page)).toBe(asked);
});

test("focus on a future day previews it, and a press opens its day", async ({ page }) => {
  const next = shiftMonth(practiceToday().slice(0, 7), 1);
  await page.goto(`/admin/schedule?month=${next}`);
  const grid = page.getByRole("grid");
  const future = grid.locator('.wgi-day[data-kind="future"]');
  const first = (await future.first().getAttribute("data-day")) ?? "";
  expect(first).not.toBe("");

  await grid.locator('.wgi-day[tabindex="0"]').focus();
  await page.keyboard.press("Home");
  for (let step = 0; step < 31 && (await focusedDay(page)) !== first; step += 1)
    await page.keyboard.press("ArrowRight");
  await expect.poll(async () => focusedDay(page)).toBe(first);
  await expect(page.getByRole("link", { name: /^Open day/u })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("link", { name: /^Open day/u })).toBeHidden();

  await future.first().click();
  await expect(page).toHaveURL(new RegExp(`view=day&date=${first}`, "u"));
});
