// Synthetic demonstration data for the day-sheet prototype. Every request,
// patient, staff colleague, and outcome here is invented; nothing reads or
// writes the real queue. Lifecycles are built by REPLAYING commands through
// the real machine (appointment-request-machine.ts), so every history is
// coherent evidence the UI can trust — not hand-written set dressing.
//
// Fixture times are authored as day offsets from "today" so the sheet stays
// alive whenever the prototype is opened. Wall times use the EDT offset;
// in winter the labels drift one cosmetic hour, which the prototype accepts.

import {
  decideCommand,
  type ContactOutcome,
  type RequestCommand,
  type UnbookedClosureReason,
} from "@/lib/portal/appointment-request-machine";
import { practiceToday } from "./format";
import type {
  HistoryEntry,
  PrototypeRequest,
  RequestLocation,
  RequestTime,
  StoredTransition,
} from "./types";

export const SEED_VERSION = 3;

/** Synthetic colleague who worked fixture requests before "today". */
export const FIXTURE_COLLEAGUE = "Dana R.";

/** Synthetic colleague used by the concurrency simulation. */
export const SIMULATED_COLLEAGUE = "Maria G.";

type SeedAction =
  | {
      kind: "attempt";
      day: number;
      time: string;
      outcome: ContactOutcome;
      /** Call-again day as an offset from today; null omits it. */
      callAgainOffset: number | null;
      note?: string;
    }
  | { kind: "booked"; day: number; time: string; note?: string }
  | {
      kind: "closed";
      day: number;
      time: string;
      reason: UnbookedClosureReason;
      note?: string;
    }
  | { kind: "note"; day: number; time: string; text: string };

type SeedSpec = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  location: RequestLocation;
  preferredTime: RequestTime;
  reason: string | null;
  locale: string;
  received: { day: number; time: string };
  /** Delivery evidence for the new-request ping fan-out. */
  pings?: { accepted: number; failed: number };
  actions?: SeedAction[];
  /** Marks the migrated, unclassified-closure repair fixture. */
  legacy?: boolean;
};

