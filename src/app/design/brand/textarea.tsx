import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

import { Example, ExampleWrapper } from "./example";

export default function BrandTextareaExample() {
  return (
    <ExampleWrapper>
      <Example title="Default — content-following height">
        <Textarea
          placeholder="Anything the office should know before calling?"
          aria-label="Message"
        />
      </Example>
      <Example title="States">
        <Textarea placeholder="Disabled" aria-label="Disabled" disabled />
        <Textarea defaultValue="Too long" aria-label="Invalid" aria-invalid />
      </Example>
      <Example title="In a Field">
        <Field>
          <FieldLabel htmlFor="brand-textarea-note">Note for the patient&apos;s record</FieldLabel>
          <Textarea
            id="brand-textarea-note"
            placeholder="Left voicemail, will try again Tuesday."
          />
          <FieldDescription>Notes are append-only and never edited.</FieldDescription>
        </Field>
      </Example>
    </ExampleWrapper>
  );
}
