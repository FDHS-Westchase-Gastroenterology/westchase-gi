/* Ported from src/app/design/brand/input.tsx: white paper, a 1.5px hairline on
   radius-sm, teal focus, destructive for invalid, 44px floor. */

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
} from "westchase-gi";

export function Default() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <Input placeholder="Patient name" aria-label="Patient name" />
      <Input type="tel" placeholder="(813) 555-0100" aria-label="Phone" />
      <Input type="date" aria-label="Preferred day" />
    </div>
  );
}

export function States() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <Input placeholder="Disabled" aria-label="Disabled field" disabled />
      <Input defaultValue="813-555" aria-label="Invalid field" aria-invalid />
    </div>
  );
}

export function InAField() {
  return (
    <div className="w-full max-w-md">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="input-email">Email</FieldLabel>
          <Input id="input-email" type="email" placeholder="you@example.com" />
          <FieldDescription>We only use it to confirm your request.</FieldDescription>
        </Field>
        <Field data-invalid>
          <FieldLabel htmlFor="input-dob">Date of birth</FieldLabel>
          <Input id="input-dob" defaultValue="13/45/1970" aria-invalid />
          <FieldError>Enter the date as month, day, year.</FieldError>
        </Field>
      </FieldGroup>
    </div>
  );
}
