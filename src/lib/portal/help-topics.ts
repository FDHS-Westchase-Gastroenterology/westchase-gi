/* The Help topics (issue #358, Figma U4): one list, read by the Help page and by every help
   button, so a topic says the same thing in both places. Each topic is written from the screens
   as built (#351–#357) and keeps to what a person needs to finish the task. A topic's id is its
   URL fragment on the Help page (`/admin/help#<id>`). Browser-safe. */

import type { StaffRole } from "./contracts";

export type HelpGroupId = "schedule" | "patients" | "settings";

export interface HelpGroup {
  readonly id: HelpGroupId;
  readonly label: string;
  /** The roles that see the group; a front desk account's settings pages are read-only. */
  readonly roles: readonly StaffRole[];
}

export const HELP_GROUPS: readonly HelpGroup[] = [
  { id: "schedule", label: "Schedule", roles: ["admin", "staff"] },
  { id: "patients", label: "Patients and requests", roles: ["admin", "staff"] },
  { id: "settings", label: "Practice settings", roles: ["admin"] },
];

/** A paragraph or step. `**…**` sets a run in bold; `{name}` is filled from the topic's values. */
export type HelpText = string;

/** One run of a paragraph, plain or bold. */
export interface HelpSegment {
  readonly text: string;
  readonly strong: boolean;
}

/** The non-interactive rendering a topic shows beside its answer. */
export type HelpSampleId =
  | "month-day"
  | "open-hour"
  | "visit"
  | "taken-time"
  | "patient-search"
  | "request-row"
  | "call-answers"
  | "hours-bar"
  | "roles"
  | "recipient";

export interface HelpTopic {
  readonly id: string;
  readonly group: HelpGroupId;
  readonly title: string;
  /** The answer, a paragraph each; or, when `steps` is set, numbered steps. */
  readonly body: readonly HelpText[];
  readonly steps?: true;
  readonly sample: HelpSampleId;
  /** "Show me on the schedule ›": the screen with the control in view. */
  readonly show: { readonly href: string; readonly label: string };
  /** Roles narrower than the group's: the Hours sheet is an admin's. */
  readonly roles?: readonly StaffRole[];
  /** What `{name}` reads where no screen supplies it (the Help page). */
  readonly values?: Readonly<Record<string, string>>;
}

const SHOW_SCHEDULE = "Show me on the schedule";

