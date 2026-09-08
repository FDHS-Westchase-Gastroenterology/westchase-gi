import { expect, test } from "@playwright/test";

import { signIn } from "../harness/session";

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("VAL-ADMIN-012: help answers retain the complete plain-language guide", async ({ page }) => {
  await page.goto("/admin/help");
  await expect(page.getByRole("heading", { name: "Help", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Show the portal tour again" })).toBeVisible();

  for (const trigger of await page.locator('[data-slot="accordion-trigger"]').all()) {
    if ((await trigger.getAttribute("aria-expanded")) === "false") await trigger.click();
  }
  const words = (await page.locator("main").innerText()).trim().split(/\s+/);
  expect(words.length).toBeGreaterThanOrEqual(400);
  for (const heading of [
    "Work an appointment request",
    "Notification emails",
    "Staff access",
    "Getting website changes made",
  ]) {
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
});

test("Help allows keyboard disclosure without closing the answer already being read", async ({
  page,
}) => {
  await page.goto("/admin/help");
  const workflow = page.getByRole("button", { name: "Work an appointment request", exact: true });
  const queue = page.getByRole("button", {
    name: "What the appointment request queue is",
    exact: true,
  });
  await expect(workflow).toHaveAttribute("aria-expanded", "true");
  await queue.focus();
  await page.keyboard.press("Enter");
  await expect(queue).toHaveAttribute("aria-expanded", "true");
  await expect(workflow).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Space");
  await expect(queue).toHaveAttribute("aria-expanded", "false");
  await expect(queue).toBeFocused();
});

test("Existing help links reveal their answers on arrival and during same-page navigation", async ({
  page,
}) => {
  await page.goto("/admin/help#website-changes");
  const website = page.getByRole("button", { name: "Getting website changes made", exact: true });
  await expect(website).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#website-changes")).toContainText("website maintainer");
  await page.evaluate(() => {
    window.location.hash = "something-wrong";
  });
  await expect(
    page.getByRole("button", { name: "If something looks wrong", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
});
