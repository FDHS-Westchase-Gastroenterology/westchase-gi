"use server";

import type { RequestHistoryView } from "@/app/admin/(portal)/requests/[id]/request-history-list";
import type { RequestNoteView } from "@/app/admin/(portal)/requests/[id]/request-notes";
import {
  requestLifecycleSummary,
  requestRecordViews,
} from "@/app/admin/(portal)/requests/[id]/request-record";
import type { RequestTruth } from "@/app/admin/(portal)/requests/[id]/workflow-panel-model";
import { fetchRequestDetail } from "@/app/admin/(portal)/requests/queue";
import type { RequestDetailRow } from "@/app/admin/(portal)/requests/queue";
import { requireRole } from "@/lib/portal/auth";
import { serviceClient } from "@/lib/portal/server";
import { fetchStaffNameMap } from "@/lib/portal/staff-identity";
import { fetchRequestWorkSurface } from "@/lib/portal/workflow/reads";

/* The read behind Home's full-record sheet. The sheet opens on a line the
   list already has — name, status, phone, preference — and asks for the rest
   of the record here, so opening a record costs one round trip instead of a
   navigation. Everything it returns is plain serializable data: the staff
   name map is server-only and a Map does not cross the boundary, so the
   shaping happens here (requests/[id]/request-record.ts) and the sheet only
   renders. */

export interface FullRecord {
  readonly row: RequestDetailRow;
  /** What the workflow panel commands against: state, version, undo window. */
  readonly truth: RequestTruth;
  /** How the request ended, in one sentence, or null while it is still open. */
  readonly lifecycle: string | null;
  readonly notes: readonly RequestNoteView[];
  readonly history: readonly RequestHistoryView[];
  readonly staffCreated: boolean;
}

/**
 * One request's whole record for the sheet. Null when the request is gone —
 * the sheet says so rather than showing an empty record. A failed read
 * throws, the same way the request page's read does.
 */
export async function readFullRecord(requestId: string): Promise<FullRecord | null> {
  await requireRole("staff", { unauthenticated: "throw" });
  const db = serviceClient();
  const [row, surface, nameMap] = await Promise.all([
    fetchRequestDetail(db, requestId),
    fetchRequestWorkSurface(db, requestId),
    fetchStaffNameMap(db),
  ]);
  if (row === null || surface === null) return null;
  const { notes, history, staffCreated } = requestRecordViews(surface.history, nameMap);
  return {
    row,
    truth: {
      state: surface.state,
      version: surface.version,
      legacyReviewRequired: surface.legacyReviewRequired,
      callAgainAt: surface.callAgainAt,
      undo: surface.undo,
    },
    lifecycle: requestLifecycleSummary(surface),
    notes,
    history,
    staffCreated,
  };
}
