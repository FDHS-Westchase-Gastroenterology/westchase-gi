import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Printer } from "@/components/icons";
import { requireRole } from "@/lib/portal/auth";
import { prepareNewRequestPrintPacket } from "@/lib/portal/request-print";
import { serviceClient } from "@/lib/portal/server";
import { PortalPageHeader } from "../../portal-page-header";
import { PrintPacketControls } from "./print-controls";
import { RequestPrintPacket } from "./request-print-packet";

export const metadata: Metadata = {
  title: "Print new appointment requests | Staff portal",
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

export default async function PrintNewRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ auto?: string }>;
}) {
  const session = await requireRole("staff");
  const [params, packet] = await Promise.all([
    searchParams,
    prepareNewRequestPrintPacket({
      db: serviceClient(),
      actorEmail: session.email,
    }),
  ]);

  if (!packet.ok) {
    return (
      <>
        <PortalPageHeader
          back={{ href: "/admin", label: "Back to Home" }}
          title="The print packet could not be prepared"
          description="No patient details were opened and nothing changed. The appointment-request list may be updating, or the secure audit record may be temporarily unavailable."
        />
        <section className="portal-empty-state" role="alert">
          <h2>Try again from the current queue</h2>
          <p>
            Refresh the New view before printing so the paper handoff matches
            the appointment requests that are still waiting for first contact.
          </p>
          <div>
            <Link href="/admin/requests?status=new" className="btn btn-navy min-h-11">
              Open New requests
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/admin/requests/print" className="btn btn-outline min-h-11">
              Try again
            </Link>
          </div>
        </section>
      </>
    );
  }

  if (packet.requests.length === 0) {
    return (
      <>
        <PortalPageHeader
          back={{ href: "/admin", label: "Back to Home" }}
          title="No new appointment requests to print"
          description="Every appointment request has already moved beyond New. No packet was created and nothing changed."
        />
        <section className="portal-empty-state">
          <Printer className="h-7 w-7" />
          <h2>The paper handoff is caught up</h2>
          <p>
            Return to Home for the next task, or open Appointments to review
            requests in other states.
          </p>
          <div>
            <Link href="/admin" className="btn btn-navy min-h-11">
              Back to Home
            </Link>
            <Link href="/admin/requests" className="btn btn-outline min-h-11">
              Open Appointments
            </Link>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <div className="print-hide">
        <PortalPageHeader
          back={{ href: "/admin", label: "Back to Home" }}
          title="Print new appointment requests"
          description={`${packet.requests.length} ${
            packet.requests.length === 1 ? "request is" : "requests are"
          } still New, ordered oldest first for a fair paper handoff.`}
          meta={
            <>
              <span>Prepared {referenceTime.format(new Date(packet.generatedAt))}</span>
              <span>Secure clinic copy</span>
            </>
          }
        />
        <div className="portal-print-guidance">
          <strong>Review the count before printing.</strong>
          <span>
            This packet is a snapshot of requests that were New when it was
            prepared. If it sits unattended, check Appointments before assigning it.
          </span>
        </div>
        <PrintPacketControls
          autoStart={params.auto === "1"}
          count={packet.requests.length}
        />
      </div>

      <RequestPrintPacket
        requests={packet.requests}
        generatedAt={packet.generatedAt}
      />

      <div className="portal-print-follow-up print-hide">
        <p>
          Finished printing? Return to the live queue before staff begin work.
          Paper notes do not update the portal.
        </p>
        <Link href="/admin/requests?status=new" className="btn btn-outline min-h-11">
          Open New requests
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </>
  );
}
