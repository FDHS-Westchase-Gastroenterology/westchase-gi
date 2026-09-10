"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { usePortalFeedback } from "@/app/admin/(portal)/portal-feedback";
import { Check, Printer } from "@/components/icons";
import { useOutputGuard } from "@/components/output-feedback";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast-manager";

export function StaffRequestCreatedAcknowledgement() {
  const { feedback } = usePortalFeedback();
  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("created") !== "1") return;
    url.searchParams.delete("created");
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
  }, [router]);

  if (feedback?.source !== "request-created") return null;

  return (
    <div
      role="status"
      aria-atomic="true"
      data-testid="staff-request-created"
      className="portal-request-created"
    >
      <Check className="h-5 w-5" />
      <div>
        <strong>Appointment request added to New.</strong>
        <p>No notification email was sent. The request is ready for staff follow-up below.</p>
      </div>
    </div>
  );
}

/* Printing, without the button around it. Both surfaces that can print a
   request — the request page's header and Home's full-record sheet — need
   the same guard against a double press and the same acknowledgement, and
   neither should have to borrow the other's chrome to get it. The packet
   itself is authored in the print block of globals.css. */
export function useRequestPrint(patientName: string) {
  const { begin, locked } = useOutputGuard({ releaseOnAfterPrint: true });

  const print = () => {
    if (!begin()) return;
    /* No type, so no glyph: nothing has succeeded or failed yet. This is the
       portal saying "yes, that press landed" while the browser's own dialog
       takes over the screen, and it leaves on its own. */
    toast.add({
      title: "Print dialog is opening",
      description: patientName,
      // The description names a patient; the capture script redacts by this.
      data: { redact: "patient-name" },
    });
    window.requestAnimationFrame(() => {
      window.print();
    });
  };

  return { locked, print };
}

export function RequestPrintButton({ patientName }: Readonly<{ patientName: string }>) {
  const { locked, print } = useRequestPrint(patientName);

  return (
    <Button
      type="button"
      aria-disabled={locked || undefined}
      data-testid="print-request"
      onClick={print}
      className="print-hide aria-disabled:pointer-events-none aria-disabled:opacity-60"
    >
      <Printer className="h-4.5 w-4.5" /> Print request
    </Button>
  );
}
