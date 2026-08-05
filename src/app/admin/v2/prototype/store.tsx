"use client";

// The prototype's imperative shell (spec §9.1): it owns clock, actor, and
// persistence while appointment-request-machine.ts owns every transition
// decision. State lives in memory plus sessionStorage — the prototype never
// reads or writes the real queue. Commands carry the version the staff
// member viewed, so a colleague's concurrent change surfaces as a truthful
// stale-version conflict rather than a silent overwrite (§10.1).

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  applyUndo,
  decideCommand,
  undoEligibility,
  UNDO_WINDOW_MS,
  type RequestCommand,
  type RequestSnapshot,
} from "@/lib/portal/appointment-request-machine";
import { buildSeed, SEED_VERSION, SIMULATED_COLLEAGUE } from "./fixtures";
import { practiceToday } from "./format";
import type { HistoryEntry, PrototypeRequest, StoredTransition } from "./types";

const STORAGE_KEY = "wgi-v2-daysheet-prototype";

export type QueueState = {
  requests: PrototypeRequest[];
  viewer: string;
};

export type CommandResult =
  | {
      ok: true;
      snapshot: RequestSnapshot;
      /** Version whose transition is undoable right now, if any. */
      undoableVersion: number | null;
    }
  | {
      ok: false;
      error: "conflict";
      /** The action that got there first — for the truthful explanation. */
      latest: HistoryEntry | null;
      snapshot: RequestSnapshot;
    }
  | { ok: false; error: "rejected"; message: string };

export type UndoAvailability =
  | { available: true; transition: StoredTransition; untilIso: string }
  | { available: false };

export type UndoResult =
  | { ok: true; restoredState: RequestSnapshot["state"] }
  | { ok: false; message: string };

function nowClock() {
  const now = new Date();
  return { iso: now.toISOString(), day: practiceToday(now) };
}

class PrototypeStore {
  private state: QueueState;
  private listeners = new Set<() => void>();
  private serial = 0;

  constructor(viewer: string) {
    this.state = { requests: this.load(), viewer };
  }

