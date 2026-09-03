import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

import { asJsonObject, asJsonString, jsonSchema } from "../src/lib/json.ts";

export const SEED_SOURCE_PATH = "/seed";
export const SEED_EMAIL_DOMAIN = "mock.com";

const LOCATIONS = ["tampa", "lutz", "any"];
const TIMES = ["morning", "afternoon", "any"];
const LOCALES = ["en", "es", "en", "vi", "en"];
const MESSAGES = [
  "Prefers a callback after 2.",
  "Asked about the Lutz office.",
  "Can do mornings only this week.",
  "Left a voicemail on the text line.",
  null,
  null,
];

/** Fifty fictional patients. Phones and emails are generated per run. */
export const PATIENT_NAMES = [
  ["Maria", "Santos"],
  ["James", "Okonkwo"],
  ["Linh", "Tran"],
  ["Rosa", "Alvarez"],
  ["David", "Kim"],
  ["Priya", "Shah"],
  ["Hassan", "Ibrahim"],
  ["Elena", "Vargas"],
  ["Michael", "Brennan"],
  ["Sofia", "Delgado"],
  ["Anthony", "Nguyen"],
  ["Keisha", "Walters"],
  ["Carlos", "Herrera"],
  ["Naomi", "Patel"],
  ["Robert", "Lang"],
  ["Fatima", "Elsayed"],
  ["Daniel", "Brooks"],
  ["Yuki", "Tanaka"],
  ["Patricia", "Morales"],
  ["Omar", "Farouk"],
  ["Hannah", "Goldstein"],
  ["Luis", "Romero"],
  ["Grace", "Whitfield"],
  ["Victor", "Chen"],
  ["Aisha", "Rahman"],
  ["Thomas", "Gallagher"],
  ["Camila", "Rojas"],
  ["Benjamin", "Cruz"],
  ["Ingrid", "Solberg"],
  ["Marcus", "Bennett"],
  ["Diana", "Flores"],
  ["Samuel", "Wright"],
  ["Nora", "Haddad"],
  ["Peter", "Kowalski"],
  ["Isabel", "Moreira"],
  ["Julian", "Park"],
  ["Teresa", "Bianchi"],
  ["Andre", "Baptiste"],
  ["Helen", "Cho"],
  ["Rafael", "Duarte"],
  ["Monica", "Singh"],
  ["Kevin", "Obrien"],
  ["Amara", "Diallo"],
  ["Joseph", "Marino"],
  ["Leila", "Karimi"],
  ["Andrew", "Feldman"],
  ["Carmen", "Ruiz"],
  ["Nathan", "Price"],
  ["Sonia", "Kapoor"],
  ["Anne-Marie", "Dubois"],
];

const DEFAULT_COUNTS = {
  new: 10,
  callAgain: 3,
  stale: 1,
  upcoming: 1,
  booked: 0,
  closed: 0,
};

export function patientEmail(first, last) {
  return `${slug(first)}_${slug(last)}@${SEED_EMAIL_DOMAIN}`;
}

export function countsFromEnv(env) {
  const newCount = readCount(env.DEV_SEED_NEW, DEFAULT_COUNTS.new);
  const callAgain = readCount(env.DEV_SEED_CALL_AGAIN, DEFAULT_COUNTS.callAgain);
  const stale = readCount(env.DEV_SEED_STALE, DEFAULT_COUNTS.stale);
  const upcoming = readCount(env.DEV_SEED_UPCOMING, DEFAULT_COUNTS.upcoming);
  const booked = readCount(env.DEV_SEED_BOOKED, DEFAULT_COUNTS.booked);
  const closed = readCount(env.DEV_SEED_CLOSED, DEFAULT_COUNTS.closed);
  const named = newCount + callAgain + stale + upcoming + booked + closed;
  const patients = readCount(env.DEV_SEED_PATIENTS, named);
  if (patients < named) {
    throw new Error(
      `DEV_SEED_PATIENTS (${patients}) is below the configured bucket total (${named})`,
    );
  }
  return {
    new: newCount + (patients - named),
    callAgain,
    stale,
    upcoming,
    booked,
    closed,
  };
}

