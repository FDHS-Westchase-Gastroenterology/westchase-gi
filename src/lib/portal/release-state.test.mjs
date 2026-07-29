import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import { pathToFileURL } from "node:url";

register(
  `data:text/javascript,${encodeURIComponent(`
    export async function resolve(specifier, context, nextResolve) {
      if (specifier === "server-only") {
        return {
          url: "data:text/javascript,export%20{}",
          shortCircuit: true,
        };
      }
      if (
        (specifier.startsWith("./") || specifier.startsWith("../")) &&
        !/\\.(?:[cm]?[jt]s|json|mjs|cjs|tsx|jsx)$/.test(specifier)
      ) {
        try {
          return await nextResolve(specifier + ".ts", context);
        } catch {
          // fall through
        }
      }
      return nextResolve(specifier, context);
    }
  `)}`,
  pathToFileURL("./"),
);

const {
  derivePortalReleaseState,
  isPortalReleaseAuditAction,
  parsePortalReleaseId,
  parseSupportedPortalReleaseId,
  PORTAL_RELEASE_WINDOW_MS,
} = await import("./release-state.ts");
const { parsePortalReleaseEngagementRows } = await import(
  "./release-engagement-model.ts"
);

const FIRST_OPENED_AT = "2026-07-29T13:00:00.000Z";
const ACKNOWLEDGED_AT = "2026-07-29T13:05:00.000Z";

function row(partial = {}) {
  return {
    first_opened_at: FIRST_OPENED_AT,
    acknowledged_at: null,
    hidden_at: null,
    ...partial,
  };
}

test("derives unseen, available, acknowledged, hidden, and expired states", () => {
  assert.deepEqual(
    derivePortalReleaseState(null, new Date(FIRST_OPENED_AT)),
    { status: "unseen" },
  );
  assert.deepEqual(
    derivePortalReleaseState(
      row(),
      new Date(Date.parse(FIRST_OPENED_AT) + PORTAL_RELEASE_WINDOW_MS - 1),
    ),
    {
      status: "available",
      firstOpenedAt: FIRST_OPENED_AT,
      acknowledgedAt: null,
    },
  );
  assert.deepEqual(
    derivePortalReleaseState(
      row({ acknowledged_at: ACKNOWLEDGED_AT }),
      new Date(ACKNOWLEDGED_AT),
    ),
    {
      status: "available",
      firstOpenedAt: FIRST_OPENED_AT,
      acknowledgedAt: ACKNOWLEDGED_AT,
    },
  );
  assert.deepEqual(
    derivePortalReleaseState(
      row({ hidden_at: "2026-07-29T13:10:00.000Z" }),
      new Date("2026-08-10T13:00:00.000Z"),
    ),
    { status: "hidden" },
  );
  assert.deepEqual(
    derivePortalReleaseState(
      row(),
      new Date(Date.parse(FIRST_OPENED_AT) + PORTAL_RELEASE_WINDOW_MS),
    ),
    { status: "expired" },
  );
});

test("treats malformed timestamps and invalid clocks as unavailable", () => {
  assert.deepEqual(
    derivePortalReleaseState(row({ first_opened_at: "not-a-date" })),
    { status: "unavailable" },
  );
  assert.deepEqual(
    derivePortalReleaseState(row({ acknowledged_at: "not-a-date" })),
    { status: "unavailable" },
  );
  assert.deepEqual(
    derivePortalReleaseState(row({ hidden_at: 123 })),
    { status: "unavailable" },
  );
  assert.deepEqual(
    derivePortalReleaseState(row(), new Date(Number.NaN)),
    { status: "unavailable" },
  );
});

test("accepts only bounded technical release identifiers", () => {
  assert.equal(parsePortalReleaseId("portal-2026-07-29"), "portal-2026-07-29");
  assert.equal(parsePortalReleaseId("portal.release_1"), "portal.release_1");
  assert.equal(parsePortalReleaseId(""), null);
  assert.equal(parsePortalReleaseId(" portal-release"), null);
  assert.equal(parsePortalReleaseId("Portal Release"), null);
  assert.equal(parsePortalReleaseId("a".repeat(81)), null);
  assert.equal(parsePortalReleaseId(null), null);
});

