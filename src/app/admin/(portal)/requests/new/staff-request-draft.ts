import type { StaffRequestDraft } from "@/lib/portal/contracts";

export const EMPTY_STAFF_REQUEST_DRAFT = {
  name: "",
  phone: "",
  email: "",
  location: "any",
  time: "any",
  message: "",
} as const;

/** What the form opens with when the Schedule's search starts it (issue #356): the name, or the number, that was typed. */
export type StaffRequestPrefill = Readonly<Partial<Pick<StaffRequestDraft, "name" | "phone">>>;

/** True once the draft differs from what the form opened with, so a prefill alone is nothing to discard. */
export function isStaffRequestDraftDirty(
  draft: StaffRequestDraft,
  opened: StaffRequestDraft = EMPTY_STAFF_REQUEST_DRAFT,
): boolean {
  return (
    draft.name !== opened.name ||
    draft.phone !== opened.phone ||
    draft.email !== opened.email ||
    draft.location !== opened.location ||
    draft.time !== opened.time ||
    draft.message !== opened.message
  );
}
