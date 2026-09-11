import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState, useTransition } from "react";

import { usePortalFeedback } from "@/app/admin/(portal)/portal-feedback";
import { appointmentChoice } from "@/app/admin/(portal)/requests/appointment-input";
import {
  classifyLegacyClosure,
  closeRequest,
  confirmBookingHandoff,
  recordContactAttempt,
  reopenRequest,
  setCallAgain,
  undoLatestTransition,
} from "@/app/admin/(portal)/requests/workflow-actions";
import type { FollowUpChoice } from "@/lib/portal/business-time";
import { legalActionsFor } from "@/lib/portal/workflow/contracts";
import type { CommandOutcome } from "@/lib/portal/workflow/contracts";

import {
  choiceId,
  choiceRowsFor,
  failureCopy,
  followUpChoice,
  ILLEGAL_TRANSITION_COPY,
  INITIAL_PANEL,
  panelReducer,
  staleVersionCopy,
  successCopy,
} from "./workflow-panel-model";
import type { InFlight, PanelIntent, RequestTruth } from "./workflow-panel-model";

/* The panel's controller: the truth it acts on, the staff member's
   in-progress choice, and the five commands that turn a choice into a
   server action and the outcome back into truth, copy and navigation. */

/* The undo window closing is a fact of time, not of data: a slow tick retires
   the affordance while the page sits open. Null until the first tick, so the
   first render trusts the eligibility the server already filtered. */
function useMinuteClock(): number | null {
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);
    return () => {
      clearInterval(timer);
    };
  }, []);
  return nowMs;
}

