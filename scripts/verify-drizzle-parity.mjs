/**
 * Proves that `rpc()` over a direct Postgres connection answers exactly as PostgREST did.
 *
 * Calls the same functions with the same arguments through supabase-js (PostgREST, as the
 * service role) and through `rpc()` on `POSTGRES_URL`, and requires the `{ data, error }`
 * pairs to be deep-equal: results, JSON shapes, and each error's SQLSTATE, message, details
 * and hint. Then checks that the generated registry in `src/lib/db/functions.ts` matches the
 * database's `pg_proc`.
 *
 * Read-only. Every function it calls must be STABLE or IMMUTABLE in the database, where
 * PostgreSQL refuses writes; that is checked before the first call. Runs only against the
 * allowlisted Preview Branch (`e2e/harness/target-guard.ts`), with a `POSTGRES_URL` for the
 * same project, and prints no row values.
 *
 *   node --import ./test/register.mjs scripts/verify-drizzle-parity.mjs
 */

import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import { createClient } from "@supabase/supabase-js";

import { openDatabase } from "@/lib/db/client";
import { supabaseProjectRef } from "@/lib/db/connection";
import { databaseFunctions } from "@/lib/db/functions";
import { rpc } from "@/lib/db/rpc";

import { assertSafeE2ETarget } from "../e2e/harness/target-guard.ts";

function requireEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`Missing required environment variable: ${names.join(" or ")}`);
}

function target() {
  assertSafeE2ETarget(process.env);
  const ref = requireEnv("SUPABASE_BRANCH_PROJECT_REF", "SUPABASE_PROJECT_REF");
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (new URL(url).hostname !== `${ref}.supabase.co`) {
    throw new Error("Parity runs only against a hosted Preview Branch");
  }
  const postgresUrl = requireEnv("POSTGRES_URL");
  if (supabaseProjectRef(new URL(postgresUrl)) !== ref) {
    throw new Error("POSTGRES_URL does not name the allowlisted Preview Branch");
  }
  return {
    url,
    postgresUrl,
    serviceKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"),
  };
}

/** The part of a result a caller reads, as plain data on both sides. */
function comparable({ data, error }) {
  return {
    data: data ?? null,
    error:
      error === null
        ? null
        : { code: error.code, message: error.message, details: error.details, hint: error.hint },
  };
}

/** Where two values first differ, by path and type only, so no row value reaches the log. */
function firstDifference(left, right, path = "$") {
  if (isDeepStrictEqual(left, right)) return null;
  // "[object Object]", "[object Array]", "[object String]", "[object Null]" and so on.
  const kind = (value) => Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
  if (kind(left) !== kind(right) || (kind(left) !== "object" && kind(left) !== "array")) {
    const same = kind(left) === kind(right);
    return `${path}: ${kind(left)} vs ${kind(right)}${same ? " (values differ)" : ""}`;
  }
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if (!(key in left) || !(key in right)) {
      return `${path}.${key}: ${key in left ? "only through PostgREST" : "only through Drizzle"}`;
    }
    const inner = firstDifference(left[key], right[key], `${path}.${key}`);
    if (inner) return inner;
  }
  return `${path}: differs`;
}

const REGISTRY_QUERY = `
  select coalesce(json_agg(f order by f.name), '[]')::text as functions from (
    select p.proname as name,
           coalesce(p.proargnames, '{}') as "argNames",
           array(
             select format_type(t, null)
             from unnest(p.proargtypes::oid[]) with ordinality as u(t, i)
             order by i
           ) as "argTypes",
           format_type(p.prorettype, null) as returns
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and not p.proretset
      and p.prorettype <> 'trigger'::regtype
      and has_function_privilege('service_role', p.oid, 'EXECUTE')
  ) f`;

/** Differences between the generated registry and what the database exposes. */
async function registryDrift(db) {
  const [{ functions }] = await db.transaction((sql) => sql.unsafe(REGISTRY_QUERY));
  const live = new Map(
    JSON.parse(functions).map((fn) => [
      fn.name,
      {
        args: fn.argTypes.map((type, index) => [fn.argNames[index], type]),
        returns: fn.returns,
      },
    ]),
  );
  const drift = [];
  for (const [name, generated] of Object.entries(databaseFunctions)) {
    const actual = live.get(name);
    if (!actual) drift.push(`${name}: in the registry, not in the database`);
    else if (!isDeepStrictEqual({ args: generated.args, returns: generated.returns }, actual)) {
      drift.push(`${name}: signature differs`);
    }
  }
  for (const name of live.keys()) {
    if (!(name in databaseFunctions)) drift.push(`${name}: in the database, not in the registry`);
  }
  return { drift, count: live.size };
}

