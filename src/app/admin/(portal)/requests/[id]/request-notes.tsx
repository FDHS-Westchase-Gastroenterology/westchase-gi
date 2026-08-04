"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import {
  addRequestNote,
  type AddRequestNoteState,
} from "../actions";

export type RequestNoteView = {
  id: string;
  text: string;
  byline: string;
};

const INITIAL_VISIBLE_NOTES = 3;
const INITIAL_ACTION_STATE: AddRequestNoteState = { status: "idle" };

export function RequestNotes({
  requestId,
  notes,
}: {
  requestId: string;
  notes: RequestNoteView[];
}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMotion, setComposerMotion] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [draft, setDraft] = useState("");
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);
  const [feedback, formAction, pending] = useActionState(
    addRequestNote,
    INITIAL_ACTION_STATE,
  );
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submitWithMotionRef = useRef(false);
  const canSave = draft.trim().length > 0;
  const hiddenCount = Math.max(notes.length - INITIAL_VISIBLE_NOTES, 0);
  const saved =
    feedback.status === "success" && !feedbackDismissed && !pending;
  const composerVisible = composerOpen && !saved;
  const focusAddButtonOnSave = useCallback(
    (feedbackElement: HTMLParagraphElement | null) => {
      if (feedbackElement) {
        requestAnimationFrame(() => addButtonRef.current?.focus());
      }
    },
    [],
  );

  function openComposer(event: React.MouseEvent<HTMLButtonElement>) {
    setDraft("");
    setFeedbackDismissed(true);
    setComposerMotion(event.detail > 0);
    setComposerOpen(true);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function closeComposer(event: React.MouseEvent<HTMLButtonElement>) {
    setDraft("");
    setFeedbackDismissed(true);
    setComposerMotion(event.detail > 0);
    setComposerOpen(false);
    requestAnimationFrame(() => addButtonRef.current?.focus());
  }

  return (
    <section
      data-testid="request-notes"
      aria-labelledby="request-notes-heading"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2
          id="request-notes-heading"
          className="text-[1.05rem] font-black text-[var(--color-ink)]"
        >
          Appointment request notes
        </h2>
        <button
          ref={addButtonRef}
          type="button"
          aria-controls="request-note-form"
          aria-expanded={composerVisible}
          aria-hidden={composerVisible}
          data-open={composerVisible}
          data-animate={composerMotion}
          inert={composerVisible}
          onClick={openComposer}
          className="request-note-add-trigger btn btn-outline btn-sm print-hide min-h-11"
        >
          Add note
        </button>
      </div>

      {saved ? (
        <p
          ref={focusAddButtonOnSave}
          role="status"
          data-testid="request-note-feedback"
          className="print-hide mt-4 rounded-[var(--radius-sm)] bg-[var(--color-mint)] px-4 py-3 text-[0.9rem] font-bold leading-relaxed text-[var(--color-ink)]"
        >
          {feedback.message}
        </p>
      ) : null}

      {notes.length === 0 ? (
        <p
          data-testid="notes-empty"
          className="mt-4 text-[0.95rem] text-[var(--color-muted)]"
        >
          No notes yet.
        </p>
      ) : (
        <>
          <ul
            id="request-note-list"
            data-testid="note-list"
            className="mt-4 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]"
          >
            {notes.map((note, index) => (
              <li
                key={note.id}
                className={`request-note-item py-4 ${
                  index >= INITIAL_VISIBLE_NOTES && !showAll
                    ? "hidden print:list-item"
                    : ""
                }`}
              >
                <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-[var(--color-ink)]">
                  {note.text}
                </p>
                <p className="mt-2 text-[0.8rem] font-bold text-[var(--color-teal-ink)]">
                  {note.byline}
                </p>
              </li>
            ))}
          </ul>
          {hiddenCount > 0 ? (
            <button
              type="button"
              aria-controls="request-note-list"
              aria-expanded={showAll}
              onClick={() => setShowAll((visible) => !visible)}
              className="print-hide mt-3 min-h-11 py-2 text-[0.9rem] font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
            >
              {showAll
                ? "Show fewer notes"
                : `Show ${hiddenCount} earlier ${
                    hiddenCount === 1 ? "note" : "notes"
                  }`}
            </button>
          ) : null}
        </>
      )}

      <div
        aria-hidden={!composerVisible}
        data-open={composerVisible}
        data-animate={composerMotion}
        inert={!composerVisible}
        className="request-note-disclosure print-hide"
      >
        <div className="request-note-disclosure__clip">
          <form
            id="request-note-form"
            action={formAction}
            onSubmit={() => {
              setFeedbackDismissed(false);
              setComposerMotion(submitWithMotionRef.current);
            }}
            className="request-note-composer mt-5 border-t border-[var(--color-line)] pt-5"
          >
            <input type="hidden" name="requestId" value={requestId} />
            <label
              htmlFor="request-note"
              className="block text-sm font-bold text-[var(--color-ink)]"
            >
              Note
            </label>
            <textarea
              ref={textareaRef}
              id="request-note"
              name="note"
              rows={3}
              required
              maxLength={2000}
              value={draft}
              disabled={pending}
              aria-describedby={
                feedback.status === "error" && !feedbackDismissed
                  ? "request-note-guidance request-note-error"
                  : "request-note-guidance"
              }
              onChange={(event) => {
                setDraft(event.target.value);
                if (feedback.status === "error") setFeedbackDismissed(true);
              }}
              placeholder="What should the next staff member know?"
              className="mt-2 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 py-3 text-[0.95rem] text-[var(--color-ink)] outline-none transition-[border-color,box-shadow] focus:border-[var(--color-teal-ink)] focus:ring-2 focus:ring-[var(--color-teal-ink)] focus:ring-offset-2 disabled:opacity-60"
            />
            <p
              id="request-note-guidance"
              className="mt-2 text-[0.85rem] leading-relaxed text-[var(--color-muted)]"
            >
              Keep medical details in the clinical record.
            </p>
            {feedback.status === "error" &&
            !feedbackDismissed &&
            !pending ? (
              <p
                id="request-note-error"
                role="alert"
                data-testid="request-note-feedback"
                className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-amber-soft)] px-4 py-3 text-[0.9rem] font-bold leading-relaxed text-[var(--color-ink)]"
              >
                {feedback.message}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!canSave || pending}
                onClick={(event) => {
                  submitWithMotionRef.current = event.detail > 0;
                }}
                className="btn btn-navy min-h-11 transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                {pending ? "Saving…" : "Save note"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={closeComposer}
                className="btn btn-outline min-h-11 transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
