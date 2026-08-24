"use client";

import Link from "next/link";

import { PortalFeedbackMessage, usePortalFeedback } from "@/app/admin/(portal)/portal-feedback";
import { Download, Printer } from "@/components/icons";
import { useOutputGuard } from "@/components/output-feedback";

/* Appointments demotes Print and Export from page actions to a quiet
   utility group beside Add: occasional outputs, reachable but not
   competing with the recurring work of opening a request. */
export const REQUESTS_OUTPUT_UTILITY_CLASS = "portal-utility-link min-h-11";

export function NewRequestPacketLink({
  ariaLabel,
  className,
  countTestId,
  label,
}: Readonly<{
  ariaLabel: string;
  className: string;
  countTestId?: string;
  label: string;
}>) {
  const { publish } = usePortalFeedback();
  const guard = useOutputGuard();

  return (
    <Link
      href="/admin/requests/print?auto=1"
      target="_blank"
      rel="noopener"
      prefetch={false}
      aria-label={ariaLabel}
      aria-disabled={guard.locked || undefined}
      onClick={(event) => {
        if (!guard.begin()) {
          event.preventDefault();
          return;
        }
        publish({
          source: "requests-output",
          tone: "status",
          message: "Print dialog is opening in a new tab for the New-request packet.",
        });
      }}
      className={`${className} aria-disabled:pointer-events-none aria-disabled:opacity-60`}
    >
      <Printer className="h-4 w-4" />
      <span data-testid={countTestId}>{label}</span>
    </Link>
  );
}

interface RequestsOutputActionsProps {
  readonly exportHref: string;
  readonly filteredTotal: number;
  readonly filterLabel: string;
  readonly hasSearch: boolean;
  readonly newCount: number;
}

function RequestsOutputActionsBody({
  exportHref,
  filteredTotal,
  filterLabel,
  hasSearch,
  newCount,
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
      {newCount > 0 ? (
        <NewRequestPacketLink
          ariaLabel={`Print ${newCount} new appointment ${
            newCount === 1 ? "request" : "requests"
          }; opens in a new tab`}
          className={REQUESTS_OUTPUT_UTILITY_CLASS}
          label={`Print new (${newCount})`}
        />
      ) : null}
      <a
        href={exportHref}
        download
        aria-label={`Export CSV — ${filteredTotal} current ${resultWord}`}
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
