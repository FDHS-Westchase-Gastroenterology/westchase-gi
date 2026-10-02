/* The demo clinic: real staff names from the practice roster, invented clinic hours.
   Names and credentials come from src/lib/providers.ts so demo data never drifts from the
   practice. Hours, locations' weekly rotation and the time-off week are invented. */
import { infusionNurse, nursePractitioners, physicians } from "@/lib/providers";

import { addDays, weekday } from "./context.mjs";

const surname = (name) => name.split(" ").at(-1);
const key = (name) => surname(name).toLowerCase();

/** Clinician accounts on the Preview branch. The address domain matches the CI seed admin. */
export const STAFF_EMAIL_DOMAIN = "preview.westchase.test";

export function clinicianRoster() {
  const entry = (person, kind, display, short) => {
    const [first, ...rest] = person.name.toLowerCase().split(" ");
    return {
      key: key(person.name),
      kind,
      name: display,
      short,
      email: `${first}.${rest.join("-")}@${STAFF_EMAIL_DOMAIN}`,
    };
  };
  return [
    ...physicians.map((p) => entry(p, "physician", `Dr. ${p.name}`, `Dr. ${surname(p.name)}`)),
    ...nursePractitioners.individuals.map((p) => entry(p, "np", `${p.name}, APRN`, p.name)),
    entry(infusionNurse, "infusion", `${infusionNurse.name}, RN`, infusionNurse.name),
  ];
}

/** The history window opens on the Monday about eight weeks before the reference day; the
    portal was configured three weeks before that. */
export function historyStart(today) {
  const back = addDays(today, -53);
  return addDays(back, -((weekday(back) + 6) % 7));
}
export const setupAt = (start) => Date.parse(`${addDays(start, -21)}T13:00:00Z`);
export const HORIZON_DAYS = 42;

const nthWeekday = (year, month, day, n) => {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  return addDays(first, ((day - weekday(first) + 7) % 7) + 7 * (n - 1));
};
const lastMonday = (year, month) => {
  const last = addDays(`${year}-${String(month + 1).padStart(2, "0")}-01`, -1);
  return addDays(last, -((weekday(last) + 6) % 7));
};
/** A fixed-date holiday on a weekend is observed on the nearest weekday. */
const observed = (date) => addDays(date, { 0: 1, 6: -1 }[weekday(date)] ?? 0);

/** Office holidays: the federal ones a private practice closes for, plus the day after Thanksgiving. */
export function isClosedDay(date) {
  const year = Number(date.slice(0, 4));
  const thanksgiving = nthWeekday(year, 11, 4, 4);
  return [
    observed(`${year}-01-01`),
    lastMonday(year, 5),
    observed(`${year}-07-04`),
    nthWeekday(year, 9, 1, 1),
    thanksgiving,
    addDays(thanksgiving, 1),
    observed(`${year}-12-25`),
  ].includes(date);
}
export const LUNCH = [720, 780];

export const LOCATIONS = {
  tampa: { name: "Tampa Office", request_location: "tampa" },
  lutz: { name: "Lutz Office", request_location: "lutz" },
};

export const TYPES = {
  NEW: { name: "New patient consultation", dur: 45, after: 0, label: "New patient consultation" },
  FU: { name: "Follow-up visit", dur: 30, after: 0, label: "Follow-up" },
  PROC: { name: "Procedure consultation", dur: 30, after: 0, label: "Pre-procedure visit" },
  RES: { name: "Results review", dur: 15, after: 0, label: "Results review" },
  INF: { name: "Infusion therapy", dur: 120, after: 15, label: "Infusion" },
};

const T = "tampa";
const L = "lutz";

/** Weekly template by roster position: weekday → [location, open minute, close minute]. */
const TEMPLATES = {
  physician: [
    { 1: [T, 480, 990], 2: [L, 480, 960], 3: [T, 480, 990], 5: [T, 480, 960] },
    { 1: [L, 510, 1020], 3: [T, 510, 1020], 4: [T, 510, 1020], 5: [L, 510, 900] },
    { 1: [T, 480, 990], 2: [T, 480, 990], 4: [L, 480, 960], 5: [T, 480, 720] },
  ],
  np: [
    { 1: [T, 480, 1020], 2: [T, 480, 1020], 3: [T, 480, 1020], 4: [T, 480, 1020] },
    {
      1: [L, 480, 1020],
      2: [T, 540, 1020],
      3: [L, 480, 1020],
      4: [T, 540, 1020],
      5: [L, 480, 1020],
    },
  ],
  infusion: [{ 2: [T, 480, 960], 4: [T, 480, 960] }],
};

/** Builds the clinic for a roster: hours, NP pairing, and one physician's away days. */
export function clinic(roster) {
  const byKind = (kind) => roster.filter((s) => s.kind === kind).map((s) => s.key);
  const physicianKeys = byKind("physician");
  const npKeys = byKind("np");
  const infusionKey = byKind("infusion")[0];
  const hours = {};
  for (const kind of ["physician", "np", "infusion"])
    byKind(kind).forEach((k, i) => {
      hours[k] = TEMPLATES[kind][i % TEMPLATES[kind].length];
    });
  const npFor = Object.fromEntries(
    physicianKeys.map((k, i) => [k, i === 2 ? npKeys : [npKeys[i % npKeys.length]]]),
  );
  const away = { [physicianKeys[1]]: new Set(["2026-10-15", "2026-10-16"]) };
  return { physicianKeys, npKeys, infusionKey, hours, npFor, away };
}
