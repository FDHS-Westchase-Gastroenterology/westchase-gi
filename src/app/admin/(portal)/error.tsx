"use client";

import Link from "next/link";

import { Activity } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";

import { PortalPageHeader } from "./portal-page-header";

// Failures stay inside the authenticated workbench. We intentionally do not
// Render or log the Error object here: upstream messages can contain sensitive
// Operational context, while staff need a safe recovery path rather than a
// Technical diagnosis.
export default function PortalError({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <section aria-labelledby="portal-error-heading">
      <PortalPageHeader
        title={<span id="portal-error-heading">This view could not load</span>}
        description="The portal has not treated missing information as an empty queue or a completed task. Retry the current view, or return to a known starting point."
      />
      <div className="portal-empty-state" role="alert">
        <Activity className="h-8 w-8" aria-hidden="true" />
        <h2>Your work is still in the portal</h2>
        <p>
          No appointment request was changed by this failed page load. If retrying does not work,
          open Appointments and confirm the live queue before continuing from paper or email.
        </p>
        <div>
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Link
            href="/admin/requests"
            data-slot="button"
            className={buttonVariants({ variant: "outline" })}
          >
            Open Appointments
          </Link>
          <Link href="/admin/help#something-wrong" className="portal-inline-link">
            Get help
          </Link>
        </div>
      </div>
    </section>
  );
}
