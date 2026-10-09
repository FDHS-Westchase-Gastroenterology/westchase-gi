/**
 * Compares the migrations this checkout carries with the versions recorded in
 * the Preview Branch database it is about to test against.
 *
 * - Every local migration must be applied. A missing one means the database
 *   is behind this code, and the specs would test the wrong schema.
 * - A version the database has and this checkout lacks is allowed only when a
 *   branch sharing the database carries it: the database-owning branch itself,
 *   or an open pull request into that branch. Anything else is drift with no
 *   source in review, and the check names it.
 *
 * Environment: SUPABASE_BRANCH_PROJECT_REF, POSTGRES_URL, SUPABASE_PREVIEW_BRANCH=1,
 * DB_BRANCH (the database-owning Git branch), DB_ROLE (`owner` or `inherited`),
 * GH_TOKEN and REPOSITORY. PREVIEW_CONCLUSION, when set, is the Supabase Preview
 * conclusion on this head and is only reported.
 */

import { appendFileSync, readdirSync } from "node:fs";

import { queryBranchDatabase } from "./branch-database.mjs";

const MIGRATION = /^(\d{14})_.+\.sql$/;

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function versionsOf(names) {
  const versions = new Set();
  for (const name of names) {
    const match = MIGRATION.exec(name.split("/").pop());
    if (match) versions.add(match[1]);
  }
  return versions;
}

async function github(path) {
  const results = [];
  let url = `https://api.github.com/repos/${env("REPOSITORY")}/${path}`;
  while (url) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${env("GH_TOKEN")}`,
      },
    });
    if (!response.ok) throw new Error(`GitHub ${path} returned ${response.status}`);
    const page = await response.json();
    if (!Array.isArray(page)) return page;
    results.push(...page);
    url = /<([^>]+)>;\s*rel="next"/.exec(response.headers.get("link") || "")?.[1];
  }
  return results;
}

/** Versions carried by the database owner's branch and by open PRs into it. */
async function sharedVersions(dbBranch) {
  const sources = new Map();
  const ownerFiles = await github(
    `contents/supabase/migrations?ref=${encodeURIComponent(dbBranch)}`,
  );
  for (const version of versionsOf(ownerFiles.map((file) => file.name))) {
    sources.set(version, dbBranch);
  }
  const pulls = await github(`pulls?state=open&base=${encodeURIComponent(dbBranch)}&per_page=100`);
  for (const pull of pulls) {
    const files = await github(`pulls/${pull.number}/files?per_page=100`);
    const added = files
      .filter(
        (file) => file.status !== "removed" && file.filename.startsWith("supabase/migrations/"),
      )
      .map((file) => file.filename);
    for (const version of versionsOf(added)) {
      if (!sources.has(version)) sources.set(version, `#${pull.number} (${pull.head.ref})`);
    }
  }
  return sources;
}

function summary(lines) {
  const text = lines.join("\n");
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
}

async function main() {
  const ref = env("SUPABASE_BRANCH_PROJECT_REF");
  const dbBranch = env("DB_BRANCH");
  const role = env("DB_ROLE");

  const local = versionsOf(readdirSync("supabase/migrations"));
  const rows = queryBranchDatabase({
    ref,
    query: "select version from supabase_migrations.schema_migrations order by version;",
  });
  const remote = new Set(rows.map((row) => String(row.version)));

  const missing = [...local].filter((version) => !remote.has(version)).sort();
  const extra = [...remote].filter((version) => !local.has(version)).sort();
  const sources = extra.length ? await sharedVersions(dbBranch) : new Map();
  const unexplained = extra.filter((version) => !sources.has(version));

  const lines = [
    "### Migration lineage",
    "",
    `Database: \`${ref}\`, owned by \`${dbBranch}\` (${role === "owner" ? "this branch" : "inherited"}).`,
    `Local migrations: ${local.size}. Applied in the database: ${remote.size}.`,
  ];
  if (process.env.PREVIEW_CONCLUSION) {
    lines.push(`Supabase Preview on this head: ${process.env.PREVIEW_CONCLUSION}.`);
  }
  for (const version of extra.filter((v) => sources.has(v))) {
    lines.push(`- Ahead, carried by ${sources.get(version)}: \`${version}\``);
  }
  for (const version of missing) {
    lines.push(`- **Not applied**: \`${version}\``);
  }
  for (const version of unexplained) {
    lines.push(`- **In the database and in no branch that shares it**: \`${version}\``);
  }

  if (missing.length) {
    lines.push(
      "",
      role === "owner"
        ? "Supabase did not apply this branch's migrations. Read the Supabase Preview check for the cause."
        : `Apply the missing migrations to \`${dbBranch}\`'s database in a window coordinated with every branch that shares it, then re-run this check.`,
    );
  }
  if (unexplained.length) {
    lines.push(
      "",
      "Push the branch that wrote these versions and open its pull request into the database owner, or roll them back in a coordinated window.",
    );
  }
  summary(lines);

  if (missing.length || unexplained.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Migration lineage check failed");
  process.exitCode = 1;
});
