import { parseArgs } from "node:util";

import { checkDemoData, checkQuality } from "./demo-data/checks.mjs";
import {
  branchDatabaseUrl,
  ensureAccounts,
  execute,
  findOperator,
  inFlightCiRuns,
  liveContent,
  planAccounts,
  query,
} from "./demo-data/database.mjs";
import { generateDemoData, summarize } from "./demo-data/generate.mjs";
import { clinicianRoster } from "./demo-data/roster.mjs";
import { COUNTS_SQL, resetSql } from "./demo-data/sql.mjs";
import {
  assertWriteIntent,
  checkoutInfo,
  loadSeedEnvironment,
  resolveDevTarget,
} from "./dev-patients-target.mjs";

const CI_WORKFLOW = "supabase-dependency-integration.yml";

const HELP = `Portal demo data for a shared Preview branch (never Production)

npm run demo:data -- plan [options]    Default. Generate offline, run the bar, print the summary
npm run demo:data -- check [options]   Same as plan, and fail on any problem (CI-safe, no network)
npm run demo:data -- audit [options]   Read-only: hold the branch's live content to the bar
npm run demo:data -- reset [options]   Replace the branch's portal data with a generated dataset

Options:
  --seed TEXT              Repeatable content; default westchase-demo-v1
  --profile NAME           full (default): a worked practice. intake: only new requests, no appointments
  --now ISO_TIMESTAMP      Reference clock; default the current time
  --operator EMAIL         Front-desk actor; an active admin profile. Default PORTAL_SEED_ADMIN_EMAIL
  --env-file PATH          Default .env.local in this checkout; process wins
  --confirm-target REF     Required for reset
  --shared-preview-ready   Confirms other users of the branch database are idle

Reset keeps auth users, admin profiles outside @example.test, notification recipients
and audit rows without a source. It replaces patients, requests, scheduling, clinical
records, billing and clinician profiles, and removes stranded @example.test auth users.
`;

const fakeStaff = () => ({
  operator: {
    id: "00000000-0000-4000-8000-000000000000",
    email: "front.desk@preview.westchase.test",
  },
  clinicians: Object.fromEntries(
    clinicianRoster().map((c, i) => [
      c.key,
      `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    ]),
  ),
});

function report(label, problems) {
  console.log(
    JSON.stringify(
      {
        [label]: problems.length ? problems.slice(0, 50) : "meets the bar",
        total: problems.length,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: "boolean" },
      seed: { type: "string", default: "westchase-demo-v1" },
      profile: { type: "string", default: "full" },
      now: { type: "string" },
      operator: { type: "string" },
      "env-file": { type: "string" },
      "confirm-target": { type: "string" },
      "shared-preview-ready": { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(HELP);
    return;
  }
  const command = positionals[0] || "plan";
  if (positionals.length > 1 || !["plan", "check", "audit", "reset"].includes(command))
    throw new Error("Choose plan, check, audit, or reset; see --help");
  const now = values.now ? Date.parse(values.now) : Date.now();
  if (Number.isNaN(now)) throw new Error("--now must be an ISO timestamp");

  if (command === "plan" || command === "check") {
    const data = generateDemoData({
      seed: values.seed,
      now,
      staff: fakeStaff(),
      profile: values.profile,
    });
    const problems = checkDemoData(data);
    console.log(JSON.stringify(summarize(data), null, 2));
    report("bar", problems);
    if (problems.length) process.exitCode = 1;
    return;
  }

  const cwd = process.cwd();
  const { env, source } = loadSeedEnvironment(cwd, values["env-file"], process.env);
  const target = resolveDevTarget(env);
  if (!target) throw new Error("Missing Preview Supabase URL or service credential");
  const dbUrl = branchDatabaseUrl(target, env);
  const where = {
    checkout: checkoutInfo(cwd).branch,
    environment: source.file,
    target: target.ref,
  };

  if (command === "audit") {
    const live = liveContent(dbUrl);
    const counts = query(dbUrl, COUNTS_SQL)[0].counts;
    console.log(
      JSON.stringify({ ...where, counts, skippedE2eFixtures: live.e2eFixtures }, null, 2),
    );
    const problems = checkQuality(live);
    report("live", problems);
    if (problems.length) process.exitCode = 1;
    return;
  }

  assertWriteIntent(
    target,
    { confirmTarget: values["confirm-target"], sharedPreviewReady: values["shared-preview-ready"] },
    env,
  );
  const running = inFlightCiRuns(CI_WORKFLOW);
  if (running === null)
    throw new Error(
      "Cannot list CI runs with gh; the reset needs to know the branch database is idle",
    );
  if (running.length)
    throw new Error(
      `Wait for ${running.length} supabase-integration run(s) to finish: ${running.map((r) => r.headBranch).join(", ")}`,
    );

  const operator = findOperator(dbUrl, values.operator || env.PORTAL_SEED_ADMIN_EMAIL);
  const roster = clinicianRoster();
  const accounts = await planAccounts(target, roster);
  const clinicians = await ensureAccounts(target, roster);
  const data = generateDemoData({
    seed: values.seed,
    now,
    staff: { operator, clinicians },
    profile: values.profile,
  });
  const problems = checkDemoData(data);
  if (problems.length) {
    report("bar", problems);
    throw new Error("The generated dataset is below the bar; nothing was written to the database");
  }
  execute(dbUrl, resetSql(data));
  const expected = summarize(data);
  const counts = query(dbUrl, COUNTS_SQL)[0].counts;
  // Kept admin profiles, and the tours they finished, sit beside the clinicians the reset inserts.
  const mismatched = Object.entries(expected.tables).filter(([table, n]) =>
    table === "staff_profiles" || table === "staff_tours" ? counts[table] < n : counts[table] !== n,
  );
  console.log(
    JSON.stringify(
      {
        ...where,
        accounts: { created: accounts.missing, removedStranded: accounts.stranded.length },
        summary: expected,
        counts,
      },
      null,
      2,
    ),
  );
  if (mismatched.length)
    throw new Error(
      `Live counts differ from the dataset: ${mismatched.map(([t]) => t).join(", ")}`,
    );
  report("live", checkQuality(liveContent(dbUrl)));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
