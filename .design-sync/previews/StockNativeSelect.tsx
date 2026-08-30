/* Ported by .design-sync/ds/port-examples.mjs from
   src/components/stock/examples/native-select-example.tsx — the shadcn registry's own demo,
   vendored by `npm run ds:stock`. Imports are aliased onto the bundle's
   Stock* exports; the JSX is the registry's, unchanged.
   Cells: NativeSelectBasic, NativeSelectWithGroups, NativeSelectSizes, NativeSelectWithField, NativeSelectDisabled, NativeSelectInvalid */

import { StockField as Field, StockFieldDescription as FieldDescription, StockFieldLabel as FieldLabel } from "westchase-gi";
import { StockNativeSelect as NativeSelect, StockNativeSelectOptGroup as NativeSelectOptGroup, StockNativeSelectOption as NativeSelectOption } from "westchase-gi";


export function NativeSelectBasic() {
  return (
    <Example title="Basic">
      <NativeSelect>
        <NativeSelectOption value="">Select a fruit</NativeSelectOption>
        <NativeSelectOption value="apple">Apple</NativeSelectOption>
        <NativeSelectOption value="banana">Banana</NativeSelectOption>
        <NativeSelectOption value="blueberry">Blueberry</NativeSelectOption>
        <NativeSelectOption value="grapes" disabled>
          Grapes
        </NativeSelectOption>
        <NativeSelectOption value="pineapple">Pineapple</NativeSelectOption>
      </NativeSelect>
    </Example>
  )
}

export function NativeSelectWithGroups() {
  return (
    <Example title="With Groups">
      <NativeSelect>
        <NativeSelectOption value="">Select a food</NativeSelectOption>
        <NativeSelectOptGroup label="Fruits">
          <NativeSelectOption value="apple">Apple</NativeSelectOption>
          <NativeSelectOption value="banana">Banana</NativeSelectOption>
          <NativeSelectOption value="blueberry">Blueberry</NativeSelectOption>
        </NativeSelectOptGroup>
        <NativeSelectOptGroup label="Vegetables">
          <NativeSelectOption value="carrot">Carrot</NativeSelectOption>
          <NativeSelectOption value="broccoli">Broccoli</NativeSelectOption>
          <NativeSelectOption value="spinach">Spinach</NativeSelectOption>
        </NativeSelectOptGroup>
      </NativeSelect>
    </Example>
  )
}

export function NativeSelectSizes() {
  return (
    <Example title="Sizes">
      <div className="flex flex-col gap-4">
        <NativeSelect size="sm">
          <NativeSelectOption value="">Select a fruit</NativeSelectOption>
          <NativeSelectOption value="apple">Apple</NativeSelectOption>
          <NativeSelectOption value="banana">Banana</NativeSelectOption>
          <NativeSelectOption value="blueberry">Blueberry</NativeSelectOption>
        </NativeSelect>
        <NativeSelect size="default">
          <NativeSelectOption value="">Select a fruit</NativeSelectOption>
          <NativeSelectOption value="apple">Apple</NativeSelectOption>
          <NativeSelectOption value="banana">Banana</NativeSelectOption>
          <NativeSelectOption value="blueberry">Blueberry</NativeSelectOption>
        </NativeSelect>
      </div>
    </Example>
  )
}

export function NativeSelectWithField() {
  return (
    <Example title="With Field">
      <Field>
        <FieldLabel htmlFor="native-select-country">Country</FieldLabel>
        <NativeSelect id="native-select-country">
          <NativeSelectOption value="">Select a country</NativeSelectOption>
          <NativeSelectOption value="us">United States</NativeSelectOption>
          <NativeSelectOption value="uk">United Kingdom</NativeSelectOption>
          <NativeSelectOption value="ca">Canada</NativeSelectOption>
          <NativeSelectOption value="au">Australia</NativeSelectOption>
        </NativeSelect>
        <FieldDescription>Select your country of residence.</FieldDescription>
      </Field>
    </Example>
  )
}

export function NativeSelectDisabled() {
  return (
    <Example title="Disabled">
      <NativeSelect disabled>
        <NativeSelectOption value="">Disabled</NativeSelectOption>
        <NativeSelectOption value="apple">Apple</NativeSelectOption>
        <NativeSelectOption value="banana">Banana</NativeSelectOption>
        <NativeSelectOption value="blueberry">Blueberry</NativeSelectOption>
      </NativeSelect>
    </Example>
  )
}

export function NativeSelectInvalid() {
  return (
    <Example title="Invalid">
      <NativeSelect aria-invalid="true">
        <NativeSelectOption value="">Error state</NativeSelectOption>
        <NativeSelectOption value="apple">Apple</NativeSelectOption>
        <NativeSelectOption value="banana">Banana</NativeSelectOption>
        <NativeSelectOption value="blueberry">Blueberry</NativeSelectOption>
      </NativeSelect>
    </Example>
  )
}

/* Local stand-in for the registry demo frame (src/components/stock/examples/
   example.tsx), which is gallery-only code. Same slots, no dependencies. */
function Example({ title, children, className = "" }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1">
      {title ? (
        <div className="px-1.5 py-2 text-xs font-medium text-muted-foreground">{title}</div>
      ) : null}
      <div className={"flex min-w-0 flex-col items-start gap-6 rounded-xl bg-card p-6 text-foreground " + className}>
        {children}
      </div>
    </div>
  );
}
