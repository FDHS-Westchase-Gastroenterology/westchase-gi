"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";

import { addRequestNote } from "@/app/admin/(portal)/requests/actions";
import type { AddRequestNoteState } from "@/app/admin/(portal)/requests/actions";
import { followed } from "@/app/admin/(portal)/toast-follow";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

/* Add a note, from the foot of the Schedule's records (issue #356): a
   popover over the button with the request page's composer in it — the
   same server action, the same 2,000-character bound, the same reminder
   that medical details belong in the clinical record, and the same toast
   ("Saving note…", then "Note added." once the server confirmed it). A
   failed save keeps the draft and says so beside it; the toast has no
   error branch. The note lands on the request the record shows, and the
   record reads itself again so its Latest note is the one just written.

   Motion is the popover recipe's (ui/popover.tsx): it grows from the
   button on the base beat and leaves on the fast one. Opened from the
   keyboard it appears at once. */

const NOTE_TOAST_TEST_ID = "request-note-toast";
const IDLE: AddRequestNoteState = { status: "idle" };

function noteAdded(
  state: Readonly<AddRequestNoteState>,
): state is Extract<AddRequestNoteState, { status: "success" }> {
  return state.status === "success";
}

export function RecordNoteComposer({
  requestId,
  onAdded,
}: Readonly<{ requestId: string; onAdded: () => void }>) {
  const [open, setOpen] = useState(false);
  const [keyed, setKeyed] = useState(false);
  const [draft, setDraft] = useState("");
  const [feedback, formAction, pending] = useActionState(
    async (previous: Readonly<AddRequestNoteState>, formData: FormData) => {
      const attempt = addRequestNote(previous, formData);
      /* One toast per request: the next note updates it in place. */
      toast.promise(followed(attempt, noteAdded), {
        id: `${NOTE_TOAST_TEST_ID}:${requestId}`,
        testId: NOTE_TOAST_TEST_ID,
        loading: "Saving note…",
        success: (result) => result.message,
      });
      return attempt;
    },
    IDLE,
  );
  const [handled, setHandled] = useState(feedback);
  if (feedback !== handled) {
    setHandled(feedback);
    if (feedback.status === "success") {
      setOpen(false);
      setDraft("");
      onAdded();
    }
  }
  const showError = feedback.status === "error" && !pending && handled === feedback;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setDraft("");
      }}
    >
      <PopoverTrigger
        render={<Button type="button" variant="outline" className="wgi-sheet-foot-command" />}
        onClick={(event) => {
          setKeyed(event.detail === 0);
        }}
      >
        Add a note
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        motion={keyed ? "none" : "wgi"}
        className="wgi-note-popover"
        positionerClassName="wgi-note-positioner"
      >
        <form action={formAction} className="flex flex-col gap-3 p-4">
          <PopoverTitle>Add a note</PopoverTitle>
          <input type="hidden" name="requestId" value={requestId} />
          <Textarea
            name="note"
            rows={3}
            required
            maxLength={2000}
            value={draft}
            readOnly={pending}
            aria-label="Note"
            aria-invalid={showError || undefined}
            aria-describedby={showError ? "wgi-note-guidance wgi-note-error" : "wgi-note-guidance"}
            placeholder="What should the next staff member know?"
            data-ui-redact="staff-note"
            onChange={(event) => {
              setDraft(event.target.value);
            }}
          />
          <p id="wgi-note-guidance" className="wgi-note-guidance">
            Keep medical details in the clinical record.
          </p>
          {showError ? (
            <p id="wgi-note-error" role="alert" className="wgi-note-error">
              {feedback.message}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                setDraft("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending || draft.trim() === ""}>
              {pending ? "Saving…" : "Save note"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
