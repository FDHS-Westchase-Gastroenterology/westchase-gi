"use client";

import { useRouter } from "next/navigation";
import { useEffect, useImperativeHandle, useRef, useState } from "react";
import type { MouseEvent, Ref, RefObject } from "react";

/** Lets a host route Escape through the form's draft protection. */
export interface StaffRequestFormHandle {
  requestDismiss: () => void;
}

export interface LeaveGuard {
  /** True while the sheet asks whether to discard the draft. */
  readonly asking: boolean;
  readonly cancelRef: RefObject<HTMLAnchorElement | null>;
  readonly requestLeave: (event: MouseEvent<HTMLAnchorElement>) => void;
  readonly keepEditing: () => void;
  readonly discard: () => void;
}

/** A typed draft is never lost to Cancel or Escape without a question; an
    untouched sheet just leaves. */
export function useLeaveGuard({
  dirty,
  pending,
  dismiss,
  returnHref,
  onDiscard,
  handleRef,
}: Readonly<{
  dirty: boolean;
  pending: boolean;
  /** Present when a dialog hosts the form: leaving closes it instead of navigating. */
  dismiss: (() => void) | null;
  returnHref: string;
  onDiscard: () => void;
  handleRef: Ref<StaffRequestFormHandle> | undefined;
}>): LeaveGuard {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const cancelRef = useRef<HTMLAnchorElement>(null);
  const askedFromRef = useRef<HTMLElement | null>(null);
  const returningRef = useRef(false);

  /* Keep editing hands focus back to where the question was asked, once
     the footer has replaced the prompt; to Cancel when that control is
     gone. */
  useEffect(() => {
    if (asking || !returningRef.current) return;
    returningRef.current = false;
    const from = askedFromRef.current;
    askedFromRef.current = null;
    (from?.isConnected === true ? from : cancelRef.current)?.focus();
  }, [asking]);

  function ask() {
    askedFromRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setAsking(true);
  }

  function keepEditing() {
    returningRef.current = true;
    setAsking(false);
  }

  function leave() {
    if (dismiss === null) {
      router.push(returnHref);
      return;
    }
    dismiss();
  }

  useImperativeHandle(
    handleRef,
    () => ({
      requestDismiss() {
        if (pending) return;
        if (asking) {
          keepEditing();
          return;
        }
        if (dirty) {
          ask();
          return;
        }
        dismiss?.();
      },
    }),
    [asking, dirty, dismiss, pending],
  );

  return {
    asking,
    cancelRef,
    requestLeave(event) {
      if (pending) {
        event.preventDefault();
        return;
      }
      if (!dirty) {
        if (dismiss !== null) {
          event.preventDefault();
          dismiss();
        }
        return;
      }
      event.preventDefault();
      ask();
    },
    keepEditing,
    discard() {
      onDiscard();
      leave();
    },
  };
}
