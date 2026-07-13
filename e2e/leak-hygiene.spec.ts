import { test, expect } from "@playwright/test";

// VAL-INTAKE-012: map embeds send no referrer.
// VAL-INTAKE-013: legacy patient-bearing URLs are scrubbed before the
// document (and any third-party resource) loads with those values.

test("VAL-INTAKE-012: every map iframe carries no-referrer in the DOM", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "DOM check");

  for (const path of ["/en/contact", "/en/new-patients"]) {
    await page.goto(path);
    const iframes = page.locator("iframe");
    const count = await iframes.count();
    expect(count, `${path} should render map embeds`).toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      await expect(
        iframes.nth(i),
        `iframe ${i} on ${path}`,
      ).toHaveAttribute("referrerpolicy", "no-referrer");
    }
  }
});

test("VAL-INTAKE-013: patient-bearing legacy URLs redirect clean before third-party loads", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "network capture");

  const name = "Jane";
  const phone = "5551234567";
  const email = "j@x.com";
  const dirty = `/en/contact?name=${name}&phone=${phone}&email=${encodeURIComponent(email)}`;

  // Raw exchange first: the redirect must happen at the HTTP layer.
  const rawResponse = await page.request.get(dirty, {
    maxRedirects: 0,
  });
  expect([301, 302, 307, 308]).toContain(rawResponse.status());
  const location = rawResponse.headers().location;
  expect(location).toBeTruthy();
  for (const value of [phone, "Jane", "j%40x.com", "j@x.com"]) {
    expect(location).not.toContain(value);
  }

  // Then the browser flow: no third-party request in the whole exchange
  // may carry the patient values.
  const offSiteRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      offSiteRequests.push(request.url());
    }
  });

  await page.goto(dirty);
  await expect(page).toHaveURL("/en/contact");
  await page.waitForLoadState("load");

  for (const url of offSiteRequests) {
    for (const value of [phone, "Jane", "j%40x.com", "j@x.com"]) {
      expect(url, `third-party request leaked a value: ${url}`).not.toContain(
        value,
      );
    }
  }
});
