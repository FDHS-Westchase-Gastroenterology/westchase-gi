import "server-only";

import { CLOSURE_REASON_LABELS, formatReceived } from "@/app/admin/(portal)/requests/format";
import { displayNameOrEmail } from "@/lib/portal/staff-identity";
import type { HistoryEntry, RequestWorkSurface } from "@/lib/portal/workflow/contracts";

import { historyLine } from "./request-history";
import type { RequestHistoryView } from "./request-history-list";
import type { RequestNoteView } from "./request-notes";

/* One request's record, shaped once. Home's full-record sheet reads these
   views through a server action and the request page composes them in its
   own render; neither surface keeps a second opinion about what a history
   line says or who wrote it. Resolving an actor's email to a display name
   is a server-only read, which is why the shaping lives here and the markup
   lives in request-history-list.tsx. */

export interface RequestRecordViews {
  readonly notes: readonly RequestNoteView[];
  readonly history: readonly RequestHistoryView[];
  /** True when a staff member entered this request rather than the website form. */
  readonly staffCreated: boolean;
}

export function requestRecordViews(
  history: readonly Readonly<HistoryEntry>[],
  nameMap: ReadonlyMap<string, string>,
): RequestRecordViews {
  // Notes and history come from one composed read. Notes keep their own
  // Surface; every other evidence kind renders in Request history.
  const notes: RequestNoteView[] = [];
  const lines: RequestHistoryView[] = [];
  let staffCreated = false;
  for (const entry of history) {
    if (entry.kind === "created" && entry.origin === "staff") staffCreated = true;
    if (entry.kind === "note") {
      notes.push({
        id: entry.id,
        text: entry.text,
        byline: `${displayNameOrEmail(nameMap, entry.actor)} · ${formatReceived(entry.at, true)}`,
      });
      continue;
    }
    const line = historyLine(entry);
    if (line === null) continue;
    lines.push({
      id: line.id,
      text: line.text,
      meta: `${
        line.actor !== null && line.actor !== ""
          ? `${displayNameOrEmail(nameMap, line.actor)} · `
          : ""
      }${formatReceived(line.at, true)}${line.undone ? " · later undone" : ""}`,
      undone: line.undone,
      attention: line.attention,
      quiet: line.quiet,
    });
  }
  return { notes, history: lines, staffCreated };
}

/** How this request ended, in one sentence, or null while it is still open. */
export function requestLifecycleSummary(
  surface: Readonly<
    Pick<
      RequestWorkSurface,
      "state" | "closedAt" | "closureReason" | "legacyReviewRequired" | "bookingConfirmedAt"
    >
  >,
): string | null {
  if (surface.state === "closed" && surface.closedAt !== null && surface.closedAt !== "") {
    const reason =
      surface.closureReason !== null
        ? ` — ${CLOSURE_REASON_LABELS[surface.closureReason]}`
        : " — no appointment booked";
    return `Closed ${formatReceived(surface.closedAt, true)}${reason}.`;
  }
  if (surface.state === "closed" && surface.legacyReviewRequired) {
    return "Closed before outcomes were recorded — how it ended still needs review.";
  }
  if (
    surface.state === "booked" &&
    surface.bookingConfirmedAt !== null &&
    surface.bookingConfirmedAt !== ""
  ) {
    return `Marked Scheduled ${formatReceived(
      surface.bookingConfirmedAt,
      true,
    )} — the appointment lives in the practice scheduling system.`;
  }
  return null;
}
