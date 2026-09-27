import { historyLine } from "@/app/admin/(portal)/requests/[id]/request-history";
import {
  CLOSURE_REASON_LABELS,
  CONTACT_OUTCOME_LABELS,
  LOCATION_LABELS,
  OUTCOME_HISTORY_LABELS,
  TIME_LABELS,
  formatPhoneForDisplay,
  localeLabel,
} from "@/app/admin/(portal)/requests/format";
import {
  actorLabel,
  dayOnlyLabel,
  exactTimeLabel,
  originLabel,
  recordSections,
  undoneAttemptIds,
} from "@/app/admin/(portal)/requests/record-sections";
import { STATUS_WORDS } from "@/lib/portal/filters/status";
import type { FullRecord } from "@/lib/portal/request-record/contracts";
import { presentationStatus } from "@/lib/portal/workflow/contracts";

/* What one printed page says, derived from the full record alone so the
   print route, the record's own print button and the Print sheet's
   preview print the same words. The page is a call sheet: who to call and
   how, what they asked, what the desk has already tried, and a box to
   write this call into. Empty sections are left out rather than printed
   as "none". */

export interface PrintedNote {
  readonly id: string;
  readonly text: string;
  readonly byline: string;
}

export interface PrintedHistoryRow {
  readonly id: string;
  readonly day: string;
  readonly event: string;
  readonly who: string | null;
  readonly undone: boolean;
}

export interface PrintedPage {
  readonly name: string;
  /** Home's status word, printed as an outlined chip. */
  readonly status: string;
  /** Where the request stands, then when and where it came in. */
  readonly standing: string;
  readonly phone: string;
  /** Null when the patient gave none; the page says to call instead. */
  readonly email: string | null;
  readonly office: string;
  readonly time: string;
  readonly language: string;
  /** A language other than English is set in bold, so the caller notices. */
  readonly languageStands: boolean;
  readonly message: string | null;
  /** Newest first. */
  readonly notes: readonly PrintedNote[];
  /** Newest first: call outcomes, status moves and undos only. */
  readonly history: readonly PrintedHistoryRow[];
}

/* The six outcomes a caller can tick, in the portal's words shortened for
   paper and laid out in reading order across three columns. */
export const THIS_CALL_OUTCOMES = [
  OUTCOME_HISTORY_LABELS.booked,
  OUTCOME_HISTORY_LABELS.voicemail,
  OUTCOME_HISTORY_LABELS.no_answer,
  "Reached — follow-up needed",
  "Won't schedule",
  OUTCOME_HISTORY_LABELS.not_actionable,
] as const;

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
function standingLine(record: FullRecord, attempts: number): string {
  const status = presentationStatus(record.state);
  const parts: string[] = [];
  if (status === "contacted") {
    parts.push(
      record.callAgainAt === null
        ? "No call-again day"
        : `Next call ${dayOnlyLabel(record.callAgainAt)}`,
    );
  } else if (status === "scheduled") {
    parts.push(
      record.appointmentAt !== null
        ? `Appointment ${dayOnlyLabel(record.appointmentAt)}`
        : record.bookingConfirmedAt !== null
          ? `Booked ${dayOnlyLabel(record.bookingConfirmedAt)}`
          : "Appointment booked",
    );
  } else if (status === "closed") {
    const reason =
      record.closureReason === null ? null : CLOSURE_REASON_LABELS[record.closureReason];
    const when = record.closedAt === null ? "Closed" : `Closed ${dayOnlyLabel(record.closedAt)}`;
    parts.push(reason === null ? when : `${when} — ${reason}`);
  }
  parts.push(
    attempts === 0
      ? "Not called yet"
      : attempts === 1
        ? "1 attempt so far"
        : `${attempts} attempts so far`,
  );
  /* Before the first call the exact time it came in is what the caller
     weighs; after it, the day is enough. */
  const received =
    attempts === 0 ? exactTimeLabel(record.createdAt) : dayOnlyLabel(record.createdAt);
  const origin = originLabel(record);
  parts.push(
    origin === "Added by staff"
      ? `added by staff ${received}`
      : origin === "Website form"
        ? `received ${received} from the website`
        : `received ${received}`,
  );
  return parts.join(" · ");
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
function historyRows(record: FullRecord): PrintedHistoryRow[] {
  const isUndoneAttempt = undoneAttemptIds(record.history);
  const rows: PrintedHistoryRow[] = [];
  for (const entry of record.history) {
    if (entry.kind === "contact_attempt") {
      const next =
        entry.callAgainAt !== null && entry.callAgainAt !== ""
          ? ` · call again ${dayOnlyLabel(entry.callAgainAt)}`
          : " · no call-again day";
      rows.push({
        id: entry.id,
        day: dayOnlyLabel(entry.at),
        event: `${CONTACT_OUTCOME_LABELS[entry.outcome]}${next}`,
        who: actorLabel(record.actorNames, entry.actor),
        undone: isUndoneAttempt(entry.id),
      });
      continue;
    }
    if (entry.kind !== "contact_completed" && entry.kind !== "transition" && entry.kind !== "undo")
      continue;
    const line = historyLine(entry);
    if (line === null) continue;
    rows.push({
      id: line.id,
      day: dayOnlyLabel(line.at),
      event: line.text,
      who: line.actor === null ? null : actorLabel(record.actorNames, line.actor),
      undone: line.undone,
    });
  }
  return rows;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
export function printedPage(record: FullRecord): PrintedPage {
  const { attempts } = recordSections(record);
  const notes: PrintedNote[] = [];
  for (const entry of record.history) {
    if (entry.kind !== "note") continue;
    const text = entry.text.trim();
    if (text === "") continue;
    notes.push({
      id: entry.id,
      text,
      byline: `${actorLabel(record.actorNames, entry.actor)} · ${exactTimeLabel(entry.at)}`,
    });
  }
  const email = record.email?.trim() ?? "";
  const message = record.message?.trim() ?? "";
  return {
    name: record.name,
    status: STATUS_WORDS[presentationStatus(record.state)],
    standing: standingLine(record, attempts),
    phone: formatPhoneForDisplay(record.phone),
    email: email === "" ? null : email,
    office: LOCATION_LABELS[record.location],
    time: TIME_LABELS[record.preferredTime],
    language: localeLabel(record.locale),
    languageStands: record.locale !== "en",
    message: message === "" ? null : message,
    notes,
    history: historyRows(record),
  };
}

/** "Printed Tue, Sep 15, 7:40 PM by Maria R." */
export function printedLine(printedAt: string, printedBy: string | null): string {
  const when = `Printed ${exactTimeLabel(printedAt)}`;
  return printedBy === null || printedBy === "" ? when : `${when} by ${printedBy}`;
}
