"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";

import type { ScheduleView } from "./schedule-toolbar";

/* The Schedule's moves between pages: the Day · Week · Month switch and the
   single-key shortcuts (schedule-shortcuts.tsx). Each view is its own server
   render, so a move waits on the server, and while it waits the page answers
   at once: the switch shows the chosen view, and the view on screen reads as
   on its way out (HIG Loading: show something as soon as possible) until the
   next one replaces it in a single cut (HIG Motion: no motion on frequent
   interactions). Held in the Schedule's layout so it outlives the view that
   started the move. */

export interface ScheduleMove {
  /** The view being opened; null when the move stays in the same view (J, K, T). */
  readonly view: ScheduleView | null;
  /** Started from the keyboard: the switch jumps to its choice instead of sliding. */
  readonly instant: boolean;
}

interface ScheduleNavigationValue {
  readonly pending: ScheduleMove | null;
  readonly navigate: (href: string, move: ScheduleMove) => void;
}

const ScheduleNavigationContext = createContext<ScheduleNavigationValue | null>(null);

export function useScheduleNavigation(): ScheduleNavigationValue {
  const value = use(ScheduleNavigationContext);
  if (value === null)
    throw new Error("useScheduleNavigation must be used inside ScheduleNavigation");
  return value;
}

export function ScheduleNavigation({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [move, setMove] = useState<ScheduleMove | null>(null);
  const pending = isPending ? move : null;
  const value = useMemo<ScheduleNavigationValue>(
    () => ({
      pending,
      navigate(href, next) {
        setMove(next);
        startTransition(() => {
          router.push(href);
        });
      },
    }),
    [pending, router],
  );
  return <ScheduleNavigationContext value={value}>{children}</ScheduleNavigationContext>;
}
