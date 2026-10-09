"use client";

import type { MouseEvent } from "react";
import { toast } from "sonner";

import { Check } from "@/components/icons";

/*
 * The undo toast (issue #351; Figma Ypf9ohpRcGWF5C9T9bSvWW, page 02, B5): a
 * change that landed, said once with an Undo beside it. The Schedule's day
 * view raises it after a booking or a Check in; #352–#355 raise it for their
 * own changes. It is the portal toaster's toast (ui/toaster.tsx on Sonner,
 * mounted once in the layout), so it keeps that recipe's paper, type and
 * registry motion, and its section is announced politely. Undo is Sonner's
 * action button: a real button in the tab order, which the toaster's Alt+T
 * hotkey reaches from anywhere.
 *
 * Custom behavior and styling, and why:
 * - A mint disc with a check replaces the success icon: the frame's mark of
 *   a change that landed, at the size of the two lines it sits beside.
 * - The headline is bold and the detail (when and where) sits under it in
 *   the muted ink, so the change reads first.
 * - Undo is a pill on the toast's paper rather than the filled action
 *   Sonner draws: the toast is a confirmation, and Undo is the way back.
 * - The toast offers Undo for 8 seconds, twice the toaster's plain result,
 *   because it carries two lines and a decision; pointing at the toaster
 *   holds it. The server keeps a change undoable for 15 minutes, but a
 *   toast held that long stacks over the schedule, so the toast leaves well
 *   before the server's window closes.
 * - Sonner's close button closes it early, in the corner Sonner draws it,
 *   wearing the Undo pill's line, paper and pressed state.
 * - Undo turns the same toast into "Undoing…" while it is sent, then into
 *   the result: what the caller's undo says, or the refusal in plain words.
 *   Either way the caller's `onSettled` runs, so the surface re-reads what
 *   is now true, and the result settles like any other toast.
 */

/** How long the toast offers Undo before it leaves on its own. */
const UNDO_VISIBLE_MS = 8_000;

export type UndoResult =
  | { readonly ok: true; readonly message: string }
  | { readonly ok: false; readonly message: string };

export interface UndoToastInput {
  /** "James Okonkwo is booked". */
  readonly headline: string;
  /** "Wed, Sep 16 at 2:00 PM · Dr. John Chang, Tampa", or null. */
  readonly detail: string | null;
  /** Sends the undo once. The caller mints its idempotency key when it builds this. */
  readonly undo: () => Promise<UndoResult>;
  /** Runs after Undo is answered, landed or refused. */
  readonly onSettled: () => void;
}

const DISC =
  "grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-mint-500)] text-white";

const CLASS_NAMES = {
  toast: "gap-3! py-3! pr-3! pl-3.5!",
  icon: "m-0! size-7! justify-center!",
  title: "font-bold! text-[var(--color-ink)]! leading-snug!",
  description: "text-[var(--color-muted-ink)]! leading-snug!",
  actionButton: [
    "ml-auto! h-8! rounded-full! border! border-[var(--color-line-2)]! bg-white! px-3.5!",
    "text-[0.8125rem]! font-bold! text-[var(--color-ink)]!",
    "transition-[background-color,scale]! duration-[var(--motion-micro-duration)]! ease-[var(--motion-exit)]!",
    "hover:bg-[var(--color-mint-50)]! active:scale-[0.98]!",
    "focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-[var(--color-teal-ink)]!",
  ].join(" "),
  closeButton: [
    "border-[var(--color-line-2)]! bg-white! text-[var(--color-ink)]!",
    "transition-[background-color,scale]! duration-[var(--motion-micro-duration)]! ease-[var(--motion-exit)]!",
    "hover:bg-[var(--color-mint-50)]! active:scale-[0.98]!",
    "focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-[var(--color-teal-ink)]!",
  ].join(" "),
};

/** What an answered toast resets, by name: Sonner merges an update over the toast it replaces. */
const SETTLED = {
  duration: undefined,
  closeButton: undefined,
  action: undefined,
  description: undefined,
  icon: undefined,
  classNames: undefined,
} as const;

/** Raise the undo toast for a change that landed; returns its toast id. */
export function showUndoToast(input: Readonly<UndoToastInput>): string | number {
  let sent = false;
  const id = toast.success(input.headline, {
    description: input.detail ?? undefined,
    icon: (
      <span className={DISC} aria-hidden="true">
        <Check width={16} height={16} />
      </span>
    ),
    duration: UNDO_VISIBLE_MS,
    closeButton: true,
    classNames: CLASS_NAMES,
    action: {
      label: "Undo",
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (sent) return;
        sent = true;
        toast.loading("Undoing…", { ...SETTLED, id });
        void answer(input, id);
      },
    },
  });
  return id;
}

async function answer(input: Readonly<UndoToastInput>, id: string | number) {
  try {
    const result = await input.undo();
    if (result.ok) toast.success(result.message, { ...SETTLED, id });
    else toast.error(result.message, { ...SETTLED, id });
  } catch {
    toast.error("The undo couldn't be sent. Check the schedule and try again.", {
      ...SETTLED,
      id,
    });
  } finally {
    input.onSettled();
  }
}
