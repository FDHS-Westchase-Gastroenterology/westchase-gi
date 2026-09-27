import Link from "next/link";

import { STAFF_REQUEST_SOURCE_PATH } from "@/lib/portal/contracts";
import { requestsHref } from "@/lib/portal/request-query";
import type { RequestStatus } from "@/lib/portal/workflow/contracts";

import { STATUS_LABELS } from "./format";

function EmptyQueueAction({
  page,
  search,
  filter,
}: Readonly<{
  page: number;
  search: string;
  filter: RequestStatus | "all";
}>) {
  return (
    <>
      {page === 1 && !search && filter === "all" ? (
        <Link
          href={`${STAFF_REQUEST_SOURCE_PATH}?from=appointments`}
          className="portal-inline-link"
        >
          Add an appointment request from a call or visit
        </Link>
      ) : page === 1 && search ? (
        <Link
          href={requestsHref({ page: 1, search: "", status: filter })}
          className="portal-inline-link"
        >
          Clear search
        </Link>
      ) : page === 1 && filter !== "all" ? (
        <Link
          href={requestsHref({ page: 1, search, status: "all" })}
          className="portal-inline-link"
        >
          View all requests
        </Link>
      ) : null}
    </>
  );
}

export function EmptyQueue({
  page,
  search,
  filter,
}: Readonly<{
  page: number;
  search: string;
  filter: RequestStatus | "all";
}>) {
  return (
    <div className="portal-queue-empty">
      <h2>
        {page > 1
          ? "No requests are available on this page"
          : search
            ? "No appointment requests match that search"
            : filter === "all"
              ? "No appointment requests yet"
              : `Nothing marked ${STATUS_LABELS[filter].toLowerCase()}`}
      </h2>
      <p>
        {page > 1
          ? "Go back to the previous page to continue reviewing requests."
          : search
            ? "Try a name, phone number, or email address."
            : filter === "all"
              ? "When a patient submits the appointment form on the website, the appointment request appears here instantly and everyone on the notification list gets a notification email."
              : "Requests reach this view as staff work them from their request page — open one from another view to record what happened."}
      </p>
      <EmptyQueueAction page={page} search={search} filter={filter} />
    </div>
  );
}
