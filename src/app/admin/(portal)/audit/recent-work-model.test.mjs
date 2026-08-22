import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import { pathToFileURL } from "node:url";

register(
  `data:text/javascript,${encodeURIComponent(`
    const srcRoot = ${JSON.stringify(new URL("../../../../", import.meta.url).href)};
    export async function resolve(specifier, context, nextResolve) {
      if (specifier === "server-only") {
        return {
          url: "data:text/javascript,export%20{}",
          shortCircuit: true,
        };
      }
      // Stub the site config so the unit lens never loads review-targets
      // JSON; only the locales list reaches this import chain.
      if (specifier === "@/lib/site") {
        return {
          url:
            "data:text/javascript," +
            encodeURIComponent(
              'export const locales = ["en", "es", "vi", "ko", "ar"];',
            ),
          shortCircuit: true,
        };
      }
      if (specifier.startsWith("@/")) {
        specifier = srcRoot + specifier.slice(2);
      }
      if (
        (specifier.startsWith("./") ||
          specifier.startsWith("../") ||
          specifier.startsWith("file:")) &&
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
  classifyWorkType,
  compactRepeatedOutput,
  filterRecentWork,
  OUTPUT_GROUP_MAX_GAP_MS,
  paginateRecentWork,
  parseRecentWorkType,
  recentWorkHref,
  toRecentWorkItems,
} = await import("./recent-work-model.ts");

const NOW = new Date("2026-08-22T15:00:00.000Z");
const ACTOR = "alex@westchasegi.test";
const CTX = () => ({
  namesByEmail: new Map([[ACTOR, "Alex Rivera"]]),
  namesByProfileId: new Map(),
  recipientsById: new Map(),
  now: NOW,
});

let seq = 0;
function entry(partial = {}) {
  seq += 1;
  return {
    id: `id-${String(seq).padStart(4, "0")}`,
    actor_email: ACTOR,
    action: "request.create",
    entity: "requests",
    entity_id: null,
    detail: {},
    at: "2026-08-22T14:00:00.000Z",
    ...partial,
  };
}

function printRun(count, startIso, stepMinutes = 5, overrides = {}) {
  const start = Date.parse(startIso);
  return Array.from({ length: count }, (_, index) =>
    entry({
      action: "requests.print_new",
      detail: { row_count: 11 },
      // Newest first, like the audit read.
      at: new Date(start - index * stepMinutes * 60_000).toISOString(),
      ...overrides,
    }),
  );
}

test("classifies every supported action into a staff-facing work group", () => {
  assert.equal(classifyWorkType("request.create"), "requests");
  assert.equal(classifyWorkType("request.call_outcome"), "requests");
  assert.equal(classifyWorkType("requests.print_new"), "output");
  assert.equal(classifyWorkType("requests.export"), "output");
  assert.equal(classifyWorkType("recipients.toggle"), "people");
  assert.equal(classifyWorkType("staff.invite"), "people");
  assert.equal(classifyWorkType("staff.tour_complete"), "people");
  assert.equal(classifyWorkType("maintainers.invite"), "site");
  // Unknown actions land in the reachable "other" group, never dropped.
  assert.equal(classifyWorkType("future.unknown_action"), "other");
});

test("current lifecycle events still translate into plain language", () => {
  const items = toRecentWorkItems(
    [
      entry({ action: "request.create", at: "2026-08-22T14:00:00.000Z" }),
      entry({
        action: "request.status_change",
        detail: { from: "new", to: "scheduled" },
        at: "2026-08-22T14:05:00.000Z",
      }),
      entry({
        action: "request.call_outcome",
        detail: { outcome: "voicemail", follow_up_at: "2026-08-25T14:00:00.000Z" },
        at: "2026-08-22T14:10:00.000Z",
      }),
      entry({ action: "request.note", entity_id: "r1", at: "2026-08-22T14:15:00.000Z" }),
      entry({
        action: "requests.export",
        detail: { row_count: 42 },
        at: "2026-08-22T14:20:00.000Z",
      }),
      entry({
        action: "requests.print_new",
        detail: { row_count: 1 },
        at: "2026-08-22T14:25:00.000Z",
      }),
    ],
    CTX(),
  );
  const sentences = items.map((item) => item.sentence);
  assert.ok(sentences.includes("added an appointment request"));
  assert.ok(sentences.includes("marked a request Scheduled"));
  assert.ok(sentences.some((sentence) => sentence.startsWith("left a voicemail on a request")));
  assert.ok(sentences.includes("added a note to a request"));
  assert.ok(sentences.includes("exported the request list (42 requests)"));
  assert.ok(sentences.includes("prepared the New-request print packet (1 request)"));
  // Storage vocabulary never reaches the human view.
  for (const item of items) {
    assert.ok(!item.sentence.includes("request."));
    assert.ok(!item.sentence.includes("requests."));
  }
});

test("search finds actor names, action phrases, and the linked request id only", () => {
  const requestId = "9f83e2a1-1111-2222-3333-444455556666";
  const entries = [
    entry({ action: "request.note", entity_id: requestId }),
    entry({
      action: "recipients.toggle",
      entity: "notification_recipients",
      entity_id: "recipient-1",
      detail: { to: true },
    }),
  ];
  const items = toRecentWorkItems(entries, CTX());

  const byActor = filterRecentWork(items, { search: "alex rivera", type: "all" });
  assert.equal(byActor.length, 2);
  const byPhrase = filterRecentWork(items, { search: "VOICED nothing", type: "all" });
  assert.equal(byPhrase.length, 0);
  const bySentence = filterRecentWork(items, {
    search: "resumed notification emails",
    type: "all",
  });
  assert.equal(bySentence.length, 1);
  assert.ok(bySentence[0].sentence.includes("resumed notification emails"));
  const byRequest = filterRecentWork(items, { search: "9f83e2a1", type: "all" });
  assert.equal(byRequest.length, 1);
  assert.equal(byRequest[0].requestId, requestId);
});

test("search never matches hidden metadata, storage codes, or raw JSON fields", () => {
  const entries = [
    entry({
      action: "requests.export",
      detail: {
        row_count: 1001,
        status_filter: "secret-internal-flag",
        correlation_hint: "hidden-token-xyz",
      },
    }),
    entry({
      action: "staff.invite",
      entity: "staff_profiles",
      entity_id: "profile-uuid-not-shown-anywhere",
    }),
  ];
  const items = toRecentWorkItems(entries, CTX());
  for (const needle of [
    "secret-internal-flag",
    "hidden-token-xyz",
    "profile-uuid",
    "requests.export",
    "staff.invite",
    "row_count",
  ]) {
    assert.equal(
      filterRecentWork(items, { search: needle, type: "all" }).length,
      0,
      `search must not match hidden field: ${needle}`,
    );
  }
  // The visible sentence still matches — including the row count it shows.
  assert.equal(
    filterRecentWork(items, { search: "exported the request list", type: "all" }).length,
    1,
  );
  assert.equal(filterRecentWork(items, { search: "1001", type: "all" }).length, 1);
});
test("every work-type filter narrows correctly and composes with search", () => {
  const entries = [
    entry({ action: "request.note" }),
    entry({ action: "requests.print_new", detail: { row_count: 3 } }),
    entry({
      action: "recipients.add",
      entity: "notification_recipients",
      entity_id: "recipient-1",
    }),
    entry({ action: "maintainers.invite", detail: { target_login: "sam@example.test" } }),
  ];
  const items = toRecentWorkItems(entries, CTX());
  const expect = { requests: 1, output: 1, people: 1, site: 1, other: 0 };
  for (const [type, expected] of Object.entries(expect)) {
    const filtered = filterRecentWork(items, { search: "", type });
    assert.equal(filtered.length, expected, `filter ${type}`);
    for (const item of filtered) assert.equal(item.workType, type);
  }
  // Combined state: search inside one group.
  const combined = filterRecentWork(items, { search: "print packet", type: "output" });
  assert.equal(combined.length, 1);
  const combinedMiss = filterRecentWork(items, { search: "print packet", type: "people" });
  assert.equal(combinedMiss.length, 0);
});

test("repeated print runs compact deterministically with count, span, and exact members", () => {
  const run = printRun(6, "2026-08-22T14:00:00.000Z", 2);
  const items = toRecentWorkItems(run, CTX());
  const first = compactRepeatedOutput(items);
  const second = compactRepeatedOutput(items);
  assert.deepEqual(first, second);
  assert.equal(first.length, 1);
  assert.equal(first[0].kind, "group");
  assert.equal(first[0].count, 6);
  assert.equal(first[0].phrase, "prepared the New-request print packet");
  assert.equal(first[0].toAt, items[0].at);
  assert.equal(first[0].fromAt, items[5].at);
  // Expansion keeps the exact underlying entries: ids, times, sentences.
  assert.deepEqual(
    first[0].items.map((item) => [item.id, item.at, item.sentence]),
    items.map((item) => [item.id, item.at, item.sentence]),
  );
});

test("grouping boundaries never combine unlike events", () => {
  const base = { action: "requests.print_new" };
  const sameActor = printRun(3, "2026-08-22T14:00:00.000Z", 5);
  const entries = [
    ...sameActor,
    // A different actor breaks the run.
    entry({ ...base, actor_email: "sam@westchasegi.test", at: "2026-08-22T13:40:00.000Z" }),
    // A different action breaks the run even for the same actor.
    entry({ action: "requests.export", detail: { row_count: 5 }, at: "2026-08-22T13:35:00.000Z" }),
    // Back to printing after a non-output event starts a fresh run.
    entry({ ...base, detail: { row_count: 7 }, at: "2026-08-22T13:30:00.000Z" }),
    // Beyond the gap threshold the run cannot rejoin.
    entry({
      ...base,
      detail: { row_count: 7 },
      at: new Date(
        Date.parse("2026-08-22T13:30:00.000Z") - OUTPUT_GROUP_MAX_GAP_MS - 60_000,
      ).toISOString(),
    }),
  ];
  const items = toRecentWorkItems(entries, CTX());
  const result = compactRepeatedOutput(items);
  const groups = result.filter((candidate) => candidate.kind === "group");
  const singles = result.filter((candidate) => candidate.kind === "single");
  assert.equal(groups.length, 1);
  assert.equal(groups[0].count, 3);
  assert.equal(singles.length, 4);
  // Order is exactly the input order.
  assert.deepEqual(
    result
      .map((one) => (one.kind === "group" ? one.items.map((item) => item.id) : [one.item.id]))
      .flat(),
    items.map((item) => item.id),
  );
});

test("a practice-day change separates otherwise identical adjacent events", () => {
  // 23:50 ET Aug 21 and 00:05 ET Aug 22 — 15 minutes apart across midnight.
  const entries = [
    entry({ action: "requests.print_new", detail: {}, at: "2026-08-21T03:50:00.000Z" }),
    entry({ action: "requests.print_new", detail: {}, at: "2026-08-21T04:05:00.000Z" }),
  ];
  const items = toRecentWorkItems(entries, CTX());
  const result = compactRepeatedOutput(items);
  assert.equal(result.length, 2);
  for (const one of result) assert.equal(one.kind, "single");
});

test("the pipeline never mutates or reorders stored audit data", () => {
  const requestId = "9f83e2a1-1111-2222-3333-444455556666";
  const entries = [
    ...printRun(4, "2026-08-22T14:00:00.000Z", 3),
    entry({ action: "request.note", entity_id: requestId, at: "2026-08-22T12:00:00.000Z" }),
  ];
  const before = JSON.stringify(entries);
  const items = toRecentWorkItems(entries, CTX());
  filterRecentWork(items, { search: "print", type: "output" });
  compactRepeatedOutput(items);
  paginateRecentWork(items, 1, 2);
  assert.equal(JSON.stringify(entries), before);
  // The lens derives from the same rows the technical record renders; the
  // Technical read path is a separate query and is untouched here.
  assert.equal(entries.length, 5);
  assert.ok(entries.some((one) => one.action === "requests.print_new"));
});

test("clear restores the full view; zero results stay honest and paginated", () => {
  const items = toRecentWorkItems(printRun(3, "2026-08-22T14:00:00.000Z", 5), CTX());
  const cleared = filterRecentWork(items, { search: "", type: parseRecentWorkType(undefined) });
  assert.equal(cleared.length, items.length);
  const none = filterRecentWork(items, { search: "nothing-matches-this", type: "all" });
  assert.equal(none.length, 0);
  const page = paginateRecentWork(none, 1);
  assert.equal(page.total, 0);
  assert.equal(page.totalPages, 1);
  assert.equal(page.firstShown, 0);
  assert.equal(page.lastShown, 0);
});

test("pagination math stays honest across zero, one, many, and later pages", () => {
  const one = paginateRecentWork([1, 2, 3], 1, 50);
  assert.deepEqual(
    {
      total: one.total,
      totalPages: one.totalPages,
      firstShown: one.firstShown,
      lastShown: one.lastShown,
    },
    { total: 3, totalPages: 1, firstShown: 1, lastShown: 3 },
  );
  const many = [Array.from({ length: 120 }, (_, index) => index)].flat();
  const pageOne = paginateRecentWork(many, 1, 50);
  assert.deepEqual(
    {
      totalPages: pageOne.totalPages,
      firstShown: pageOne.firstShown,
      lastShown: pageOne.lastShown,
    },
    { totalPages: 3, firstShown: 1, lastShown: 50 },
  );
  const pageThree = paginateRecentWork(many, 3, 50);
  assert.equal(pageThree.lastShown, 120);
  // Out-of-range requests clamp instead of lying.
  const clamped = paginateRecentWork(many, 99, 50);
  assert.equal(clamped.firstShown, 101);
  assert.equal(clamped.slice.length, 20);
});

test("URL state builds shareable links and collapses to the bare route when clear", () => {
  assert.equal(recentWorkHref({}), "/admin/audit");
  assert.equal(recentWorkHref({ q: "voicemail", type: "all", rw: 1 }), "/admin/audit?q=voicemail");
  assert.equal(
    recentWorkHref({ q: "alex", type: "output", rw: 2, page: 3 }),
    "/admin/audit?q=alex&type=output&rw=2&page=3",
  );
  assert.equal(recentWorkHref({ hash: "recent-work-search" }), "/admin/audit#recent-work-search");
  assert.equal(parseRecentWorkType("output"), "output");
  assert.equal(parseRecentWorkType("bogus"), "all");
});
