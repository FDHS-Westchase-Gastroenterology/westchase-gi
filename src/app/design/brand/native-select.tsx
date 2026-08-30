import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";

import { Example, ExampleWrapper } from "./example";

/* Patient-facing selects keep the native element: the OS picker on a phone
   is the better control for an older, task-driven audience. */

export default function BrandNativeSelectExample() {
  return (
    <ExampleWrapper>
      <Example title="Default">
        <NativeSelect aria-label="Location" defaultValue="tampa">
          <option value="tampa">Tampa — Westchase</option>
          <option value="lutz">Lutz</option>
        </NativeSelect>
      </Example>
      <Example title="States">
        <NativeSelect aria-label="Disabled" disabled>
          <option>Disabled</option>
        </NativeSelect>
        <NativeSelect aria-label="Invalid" aria-invalid defaultValue="">
          <option value="">Choose a reason</option>
          <option value="screening">Screening colonoscopy</option>
        </NativeSelect>
      </Example>
      <Example title="In a Field">
        <Field>
          <FieldLabel htmlFor="brand-select-lang">Preferred language</FieldLabel>
          <NativeSelect id="brand-select-lang" defaultValue="en">
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="vi">Tiếng Việt</option>
            <option value="ko">한국어</option>
            <option value="ar">العربية</option>
          </NativeSelect>
          <FieldDescription>The office calls back in this language.</FieldDescription>
        </Field>
      </Example>
    </ExampleWrapper>
  );
}
