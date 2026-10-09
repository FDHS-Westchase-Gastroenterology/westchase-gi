import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

import { requestWorklistOutcomeSchema } from "../src/lib/portal/request-worklist/contracts.ts";
import { readRequestWorklist } from "../src/lib/portal/request-worklist/service.ts";
import {
  presentationStatus,
  normalizeRequestState,
  REQUEST_STATUSES,
} from "../src/lib/portal/workflow/contracts.ts";
import { digest } from "./dev-patients-store.mjs";
import { loopbackOrigin } from "./dev-patients-target.mjs";

async function compareWorklist(readPage, requests) {
  const items = [];
  const counts = Object.fromEntries(
    REQUEST_STATUSES.map((status) => [
      status,
      requests.filter((row) => presentationStatus(normalizeRequestState(row.status)) === status)
        .length,
    ]),
  );
  let offset = 0;
  while (true) {
    const outcome = await readPage({ action: "page", offset, limit: 200 });
    if (!outcome.ok) throw new Error(`App worklist read failed: ${outcome.code}`);
    if (outcome.total !== requests.length)
      throw new Error("App worklist total differs from database");
    if (digest(outcome.counts) !== digest(counts))
      throw new Error("App worklist status counts differ from database");
    items.push(...outcome.items);
    if (outcome.nextOffset === null) break;
    if (outcome.nextOffset <= offset || items.length > requests.length)
      throw new Error("App worklist pagination did not advance");
    offset = outcome.nextOffset;
  }
  const projected = (rows) =>
    rows
      .map((row) => ({
        id: row.id,
        status: presentationStatus(normalizeRequestState(row.status)),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  if (digest(projected(items)) !== digest(projected(requests)))
    throw new Error("App worklist membership or statuses differ from database");
  return { checked: true, total: items.length };
}

export async function verifyAppRead(target, store, requests, env, now, options) {
  if (!env.PORTAL_SEED_ADMIN_EMAIL)
    throw new Error("App verification requires PORTAL_SEED_ADMIN_EMAIL");
  const staff = await store.rows(
    "staff_profiles",
    `email=eq.${encodeURIComponent(env.PORTAL_SEED_ADMIN_EMAIL)}`,
  );
  const actor = staff.find((row) => row.active && row.onboarded_at && row.role === "admin");
  if (!actor) throw new Error("App verification requires an active, onboarded seed admin");
  const db = createClient(target.url, target.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = {
    serverReadModel: await compareWorklist(
      (input) => readRequestWorklist(db, actor.user_id, input, now),
      requests,
    ),
    http: {
      checked: false,
      reason:
        "Supply --app-url and an existing --storage-state to check authenticated HTTP without signing in",
    },
  };
  if (!options.appUrl && !options.storageState) return result;
  if (!options.appUrl || !options.storageState)
    throw new Error("App HTTP verification requires both --app-url and --storage-state");
  const origin = loopbackOrigin(options.appUrl);
  const saved = JSON.parse(readFileSync(options.storageState, "utf8"));
  const host = new URL(origin).hostname;
  const cookies = saved.cookies.filter(
    (cookie) =>
      cookie.domain.replace(/^\./u, "") === host &&
      (cookie.expires === -1 || cookie.expires > Date.now() / 1000),
  );
  if (!cookies.length) throw new Error("No existing unexpired app cookies in storage state");
  result.http = await compareWorklist(async (input) => {
    const response = await fetch(`${origin}/api/admin/request-worklist`, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        Cookie: cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; "),
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`App HTTP read failed (HTTP ${String(response.status)})`);
    const parsed = requestWorklistOutcomeSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("App HTTP response does not match the worklist contract");
    return parsed.data;
  }, requests);
  return result;
}
