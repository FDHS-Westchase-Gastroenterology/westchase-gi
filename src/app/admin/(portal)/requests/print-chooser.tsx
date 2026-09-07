"use client";

import { cn } from "cn";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";

import { usePortalFeedback } from "@/app/admin/(portal)/portal-feedback";
import { STATUS_LABELS } from "@/app/admin/(portal)/requests/format";
import { Printer } from "@/components/icons";
import { useOutputGuard } from "@/components/output-feedback";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import {
  formatStatusList,
  knownSelectionCount,
  printPacketHref,
  printSelectionIsAvailable,
} from "@/lib/portal/print-selection";
import type { RequestStatus, StatusCounts } from "@/lib/portal/workflow/contracts";

/* Printing exists to hand paper to staff, so the menu offers the two statuses
   that get handed out: New requests nobody has called, and Contacted requests
   that have not reached scheduling yet. Scheduled and Closed are readable and
   printable from Appointments — the packet route parses any status from the
   URL — they just are not questions worth asking at this moment. */
const PRINTABLE_STATUSES = ["new", "contacted"] as const satisfies readonly RequestStatus[];

function keepFocusInDialog(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const dialog = event.currentTarget;
  /* Base UI's checkbox keeps a hidden native input at tabindex -1 beside
     its role="checkbox" control; only the control is a tab stop. */
  const focusable = Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), input:not(:disabled):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.getAttribute("aria-disabled") !== "true");
  const first = focusable.at(0);
  const last = focusable.at(-1);
  if (first === undefined || last === undefined) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function selectionSummary(statuses: readonly RequestStatus[], counts: StatusCounts): string {
  if (statuses.length === 0) return "Choose one or more statuses.";
  if (!printSelectionIsAvailable(statuses, counts)) {
    if (statuses.length === 1 && counts[statuses[0]] === null) {
      return `${STATUS_LABELS[statuses[0]]} is unavailable right now.`;
    }
    return `Nothing to print in ${formatStatusList(statuses, STATUS_LABELS)}.`;
  }
  const count = knownSelectionCount(statuses, counts);
  const statusList = formatStatusList(statuses, STATUS_LABELS);
  if (count === 1) return `Prints 1 request in ${statusList}, oldest first.`;
  if (count !== null) return `Prints ${count} requests in ${statusList}, oldest first.`;
  return `Prints ${statusList}, oldest first.`;
}

