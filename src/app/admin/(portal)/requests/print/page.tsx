import type { Metadata } from "next";
import Link from "next/link";

import { PortalFeedbackProvider } from "@/app/admin/(portal)/portal-feedback";
import { PortalPageHeader } from "@/app/admin/(portal)/portal-page-header";
import { STATUS_LABELS } from "@/app/admin/(portal)/requests/format";
import { ArrowRight, Printer } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button-variants";
import { recordAudit } from "@/lib/portal/audit";
import { requireRole } from "@/lib/portal/auth";
import { AUDIT_ACTIONS } from "@/lib/portal/contracts";
import {
  formatStatusList,
  isNewOnlyPrintSelection,
  parsePrintIdSelection,
  parsePrintStatusSelection,
  printPacketHref,
  printPacketIdsHref,
} from "@/lib/portal/print-selection";
import {
  prepareIdRequestPrintPacket,
  prepareStatusRequestPrintPacket,
} from "@/lib/portal/request-print";
import { serviceClient } from "@/lib/portal/server";
import type { RequestStatus } from "@/lib/portal/workflow/contracts";

import { PrintPacketControls } from "./print-controls";
import { RequestPrintPage } from "./request-print-page";

export const metadata: Metadata = {
  title: "Print appointment requests | Staff portal",
};

export const dynamic = "force-dynamic";

const referenceTime = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/New_York",
  timeZoneName: "short",
});

/* A packet is either the requests staff chose by id or every request in the
   chosen statuses. `ids` wins when both are present. */
type PacketChoice =
  | { kind: "ids"; ids: readonly string[] }
  | { kind: "status"; statuses: readonly RequestStatus[]; newOnly: boolean };

function packetChoice(
  params: Readonly<{ ids?: string | readonly string[]; status?: string | readonly string[] }>,
): PacketChoice | null {
  if (params.ids !== undefined) {
    const ids = parsePrintIdSelection(params.ids);
    return ids === null ? null : { kind: "ids", ids };
  }
  const selection = parsePrintStatusSelection(params.status);
  if (selection === "invalid") return null;
  return {
    kind: "status",
    statuses: selection === "default" ? ["new"] : selection,
    newOnly: isNewOnlyPrintSelection(selection),
  };
}

function retryHref(choice: Readonly<PacketChoice>): string {
  return choice.kind === "ids"
    ? printPacketIdsHref(choice.ids, false)
    : printPacketHref(choice.statuses, false);
}

