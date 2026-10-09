"use client";

import type { FocusEvent, ReactNode } from "react";

import { LOCATION_CHOICES, TIME_CHOICES } from "@/app/admin/(portal)/requests/format";
import { CircleAlert } from "@/components/icons";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { SegmentedControlOption } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { REQUEST_FIELD_LIMITS, REQUEST_LOCATIONS, REQUEST_TIMES } from "@/lib/portal/contracts";
import type { RequestLocation, RequestTime, StaffRequestDraft } from "@/lib/portal/contracts";

import type { CheckedField } from "./staff-request-validation";
import type { FieldChecks } from "./use-field-checks";

/* The Add sheet's field parts (design-system/forms.md "Fields"). Each typed
   field has one note line under it: its hint at rest, and the fix in its
   place once the field is refused, so the eye finds the fix where it
   already reads the hint (A2). A field with no hint opens the line when a
   fix arrives. The label never turns coral; the control's stroke and the
   fix carry the refusal, and the fix is words, never color alone. */

function Optional() {
  return <span className="portal-request-field-optional">Optional</span>;
}

/** The hint or the fix, whichever the field has now. */
function FieldNote({
  id,
  hint,
  error,
}: Readonly<{ id: string; hint: string | null; error: string | null }>) {
  if (hint === null && error === null) return null;
  return (
    <div className="portal-request-field-note">
      {error === null ? (
        <FieldDescription key="hint" id={`${id}-hint`} size="note">
          {hint}
        </FieldDescription>
      ) : (
        <FieldError key={error} id={`${id}-error`} size="note">
          <CircleAlert />
          {error}
        </FieldError>
      )}
    </div>
  );
}

function noteId(id: string, hint: string | null, error: string | null): string | undefined {
  if (error !== null) return `${id}-error`;
  return hint === null ? undefined : `${id}-hint`;
}

interface TextFieldProps {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly optional?: boolean;
  readonly hint?: string | null;
  readonly error: string | null;
  readonly value: string;
  readonly maxLength: number;
  readonly readOnly: boolean;
  readonly onValueChange: (value: string) => void;
  readonly onCheck: (value: string) => void;
}

