import Link from "next/link";

import { isDefaultView } from "@/lib/portal/filters";
import type { ActiveFilter } from "@/lib/portal/filters";

import { emptyStateMessage, requestCount } from "./home-line";
import type { HomeLine } from "./home-line";

/* Why a filtered list is empty, in Home's words. Home's list and the Print
   sheet's table both say it, each over its own filters: the buttons act
   on whichever filters the caller hands in. `testIdPrefix` keeps the two
   apart while both are on screen. */

export function FilterEmptyState({
  lines,
  active,
  nowMs,
  testIdPrefix,
  onShowAll,
  onClear,
}: Readonly<{
  lines: readonly Readonly<HomeLine>[];
  active: readonly ActiveFilter[];
  nowMs: number;
  testIdPrefix: string;
  /** Take the Status pills off: the whole list. */
  onShowAll: () => void;
  onClear: () => void;
}>) {
  if (lines.length === 0) {
    return (
      <div
        className="wgi-empty"
        data-testid={`${testIdPrefix}-empty`}
        data-tour={`${testIdPrefix}-empty`}
      >
        <h2>No requests yet.</h2>
        <p>
          A website request lands here the moment a patient submits the form, and a contacted
          request comes back on the day staff set for it.
        </p>
      </div>
    );
  }
  if (isDefaultView(active)) {
    /* The list as it opens holds the work due now; an empty one is a
       caught-up desk, not a filter to debug. */
    return (
      <div
        className="wgi-empty"
        data-testid={`${testIdPrefix}-caught-up`}
        data-tour={`${testIdPrefix}-empty`}
      >
        <h2>Nothing to call right now.</h2>
        <p>
          No new requests and no calls due. {requestCount(lines.length)} wait on a later date or are
          already handled.
        </p>
        <button type="button" className="wgi-empty-clear" onClick={onShowAll}>
          Show all requests
        </button>
      </div>
    );
  }
  return (
    <div
        className="wgi-empty"
        data-testid={`${testIdPrefix}-no-results`}
        data-tour={`${testIdPrefix}-empty`}
      >
      <h2>No results</h2>
      <p>{emptyStateMessage(lines, active, nowMs)}</p>
      <button type="button" className="wgi-empty-clear" onClick={onClear}>
        Clear filters
      </button>
    </div>
  );
}

/** Said under a list that asks for Closed when the closed tail was cut at
    its fetch window (`closedTailCut`): Home's list and the Print sheet's
    table hold only the latest closed requests. */
export function ClosedTailNote() {
  return (
    <span className="wgi-list-note">
      Showing the latest closed requests —{" "}
      <Link href="/admin/requests?status=closed">older ones live in Requests</Link>.
    </span>
  );
}