  private load(): PrototypeRequest[] {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          seedVersion: number;
          requests: PrototypeRequest[];
        };
        if (parsed.seedVersion === SEED_VERSION && Array.isArray(parsed.requests)) {
          return parsed.requests;
        }
      }
    } catch {
      // A broken saved copy is discarded; the seed below is the recovery.
    }
    return buildSeed();
  }

  private persist(): void {
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ seedVersion: SEED_VERSION, requests: this.state.requests }),
      );
    } catch {
      // Storage may be full or blocked; the in-memory queue still works.
    }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = (): QueueState => this.state;

  private emit(nextRequests: PrototypeRequest[]): void {
    this.state = { ...this.state, requests: nextRequests };
    this.persist();
    for (const listener of this.listeners) listener();
  }

  private entryId(requestId: string): string {
    return `${requestId}-live-${++this.serial}-${Date.now().toString(36)}`;
  }

  find(id: string): PrototypeRequest | null {
    return this.state.requests.find((request) => request.id === id) ?? null;
  }

  private replace(next: PrototypeRequest): void {
    this.emit(
      this.state.requests.map((request) =>
        request.id === next.id ? next : request,
      ),
    );
  }

  /**
   * Execute one staff lifecycle command as one transaction: the decision,
   * its history entry, an optional rider note, and the transition record
   * commit together or not at all.
   */
  command(
    requestId: string,
    expectedVersion: number,
    command: RequestCommand,
    note: string | null = null,
    actor: string = this.state.viewer,
  ): CommandResult {
    const request = this.find(requestId);
    if (!request) {
      return { ok: false, error: "rejected", message: "This request no longer exists." };
    }

    const clock = nowClock();
    const decision = decideCommand(request.snapshot, command, expectedVersion, clock);

    if (!decision.ok) {
      if (decision.error === "stale_version") {
        const latest =
          [...request.entries]
            .reverse()
            .find((entry) => entry.body.t !== "notification" && entry.body.t !== "received") ??
          null;
        return { ok: false, error: "conflict", latest, snapshot: request.snapshot };
      }
      return {
        ok: false,
        error: "rejected",
        message:
          decision.error === "illegal_transition"
            ? "That action isn't available from this request's current status."
            : "Something about that didn't check out. Nothing was recorded.",
      };
    }

    const id = this.entryId(requestId);
    const body: HistoryEntry["body"] =
      command.kind === "record_contact_attempt"
        ? {
            t: "attempt",
            outcome: command.outcome,
            callAgainDay: command.callAgainDay,
            transitionVersion: decision.fact.resultingVersion,
          }
        : command.kind === "confirm_booking_handoff"
          ? { t: "booked", transitionVersion: decision.fact.resultingVersion }
          : command.kind === "close_request"
            ? {
                t: "closed",
                reason: command.reason,
                transitionVersion: decision.fact.resultingVersion,
              }
            : command.kind === "reopen_request"
              ? {
                  t: "reopened",
                  from: request.snapshot.state,
                  transitionVersion: decision.fact.resultingVersion,
                }
              : {
                  t: "classified",
                  result:
                    command.classification.kind === "booked"
                      ? "booked"
                      : command.classification.reason,
                  transitionVersion: decision.fact.resultingVersion,
                };

    const entries: HistoryEntry[] = [
      ...request.entries,
      { id, at: clock.iso, actor, struck: false, body },
    ];
    if (note) {
      entries.push({
        id: this.entryId(requestId),
        at: new Date(Date.parse(clock.iso) + 1_000).toISOString(),
        actor,
        struck: false,
        body: { t: "note", text: note },
      });
    }

    this.replace({
      ...request,
      snapshot: decision.next,
      entries,
      transitions: [
        ...request.transitions,
        {
          ...decision.fact,
          actor,
          priorSnapshot: request.snapshot,
          entryId: id,
        },
      ],
    });

    return {
      ok: true,
      snapshot: decision.next,
      undoableVersion:
        command.kind === "classify_legacy_closure"
          ? null
          : decision.fact.resultingVersion,
    };
  }

  /** Current Undo availability for a request, derived — never cached. */
  undoAvailability(requestId: string): UndoAvailability {
    const request = this.find(requestId);
    if (!request || request.transitions.length === 0) return { available: false };
    const latest = request.transitions[request.transitions.length - 1];
    const check = undoEligibility(
      latest,
      latest.resultingVersion,
      request.snapshot.version,
      new Date().toISOString(),
    );
    if (!check.eligible) return { available: false };
    return {
      available: true,
      transition: latest,
      untilIso: new Date(Date.parse(latest.occurredAt) + UNDO_WINDOW_MS).toISOString(),
    };
  }

  /** Undo the latest transition: strike its entry, append compensation. */
  undo(requestId: string): UndoResult {
    const request = this.find(requestId);
    if (!request || request.transitions.length === 0) {
      return { ok: false, message: "There is nothing to undo on this request." };
    }
    const latest = request.transitions[request.transitions.length - 1];
    const clock = nowClock();
    const check = undoEligibility(
      latest,
      latest.resultingVersion,
      request.snapshot.version,
      clock.iso,
    );
    if (!check.eligible) {
      return {
        ok: false,
        message:
          check.reason === "window_closed"
            ? "The 15-minute undo window has closed. Use Reopen to keep working this request."
            : "The request changed after that save, so it can't be undone. The current status is shown.",
      };
    }

    const undone = applyUndo(request.snapshot, latest, latest.priorSnapshot, clock);
    this.replace({
      ...request,
      snapshot: undone.next,
      entries: [
        ...request.entries.map((entry) =>
          entry.id === latest.entryId ? { ...entry, struck: true } : entry,
        ),
        {
          id: this.entryId(requestId),
          at: clock.iso,
          actor: this.state.viewer,
          struck: false,
          body: {
            t: "undo",
            restored: latest.priorSnapshot.state,
            compensatedVersion: latest.resultingVersion,
          },
        },
      ],
      transitions: [
        ...request.transitions,
        {
          ...undone.fact,
          actor: this.state.viewer,
          priorSnapshot: request.snapshot,
          entryId: latest.entryId,
        },
      ],
    });

    return { ok: true, restoredState: latest.priorSnapshot.state };
  }

  /** Notes never move the machine and never stale an eligible Undo (§5.7). */
  addNote(requestId: string, text: string): { ok: boolean } {
    const request = this.find(requestId);
    const trimmed = text.trim();
    if (!request || trimmed.length === 0 || trimmed.length > 2000) {
      return { ok: false };
    }
    this.replace({
      ...request,
      entries: [
        ...request.entries,
        {
          id: this.entryId(requestId),
          at: new Date().toISOString(),
          actor: this.state.viewer,
          struck: false,
          body: { t: "note", text: trimmed },
        },
      ],
    });
    return { ok: true };
  }

  /**
   * Prototype-only: a synthetic colleague acts on this request so the next
   * save from an already-open page hits the stale-version guard honestly.
   */
  simulateColleague(requestId: string): boolean {
    const request = this.find(requestId);
    if (!request || request.snapshot.legacyReviewRequired) return false;

    const today = practiceToday(new Date());
    const tomorrow = new Date(Date.parse(`${today}T12:00:00Z`) + 86_400_000)
      .toISOString()
      .slice(0, 10);

    const command: RequestCommand =
      request.snapshot.state === "NEW" || request.snapshot.state === "CONTACTED"
        ? {
            kind: "record_contact_attempt",
            outcome: "voicemail",
            callAgainDay: tomorrow,
          }
        : { kind: "reopen_request" };

    const result = this.command(
      requestId,
      request.snapshot.version,
      command,
      null,
      SIMULATED_COLLEAGUE,
    );
    return result.ok;
  }

  /** Throw away every prototype interaction and reseed the demo queue. */
  reset(): void {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignored: the reseed below still replaces in-memory state.
    }
    this.emit(buildSeed());
  }
}

const StoreContext = createContext<PrototypeStore | null>(null);

const subscribeNever = () => () => {};

/** False on the server and the hydration render, true after. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

// One store per browser tab, matching sessionStorage's own scope. Built
// lazily after hydration so the constructor's storage read is browser-only.
let tabStore: PrototypeStore | null = null;

function getTabStore(viewer: string): PrototypeStore {
  if (tabStore === null) tabStore = new PrototypeStore(viewer);
  return tabStore;
}

export function PrototypeProvider({
  viewer,
  fallback,
  children,
}: {
  viewer: string;
  fallback: ReactNode;
  children: ReactNode;
}) {
  const hydrated = useHydrated();
  if (!hydrated) return <>{fallback}</>;
  return (
    <StoreContext.Provider value={getTabStore(viewer)}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStoreApi(): PrototypeStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStoreApi requires PrototypeProvider");
  return store;
}

export function useQueue(): QueueState {
  const store = useStoreApi();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