export function PrintChooser({
  statusCounts,
  triggerClassName,
  triggerLabel = "Print",
}: Readonly<{
  statusCounts: StatusCounts;
  triggerClassName: string;
  triggerLabel?: string;
}>) {
  const titleId = useId();
  const summaryId = useId();
  const statusIdBase = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<RequestStatus[]>([]);
  const { publish } = usePortalFeedback();
  const guard = useOutputGuard();
  const newCount = statusCounts.new;
  const canPrintAllNew = newCount !== null && newCount !== undefined && newCount > 0;
  const canPrintSelected = printSelectionIsAvailable(selected, statusCounts);
  const selectedHref = canPrintSelected ? printPacketHref(selected) : null;

  function openChooser() {
    setSelected([]);
    const dialog = dialogRef.current;
    dialog?.showModal();
    setOpen(true);
    /* The dialog's own focusing steps have just landed on the first
       focusable control, which is Close. Move to the primary action in the
       same task: a frame callback never runs while the tab is hidden, and
       the keyboard user would be left on Close. */
    dialog
      ?.querySelector<HTMLElement>(
        ".portal-print-chooser-primary a[href], .portal-print-chooser-primary button:not(:disabled), .portal-print-chooser-statuses [role=checkbox]",
      )
      ?.focus();
  }

  function closeChooser() {
    dialogRef.current?.close();
  }

  function setStatusChecked(status: RequestStatus, checked: boolean) {
    setSelected((current) => {
      const without = current.filter((value) => value !== status);
      return checked ? [...without, status] : without;
    });
  }

  function beginCustomPrint(event: MouseEvent<HTMLAnchorElement>) {
    if (!canPrintSelected || selectedHref === null || !guard.begin()) {
      event.preventDefault();
      return;
    }
    publish({
      source: "requests-output",
      tone: "status",
      message:
        selected.length === 1 && selected[0] === "new"
          ? "Print dialog is opening in a new tab for the New-request packet."
          : `Print dialog is opening in a new tab for ${formatStatusList(selected, STATUS_LABELS)}.`,
    });
    closeChooser();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-testid="print-chooser-trigger"
        onClick={openChooser}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={triggerClassName}
      >
        <Printer data-icon="inline-start" />
        {triggerLabel}
      </button>
      <dialog
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="print-chooser"
        onCancel={(event) => {
          event.preventDefault();
          closeChooser();
        }}
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
        onKeyDown={keepFocusInDialog}
        className="portal-confirm-dialog portal-print-chooser"
      >
        <div className="portal-confirm-dialog-body">
          <div className="portal-confirm-dialog-heading">
            <h2 id={titleId} className="portal-confirm-dialog-title">
              Print appointments
            </h2>
            <button type="button" onClick={closeChooser} className="portal-confirm-dialog-close">
              Close
            </button>
          </div>
          <p>Choose all New requests, or build a list by status.</p>
          <div className="portal-print-chooser-primary">
            {canPrintAllNew ? (
              <Link
                href={printPacketHref(["new"])}
                target="_blank"
                rel="noopener"
                prefetch={false}
                aria-label={`Print all ${newCount} new appointment ${
                  newCount === 1 ? "request" : "requests"
                }; opens in a new tab`}
                aria-disabled={guard.locked || undefined}
                onClick={(event) => {
                  if (!guard.begin()) {
                    event.preventDefault();
                    return;
                  }
                  publish({
                    source: "requests-output",
                    tone: "status",
                    message: "Print dialog is opening in a new tab for the New-request packet.",
                  });
                  closeChooser();
                }}
                data-slot="button"
                className={cn(
                  buttonVariants(),
                  "aria-disabled:pointer-events-none aria-disabled:opacity-60",
                )}
              >
                <Printer data-icon="inline-start" />
                <span data-testid="print-new-count">Print all New ({newCount})</span>
              </Link>
            ) : (
              <Button type="button" disabled>
                <Printer data-icon="inline-start" />
                {newCount === null ? "New is unavailable" : "No New requests"}
              </Button>
            )}
          </div>
          <FieldSet className="portal-print-chooser-statuses">
            <FieldLegend variant="label">Custom list</FieldLegend>
            <FieldGroup data-slot="checkbox-group">
              {PRINTABLE_STATUSES.map((status) => {
                const count = statusCounts[status];
                const id = `${statusIdBase}-${status}`;
                return (
                  <FieldLabel key={status} htmlFor={id}>
                    <Field orientation="horizontal" className="min-h-11">
                      <Checkbox
                        id={id}
                        data-testid={`print-status-${status}`}
                        checked={selected.includes(status)}
                        onCheckedChange={(checked) => {
                          setStatusChecked(status, checked);
                        }}
                      />
                      <FieldTitle>{STATUS_LABELS[status]}</FieldTitle>
                      {count !== null && count !== undefined ? (
                        <span className="portal-print-chooser-count">{count}</span>
                      ) : null}
                    </Field>
                  </FieldLabel>
                );
              })}
            </FieldGroup>
          </FieldSet>
          <p id={summaryId} aria-live="polite" data-testid="print-chooser-summary">
            {selectionSummary(selected, statusCounts)}
          </p>
        </div>
        <div className="portal-confirm-dialog-actions">
          {selectedHref !== null && canPrintSelected ? (
            <Link
              href={selectedHref}
              target="_blank"
              rel="noopener"
              prefetch={false}
              aria-describedby={summaryId}
              aria-disabled={guard.locked || undefined}
              onClick={beginCustomPrint}
              data-slot="button"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "aria-disabled:pointer-events-none aria-disabled:opacity-60",
              )}
            >
              <Printer data-icon="inline-start" />
              Print selected
            </Link>
          ) : (
            <Button type="button" variant="outline" disabled>
              <Printer data-icon="inline-start" />
              Print selected
            </Button>
          )}
          <button
            type="button"
            onClick={closeChooser}
            className="portal-confirm-dialog-discard min-h-11"
          >
            Cancel
          </button>
        </div>
      </dialog>
    </>
  );
}
