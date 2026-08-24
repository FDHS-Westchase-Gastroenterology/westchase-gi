"use client";

import { PortalFeedbackMessage, usePortalFeedback } from "@/app/admin/(portal)/portal-feedback";
import { Download } from "@/components/icons";
import { useOutputGuard } from "@/components/output-feedback";
import type { RequestStatus } from "@/lib/portal/contracts";

import { PrintChooser } from "./print-chooser";

/* Appointments demotes Print and Export from page actions to a quiet
   utility group beside Add: occasional outputs, reachable but not
   competing with the recurring work of opening a request. */
export const REQUESTS_OUTPUT_UTILITY_CLASS = "portal-utility-link min-h-11";

interface RequestsOutputActionsProps {
  readonly exportHref: string;
  readonly filteredTotal: number;
  readonly filterLabel: string;
  readonly hasSearch: boolean;
  readonly statusCounts: Readonly<Partial<Record<RequestStatus, number | null>>>;
}

function RequestsOutputActionsBody({
  exportHref,
  filteredTotal,
  filterLabel,
  hasSearch,
  statusCounts,
}: Readonly<RequestsOutputActionsProps>) {
  const { publish } = usePortalFeedback();
  const exportGuard = useOutputGuard();
  const resultWord = filteredTotal === 1 ? "result" : "results";
  const filterScope = filterLabel === "All" ? "All view" : `${filterLabel} filter`;
  const exportScope = hasSearch
    ? `Exports all ${filteredTotal} ${resultWord} in the current search and ${filterScope}.`
    : `Exports all ${filteredTotal} ${resultWord} in the current ${filterScope}.`;

  return (
    <>
      <PrintChooser statusCounts={statusCounts} triggerClassName={REQUESTS_OUTPUT_UTILITY_CLASS} />
      <a
        href={exportHref}
        download
        aria-label={`Export CSV: ${filteredTotal} current ${resultWord}`}
        aria-describedby="request-export-scope"
        aria-disabled={exportGuard.locked || undefined}
        data-testid="export-csv"
        onClick={(event) => {
          if (!exportGuard.begin()) {
            event.preventDefault();
            return;
          }
          publish({
            source: "requests-output",
            tone: "status",
            message: `CSV download started for ${filteredTotal} current ${resultWord}.`,
          });
        }}
        className={REQUESTS_OUTPUT_UTILITY_CLASS}
      >
        <Download className="h-4 w-4" />
        Export CSV
      </a>
      <span id="request-export-scope" className="sr-only">
        {exportScope}
      </span>
    </>
  );
}

export function RequestsOutputActions(props: Readonly<RequestsOutputActionsProps>) {
  return <RequestsOutputActionsBody {...props} />;
}

export function RequestsOutputFeedback() {
  return <PortalFeedbackMessage source="requests-output" testId="requests-output-feedback" />;
}
