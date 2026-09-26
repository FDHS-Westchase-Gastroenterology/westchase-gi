/* Follow-up standing: where a Call again row sits against its call-again
   date. The server derives one value per line from the same date check that
   stamps Overdue, and the Status filter splits Call again into these four
   so the desk can ask for the calls due now without the ones parked on a
   later date. */
export const FOLLOW_UP_VALUES = ["overdue", "due_today", "needs_date", "upcoming"] as const;
export type FollowUpValue = (typeof FOLLOW_UP_VALUES)[number];

export const FOLLOW_UP_WORDS = {
  overdue: "Overdue",
  due_today: "Due today",
  needs_date: "Needs a date",
  upcoming: "Upcoming",
} as const satisfies Record<FollowUpValue, string>;
