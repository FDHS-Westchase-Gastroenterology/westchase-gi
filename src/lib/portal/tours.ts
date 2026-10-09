/* The two first-sign-in tours (issue #358, Figma section 15). Each step names the screen it runs
   on and the controls it points at, by their `data-tour` attribute. The first target present on
   the page wins, so a step whose control is missing (no requests yet, no visits today) points at
   the screen's empty state and the tour keeps going. The tip copy is final in the frames. */

import type { StaffTour } from "./contracts";

export type TourIcon = "home" | "clipboard" | "calendar" | "check" | "clock" | "users" | "mail";

export interface TourStep {
  readonly id: string;
  /** The pathname the step runs on. */
  readonly pathname: string;
  /** The Schedule view the step needs, when it runs on the Schedule. */
  readonly view?: "day";
  /** Where Next (or a fresh start) takes the user. */
  readonly href: string;
  /** `data-tour` values, most specific first. */
  readonly targets: readonly string[];
  readonly side: "top" | "bottom" | "left" | "right";
  readonly align: "start" | "center" | "end";
  readonly icon: TourIcon;
  readonly title: string;
  readonly body: string;
}

export const TOUR_LABELS = {
  front_desk: "Front desk tour",
  admin: "Admin tour",
} as const satisfies Readonly<Record<StaffTour, string>>;

export const TOUR_SUMMARIES = {
  front_desk: "New requests, logging a call, booking from the card and checking in.",
  admin: "Weekly hours, appointment types, inviting staff and request emails.",
} as const satisfies Readonly<Record<StaffTour, string>>;

export const TOUR_STEPS = {
  front_desk: [
    {
      id: "new-requests",
      pathname: "/admin",
      href: "/admin",
      targets: ["home-new-row", "home-top-row", "home-empty"],
      side: "bottom",
      align: "center",
      icon: "home",
      title: "New requests arrive here",
      body: "Each row is a patient asking for a visit. New means no one has called yet. Open the row to log the call and book a time.",
    },
    {
      id: "log-the-call",
      pathname: "/admin",
      href: "/admin",
      targets: ["home-card", "home-empty"],
      side: "right",
      align: "center",
      icon: "clipboard",
      title: "Log the call on the card",
      body: "Call the patient at the number on the card, choose what happened, then Save.",
    },
    {
      id: "book-from-card",
      pathname: "/admin",
      href: "/admin",
      targets: ["home-card-booking", "home-card", "home-empty"],
      side: "right",
      align: "center",
      icon: "calendar",
      title: "Book a time from the card",
      body: "Days in a mint circle have open times. Rest the pointer on a day, choose a time, then Book.",
    },
    {
      id: "check-in",
      pathname: "/admin/schedule",
      view: "day",
      href: "/admin/schedule?view=day",
      targets: ["day-check-in", "day-block", "day-providers", "day-empty"],
      side: "bottom",
      align: "center",
      icon: "check",
      title: "Check patients in on the day",
      body: "Schedule shows today’s visits by provider. When a patient arrives, rest the pointer on their visit and choose Check in.",
    },
  ],
  admin: [
    {
      id: "weekly-hours",
      pathname: "/admin/settings/providers",
      href: "/admin/settings/providers",
      targets: ["weekly-hours", "providers-empty"],
      side: "bottom",
      align: "center",
      icon: "clock",
      title: "Set each provider’s weekly hours",
      body: "The schedule offers only these hours for booking. Choose Edit hours to change them from today or from a later date; a change for a single day is made on the schedule.",
    },
    {
      id: "appointment-types",
      pathname: "/admin/settings/appointment-types",
      href: "/admin/settings/appointment-types",
      targets: ["appointment-types"],
      side: "bottom",
      align: "start",
      icon: "clipboard",
      title: "Set up appointment types",
      body: "Each type sets how long a visit runs and which providers offer it. Booking uses these lengths to find open times.",
    },
    {
      id: "invite-front-desk",
      pathname: "/admin/settings/staff",
      href: "/admin/settings/staff",
      targets: ["staff-invite"],
      side: "bottom",
      align: "end",
      icon: "users",
      title: "Invite the front desk",
      body: "Invite emails a sign-in link. Choose Front desk for anyone who calls patients and books; choose Admin only for people who change settings.",
    },
    {
      id: "request-emails",
      pathname: "/admin/settings/notifications",
      href: "/admin/settings/notifications",
      targets: ["recipients"],
      side: "bottom",
      align: "center",
      icon: "mail",
      title: "Who gets new-request emails",
      body: "Everyone switched on gets an email when a new request arrives. Send a test to check that it reaches them.",
    },
  ],
} as const satisfies Readonly<Record<StaffTour, readonly TourStep[]>>;

/** Whether the page at `pathname` with Schedule `view` is the one `step` runs on. */
export function tourStepMatches(
  step: Readonly<TourStep>,
  pathname: string,
  view: string | null,
): boolean {
  if (pathname !== step.pathname) return false;
  return step.view === undefined || step.view === view;
}

/** The first screen a tour opens on. */
export function tourStartHref(tour: StaffTour): string {
  return TOUR_STEPS[tour][0].href;
}

/** Where a sign-in lands: the first screen of the tour the session will run, else Home. */
export function landingHref(pendingTour: StaffTour | null): string {
  return pendingTour === null ? "/admin" : tourStartHref(pendingTour);
}