export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    id: "reading-the-day",
    group: "schedule",
    title: "Reading the day at a glance",
    body: [
      "Each day in the month says how many visits it still has open, and tints deeper as it books up. Past days say how many patients were seen.",
      "Choose a day to open it. The Day view sets each provider’s visits side by side, with open time between them.",
    ],
    sample: "month-day",
    show: { href: "/admin/schedule?view=month", label: SHOW_SCHEDULE },
  },
  {
    id: "booking-open-hour",
    group: "schedule",
    title: "Booking an open hour",
    body: [
      "Open time on the Day view is a dashed block. Choose it, search by name or phone, choose the patient and the visit type, then **Book**. **Change patient** starts the search again.",
      "The schedule offers only the hours each provider works and only times long enough for the visit type.",
    ],
    sample: "open-hour",
    show: { href: "/admin/schedule?view=day", label: SHOW_SCHEDULE },
  },
  {
    id: "moving-canceling",
    group: "schedule",
    title: "Moving or canceling an appointment",
    body: [
      "Drag a visit that hasn’t started to another time or provider. With the keyboard or on a touch screen, open the visit and choose **Reschedule**.",
      "To cancel, open the visit and choose **More**, then **Cancel appointment**. The card also checks a patient in, marks a no-show, and completes the visit.",
    ],
    sample: "visit",
    show: { href: "/admin/schedule?view=day", label: SHOW_SCHEDULE },
  },
  {
    id: "someone-else",
    group: "schedule",
    title: "When someone else takes the hour first",
    body: [
      "Two people can reach for the same time. The first booking wins and the second saves nothing: the card says the time was just taken, and you pick another.",
      "On Home’s card, a time lost this way is struck through beside the nearest one still open.",
    ],
    sample: "taken-time",
    show: { href: "/admin", label: "Show me on Home" },
  },
  {
    id: "changing-hours-one-day",
    group: "schedule",
    title: "Changing hours for one day",
    steps: true,
    body: [
      "Drag either end of a provider’s bar to change when they start or finish.",
      "Switch a provider off to close their day. Any booking the change leaves outside the hours is listed before you save.",
      "**This day only** changes {date}. **Every {weekday}** changes the weekly hours from this week on.",
    ],
    sample: "hours-bar",
    show: { href: "/admin/schedule?view=day", label: SHOW_SCHEDULE },
    roles: ["admin"],
    values: { date: "the day on screen", weekday: "Wednesday" },
  },
  {
    id: "finding-patient",
    group: "patients",
    title: "Finding a patient",
    body: [
      "On the Schedule, press **/** or choose Search patients, then type part of a name or a phone number. Choose a patient to open their record: their visits, their requests and their notes.",
      "Book from the record when they call to schedule.",
    ],
    sample: "patient-search",
    show: { href: "/admin/schedule", label: SHOW_SCHEDULE },
  },
  {
    id: "working-request",
    group: "patients",
    title: "Working a request from the website",
    body: [
      "A patient who asks for a visit on the website arrives on Home as **New**: no one has called yet. Open the row for its card and call the number on it.",
      "Choose what happened, then **Save**. When the patient agrees to a time, book it from the card: days in a mint circle have open times.",
    ],
    sample: "request-row",
    show: { href: "/admin", label: "Show me on Home" },
  },
  {
    id: "logging-calls",
    group: "patients",
    title: "Logging calls and notes",
    body: [
      "Each call is one answer on the card: **No answer**, **Contacted**, **Appointment scheduled** or **Close request**. Choose **Call again** and a day, and the request returns to the top of Home then.",
      "Notes are for what the next person needs to know. Keep medical details in the clinical record.",
    ],
    sample: "call-answers",
    show: { href: "/admin", label: "Show me on Home" },
  },
  {
    id: "provider-hours",
    group: "settings",
    title: "Provider hours and time off",
    body: [
      "Settings › Providers holds each provider’s weekly hours; the schedule offers only these hours for booking. **Edit hours** sets the whole week, from today or from a later date, and a change already planned shows under the week it replaces. A day marked **Office hours** keeps the office’s hours and changes when they do; untick it to set the provider’s own times.",
      "**Add time off** for a vacation. A provider marked **Not taking appointments** leaves booking until you switch it back, and **Retire** takes someone off the schedule for good, keeping their hours in case they return.",
      "No change cancels a booking. When one leaves an appointment outside the provider’s hours, the provider’s page shows how many **need a new time**; open it to go to each one’s day.",
    ],
    sample: "hours-bar",
    show: { href: "/admin/settings/providers", label: "Show me in Settings" },
  },
  {
    id: "inviting-staff",
    group: "settings",
    title: "Inviting staff and choosing roles",
    body: [
      "Settings › Staff access › **Invite**: enter their email, choose a role, then **Send invite**. Choose Front desk for anyone who calls patients and books; choose Admin only for people who change settings.",
      "If the email doesn’t arrive, **Copy setup link** and hand it over in person. **Deactivate** ends someone’s access at once.",
    ],
    sample: "roles",
    show: { href: "/admin/settings/staff", label: "Show me in Settings" },
  },
  {
    id: "request-emails",
    group: "settings",
    title: "Who gets request emails",
    body: [
      "Settings › Notifications lists the addresses that get an email when a new request arrives. Switch one off to pause it and on to resume it.",
      "Send a test email to check that it reaches everyone who is on. Every request is on Home whether or not the email arrives.",
    ],
    sample: "recipient",
    show: { href: "/admin/settings/notifications", label: "Show me in Settings" },
  },
];

export type HelpTopicId = (typeof HELP_TOPICS)[number]["id"];

/** Older links into Help that now land on a topic. */
export const HELP_TOPIC_ALIASES: ReadonlyMap<string, string> = new Map([
  ["appointment-workflow-guide", "working-request"],
]);

export function helpTopic(id: string): HelpTopic | null {
  return HELP_TOPICS.find((topic) => topic.id === id) ?? null;
}

export function helpGroup(id: HelpGroupId): HelpGroup {
  return HELP_GROUPS.find((group) => group.id === id) ?? HELP_GROUPS[0];
}

/** Whether `role` sees `topic` on the Help page. */
export function helpTopicVisible(topic: Readonly<HelpTopic>, role: StaffRole): boolean {
  return (topic.roles ?? helpGroup(topic.group).roles).includes(role);
}

/** `{name}` filled from `values`, then from the topic's own. */
export function fillHelpText(
  text: string,
  topic: Readonly<HelpTopic>,
  values?: Readonly<Record<string, string>>,
): string {
  return text.replaceAll(
    /\{(\w+)\}/g,
    (whole, name: string) => values?.[name] ?? topic.values?.[name] ?? whole,
  );
}

/** The topic's words as one string, for search. */
export function helpTopicText(topic: Readonly<HelpTopic>): string {
  const body = topic.body.join(" ").replaceAll("**", "");
  return fillHelpText(`${topic.title} ${body}`, topic).toLowerCase();
}

/** A paragraph's runs: the text between `**` pairs is bold. */
export function helpSegments(text: HelpText): readonly HelpSegment[] {
  return text
    .split("**")
    .map((run, place) => ({ text: run, strong: place % 2 === 1 }))
    .filter((segment) => segment.text !== "");
}

/** Where a topic opens on the Help page. */
export function helpTopicHref(id: string): string {
  return `/admin/help#${id}`;
}
