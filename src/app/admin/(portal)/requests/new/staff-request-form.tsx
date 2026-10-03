"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, Ref, RefObject, SubmitEvent } from "react";

import { createStaffRequest } from "@/app/admin/(portal)/requests/new/actions";
import { INTAKE_FIELDS } from "@/lib/portal/contracts";
import type { CreateStaffRequestActionState, StaffRequestDraft } from "@/lib/portal/contracts";

import { attemptKey, followCreation } from "./created-toast";
import { EMPTY_STAFF_REQUEST_DRAFT, isStaffRequestDraftDirty } from "./staff-request-draft";
import type { StaffRequestPrefill } from "./staff-request-draft";
import { StaffRequestError } from "./staff-request-error";
import type { StaffRequestErrorCode } from "./staff-request-error";
import { StaffRequestFields } from "./staff-request-fields";
import { DiscardStaffRequestPrompt, StaffRequestFormFooter } from "./staff-request-form-footer";
import { useFieldChecks } from "./use-field-checks";
import { useLeaveGuard } from "./use-leave-guard";
import type { StaffRequestFormHandle } from "./use-leave-guard";

const INITIAL_STATE = { status: "idle" } as const satisfies CreateStaffRequestActionState;
const EMPTY_DRAFT = EMPTY_STAFF_REQUEST_DRAFT satisfies StaffRequestDraft;

interface StaffRequestAction {
  readonly state: CreateStaffRequestActionState;
  readonly formAction: (formData: FormData) => void;
  readonly pending: boolean;
}

/** A hosted form tells its dialog about the new request from inside the
    action, not from an effect watching the result: the host learns at the
    moment the fact exists, and the toast (created-toast.ts) follows the same
    attempt. The unhosted route keeps the bare server action for no-JS posts. */
function useStaffRequestAction(
  permalink: string,
  onCreated: ((requestId: string) => void) | null,
  onCreatedToastLeave: ((requestId: string) => void) | undefined,
): StaffRequestAction {
  const action =
    onCreated === null
      ? createStaffRequest
      : async (previous: Readonly<CreateStaffRequestActionState>, formData: FormData) => {
          const attempt = createStaffRequest(previous, formData);
          followCreation(attempt, onCreatedToastLeave);
          const next = await attempt;
          if (next.status === "created") onCreated(next.requestId);
          return next;
        };
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE, permalink);
  return { state, formAction, pending };
}

interface RefusalFocus {
  readonly formRef: RefObject<HTMLFormElement | null>;
  readonly alertRef: RefObject<HTMLDivElement | null>;
}

/** After the server answers with a refusal, focus goes to the first field
    it refused, or to the alert when the refusal is not about a field. */
function useRefusalFocus(
  state: Readonly<CreateStaffRequestActionState>,
  pending: boolean,
): RefusalFocus {
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status !== "error" || pending) return;
    const firstInvalid = INTAKE_FIELDS.find((field) => state.fieldErrors?.[field] !== undefined);
    const control =
      firstInvalid === undefined ? null : formRef.current?.elements.namedItem(firstInvalid);
    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
      control.focus();
      return;
    }
    alertRef.current?.focus();
  }, [pending, state]);
  return { formRef, alertRef };
}

interface FormStatus {
  /** The last attempt could not reach the database; the draft waits for a retry. */
  readonly unavailable: boolean;
  /** The attempt's key was already used for a different request. */
  readonly conflicted: boolean;
  readonly draftLocked: boolean;
  readonly readOnly: boolean;
  /** The refusal to show, once the attempt has settled. */
  readonly failure: StaffRequestErrorCode | null;
}

function formStatus(state: Readonly<CreateStaffRequestActionState>, pending: boolean): FormStatus {
  const code = state.status === "error" ? state.code : null;
  const unavailable = code === "unavailable";
  const conflicted = code === "conflict";
  const draftLocked = unavailable || conflicted;
  return {
    unavailable,
    conflicted,
    draftLocked,
    readOnly: pending || draftLocked,
    failure: pending ? null : code,
  };
}

/* Return submits from anywhere in the sheet, the segmented controls too:
   Add request is the sheet's one prominent answer. */
