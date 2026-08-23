// Staff-facing language the portal can prove. Home greeting, the oldest-New
// Action, Help, and notification copy live here so tests can lock the claims
// Without rendering the pages. Do not greet a system label as a person, and
// Do not promise behavior the portal cannot enforce.

export const SIGN_IN_IDENTIFIER_LABEL = "Email or username";

export const START_OLDEST_REQUEST_LABEL = "Start with oldest request";
export const OPEN_NEW_REQUESTS_LABEL = "Open New requests";
export const NEW_REQUESTS_HREF = "/admin/requests?status=new";

const NON_PERSONAL_FIRST_TOKENS = new Set([
  "admin",
  "administrator",
  "portal",
  "staff",
  "system",
  "user",
]);

export function greetingName(displayName: string): string | null {
  const trimmed = displayName.trim();
  if (trimmed === "" || trimmed.includes("@")) return null;
  const [first = ""] = trimmed.split(/\s+/);
  if (first === "") return null;
  const key = first.toLowerCase().replace(/[^a-z]+/g, "");
  if (key === "" || NON_PERSONAL_FIRST_TOKENS.has(key)) return null;
  return first;
}

export function staffGreeting(timeOfDay: string, displayName: string): string {
  const name = greetingName(displayName);
  return name === null ? `${timeOfDay}.` : `${timeOfDay}, ${name}.`;
}

export type OldestNewRequestAction =
  | {
      readonly kind: "open-oldest";
      readonly href: string;
      readonly label: typeof START_OLDEST_REQUEST_LABEL;
    }
  | {
      readonly kind: "empty";
      readonly href: string;
      readonly label: typeof OPEN_NEW_REQUESTS_LABEL;
    }
  | { readonly kind: "none" };

export function oldestNewRequestAction(input: {
  readonly newCount: number | null;
  readonly oldestRequestId: string | null;
}): OldestNewRequestAction {
  if (input.newCount === null) return { kind: "none" };
  if (input.newCount <= 0) {
    return {
      kind: "empty",
      href: NEW_REQUESTS_HREF,
      label: OPEN_NEW_REQUESTS_LABEL,
    };
  }
  const id = input.oldestRequestId?.trim() ?? "";
  if (id === "") {
    return {
      kind: "empty",
      href: NEW_REQUESTS_HREF,
      label: OPEN_NEW_REQUESTS_LABEL,
    };
  }
  return {
    kind: "open-oldest",
    href: `/admin/requests/${id}`,
    label: START_OLDEST_REQUEST_LABEL,
  };
}

export const HELP_LINKS = {
  appointments: { href: "/admin/requests", label: "Appointments" },
  printPacket: {
    href: "/admin/requests/print",
    label: "Prepare the current New-request packet",
  },
  openAppointments: { href: "/admin/requests", label: "Open Appointments" },
  home: { href: "/admin", label: "Return to Home" },
  settings: { href: "/admin/settings", label: "Settings" },
  activity: { href: "/admin/audit", label: "Activity log" },
  website: { href: "/admin/settings/software", label: "Website" },
} as const;

export const HELP_QUEUE_ARRIVAL =
  "When a patient fills out the appointment form on the website, in any of the five languages, their appointment request is saved to the practice's database.";
export const HELP_QUEUE_OPEN = "Open";
export const HELP_QUEUE_RECORD =
  "to see it. Notification emails are a heads-up. If every email were missed, the request would still be in the queue. These are appointment requests, not booked appointments. Someone still calls the patient to schedule.";

export const HELP_CONTACTED_STATUS =
  "Someone has called the patient at least once: reached them, left a voicemail, or got no answer. Staff set a call-again time so the queue can bring the request back. Home flags Contacted requests that are missing a time so staff can correct them.";

export const HELP_NOTIFICATION_LEAD = "The addresses listed under";
export const HELP_NOTIFICATION_TRUTH =
  "get a short email when a new appointment request arrives. That email is a heads-up. It says a request is waiting and links back here. The portal is the record. Anyone on staff can pause a recipient, for example when going on vacation. Adding or removing addresses is an administrator task.";

export const HELP_ACTIVITY_LEAD = "Every access change is recorded in the";
export const HELP_ACTIVITY_TRUTH =
  "from the desktop task rail or the mobile account menu. That log shows who made the change.";

export function helpOutageCopy(phoneDisplay: string, textDisplay: string): string {
  return `If the portal will not load or an appointment request seems missing, call or text the office line first. The website lists the office call number ${phoneDisplay} and the text number ${textDisplay}. Then tell the website maintainer what you saw. Sign out when you step away from a shared computer.`;
}

export const RECIPIENTS_INTRO =
  "Everyone on this list gets an email when a patient requests an appointment. The emails are a heads-up. The portal is the record, so a missed email does not drop the request.";

export const RECIPIENT_CONFIRMATION_BODY = [
  "A Westchase GI portal administrator added this address to appointment request notifications.",
  "Future notices are a heads-up. They say an appointment request is waiting and link to the secure portal. The portal is the record.",
  "If you did not expect this, contact the Westchase GI office directly.",
].join("\n\n");

export const RECENT_WORK_INTRO =
  "Who did what, in the portal's own record, in plain language. The exact technical record stays below for administrators.";

export const FORBIDDEN_ABSOLUTE_CLAIMS = [
  "never lose one",
  "never lose one again",
  "nothing sensitive ever sits in an inbox",
  "always a clear record",
  "patients always see",
  "always saved here in the portal",
  "nothing sensitive ever",
  "can never lose",
] as const;

export function allStaffLanguageText(phoneDisplay: string, textDisplay: string): string {
  return [
    SIGN_IN_IDENTIFIER_LABEL,
    START_OLDEST_REQUEST_LABEL,
    OPEN_NEW_REQUESTS_LABEL,
    HELP_QUEUE_ARRIVAL,
    HELP_QUEUE_OPEN,
    HELP_QUEUE_RECORD,
    HELP_CONTACTED_STATUS,
    HELP_NOTIFICATION_LEAD,
    HELP_NOTIFICATION_TRUTH,
    HELP_ACTIVITY_LEAD,
    HELP_ACTIVITY_TRUTH,
    helpOutageCopy(phoneDisplay, textDisplay),
    RECIPIENTS_INTRO,
    RECIPIENT_CONFIRMATION_BODY,
    RECENT_WORK_INTRO,
    ...Object.values(HELP_LINKS).map((link) => `${link.label} ${link.href}`),
  ].join("\n");
}

export function staffLanguageHasForbiddenClaim(text: string): boolean {
  const haystack = text.toLowerCase();
  return FORBIDDEN_ABSOLUTE_CLAIMS.some((claim) => haystack.includes(claim));
}
