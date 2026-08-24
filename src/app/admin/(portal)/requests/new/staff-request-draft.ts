export const EMPTY_STAFF_REQUEST_DRAFT = {
  name: "",
  phone: "",
  email: "",
  location: "any",
  time: "any",
  message: "",
} as const;

export interface StaffRequestDraftSnapshot {
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly location: string;
  readonly time: string;
  readonly message: string;
}

export function isStaffRequestDraftDirty(draft: StaffRequestDraftSnapshot): boolean {
  return (
    draft.name !== EMPTY_STAFF_REQUEST_DRAFT.name ||
    draft.phone !== EMPTY_STAFF_REQUEST_DRAFT.phone ||
    draft.email !== EMPTY_STAFF_REQUEST_DRAFT.email ||
    draft.location !== EMPTY_STAFF_REQUEST_DRAFT.location ||
    draft.time !== EMPTY_STAFF_REQUEST_DRAFT.time ||
    draft.message !== EMPTY_STAFF_REQUEST_DRAFT.message
  );
}
