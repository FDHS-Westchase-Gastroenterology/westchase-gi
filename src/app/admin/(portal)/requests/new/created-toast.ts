import { toast } from "sonner";

import { followed } from "@/app/admin/(portal)/toast-follow";
import type { CreateStaffRequestActionState } from "@/lib/portal/contracts";

/* The hosted add-request form's result is a toast (ui/toaster.tsx), the same
   one the home record card uses: "Adding appointment request…" while the
   action runs, then the name on the line once the server confirmed it, which
   is when the dialog closes onto the line. A failed attempt gives the toast no
   error branch: the working toast leaves and the form itself says what went
   wrong, with the fields to fix or the Check New requests link, which a toast
   could not hold. */
export const CREATED_TOAST_TEST_ID = "staff-request-toast";

function created(
  state: Readonly<CreateStaffRequestActionState>,
): state is Extract<CreateStaffRequestActionState, { status: "created" }> {
  return state.status === "created";
}

/** The key an attempt posts: a retry keeps the failed attempt's key, so the
    server replays the same request instead of recording a second one. */
export function attemptKey(
  state: Readonly<CreateStaffRequestActionState>,
  initial: string,
): string {
  return state.status === "error" && state.idempotencyKey !== null ? state.idempotencyKey : initial;
}

/** Follows one attempt with its own toast. A failed attempt's toast is
    already dismissed, so a retry has nothing to update in place; and Sonner
    removes a dismissed toast by id about 200ms later, taking with it any new
    toast that reused the id inside that window. Each attempt therefore takes
    a fresh id. */
export function followCreation(attempt: Promise<CreateStaffRequestActionState>): void {
  toast.promise(followed(attempt, created), {
    testId: CREATED_TOAST_TEST_ID,
    loading: "Adding appointment request…",
    success: (result) => `${result.name} is on the line under New.`,
  });
}
