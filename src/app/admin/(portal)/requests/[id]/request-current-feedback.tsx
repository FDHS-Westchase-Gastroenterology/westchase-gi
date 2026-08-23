"use client";

import { useEffect } from "react";

import { PortalFeedbackMessage, usePortalFeedback } from "@/app/admin/(portal)/portal-feedback";
import { Check, Printer } from "@/components/icons";
import { useOutputGuard } from "@/components/output-feedback";

export function StaffRequestCreatedAcknowledgement() {
  const { feedback } = usePortalFeedback();

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("created") !== "1") return;
    url.searchParams.delete("created");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, []);

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

export function RequestPrintButton() {
  const { publish } = usePortalFeedback();
  const { begin, locked } = useOutputGuard({ releaseOnAfterPrint: true });

  return (
    <button
      type="button"
      aria-disabled={locked || undefined}
      data-testid="print-request"
      onClick={() => {
        if (!begin()) return;
        publish({
          source: "request-print",
          tone: "status",
          message: "Print dialog is opening for this request.",
        });
        window.requestAnimationFrame(() => {
          window.print();
        });
      }}
      className="btn btn-navy print-hide aria-disabled:pointer-events-none aria-disabled:opacity-60"
    >
      <Printer className="h-4.5 w-4.5" /> Print request
    </button>
  );
}

export function RequestPrintFeedback() {
  return <PortalFeedbackMessage source="request-print" testId="request-print-feedback" />;
}