export function useWorkflowPanel(requestId: string, serverTruth: RequestTruth) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // `pending` alone cannot label buttons: it also covers the router.refresh()
  // That follows a success, and during that window every button would
  // Falsely claim to be the one working ("Reopening…" after a save).
  const [inFlight, setInFlight] = useState<InFlight | null>(null);
  const [panel, dispatch] = useReducer(panelReducer, INITIAL_PANEL);
  const [truth, setTruth] = useState<RequestTruth>(serverTruth);
  const {
    feedback: pageFeedback,
    publish: publishPageFeedback,
    dismiss: dismissPageFeedback,
  } = usePortalFeedback();
  const currentWorkflowFeedback = pageFeedback?.source === "request-workflow" ? pageFeedback : null;
  // One idempotency key per staff attempt: a retry after an ambiguous
  // Failure replays the same command; changing the input mints a new one.
  const keyRef = useRef<string | null>(null);

  // Server truth wins whenever it is newer than what the panel acted on
  // (another tab, another staff member, or our own refresh landing).
  // Guarded render-phase adoption — the React "adjust state on prop
  // Change" pattern — so fresher truth applies before paint.
  if (serverTruth.version > truth.version) {
    setTruth(serverTruth);
  }

  const nowMs = useMinuteClock();

  useEffect(() => {
    if (panel.feedback === null) dismissPageFeedback("request-workflow");
  }, [dismissPageFeedback, panel.feedback]);

  const legal = legalActionsFor(truth.state, {
    legacyReviewRequired: truth.legacyReviewRequired,
    callAgainAt: truth.callAgainAt,
  });
  const rows = choiceRowsFor(legal);
  const selectedRow = rows.find((row) => choiceId(row.choice) === panel.selected) ?? null;

  function currentKey(): string {
    keyRef.current ??= crypto.randomUUID();
    return keyRef.current;
  }

  function freshKey() {
    keyRef.current = crypto.randomUUID();
  }

  function fail(text: string) {
    dispatch({ type: "failed", text });
    publishPageFeedback({ source: "request-workflow", tone: "alert", message: text });
  }

  function applyOutcome(
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- CommandOutcome carries domain member types that cannot be made readonly
    result: Readonly<CommandOutcome>,
    intent: Readonly<PanelIntent>,
  ) {
    if (result.ok) {
      setTruth({
        state: result.state,
        version: result.version,
        // Any accepted command from a legacy-review row is the classify
        // Repair itself, which clears the flag (spec §5.7).
        legacyReviewRequired: false,
        callAgainAt: result.callAgainAt,
        undo: result.undo,
      });
      freshKey();
      const text = successCopy(intent, result);
      dispatch({
        type: "succeeded",
        text,
        closedOrBooked:
          intent.kind !== "undo" && (result.state === "booked" || result.state === "closed"),
      });
      publishPageFeedback({ source: "request-workflow", tone: "status", message: text });
      router.refresh();
      return;
    }
    if (result.code === "stale_version") {
      if (result.current) {
        setTruth({
          state: result.current.state,
          version: result.current.version,
          legacyReviewRequired: truth.legacyReviewRequired,
          callAgainAt: truth.callAgainAt,
          undo: null,
        });
      }
      freshKey();
      fail(staleVersionCopy(result.current));
      router.refresh();
      return;
    }
    if (result.code === "illegal_transition") {
      freshKey();
      fail(ILLEGAL_TRANSITION_COPY);
      router.refresh();
      return;
    }
    if (
      result.code === "idempotency_conflict" ||
      result.code === "undo_unavailable" ||
      result.code === "not_found"
    ) {
      freshKey();
      router.refresh();
    }
    // `unavailable` deliberately keeps the same key: a retry of an
    // Ambiguous failure must replay, not repeat, the command.
    fail(failureCopy(result.code));
  }

  function common() {
    return { requestId, expectedVersion: truth.version, idempotencyKey: currentKey() };
  }

  function save() {
    if (!selectedRow || pending) return;
    const choice = selectedRow.choice;
    if (choice.kind === "attempt") {
      const callAgain = followUpChoice(panel.followUpKind, panel.followUpDay);
      if (callAgain === undefined) return;
      setInFlight("save");
      startTransition(async () => {
        const result = await recordContactAttempt({
          ...common(),
          outcome: choice.outcome,
          callAgain,
        });
        applyOutcome(result, choice);
      });
      return;
    }
    if (choice.kind === "booked") {
      const appointment = appointmentChoice(panel.appointmentDay, panel.appointmentTime);
      if (appointment === undefined) return;
      setInFlight("save");
      startTransition(async () => {
        const result = await confirmBookingHandoff({ ...common(), appointment });
        applyOutcome(result, choice);
      });
      return;
    }
    setInFlight("save");
    startTransition(async () => {
      const result = await closeRequest({ ...common(), reason: choice.reason });
      applyOutcome(result, choice);
    });
  }

  function reopen(callAgain: Readonly<FollowUpChoice>) {
    if (pending) return;
    setInFlight("reopen");
    startTransition(async () => {
      const result = await reopenRequest({ ...common(), callAgain });
      applyOutcome(result, { kind: "reopen" });
    });
  }

  function correctCallAgain(callAgain: Readonly<FollowUpChoice>) {
    if (pending) return;
    setInFlight("set_call_again");
    startTransition(async () => {
      const result = await setCallAgain({ ...common(), callAgain });
      applyOutcome(result, { kind: "set_call_again" });
    });
  }

  function classify() {
    if (pending || !panel.reviewResolution) return;
    const resolution = panel.reviewResolution;
    setInFlight("classify");
    startTransition(async () => {
      const result = await classifyLegacyClosure({
        ...common(),
        resolution: resolution === "booked" ? "booked" : { reason: resolution },
      });
      applyOutcome(result, { kind: "classify" });
    });
  }

  function undoLatest() {
    if (pending || !truth.undo) return;
    const { transitionId } = truth.undo;
    setInFlight("undo");
    startTransition(async () => {
      const result = await undoLatestTransition({ ...common(), transitionId });
      applyOutcome(result, { kind: "undo" });
    });
  }

  const undoOpen =
    truth.undo && (nowMs === null || Date.parse(truth.undo.expiresAt) > nowMs) ? truth.undo : null;

  const saveDisabled =
    pending ||
    !selectedRow ||
    (selectedRow.choice.kind === "attempt" &&
      followUpChoice(panel.followUpKind, panel.followUpDay) === undefined) ||
    (selectedRow.choice.kind === "booked" &&
      appointmentChoice(panel.appointmentDay, panel.appointmentTime) === undefined);

  return {
    truth,
    legal,
    rows,
    panel,
    dispatch,
    pending,
    inFlight,
    undoOpen,
    saveDisabled,
    showFeedback: panel.feedback?.tone === "error" || currentWorkflowFeedback !== null,
    save,
    reopen,
    correctCallAgain,
    classify,
    undoLatest,
  };
}
