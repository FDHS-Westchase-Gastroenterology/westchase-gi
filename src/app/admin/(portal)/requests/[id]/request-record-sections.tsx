import { formatReceived } from "@/app/admin/(portal)/requests/format";
import { RequestPrintPage } from "@/app/admin/(portal)/requests/print/request-print-page";
import type { RequestDetailRow } from "@/app/admin/(portal)/requests/queue";
import { composeFullRecord } from "@/lib/portal/request-record/reads";
import { displayNameOrEmail } from "@/lib/portal/staff-identity";
import type { RequestWorkSurface } from "@/lib/portal/workflow/contracts";

import type { HistoryLine } from "./request-history";

export function RequestHistorySection({
  historyLines,
  nameMap,
}: Readonly<{
  historyLines: readonly Readonly<HistoryLine>[];
  nameMap: ReadonlyMap<string, string>;
}>) {
  return (
    <section
      className="portal-request-history"
      data-short={historyLines.length <= 1 ? "true" : undefined}
    >
      <h2 className="portal-record-heading">Request history</h2>
      <p className="portal-request-section-description">
        Everything recorded about this request, newest first — contact attempts, status changes,
        undo corrections, and notification outcomes.
      </p>
      {historyLines.length === 0 ? (
        <p className="portal-request-history-empty">Nothing recorded yet.</p>
      ) : (
        <ul data-testid="request-history" className="portal-request-ledger">
          {historyLines.map((line) => (
            <li key={line.id} className="request-activity-item">
              <p
                className={`portal-request-ledger-event ${
                  line.undone
                    ? "portal-request-ledger-event--undone"
                    : line.attention
                      ? "portal-request-ledger-event--attention"
                      : line.quiet
                        ? "portal-request-ledger-event--quiet"
                        : ""
                }`}
              >
                {line.text}
              </p>
              <p className="portal-request-ledger-meta">
                {line.actor !== null && line.actor !== ""
                  ? `${displayNameOrEmail(nameMap, line.actor)} · `
                  : ""}
                {formatReceived(line.at, true)}
                {line.undone ? " · later undone" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* Print request prints the same paper as the packet, one page of one,
   stamped with when the page read the record. Hidden on screen; in print
   it is the only thing on the page (globals.css). */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the work surface carries workflow history entries whose types cannot be made readonly
export function RequestDetailPaper({
  row,
  surface,
  nameMap,
  preparedAt,
  printedBy,
}: Readonly<{
  row: Readonly<RequestDetailRow>;
  surface: RequestWorkSurface;
  nameMap: ReadonlyMap<string, string>;
  /** When the page read the record, ISO. */
  preparedAt: string;
  printedBy: string;
}>) {
  return (
    <div className="request-detail-paper">
      <RequestPrintPage
        record={composeFullRecord(row, surface, nameMap)}
        index={1}
        total={1}
        printedAt={preparedAt}
        printedBy={printedBy}
      />
    </div>
  );
}
