/* Ported from src/app/design/brand/textarea.tsx. */

import { Field, FieldDescription, FieldLabel, Textarea } from "westchase-gi";

export function Default() {
  return (
    <div className="w-full max-w-md">
      <Textarea
        placeholder="Anything the office should know before calling?"
        aria-label="Message"
      />
    </div>
  );
}

export function States() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <Textarea placeholder="Disabled" aria-label="Disabled" disabled />
      <Textarea defaultValue="Too long" aria-label="Invalid" aria-invalid />
    </div>
  );
}

export function InAField() {
  return (
    <div className="w-full max-w-md">
      <Field>
        <FieldLabel htmlFor="textarea-note">Note for the patient&apos;s record</FieldLabel>
        <Textarea id="textarea-note" placeholder="Left voicemail, will try again Tuesday." />
        <FieldDescription>Notes are append-only and never edited.</FieldDescription>
      </Field>
    </div>
  );
}
