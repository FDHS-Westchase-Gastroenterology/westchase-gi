import { historyLine } from "@/app/admin/(portal)/requests/[id]/request-history";
import type { HistoryLine } from "@/app/admin/(portal)/requests/[id]/request-history";
import {
  CLOSURE_REASON_LABELS,
  followUpWhenLabel,
  formatReceived,
} from "@/app/admin/(portal)/requests/format";
import type { FullRecord } from "@/lib/portal/request-record/contracts";

/* What the sheet says about a record, derived from the record alone: the
   sentence under the badge, the origin, an actor's name, and the history
   split into the staff's notes and everything else. Nothing here touches
   the DOM or React, so the wording can be read in one place. */

/** Where it stands, in the record's own facts: one sentence under the
    badge, the request page's wording, information rather than a control
    (Content answers). */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
export function standsSentence(record: FullRecord): string {
  /* Every case assigns and the function returns once, the way `lineFor`
     builds its timing: the switch stays exhaustive over RequestState, so a
     state added later fails to compile here rather than reading blank. */
  let sentence: string;

  switch (record.state) {
    case "new": {
      sentence = "Waiting for a first call.";
      break;
    }
    case "contacted": {
      sentence =
        record.callAgainAt !== null && record.callAgainAt !== ""
          ? `Contacted — call again ${followUpWhenLabel(record.callAgainAt)}.`
          : "Contacted — no call-again day set.";
      break;
    }
    case "booked": {
      const when =
        record.bookingConfirmedAt !== null
          ? ` ${formatReceived(record.bookingConfirmedAt, true)}`
          : "";
      sentence =
        record.appointmentAt !== null
          ? `Marked Scheduled${when} — appointment ${formatReceived(record.appointmentAt, true)}.`
          : `Marked Scheduled${when} — appointment booked.`;
      break;
    }
    case "closed": {
      if (record.legacyReviewRequired) {
        sentence = "Closed before outcomes were recorded — how it ended still needs review.";
        break;
      }
      const when = record.closedAt !== null ? ` ${formatReceived(record.closedAt, true)}` : "";
      const why =
        record.closureReason !== null
          ? CLOSURE_REASON_LABELS[record.closureReason]
          : "no appointment booked";
      sentence = `Closed${when} — ${why}.`;
      break;
    }
  }

  return sentence;
}

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

export interface SheetNote {
  readonly id: string;
  readonly text: string;
  /** Who wrote it and when, on one line. */
  readonly byline: string;
}

export interface RecordSections {
  readonly notes: readonly SheetNote[];
  readonly history: readonly HistoryLine[];
}

/* Notes and the rest of the history are one list on the record, newest
   first; the sheet shows them apart, the way the request page does. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
export function recordSections(record: FullRecord): RecordSections {
  const notes: SheetNote[] = [];
  const history: HistoryLine[] = [];
  for (const entry of record.history) {
    if (entry.kind === "note") {
      notes.push({
        id: entry.id,
        text: entry.text,
        byline: `${actorLabel(record.actorNames, entry.actor)} · ${formatReceived(entry.at, true)}`,
      });
      continue;
    }
    const mapped = historyLine(entry);
    if (mapped !== null) history.push(mapped);
  }
  return { notes, history };
}

export type ReadOutcome =
  | { readonly kind: "record"; readonly record: FullRecord }
  | { readonly kind: "gone" }
  | { readonly kind: "unavailable" };

export interface ReadState {
  readonly id: string;
  readonly outcome: ReadOutcome;
}
