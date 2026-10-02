/* Appointment requests in every worklist state, each with the transitions, contact attempts and
   notes the portal would have written. Booked requests hand off to a real new-patient
   consultation on the schedule. */
import {
  CONDITIONS,
  CONTACT_NOTES,
  NEW_REQUEST_MESSAGES,
  STAFF_REQUEST_MESSAGES,
} from "./content.mjs";
import {
  DAY,
  HOUR,
  MIN,
  addDays,
  clockLabel,
  dayLabel,
  iso,
  ny,
  nyDate,
  nyMinute,
  weekday,
} from "./context.mjs";
import { LOCATIONS } from "./roster.mjs";

const REACHED_FOLLOW_UP_NOTES = [
  "Spoke with patient. Waiting on a referral from PCP before booking; will call back once it's received.",
  "Reached patient, who needs to check a work schedule and asked us to call next week.",
  "Patient is comparing dates with a family member's schedule. Call back with Tampa morning options.",
];

/* Closed requests: why each one ended and the note staff left. Messages are patient-written. */
const CLOSED = [
  {
    kind: "reached",
    m: "I need my colonoscopy report from last year sent to my new doctor in Orlando.",
    n: "Patient only needed records sent to a GI in Orlando. Faxed the report; nothing else needed.",
  },
  {
    kind: "reached",
    m: "I got a bill from your office I don't understand. Can someone call me?",
    n: "Question was about a statement. Walked through it with the patient and transferred to billing; no appointment needed.",
  },
  {
    kind: "reached",
    m: "My surgeon's office said to request a consult here for my hernia repair.",
    n: "Already scheduled through the surgeon's office; no action needed here.",
    attempts: 1,
  },
  {
    kind: "reached",
    m: "Need an appointment for my son, he is 14 with stomach aches.",
    n: "Patient is 14. Gave the family two pediatric GI practices; they'll call there.",
  },
  {
    kind: "wont_schedule",
    m: "Colonoscopy consult please.",
    n: "Three attempts over two weeks with no response. Closing; patient can submit again anytime.",
    attempts: 3,
  },
  {
    kind: "wont_schedule",
    m: "Reflux getting worse, would like to be seen soon.",
    n: "Reached patient, who prefers to wait until after the holidays and will call us back.",
    attempts: 2,
  },
  {
    kind: "wont_schedule",
    m: "Do you accept Medicaid? I need to see someone for my liver.",
    n: "Plan is out of network and patient chose not to self-pay. Shared two in-network practices.",
    attempts: 1,
  },
  {
    kind: "not_actionable",
    m: "Do you check moles? I have a spot on my back I want looked at.",
    n: "Dermatology request, not GI. Called back with a dermatology referral line.",
  },
  {
    kind: "not_actionable",
    duplicate: true,
    n: "Duplicate of a request from the day before, which is already being worked.",
  },
  {
    kind: "not_actionable",
    m: "Please take me off your mailing list.",
    n: "Not an appointment request. Front desk updated contact preferences.",
  },
];

