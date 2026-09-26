import { historyLine } from "@/app/admin/(portal)/requests/[id]/request-history";
import {
  CONTACT_OUTCOME_LABELS,
  formatPhoneForDisplay,
  localeLabel,
} from "@/app/admin/(portal)/requests/format";
import type { FullRecord } from "@/lib/portal/request-record/contracts";
import type { HistoryEntry } from "@/lib/portal/workflow/contracts";

/* What the sheet says about a record, derived from the record alone: the
   origin, an actor's name, the count of calls in the header, the latest
   note, the history as dated one-line rows with the detail each row's
   popover opens, and the one-line summary of the request as submitted.
   Nothing here touches the DOM or React, so the wording can be read in
   one place. The rows reuse the request page's wording (request-history.ts)
   for every kind but the two the sheet says differently: a call attempt
   leads with its outcome and says the next call in short, and a note
   shows its own text. */

/** Where the request came from is the `created` entry of its history. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
export function originLabel(record: FullRecord): string {
  for (const entry of record.history) {
    if (entry.kind === "created") {
      return entry.origin === "staff" ? "Added by staff" : "Website form";
    }
  }
  return "Not recorded";
}

/* An actor is a staff email; the record carries the display names of the
   actors in its history, and an actor absent there reads as the email —
   the rule `displayNameOrEmail` applies on the request page, repeated
   here because that helper is server-only. The ask is `Object.hasOwn`
   rather than a value check, the way the portal's other label maps ask
   it: the contract maps only the actors that appear in the history, so a
   key can be absent even though the Record's type promises a string for
   any of them. */
export function actorLabel(names: FullRecord["actorNames"], actor: string): string {
  const key = actor.trim().toLowerCase();
  if (!Object.hasOwn(names, key)) return actor;
  const name = names[key];
  return name !== "" ? name : actor;
}

/* Practice-local dates, in the three shapes the sheet uses: the day key
   rows group under, the day header and a popover's next call ("Fri,
   Sep 18"), a row's short next-call day ("Sep 17"), and the exact time
   a popover and a byline carry ("Fri, Sep 18, 4:41 PM"). */
const TIME_ZONE = "America/New_York";
const dayKey = new Intl.DateTimeFormat("en-CA", { dateStyle: "short", timeZone: TIME_ZONE });
const dayLabel = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: TIME_ZONE,
});
const shortDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: TIME_ZONE,
});
const exactTime = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

export function exactTimeLabel(iso: string): string {
  return exactTime.format(new Date(iso));
}

/** The portal icon a row carries; `dot` is the system's quiet mark. */
export type HistoryIcon =
  | "no-answer"
  | "voicemail"
  | "reached"
  | "note"
  | "closed"
  | "booked"
  | "undo"
  | "reopened"
  | "alert"
  | "dot";

export interface HistoryFact {
  readonly key: string;
  readonly value: string;
}

/** What a row's popover opens to: a heading, the full wording, the facts. */
export interface HistoryDetail {
  readonly heading: string;
  /** The row's whole text, untruncated; a note's full text. Null for a call
      attempt, whose heading is its outcome. */
  readonly body: string | null;
  /** Only a note is the staff's free text, so only a note's body is redacted. */
  readonly note: boolean;
  /** Who and when on one line under a note's heading; the other kinds say
      them as facts. */
  readonly byline: string | null;
  readonly facts: readonly HistoryFact[];
}

/* How much a row weighs, set for each kind (#324): news leads in bold
   ink — reaching the patient, and a failed notification email in amber —
   a note reads in ink, and routine attempts, the system's own marks and
   anything later undone recede to muted ink, icon and all. */
export type HistoryEmphasis = "attention" | "strong" | "ink" | "muted";

export interface HistoryRow {
  readonly id: string;
  readonly icon: HistoryIcon;
  readonly emphasis: HistoryEmphasis;
  /** The row's first words; bold when the row is strong or escalates. */
  readonly lead: string;
  /** What follows the lead on the same line, " · next call Sep 17". */
  readonly rest: string;
  readonly undone: boolean;
  readonly at: string;
  readonly detail: HistoryDetail;
}

export interface HistoryDay {
  readonly key: string;
  readonly label: string;
  readonly rows: readonly HistoryRow[];
}

