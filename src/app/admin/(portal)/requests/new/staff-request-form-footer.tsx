"use client";

import Link from "next/link";
import type { MouseEvent, RefObject } from "react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";

function submitLabel(pending: boolean, retrying: boolean): string {
  if (pending) return retrying ? "Checking appointment request…" : "Adding appointment request…";
  return retrying ? "Try same appointment request again" : "Add appointment request";
}

export function StaffRequestFormFooter({
  cancelRef,
  conflicted,
  pending,
  unavailable,
  returnHref,
  returnLabel,
  onCancelClick,
}: Readonly<{
  cancelRef: RefObject<HTMLAnchorElement | null>;
  conflicted: boolean;
  pending: boolean;
  unavailable: boolean;
  returnHref: string;
  returnLabel: string;
  onCancelClick: (event: MouseEvent<HTMLAnchorElement>) => void;
}>) {
  return (
    <footer className="portal-request-form-footer">
      <p>
        <strong>What happens next</strong>
        This creates a New request in Requests. It does not create a patient chart or send a
        notification email.
      </p>
      <div>
        {conflicted ? (
          <Link href="/admin/requests?status=new" data-slot="button" className={buttonVariants()}>
            Check New requests
          </Link>
        ) : (
          <Button
            type="submit"
            disabled={pending}
            data-testid="submit-staff-request"
            className="disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitLabel(pending, unavailable)}
          </Button>
        )}
        <Link
          ref={cancelRef}
          href={returnHref}
          aria-disabled={pending || undefined}
          tabIndex={pending ? -1 : undefined}
          data-slot="button"
          data-testid="cancel-staff-request"
          onClick={onCancelClick}
          className={buttonVariants({ variant: "outline" })}
        >
          {returnLabel}
        </Link>
      </div>
    </footer>
  );
}