const SPECS: SeedSpec[] = [
  {
    id: "rq-101",
    name: "María Delgado",
    phone: "(813) 555-0134",
    email: "maria.delgado@example.com",
    location: "tampa",
    preferredTime: "morning",
    reason:
      "Mi médico me refirió para una colonoscopia de rutina. Prefiero citas por la mañana.",
    locale: "es",
    received: { day: 0, time: "08:47" },
  },
  {
    id: "rq-102",
    name: "Robert Cheswick",
    phone: "(813) 555-0119",
    email: null,
    location: "any",
    preferredTime: "any",
    reason: "Ongoing acid reflux, most nights. Want to talk about options.",
    locale: "en",
    received: { day: -4, time: "15:10" },
  },
  {
    id: "rq-103",
    name: "Linh Trần",
    phone: "(813) 555-0177",
    email: "linh.tran@example.com",
    location: "lutz",
    preferredTime: "afternoon",
    reason:
      "Bác sĩ gia đình giới thiệu tôi đến khám. Tôi cần thông dịch viên tiếng Việt nếu có thể.",
    locale: "vi",
    received: { day: -1, time: "18:22" },
  },
  {
    id: "rq-104",
    name: "Gene Parsons",
    phone: "(813) 555-0142",
    email: null,
    location: "tampa",
    preferredTime: "any",
    reason: "Follow-up after an ER visit last month. Was told to schedule with GI.",
    locale: "en",
    received: { day: -2, time: "09:31" },
    actions: [
      {
        kind: "attempt",
        day: -1,
        time: "10:05",
        outcome: "voicemail",
        callAgainOffset: 0,
        note: "Left the office number and asked for a call back.",
      },
    ],
  },
  {
    id: "rq-105",
    name: "Sun-hee Park",
    phone: "(813) 555-0163",
    email: null,
    location: "tampa",
    preferredTime: "morning",
    reason: null,
    locale: "ko",
    received: { day: -6, time: "12:02" },
    pings: { accepted: 1, failed: 1 },
    actions: [
      {
        kind: "attempt",
        day: -4,
        time: "14:12",
        outcome: "no_answer",
        callAgainOffset: -1,
      },
    ],
  },
  {
    id: "rq-106",
    name: "Carlos Miranda",
    phone: "(813) 555-0128",
    email: "carlos.m@example.com",
    location: "any",
    preferredTime: "any",
    reason: "Quisiera saber si aceptan mi seguro antes de hacer la cita.",
    locale: "es",
    received: { day: -3, time: "11:15" },
    actions: [
      {
        kind: "attempt",
        day: -3,
        time: "14:40",
        outcome: "reached_follow_up",
        callAgainOffset: null,
        note: "Wants to check his insurance first — said he'll call us back.",
      },
    ],
  },
  {
    id: "rq-107",
    name: "Alicia Moreno",
    phone: "(813) 555-0151",
    email: null,
    location: "lutz",
    preferredTime: "morning",
    reason: "New to the area, looking for a GI practice that takes my plan.",
    locale: "en",
    received: { day: -1, time: "12:48" },
    actions: [
      {
        kind: "attempt",
        day: 0,
        time: "09:12",
        outcome: "voicemail",
        callAgainOffset: 2,
      },
    ],
  },
  {
    id: "rq-108",
    name: "Trevor Banks",
    phone: "(813) 555-0186",
    email: "trevor.banks@example.com",
    location: "tampa",
    preferredTime: "afternoon",
    reason: "Scheduling the colonoscopy my primary keeps reminding me about.",
    locale: "en",
    received: { day: -2, time: "10:19" },
    actions: [
      {
        kind: "attempt",
        day: -2,
        time: "15:02",
        outcome: "reached_follow_up",
        callAgainOffset: 7,
        note: "Traveling until the 10th — call once he's back.",
      },
    ],
  },
  {
    id: "rq-109",
    name: "Harriet Osei",
    phone: "(813) 555-0148",
    email: "h.osei@example.com",
    location: "tampa",
    preferredTime: "morning",
    reason: "Abdominal pain my doctor wants looked at sooner rather than later.",
    locale: "en",
    received: { day: -1, time: "13:05" },
    actions: [
      {
        kind: "attempt",
        day: -1,
        time: "16:20",
        outcome: "reached_follow_up",
        callAgainOffset: 0,
      },
      { kind: "booked", day: 0, time: "09:05" },
    ],
  },
  {
    id: "rq-110",
    name: "Frank Delillo",
    phone: "(813) 555-0107",
    email: null,
    location: "lutz",
    preferredTime: "any",
    reason: "Referred by Dr. Okafor for a screening colonoscopy.",
    locale: "en",
    received: { day: -6, time: "09:40" },
    actions: [
      {
        kind: "attempt",
        day: -6,
        time: "11:30",
        outcome: "voicemail",
        callAgainOffset: -5,
      },
      { kind: "booked", day: -5, time: "10:15" },
    ],
  },
  {
    id: "rq-111",
    name: "Joan Whitfield",
    phone: "(813) 555-0193",
    email: "joan.w@example.com",
    location: "any",
    preferredTime: "morning",
    reason: "Second opinion on a colitis diagnosis.",
    locale: "en",
    received: { day: -8, time: "14:27" },
    actions: [
      {
        kind: "attempt",
        day: -7,
        time: "09:50",
        outcome: "voicemail",
        callAgainOffset: -5,
      },
      {
        kind: "attempt",
        day: -5,
        time: "10:22",
        outcome: "reached_follow_up",
        callAgainOffset: null,
      },
      {
        kind: "closed",
        day: -2,
        time: "11:45",
        reason: "wont_schedule",
        note: "Decided to stay with her current GI group.",
      },
    ],
  },
  {
    id: "rq-112",
    name: "Robert Cheswick",
    phone: "(813) 555-0119",
    email: null,
    location: "any",
    preferredTime: "any",
    reason: "Acid reflux — submitted this last week too, not sure it went through.",
    locale: "en",
    received: { day: -1, time: "08:15" },
    actions: [
      {
        kind: "closed",
        day: -1,
        time: "09:02",
        reason: "not_actionable",
        note: "Duplicate of Friday's request — keeping the earlier one.",
      },
    ],
  },
  {
    id: "rq-113",
    name: "Miriam Santos",
    phone: "(813) 555-0170",
    email: null,
    location: "tampa",
    preferredTime: "afternoon",
    reason: "Necesito una cita para mi endoscopia de seguimiento.",
    locale: "es",
    received: { day: -40, time: "10:33" },
    legacy: true,
  },
];