export function generatePatients(counts, now, rng) {
  const roles = [
    ...repeat("new", counts.new),
    ...repeat("callAgain", counts.callAgain),
    ...repeat("stale", counts.stale),
    ...repeat("upcoming", counts.upcoming),
    ...repeat("booked", counts.booked),
    ...repeat("closed", counts.closed),
  ];
  if (roles.length > PATIENT_NAMES.length) {
    throw new Error(`Need ${roles.length} names; the pool only has ${PATIENT_NAMES.length}`);
  }

  const names = shuffle(PATIENT_NAMES, rng).slice(0, roles.length);
  const phones = new Set();
  const requests = [];
  const events = [];

  for (let index = 0; index < roles.length; index += 1) {
    const [first, last] = names[index];
    const id = randomUUID();
    const role = roles[index];
    const createdHours = createdHoursFor(role, index);
    const createdAt = hoursAgo(now, createdHours);
    const row = {
      id,
      name: `${first} ${last}`,
      phone: uniquePhone(rng, phones),
      email: patientEmail(first, last),
      location: LOCATIONS[index % LOCATIONS.length],
      preferred_time: TIMES[index % TIMES.length],
      message: MESSAGES[index % MESSAGES.length],
      locale: LOCALES[index % LOCALES.length],
      source_path: SEED_SOURCE_PATH,
      status: statusFor(role),
      created_at: createdAt,
      follow_up_at: null,
      record_handoff_at: null,
      closed_at: null,
      closure_reason: null,
      legacy_review_required: false,
    };

    if (role === "callAgain") {
      row.follow_up_at = hoursAgo(now, index % 3);
    } else if (role === "upcoming") {
      row.follow_up_at = hoursAgo(now, -36);
    } else if (role === "booked") {
      row.record_handoff_at = hoursAgo(now, 24);
    } else if (role === "closed") {
      row.closed_at = hoursAgo(now, 20);
      row.closure_reason = index % 2 === 0 ? "not_actionable" : "wont_schedule";
    }

    if (role === "callAgain" || role === "stale" || role === "upcoming") {
      events.push({
        request_id: id,
        type: "contact_attempt",
        status: "recorded",
        meta: {
          outcome: role === "stale" ? "voicemail" : "no_answer",
          author_email: "seed.staff@example.test",
        },
        created_at: hoursAgo(now, createdHours - 6),
      });
    }

    requests.push(row);
  }

  return { requests, events };
}

export function resolveDevTarget(env) {
  const url = firstEnv(env, "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
  const serviceKey = firstEnv(env, "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY");
  if (url === null || serviceKey === null) return null;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("DEV_SEED target URL is not valid");
  }

  const loopback = new Set(["127.0.0.1", "localhost", "[::1]"]).has(parsed.hostname);
  const hosted = parsed.hostname.endsWith(".supabase.co");
  if (!loopback && !hosted) {
    throw new Error("Patient fixtures only write to loopback or a Supabase Preview Branch");
  }

  const projectRef = firstEnv(env, "SUPABASE_BRANCH_PROJECT_REF", "SUPABASE_PROJECT_REF");
  const productionRef = firstEnv(env, "SUPABASE_PROD_PROJECT_REF", "SUPABASE_PROJECT_REF_PROD");
  if (projectRef !== null && productionRef !== null && projectRef === productionRef) {
    throw new Error("Refusing to seed Production");
  }

  const productionUrl = firstEnv(env, "SUPABASE_URL_PROD", "SUPABASE_PROD_URL");
  if (productionUrl !== null && hostnameOf(productionUrl) === parsed.hostname) {
    throw new Error("Refusing to seed Production");
  }

  if (hosted && !isPreviewBranch(env, projectRef, productionRef)) {
    throw new Error("Hosted targets must be a Preview Branch, not Production");
  }

  return { url: url.replace(/\/$/u, ""), serviceKey };
}

