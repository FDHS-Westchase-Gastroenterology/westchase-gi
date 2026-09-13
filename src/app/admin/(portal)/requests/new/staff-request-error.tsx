"use client";

import Link from "next/link";
import type { Ref } from "react";

import type { CreateStaffRequestActionState } from "@/lib/portal/contracts";

export function StaffRequestError({
  code,
  alertRef,
}: Readonly<{
  code: Extract<CreateStaffRequestActionState, { status: "error" }>["code"];
  alertRef: Ref<HTMLDivElement>;
}>) {
  const conflicted = code === "conflict";
  return (
    <div
      ref={alertRef}
      role="alert"
      tabIndex={-1}
      data-testid="staff-request-error"
      className="portal-request-form-alert"
    >
      <strong>
        {code === "validation"
          ? "Check the highlighted fields."
          : conflicted
            ? "These details do not match the first save attempt."
            : "The portal could not confirm whether this request was added."}
      </strong>
      <p>
        {code === "validation"
          ? "Your other entries are still here. Correct the first highlighted field and try again."
          : conflicted
            ? "Check New requests for this patient before starting a fresh form."
            : "Try again with these same details. To change anything, check New requests first."}
      </p>
      {code === "validation" ? null : (
        <Link href="/admin/requests?status=new">Check New requests</Link>
      )}
    </div>
  );
}
