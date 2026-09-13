import type { MultiSelectFilterParam } from "./types";

/* Follow-up standing: where a Call again row sits against its call-again
   date. Every value belongs to a `contacted` row, so the dimension only ever
   narrows the Call again pile; on an empty bar, Overdue alone is the list of
   calls the desk is behind on. The server derives one value per line from
   the same date check that stamps Overdue. */
export const FOLLOW_UP_VALUES = ["overdue", "due_today", "upcoming", "needs_date"] as const;
export type FollowUpValue = (typeof FOLLOW_UP_VALUES)[number];

export const FOLLOW_UP_WORDS = {
  overdue: "Overdue",
  due_today: "Due today",
  upcoming: "Upcoming",
  needs_date: "Needs a date",
} as const satisfies Record<FollowUpValue, string>;

function isFollowUpValue(value: string): value is FollowUpValue {
  return FOLLOW_UP_VALUES.some((candidate) => candidate === value);
}

/** Multi-select over follow-up standing; comma-joined in one param. */
export const followUpFilter: MultiSelectFilterParam = {
  key: "followup",
  label: "Follow-up",
  type: "multi-select",
  anyLabel: "Any follow-up",
  options: FOLLOW_UP_VALUES.map((value) => ({ value, label: FOLLOW_UP_WORDS[value] })),
  encode: (value) => value.join(","),
  decode: (raw) => {
    const values = [...new Set(raw.split(",").filter(isFollowUpValue))];
    return values.length > 0 ? values : null;
  },
};
