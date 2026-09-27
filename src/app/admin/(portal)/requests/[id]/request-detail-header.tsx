import Link from "next/link";

import { PortalPageHeader } from "@/app/admin/(portal)/portal-page-header";
import { CLOSURE_REASON_LABELS, formatReceived } from "@/app/admin/(portal)/requests/format";
import { StatusBadge } from "@/app/admin/(portal)/requests/status-badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { presentationStatus } from "@/lib/portal/workflow/contracts";
import type { RequestWorkSurface } from "@/lib/portal/workflow/contracts";

import { RequestPrintButton } from "./request-current-feedback";

/* The request's title block: back to the queue, the patient's name, how
   the request ended or stands, and its actions. Hidden in print with the
   rest of the screen section; the printed page carries its own head. */

type HeaderSurface = Pick<
  RequestWorkSurface,
  "state" | "closedAt" | "closureReason" | "legacyReviewRequired" | "bookingConfirmedAt"
>;

function requestLifecycleSummary(surface: Readonly<HeaderSurface>) {
  return surface.state === "closed" && surface.closedAt !== null && surface.closedAt !== "" ? (
    <span data-testid="request-lifecycle-summary">
      Closed {formatReceived(surface.closedAt, true)}
      {surface.closureReason !== null
        ? ` — ${CLOSURE_REASON_LABELS[surface.closureReason]}`
        : " — no appointment booked"}
      .
    </span>
  ) : surface.state === "closed" && surface.legacyReviewRequired ? (
    <span data-testid="request-lifecycle-summary">
      Closed before outcomes were recorded — how it ended still needs review.
    </span>
  ) : surface.state === "booked" &&
    surface.bookingConfirmedAt !== null &&
    surface.bookingConfirmedAt !== "" ? (
    <span data-testid="request-lifecycle-summary">
      Marked Scheduled {formatReceived(surface.bookingConfirmedAt, true)} — the appointment lives in
      the practice scheduling system.
    </span>
  ) : undefined;
}

function NeighborLink({
  href,
  rel,
  children,
}: Readonly<{ href: string | null; rel: "prev" | "next"; children: string }>) {
  if (href === null) return null;
  return (
    <Link
      href={href}
      rel={rel}
      data-testid={`${rel}-request`}
      data-slot="button"
      className={buttonVariants({ variant: "outline" })}
    >
      {children}
    </Link>
  );
}

export function RequestDetailHeader({
  name,
  surface,
  queueHref,
  prevHref,
  nextHref,
}: Readonly<{
  name: string;
  surface: Readonly<HeaderSurface>;
  queueHref: string;
  prevHref: string | null;
  nextHref: string | null;
}>) {
  return (
    <PortalPageHeader
      back={{ href: queueHref, label: "Back to Requests" }}
      title={
        <span id="request-heading" data-testid="request-detail-name" data-ui-redact="patient-name">
          {name}
        </span>
      }
      description={requestLifecycleSummary(surface)}
      actions={
        <>
          <NeighborLink href={prevHref} rel="prev">
            Previous
          </NeighborLink>
          <NeighborLink href={nextHref} rel="next">
            Next
          </NeighborLink>
          {surface.legacyReviewRequired ? (
            <span data-testid="legacy-review-tag" className="portal-review-tag">
              Needs review
            </span>
          ) : null}
          <StatusBadge status={presentationStatus(surface.state)} />
          <RequestPrintButton />
        </>
      }
    />
  );
}
