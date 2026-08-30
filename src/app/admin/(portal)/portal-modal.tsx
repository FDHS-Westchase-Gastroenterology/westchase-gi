"use client";

import type { ReactNode, RefObject } from "react";
import { useEffect, useRef } from "react";

/* The portal's one modal primitive. Every dialog in the staff portal opens
 * through the same native <dialog> and the same motion tokens (--pm-spring in,
 * --pm-exit out), so a modal learned once is learned everywhere. The spring
 * and the exit live entirely in CSS on .portal-confirm-dialog — this component
 * only owns the React-to-dialog plumbing: imperative showModal/close, Escape
 * as a cancel that the owner can veto, and focus returning to the invoker,
 * which the platform does for free.
 *
 * A dialog may also name the control it came from. A modal that answers the
 * whole sheet stays centred, but one that answers a single control should
 * grow out of it, so `originRef` publishes that control's centre as
 * --pm-origin-x/y and the stylesheet spends the same spring around that
 * point instead of the dialog's middle.
 */
export function PortalModal({
  open,
  onClose,
  labelledBy,
  testId,
  className,
  originRef,
  children,
}: Readonly<{
  open: boolean;
  /** Called for every close path: Escape, the close button, a finished job. */
  onClose: () => void;
  labelledBy: string;
  testId?: string;
  className: string;
  /** The control this dialog grows from. Omitted, the dialog stays centred. */
  originRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}>) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }
    if (dialog.open) return;
    dialog.showModal();

    /* Publish the trigger's centre in the dialog's own coordinates. The point
       is usually outside the dialog's box — that is the whole trick: a
       transform origin beyond an edge turns a plain scale into travel from
       that direction, so the surface reads as having come from the control
       rather than from nowhere. Measured once per open, now that showModal
       has given the dialog a box.

       A trigger with no box on screen — detached, or inside a parent that
       has since closed — has no centre to grow from, and its empty rect
       would otherwise read as the dialog's own top-left corner. Those cases
       fall back to centre and behave like every other portal modal. */
    dialog.style.removeProperty("--pm-origin-x");
    dialog.style.removeProperty("--pm-origin-y");

    const trigger = originRef?.current ?? null;
    const from = trigger?.getBoundingClientRect();
    if (from === undefined || (from.width === 0 && from.height === 0)) return;

    /* Measure against the dialog's centre, not its top-left. By now the
       entrance's starting style has it at 0.92, and getBoundingClientRect
       reports that scaled box — but the origin was just cleared to the
       default centre, so the centre is the one point the scale leaves
       exactly where layout put it. offsetWidth/offsetHeight are untransformed,
       which turns that fixed centre back into a true top-left. Measuring the
       scaled edges instead drifts the origin further the further the trigger
       sits from the dialog. */
    const box = dialog.getBoundingClientRect();
    const x = from.left + from.width / 2 - (box.left + box.width / 2) + dialog.offsetWidth / 2;
    const y = from.top + from.height / 2 - (box.top + box.height / 2) + dialog.offsetHeight / 2;
    dialog.style.setProperty("--pm-origin-x", `${x}px`);
    dialog.style.setProperty("--pm-origin-y", `${y}px`);
  }, [open, originRef]);

  return (
    <dialog
      ref={ref}
      aria-modal="true"
      aria-labelledby={labelledBy}
      data-testid={testId}
      className={className}
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        onClose();
      }}
      onClose={(event) => {
        if (event.target !== event.currentTarget) return;
        onClose();
      }}
    >
      {children}
    </dialog>
  );
}
