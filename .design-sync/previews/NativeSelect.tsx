/* Ported from src/app/design/brand/native-select.tsx. Patient-facing selects
   keep the native element: the OS picker is the better control for an older,
   task-driven audience. */

import { Field, FieldDescription, FieldLabel, NativeSelect } from "westchase-gi";

export function Default() {
  return (
    <div className="w-full max-w-md">
      <NativeSelect aria-label="Location" defaultValue="tampa">
        <option value="tampa">Tampa — Westchase</option>
        <option value="lutz">Lutz</option>
      </NativeSelect>
    </div>
  );
}

export function States() {
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <NativeSelect aria-label="Disabled" disabled>
        <option>Disabled</option>
      </NativeSelect>
      <NativeSelect aria-label="Invalid" aria-invalid defaultValue="">
        <option value="">Choose a reason</option>
        <option value="screening">Screening colonoscopy</option>
      </NativeSelect>
    </div>
  );
}

export function InAField() {
  return (
    <div className="w-full max-w-md">
      <Field>
        <FieldLabel htmlFor="select-lang">Preferred language</FieldLabel>
        <NativeSelect id="select-lang" defaultValue="en">
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="vi">Tiếng Việt</option>
          <option value="ko">한국어</option>
          <option value="ar">العربية</option>
        </NativeSelect>
        <FieldDescription>The office calls back in this language.</FieldDescription>
      </Field>
    </div>
  );
}
