/* Invented people: unique names drawn from Tampa Bay's mix, reserved 555-01xx phone numbers,
   and @mock.com addresses that read like ones a person would choose. */
import { CONDITIONS, NAME_CLUSTERS } from "./content.mjs";
import { addDays } from "./context.mjs";

export const MOCK_EMAIL_DOMAIN = "mock.com";

const AREA_CODES = [
  ["813", 40],
  ["656", 10],
  ["727", 14],
  ["352", 6],
  ["941", 6],
  ["863", 6],
  ["321", 3],
  ["407", 4],
  ["239", 3],
  ["904", 2],
  ["305", 3],
  ["954", 2],
  ["561", 2],
  ["386", 2],
];

const ascii = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .replace(/ł/gi, "l")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

export const clusterByKey = (key) => NAME_CLUSTERS.find((c) => c.key === key);

export function createPeople(g) {
  const { ri, pick, chance, weighted, uuid, rnd } = g.random;
  const usedNames = new Set();
  const usedEmails = new Set();
  const phonesLeft = Object.fromEntries(
    AREA_CODES.map(([a]) => [a, Array.from({ length: 100 }, (_, i) => i)]),
  );
  const clusters = NAME_CLUSTERS.map((c) => [c, c.weight]);
  const hispanic = clusterByKey("hispanic");

  function phone() {
    const area = weighted(AREA_CODES.filter(([a]) => phonesLeft[a].length));
    const list = phonesLeft[area];
    const n = list.splice(Math.floor(rnd() * list.length), 1)[0];
    return `${area}55501${String(n).padStart(2, "0")}`;
  }

  function email(first, last) {
    const f = ascii(first);
    const l = ascii(last);
    for (let attempt = 0; attempt < 50; attempt++) {
      const n = ri(1, 98);
      const local = weighted([
        [`${f}.${l}`, 5],
        [`${f}${l}`, 3],
        [`${f[0]}${l}`, 3],
        [`${f}_${l}`, 2],
        [`${f}${l}${n}`, 3],
        [`${f}.${l}${ri(60, 99)}`, 2],
        [`${l}.${f}`, 1],
        [`${f}${l[0]}${n}`, 1],
      ]);
      const address = `${attempt > 3 ? local + attempt : local}@${MOCK_EMAIL_DOMAIN}`;
      if (!usedEmails.has(address)) {
        usedEmails.add(address);
        return address;
      }
    }
    throw new Error("Could not find an unused email address");
  }

  /** A new person; Hispanic names sometimes carry both family names. */
  function person(clusterKey) {
    for (;;) {
      const c = clusterKey ? clusterByKey(clusterKey) : weighted(clusters);
      const first = pick(c.first);
      const last = pick(c.last);
      const name =
        c === hispanic && chance(0.06)
          ? `${first} ${last} ${pick(hispanic.last)}`
          : `${first} ${last}`;
      if (usedNames.has(name)) continue;
      usedNames.add(name);
      return { name, first, last, phone: phone(), email: chance(0.9) ? email(first, last) : null };
    }
  }

  function dateOfBirth([lo, hi]) {
    const age = Math.min(hi, Math.max(lo, chance(0.65) ? ri(45, 75) : ri(lo, hi)));
    const year = +g.TODAY.slice(0, 4) - age - 1;
    return addDays(`${year}-01-01`, ri(1, 364));
  }

  const conditionWeights = Object.entries(CONDITIONS).map(([k, v]) => [k, v.weight]);
  const patients = [];

  function makePatient({ cond, established, createdAt, by = g.staff.operator }) {
    cond ??= weighted(conditionWeights);
    const p = {
      ...person(),
      id: uuid(),
      cond,
      dob: dateOfBirth(CONDITIONS[cond].ages),
      created_at:
        createdAt ?? Date.UTC(ri(2023, 2025), ri(0, 11), ri(1, 28), ri(13, 21), ri(0, 59)),
      by,
      established,
      days: new Set(),
      visits: [],
      requestId: null,
    };
    patients.push(p);
    return p;
  }

  /** Drops a patient whose first visit could not be placed. */
  function discard(p) {
    patients.splice(patients.indexOf(p), 1);
    usedNames.delete(p.name);
  }

  return { person, makePatient, discard, patients, conditionWeights };
}
