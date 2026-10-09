"use client";

import { useState } from "react";

import type { CreateStaffRequestActionState, StaffRequestDraft } from "@/lib/portal/contracts";

import { CHECKED_FIELDS, checkField, serverErrorFor } from "./staff-request-validation";
import type { CheckedField } from "./staff-request-validation";

type CheckErrors = Readonly<Partial<Record<CheckedField, string | null>>>;

/** The fixes the sheet found itself, for the server answer they were found
    against. A new answer from the server replaces them wholesale. */
interface ClientChecks {
  readonly for: CreateStaffRequestActionState;
  readonly errors: CheckErrors;
}

const NO_CHECKS: CheckErrors = {};

export interface FieldChecks {
  /** The fix a field shows now: the sheet's own check, else the server's. */
  readonly errorOf: (field: CheckedField) => string | null;
  /** Blur checks what was typed; an empty field waits for the submit, so
      tabbing through the sheet never lights it up. */
  readonly checkOnBlur: (field: CheckedField, value: string) => void;
  /** While a field shows a fix, each keystroke re-checks it, so the fix
      leaves the moment the value is right. */
  readonly recheck: (field: CheckedField, value: string) => void;
  /** Checks every field before a submit and shows each fix; returns the
      first field refused, if any. */
  readonly checkAll: (draft: Readonly<StaffRequestDraft>) => CheckedField | undefined;
}

export function useFieldChecks(
  state: Readonly<CreateStaffRequestActionState>,
  readOnly: boolean,
): FieldChecks {
  const [checks, setChecks] = useState<ClientChecks>(() => ({ for: state, errors: NO_CHECKS }));
  const own = checks.for === state ? checks.errors : NO_CHECKS;

  function errorOf(field: CheckedField): string | null {
    const error = own[field];
    return error === undefined ? serverErrorFor(field, state) : error;
  }

  function record(field: CheckedField, value: string) {
    const error = checkField(field, value);
    setChecks((current) => {
      const kept = current.for === state ? current.errors : NO_CHECKS;
      return { for: state, errors: { ...kept, [field]: error } };
    });
  }

  return {
    errorOf,
    checkOnBlur(field, value) {
      if (readOnly) return;
      if (value === "" && errorOf(field) === null) return;
      record(field, value);
    },
    recheck(field, value) {
      if (errorOf(field) !== null) record(field, value);
    },
    checkAll(draft) {
      const found = {
        name: checkField("name", draft.name),
        phone: checkField("phone", draft.phone),
        email: checkField("email", draft.email),
        message: checkField("message", draft.message),
      } satisfies Record<CheckedField, string | null>;
      const firstInvalid = CHECKED_FIELDS.find((field) => found[field] !== null);
      if (firstInvalid !== undefined) setChecks({ for: state, errors: found });
      return firstInvalid;
    },
  };
}
