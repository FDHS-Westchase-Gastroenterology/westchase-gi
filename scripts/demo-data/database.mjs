/* The branch side of the demo-data tool: clinician auth accounts through the Auth admin API, and
   SQL through the Supabase CLI against the Preview branch's session pooler. Errors never echo a
   connection string or key. */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** The branch database URL, accepted only when it belongs to the resolved Preview ref. */
export function branchDatabaseUrl(target, env) {
  if (target.kind !== "preview") throw new Error("Demo data targets a hosted Preview branch");
  const value = env.POSTGRES_URL || env.POSTGRES_URL_NON_POOLING;
  if (!value) throw new Error("POSTGRES_URL or POSTGRES_URL_NON_POOLING is required");
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("The branch database URL is malformed");
  }
  const direct = url.hostname === `db.${target.ref}.supabase.co`;
  const pooler =
    url.hostname.endsWith(".pooler.supabase.com") &&
    decodeURIComponent(url.username) === `postgres.${target.ref}`;
  if (env.SUPABASE_PREVIEW_BRANCH !== "1" || !(direct || pooler))
    throw new Error("The database URL does not belong to the Preview branch");
  // Session mode keeps prepared statements working through the pooler.
  if (pooler && url.port === "6543") url.port = "5432";
  return url.toString();
}

function runQuery(dbUrl, args) {
  let output;
  try {
    output = execFileSync(
      "supabase",
      ["db", "query", "--db-url", dbUrl, "--agent=no", "--output", "json", ...args],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] },
    ).trim();
  } catch (error) {
    const detail = String(error.stderr ?? "")
      .split("\n")
      .find((line) => /ERROR|exception/i.test(line));
    throw new Error(
      `Branch database query failed${detail ? `: ${detail.replace(/postgres(ql)?:\/\/\S+/g, "<db>")}` : ""}`,
    );
  }
  // A statement without a result set prints its command tag (for example "DO") instead of JSON.
  return output.startsWith("[") ? JSON.parse(output) : [];
}

export const query = (dbUrl, sql) => runQuery(dbUrl, [sql]);

