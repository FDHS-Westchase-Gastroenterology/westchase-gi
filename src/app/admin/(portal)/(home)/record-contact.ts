import { formatPhoneForDisplay, telHref } from "@/app/admin/(portal)/requests/format";

/* The record sheet's phone, as its contact row reads it (record-sheet-frame.tsx). */

export interface PhoneParts {
  readonly tel: string | null;
  readonly phoneDisplay: string;
}

/** A stored phone as the contact row reads it: its tel: link and how it is shown. */
export function phoneParts(phone: string | null): PhoneParts {
  if (phone === null || phone.trim() === "") return { tel: null, phoneDisplay: "" };
  return { tel: telHref(phone), phoneDisplay: formatPhoneForDisplay(phone) };
}
