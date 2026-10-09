import Link from "next/link";

import { CircleHelp } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button-variants";

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
          Find the current request on Home, or search the Schedule for the patient. Do not use an
          old paper copy as the final record.
        </p>
        <div>
          <Link href="/admin" data-slot="button" className={buttonVariants()}>
            Return Home
          </Link>
          <Link
            href="/admin/schedule"
            data-slot="button"
            className={buttonVariants({ variant: "outline" })}
          >
            Open Schedule
          </Link>
        </div>
      </div>
    </section>
  );
}
