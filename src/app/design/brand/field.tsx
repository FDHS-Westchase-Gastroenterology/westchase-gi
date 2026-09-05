import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import { Example, ExampleWrapper } from "./example";

/* Every form lays out through FieldGroup + Field. Labels, descriptions,
   and errors are slots; validation is data-invalid on the Field and
   aria-invalid on the control. */

export default function BrandFieldExample() {
  return (
    <ExampleWrapper className="lg:grid-cols-1">
      <AppointmentRequest />
      <Horizontal />
    </ExampleWrapper>
  );
}

function AppointmentRequest() {
  return (
    <Example title="An appointment request">
      <form className="w-full max-w-md">
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Who is the visit for?</FieldLegend>
            <FieldDescription>
              The office calls this number back within one business day.
            </FieldDescription>
            <Field>
              <FieldLabel htmlFor="brand-field-name">Full name</FieldLabel>
              <Input id="brand-field-name" placeholder="Maria Alvarez" />
            </Field>
            <Field>
              <FieldLabel htmlFor="brand-field-phone">Phone</FieldLabel>
              <Input id="brand-field-phone" type="tel" placeholder="(813) 555-0100" />
            </Field>
          </FieldSet>
          <FieldSeparator />
          <Field>
            <FieldLabel htmlFor="brand-field-location">Location</FieldLabel>
            <NativeSelect id="brand-field-location" defaultValue="tampa">
              <option value="tampa">Tampa — Westchase</option>
              <option value="lutz">Lutz</option>
            </NativeSelect>
          </Field>
          <Field data-invalid>
            <FieldLabel htmlFor="brand-field-reason">Reason for the visit</FieldLabel>
            <Textarea id="brand-field-reason" aria-invalid placeholder="A sentence is enough." />
            <FieldError>Tell us a little about the visit so the right person calls.</FieldError>
          </Field>
          <Field orientation="horizontal">
            <Button type="submit" variant="amber">
              Request an appointment
            </Button>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </Example>
  );
}

function Horizontal() {
  return (
    <Example title="Horizontal and responsive orientations">
      <FieldGroup className="max-w-md">
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Email me when a request is booked</FieldTitle>
            <FieldDescription>One message per booking, never a digest.</FieldDescription>
          </FieldContent>
          <input type="checkbox" defaultChecked aria-label="Email me when a request is booked" />
        </Field>
        <Field orientation="responsive">
          <FieldContent>
            <FieldLabel htmlFor="brand-field-fax">Fax for referring offices</FieldLabel>
            <FieldDescription>Shown on the physicians page.</FieldDescription>
          </FieldContent>
          <Input id="brand-field-fax" defaultValue="(813) 555-0199" className="md:max-w-56" />
        </Field>
      </FieldGroup>
    </Example>
  );
}
