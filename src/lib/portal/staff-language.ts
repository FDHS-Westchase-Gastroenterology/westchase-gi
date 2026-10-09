// Staff-facing language the portal can prove. Home greeting, Help, and
// Notification copy live here so tests can lock the claims without rendering
// The pages. Do not greet a system label as a person, and
// Do not promise behavior the portal cannot enforce.

export function signInIdentifierField(allowPreviewAlias: boolean) {
  return allowPreviewAlias
    ? ({ label: "Email or username", type: "text", inputMode: undefined } as const)
    : ({ label: "Email", type: "email", inputMode: "email" } as const);
}

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

export const RECIPIENTS_INTRO =
  "These addresses get an email when a patient sends a request from the website. Every request is on Home whether or not the email arrives.";

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

export function allStaffLanguageText(): string {
  return [
    signInIdentifierField(false).label,
    signInIdentifierField(true).label,
    RECIPIENTS_INTRO,
    RECIPIENT_CONFIRMATION_BODY,
    RECENT_WORK_INTRO,
  ].join("\n");
}

export function staffLanguageHasForbiddenClaim(text: string): boolean {
  const haystack = text.toLowerCase();
  return FORBIDDEN_ABSOLUTE_CLAIMS.some((claim) => haystack.includes(claim));
}