/** Runs a large script from a private temporary file, then removes it. */
export function execute(dbUrl, sql) {
  const dir = mkdtempSync(join(tmpdir(), "demo-data-"));
  const file = join(dir, "reset.sql");
  try {
    writeFileSync(file, sql, { mode: 0o600 });
    return runQuery(dbUrl, ["-f", file]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function authApi(target) {
  const headers = {
    apikey: target.serviceKey,
    Authorization: `Bearer ${target.serviceKey}`,
    "Content-Type": "application/json",
  };
  const call = async (path, init = {}) => {
    const response = await fetch(`${target.url}/auth/v1/admin/users${path}`, { ...init, headers });
    if (!response.ok)
      throw new Error(`Auth admin ${init.method ?? "GET"} failed with ${response.status}`);
    return response.status === 204 ? null : response.json();
  };
  return {
    async list() {
      const users = [];
      for (let page = 1; ; page += 1) {
        const batch = (await call(`?page=${page}&per_page=100`)).users ?? [];
        users.push(...batch);
        if (batch.length < 100) return users;
      }
    },
    create: (email) =>
      call("", {
        method: "POST",
        body: JSON.stringify({
          email,
          // Clinician accounts author notes; nobody signs in as them.
          password: randomBytes(24).toString("base64url"),
          email_confirm: true,
          app_metadata: { role: "staff" },
        }),
      }).then((body) => body.user ?? body),
    remove: (id) => call(`/${id}`, { method: "DELETE" }),
  };
}

/** Auth users the reset would create, and stranded end-to-end test users it would remove. */
export async function planAccounts(target, roster) {
  const users = await authApi(target).list();
  const byEmail = new Map(users.map((u) => [u.email?.toLowerCase(), u]));
  return {
    users,
    existing: roster.filter((c) => byEmail.has(c.email)).map((c) => c.email),
    missing: roster.filter((c) => !byEmail.has(c.email)).map((c) => c.email),
    stranded: users.filter((u) => u.email?.endsWith("@example.test")).map((u) => u.email),
  };
}

/** Finds or creates each clinician's auth user and removes stranded @example.test users. */
export async function ensureAccounts(target, roster) {
  const auth = authApi(target);
  const users = await auth.list();
  for (const user of users.filter((u) => u.email?.endsWith("@example.test")))
    await auth.remove(user.id);
  const clinicians = {};
  for (const c of roster) {
    const user =
      users.find((u) => u.email?.toLowerCase() === c.email) ?? (await auth.create(c.email));
    clinicians[c.key] = user.id;
  }
  return clinicians;
}

/* End-to-end fixtures sit outside the bar. They are the rows the e2e harness sweeps: names
   marked `TEST`, and `.test` or `queue-` addresses. */
const e2eFixture = (name, email) =>
  `(${name} like 'TEST %' or coalesce(${email}, '') ilike '%.test' or coalesce(${email}, '') like 'queue-%')`;

/** Live rows the content bar reads, shaped like a generated dataset, without e2e fixtures. */
export function liveContent(dbUrl) {
  const patient = e2eFixture("p.name", "p.email");
  const request = e2eFixture("r.name", "r.email");
  const [row] = query(
    dbUrl,
    `select
      (select coalesce(json_agg(json_build_object('name',name,'email',email,'phone',phone)),'[]') from public.patients p where not ${patient}) as patients,
      (select coalesce(json_agg(json_build_object('name',name,'email',email,'phone',phone,'message',message,'source_path',source_path)),'[]') from public.requests r where not ${request}) as requests,
      (select coalesce(json_agg(json_build_object('type',e.type,'meta',e.meta)),'[]') from public.request_events e join public.requests r on r.id = e.request_id where e.type = 'note' and not ${request}) as request_events,
      (select coalesce(json_agg(json_build_object('title',c.title,'note_text',c.note_text)),'[]') from public.patient_clinical_records c join public.patients p on p.id = c.patient_id where not ${patient}) as patient_clinical_records,
      (select coalesce(json_agg(json_build_object('reason',a.reason)),'[]') from public.appointments a join public.patients p on p.id = a.patient_id where a.reason is not null and not ${patient}) as appointments,
      (select coalesce(json_agg(json_build_object('name',display_name,'email',email)),'[]') from public.staff_profiles where role = 'staff' and active and email not ilike '%@example.test') as clinicians,
      (select count(*) from public.patients p where ${patient}) + (select count(*) from public.requests r where ${request}) as e2e_fixtures`,
  );
  const { clinicians, e2e_fixtures: e2eFixtures, ...rows } = row;
  return { rows, staff: { clinicians }, e2eFixtures: Number(e2eFixtures) };
}

/** The operator: an existing, active admin profile that stands in for the front desk. */
export function findOperator(dbUrl, email) {
  if (!email) throw new Error("Pass --operator <email> or set PORTAL_SEED_ADMIN_EMAIL");
  const literal = `'${email.trim().toLowerCase().replaceAll("'", "''")}'`;
  // The CLI renders a uuid column as a byte array, so the id is cast to text.
  const [row] = query(
    dbUrl,
    `select user_id::text as id, email from public.staff_profiles where lower(email) = ${literal} and role = 'admin' and active`,
  );
  if (!row) throw new Error("The operator must be an active admin staff profile on the branch");
  return row;
}

/** CI and end-to-end runs share the branch database; the reset waits until none is writing.
    Returns null when the GitHub CLI cannot answer. */
export function inFlightCiRuns(workflow) {
  try {
    const runs = JSON.parse(
      execFileSync(
        "gh",
        [
          "run",
          "list",
          "--workflow",
          workflow,
          "--limit",
          "30",
          "--json",
          "status,headBranch,databaseId",
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ),
    );
    return runs.filter((r) => r.status !== "completed");
  } catch {
    return null;
  }
}
