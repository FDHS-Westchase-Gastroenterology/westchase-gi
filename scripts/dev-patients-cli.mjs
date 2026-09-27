import { parseArgs } from "node:util";

import { generateScenario, summarizeRequests } from "./dev-patients-scenarios.mjs";
import { seedState } from "./dev-patients-state.mjs";
import { createSeedStore, scopeBlockers, scopeSnapshot, seedRows } from "./dev-patients-store.mjs";
import {
  assertWriteIntent,
  checkoutInfo,
  loadSeedEnvironment,
  resolveDevTarget,
} from "./dev-patients-target.mjs";
import { recoverFixtures, regenerateFixtures, verifyFixtures } from "./dev-patients-workflow.mjs";

const HELP = `Development appointment fixtures (never Production)

npm run dev:patients -- inspect [options]       Read-only target, scope, counts, plan
npm run dev:patients -- verify [options]        Read-only history and app read checks
npm run dev:patients -- regenerate [options]    Explicit, recoverable replacement
npm run dev:patients -- recover [options]       Resume/roll back an interrupted run

Options:
  --profile portal-review|custom  Default portal-review: New 10, Call Again 12,
                                 Scheduled 5, Closed 5; custom uses DEV_SEED_* counts
  --seed TEXT                    Repeatable content; default portal-review-v1
  --now ISO_TIMESTAMP            Reference clock; default current time
  --env-file PATH                Default .env.local in this checkout; process wins
  --confirm-target REF           Required for regenerate/recover (local for loopback)
  --shared-preview-ready         Confirm other users/CI are coordinated for Preview
  --app-url http://localhost:3000 Optional HTTP verification, with --storage-state
  --storage-state PATH           Existing Playwright cookies; never signs in

npm run dev only starts Next. DEV_SEED does not trigger automatic seeding.
Explicit regenerate/recover work even when DEV_SEED=0. Inspect is the default.
Keep the shared Preview idle through verification. Staging can briefly show both
batches; the local target lock coordinates this checkout and sibling worktrees.
`;

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: "boolean" },
      profile: { type: "string", default: "portal-review" },
      seed: { type: "string", default: "portal-review-v1" },
      now: { type: "string" },
      "env-file": { type: "string" },
      "confirm-target": { type: "string" },
      "shared-preview-ready": { type: "boolean", default: false },
      "app-url": { type: "string" },
      "storage-state": { type: "string" },
    },
  });
  if (values.help) {
    console.log(HELP);
    return;
  }
  const command = positionals[0] || "inspect";
  if (positionals.length > 1 || !["inspect", "verify", "regenerate", "recover"].includes(command))
    throw new Error("Choose inspect, verify, regenerate, or recover; see --help");
  const cwd = process.cwd();
  const checkout = checkoutInfo(cwd);
  const { env, source } = loadSeedEnvironment(cwd, values["env-file"], process.env);
  const options = {
    profile: values.profile,
    seed: values.seed,
    confirmTarget: values["confirm-target"],
    sharedPreviewReady: values["shared-preview-ready"],
    appUrl: values["app-url"],
    storageState: values["storage-state"],
  };
  const now = new Date(values.now || Date.now());
  const scenario = generateScenario(options.profile, env, options.seed, now);
  const target = resolveDevTarget(env);
  const plan = {
    checkout,
    environment: source,
    target: target ? { url: target.url, ref: target.ref, kind: target.kind } : null,
    startup: {
      seedsAutomatically: false,
      devSeed: env.DEV_SEED || "unset",
      reason: "npm run dev only starts Next; regeneration is explicit even with DEV_SEED=0",
    },
    profile: options.profile,
    seed: options.seed,
    referenceClock: now.toISOString(),
    planned: summarizeRequests(scenario.requests, now),
    boundary:
      "Only source_path=/seed with known fictional names, matching mock.com emails, and 81355501xx phones; retention holds, patient/appointment links, or retained audit history block replacement. Other requests and their related records are preserved.",
    coordination:
      "One lock per target across this repository's worktrees on this host. Coordinate other users and CI before --shared-preview-ready; there is no distributed database lock.",
  };
  if (!target) {
    console.log(JSON.stringify(plan, null, 2));
    throw new Error("Missing development Supabase URL or service credential");
  }
  const store = createSeedStore(target);
  const state = seedState(checkout.commonGitDirectory, target);
  const context = { target, store, state, env, now, options };
  if (command === "regenerate" || command === "recover") {
    assertWriteIntent(target, options, env);
    console.log(JSON.stringify({ command, ...plan }, null, 2));
    const result =
      command === "recover"
        ? await recoverFixtures(context)
        : await regenerateFixtures(context, scenario);
    console.log(JSON.stringify({ command, result }, null, 2));
    return;
  }
  const snapshot = await store.snapshot();
  const requests = seedRows(snapshot);
  const scope = scopeSnapshot(
    snapshot,
    requests.map((row) => row.id),
    true,
  );
  const inspection = {
    ...plan,
    current: {
      seed: summarizeRequests(requests, now, snapshot.audit_log),
      all: summarizeRequests(snapshot.requests, now, snapshot.audit_log),
      otherRequests: snapshot.requests.length - requests.length,
      children: Object.fromEntries(
        Object.entries(scope)
          .filter(([table]) => table !== "requests")
          .map(([table, rows]) => [table, rows.length]),
      ),
    },
    blockers: scopeBlockers(snapshot),
    recovery: { pending: state.pending(), journal: state.journalPath },
    lastVerification: state.receipt(),
  };
  console.log(JSON.stringify({ command, ...inspection }, null, 2));
  if (command === "verify") {
    if (state.pending())
      throw new Error("Pending fixture operation; inspect and recover before verification");
    console.log(
      JSON.stringify(
        {
          verification: await verifyFixtures(context, snapshot, scenario),
          preservation:
            "Non-seed preservation is checked against the before snapshot during regenerate/recover; a standalone read cannot establish a historical baseline",
        },
        null,
        2,
      ),
    );
  }
}

main().catch((error) => {
  console.error(
    `[dev-patients] ${error instanceof SyntaxError ? "Invalid JSON response or state file; contents omitted" : error.message}`,
  );
  process.exitCode = 1;
});
