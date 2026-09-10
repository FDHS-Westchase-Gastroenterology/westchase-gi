"use client";

import { cn } from "cn";

import { followUpWhenLabel, stateLabel } from "@/app/admin/(portal)/requests/format";
import { Button } from "@/components/ui/button";
import type {
  ManualClosureReason as ClosureReason,
  UndoWindow,
} from "@/lib/portal/workflow/contracts";

import { ReturnTimeAction } from "./call-again-fieldset";
import { DecisionRow, OutcomeChoiceList } from "./outcome-choice-list";
import { useWorkflowPanel } from "./use-workflow-panel";
import type { Feedback, InFlight, RequestTruth } from "./workflow-panel-model";

/* The request work panel. The model (choices, copy, reducer) is in
   workflow-panel-model.ts and the controller in use-workflow-panel.ts; this
   file is the surface: the current state line, the undo affordance, and one
   of three bodies — the outcome list for an open request, the legacy-review
   form for a closed row that predates outcomes, or the resolved notice with
   its reopen control.

   It is mounted on two surfaces: Home's full-record sheet, where all of an
   appointment's work now happens, and the request page. Nothing here assumes
   either one, which is why the outer chrome arrives as a class name and the
   acknowledgement is a toast rather than a block of page. */

const NY_CLOCK = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/New_York",
});

/* What is left on screen after a refusal. The success that used to sit here
   in mint is a toast now; this is amber ink on the panel's own paper rather
   than a tinted block, because a sentence staff must act on should read like
   the panel talking, not like a second surface arriving (DESIGN.md colour
   law: amber is attention, and a block of it for every save spent the
   colour on news that was not news). */
function PanelFailure({ feedback }: Readonly<{ feedback: Feedback | null }>) {
  if (feedback === null) return null;
  return (
    <p
      role="alert"
      aria-atomic="true"
      data-testid="workflow-feedback"
      className="portal-panel-failure"
    >
      {feedback.text}
    </p>
  );
}

function UndoAffordance({
  undo,
  pending,
  inFlight,
  onUndo,
}: Readonly<{
  undo: UndoWindow;
  pending: boolean;
  inFlight: InFlight | null;
  onUndo: () => void;
}>) {
  return (
    <div
      data-testid="undo-affordance"
      className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-white px-4 py-3"
    >
      <p className="text-[0.9rem] text-[var(--color-body)]">
        The last change can be undone until{" "}
        <strong className="font-bold">{NY_CLOCK.format(new Date(undo.expiresAt))}</strong>.
      </p>
      <Button
        type="button"
        variant="outline"
        data-testid="undo-latest"
        disabled={pending}
        onClick={onUndo}
        className="disabled:opacity-60"
      >
        {pending && inFlight === "undo" ? "Undoing…" : "Undo"}
      </Button>
    </div>
  );
}

/** A closed row from before outcomes were recorded: staff say how it actually ended. */
function LegacyReviewForm({
  resolution,
  pending,
  inFlight,
  onSelect,
  onClassify,
}: Readonly<{
  resolution: "booked" | ClosureReason | null;
  pending: boolean;
  inFlight: InFlight | null;
  onSelect: (resolution: "booked" | ClosureReason) => void;
  onClassify: () => void;
}>) {
  return (
    <>
      <p className="mt-4 max-w-[68ch] rounded-[var(--radius-sm)] bg-[var(--color-amber-soft)] px-4 py-3 text-[0.9rem] leading-relaxed font-bold text-[var(--color-ink)]">
        This request was closed before outcomes were recorded, so its record is incomplete. Say how
        it actually ended — nothing else about the request changes.
      </p>
      <fieldset className="mt-5" disabled={pending}>
        <legend className="text-sm font-bold text-[var(--color-ink)]">
          How did this request actually end?
        </legend>
        <div className="portal-choice-list">
          <DecisionRow
            name="legacy-review"
            value="booked"
            checked={resolution === "booked"}
            disabled={pending}
            label="An appointment was booked"
            helper="The record will show Scheduled."
            onSelect={() => {
              onSelect("booked");
            }}
          />
          <DecisionRow
            name="legacy-review"
            value="wont_schedule"
            checked={resolution === "wont_schedule"}
            disabled={pending}
            label="No appointment — patient wouldn't schedule"
            onSelect={() => {
              onSelect("wont_schedule");
            }}
          />
          <DecisionRow
            name="legacy-review"
            value="not_actionable"
            checked={resolution === "not_actionable"}
            disabled={pending}
            label="No appointment — duplicate or not actionable"
            onSelect={() => {
              onSelect("not_actionable");
            }}
          />
        </div>
      </fieldset>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          type="button"
          variant={
            resolution !== null || (pending && inFlight === "classify") ? "default" : "outline"
          }
          data-testid="classify-legacy"
          disabled={pending || resolution === null}
          onClick={onClassify}
          className="disabled:opacity-60"
        >
          {pending && inFlight === "classify" ? "Saving…" : "Finish record"}
        </Button>
        <p className="text-sm text-[var(--color-muted-ink)]">
          This review is recorded in Request history.
        </p>
      </div>
    </>
  );
}

