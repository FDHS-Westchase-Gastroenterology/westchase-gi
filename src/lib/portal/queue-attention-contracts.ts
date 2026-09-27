/** Stable request-worklist groups shared by the server and its consumers. */
export const ATTENTION_BUCKETS = [
  "new",
  "follow_up",
  "stale",
  "upcoming",
  "scheduled",
  "closed",
] as const;
export type AttentionBucket = (typeof ATTENTION_BUCKETS)[number];