/** True when focus is leaving for the sheet's own way out: Cancel, or the
    discard question. A fix shown then would flash under a sheet that is
    closing, so the check waits for the next blur or the submit. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React events carry DOM member types that cannot be made readonly
function leavingForExit(event: FocusEvent<HTMLElement>): boolean {
  const next = event.relatedTarget;
  return next instanceof Element && next.closest("[data-request-exit]") !== null;
}

export function RequestTextField({
  id,
  name,
  label,
  optional = false,
  hint = null,
  error,
  value,
  maxLength,
  readOnly,
  onValueChange,
  onCheck,
  type = "text",
  inputMode,
  autoFocus = false,
}: TextFieldProps &
  Readonly<{
    type?: "text" | "tel" | "email";
    inputMode?: "text" | "tel" | "email";
    autoFocus?: boolean;
  }>) {
  return (
    <Field className="portal-request-field">
      <FieldLabel htmlFor={id}>
        {label}
        {optional ? <Optional /> : null}
      </FieldLabel>
      <Input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete="off"
        autoFocus={autoFocus}
        maxLength={maxLength}
        value={value}
        readOnly={readOnly}
        onChange={(event) => {
          onValueChange(event.target.value);
        }}
        onBlur={(event) => {
          if (!leavingForExit(event)) onCheck(event.target.value);
        }}
        aria-invalid={error === null ? undefined : true}
        aria-describedby={noteId(id, hint, error)}
      />
      <FieldNote id={id} hint={hint} error={error} />
    </Field>
  );
}

export function RequestNoteField({
  id,
  name,
  label,
  error,
  value,
  maxLength,
  readOnly,
  onValueChange,
  onCheck,
  placeholder,
}: TextFieldProps & Readonly<{ placeholder: string }>) {
  return (
    <Field className="portal-request-field">
      <FieldLabel htmlFor={id}>
        {label}
        <Optional />
      </FieldLabel>
      <Textarea
        id={id}
        name={name}
        rows={3}
        maxLength={maxLength}
        value={value}
        readOnly={readOnly}
        onChange={(event) => {
          onValueChange(event.target.value);
        }}
        onBlur={(event) => {
          if (!leavingForExit(event)) onCheck(event.target.value);
        }}
        aria-invalid={error === null ? undefined : true}
        aria-describedby={noteId(id, null, error)}
        placeholder={placeholder}
        className="min-h-24 resize-y"
      />
      <FieldNote id={id} hint={null} error={error} />
    </Field>
  );
}

export function RequestChoiceField<Value extends string>({
  id,
  name,
  legend,
  options,
  value,
  readOnly,
  onValueChange,
}: Readonly<{
  id: string;
  name: string;
  legend: string;
  options: readonly SegmentedControlOption<Value>[];
  value: Value;
  readOnly: boolean;
  onValueChange: (value: Value) => void;
}>) {
  return (
    <FieldSet className="portal-request-field gap-2">
      <FieldLegend id={`${id}-legend`} variant="label" className="mb-2">
        {legend}
      </FieldLegend>
      <SegmentedControl<Value>
        id={id}
        name={name}
        options={options}
        value={value}
        readOnly={readOnly}
        aria-labelledby={`${id}-legend`}
        onValueChange={onValueChange}
      />
    </FieldSet>
  );
}

/** Two fields side by side on a desk, stacked on a narrow screen. */
export function FieldPair({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="portal-request-form-pair">{children}</div>;
}

/* Office and time read with the list's own words ("Either office · Any
   time"), so the choice staff make here is the phrase they will see. */
const LOCATION_OPTIONS = REQUEST_LOCATIONS.map((value) => ({
  value,
  label: LOCATION_CHOICES[value],
}));
const TIME_OPTIONS = REQUEST_TIMES.map((value) => ({ value, label: TIME_CHOICES[value] }));

function locationOf(draft: Readonly<StaffRequestDraft>): RequestLocation {
  return REQUEST_LOCATIONS.find((value) => value === draft.location) ?? "any";
}

function timeOf(draft: Readonly<StaffRequestDraft>): RequestTime {
  return REQUEST_TIMES.find((value) => value === draft.time) ?? "any";
}

type CheckedFieldProps = Pick<
  TextFieldProps,
  "name" | "error" | "value" | "maxLength" | "readOnly" | "onValueChange" | "onCheck"
>;

/** The request's fields, in the order staff hear them on a call. */
export function StaffRequestFields({
  draft,
  readOnly,
  autoFocus,
  checks,
  onChange,
}: Readonly<{
  draft: StaffRequestDraft;
  readOnly: boolean;
  autoFocus: boolean;
  checks: FieldChecks;
  onChange: (patch: Readonly<Partial<StaffRequestDraft>>) => void;
}>) {
  function checked(field: CheckedField): CheckedFieldProps {
    return {
      name: field,
      error: checks.errorOf(field),
      value: draft[field],
      maxLength: REQUEST_FIELD_LIMITS[field],
      readOnly,
      onValueChange(value) {
        onChange({ [field]: value });
        checks.recheck(field, value);
      },
      onCheck(value) {
        checks.checkOnBlur(field, value);
      },
    };
  }

  return (
    <>
      <RequestTextField
        id="staff-request-name"
        label="Patient name"
        autoFocus={autoFocus}
        {...checked("name")}
      />

      <FieldPair>
        <RequestTextField
          id="staff-request-phone"
          label="Phone"
          type="tel"
          inputMode="tel"
          hint="Include the area code."
          {...checked("phone")}
        />
        <RequestTextField
          id="staff-request-email"
          label="Email"
          optional
          type="email"
          inputMode="email"
          {...checked("email")}
        />
      </FieldPair>

      <FieldPair>
        <RequestChoiceField<RequestLocation>
          id="staff-request-location"
          name="location"
          legend="Office"
          options={LOCATION_OPTIONS}
          value={locationOf(draft)}
          readOnly={readOnly}
          onValueChange={(value) => {
            onChange({ location: value });
          }}
        />
        <RequestChoiceField<RequestTime>
          id="staff-request-time"
          name="time"
          legend="Time"
          options={TIME_OPTIONS}
          value={timeOf(draft)}
          readOnly={readOnly}
          onValueChange={(value) => {
            onChange({ time: value });
          }}
        />
      </FieldPair>

      <div className="portal-request-form-boundary">
        <strong>Keep this to scheduling.</strong>
        <p>
          Do not enter symptoms, diagnoses, medications, or other medical details. Put those in the
          clinical record instead.
        </p>
      </div>

      <RequestNoteField
        id="staff-request-message"
        label="Scheduling note"
        placeholder="For example: referred by Dr. Smith; afternoons work best."
        {...checked("message")}
      />
    </>
  );
}
