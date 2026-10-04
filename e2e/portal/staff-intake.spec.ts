import { test, expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { signIn } from "../harness/session";

async function openNewRequest(page: Page) {
  await page.getByTestId("home-add-patient-request").click();
  await expect(page).toHaveURL(/\/admin\/?$/);
  await expect(page.getByTestId("add-appointment-dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Add request" })).toBeVisible();
}

/* The discard question replaces the footer in place: one modal on screen,
   never a second. */
async function expectAsking(page: Page, prompt: Locator) {
  await expect(prompt).toBeVisible();
  await expect(prompt).toHaveAccessibleName("Discard this request?");
  await expect(prompt).toHaveAccessibleDescription("What you entered won’t be kept.");
  await expect(page.getByTestId("submit-staff-request")).toHaveCount(0);
  await expect(page.getByTestId("keep-editing-staff-request")).toBeFocused();
}

test.describe("staff-authored intake data-entry protection", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "JS portal UI");
  });

  test("untouched Cancel from Home returns immediately", async ({ page }) => {
    await signIn(page);
    await openNewRequest(page);
    await page.getByTestId("cancel-staff-request").click();
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByTestId("add-appointment-dialog")).toBeHidden();
    await expect(page.getByTestId("discard-staff-request-prompt")).toHaveCount(0);
  });

  test("dirty Cancel asks in place, and Keep editing returns to the draft", async ({ page }) => {
    await signIn(page);
    await openNewRequest(page);

    const name = page.locator("#staff-request-name");
    await name.fill("UX Audit Draft");
    await page.getByTestId("cancel-staff-request").click();

    const prompt = page.getByTestId("discard-staff-request-prompt");
    await expectAsking(page, prompt);
    await expect(page.getByTestId("add-appointment-dialog")).toBeVisible();

    // Keep editing leads; Discard trails.
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("discard-staff-request")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(page.getByTestId("keep-editing-staff-request")).toBeFocused();

    await page.getByTestId("keep-editing-staff-request").click();
    await expect(prompt).toHaveCount(0);
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByTestId("add-appointment-dialog")).toBeVisible();
    await expect(page.getByTestId("cancel-staff-request")).toBeFocused();
    await expect(page.getByTestId("submit-staff-request")).toBeVisible();
    await expect(name).toHaveValue("UX Audit Draft");
  });

  test("dirty Home Escape and Cancel share discard protection and return focus", async ({
    page,
  }) => {
    await signIn(page);
    await openNewRequest(page);

    const name = page.locator("#staff-request-name");
    const addDialog = page.getByTestId("add-appointment-dialog");
    const prompt = page.getByTestId("discard-staff-request-prompt");
    const cancel = page.getByTestId("cancel-staff-request");
    await name.fill("UX Audit Draft");
    await name.focus();

    // Escape asks; Escape again keeps editing where the question was asked.
    await page.keyboard.press("Escape");
    await expectAsking(page, prompt);
    await page.keyboard.press("Escape");
    await expect(prompt).toHaveCount(0);
    await expect(addDialog).toBeVisible();
    await expect(name).toBeFocused();
    await expect(name).toHaveValue("UX Audit Draft");

    await cancel.click();
    await expectAsking(page, prompt);
    await page.keyboard.press("Escape");
    await expect(prompt).toHaveCount(0);
    await expect(cancel).toBeFocused();
    await expect(name).toHaveValue("UX Audit Draft");

    await cancel.click();
    await page.getByTestId("discard-staff-request").click();
    await expect(addDialog).toBeHidden();
    await expect(page.getByTestId("home-add-patient-request")).toBeFocused();
  });

  test("Discard from Home clears the draft and returns Home", async ({ page }) => {
    await signIn(page);
    await openNewRequest(page);
    await page.locator("#staff-request-name").fill("UX Audit Draft");
    await page.getByTestId("cancel-staff-request").click();

    await expectAsking(page, page.getByTestId("discard-staff-request-prompt"));
    await page.getByTestId("discard-staff-request").click();
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByTestId("add-appointment-dialog")).toBeHidden();

    await openNewRequest(page);
    await expect(page.locator("#staff-request-name")).toHaveValue("");
    await expect(page.locator("#staff-request-phone")).toHaveValue("");
    await expect(page.getByTestId("discard-staff-request-prompt")).toHaveCount(0);
  });
});