export interface LatestNote {
  readonly id: string;
  readonly text: string;
  /** Who wrote it and when, on one line. */
  readonly byline: string;
}

export interface RecordSections {
  /** Calls made, counted from the recorded attempts themselves. */
  readonly attempts: number;
  readonly latestNote: LatestNote | null;
  /** Newest day first, newest row first within a day. */
  readonly days: readonly HistoryDay[];
  readonly rowCount: number;
}

type Names = FullRecord["actorNames"];

function byline(names: Names, actor: string, at: string): string {
  return `${actorLabel(names, actor)} · ${exactTimeLabel(at)}`;
}

function byFacts(names: Names, actor: string | null, at: string): HistoryFact[] {
  const facts: HistoryFact[] = [];
  if (actor !== null) facts.push({ key: "By", value: actorLabel(names, actor) });
  facts.push({ key: "When", value: exactTimeLabel(at) });
  return facts;
}

const ATTEMPT_ICONS = {
  no_answer: "no-answer",
  voicemail: "voicemail",
  reached_follow_up: "reached",
} as const satisfies Record<keyof typeof CONTACT_OUTCOME_LABELS, HistoryIcon>;

function iconFor(entry: Readonly<HistoryEntry>): HistoryIcon {
  if (entry.kind === "contact_attempt") return ATTEMPT_ICONS[entry.outcome];
  if (entry.kind === "note") return "note";
  if (entry.kind === "contact_completed") return "closed";
  if (entry.kind === "undo") return "undo";
  if (entry.kind === "delivery") return entry.accepted ? "dot" : "alert";
  if (entry.kind === "transition") {
    if (entry.command === "confirm_booking_handoff") return "booked";
    if (entry.command === "close_request") return "closed";
    if (entry.command === "reopen_request") return "reopened";
  }
  /* The receipt, a legacy classification, and any other move of state are
     the system's own marks. */
  return "dot";
}

const HEADINGS = {
  "no-answer": CONTACT_OUTCOME_LABELS.no_answer,
  voicemail: CONTACT_OUTCOME_LABELS.voicemail,
  reached: CONTACT_OUTCOME_LABELS.reached_follow_up,
  note: "Note",
  closed: "Closed",
  booked: "Scheduled",
  undo: "Undo",
  reopened: "Reopened",
  alert: "Notification email",
  dot: "Recorded",
} as const satisfies Record<HistoryIcon, string>;

/* One row for one entry, or null for the entries the history skips: a
   call attempt's own self-transition renders once, as its attempt. A
   failed notification email is the history's one escalating row: it leads
   with the failure and names the recipient after it. An attempt does not
   record the number dialled, so its popover names the phone on file. */
function rowFor(
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
  entry: HistoryEntry,
  record: Readonly<Pick<FullRecord, "actorNames" | "phone">>,
  isUndoneAttempt: (id: string) => boolean,
): HistoryRow | null {
  const names = record.actorNames;
  if (entry.kind === "contact_attempt") {
    const icon = ATTEMPT_ICONS[entry.outcome];
    const next = entry.callAgainAt !== null && entry.callAgainAt !== "" ? entry.callAgainAt : null;
    return {
      id: entry.id,
      icon,
      emphasis: entry.outcome === "reached_follow_up" ? "strong" : "muted",
      lead: CONTACT_OUTCOME_LABELS[entry.outcome],
      rest:
        next === null ? " · no call-again day" : ` · next call ${shortDay.format(new Date(next))}`,
      undone: isUndoneAttempt(entry.id),
      at: entry.at,
      detail: {
        heading: HEADINGS[icon],
        body: null,
        note: false,
        byline: null,
        facts: [
          {
            key: "Next call",
            value: next === null ? "No call-again day set" : dayLabel.format(new Date(next)),
          },
          { key: "Number", value: formatPhoneForDisplay(record.phone) },
          ...byFacts(names, entry.actor, entry.at),
        ],
      },
    };
  }
  if (entry.kind === "note") {
    const text = entry.text.trim();
    return {
      id: entry.id,
      icon: "note",
      emphasis: "ink",
      lead: text,
      rest: "",
      undone: false,
      at: entry.at,
      detail: {
        heading: HEADINGS.note,
        body: text,
        note: true,
        byline: byline(names, entry.actor, entry.at),
        facts: [],
      },
    };
  }
  const line = historyLine(entry);
  if (line === null) return null;
  const icon = iconFor(entry);
  const failed = entry.kind === "delivery" && line.attention ? entry.recipient.trim() : null;
  return {
    id: line.id,
    icon,
    emphasis: line.attention ? "attention" : line.actor === null ? "muted" : "ink",
    lead: failed === null ? line.text : "Notification email failed",
    rest: failed === null ? "" : ` · ${failed === "" ? "recipient unavailable" : failed}`,
    undone: line.undone,
    at: line.at,
    detail: {
      heading: HEADINGS[icon],
      body: line.text,
      note: false,
      byline: null,
      facts: byFacts(names, line.actor, line.at),
    },
  };
}

