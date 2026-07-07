// Section builders for the passages every endoscopy handout shares.
// A "flavor" is one of the wording sets in common.ts (EN / ES_T / ES_O);
// the builders keep each document's section tree consistent while letting
// every locale carry its own source wording.

import type { PrepSection } from "./types";
import type { EN } from "./common";

export type Flavor = typeof EN;

/** "Please bring the following items with you" + jewelry/clothing note. */
export function bringSection(f: Flavor): PrepSection {
  return {
    heading: f.bringHeading,
    blocks: [
      { kind: "list", style: "steps", items: f.bringItems },
      { kind: "p", text: f.jewelryClothes },
    ],
  };
}

/** Companion, rest, diabetic, and medication reminders. */
export function remindersSection(
  f: Flavor,
  opts: { fiber: boolean; companion?: string }
): PrepSection {
  return {
    heading: f.remindersHeading,
    blocks: [
      { kind: "p", text: opts.companion ?? f.companion },
      { kind: "p", text: f.rest },
      { kind: "p", text: f.diabeticIntro },
      { kind: "list", style: "bullet", items: f.diabeticItems },
      {
        kind: "list",
        style: "bullet",
        items: [
          f.anticoagulants,
          f.nsaids,
          f.aspirin,
          f.dietPills,
          f.glp1,
          ...(opts.fiber ? [f.fiber] : []),
        ],
      },
    ],
  };
}

/** The boxed follow-up-appointment note. */
export function followUpSection(f: Flavor): PrepSection {
  return { blocks: [{ kind: "note", text: [f.followUp] }] };
}

/** Appointment line, day-of rules, what to bring, standard reminders,
 *  and the follow-up note — the shared front page of the endoscopy sheets. */
export function standardFront(
  f: Flavor,
  opts: { fiber: boolean } = { fiber: true }
): PrepSection[] {
  return [
    {
      blocks: [
        { kind: "p", text: f.readCarefully },
        { kind: "p", text: f.appointmentLine },
        { kind: "note", text: [f.dayOfNpo] },
      ],
    },
    bringSection(f),
    remindersSection(f, { fiber: opts.fiber }),
    followUpSection(f),
  ];
}

/** The closing "do not eat/drink" + "recommended liquids" pair. */
export function avoidAndLiquids(f: Flavor): PrepSection[] {
  return [
    {
      heading: f.avoidHeading,
      blocks: [{ kind: "list", style: "avoid", items: f.avoidItems }],
    },
    {
      heading: f.liquidsHeading,
      blocks: [{ kind: "list", style: "check", items: f.liquidsItems }],
    },
  ];
}