test("binds public release actions to the configured release identifier", () => {
  const supported = "2026-07-29-request-workflow";
  assert.equal(
    parseSupportedPortalReleaseId(supported, supported),
    supported,
  );
  assert.equal(
    parseSupportedPortalReleaseId("syntactically-valid-but-unknown", supported),
    null,
  );
  assert.equal(parseSupportedPortalReleaseId(" invalid", supported), null);
});

test("classifies all release audit actions as technical", () => {
  for (const action of [
    "staff.release_open",
    "staff.release_view",
    "staff.release_guide_open",
    "staff.release_dismiss",
    "staff.release_acknowledge",
    "staff.release_hide",
  ]) {
    assert.equal(isPortalReleaseAuditAction(action), true);
  }
  assert.equal(isPortalReleaseAuditAction("staff.tour_complete"), false);
});

test("parses complete release engagement rows for staff reporting", () => {
  const result = parsePortalReleaseEngagementRows([
    {
      staff_user_id: "5e1f0a69-5485-4a90-8845-aa32a506c202",
      first_opened_at: FIRST_OPENED_AT,
      last_viewed_at: "2026-07-29T13:20:00.000Z",
      view_count: 3,
      acknowledged_at: ACKNOWLEDGED_AT,
      hidden_at: null,
      guide_opened_at: "2026-07-29T13:06:00.000Z",
      last_guide_opened_at: "2026-07-29T13:15:00.000Z",
      guide_open_count: 2,
      last_dismissed_at: "2026-07-29T13:18:00.000Z",
      dismiss_count: 1,
      profile: {
        display_name: "  Morgan Reed ",
        email: " morgan@example.com ",
        active: true,
      },
    },
  ]);

  assert.deepEqual(result, {
    status: "available",
    rows: [
      {
        staffUserId: "5e1f0a69-5485-4a90-8845-aa32a506c202",
        displayName: "Morgan Reed",
        email: "morgan@example.com",
        active: true,
        firstOpenedAt: FIRST_OPENED_AT,
        lastViewedAt: "2026-07-29T13:20:00.000Z",
        viewCount: 3,
        acknowledgedAt: ACKNOWLEDGED_AT,
        hiddenAt: null,
        guideOpenedAt: "2026-07-29T13:06:00.000Z",
        lastGuideOpenedAt: "2026-07-29T13:15:00.000Z",
        guideOpenCount: 2,
        lastDismissedAt: "2026-07-29T13:18:00.000Z",
        dismissCount: 1,
      },
    ],
  });
  assert.deepEqual(parsePortalReleaseEngagementRows([]), {
    status: "available",
    rows: [],
  });
});

test("fails release engagement reporting closed on malformed data", () => {
  const baseline = {
    staff_user_id: "5e1f0a69-5485-4a90-8845-aa32a506c202",
    first_opened_at: FIRST_OPENED_AT,
    last_viewed_at: FIRST_OPENED_AT,
    view_count: 1,
    acknowledged_at: null,
    hidden_at: null,
    guide_opened_at: null,
    last_guide_opened_at: null,
    guide_open_count: 0,
    last_dismissed_at: null,
    dismiss_count: 0,
    profile: {
      display_name: "Morgan Reed",
      email: "morgan@example.com",
      active: true,
    },
  };

  assert.deepEqual(parsePortalReleaseEngagementRows(null), {
    status: "unavailable",
  });
  assert.deepEqual(
    parsePortalReleaseEngagementRows([
      { ...baseline, profile: null },
    ]),
    { status: "unavailable" },
  );
  assert.deepEqual(
    parsePortalReleaseEngagementRows([
      { ...baseline, view_count: -1 },
    ]),
    { status: "unavailable" },
  );
  assert.deepEqual(
    parsePortalReleaseEngagementRows([
      {
        ...baseline,
        guide_open_count: 1,
        guide_opened_at: null,
        last_guide_opened_at: null,
      },
    ]),
    { status: "unavailable" },
  );
});