function submitFromChoice(event: KeyboardEvent<HTMLFormElement>, blocked: boolean) {
  if (event.key !== "Enter" || !(event.target instanceof Element)) return;
  if (event.target.closest('[role="radiogroup"]') === null) return;
  event.preventDefault();
  if (!blocked) event.currentTarget.requestSubmit();
}

export function StaffRequestForm({
  idempotencyKey,
  permalink,
  returnHref,
  returnLabel,
  onCreated,
  onCreatedToastLeave,
  onDismiss,
  dismissRequestRef,
  prefill,
}: Readonly<{
  idempotencyKey: string;
  permalink: string;
  returnHref: string;
  returnLabel: string;
  /** Present when a dialog hosts the form: the caller stays put and closes once the request exists; the toast (created-toast.ts) carries the name. */
  onCreated?: (requestId: string) => void;
  /** Hears the new request's id when its confirming toast leaves. */
  onCreatedToastLeave?: (requestId: string) => void;
  /** Present when a dialog hosts the form: cancelling closes it instead of navigating. */
  onDismiss?: () => void;
  /** Lets the host route Escape through this form's draft protection. */
  dismissRequestRef?: Ref<StaffRequestFormHandle>;
  /** The name or number a search typed: the form opens with it, the caret after it. */
  prefill?: StaffRequestPrefill;
}>) {
  const hosted = onCreated !== undefined && onDismiss !== undefined;
  const [initialIdempotencyKey] = useState(idempotencyKey);
  const { state, formAction, pending } = useStaffRequestAction(
    permalink,
    hosted ? onCreated : null,
    onCreatedToastLeave,
  );
  const [opened] = useState<StaffRequestDraft>(() => ({ ...EMPTY_DRAFT, ...prefill }));
  const [draft, setDraft] = useState<StaffRequestDraft>(() =>
    state.status === "error" ? state.values : opened,
  );
  const { formRef, alertRef } = useRefusalFocus(state, pending);
  const retryKey = attemptKey(state, initialIdempotencyKey);
  const { unavailable, conflicted, draftLocked, readOnly, failure } = formStatus(state, pending);
  const checks = useFieldChecks(state, readOnly);
  const guard = useLeaveGuard({
    dirty: isStaffRequestDraftDirty(draft, opened),
    pending,
    dismiss: hosted ? onDismiss : null,
    returnHref,
    onDiscard: () => {
      setDraft(opened);
    },
    handleRef: dismissRequestRef,
  });

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React events carry DOM member types that cannot be made readonly
  function checkBeforeSubmit(event: SubmitEvent<HTMLFormElement>) {
    if (conflicted || pending) {
      event.preventDefault();
      return;
    }
    const firstInvalid = checks.checkAll(draft);
    if (firstInvalid === undefined) return;
    event.preventDefault();
    const control = event.currentTarget.elements.namedItem(firstInvalid);
    if (control instanceof HTMLElement) control.focus();
  }

  return (
    <form
      ref={formRef}
      action={conflicted ? undefined : formAction}
      noValidate
      autoComplete="off"
      aria-label="Add request"
      aria-busy={pending || undefined}
      data-draft-locked={draftLocked || undefined}
      data-hosted={hosted || undefined}
      onSubmit={checkBeforeSubmit}
      onKeyDown={(event) => {
        submitFromChoice(event, conflicted || pending);
      }}
      className="portal-request-form"
    >
      <input type="hidden" name="idempotencyKey" value={retryKey} />
      {hosted ? <input type="hidden" name="stayHere" value="1" /> : null}

      <div className="portal-request-form-well">
        {failure === null ? null : <StaffRequestError code={failure} alertRef={alertRef} />}

        <StaffRequestFields
          draft={draft}
          readOnly={readOnly}
          autoFocus={hosted}
          checks={checks}
          onChange={(patch) => {
            setDraft((current) => ({ ...current, ...patch }));
          }}
        />
      </div>

      {guard.asking ? (
        <DiscardStaffRequestPrompt onKeepEditing={guard.keepEditing} onDiscard={guard.discard} />
      ) : (
        <StaffRequestFormFooter
          cancelRef={guard.cancelRef}
          conflicted={conflicted}
          hosted={hosted}
          pending={pending}
          unavailable={unavailable}
          returnHref={returnHref}
          returnLabel={returnLabel}
          onCancelClick={guard.requestLeave}
        />
      )}
    </form>
  );
}
