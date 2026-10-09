import { z } from "zod";

import type { RequestLocation, RequestTime } from "@/lib/portal/contracts";
import type { ClosureReason, HistoryEntry, RequestState } from "@/lib/portal/workflow/contracts";

/**
 * One request, whole, for a read-only surface. Durable values only: ISO
 * timestamps and enum codes; the UI formats them. Actor emails inside
 * `history` resolve to display names through `actorNames`.
 */
export interface FullRecord {
  id: string;
  /** Optimistic-concurrency token as of this read. */
  version: number;
  /** Durable state; the UI maps it with `presentationStatus`. */
  state: RequestState;

  // Contact
  name: string;
  phone: string;
  email: string | null;

  // Preferences
  location: RequestLocation;
  preferredTime: RequestTime;

  // The patient's own words, as submitted
  message: string | null;

  // Receipt: when, in which form language, from which page.
  // Origin (website or staff) is the `created` entry in `history`.
  createdAt: string;
  locale: string;
  sourcePath: string;

  // Where it stands: facts, no actions. Same meanings as RequestWorkSurface.
  callAgainAt: string | null;
  bookingConfirmedAt: string | null;
  appointmentAt: string | null;
  closedAt: string | null;
  closureReason: ClosureReason | null;
  legacyReviewRequired: boolean;

  /**
   * Everything recorded about the request, newest first, exactly as
   * RequestWorkSurface composes it. Staff notes stay inside as
   * `kind: "note"` entries; the UI decides whether to split them out.
   */
  history: readonly HistoryEntry[];

  /**
   * Staff email (trimmed, lowercased) to display name, for the actors that
   * appear in `history` and no one else. An actor absent here renders as
   * the email, the same rule `displayNameOrEmail` applies elsewhere.
   */
  actorNames: Readonly<Record<string, string>>;
}

export const requestIdSchema = z.uuid();
