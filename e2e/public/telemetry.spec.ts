import { expect, test } from "@playwright/test";

test("the patient page emits telemetry but the staff sign-in page emits none", async ({ page }) => {
  const payloads: string[] = [];
  await page.route("**/api/telemetry", async (route) => {
    payloads.push(route.request().postData() ?? "");
    await route.fulfill({ status: 204 });
  });

  await page.goto("/en");
  await expect.poll(() => payloads.some((body) => body.includes('"page_view"'))).toBe(true);
  await page.waitForLoadState("networkidle");
  payloads.length = 0;

  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: "Staff sign in" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(payloads).toEqual([]);
});
