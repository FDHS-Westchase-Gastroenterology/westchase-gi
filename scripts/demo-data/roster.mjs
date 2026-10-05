/* The demo clinic: real staff names from the practice roster, invented clinic hours.
   Names and credentials come from src/lib/providers.ts, and office addresses and hours from
   src/lib/site.ts, so demo data never drifts from the practice. Provider hours, the locations'
   weekly rotation and the time-off week are invented. */
import { infusionNurse, nursePractitioners, physicians } from "@/lib/providers";
import { site } from "@/lib/site";

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
      credentials: `${person.credentials} · ${person.role.en}`,
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
export function holidays(year) {
  const thanksgiving = nthWeekday(year, 11, 4, 4);
  return [
    [observed(`${year}-01-01`), "New Year's Day"],
    [lastMonday(year, 5), "Memorial Day"],
    [observed(`${year}-07-04`), "Independence Day"],
    [nthWeekday(year, 9, 1, 1), "Labor Day"],
    [thanksgiving, "Thanksgiving"],
    [addDays(thanksgiving, 1), "Day after Thanksgiving"],
    [observed(`${year}-12-25`), "Christmas Day"],
  ];
}
export const isClosedDay = (date) =>
  holidays(Number(date.slice(0, 4))).some(([day]) => day === date);
export const LUNCH = [720, 780];

/** The portal's office day: both offices Monday to Friday 8:00–5:00, the owner's 2026-10-04
    decision; the patient site still publishes Lutz 8:00–4:30. */
export const PORTAL_OFFICE_DAY = [8 * 60, 17 * 60];
const office = (id) => {
  const o = site.locations.find((l) => l.id === id);
  return {
    name: o.name.en,
    request_location: id,
    street: o.street,
    city: o.city,
    region: o.region,
    postal: o.postal,
    maps_query: o.mapsQuery,
    open: PORTAL_OFFICE_DAY[0],
    close: PORTAL_OFFICE_DAY[1],
  };
};
/** Both offices open Monday to Friday at the portal's office hours. */
export const LOCATIONS = { tampa: office("tampa"), lutz: office("lutz") };
export const OFFICE_DAYS = [1, 2, 3, 4, 5];

/** Appointment types in booking order. Only the infusion nurse sees Infusion therapy, and the
    infusion nurse sees nothing else. */
export const TYPES = {
  NEW: {
    name: "New patient consultation",
    dur: 45,
    after: 0,
    label: "New patient consultation",
    icon: "user-plus",
    description: "First visit. Leave room for history and paperwork.",
  },
  FU: {
    name: "Follow-up visit",
    dur: 30,
    after: 0,
    label: "Follow-up",
    icon: "history",
    description: "Check on symptoms and treatment since the last visit.",
  },
  PROC: {
    name: "Procedure consultation",
    dur: 30,
    after: 0,
    label: "Pre-procedure visit",
    icon: "clipboard-check",
    description: "Plan a colonoscopy or endoscopy: prep, medications and consent.",
  },
  RES: {
    name: "Results review",
    dur: 15,
    after: 0,
    label: "Results review",
    icon: "file-text",
    description: "Go over pathology, labs or imaging with the patient.",
  },
  INF: {
    name: "Infusion therapy",
    dur: 120,
    after: 15,
    label: "Infusion",
    icon: "droplet",
    description: "Biologic infusion in the infusion suite. The chair is cleaned after.",
  },
};

const T = "tampa";
const L = "lutz";

/** Weekly template by roster position: weekday → office. Every provider works Monday to
    Friday on their office's whole day; a weekday the template was off goes to the office it
    works most, ties to Tampa. */
const TEMPLATES = {
  physician: [
    { 1: T, 2: L, 3: T, 5: T },
    { 1: L, 3: T, 4: T, 5: L },
    { 1: T, 2: T, 4: L, 5: T },
  ],
  np: [
    { 1: T, 2: T, 3: T, 4: T },
    { 1: L, 2: T, 3: L, 4: T, 5: L },
  ],
  infusion: [{ 2: T, 4: T }],
};

/** A template's week: every weekday on office hours at the office it works that day, or at
    the office it works most on the days it was off. */
const fullWeek = (days) => {
  const counts = Object.values(days).reduce((tally, loc) => {
    tally[loc] = (tally[loc] ?? 0) + 1;
    return tally;
  }, {});
  const most = [T, L].toSorted(
    (a, b) => (counts[b] ?? 0) - (counts[a] ?? 0) || (a === T ? -1 : 1),
  )[0];
  return Object.fromEntries(
    OFFICE_DAYS.map((weekday) => [weekday, [days[weekday] ?? most, ...PORTAL_OFFICE_DAY]]),
  );
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
      hours[k] = fullWeek(TEMPLATES[kind][i % TEMPLATES[kind].length]);
    });
  const npFor = Object.fromEntries(
    physicianKeys.map((k, i) => [k, i === 2 ? npKeys : [npKeys[i % npKeys.length]]]),
  );
  const away = { [physicianKeys[1]]: new Set(["2026-10-15", "2026-10-16"]) };
  return { physicianKeys, npKeys, infusionKey, hours, npFor, away };
}
