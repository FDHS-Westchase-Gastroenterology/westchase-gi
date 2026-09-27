import { createHash } from "node:crypto";

import { PATIENT_NAMES, SEED_SOURCE_PATH, patientEmail } from "./dev-patients.mjs";

export const CHILD_TABLES = {
  request_events: "request_id",
  request_transitions: "request_id",
  request_command_receipts: "request_id",
  notification_outbox: "request_id",
  staff_request_receipts: "request_id",
  patient_request_links: "request_id",
  appointments: "source_request_id",
  audit_log: "entity_id",
};

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && value !== undefined && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

export function digest(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}

export function seedRows(snapshot) {
  return snapshot.requests.filter((row) => row.source_path === SEED_SOURCE_PATH);
}

export function scopeSnapshot(snapshot, ids, include) {
  const selected = new Set(ids);
  const scope = {};
  for (const [table, rows] of Object.entries(snapshot)) {
    const column = table === "requests" ? "id" : CHILD_TABLES[table];
    scope[table] = rows
      .filter((row) => selected.has(row[column]) === include)
      .map(canonical)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  return scope;
}

export function scopeBlockers(snapshot, ids = seedRows(snapshot).map((row) => row.id)) {
  const scope = scopeSnapshot(snapshot, ids, true);
  const names = new Map(
    PATIENT_NAMES.map(([first, last]) => [`${first} ${last}`, patientEmail(first, last)]),
  );
  const blockers = [];
  if (
    scope.requests.some(
      (row) =>
        row.source_path !== SEED_SOURCE_PATH ||
        !names.has(row.name) ||
        names.get(row.name) !== row.email ||
        !/^81355501\d{2}$/u.test(row.phone),
    )
  ) {
    blockers.push("Seed provenance mismatch; preserve and review these records");
  }
  if (scope.requests.some((row) => row.retention_hold_at))
    blockers.push("Seed requests include retention holds");
  if (scope.patient_request_links.length || scope.appointments.length)
    blockers.push("Seed requests have patient or appointment links; preserve those records");
  if (scope.audit_log.length)
    blockers.push("Seed requests have retained audit history; preserve those records for review");
  return blockers;
}

export function createSeedStore(target, fetcher = fetch) {
  const headers = {
    apikey: target.serviceKey,
    Authorization: `Bearer ${target.serviceKey}`,
    "Content-Type": "application/json",
  };
  async function request(table, query, method = "GET", body) {
    const init = {
      method,
      headers: { ...headers, Prefer: method === "GET" ? "count=exact" : "return=minimal" },
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    };
    if (body) init.body = JSON.stringify(body);
    const response = await fetcher(`${target.url}/rest/v1/${table}?${query}`, init);
    if (!response.ok)
      throw new Error(`${method} ${table} failed (HTTP ${String(response.status)})`);
    return response;
  }
  async function rows(table, filter = "") {
    const result = [];
    const order =
      table === "staff_profiles"
        ? "user_id"
        : table === "staff_request_receipts"
          ? "idempotency_key"
          : table === "patient_request_links"
            ? "request_id"
            : "id";
    for (let offset = 0; offset < 10000; offset += 1000) {
      const response = await request(
        table,
        `select=*&order=${order}&limit=1000&offset=${String(offset)}${filter ? `&${filter}` : ""}`,
      );
      const page = await response.json();
      const total = Number(response.headers.get("content-range")?.split("/")[1]);
      if (!Array.isArray(page) || !Number.isInteger(total) || total < 0)
        throw new Error(`Incomplete ${table} response`);
      result.push(...page);
      if (result.length === total) return result;
      if (page.length !== 1000 || total > 10000)
        throw new Error(`Incomplete ${table} read; refusing a truncated snapshot`);
    }
    throw new Error(`Too many ${table} rows for development fixtures`);
  }
  async function snapshot(extraIds = []) {
    const requests = await rows("requests");
    const ids = [...new Set([...requests.map((row) => row.id), ...extraIds])];
    const children = await Promise.all(
      Object.entries(CHILD_TABLES).map(async ([table, column]) => {
        const batches = [];
        for (let index = 0; index < ids.length; index += 100) {
          batches.push(rows(table, `${column}=in.(${ids.slice(index, index + 100).join(",")})`));
        }
        return [table, (await Promise.all(batches)).flat()];
      }),
    );
    return { requests, ...Object.fromEntries(children) };
  }
  return {
    rows,
    snapshot,
    async insert(table, values) {
      if (values.length) await request(table, "", "POST", values);
    },
    async remove(ids) {
      if (ids.length)
        await request(
          "requests",
          `source_path=eq.${encodeURIComponent(SEED_SOURCE_PATH)}&id=in.(${ids.join(",")})`,
          "DELETE",
        );
    },
  };
}

function normalizedProjection(row, fields) {
  return Object.fromEntries(
    fields.map((key) => [
      key,
      key.endsWith("_at") && row[key] ? new Date(row[key]).toISOString() : row[key],
    ]),
  );
}

export function assertGenerated(snapshot, generated, partial = false) {
  const ids = generated.requests.map((row) => row.id);
  const scope = scopeSnapshot(snapshot, ids, true);
  if (!partial && scope.requests.length !== generated.requests.length)
    throw new Error("Generated request count mismatch");
  for (const planned of generated.requests) {
    const actual = scope.requests.find((row) => row.id === planned.id);
    if (partial && !actual) continue;
    const fields = Object.keys(planned);
    if (
      !actual ||
      actual.version !== 1 ||
      digest(normalizedProjection(actual, fields)) !== digest(normalizedProjection(planned, fields))
    ) {
      throw new Error("Generated request fields differ; preserve for review");
    }
  }
  const fields = ["request_id", "type", "status", "meta", "created_at"];
  const hashes = (events) => events.map((row) => digest(normalizedProjection(row, fields))).sort();
  const remaining = hashes(generated.events);
  for (const hash of hashes(scope.request_events)) {
    const index = remaining.indexOf(hash);
    if (index === -1) throw new Error("Generated child events differ");
    remaining.splice(index, 1);
  }
  if (!partial && remaining.length) throw new Error("Generated child events differ");
  if (scopeBlockers(snapshot, ids).length)
    throw new Error("Generated requests acquired protected fields or links");
  for (const table of Object.keys(CHILD_TABLES).filter((name) => name !== "request_events")) {
    if (scope[table].length)
      throw new Error("Generated requests acquired related records; preserve for review");
  }
}
