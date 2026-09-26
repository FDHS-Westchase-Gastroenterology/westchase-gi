import { createHash, randomUUID } from "node:crypto";

import { orderQueueRows } from "../src/lib/portal/queue-attention.ts";
import {
  REQUEST_STATES,
  normalizeRequestState,
  presentationStatus,
} from "../src/lib/portal/workflow/contracts.ts";
import { PORTAL_REVIEW_COUNTS, countsFromEnv, generatePatients } from "./dev-patients.mjs";

export function scenarioCounts(profile, env) {
  if (profile === "portal-review") return { ...PORTAL_REVIEW_COUNTS };
  if (profile === "custom") return countsFromEnv(env);
  throw new Error("Unknown profile; choose portal-review or custom");
}

export function seededRandom(seed) {
  let state = createHash("sha256").update(seed).digest().readUInt32LE(0);
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function generateScenario(profile, env, seed, now) {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid reference clock");
  const id = (index) => {
    const hex = createHash("sha256")
      .update(`${seed}:${now.toISOString()}:${String(index)}`)
      .digest("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  };
  return generatePatients(scenarioCounts(profile, env), now, seededRandom(seed), id);
}

export function materializeScenario(scenario) {
  const ids = new Map(scenario.requests.map((row) => [row.id, randomUUID()]));
  return {
    requests: scenario.requests.map((row) => ({ ...row, id: ids.get(row.id) })),
    events: scenario.events.map((row) => ({ ...row, request_id: ids.get(row.request_id) })),
  };
}

export function summarizeRequests(requests, now, audit = []) {
  const stored = Object.fromEntries(REQUEST_STATES.map((state) => [state, 0]));
  const displayed = { New: 0, "Call Again": 0, Scheduled: 0, Closed: 0 };
  const labels = { new: "New", contacted: "Call Again", scheduled: "Scheduled", closed: "Closed" };
  const rows = requests.map((row) => {
    const state = normalizeRequestState(row.status);
    if (!state) throw new Error("Unknown stored request state");
    stored[state] += 1;
    const status = presentationStatus(state);
    displayed[labels[status]] += 1;
    return { ...row, status };
  });
  const attention = {};
  const activity = new Map();
  for (const row of audit) {
    if (
      row.entity === "requests" &&
      (!activity.has(row.entity_id) || Date.parse(row.at) > Date.parse(activity.get(row.entity_id)))
    )
      activity.set(row.entity_id, row.at);
  }
  for (const row of orderQueueRows(rows, activity, now))
    attention[row.bucket] = (attention[row.bucket] ?? 0) + 1;
  return { total: requests.length, stored, displayed, attention };
}