export async function seedDevPatients(env) {
  if (env.CI === "true" || env.CI === "1") {
    console.log("Skipping patient fixtures (CI)");
    return "skipped";
  }
  if (env.DEV_SEED === "0") {
    console.log("Skipping patient fixtures (DEV_SEED=0)");
    return "skipped";
  }

  const target = resolveDevTarget(env);
  if (target === null) {
    console.log("Skipping patient fixtures (no local or Preview Branch credentials)");
    return "skipped";
  }

  const counts = countsFromEnv(env);
  const { requests, events } = generatePatients(counts, new Date(), Math.random);
  await replaceSeedRows(target.url, target.serviceKey, requests, events);
  console.log(
    `Seeded ${String(requests.length)} fictional patients: new=${String(counts.new)}, call-again=${String(counts.callAgain)}, stale=${String(counts.stale)}, upcoming=${String(counts.upcoming)}, booked=${String(counts.booked)}, closed=${String(counts.closed)}`,
  );
  return "seeded";
}

function slug(value) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z]/gu, "");
}

function readCount(value, fallback) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || String(parsed) !== value.trim()) {
    throw new Error(`Expected a whole number ≥ 0, got ${value}`);
  }
  return parsed;
}

function firstEnv(env, ...names) {
  for (const name of names) {
    const value = env[name];
    if (value) return value;
  }
  return null;
}

function hostnameOf(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function isPreviewBranch(env, projectRef, productionRef) {
  const marker = env.SUPABASE_PREVIEW_BRANCH;
  if (marker && marker !== "0" && marker !== "false") return true;
  return projectRef !== null && productionRef !== null && projectRef !== productionRef;
}

function repeat(role, count) {
  return Array.from({ length: count }, () => role);
}

function shuffle(items, rng) {
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swap];
    copy[swap] = current;
  }
  return copy;
}

function uniquePhone(rng, used) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const suffix = String(Math.floor(rng() * 100)).padStart(2, "0");
    const phone = `81355501${suffix}`;
    if (!used.has(phone)) {
      used.add(phone);
      return phone;
    }
  }
  throw new Error("Could not allocate a unique fictional phone");
}

function statusFor(role) {
  if (role === "booked") return "booked";
  if (role === "closed") return "closed";
  if (role === "new") return "new";
  return "contacted";
}

function createdHoursFor(role, index) {
  if (role === "new") return 2 + index * 4;
  if (role === "callAgain") return 48 + index * 5;
  if (role === "stale") return 120 + index;
  if (role === "upcoming") return 40 + index;
  if (role === "booked") return 96 + index;
  return 140 + index;
}

function hoursAgo(now, hours) {
  return new Date(now.getTime() - hours * 3_600_000).toISOString();
}

function providerErrorMessage(payload) {
  const parsed = jsonSchema.safeParse(payload);
  if (!parsed.success) return null;
  const object = asJsonObject(parsed.data);
  if (!object) return null;
  return asJsonString(object.message) ?? asJsonString(object.msg) ?? asJsonString(object.error);
}

function authHeaders(serviceKey) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
}

async function readResponse(response, operation) {
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (!response.ok) {
    const message = providerErrorMessage(payload);
    throw new Error(
      `${operation} failed (${String(response.status)})${message ? `: ${message}` : ""}`,
    );
  }
  return payload;
}

async function replaceSeedRows(url, serviceKey, requests, events) {
  const cleared = await fetch(
    `${url}/rest/v1/requests?source_path=eq.${encodeURIComponent(SEED_SOURCE_PATH)}`,
    { method: "DELETE", headers: authHeaders(serviceKey) },
  );
  await readResponse(cleared, "Clear seed requests");

  if (requests.length === 0) return;

  const inserted = await fetch(`${url}/rest/v1/requests`, {
    method: "POST",
    headers: {
      ...authHeaders(serviceKey),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(requests),
  });
  await readResponse(inserted, "Insert seed requests");

  if (events.length === 0) return;

  const recorded = await fetch(`${url}/rest/v1/request_events`, {
    method: "POST",
    headers: {
      ...authHeaders(serviceKey),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(events),
  });
  await readResponse(recorded, "Insert seed events");
}

function loadLocalEnv() {
  try {
    process.loadEnvFile(".env.local");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function main() {
  loadLocalEnv();
  await seedDevPatients(process.env);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Patient fixture seed failed");
    process.exitCode = 1;
  });
}
