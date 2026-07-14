"use client";

import { useRef, useState } from "react";
import { MessageSquare, X } from "@/components/icons";

// The permanent UX slot for the future staff assistant: a docked,
// portal-wide launcher opening an expandable native <dialog> panel. The
// real assistant will inhabit this exact affordance — no dedicated page,
// no nav entry (practice decision, encoded in the mission scope).

export function AssistantLauncher() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);

  function openPanel() {
    dialogRef.current?.showModal();
  }

  // Native <dialog> owns Escape-to-close; onClose resets the expansion.
  function closePanel() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        data-testid="assistant-launcher"
        onClick={openPanel}
        className="fixed bottom-5 right-5 z-40 flex min-h-11 items-center gap-x-2 rounded-full bg-[var(--color-navy)] px-4 text-[0.9rem] font-bold text-[var(--color-on-dark)] shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5"
      >
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
        Assistant
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[0.7rem] uppercase tracking-[0.06em]">
          Coming soon
        </span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="assistant-panel-heading"
        data-testid="assistant-panel"
        data-expanded={expanded}
        onClose={() => setExpanded(false)}
        className={`flex-col overflow-hidden rounded-[var(--radius-lg)] bg-white p-0 shadow-[var(--shadow-card)] backdrop:bg-[rgba(20,32,45,0.35)] open:flex ${
          expanded
            ? "m-auto h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-h-none max-w-none"
            : "mb-4 ml-auto mr-4 mt-auto max-h-[85dvh] w-full max-w-md"
        }`}
      >
        <div className="flex items-center justify-between gap-3 bg-[var(--color-navy)] px-6 py-4 text-[var(--color-on-dark)]">
          <h2
            id="assistant-panel-heading"
            className="text-[1.05rem] font-black"
          >
            Assistant — coming soon
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid="assistant-expand"
              onClick={() => setExpanded((current) => !current)}
              className="flex min-h-10 items-center rounded-[var(--radius-sm)] px-3 text-[0.85rem] font-bold text-[var(--color-on-dark-muted)] transition-colors hover:text-white"
            >
              {expanded ? "Shrink" : "Expand"}
            </button>
            <button
              type="button"
              aria-label="Close the assistant panel"
              onClick={closePanel}
              className="flex min-h-10 min-w-10 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-on-dark-muted)] transition-colors hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <p className="text-[0.95rem] leading-relaxed text-[var(--color-body)]">
            A staff assistant is planned for this exact spot. It is being
            designed to help with the portal and the practice&apos;s
            website — in plain language, right from any page.
          </p>
          <h3 className="mt-5 text-[0.9rem] font-black text-[var(--color-ink)]">
            What it is planned to do
          </h3>
          <ul className="mt-2 space-y-2 text-[0.95rem] leading-relaxed text-[var(--color-body)]">
            <li className="flex gap-x-2.5">
              <span aria-hidden="true" className="mt-0.5 text-[var(--color-teal-ink)]">•</span>
              Answer questions about patient requests, settings, and the
              practice&apos;s software — like the Help page, but
              conversational.
            </li>
            <li className="flex gap-x-2.5">
              <span aria-hidden="true" className="mt-0.5 text-[var(--color-teal-ink)]">•</span>
              Draft website change requests with you, capturing exactly
              what should change and how you&apos;ll know it&apos;s done.
            </li>
            <li className="flex gap-x-2.5">
              <span aria-hidden="true" className="mt-0.5 text-[var(--color-teal-ink)]">•</span>
              Open each request as a tracked work item that the
              practice&apos;s engineering support picks up and completes.
            </li>
          </ul>
          <p className="mt-5 rounded-[var(--radius-sm)] bg-[var(--color-mint)] px-4 py-3 text-[0.9rem] leading-relaxed text-[var(--color-ink)]">
            Until then, the Help page covers everything the portal does
            today, and website changes go through the practice&apos;s
            website maintainer. The assistant will never give medical
            advice or handle patient care.
          </p>
        </div>
      </dialog>
    </>
  );
}
