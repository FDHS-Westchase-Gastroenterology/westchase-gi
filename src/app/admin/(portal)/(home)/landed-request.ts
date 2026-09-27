"use client";

import { useSyncExternalStore } from "react";

/* A6: the request just added from Home lands on the line washed amber, and
   the wash lasts as long as the toast that names it (created-toast.ts). The
   add sheet and the list are siblings with no shared parent state, and the
   toast outlives the sheet, so the landing is a tiny module store: the sheet
   marks the id when the server confirms the request, the toast clears it as
   it leaves, and the row reads it. `leaving` keeps the attribute on the row
   for its exit beat (home.css "Landed row") so the wash exhales on the exit
   curve rather than the settle's. */

export type LandedPhase = "on" | "leaving";

interface Landed {
  readonly id: string;
  readonly phase: LandedPhase;
}

let landed: Landed | null = null;
const listeners = new Set<() => void>();

function publish(next: Landed | null) {
  landed = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The server confirmed this request; its row lands washed. */
export function markLanded(id: string): void {
  publish({ id, phase: "on" });
}

/** The toast that named this request left; its wash exhales. A later add
    already owns the landing, so an older toast leaving does nothing. */
export function clearLanded(id: string): void {
  if (landed?.id !== id || landed.phase === "leaving") return;
  publish({ id, phase: "leaving" });
}

/** The landing, if any, for the list to paint. Null through the server
    render and hydration: nothing has landed before the page is live. */
export function useLanded(): Landed | null {
  return useSyncExternalStore(
    subscribe,
    () => landed,
    () => null,
  );
}