export function createRequests(g, people, appts) {
  const { ri, pick, chance, weighted, shuffle, uuid } = g.random;
  const { NOW, TODAY, TYPES, staff } = g;
  const requests = [];
  const transitions = [];
  const events = [];
  const links = [];
  const actors = [
    [staff.operator, 5],
    [staff[g.clinic.infusionKey], 2],
    ...g.clinic.npKeys.map((k) => [staff[k], 1.5]),
  ];
  const creators = [staff.operator, staff[g.clinic.infusionKey]];

  function snapshot(r) {
    return {
      state: r.status,
      callAgainAt: r.follow_up_at ? iso(r.follow_up_at) : null,
      bookingConfirmedAt: r.record_handoff_at ? iso(r.record_handoff_at) : null,
      appointmentAt: r.appointment_at ? iso(r.appointment_at) : null,
      closedAt: r.closed_at ? iso(r.closed_at) : null,
      closureReason: r.closure_reason ?? null,
      closureDisposition: null,
      closureProvenance: null,
      legacyReviewRequired: false,
    };
  }

  function newRequest({
    who,
    at,
    locale = "en",
    staffOrigin = false,
    location,
    preferred,
    message,
  }) {
    const r = {
      id: uuid(),
      name: who.name,
      phone: who.phone,
      email: who.email,
      location:
        location ??
        weighted([
          ["tampa", 5],
          ["lutz", 3],
          ["any", 3],
        ]),
      preferred_time:
        preferred ??
        weighted([
          ["any", 4],
          ["morning", 3],
          ["afternoon", 3],
        ]),
      message,
      locale,
      source_path: staffOrigin ? "/admin/requests/new" : `/${locale}/appointment`,
      status: "new",
      created_at: at,
      updated_at: at,
      follow_up_at: null,
      record_handoff_at: null,
      closed_at: null,
      closure_reason: null,
      appointment_at: null,
      version: 1,
      staffOrigin,
      creator: staffOrigin ? pick(creators) : null,
    };
    requests.push(r);
    events.push({
      id: uuid(),
      request_id: r.id,
      type: "created",
      meta: staffOrigin ? { origin: "staff" } : {},
      at,
    });
    return r;
  }

  function transition(r, command, to, at, actor, extra = {}) {
    const t = {
      id: uuid(),
      request_id: r.id,
      from_state: r.status,
      to_state: to,
      command,
      actor_email: actor.email,
      resulting_version: r.version + 1,
      idempotency_key: uuid(),
      occurred_at: at,
      reason_code: extra.reason ?? null,
      prior_snapshot: snapshot(r),
      call_again_at: null,
      appointment_at: extra.appointmentAt ?? null,
    };
    transitions.push(t);
    r.status = to;
    r.version++;
    r.updated_at = at;
    return t;
  }

  function note(r, text, at, actor) {
    events.push({
      id: uuid(),
      request_id: r.id,
      type: "note",
      meta: { text, author_email: actor.email },
      at,
    });
    r.updated_at = Math.max(r.updated_at, at);
  }

  function attempt(r, outcome, at, actor, followUp) {
    transition(r, "record_contact_attempt", "contacted", at, actor, { reason: outcome });
    r.follow_up_at = followUp;
    events.push({
      id: uuid(),
      request_id: r.id,
      type: "contact_attempt",
      meta: { outcome, author_email: actor.email, follow_up_at: iso(followUp) },
      at,
    });
  }

  const businessTime = (ms) => ny(nyDate(ms), Math.min(Math.max(nyMinute(ms), 490), 1010));

  // Booked: ten upcoming new-patient consultations and three that already happened.
  const consults = appts.filter(
    (a) =>
      a.type === TYPES.NEW &&
      !a.patient.established &&
      a.created_at > NOW - 25 * DAY &&
      a.created_at < NOW - 3 * HOUR &&
      a.patient.visits.length === 1,
  );
  const upcoming = shuffle(
    consults.filter((a) => a.status === "scheduled" && a.startsAt > NOW),
  ).slice(0, 10);
  const happened = shuffle(consults.filter((a) => a.status === "completed")).slice(0, 3);
  for (const a of [...upcoming, ...happened]) {
    const p = a.patient;
    const actor = weighted(actors);
    const requestedAt = a.created_at - ri(5, 70) * HOUR;
    const r = newRequest({
      who: p,
      at: requestedAt,
      locale: chance(0.12) ? "es" : "en",
      location: chance(0.7) ? a.loc : "any",
      preferred: chance(0.5) ? (nyMinute(a.startsAt) < 720 ? "morning" : "afternoon") : "any",
      message: pick(CONDITIONS[p.cond].message),
    });
    if (r.locale === "es") r.message = pick(NEW_REQUEST_MESSAGES.es);
    if (chance(0.45)) {
      const at = businessTime(requestedAt + ri(2, 20) * HOUR);
      if (at < a.created_at - 2 * HOUR) {
        attempt(
          r,
          pick(["voicemail", "no_answer"]),
          at,
          actor,
          Math.min(at + DAY, a.created_at - HOUR),
        );
        if (chance(0.5)) note(r, pick(CONTACT_NOTES.slice(0, 4)), at + MIN, actor);
      }
    }
    a.created_by = actor;
    a.steps[0].by = actor;
    p.created_at = a.created_at - ri(2, 6) * MIN;
    p.by = actor;
    p.requestId = r.id;
    const before = snapshot(r);
    r.follow_up_at = null;
    const t = transition(r, "confirm_booking_handoff", "booked", a.created_at, actor, {
      appointmentAt: a.startsAt,
    });
    r.record_handoff_at = a.created_at;
    r.appointment_at = a.startsAt;
    a.request = { r, before, version: r.version, transitionId: t.id };
    links.push({
      request_id: r.id,
      patient_id: p.id,
      linked_at: p.created_at,
      linked_by: actor.id,
    });
    const reminder = chance(0.4) ? " Reminded to bring insurance card and medication list." : "";
    note(
      r,
      `Booked ${TYPES.NEW.name.toLowerCase()} with ${staff[a.provider].short}, ${dayLabel(a.startsAt)} at ${clockLabel(a.startsAt)}, ${LOCATIONS[a.loc].name}.${reminder}`,
      a.created_at + 2 * MIN,
      actor,
    );
  }

  // New: arrived over the last sixty hours.
  const fresh = [
    ...NEW_REQUEST_MESSAGES.en.slice(0, 7).map((m) => ({ m, locale: "en" })),
    { m: NEW_REQUEST_MESSAGES.es[0], locale: "es", cluster: "hispanic" },
    { m: NEW_REQUEST_MESSAGES.es[2], locale: "es", cluster: "hispanic" },
    { m: NEW_REQUEST_MESSAGES.vi[0], locale: "vi", cluster: "vietnamese" },
    { m: STAFF_REQUEST_MESSAGES[0], locale: "en", staff: true },
  ];
  fresh.forEach((s, i) => {
    const at = NOW - Math.round(((i + 0.5) / fresh.length) * 60 * HOUR) - ri(0, 50) * MIN;
    const r = newRequest({
      who: people.person(s.cluster),
      at,
      locale: s.locale,
      staffOrigin: s.staff,
      message: s.m,
    });
    if (/afternoon|buổi chiều/i.test(s.m)) r.preferred_time = "afternoon";
    if (s.m.includes("mañana")) r.preferred_time = "morning";
    if (s.m.includes("Lutz")) r.location = "lutz";
  });

  // Contacted: one to three attempts; call-backs due today, overdue, upcoming, and one gone stale.
  const contacted = [
    ...NEW_REQUEST_MESSAGES.en.slice(7).map((m) => ({ m })),
    { m: NEW_REQUEST_MESSAGES.es[1], locale: "es", cluster: "hispanic" },
    { m: STAFF_REQUEST_MESSAGES[1], staff: true },
    { m: STAFF_REQUEST_MESSAGES[2], staff: true },
    { m: CONDITIONS.screening.message[1] },
    { m: CONDITIONS.dysphagia.message[0] },
  ];
  const buckets = [
    "today",
    "today",
    "today",
    "overdue",
    "overdue",
    "overdue",
    "upcoming",
    "upcoming",
    "upcoming",
    "upcoming",
    "tomorrow",
    "stale",
  ];
  contacted.forEach((s, i) => {
    const bucket = buckets[i % buckets.length];
    const created = NOW - (bucket === "stale" ? 16 : ri(2, 9)) * DAY - ri(0, 8) * HOUR;
    const r = newRequest({
      who: people.person(s.cluster),
      at: created,
      locale: s.locale ?? "en",
      staffOrigin: s.staff,
      message: s.m,
    });
    if (/afternoon/i.test(s.m)) r.preferred_time = "afternoon";
    const n = bucket === "stale" ? 2 : ri(1, 3);
    let at = businessTime(created + ri(3, 18) * HOUR);
    const finalFollowUp = {
      today: ny(TODAY, pick([600, 690, 840, 930])),
      tomorrow: ny(addDays(TODAY, weekday(TODAY) === 5 ? 3 : 1), pick([570, 660, 870])),
      overdue: ny(addDays(TODAY, -ri(1, 3)), pick([600, 780, 900])),
      upcoming: ny(addDays(TODAY, ri(3, 8)), pick([600, 720, 840])),
      stale: ny(addDays(TODAY, -10), 600),
    }[bucket];
    for (let k = 0; k < n; k++) {
      const last = k === n - 1;
      const actor = weighted(actors);
      const followUp = last ? finalFollowUp : businessTime(at + ri(20, 30) * HOUR);
      if (at > NOW - 30 * MIN) at = NOW - ri(40, 120) * MIN;
      const outcome =
        last && bucket === "upcoming" && chance(0.7)
          ? "reached_follow_up"
          : pick(["voicemail", "voicemail", "no_answer"]);
      attempt(r, outcome, at, actor, followUp);
      const text =
        outcome === "reached_follow_up" ? pick(REACHED_FOLLOW_UP_NOTES) : pick(CONTACT_NOTES);
      if (chance(0.7)) note(r, text, at + ri(1, 4) * MIN, actor);
      at = businessTime(followUp + ri(0, 90) * MIN);
    }
  });

  // Closed: reached and resolved, won't schedule, or not an appointment request.
  for (const s of CLOSED) {
    let who;
    let message = s.m;
    let at0 = NOW - ri(4, 26) * DAY - ri(0, 10) * HOUR;
    if (s.duplicate) {
      const original = requests.find(
        (r) => r.status === "contacted" && !r.staffOrigin && r.locale === "en",
      );
      who = { name: original.name, phone: original.phone, email: original.email };
      message = original.message;
      at0 = Math.max(original.created_at + 22 * HOUR, NOW - 3 * DAY);
    } else who = people.person();
    const r = newRequest({ who, at: Math.min(at0, NOW - 3 * HOUR), message });
    let at = businessTime(r.created_at + ri(3, 20) * HOUR);
    if (at > NOW - 20 * MIN) at = NOW - 25 * MIN;
    const actor = weighted(actors);
    for (let k = 0; k < (s.attempts ?? (s.kind === "reached" ? ri(0, 1) : 0)); k++) {
      const followUp = businessTime(at + ri(24, 72) * HOUR);
      attempt(r, pick(["voicemail", "no_answer"]), at, actor, followUp);
      at = Math.min(followUp + ri(0, 60) * MIN, NOW - 20 * MIN);
    }
    r.follow_up_at = null;
    if (s.kind === "reached") {
      transition(r, "record_contact_and_close", "closed", at, actor, { reason: "reached" });
      r.closure_reason = "no_further_contact";
      events.push({
        id: uuid(),
        request_id: r.id,
        type: "contact_completed",
        meta: {
          outcome: "reached",
          closure_reason: "no_further_contact",
          author_email: actor.email,
        },
        at,
      });
    } else {
      transition(r, "close_request", "closed", at, actor, { reason: s.kind });
      r.closure_reason = s.kind;
    }
    r.closed_at = at;
    note(r, s.n, at + MIN, actor);
  }

  return { requests, transitions, events, links };
}
