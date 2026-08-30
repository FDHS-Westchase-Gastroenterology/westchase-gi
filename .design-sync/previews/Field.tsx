/* Ported from src/app/design/brand/field.tsx. Every form lays out through
   FieldGroup + Field; labels, descriptions and errors are slots, and
   validation is data-invalid on the Field plus aria-invalid on the control. */

import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  Input,
  NativeSelect,
  Textarea,
} from "westchase-gi";

export function AnAppointmentRequest() {
  return (
    <form className="w-full max-w-md">
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Who is the visit for?</FieldLegend>
          <FieldDescription>
            The office calls this number back within one business day.
          </FieldDescription>
          <Field>
            <FieldLabel htmlFor="field-name">Full name</FieldLabel>
            <Input id="field-name" placeholder="Maria Alvarez" />
          </Field>
          <Field>
            <FieldLabel htmlFor="field-phone">Phone</FieldLabel>
            <Input id="field-phone" type="tel" placeholder="(813) 555-0100" />
          </Field>
        </FieldSet>
        <FieldSeparator />
        <Field>
          <FieldLabel htmlFor="field-location">Location</FieldLabel>
          <NativeSelect id="field-location" defaultValue="tampa">
            <option value="tampa">Tampa — Westchase</option>
            <option value="lutz">Lutz</option>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="field-note">Anything we should know?</FieldLabel>
          <Textarea id="field-note" placeholder="Optional" />
        </Field>
        <Button type="submit" motion="commit">
          Send the request
        </Button>
      </FieldGroup>
    </form>
  );
}

export function InvalidState() {
  return (
    <form className="w-full max-w-md">
      <FieldGroup>
        <Field data-invalid>
          <FieldLabel htmlFor="field-dob">Date of birth</FieldLabel>
          <Input id="field-dob" defaultValue="13/45/1970" aria-invalid />
          <FieldError>Enter the date as month, day, year.</FieldError>
        </Field>
      </FieldGroup>
    </form>
  );
}
