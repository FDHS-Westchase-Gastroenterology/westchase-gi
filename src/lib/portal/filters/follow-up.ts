import type { MultiSelectFilterParam } from "./types";

// Only contacted requests have follow-up standing; the server derives it from the callback date.
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
