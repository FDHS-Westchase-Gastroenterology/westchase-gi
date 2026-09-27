import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  closeRequest,
  confirmBookingHandoff,
  recordContactAttempt,
  recordContactAndClose,
} from "@/app/admin/(portal)/requests/workflow-actions";
import { SETTLED_TOAST } from "@/app/admin/(portal)/toast-follow";

import type { HomeLine } from "./home-line";
import { savedMessage } from "./record-card-model";
import type { CardCommand, CardFailure } from "./record-card-model";
import { failureOf, followSave, saveCardCommand } from "./record-card-save";

/* The commit: which server action the draft means, the feedback line it
   earns, and the three ways a save can fail. The save is one promise the
   toast follows (ui/toaster.tsx on Sonner, mounted in the portal layout so
   the result outlives this card): "Saving…" while the action runs, the
   saved line once the server confirmed it, the failure otherwise. An
   uncertain failure keeps its toast open with Try again, which re-runs the
   same attempt under the same idempotency key and updates the same toast,
   mirroring the request detail panel; closing that toast instead is the
   same choice as closing the card: the lock lifts and the next Save is a
   new attempt, which the version check keeps honest. Optimistic
   concurrency rides every attempt. */
const SAVE_TOAST_TEST_ID = "home-save-toast";

export function useRecordCommit(line: Readonly<HomeLine>, onSaved: () => void) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState<CardFailure | null>(null);
  const keyRef = useRef<string | null>(null);
  const lastRun = useRef<(() => void) | null>(null);

  function common() {
    keyRef.current ??= crypto.randomUUID();
    return {
      requestId: line.id,
      expectedVersion: line.version,
      idempotencyKey: keyRef.current,
    };
  }

  function save(command: Readonly<CardCommand>) {
    const attempt = () => {
      if (pending) return;
      setFailure(null);
      const input = common();
      const outcome = followSave(async () =>
        saveCardCommand(command, input, {
          recordContactAttempt,
          recordContactAndClose,
          closeRequest,
          confirmBookingHandoff,
        }),
      );

      /* One toast per attempt, keyed by the attempt's identity: Try again
         updates it in place instead of stacking a second. Sonner merges an
         update over the toast it replaces, so the open-ended state an
         uncertain failure set (no timeout, a close button, Try again) is
         reset by name when the retry starts and when it lands. */
      toast.promise(outcome, {
        id: `${SAVE_TOAST_TEST_ID}:${input.idempotencyKey}`,
        testId: SAVE_TOAST_TEST_ID,
        ...SETTLED_TOAST,
        loading: "Saving…",
        success: (result) => ({
          message: savedMessage(command, line.name, result.callAgainAt),
          ...SETTLED_TOAST,
        }),
        error: (cause: unknown) => {
          const next = failureOf(cause);
          if (!next.uncertain) return { message: next.message, ...SETTLED_TOAST };
          return {
            message: next.message,
            duration: Number.POSITIVE_INFINITY,
            closeButton: true,
            action: {
              label: "Try again",
              onClick: (event) => {
                /* Sonner dismisses a toast on its action press; this one
                   stays, and the retry updates it. */
                event.preventDefault();
                lastRun.current?.();
              },
            },
            onDismiss: () => {
              keyRef.current = null;
              setFailure(null);
            },
          };
        },
      });

      startTransition(async () => {
        try {
          await outcome;
        } catch (cause) {
          const next = failureOf(cause);
          if (!next.uncertain) keyRef.current = null;
          setFailure(next);
          if (next.refresh) router.refresh();
          return;
        }
        keyRef.current = null;
        onSaved();
        router.refresh();
      });
    };
    lastRun.current = attempt;
    attempt();
  }

  return {
    pending,
    failure,
    clearFailure: () => {
      setFailure(null);
    },
    save,
  };
}