function WorkflowStatus({
  truth,
  classifyLegacyClosure,
}: Readonly<{
  truth: RequestTruth;
  classifyLegacyClosure: boolean;
}>) {
  return (
    <>
      <h2 className="text-[1.05rem] font-black text-[var(--color-ink)]">
        {classifyLegacyClosure
          ? "Finish this request's record"
          : truth.state === "new" || truth.state === "contacted"
            ? "Record what happened"
            : "This request is resolved"}
      </h2>

      <p
        id="workflow-current-state"
        data-testid="workflow-current-state"
        className="mt-1.5 text-sm font-bold text-[var(--color-body)]"
      >
        Current status: {stateLabel(truth.state)}
        {truth.state === "contacted" && truth.callAgainAt !== null && truth.callAgainAt !== ""
          ? ` — call again ${followUpWhenLabel(truth.callAgainAt)}`
          : truth.state === "contacted"
            ? " — call-again day missing"
            : ""}
      </p>
    </>
  );
}

function WorkflowSaveControls({
  hasSelection,
  saveDisabled,
  pending,
  inFlight,
  onSave,
}: Readonly<{
  hasSelection: boolean;
  saveDisabled: boolean;
  pending: boolean;
  inFlight: InFlight | null;
  onSave: () => void;
}>) {
  return (
    <div
      className={`mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 ${
        hasSelection ? "portal-commit-shelf" : ""
      }`}
    >
      <Button
        type="button"
        variant={!saveDisabled || (pending && inFlight === "save") ? "default" : "outline"}
        data-testid="save-workflow"
        disabled={saveDisabled}
        onClick={onSave}
        className="disabled:opacity-60"
      >
        {pending && inFlight === "save" ? "Saving…" : "Save"}
      </Button>
      <p className="text-sm text-[var(--color-muted-ink)]">
        Save records one entry in Request history. You can undo for 15 minutes.
      </p>
    </div>
  );
}

export function WorkflowPanel({
  requestId,
  truth: serverTruth,
  patientName,
  nextHref = null,
  onSaved,
  onSettled,
  className = "mt-7 border-t border-[var(--color-line)] pt-7",
}: Readonly<{
  requestId: string;
  truth: RequestTruth;
  patientName: string;
  nextHref?: string | null;
  onSaved?: (() => void) | undefined;
  onSettled?: (() => void) | undefined;
  className?: string;
}>) {
  const {
    truth,
    legal,
    rows,
    panel,
    dispatch,
    pending,
    inFlight,
    undoOpen,
    saveDisabled,
    save,
    reopen,
    correctCallAgain,
    classify,
    undoLatest,
  } = useWorkflowPanel(requestId, serverTruth, { patientName, nextHref, onSaved, onSettled });

  return (
    <section data-testid="workflow-panel" className={cn("print-hide", className)}>
      <WorkflowStatus truth={truth} classifyLegacyClosure={legal.classifyLegacyClosure} />

      <PanelFailure feedback={panel.feedback} />

      {undoOpen !== null ? (
        <UndoAffordance undo={undoOpen} pending={pending} inFlight={inFlight} onUndo={undoLatest} />
      ) : null}

      {legal.setCallAgain && panel.selected === null ? (
        <ReturnTimeAction
          kind="set_call_again"
          pending={pending}
          inFlight={inFlight}
          onSubmit={correctCallAgain}
        />
      ) : null}

      {legal.classifyLegacyClosure ? (
        <LegacyReviewForm
          resolution={panel.reviewResolution}
          pending={pending}
          inFlight={inFlight}
          onSelect={(resolution) => {
            dispatch({ type: "select_review", resolution });
          }}
          onClassify={classify}
        />
      ) : rows.length > 0 ? (
        <>
          <OutcomeChoiceList
            rows={rows}
            pending={pending}
            selected={panel.selected}
            followUpKind={panel.followUpKind}
            followUpDay={panel.followUpDay}
            appointmentDay={panel.appointmentDay}
            appointmentTime={panel.appointmentTime}
            onSelect={(id) => {
              dispatch({ type: "select", id });
            }}
            onSelectFollowUp={(kind) => {
              dispatch({ type: "select_follow_up", kind });
            }}
            onDayChange={(day) => {
              dispatch({ type: "set_day", day });
            }}
            onAppointmentDayChange={(day) => {
              dispatch({ type: "set_appointment_day", day });
            }}
            onAppointmentTimeChange={(time) => {
              dispatch({ type: "set_appointment_time", time });
            }}
          />

          <WorkflowSaveControls
            hasSelection={panel.selected !== null}
            saveDisabled={saveDisabled}
            pending={pending}
            inFlight={inFlight}
            onSave={save}
          />
        </>
      ) : (
        <div className="mt-4">
          <p className="max-w-[68ch] rounded-[var(--radius-sm)] bg-[var(--color-mint)] px-4 py-3 text-[0.9rem] leading-relaxed text-[var(--color-ink)]">
            {truth.state === "booked"
              ? "The appointment is booked and this request is complete. It stays on the Scheduled view if staff need it."
              : "This request is closed — no appointment was booked."}
          </p>
          {legal.reopenRequest ? (
            <ReturnTimeAction
              kind="reopen"
              pending={pending}
              inFlight={inFlight}
              onSubmit={reopen}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
