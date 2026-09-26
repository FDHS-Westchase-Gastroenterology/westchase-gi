import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

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
import { followed, rejectionMessage, SETTLED_TOAST } from "@/app/admin/(portal)/toast-follow";
import type { FollowUpChoice } from "@/lib/portal/business-time";
import { legalActionsFor } from "@/lib/portal/workflow/contracts";
import type { CommandOutcome, CommandSuccess } from "@/lib/portal/workflow/contracts";

import {
  choiceId,
  choiceRowsFor,
  failureCopy,
  followUpChoice,
  INITIAL_PANEL,
  panelReducer,
  rejectionCopy,
  successCopy,
  workingCopy,
} from "./workflow-panel-model";
import type { InFlight, PanelIntent, RequestTruth } from "./workflow-panel-model";

/* The panel's controller: the truth it acts on, the staff member's
   in-progress choice, and the five commands that turn a choice into a
   server action and the outcome back into truth, copy and navigation.

   Every command is one promise the toast follows (ui/toaster.tsx on Sonner,
   mounted in the portal layout): the working verb while the action runs,
   the result sentence once the server answered. A result that settles the
   request — booked or closed — keeps its toast open with the continuation
   the retired feedback line carried, the queue neighbor fixed at the moment
   staff acted. A refusal keeps its toast open too, with a close button: the
   panel has no other place for a sentence that says nothing may have been
   recorded. One toast per request, so successive results replace in place. */
const WORKFLOW_TOAST_TEST_ID = "workflow-toast";

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- CommandOutcome carries domain member types that cannot be made readonly
function accepted(result: Readonly<CommandOutcome>): result is CommandSuccess {
  return result.ok;
}

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

export function useWorkflowPanel(
  requestId: string,
  serverTruth: RequestTruth,
  nextHref: string | null = null,
) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // `pending` alone cannot label buttons: it also covers the router.refresh()
  // That follows a success, and during that window every button would
  // Falsely claim to be the one working ("Reopening…" after a save).
  const [inFlight, setInFlight] = useState<InFlight | null>(null);
  const [panel, dispatch] = useReducer(panelReducer, INITIAL_PANEL);
  const [truth, setTruth] = useState<RequestTruth>(serverTruth);
  const { publish: publishPageFeedback, dismiss: dismissPageFeedback } = usePortalFeedback();
  // One idempotency key per staff attempt: a retry after an ambiguous
  // Failure replays the same command; changing the input mints a new one.
  const keyRef = useRef<string | null>(null);
  const toastId = `${WORKFLOW_TOAST_TEST_ID}:${requestId}`;

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

  // An open-ended toast belongs to this page: leaving it takes the toast along,
  // So a continuation to a neighbor this page computed cannot outlive it.
  useEffect(
    () => () => {
      toast.dismiss(toastId);
    },
    [toastId],
  );

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
      dispatch({ type: "succeeded", text });
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
      fail(rejectionCopy(result));
      router.refresh();
      return;
    }
    if (result.code === "illegal_transition") {
      freshKey();
      fail(rejectionCopy(result));
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
    fail(rejectionCopy(result));
  }

  function common() {
    return { requestId, expectedVersion: truth.version, idempotencyKey: currentKey() };
  }

  /* One command: the toast follows the same promise the panel awaits. The
     continuation is the neighbor this request had when the staff member
     acted; the refresh recomputes the page's neighbors for a row that is no
     longer in the open set, so the prop is read here and not later. */
  function run(
    kind: InFlight,
    intent: Readonly<PanelIntent>,
    command: () => Promise<CommandOutcome>,
  ) {
    setInFlight(kind);
    const outcome = command();
    const settles = intent.kind !== "undo";
    toast.promise(followed(outcome, accepted, rejectionCopy), {
      id: toastId,
      testId: WORKFLOW_TOAST_TEST_ID,
      ...SETTLED_TOAST,
      loading: workingCopy(intent),
      success: (result) => {
        const message = successCopy(intent, result);
        if (!settles || (result.state !== "booked" && result.state !== "closed")) {
          return { message, ...SETTLED_TOAST };
        }
        return {
          message,
          ...SETTLED_TOAST,
          duration: Number.POSITIVE_INFINITY,
          closeButton: true,
          action: {
            label: nextHref === null ? "Back to Requests" : "Open next appointment request",
            onClick: () => {
              router.push(nextHref ?? "/admin/requests");
            },
          },
        };
      },
      error: (cause: unknown) => ({
        message: rejectionMessage(cause, failureCopy("unavailable")),
        ...SETTLED_TOAST,
        duration: Number.POSITIVE_INFINITY,
        closeButton: true,
      }),
    });
    startTransition(async () => {
      applyOutcome(await outcome, intent);
    });
  }

  function save() {
    if (!selectedRow || pending) return;
    const choice = selectedRow.choice;
    if (choice.kind === "attempt") {
      const callAgain = followUpChoice(panel.followUpKind, panel.followUpDay);
      if (callAgain === undefined) return;
      run("save", choice, async () =>
        recordContactAttempt({ ...common(), outcome: choice.outcome, callAgain }),
      );
      return;
    }
    if (choice.kind === "booked") {
      const appointment = appointmentChoice(panel.appointmentDay, panel.appointmentTime);
      if (appointment === undefined) return;
      run("save", choice, async () => confirmBookingHandoff({ ...common(), appointment }));
      return;
    }
    run("save", choice, async () => closeRequest({ ...common(), reason: choice.reason }));
  }

  function reopen(callAgain: Readonly<FollowUpChoice>) {
    if (pending) return;
    run("reopen", { kind: "reopen" }, async () => reopenRequest({ ...common(), callAgain }));
  }

  function correctCallAgain(callAgain: Readonly<FollowUpChoice>) {
    if (pending) return;
    run("set_call_again", { kind: "set_call_again" }, async () =>
      setCallAgain({ ...common(), callAgain }),
    );
  }

  function classify() {
    if (pending || !panel.reviewResolution) return;
    const resolution = panel.reviewResolution;
    run("classify", { kind: "classify" }, async () =>
      classifyLegacyClosure({
        ...common(),
        resolution: resolution === "booked" ? "booked" : { reason: resolution },
      }),
    );
  }

  function undoLatest() {
    if (pending || !truth.undo) return;
    const { transitionId } = truth.undo;
    run("undo", { kind: "undo" }, async () => undoLatestTransition({ ...common(), transitionId }));
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
    save,
    reopen,
    correctCallAgain,
    classify,
    undoLatest,
  };
}
