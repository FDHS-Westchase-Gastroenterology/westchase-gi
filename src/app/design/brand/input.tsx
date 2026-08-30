import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { Example, ExampleWrapper } from "./example";

/* The field recipe: white paper, a 1.5px line-2 hairline on radius-sm,
   teal focus, destructive for invalid, 44px floor. */

export default function BrandInputExample() {
  return (
    <ExampleWrapper>
      <Basics />
      <States />
      <InAField />
      <MotionAxis />
    </ExampleWrapper>
  );
}

function Basics() {
  return (
    <Example title="Default">
      <Input placeholder="Patient name" aria-label="Patient name" />
      <Input type="tel" placeholder="(813) 555-0100" aria-label="Phone" />
      <Input type="date" aria-label="Preferred day" />
    </Example>
  );
}

function States() {
  return (
    <Example title="States">
      <Input placeholder="Disabled" aria-label="Disabled field" disabled />
      <Input defaultValue="813-555" aria-label="Invalid field" aria-invalid />
      <Input type="file" aria-label="Insurance card" />
    </Example>
  );
}

function InAField() {
  return (
    <Example title="In a Field">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="brand-input-email">Email</FieldLabel>
          <Input id="brand-input-email" type="email" placeholder="you@example.com" />
          <FieldDescription>We only use it to confirm your request.</FieldDescription>
        </Field>
        <Field data-invalid>
          <FieldLabel htmlFor="brand-input-dob">Date of birth</FieldLabel>
          <Input id="brand-input-dob" defaultValue="13/45/1970" aria-invalid />
          <FieldError>Enter the date as month, day, year.</FieldError>
        </Field>
      </FieldGroup>
    </Example>
  );
}

function MotionAxis() {
  return (
    <Example title="Motion axis — focus each one">
      <Input motion="wgi" placeholder="wgi — border and ring at 200ms" aria-label="wgi" />
      <Input motion="shadcn" placeholder="shadcn — stock transition-colors" aria-label="shadcn" />
      <Input motion="none" placeholder="none" aria-label="none" />
    </Example>
  );
}
