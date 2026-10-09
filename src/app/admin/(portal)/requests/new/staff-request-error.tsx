"use client";

import type { Ref } from "react";

import { CircleAlert } from "@/components/icons";
import type { CreateStaffRequestActionState } from "@/lib/portal/contracts";

export type StaffRequestErrorCode = Extract<
  CreateStaffRequestActionState,
  { status: "error" }
>["code"];

/* A4: what went wrong, at the top of the well, taking focus. Each case says
   only what is known. `unavailable` means the portal gave no answer, so the
   request may or may not exist; the retry reuses the attempt's key, which is
   why trying again cannot add it twice. `conflict` points at New requests,
   and the footer swaps Add request for that link. */
const COPY = {
  validation: {
    title: "Check the highlighted fields.",
    body: "Your other entries are still here. Correct the first highlighted field and try again.",
  },
  conflict: {
    title: "These details do not match the first save attempt.",
    body: "Check New requests for this patient before starting a fresh form.",
  },
  unavailable: {
    title: "Couldn’t confirm the request",
    body: "The portal didn’t answer. Everything you entered is still here, and trying again won’t add it twice.",
  },
} as const satisfies Record<StaffRequestErrorCode, { title: string; body: string }>;

export function StaffRequestError({
  code,
  alertRef,
}: Readonly<{
  code: StaffRequestErrorCode;
  alertRef: Ref<HTMLDivElement>;
}>) {
  const copy = COPY[code];
  return (
    <div className="portal-request-form-alert-reveal">
      <div
        ref={alertRef}
        role="alert"
        tabIndex={-1}
        data-testid="staff-request-error"
        className="portal-request-form-alert"
      >
        <CircleAlert />
        <div>
          <strong>{copy.title}</strong>
          <p>{copy.body}</p>
        </div>
      </div>
    </div>
  );
}
