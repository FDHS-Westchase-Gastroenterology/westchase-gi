"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { createStaffRequest } from "@/app/admin/(portal)/requests/new/actions";
import { REQUEST_FIELD_LIMITS, STAFF_REQUEST_FIELDS } from "@/lib/portal/contracts";
import type {
  CreateStaffRequestActionState,
  StaffRequestDraft,
  StaffRequestField,
} from "@/lib/portal/contracts";

const INITIAL_STATE = { status: "idle" } as const satisfies CreateStaffRequestActionState;
const EMPTY_DRAFT = {
  name: "",
  phone: "",
  email: "",
  location: "any",
  time: "any",
  message: "",
} as const satisfies StaffRequestDraft;

const FIELD_FALLBACK = {
  name: "Enter the patient’s name.",
  phone: "Enter a phone number with at least 10 digits.",
  email: "Enter a valid email address or leave this blank.",
  location: "Choose an office preference.",
  time: "Choose a time preference.",
  message: "Keep the scheduling note under 2,000 characters.",
} as const satisfies Record<StaffRequestField, string>;

function validationCopy(code: string): string | null {
  switch (code) {
    case "name_required":
      return "Enter the patient’s name.";
    case "name_too_long":
      return "Keep the name under 120 characters.";
    case "phone_invalid":
      return "Enter a phone number with at least 10 digits.";
    case "phone_too_long":
      return "Keep the phone number under 32 characters.";
    case "email_invalid":
      return "Enter a valid email address or leave this blank.";
    case "email_too_long":
      return "Keep the email address under 254 characters.";
    case "message_too_long":
      return "Keep the scheduling note under 2,000 characters.";
    default:
      return null;
  }
}

function errorFor(
  field: StaffRequestField,
  state: Readonly<CreateStaffRequestActionState>,
): string | null {
  if (state.status !== "error") return null;
  const code = state.fieldErrors?.[field];
  if (code === undefined) return null;
  return validationCopy(code) ?? FIELD_FALLBACK[field];
}

function describedBy(
  hintId: string | null,
  errorId: string,
  error: string | null,
): string | undefined {
  const ids = [hintId, error === null ? null : errorId].filter(
    (value): value is string => value !== null,
  );
  return ids.length === 0 ? undefined : ids.join(" ");
}

function submitLabel(pending: boolean, retrying: boolean): string {
  if (pending) return retrying ? "Checking appointment request…" : "Adding appointment request…";
  return retrying ? "Try same appointment request again" : "Add appointment request";
}

type StaffRequestErrors = Readonly<Record<StaffRequestField, string | null>>;
type ChangeStaffRequestField = (field: StaffRequestField, value: string) => void;

function ContactDetailsSection({
  draft,
  errors,
  pending,
  draftLocked,
  onFieldChange,
}: Readonly<{
  draft: StaffRequestDraft;
  errors: StaffRequestErrors;
  pending: boolean;
  draftLocked: boolean;
  onFieldChange: ChangeStaffRequestField;
}>) {
  return (
    <fieldset className="portal-request-form-section">
      <legend>Contact details</legend>
      <p className="portal-request-form-section-copy">
        Use the best callback information the patient provided.
      </p>

      <div className="portal-request-form-grid portal-request-form-grid--contact">
        <div className="portal-request-field">
          <label htmlFor="staff-request-name">
            Patient name <span aria-hidden="true">*</span>
            <span className="sr-only"> (required)</span>
          </label>
          <input
            id="staff-request-name"
            name="name"
            type="text"
            autoComplete="off"
            required
            maxLength={REQUEST_FIELD_LIMITS.name}
            value={draft.name}
            readOnly={draftLocked}
            disabled={pending}
            onChange={(event) => {
              onFieldChange("name", event.target.value);
            }}
            aria-invalid={errors.name === null ? undefined : true}
            aria-describedby={describedBy(null, "staff-request-name-error", errors.name)}
            className="portal-request-field-control"
          />
          {errors.name === null ? null : (
            <p id="staff-request-name-error" className="field-error">
              {errors.name}
            </p>
          )}
        </div>

        <div className="portal-request-field">
          <label htmlFor="staff-request-phone">
            Phone number <span aria-hidden="true">*</span>
            <span className="sr-only"> (required)</span>
          </label>
          <input
            id="staff-request-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            required
            maxLength={REQUEST_FIELD_LIMITS.phone}
            value={draft.phone}
            readOnly={draftLocked}
            disabled={pending}
            onChange={(event) => {
              onFieldChange("phone", event.target.value);
            }}
            aria-invalid={errors.phone === null ? undefined : true}
            aria-describedby={describedBy(
              "staff-request-phone-hint",
              "staff-request-phone-error",
              errors.phone,
            )}
            className="portal-request-field-control"
          />
          <p id="staff-request-phone-hint" className="field-hint">
            Include the area code.
          </p>
          {errors.phone === null ? null : (
            <p id="staff-request-phone-error" className="field-error">
              {errors.phone}
            </p>
          )}
        </div>

        <div className="portal-request-field portal-request-field--wide">
          <label htmlFor="staff-request-email">
            Email address <span>Optional</span>
          </label>
          <input
            id="staff-request-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            maxLength={REQUEST_FIELD_LIMITS.email}
            value={draft.email}
            readOnly={draftLocked}
            disabled={pending}
            onChange={(event) => {
              onFieldChange("email", event.target.value);
            }}
            aria-invalid={errors.email === null ? undefined : true}
            aria-describedby={describedBy(
              "staff-request-email-hint",
              "staff-request-email-error",
              errors.email,
            )}
            className="portal-request-field-control"
          />
          <p id="staff-request-email-hint" className="field-hint">
            Leave blank when phone is the only contact method.
          </p>
          {errors.email === null ? null : (
            <p id="staff-request-email-error" className="field-error">
              {errors.email}
            </p>
          )}
        </div>
      </div>
    </fieldset>
  );
}

