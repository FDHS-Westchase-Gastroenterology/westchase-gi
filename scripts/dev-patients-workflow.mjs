import { verifyAppRead } from "./dev-patients-app.mjs";
import { materializeScenario, summarizeRequests } from "./dev-patients-scenarios.mjs";
import {
  assertGenerated,
  digest,
  scopeBlockers,
  scopeSnapshot,
  seedRows,
} from "./dev-patients-store.mjs";

function requireUnblocked(snapshot) {
  const blockers = scopeBlockers(snapshot);
  if (blockers.length) throw new Error(blockers.join("; "));
}

function assertPreserved(snapshot, journal) {
  const excluded = [...journal.oldIds, ...journal.generated.requests.map((row) => row.id)];
  if (digest(scopeSnapshot(snapshot, excluded, false)) !== journal.preservedDigest) {
    throw new Error(
      "Non-seed requests or their related records changed during the operation; review before recovery",
    );
  }
}

export async function verifyFixtures(context, snapshot, expected) {
  const { now, env, target, store, options } = context;
  requireUnblocked(snapshot);
  const requests = seedRows(snapshot);
  const counts = summarizeRequests(requests, now);
  if (digest(counts) !== digest(summarizeRequests(expected.requests, now)))
    throw new Error(
      "Fixture counts or attention buckets differ from the selected profile and clock",
    );
  const ids = requests.map((row) => row.id);
  const scope = scopeSnapshot(snapshot, ids, true);
  for (const row of requests) {
    const events = scope.request_events.filter((event) => event.request_id === row.id);
    const created = events.filter((event) => event.type === "created");
    if (created.length !== 1 || Date.parse(created[0].created_at) !== Date.parse(row.created_at))
      throw new Error("Fixture creation history is incomplete");
    if (
      events.some(
        (event) =>
          Date.parse(event.created_at) < Date.parse(row.created_at) ||
          Date.parse(event.created_at) > now.getTime(),
      )
    )
      throw new Error("Fixture history timestamps are inconsistent");
    if (
      row.status === "contacted" &&
      !events.some(
        (event) =>
          (event.type === "contact_attempt" &&
            Date.parse(event.meta.follow_up_at) === Date.parse(row.follow_up_at)) ||
          (event.type === "contact_attempt" &&
            event.meta.follow_up_at === null &&
            row.follow_up_at === null),
      )
    )
      throw new Error("Fixture callback history is incomplete");
    if (
      row.status === "booked" &&
      !(row.record_handoff_at && Date.parse(row.appointment_at) > now.getTime())
    )
      throw new Error("Scheduled fixture lacks a future appointment and record handoff");
    if (row.status === "closed" && !(row.closed_at && row.closure_reason))
      throw new Error("Closed fixture lacks closure metadata");
  }
  return {
    counts,
    children: Object.fromEntries(
      Object.entries(scope)
        .filter(([table]) => table !== "requests")
        .map(([table, rows]) => [table, rows.length]),
    ),
    app: await verifyAppRead(target, store, snapshot.requests, env, now, options),
  };
}

async function retireAndVerify(context, journal) {
  const { store, state } = context;
  const snapshot = await store.snapshot(journal.oldIds);
  requireUnblocked(snapshot);
  assertGenerated(snapshot, journal.generated);
  assertPreserved(snapshot, journal);
  const remainingIds = snapshot.requests
    .filter((row) => journal.oldIds.includes(row.id))
    .map((row) => row.id);
  if (
    digest(scopeSnapshot(snapshot, remainingIds, true)) !==
    digest(scopeSnapshot(journal.before, remainingIds, true))
  )
    throw new Error("Previous fixtures changed after staging; preserve and review before recovery");
  journal.phase = "retiring";
  state.save(journal);
  await store.remove(remainingIds);
  const after = await store.snapshot(journal.oldIds);
  assertGenerated(after, journal.generated);
  assertPreserved(after, journal);
  const leftover = scopeSnapshot(after, journal.oldIds, true);
  if (Object.values(leftover).some((rows) => rows.length))
    throw new Error("Previous fixture children remain; inspect the recovery journal");
  const verification = await verifyFixtures(context, after, journal.generated);
  const receipt = {
    target: context.target.url,
    profile: journal.profile,
    seed: journal.seed,
    referenceClock: journal.referenceClock,
    completed: new Date().toISOString(),
    preservationChecked: true,
    retiredRequests: journal.oldIds.length,
    ...verification,
  };
  state.saveReceipt(receipt);
  state.clear();
  return receipt;
}

async function rollbackStaging(context, journal) {
  const snapshot = await context.store.snapshot(journal.oldIds);
  if (digest(scopeSnapshot(snapshot, journal.oldIds, true)) !== digest(journal.before))
    throw new Error("Previous fixtures changed during staging; preserve both batches for review");
  assertGenerated(snapshot, journal.generated, true);
  const newIds = journal.generated.requests.map((row) => row.id);
  await context.store.remove(newIds);
  const after = await context.store.snapshot(newIds);
  if (Object.values(scopeSnapshot(after, newIds, true)).some((rows) => rows.length))
    throw new Error("Staged fixture cleanup is incomplete");
  context.state.clear();
  return { recovered: "Rolled back the incomplete staged batch; previous fixtures preserved" };
}

export async function regenerateFixtures(context, scenario) {
  const { store, state, options, now } = context;
  const release = state.acquire();
  try {
    if (state.pending())
      throw new Error(`Interrupted operation: use recover with ${state.journalPath}`);
    const snapshot = await store.snapshot();
    requireUnblocked(snapshot);
    // Prove the app can read this target before staging any new records.
    await verifyAppRead(context.target, store, snapshot.requests, context.env, now, options);
    const oldIds = seedRows(snapshot).map((row) => row.id);
    const generated = materializeScenario(scenario);
    const journal = {
      target: context.target.url,
      phase: "staging",
      profile: options.profile,
      seed: options.seed,
      referenceClock: now.toISOString(),
      oldIds,
      generated,
      before: scopeSnapshot(snapshot, oldIds, true),
      preservedDigest: digest(scopeSnapshot(snapshot, oldIds, false)),
    };
    state.save(journal);
    try {
      await store.insert("requests", generated.requests);
      await store.insert("request_events", generated.events);
      return await retireAndVerify(context, journal);
    } catch (error) {
      if (journal.phase === "staging") {
        try {
          await rollbackStaging(context, journal);
        } catch {
          throw new Error(
            `Fixture operation interrupted; records preserved for recover. Journal: ${state.journalPath}`,
          );
        }
      }
      throw error;
    }
  } finally {
    release();
  }
}

export async function recoverFixtures(context) {
  const release = context.state.acquire(true);
  try {
    if (!context.state.pending())
      return { recovered: "No pending journal; stale lock cleared if present" };
    const journal = context.state.read();
    if (journal.target !== context.target.url)
      throw new Error("Recovery target differs from journal");
    if (journal.phase === "staging") return await rollbackStaging(context, journal);
    if (journal.phase !== "retiring")
      throw new Error("Unknown recovery phase; preserve journal for review");
    return await retireAndVerify({ ...context, now: new Date(journal.referenceClock) }, journal);
  } finally {
    release();
  }
}
