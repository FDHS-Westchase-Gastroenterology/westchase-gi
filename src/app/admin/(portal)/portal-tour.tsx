"use client";

import { useRef, useState } from "react";

import { X } from "@/components/icons";
import { Button } from "@/components/ui/button";

import { dismissPortalTourAction, finishPortalTourAction } from "./tour-actions";

const STEPS = [
  {
    title: "Home",
    body: "Start here to see what needs contact now. When New appointment requests are waiting, a manager can print the complete paper handoff here without changing their status.",
  },
  {
    title: "Appointments",
    body: "Open a request, call the patient, and record what happened on the call. The queue is the practice’s complete list even if a notification email is missed.",
  },
  {
    title: "Settings",
    body: "Manage notification email recipients here. Administrators can also invite staff and manage access. Help stays in the desktop task rail or the mobile navigation.",
  },
] as const;

export function PortalTour() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const finalStep = step === STEPS.length - 1;

  function openTour() {
    setStep(0);
    dialogRef.current?.showModal();
    closeRef.current?.focus();
  }

  function closeTour() {
    dialogRef.current?.close();
  }

  function keepFocusWithinDialog(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (dialog === null) return;

    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <aside
        aria-label="Portal tour"
        data-testid="portal-tour-nudge"
        className="mt-6 flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-mint)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="font-black text-[var(--color-ink)]">New to the portal?</p>
          <p className="mt-1 max-w-[58ch] text-[0.9rem] leading-relaxed text-[var(--color-body)]">
            Take a short, optional look around. You can reopen it from Help any time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button ref={launcherRef} id="portal-tour-launcher" type="button" onClick={openTour}>
            Take a quick tour
          </Button>
          <form action={dismissPortalTourAction}>
            <button
              type="submit"
              className="min-h-11 rounded-[var(--radius-sm)] px-3 text-[0.9rem] font-bold text-[var(--color-teal-ink)] underline-offset-2 hover:underline"
            >
              Not now
            </button>
          </form>
        </div>
      </aside>

      <dialog
        ref={dialogRef}
        aria-labelledby="portal-tour-heading"
        aria-describedby="portal-tour-description"
        data-testid="portal-tour-dialog"
        onKeyDown={keepFocusWithinDialog}
        onClose={() => {
          setStep(0);
          launcherRef.current?.focus();
        }}
        className="tour-dialog m-auto max-h-[90dvh] w-[90vw] max-w-xl overflow-y-auto rounded-[var(--radius-lg)] border-0 bg-white p-0 shadow-[var(--shadow-card)] backdrop:bg-[rgba(20,32,45,0.48)]"
      >
        <div className="flex items-center justify-between gap-4 bg-[var(--color-navy)] px-5 py-4 text-[var(--color-on-dark)] sm:px-6">
          <p className="text-[0.8rem] font-extrabold tracking-[0.08em] text-[var(--color-on-dark-muted)] uppercase">
            Portal tour
          </p>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close the portal tour"
            onClick={closeTour}
            className="grid min-h-11 min-w-11 place-items-center rounded-[var(--radius-sm)] text-[var(--color-on-dark-muted)] transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-6 sm:px-8 sm:py-8">
          <div aria-live="polite">
            <p className="text-[0.8rem] font-extrabold tracking-[0.08em] text-[var(--color-teal-ink)] uppercase">
              Step {step + 1} of {STEPS.length}
            </p>
            <h2
              id="portal-tour-heading"
              className="mt-2 text-[1.45rem] font-black text-[var(--color-ink)]"
            >
              {current.title}
            </h2>
            <p
              id="portal-tour-description"
              className="mt-3 min-h-24 text-[0.98rem] leading-relaxed text-[var(--color-body)] sm:min-h-20"
            >
              {current.body}
            </p>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-5">
            <button
              type="button"
              onClick={() => {
                setStep((value) => Math.max(0, value - 1));
              }}
              disabled={step === 0}
              className="min-h-11 rounded-[var(--radius-sm)] px-3 text-[0.9rem] font-bold text-[var(--color-teal-ink)] disabled:invisible"
            >
              Back
            </button>

            <form
              action={finishPortalTourAction.bind(null, {
                stepReached: STEPS.length,
                totalSteps: STEPS.length,
              })}
              onSubmit={(event) => {
                if (finalStep) return;
                event.preventDefault();
                setStep((value) => Math.min(STEPS.length - 1, value + 1));
              }}
            >
              <Button type="submit" variant={finalStep ? "amber" : "default"}>
                {finalStep ? "Finish tour" : "Next"}
              </Button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