function AppointmentPreferencesSection({
  draft,
  errors,
  pending,
  draftLocked,
  onFieldChange,
}: Readonly<{
  draft: StaffRequestDraft;
  errors: StaffRequestErrors;
  pending: boolean;
  draftLocked: boolean;
  onFieldChange: ChangeStaffRequestField;
}>) {
  return (
    <fieldset className="portal-request-form-section">
      <legend>Appointment preferences</legend>
      <p className="portal-request-form-section-copy">
        Choose “No preference” when the patient did not specify one.
      </p>

      <div className="portal-request-form-grid">
        <div className="portal-request-field">
          <label htmlFor="staff-request-location">Preferred office</label>
          <select
            id="staff-request-location"
            name="location"
            value={draft.location}
            disabled={pending || draftLocked}
            aria-readonly={draftLocked || undefined}
            onChange={(event) => {
              onFieldChange("location", event.target.value);
            }}
            aria-invalid={errors.location === null ? undefined : true}
            aria-describedby={describedBy(null, "staff-request-location-error", errors.location)}
            className="portal-request-field-control"
          >
            <option value="any">No office preference</option>
            <option value="tampa">Tampa</option>
            <option value="lutz">Lutz</option>
          </select>
          {errors.location === null ? null : (
            <p id="staff-request-location-error" className="field-error">
              {errors.location}
            </p>
          )}
        </div>

        <div className="portal-request-field">
          <label htmlFor="staff-request-time">Preferred time</label>
          <select
            id="staff-request-time"
            name="time"
            value={draft.time}
            disabled={pending || draftLocked}
            aria-readonly={draftLocked || undefined}
            onChange={(event) => {
              onFieldChange("time", event.target.value);
            }}
            aria-invalid={errors.time === null ? undefined : true}
            aria-describedby={describedBy(null, "staff-request-time-error", errors.time)}
            className="portal-request-field-control"
          >
            <option value="any">No time preference</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
          </select>
          {errors.time === null ? null : (
            <p id="staff-request-time-error" className="field-error">
              {errors.time}
            </p>
          )}
        </div>
      </div>
    </fieldset>
  );
}

function SchedulingNoteSection({
  value,
  error,
  pending,
  draftLocked,
  onFieldChange,
}: Readonly<{
  value: string;
  error: string | null;
  pending: boolean;
  draftLocked: boolean;
  onFieldChange: ChangeStaffRequestField;
}>) {
  return (
    <fieldset className="portal-request-form-section">
      <legend>Scheduling note</legend>
      <p className="portal-request-form-section-copy">
        Optional. Include only what another staff member needs to arrange the appointment.
      </p>
      <div className="portal-request-field">
        <label htmlFor="staff-request-message">
          Note <span>Optional</span>
        </label>
        <textarea
          id="staff-request-message"
          name="message"
          rows={4}
          maxLength={REQUEST_FIELD_LIMITS.message}
          value={value}
          readOnly={draftLocked}
          disabled={pending}
          onChange={(event) => {
            onFieldChange("message", event.target.value);
          }}
          aria-invalid={error === null ? undefined : true}
          aria-describedby={describedBy(
            "staff-request-message-hint",
            "staff-request-message-error",
            error,
          )}
          placeholder="For example: Referred by Dr. Smith; afternoons work best."
          className="portal-request-field-control"
        />
        <p id="staff-request-message-hint" className="field-hint">
          Keep medical details in the clinical record.
        </p>
        {error === null ? null : (
          <p id="staff-request-message-error" className="field-error">
            {error}
          </p>
        )}
      </div>
    </fieldset>
  );
}

