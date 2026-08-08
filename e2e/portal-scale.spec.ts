import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { loadLocalEnv, requiredEnv, serviceDb } from "./support";

loadLocalEnv();

const supabaseUrl = new URL(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"));
const isolatedTestDatabase =
  process.env.SUPABASE_PREVIEW_BRANCH === "1" ||
  ["127.0.0.1", "localhost", "[::1]"].includes(supabaseUrl.hostname) &&
  requiredEnv("SUPABASE_PROJECT_REF") === "local";
const SEED_EMAIL = requiredEnv("PORTAL_SEED_ADMIN_EMAIL");
const SEED_PASSWORD = requiredEnv("PORTAL_SEED_ADMIN_PASSWORD");
const runId = randomUUID().slice(0, 8);
const searchToken = `scale-${runId}`;
const sourcePath = `/e2e/scale/${runId}`;
const actorEmail = `${searchToken}@example.test`;
const punctuationName = `Literal %_* , . ( ) "quoted" \\ ${searchToken}`;
let requestIds: string[] = [];

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(SEED_EMAIL);
  await page.getByLabel("Password").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
}

test.describe("isolated portal scale boundaries", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(
    !isolatedTestDatabase,
    "bulk boundary coverage requires local Supabase or a Preview Branch",
  );
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "portal scale coverage requires JavaScript",
    );
  });

  const db = serviceDb();

  test.beforeAll(async () => {
    const requests = Array.from({ length: 1001 }, (_, index) => ({
      id: randomUUID(),
      name:
        index === 0 ? punctuationName : `TEST Scale ${searchToken} ${index}`,
      phone: `813555${index.toString().padStart(4, "0")}`,
      email: `${searchToken}-${index}@example.test`,
      location: "tampa",
      preferred_time: "morning",
      message: null,
      locale: "en",
      source_path: sourcePath,
      status: "contacted",
      created_at: new Date(Date.UTC(2040, 0, 1) + index * 1000).toISOString(),
    }));
    requestIds = requests.map((request) => request.id);

    for (let from = 0; from < requests.length; from += 250) {
      const { error } = await db
        .from("requests")
        .insert(requests.slice(from, from + 250));
      expect(error).toBeNull();
    }

    const { error: auditError } = await db.from("audit_log").insert(
      Array.from({ length: 101 }, (_, index) => ({
        actor_email: actorEmail,
        action: "test.scale",
        entity: "requests",
        detail: {},
        at: new Date(Date.UTC(2041, 0, 1) + index * 1000).toISOString(),
      })),
    );
    expect(auditError).toBeNull();
  });

  test.afterAll(async () => {
    const [requestCleanup, auditCleanup] = await Promise.all([
      db.from("requests").delete().eq("source_path", sourcePath),
      db.from("audit_log").delete().eq("actor_email", actorEmail),
    ]);
    expect(requestCleanup.error).toBeNull();
    expect(auditCleanup.error).toBeNull();
  });

  test("paginates and literally searches request identity fields", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto(
      `/admin/requests?status=contacted&q=${encodeURIComponent(searchToken)}`,
    );

    await expect(page.getByTestId("request-row")).toHaveCount(50);
    await expect(page.getByTestId("request-page-summary")).toHaveText(
      "Showing 1–50 of 1001",
    );
    const next = page.getByRole("link", { name: "Next" });
    const nextUrl = new URL(
      (await next.getAttribute("href")) ?? "",
      "http://localhost:3100",
    );
    expect(nextUrl.searchParams.get("status")).toBe("contacted");
    expect(nextUrl.searchParams.get("q")).toBe(searchToken);
    expect(nextUrl.searchParams.get("page")).toBe("2");

    await next.click();
    await expect(page.getByTestId("request-page-summary")).toHaveText(
      "Showing 51–100 of 1001",
    );

    await page.goto(
      `/admin/requests?status=contacted&q=${encodeURIComponent(punctuationName)}`,
    );
    await expect(page.getByTestId("request-row")).toHaveCount(1);
    await expect(page.getByTestId("request-name")).toHaveText(punctuationName);

    await page.goto("/admin/requests?status=contacted&q=8135550137");
    await expect(page.getByTestId("request-row")).toHaveCount(1);
    await expect(page.getByTestId("request-name")).toHaveText(
      `TEST Scale ${searchToken} 137`,
    );

    await page.goto(
      `/admin/requests?status=contacted&q=${encodeURIComponent(
        `${searchToken}-338@example.test`,
      )}`,
    );
    await expect(page.getByTestId("request-row")).toHaveCount(1);
    await expect(page.getByTestId("request-name")).toHaveText(
      `TEST Scale ${searchToken} 338`,
    );

    await page.goto(
      `/admin/requests?status=contacted&q=${encodeURIComponent("%_*")}`,
    );
    await expect(page.getByTestId("request-row")).toHaveCount(1);
    await expect(page.getByTestId("request-name")).toHaveText(punctuationName);
  });

  test("exports every request beyond the Data API row ceiling", async ({
    page,
  }) => {
    await signIn(page);
    const response = await page.request.get(
      `/admin/requests/export?status=contacted&q=${encodeURIComponent(searchToken)}`,
    );
    expect(response.status()).toBe(200);

    const lines = (await response.text()).trimEnd().split("\r\n");
    expect(lines).toHaveLength(requestIds.length + 1);
    const exportedIds = lines
      .slice(1)
      .map((line) => line.slice(0, line.indexOf(",")));
    expect([...exportedIds].sort()).toEqual([...requestIds].sort());
    expect(exportedIds[0]).toBe(requestIds.at(-1));
    expect(exportedIds.at(-1)).toBe(requestIds[0]);
  });

  test("paginates Activity beyond the first 100 rows", async ({ page }) => {
    await signIn(page);
    await page.goto("/admin/audit");
    await expect(
      page.getByTestId("audit-table").getByRole("row").filter({
        hasText: actorEmail,
      }),
    ).toHaveCount(100);

    await page.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/\/admin\/audit\?page=2$/);
    await expect(
      page.getByTestId("audit-table").getByRole("row").filter({
        hasText: actorEmail,
      }),
    ).toHaveCount(1);
  });
});
