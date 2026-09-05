import "server-only";

import { previousBusinessMorningBoundary } from "./business-time";
import type { RequestStatus } from "./workflow/contracts";

export interface QueueAttentionRow {
  id: string;
  status: RequestStatus;
  created_at: string;
  follow_up_at: string | null;
}

/**
 * Attention buckets in queue order: unworked rows, call-agains that are due,
 * contacted rows that went silent with no call-again day, call-agains still in
 * the future, then the scheduled and closed tails.
 */
export const ATTENTION_BUCKETS = [
  "new",
  "follow_up",
  "stale",
  "upcoming",
  "scheduled",
  "closed",
] as const;
export type AttentionBucket = (typeof ATTENTION_BUCKETS)[number];

export type AttentiveRow<T extends QueueAttentionRow> = T & {
  bucket: AttentionBucket;
  lastActivityAt: string | null; // Newest staff-work audit time for the row, if any
};

const PRACTICE_TZ = "America/New_York";

const NY_DAY = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "short",
  timeZone: PRACTICE_TZ,
});

function practiceDayNumber(date: Date): number {
  return Math.round(Date.parse(`${NY_DAY.format(date)}T00:00:00Z`) / 86_400_000);
}

function contactedFollowUp(row: Readonly<QueueAttentionRow>): string | null {
  return row.status === "contacted" ? row.follow_up_at : null;
}

function assignBucket(
  row: Readonly<QueueAttentionRow>,
  lastActivityAt: string | null,
  boundary: Date,
  now: Date,
): AttentionBucket {
  if (row.status !== "contacted") {
    return row.status;
  }
  const followUp = contactedFollowUp(row);
  if (followUp !== null) {
    return practiceDayNumber(new Date(followUp)) <= practiceDayNumber(now)
      ? "follow_up"
      : "upcoming";
  }
  const activityMs = Date.parse(lastActivityAt ?? row.created_at);
  return activityMs < boundary.getTime() ? "stale" : "upcoming";
}

function compareWithinBucket(
  a: Readonly<AttentiveRow<QueueAttentionRow>>,
  b: Readonly<AttentiveRow<QueueAttentionRow>>,
): number {
  switch (a.bucket) {
    case "new":
      return Date.parse(a.created_at) - Date.parse(b.created_at);
    case "follow_up":
      return Date.parse(a.follow_up_at!) - Date.parse(b.follow_up_at!);
    case "stale": {
      const aActivity = Date.parse(a.lastActivityAt ?? a.created_at);
      const bActivity = Date.parse(b.lastActivityAt ?? b.created_at);
      return aActivity - bActivity;
    }
    case "upcoming": {
      const aFollow = contactedFollowUp(a);
      const bFollow = contactedFollowUp(b);
      if (aFollow === null && bFollow === null) {
        return Date.parse(b.created_at) - Date.parse(a.created_at);
      }
      if (aFollow === null) return 1;
      if (bFollow === null) return -1;
      const byFollow = Date.parse(aFollow) - Date.parse(bFollow);
      if (byFollow !== 0) return byFollow;
      return Date.parse(b.created_at) - Date.parse(a.created_at);
    }
    case "scheduled":
    case "closed":
      return Date.parse(b.created_at) - Date.parse(a.created_at);
    default:
      return 0;
  }
}

export function orderQueueRows<T extends QueueAttentionRow>(
  rows: readonly T[],
  activityById: ReadonlyMap<string, string>,
  now: Date = new Date(),
): AttentiveRow<T>[] {
  const boundary = previousBusinessMorningBoundary(now);
  const attentive: AttentiveRow<T>[] = rows.map((row) => {
    const lastActivityAt = activityById.get(row.id) ?? null;
    return {
      ...row,
      bucket: assignBucket(row, lastActivityAt, boundary, now),
      lastActivityAt,
    };
  });

  attentive.sort((a, b) => {
    const byBucket = ATTENTION_BUCKETS.indexOf(a.bucket) - ATTENTION_BUCKETS.indexOf(b.bucket);
    if (byBucket !== 0) return byBucket;
    return compareWithinBucket(a, b);
  });

  return attentive;
}
