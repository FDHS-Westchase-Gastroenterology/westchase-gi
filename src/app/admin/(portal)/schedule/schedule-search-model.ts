import type { StaffRequestPrefill } from "@/app/admin/(portal)/requests/new/staff-request-draft";
import { shortName } from "@/app/admin/(portal)/settings/settings-model";
import type { PersonStanding } from "@/lib/portal/patients/contracts";

import { cardDay, practiceDate, practiceTime } from "./week-calendar";

/* What the Schedule's search (issue #356) says about the people it finds:
   the part of each name the query matched, the one line under the name
   that says where the person stands, and the words for a query that
   found nobody. Pure, so the popup and the record read the same lines. */

/** The search starts at two characters; one finds too many to read. */
export const SEARCH_MIN = 2;

/** Folds a name or a query the way the database compares them: no accents, no case. */
function fold(text: string): string {
  return text.normalize("NFD").replaceAll(/\p{M}/gu, "").toLowerCase();
}

/** The words of a query: apostrophes join ("O'Neill" is "oneill"), anything else splits. */
function queryWords(query: string): string[] {
  return fold(query)
    .replaceAll(/['’]/gu, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== "");
}

/** True when the query reads as a phone number: digits and the marks people type with them. */
export function isPhoneQuery(query: string): boolean {
  return /\d/u.test(query) && /^[\d\s()+.-]+$/u.test(query.trim());
}

export interface NamePart {
  readonly text: string;
  readonly matched: boolean;
}

/** How many characters of `word` it takes to cover `length` folded letters. */
function cutFor(word: string, length: number): number {
  let folded = 0;
  for (let index = 0; index < word.length; index += 1) {
    if (folded >= length) return index;
    folded += fold(word.charAt(index)).replaceAll(/['’]/gu, "").length;
  }
  return word.length;
}

/**
 * A name split into the parts the query matched and the rest: each word
 * of the name (hyphenated parts included) that starts with a word of the
 * query has that start marked. A phone query marks nothing.
 */
export function nameParts(name: string, query: string): readonly NamePart[] {
  const words = isPhoneQuery(query) ? [] : queryWords(query);
  if (words.length === 0) return [{ text: name, matched: false }];
  return name.split(/([\s-]+)/u).flatMap((segment): NamePart[] => {
    const folded = fold(segment).replaceAll(/['’]/gu, "");
    const longest = words
      .filter((word) => folded.startsWith(word))
      .reduce((best, word) => Math.max(best, word.length), 0);
    if (longest === 0) return segment === "" ? [] : [{ text: segment, matched: false }];
    const cut = cutFor(segment, longest);
    const rest = segment.slice(cut);
    return rest === ""
      ? [{ text: segment, matched: true }]
      : [
          { text: segment.slice(0, cut), matched: true },
          { text: rest, matched: false },
        ];
  });
}

/** How a standing line is painted: teal for today, amber for a call that's due, else muted. */
export type StandingTone = "today" | "due" | "quiet";

export interface StandingLine {
  readonly text: string;
  readonly tone: StandingTone;
}

const TODAY_WORD = {
  scheduled: null,
  checked_in: "Checked in",
  completed: "Seen",
  no_show: "No-show",
  cancelled: "Cancelled",
} as const;

/** "11:00 AM with Dr. Awad". */
function timeWith(startsAt: string, providerName: string): string {
  return `${practiceTime(startsAt)} with ${shortName(providerName)}`;
}

/** The one line under a person's name that says where they stand right now. */
export function standingLine(
  status: PersonStanding,
  now: Readonly<Date> = new Date(),
): StandingLine {
  switch (status.kind) {
    case "appointment": {
      if (status.when === "next")
        return {
          text: `Next visit · ${cardDay(status.startsAt)} with ${shortName(status.providerName)}`,
          tone: "quiet",
        };
      const word = TODAY_WORD[status.status];
      const at = timeWith(status.startsAt, status.providerName);
      if (word === null) return { text: `Today, ${at}`, tone: "today" };
      return {
        text: `${word} · today, ${at}`,
        tone: status.status === "checked_in" ? "today" : "quiet",
      };
    }
    case "request": {
      if (status.requestStatus === "booked" && status.appointmentAt !== null) {
        const today = practiceDate(new Date(status.appointmentAt)) === practiceDate(now);
        return today
          ? { text: `Booked · today, ${practiceTime(status.appointmentAt)}`, tone: "today" }
          : { text: `Booked · ${cardDay(status.appointmentAt)}`, tone: "quiet" };
      }
      if (status.followUpAt !== null)
        return { text: `Call again · ${cardDay(status.followUpAt)}`, tone: "due" };
      return {
        text: status.requestStatus === "new" ? "Request · Not called yet" : "Request · Called",
        tone: "quiet",
      };
    }
    case "none":
      break;
  }
  return {
    text:
      status.lastVisitAt === null ? "No visits yet" : `Last visit · ${cardDay(status.lastVisitAt)}`,
    tone: "quiet",
  };
}

/** "Hollis" from "hollis", "Mary Ann" from "mary ann": a typed name as the request will spell it. */
export function typedName(query: string): string {
  return query
    .trim()
    .split(/\s+/u)
    .map((word) => (word === "" ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`))
    .join(" ");
}

export interface StartOffer {
  readonly lead: string;
  readonly action: string;
}

/** What a query that found nobody offers to start a request with. */
export function startOffer(query: string): StartOffer {
  const typed = query.trim();
  if (isPhoneQuery(typed))
    return {
      lead: `No patient with “${typed}” in requests or appointments. Start a request and the number comes with you.`,
      action: "Start a request with this number",
    };
  return {
    lead: `No patient named “${typed}” in requests or appointments. Start a request and the name comes with you.`,
    action: `Start a request for ${typedName(typed)}`,
  };
}

/** What Add request opens with when search starts it: the name, or the number, that was typed. */
export function requestPrefill(query: string): StaffRequestPrefill {
  const typed = query.trim();
  if (typed === "") return {};
  return isPhoneQuery(typed) ? { phone: typed } : { name: typedName(typed) };
}

/** "3 patients", "1 patient". */
export function countWords(total: number): string {
  return `${total} ${total === 1 ? "patient" : "patients"}`;
}