function PacketQueueLink({ newOnly }: Readonly<{ newOnly: boolean }>) {
  return (
    <Link
      href={newOnly ? "/admin/requests?status=new" : "/admin/requests"}
      data-slot="button"
      className={buttonVariants({ variant: "outline" })}
    >
      {newOnly ? "Open New requests" : "Open Requests"}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

/* A read or audit failure. A retry link appears only when trying again can
   help; an audit failure sends staff back to Home, as it always has. */
function PrintUnavailable({ retry, newOnly }: Readonly<{ retry?: string; newOnly: boolean }>) {
  return (
    <>
      <PortalPageHeader
        back={{ href: "/admin", label: "Back to Home" }}
        title="Printing is temporarily unavailable"
        description="No patient details were shown and no appointment request changed."
      />
      <section className="portal-empty-state" role="alert">
        <h2>Try preparing the packet again</h2>
        <p>
          The secure print service did not prepare a packet. Try again once. If it still fails,
          continue from Requests so work is not blocked, then report the printing problem.
        </p>
        <div>
          {retry === undefined ? (
            <Link href="/admin" data-slot="button" className={buttonVariants()}>
              Back to Home
            </Link>
          ) : (
            <>
              <Link href={retry} prefetch={false} data-slot="button" className={buttonVariants()}>
                Try again
              </Link>
              <PacketQueueLink newOnly={newOnly} />
            </>
          )}
        </div>
      </section>
    </>
  );
}

export default async function PrintNewRequestsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ auto?: string; ids?: string | string[]; status?: string | string[] }>;
}>) {
  const session = await requireRole("staff");
  const params = await searchParams;
  const choice = packetChoice(params);
  if (choice === null) {
    return (
      <>
        <PortalPageHeader
          back={{ href: "/admin", label: "Back to Home" }}
          title="That print list is not valid"
          description="No patient details were shown and no appointment request changed."
        />
        <section className="portal-empty-state" role="alert">
          <h2>Choose what to print again</h2>
          <p>Use Print on Home or Requests to choose the appointment requests to print.</p>
          <div>
            <Link href="/admin" data-slot="button" className={buttonVariants()}>
              Back to Home
            </Link>
          </div>
        </section>
      </>
    );
  }

  const newOnly = choice.kind === "status" && choice.newOnly;
  const db = serviceClient();
  const packet =
    choice.kind === "ids"
      ? await prepareIdRequestPrintPacket({ db, ids: choice.ids })
      : await prepareStatusRequestPrintPacket({ db, statuses: choice.statuses });

  if (!packet.ok && packet.reason === "missing") {
    return (
      <>
        <PortalPageHeader
          back={{ href: "/admin", label: "Back to Home" }}
          title="A chosen request is no longer available"
          description="No patient details were shown and no appointment request changed."
        />
        <section className="portal-empty-state" role="alert">
          <h2>Choose the requests again</h2>
          <p>
            At least one request in this list could not be found, so no packet was prepared. Return
            to Home or Requests and choose the requests to print again.
          </p>
          <div>
            <Link href="/admin" data-slot="button" className={buttonVariants()}>
              Back to Home
            </Link>
            <PacketQueueLink newOnly={false} />
          </div>
        </section>
      </>
    );
  }

  if (!packet.ok) return <PrintUnavailable retry={retryHref(choice)} newOnly={newOnly} />;

  /* The audit row is written before any patient detail renders: a packet
     whose audit failed is a packet that never printed. */
  try {
    await recordAudit(db, {
      actorEmail: session.email,
      action: AUDIT_ACTIONS.REQUESTS_PRINT_NEW,
      entity: "requests",
      entityId: null,
      detail: {
        row_count: packet.records.length,
        status_filter: choice.kind === "status" ? choice.statuses.join(",") : null,
        request_ids: packet.records.map((record) => record.id),
      },
    });
  } catch {
    return <PrintUnavailable newOnly={newOnly} />;
  }

  const count = packet.records.length;
  const statusList =
    choice.kind === "status" ? formatStatusList(choice.statuses, STATUS_LABELS) : "";

  if (count === 0) {
    return (
      <>
        <PortalPageHeader
          back={{ href: "/admin", label: "Back to Home" }}
          title={`No ${statusList} appointment requests to print`}
          description={`None of those statuses had requests when this packet was prepared. No pages were created and no request changed.`}
        />
        <section className="portal-empty-state">
          <Printer className="h-7 w-7" />
          <h2>There is no {statusList} work to hand off</h2>
          <p>
            The live queue may have changed since you opened this window. Return to Home for the
            next task, or open Requests to review the current queue.
          </p>
          <div>
            <Link href="/admin" data-slot="button" className={buttonVariants()}>
              Back to Home
            </Link>
            <Link
              href="/admin/requests"
              data-slot="button"
              className={buttonVariants({ variant: "outline" })}
            >
              Open Requests
            </Link>
          </div>
        </section>
      </>
    );
  }

  const printedBy = session.displayName === "" ? session.email : session.displayName;
  const description =
    choice.kind === "ids"
      ? `${count} chosen ${count === 1 ? "request" : "requests"}, ordered oldest first for a fair paper handoff.`
      : `${count} ${
          count === 1 ? "request was" : "requests were"
        } ${statusList} when this packet was prepared, ordered oldest first for a fair paper handoff.`;

  return (
    <PortalFeedbackProvider>
      <div className="print-hide">
        <PortalPageHeader
          back={{ href: "/admin", label: "Back to Home" }}
          title={newOnly ? "Print new appointment requests" : "Print appointment requests"}
          description={description}
          meta={
            <>
              <span>Prepared {referenceTime.format(new Date(packet.preparedAt))}</span>
              <span>Secure clinic copy</span>
            </>
          }
        />
        <div className="portal-print-guidance">
          <strong>Confirm the page count before printing.</strong>
          <span>
            This is a time-stamped snapshot. If the packet sits unattended, compare it with the live
            queue before handing out the pages.
          </span>
        </div>
        <PrintPacketControls autoStart={params.auto === "1"} count={count} />
      </div>

      <section
        className="portal-print-packet"
        aria-label={
          newOnly ? "New appointment request print packet" : "Appointment request print packet"
        }
      >
        {packet.records.map((record, index) => (
          <RequestPrintPage
            key={record.id}
            record={record}
            index={index + 1}
            total={count}
            printedAt={packet.preparedAt}
            printedBy={printedBy}
          />
        ))}
      </section>

      <div className="portal-print-follow-up print-hide">
        <p>
          Finished printing? Close this packet window, then return to the live queue before staff
          begin work. Paper notes do not update the portal.
        </p>
        <PacketQueueLink newOnly={newOnly} />
      </div>
    </PortalFeedbackProvider>
  );
}