/* The attempts whose recorded move was later undone. One save writes the
   attempt and its move together, but the database stamps the attempt and
   the decision stamps the move, so the two differ by moments: an undone
   move claims the same author's nearest attempt within a minute, and each
   attempt is claimed once. */
const PAIRING_WINDOW = 60_000;

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
function undoneAttemptIds(history: readonly HistoryEntry[]): (id: string) => boolean {
  const claimed = new Set<string>();
  for (const move of history) {
    if (move.kind !== "transition" || move.command !== "record_contact_attempt" || !move.undone)
      continue;
    const at = Date.parse(move.at);
    let nearest: { id: string; gap: number } | null = null;
    for (const attempt of history) {
      if (attempt.kind !== "contact_attempt" || attempt.actor !== move.actor) continue;
      if (claimed.has(attempt.id)) continue;
      const gap = Math.abs(Date.parse(attempt.at) - at);
      if (gap <= PAIRING_WINDOW && (nearest === null || gap < nearest.gap))
        nearest = { id: attempt.id, gap };
    }
    if (nearest !== null) claimed.add(nearest.id);
  }
  return (id) => claimed.has(id);
}

/* The history is one list on the record, newest first. The sheet keeps it
   one list — notes interleaved where they were written — grouped under
   practice-local days, and lifts the newest note out above it as well. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
export function recordSections(record: FullRecord): RecordSections {
  let attempts = 0;
  let latestNote: LatestNote | null = null;
  const days: { key: string; label: string; rows: HistoryRow[] }[] = [];
  let rowCount = 0;
  const isUndoneAttempt = undoneAttemptIds(record.history);

  for (const entry of record.history) {
    if (entry.kind === "contact_attempt" && !isUndoneAttempt(entry.id)) attempts += 1;
    if (entry.kind === "note" && latestNote === null) {
      latestNote = {
        id: entry.id,
        text: entry.text.trim(),
        byline: byline(record.actorNames, entry.actor, entry.at),
      };
    }
    const row = rowFor(entry, record, isUndoneAttempt);
    if (row === null) continue;
    const date = new Date(row.at);
    const key = dayKey.format(date);
    const last = days.at(-1);
    if (last?.key === key) last.rows.push(row);
    else days.push({ key, label: dayLabel.format(date), rows: [row] });
    rowCount += 1;
  }

  return { attempts, latestNote, days, rowCount };
}

/** "6 attempts", or null before the first call. */
export function attemptsLabel(attempts: number): string | null {
  if (attempts === 0) return null;
  return attempts === 1 ? "1 attempt" : `${attempts} attempts`;
}

/* The request as submitted, in one line while its disclosure is closed:
   "Website · English · received Sun, Sep 13". */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
export function detailsSummary(record: FullRecord): string {
  const origin = originLabel(record);
  const parts = [
    origin === "Website form" ? "Website" : origin === "Not recorded" ? null : origin,
    localeLabel(record.locale),
    `received ${dayLabel.format(new Date(record.createdAt))}`,
  ];
  return parts.filter((part) => part !== null).join(" · ");
}

export type ReadOutcome =
  | { readonly kind: "record"; readonly record: FullRecord }
  | { readonly kind: "gone" }
  | { readonly kind: "unavailable" };

export interface ReadState {
  readonly id: string;
  readonly outcome: ReadOutcome;
}
