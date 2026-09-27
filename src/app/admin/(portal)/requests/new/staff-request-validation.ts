import { staffRequestInputSchema } from "@/lib/portal/contracts";
import type { CreateStaffRequestActionState, IntakeField } from "@/lib/portal/contracts";

/* The words a refused field shows under itself, in place of its hint. The
   server's check (actions.ts) stays the authority; the sheet runs the same
   schema when a field loses focus so the fix appears before Add request is
   pressed, and the two can never disagree because they are one schema. */

export const FIELD_FALLBACK = {
  name: "Enter the patient’s name.",
  phone: "Enter all 10 digits, with the area code.",
  email: "Enter a valid email address or leave this blank.",
  location: "Choose an office.",
  time: "Choose a time.",
  message: "Keep the scheduling note under 2,000 characters.",
} as const satisfies Record<IntakeField, string>;

function validationCopy(code: string): string | null {
  switch (code) {
    case "name_required":
      return "Enter the patient’s name.";
    case "name_too_long":
      return "Keep the name under 120 characters.";
    case "phone_invalid":
      return "Enter all 10 digits, with the area code.";
    case "phone_too_long":
      return "Keep the phone number under 32 characters.";
    case "email_invalid":
      return "Enter a valid email address or leave this blank.";
    case "email_too_long":
      return "Keep the email address under 254 characters.";
    case "message_too_long":
      return "Keep the scheduling note under 2,000 characters.";
    default:
      return null;
  }
}

/** The fields the sheet checks as they lose focus: the typed ones. Office
    and time are segmented controls that always hold a valid choice. */
export const CHECKED_FIELDS = ["name", "phone", "email", "message"] as const;
export type CheckedField = (typeof CHECKED_FIELDS)[number];

/* Every field optional, so a lone value is checked by exactly the rules
   the server applies to it and no other field's absence is an issue. */
const oneFieldSchema = staffRequestInputSchema.partial();

/** The fix for one typed value, or null when the server would accept it. */
export function checkField(field: CheckedField, value: string): string | null {
  const result = oneFieldSchema.safeParse({ [field]: value });
  if (result.success) return null;
  const code = result.error.issues.find((issue) => issue.path[0] === field)?.message;
  return (code === undefined ? null : validationCopy(code)) ?? FIELD_FALLBACK[field];
}

/** The fix the server's last answer gave this field, if any. */
export function serverErrorFor(
  field: IntakeField,
  state: Readonly<CreateStaffRequestActionState>,
): string | null {
  if (state.status !== "error") return null;
  const code = state.fieldErrors?.[field];
  if (code === undefined) return null;
  return validationCopy(code) ?? FIELD_FALLBACK[field];
}
