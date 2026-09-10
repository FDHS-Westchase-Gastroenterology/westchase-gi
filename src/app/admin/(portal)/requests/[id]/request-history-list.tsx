import { cn } from "cn";

/* Request history, rendered. The lines arrive already shaped (see
   request-record.ts): the staff-identity read that resolves an actor's name
   is server-only, so the shaping happens once on the server and both
   surfaces — Home's full-record sheet and the request page — render the same
   plain views here. */

export interface RequestHistoryView {
  readonly id: string;
  readonly text: string;
  /** Who and when, already joined; empty when the entry has no actor. */
  readonly meta: string;
  readonly undone: boolean;
  readonly attention: boolean;
  readonly quiet: boolean;
}

function eventTone(line: Readonly<RequestHistoryView>): string {
  if (line.undone) return "portal-request-ledger-event--undone";
  if (line.attention) return "portal-request-ledger-event--attention";
  if (line.quiet) return "portal-request-ledger-event--quiet";
  return "";
}

export function RequestHistorySection({
  lines,
  className,
}: Readonly<{
  lines: readonly Readonly<RequestHistoryView>[];
  className?: string;
}>) {
  return (
    <section
      className={cn("request-print-card portal-request-history", className)}
      data-short={lines.length <= 1 ? "true" : undefined}
    >
      <h2 className="portal-record-heading">Request history</h2>
      <p className="portal-request-section-description">
        Everything recorded about this request, newest first — contact attempts, status changes,
        undo corrections, and notification outcomes.
      </p>
      {lines.length === 0 ? (
        <p className="portal-request-history-empty">Nothing recorded yet.</p>
      ) : (
        <ul data-testid="request-history" className="portal-request-ledger">
          {lines.map((line) => (
            <li key={line.id} className="request-activity-item">
              <p className={cn("portal-request-ledger-event", eventTone(line))}>{line.text}</p>
              <p className="portal-request-ledger-meta">{line.meta}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
