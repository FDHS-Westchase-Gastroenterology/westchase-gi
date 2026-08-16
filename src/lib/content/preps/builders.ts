// Section builders for the passages every endoscopy handout shares.
// A "flavor" is one of the wording sets in common.ts (EN / ES_T / ES_O);
// The builders keep each document's section tree consistent while letting
// Every locale carry its own source wording.

import type { EN } from "./common";
import type { PrepSection } from "./types";

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
type DeepReadonly<T> = T extends (...args: never[]) => void
  ? T
  : T extends (infer E)[]
    ? readonly DeepReadonly<E>[]
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

/** Flavor is an immutable bilingual copy table (English is the source of truth). */
export type Flavor = DeepReadonly<typeof EN>;

/** "Please bring the following items with you" + jewelry/clothing note. */
export function bringSection(f: Readonly<Flavor>): PrepSection {
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
  f: Readonly<Flavor>,
  opts: Readonly<{ fiber: boolean; companion?: string }>,
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
export function followUpSection(f: Readonly<Flavor>): PrepSection {
  return { blocks: [{ kind: "note", text: [f.followUp] }] };
}

/** Appointment line, day-of rules, what to bring, standard reminders,
 *  and the follow-up note — the shared front page of the endoscopy sheets. */
export function standardFront(
  f: Readonly<Flavor>,
  opts: Readonly<{ fiber: boolean }> = { fiber: true },
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
export function avoidAndLiquids(f: Readonly<Flavor>): PrepSection[] {
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
