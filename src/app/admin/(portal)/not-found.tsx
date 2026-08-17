import Link from "next/link";

import { CircleHelp } from "@/components/icons";

import { PortalPageHeader } from "./portal-page-header";

export default function PortalNotFound() {
  return (
    <section aria-labelledby="portal-not-found-heading">
      <PortalPageHeader
        title={<span id="portal-not-found-heading">This page is not available</span>}
        description="The address may be outdated, or the appointment request may no longer be available from this link."
      />
      <div className="portal-empty-state">
        <CircleHelp className="h-8 w-8" aria-hidden="true" />
        <h2>Return to the live work stack</h2>
        <p>
          Open Appointments to find the current request and its recorded status. Do not use an old
          paper copy as the final record.
        </p>
        <div>
          <Link href="/admin/requests" className="btn btn-navy min-h-11">
            Open Appointments
          </Link>
          <Link href="/admin" className="btn btn-outline min-h-11">
            Return Home
          </Link>
        </div>
      </div>
    </section>
  );
}