async function staffActors(db) {
  const rows = await db.transaction((sql) =>
    sql.unsafe(`
    select distinct on (role) role, user_id::text as id
    from public.staff_profiles
    where active and onboarded_at is not null
    order by role, onboarded_at`),
  );
  return new Map(rows.map((row) => [row.role, row.id]));
}

function cases(actors) {
  const unknown = randomUUID();
  const list = [
    ["no arguments", "portal_booking_interval", {}],
    ["a name with punctuation", "portal_name_key", { p_name: "Ann-Marie O'Brien" }],
    ["a name with accents and spaces", "portal_name_key", { p_name: "  Zoë d'Arcy-Núñez " }],
    ["a null argument", "portal_name_key", { p_name: null }],
    ["an unknown actor", "portal_read_activity", { p_actor_id: unknown }],
    ["a malformed uuid (22P02)", "portal_read_activity", { p_actor_id: "not-a-uuid" }],
    [
      "an impossible date (22008)",
      "portal_read_activity",
      { p_actor_id: unknown, p_from: "2026-02-30" },
    ],
    [
      "an integer overflow (22003)",
      "portal_read_activity",
      { p_actor_id: unknown, p_limit: 2 ** 40 },
    ],
    ["a malformed timestamp", "portal_read_activity", { p_actor_id: unknown, p_before_at: "soon" }],
  ];
  for (const [role, id] of actors) {
    list.push(
      [`${role}: first page`, "portal_read_activity", { p_actor_id: id, p_limit: 5 }],
      [
        `${role}: filtered page`,
        "portal_read_activity",
        { p_actor_id: id, p_categories: ["requests", "appointments"], p_limit: 3 },
      ],
      [
        `${role}: search`,
        "portal_read_activity",
        {
          p_actor_id: id,
          p_query: "appointment",
          p_from: "2026-01-01",
          p_to: "2026-12-31",
          p_limit: 4,
        },
      ],
      [
        `${role}: unknown category`,
        "portal_read_activity",
        { p_actor_id: id, p_categories: ["nope"] },
      ],
    );
  }
  return list;
}

async function assertReadOnly(db, names) {
  const rows = await db.transaction((sql) =>
    sql.unsafe(
      `select p.proname as name, p.provolatile as volatility
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.proname in (select json_array_elements_text($1::text::json))`,
      [JSON.stringify([...names])],
    ),
  );
  const refused = [...names].filter((name) => {
    const overloads = rows.filter((row) => row.name === name);
    return overloads.length === 0 || overloads.some((row) => row.volatility === "v");
  });
  if (refused.length > 0) {
    throw new Error(`Refusing functions that are not STABLE or IMMUTABLE: ${refused.join(", ")}`);
  }
}

/* The branch is shared, so a row written between the two calls can change a page. A real
   difference in shape repeats on every attempt; a concurrent write does not. */
const ATTEMPTS = 3;

async function compare(postgrest, db, name, args) {
  let result;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const viaPostgrest = comparable(await postgrest.rpc(name, args));
    const viaDrizzle = comparable(await rpc(db, name, args));
    result = {
      viaPostgrest,
      difference: firstDifference(viaPostgrest, viaDrizzle),
      attempts: attempt,
    };
    if (result.difference === null) break;
  }
  return result;
}

async function main() {
  const { url, postgresUrl, serviceKey } = target();
  const postgrest = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const db = openDatabase(postgresUrl, url);
  let failures = 0;
  try {
    const actors = await staffActors(db);
    const list = cases(actors);
    await assertReadOnly(db, new Set(list.map(([, name]) => name)));

    for (const [label, name, args] of list) {
      const { viaPostgrest, difference, attempts } = await compare(postgrest, db, name, args);
      const rows = Array.isArray(viaPostgrest.data?.rows)
        ? `, ${viaPostgrest.data.rows.length} rows`
        : "";
      const outcome = viaPostgrest.error ? `error ${viaPostgrest.error.code}` : `data${rows}`;
      const retried = attempts > 1 ? `, equal on attempt ${attempts}` : "";
      if (difference === null) {
        console.log(`ok   ${name}: ${label} (${outcome}${retried})`);
      } else {
        failures += 1;
        console.log(`FAIL ${name}: ${label} (${outcome}): ${difference}`);
      }
    }

    const { drift, count } = await registryDrift(db);
    if (drift.length === 0) {
      console.log(`ok   registry: ${count} functions match pg_proc`);
    } else {
      failures += drift.length;
      for (const line of drift) console.log(`FAIL registry: ${line}`);
    }
    if (actors.size === 0) {
      console.log("note no onboarded staff on this branch; staff pages were not compared");
    }
  } finally {
    await db.close();
  }
  if (failures > 0) {
    console.error(`${failures} parity check(s) failed`);
    process.exit(1);
  }
}

await main();
