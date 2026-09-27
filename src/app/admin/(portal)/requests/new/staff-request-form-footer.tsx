"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import type { MouseEvent, RefObject } from "react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";

/* The sheet's ways out. Cancel leads and the answer trails, as in every
   Apple sheet: the eye ends on the action. Hosted on Home's glass, each
   button names its glass role (`data-glass`, home.css "Glass sheets") and
   the sheet paints the capsule; on the standalone page the same buttons
   wear the plain recipe. `data-request-exit` marks the controls a field's
   blur check must not answer: focus leaving for them means the sheet is
   closing or asking to (staff-request-fields.tsx). */

function submitLabel(unavailable: boolean): string {
  return unavailable ? "Try again" : "Add request";
}

export function StaffRequestFormFooter({
  cancelRef,
  conflicted,
  hosted,
  pending,
  unavailable,
  returnHref,
  returnLabel,
  onCancelClick,
}: Readonly<{
  cancelRef: RefObject<HTMLAnchorElement | null>;
  conflicted: boolean;
  hosted: boolean;
  pending: boolean;
  unavailable: boolean;
  returnHref: string;
  returnLabel: string;
  onCancelClick: (event: MouseEvent<HTMLAnchorElement>) => void;
}>) {
  return (
    <footer className="portal-request-form-footer">
      <Link
        ref={cancelRef}
        href={returnHref}
        aria-disabled={pending || undefined}
        tabIndex={pending ? -1 : undefined}
        data-slot="button"
        data-glass="secondary"
        data-request-exit=""
        data-testid="cancel-staff-request"
        onClick={onCancelClick}
        className={buttonVariants({ variant: "outline" })}
      >
        {hosted ? "Cancel" : returnLabel}
      </Link>
      {conflicted ? (
        <Link
          href="/admin/requests?status=new"
          data-slot="button"
          data-glass="primary"
          className={buttonVariants()}
        >
          Check New requests
        </Link>
      ) : (
        <Button
          type="submit"
          disabled={pending}
          data-glass="primary"
          data-testid="submit-staff-request"
          className="disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2Icon data-icon="inline-start" className="animate-spin" aria-hidden="true" />
              Adding…
            </>
          ) : (
            submitLabel(unavailable)
          )}
        </Button>
      )}
    </footer>
  );
}

/* A5: Cancel or Escape with entries turns the footer into the question,
   asked in place on a solid coral panel under the well, so only one modal
   is ever on screen. Keep editing leads and takes focus: the safe answer is
   the one Return and Space reach first. */
export function DiscardStaffRequestPrompt({
  onKeepEditing,
  onDiscard,
}: Readonly<{
  onKeepEditing: () => void;
  onDiscard: () => void;
}>) {
  return (
    <div
      role="group"
      aria-labelledby="discard-staff-request-title"
      aria-describedby="discard-staff-request-copy"
      data-request-exit=""
      data-testid="discard-staff-request-prompt"
      className="portal-request-discard"
    >
      <div className="portal-request-discard-copy">
        <strong id="discard-staff-request-title">Discard this request?</strong>
        <p id="discard-staff-request-copy">What you entered won&rsquo;t be kept.</p>
      </div>
      <div className="portal-request-discard-actions">
        <Button
          type="button"
          variant="outline"
          autoFocus
          data-glass="secondary"
          data-testid="keep-editing-staff-request"
          onClick={onKeepEditing}
        >
          Keep editing
        </Button>
        <Button
          type="button"
          variant="destructive"
          data-glass="destructive"
          data-testid="discard-staff-request"
          onClick={onDiscard}
        >
          Discard
        </Button>
      </div>
    </div>
  );
}
