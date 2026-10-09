import { randomUUID } from "node:crypto";

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

export const PORTAL_REVIEW_COUNTS = {
  new: 10,
  callAgain: 10,
  stale: 1,
  upcoming: 1,
  booked: 5,
  closed: 5,
};

export function patientEmail(first, last) {
  return `${slug(first)}_${slug(last)}@${SEED_EMAIL_DOMAIN}`;
}

export function countsFromEnv(env) {
  const newCount = readCount(env.DEV_SEED_NEW, PORTAL_REVIEW_COUNTS.new);
  const callAgain = readCount(env.DEV_SEED_CALL_AGAIN, PORTAL_REVIEW_COUNTS.callAgain);
  const stale = readCount(env.DEV_SEED_STALE, PORTAL_REVIEW_COUNTS.stale);
  const upcoming = readCount(env.DEV_SEED_UPCOMING, PORTAL_REVIEW_COUNTS.upcoming);
  const booked = readCount(env.DEV_SEED_BOOKED, PORTAL_REVIEW_COUNTS.booked);
  const closed = readCount(env.DEV_SEED_CLOSED, PORTAL_REVIEW_COUNTS.closed);
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

export function generatePatients(counts, now, rng, idForIndex = () => randomUUID()) {
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
    const id = idForIndex(index);
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
      appointment_at: null,
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
      row.appointment_at = hoursAgo(now, -24 * (1 + (index % 5)));
    } else if (role === "closed") {
      row.closed_at = hoursAgo(now, 20);
      row.closure_reason = index % 2 === 0 ? "not_actionable" : "wont_schedule";
    }

    events.push({
      request_id: id,
      type: "created",
      status: "recorded",
      meta: {},
      created_at: createdAt,
    });

    if (role === "callAgain" || role === "stale" || role === "upcoming") {
      events.push({
        request_id: id,
        type: "contact_attempt",
        status: "recorded",
        meta: {
          outcome: role === "stale" ? "voicemail" : "no_answer",
          author_email: "seed.staff@example.test",
          follow_up_at: row.follow_up_at,
        },
        created_at: hoursAgo(now, createdHours - 6),
      });
    }

    requests.push(row);
  }

  return { requests, events };
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
