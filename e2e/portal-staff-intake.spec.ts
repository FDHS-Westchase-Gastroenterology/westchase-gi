import { test, expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { loadLocalEnv, requiredEnv } from "./support";

loadLocalEnv();

const SEED_EMAIL = requiredEnv("PORTAL_SEED_ADMIN_EMAIL");
const SEED_PASSWORD = requiredEnv("PORTAL_SEED_ADMIN_PASSWORD");

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(SEED_EMAIL);
  await page.getByLabel("Password").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 15_000 });
}

async function openNewRequest(page: Page, from: "home" | "appointments") {
  if (from === "home") {
    await page.getByTestId("home-add-patient-request").click();
    await expect(page).toHaveURL(/\/admin\/requests\/new$/);
  } else {
    await page.goto("/admin/requests");
    await page.getByTestId("appointments-add-patient-request").click();
    await expect(page).toHaveURL(/\/admin\/requests\/new\?from=appointments$/);
  }
  await expect(page.getByRole("heading", { name: "Add appointment request" })).toBeVisible();
}

async function expectDialogOpen(dialog: Locator) {
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("open", "");
}

async function expectFocusInsideDialog(page: Page, dialog: Locator) {
  const testId = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
  expect(["keep-editing-staff-request", "discard-staff-request"]).toContain(testId);
  const activeIsInside = await dialog.evaluate((root) => {
    const active = document.activeElement;
    return active instanceof Node && root.contains(active);
  });
  expect(activeIsInside).toBe(true);
}

test.describe("staff-authored intake data-entry protection", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "JS portal UI");
  });

  test("untouched Cancel from Home returns immediately", async ({ page }) => {
    await signIn(page);
    await openNewRequest(page, "home");
    await page.getByTestId("cancel-staff-request").click();
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByTestId("discard-staff-request-dialog")).toBeHidden();
  });

  test("untouched Cancel from Appointments returns immediately", async ({ page }) => {
    await signIn(page);
    await openNewRequest(page, "appointments");
    await page.getByTestId("cancel-staff-request").click();
    await expect(page).toHaveURL(/\/admin\/requests\/?$/);
    await expect(page.getByTestId("discard-staff-request-dialog")).toBeHidden();
  });

  test("dirty Cancel opens a named dialog that traps focus and restores it", async ({ page }) => {
    await signIn(page);
    await openNewRequest(page, "home");

    const name = page.locator("#staff-request-name");
    await name.fill("UX Audit Draft");
    await page.getByTestId("cancel-staff-request").click();

    const dialog = page.getByTestId("discard-staff-request-dialog");
    const keepEditing = page.getByTestId("keep-editing-staff-request");
    await expectDialogOpen(dialog);
    await expect(dialog.getByRole("heading", { level: 2 })).toHaveText(
      "Discard this appointment request?",
    );
    await expect(dialog).toContainText("The entered request has not been saved.");
    await expect(keepEditing).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByTestId("discard-staff-request")).toBeFocused();
    await expectFocusInsideDialog(page, dialog);

    await page.evaluate(() => {
      document.getElementById("staff-request-name")?.focus();
    });
    await expectFocusInsideDialog(page, dialog);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/admin\/requests\/new$/);
    await expect(page.getByTestId("cancel-staff-request")).toBeFocused();
    await expect(name).toHaveValue("UX Audit Draft");

    await page.getByTestId("cancel-staff-request").click();
    await expectDialogOpen(dialog);
    await expect(keepEditing).toBeFocused();
    await keepEditing.click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/admin\/requests\/new$/);
    await expect(page.getByTestId("cancel-staff-request")).toBeFocused();
    await expect(name).toHaveValue("UX Audit Draft");
  });

  test("Discard request from Home clears the draft and returns Home", async ({ page }) => {
    await signIn(page);
    await openNewRequest(page, "home");
    await page.locator("#staff-request-name").fill("UX Audit Draft");
    await page.getByTestId("cancel-staff-request").click();

    const dialog = page.getByTestId("discard-staff-request-dialog");
    await expectDialogOpen(dialog);
    await page.getByTestId("discard-staff-request").click();
    await expect(page).toHaveURL(/\/admin\/?$/);

    await openNewRequest(page, "home");
    await expect(page.locator("#staff-request-name")).toHaveValue("");
    await expect(page.locator("#staff-request-phone")).toHaveValue("");
    await expect(page.getByTestId("discard-staff-request-dialog")).toBeHidden();
  });

  test("Discard request from Appointments returns to Appointments", async ({ page }) => {
    await signIn(page);
    await openNewRequest(page, "appointments");
    await page.locator("#staff-request-phone").fill("8135550199");
    await page.getByTestId("cancel-staff-request").click();

    const dialog = page.getByTestId("discard-staff-request-dialog");
    await expectDialogOpen(dialog);
    await expect(page.getByTestId("keep-editing-staff-request")).toBeFocused();
    await page.getByTestId("discard-staff-request").click();
    await expect(page).toHaveURL(/\/admin\/requests\/?$/);

    await page.getByTestId("appointments-add-patient-request").click();
    await expect(page).toHaveURL(/\/admin\/requests\/new\?from=appointments$/);
    await expect(page.locator("#staff-request-phone")).toHaveValue("");
  });
});