function StaffRequestFormFooter({
  conflicted,
  pending,
  unavailable,
  returnHref,
  returnLabel,
}: Readonly<{
  conflicted: boolean;
  pending: boolean;
  unavailable: boolean;
  returnHref: string;
  returnLabel: string;
}>) {
  return (
    <footer className="portal-request-form-footer">
      <p>
        <strong>What happens next</strong>
        This creates a New request in Appointments. It does not create a patient chart or send a
        notification email.
      </p>
      <div>
        {conflicted ? (
          <Link href="/admin/requests?status=new" className="btn btn-navy min-h-11">
            Check New requests
          </Link>
        ) : (
          <button
            type="submit"
            disabled={pending}
            data-testid="submit-staff-request"
            className="btn btn-navy min-h-11 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitLabel(pending, unavailable)}
          </button>
        )}
        <Link
          href={returnHref}
          aria-disabled={pending || undefined}
          tabIndex={pending ? -1 : undefined}
          className="btn btn-outline min-h-11"
        >
          {returnLabel}
        </Link>
      </div>
    </footer>
  );
}

export function StaffRequestForm({
  idempotencyKey,
  permalink,
  returnHref,
  returnLabel,
}: Readonly<{
  idempotencyKey: string;
  permalink: string;
  returnHref: string;
  returnLabel: string;
}>) {
  const [state, formAction, pending] = useActionState(createStaffRequest, INITIAL_STATE, permalink);
  const [draft, setDraft] = useState<StaffRequestDraft>(() =>
    state.status === "error" ? state.values : EMPTY_DRAFT,
  );
  const [initialIdempotencyKey] = useState(idempotencyKey);
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const retryKey =
    state.status === "error" && state.idempotencyKey !== null
      ? state.idempotencyKey
      : initialIdempotencyKey;
  const unavailable = state.status === "error" && state.code === "unavailable";
  const conflicted = state.status === "error" && state.code === "conflict";
  const draftLocked = unavailable || conflicted;

  useEffect(() => {
    if (state.status !== "error" || pending) return;
    const firstInvalid = STAFF_REQUEST_FIELDS.find(
      (field) => state.fieldErrors?.[field] !== undefined,
    );
    const control =
      firstInvalid === undefined ? null : formRef.current?.elements.namedItem(firstInvalid);
    if (control instanceof HTMLElement) {
      control.focus();
      return;
    }
    alertRef.current?.focus();
  }, [pending, state]);

  const errors = {
    name: errorFor("name", state),
    phone: errorFor("phone", state),
    email: errorFor("email", state),
    location: errorFor("location", state),
    time: errorFor("time", state),
    message: errorFor("message", state),
  } satisfies StaffRequestErrors;
  const onFieldChange: ChangeStaffRequestField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };
  const showFailure = state.status === "error" && !pending;

  return (
    <form
      ref={formRef}
      action={conflicted ? undefined : formAction}
      noValidate
      autoComplete="off"
      aria-label="Add appointment request"
      data-draft-locked={draftLocked || undefined}
      className="portal-request-form-sheet"
    >
      <input type="hidden" name="idempotencyKey" value={retryKey} />
      {unavailable ? (
        <>
          <input type="hidden" name="location" value={draft.location} />
          <input type="hidden" name="time" value={draft.time} />
        </>
      ) : null}

      <div className="portal-request-form-boundary">
        <strong>Keep this to scheduling.</strong>
        <p>
          Do not enter symptoms, diagnoses, medications, or other medical details. Put those in the
          clinical record instead.
        </p>
      </div>

      {showFailure ? (
        <div
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          data-testid="staff-request-error"
          className="portal-request-form-alert"
        >
          <strong>
            {state.code === "validation"
              ? "Check the highlighted fields."
              : conflicted
                ? "These details do not match the first save attempt."
                : "The portal could not confirm whether this request was added."}
          </strong>
          <p>
            {state.code === "validation"
              ? "Your other entries are still here. Correct the first highlighted field and try again."
              : conflicted
                ? "Check New requests for this patient before starting a fresh form."
                : "Try again with these same details. To change anything, check New requests first."}
          </p>
          {state.code === "validation" ? null : (
            <Link href="/admin/requests?status=new">Check New requests</Link>
          )}
        </div>
      ) : null}

      <ContactDetailsSection
        draft={draft}
        errors={errors}
        pending={pending}
        draftLocked={draftLocked}
        onFieldChange={onFieldChange}
      />

      <AppointmentPreferencesSection
        draft={draft}
        errors={errors}
        pending={pending}
        draftLocked={draftLocked}
        onFieldChange={onFieldChange}
      />

      <SchedulingNoteSection
        value={draft.message}
        error={errors.message}
        pending={pending}
        draftLocked={draftLocked}
        onFieldChange={onFieldChange}
      />

      <StaffRequestFormFooter
        conflicted={conflicted}
        pending={pending}
        unavailable={unavailable}
        returnHref={returnHref}
        returnLabel={returnLabel}
      />
    </form>
  );
}