function isoAt(today: string, dayOffsetValue: number, time: string): string {
  const base = Date.parse(`${today}T12:00:00Z`) + dayOffsetValue * 86_400_000;
  const day = new Date(base).toISOString().slice(0, 10);
  return new Date(`${day}T${time}:00-04:00`).toISOString();
}

function dayAt(today: string, offset: number): string {
  const base = Date.parse(`${today}T12:00:00Z`) + offset * 86_400_000;
  return new Date(base).toISOString().slice(0, 10);
}

function buildRequest(spec: SeedSpec, today: string): PrototypeRequest {
  let entrySerial = 0;
  const entryId = () => `${spec.id}-e${++entrySerial}`;

  const receivedAt = isoAt(today, spec.received.day, spec.received.time);
  const entries: HistoryEntry[] = [
    {
      id: entryId(),
      at: receivedAt,
      actor: "the website",
      struck: false,
      body: { t: "received", via: spec.locale },
    },
  ];

  const pings = spec.pings ?? { accepted: 2, failed: 0 };
  entries.push({
    id: entryId(),
    at: new Date(Date.parse(receivedAt) + 45_000).toISOString(),
    actor: "",
    struck: false,
    body: { t: "notification", ...pings },
  });

  const request: PrototypeRequest = {
    id: spec.id,
    name: spec.name,
    phone: spec.phone,
    email: spec.email,
    location: spec.location,
    preferredTime: spec.preferredTime,
    reason: spec.reason,
    locale: spec.locale,
    receivedAt,
    snapshot: {
      state: "NEW",
      version: 1,
      callAgainDay: null,
      closureReason: null,
      closedAt: null,
      bookingHandoffAt: null,
      legacyReviewRequired: false,
    },
    entries,
    transitions: [],
  };

  if (spec.legacy) {
    request.snapshot = {
      ...request.snapshot,
      state: "CLOSED",
      legacyReviewRequired: true,
    };
    entries.push({
      id: entryId(),
      at: isoAt(today, -14, "07:00"),
      actor: "",
      struck: false,
      body: { t: "migrated" },
    });
    return request;
  }

  for (const action of spec.actions ?? []) {
    const at = isoAt(today, action.day, action.time);
    const clock = { iso: at, day: dayAt(today, action.day) };

    if (action.kind === "note") {
      entries.push({
        id: entryId(),
        at,
        actor: FIXTURE_COLLEAGUE,
        struck: false,
        body: { t: "note", text: action.text },
      });
      continue;
    }

    const command: RequestCommand =
      action.kind === "attempt"
        ? {
            kind: "record_contact_attempt",
            outcome: action.outcome,
            callAgainDay:
              action.callAgainOffset === null
                ? null
                : dayAt(today, action.callAgainOffset),
          }
        : action.kind === "booked"
          ? { kind: "confirm_booking_handoff" }
          : { kind: "close_request", reason: action.reason };

    const decision = decideCommand(
      request.snapshot,
      command,
      request.snapshot.version,
      clock,
    );
    if (!decision.ok) {
      throw new Error(
        `Fixture ${spec.id} replay rejected: ${action.kind} → ${decision.error}`,
      );
    }

    const id = entryId();
    const { resultingVersion } = decision.fact;
    const body: HistoryEntry["body"] =
      action.kind === "attempt"
        ? {
            t: "attempt",
            outcome: action.outcome,
            callAgainDay: command.kind === "record_contact_attempt" ? command.callAgainDay : null,
            transitionVersion: resultingVersion,
          }
        : action.kind === "booked"
          ? { t: "booked", transitionVersion: resultingVersion }
          : {
              t: "closed",
              reason: action.reason,
              transitionVersion: resultingVersion,
            };

    entries.push({ id, at, actor: FIXTURE_COLLEAGUE, struck: false, body });
    if (action.note) {
      entries.push({
        id: entryId(),
        at: new Date(Date.parse(at) + 20_000).toISOString(),
        actor: FIXTURE_COLLEAGUE,
        struck: false,
        body: { t: "note", text: action.note },
      });
    }

    const transition: StoredTransition = {
      ...decision.fact,
      actor: FIXTURE_COLLEAGUE,
      priorSnapshot: request.snapshot,
      entryId: id,
    };
    request.transitions.push(transition);
    request.snapshot = decision.next;
  }

  return request;
}

export function buildSeed(now: Date = new Date()): PrototypeRequest[] {
  const today = practiceToday(now);
  return SPECS.map((spec) => buildRequest(spec, today));
}
