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

for (const preferenceTiming of ["before loading", "while Help is open"] as const) {
  test(`Reduced motion ${preferenceTiming} reveals a complete answer within the next rendered frames`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    if (preferenceTiming === "before loading") await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/admin/help");
    await expect(page.getByRole("heading", { name: "Help", exact: true })).toBeVisible();
    if (preferenceTiming === "while Help is open")
      await page.emulateMedia({ reducedMotion: "reduce" });
    const queue = page.getByRole("button", {
      name: "What the appointment request queue is",
      exact: true,
    });
    const measurement = await queue.evaluate(async (trigger) => {
      trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });
      const panel = trigger
        .closest('[data-slot="accordion-item"]')
        ?.querySelector('[data-slot="accordion-content"]');
      if (!panel?.firstElementChild) throw new Error("Expected the revealed answer");
      return {
        expanded: trigger.getAttribute("aria-expanded"),
        height: panel.getBoundingClientRect().height,
        contentHeight: panel.firstElementChild.getBoundingClientRect().height,
      };
    });
    expect(measurement.expanded).toBe("true");
    expect(Math.abs(measurement.height - measurement.contentHeight)).toBeLessThanOrEqual(1);
  });
}

test("Enabling reduced motion finishes a spring already in progress", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/admin/help");
  const queue = page.getByRole("button", {
    name: "What the appointment request queue is",
    exact: true,
  });
  await expect(queue).toBeVisible();
  const initialDistance = await queue.evaluate(async (trigger) => {
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
    const panel = trigger
      .closest('[data-slot="accordion-item"]')
      ?.querySelector('[data-slot="accordion-content"]');
    if (!panel?.firstElementChild) throw new Error("Expected the moving answer");
    return Math.abs(
      panel.getBoundingClientRect().height - panel.firstElementChild.getBoundingClientRect().height,
    );
  });
  expect(initialDistance).toBeGreaterThan(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const remainingDistance = await queue.evaluate(async (trigger) => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
    const panel = trigger
      .closest('[data-slot="accordion-item"]')
      ?.querySelector('[data-slot="accordion-content"]');
    if (!panel?.firstElementChild) throw new Error("Expected the revealed answer");
    return Math.abs(
      panel.getBoundingClientRect().height - panel.firstElementChild.getBoundingClientRect().height,
    );
  });
  expect(remainingDistance).toBeLessThanOrEqual(1);
});

test("Browser find reveals a closed answer and its height follows a narrower viewport", async ({
  page,
}) => {
  await page.goto("/admin/help");
  const item = page.locator("#website-changes");
  const panel = item.locator('[data-slot="accordion-content"]');
  await expect(panel).toHaveAttribute("hidden", "until-found");
  await expect(panel).not.toHaveAttribute("inert");
  await panel.dispatchEvent("beforematch");
  await expect(item.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () =>
      panel.evaluate((element) => {
        if (!element.firstElementChild) throw new Error("Expected answer content");
        return Math.abs(
          element.getBoundingClientRect().height -
            element.firstElementChild.getBoundingClientRect().height,
        );
      }),
    )
    .toBeLessThanOrEqual(1);
});

test("Help answer markup preserves disclosure state before hydration", async ({
  page,
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    storageState: await page.context().storageState(),
  });
  try {
    const initialPage = await context.newPage();
    await initialPage.goto(new URL("/admin/help", page.url()).href);
    const closedAnswer = initialPage.locator("#website-changes");
    await expect(closedAnswer.getByRole("button", { includeHidden: true })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(closedAnswer.locator('[data-slot="accordion-content"]')).toHaveAttribute(
      "hidden",
      "",
    );
    const openAnswer = initialPage.locator("#appointment-workflow-guide");
    await expect(openAnswer.getByRole("button", { includeHidden: true })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(openAnswer.locator('[data-slot="accordion-content"]')).not.toHaveAttribute(
      "hidden",
    );
  } finally {
    await context.close();
  }
});
