/* Appointments: infusion series first, then each clinic day filled chronologically from a queue
   of planned next steps (consult → pre-procedure → results), new patients and returning ones.
   Every appointment's history is settled up to the reference time. */
import { CANCEL_REASONS, CONDITIONS } from "./content.mjs";
import { DAY, HOUR, MIN, addDays, daysBetween, ny, weekday } from "./context.mjs";
import { LUNCH, isClosedDay } from "./roster.mjs";

export function createSchedule(g, people) {
  const { ri, pick, chance, weighted, uuid, rnd } = g.random;
  const { NOW, TODAY, START, END, TYPES, staff } = g;
  const { physicianKeys: PHYS, npKeys: NPS, infusionKey, hours, npFor, away } = g.clinic;
  const operator = staff.operator;
  const appts = [];
  const occupied = new Map();

  const worksOn = (p, date) => !isClosedDay(date) && !away[p]?.has(date) && hours[p][weekday(date)];

  function findSlot(p, date, type) {
    const h = worksOn(p, date);
    if (!h) return null;
    const [, open, close] = h;
    const taken = occupied.get(`${p}|${date}`) ?? [];
    const free = [];
    for (let m = open; m + type.dur <= close; m += 15) {
      const until = m + type.dur + type.after;
      if (type !== TYPES.INF && m < LUNCH[1] && m + type.dur > LUNCH[0]) continue;
      if (taken.some(([a, b]) => m < b && until > a)) continue;
      free.push(m);
    }
    return free.length ? pick(free) : null;
  }

  function place({ patient, provider, date, type, createdAt, createdBy }) {
    const h = worksOn(provider, date);
    const start = findSlot(provider, date, type);
    if (start == null || !h || patient.days.has(date)) return null;
    const slotKey = `${provider}|${date}`;
    if (!occupied.has(slotKey)) occupied.set(slotKey, []);
    occupied.get(slotKey).push([start, start + type.dur + type.after]);
    patient.days.add(date);
    const startsAt = ny(date, start);
    const endsAt = startsAt + type.dur * MIN;
    let created = createdAt ?? startsAt - ri(3, 24) * DAY - ri(0, 8) * HOUR;
    if (created > NOW) created = NOW - ri(30, 60 * 40) * MIN;
    if (created >= startsAt) created = startsAt - ri(2, 20) * HOUR;
    const a = {
      id: uuid(),
      patient,
      provider,
      loc: h[0],
      date,
      type,
      startsAt,
      endsAt,
      created_at: created,
      created_by: createdBy ?? operator,
      steps: [],
      status: "scheduled",
      reason: null,
      request: null,
    };
    appts.push(a);
    patient.visits.push(a);
    return a;
  }

  /** Records the lifecycle that has already happened by the reference time. */
  function settle(a) {
    const by = operator;
    a.steps.push({
      command: "book",
      status: "scheduled",
      at: a.created_at,
      by: a.created_by,
      reason: null,
    });
    const infusion = a.type === TYPES.INF;
    if (a.endsAt <= NOW) {
      const r = rnd();
      const cancel = r > (infusion ? 0.97 : 0.91);
      const noShow = !cancel && r > (infusion ? 0.95 : 0.85);
      if (cancel) {
        const at = Math.min(a.startsAt - ri(2, 72) * HOUR, NOW);
        a.steps.push({
          command: "cancel",
          status: "cancelled",
          at: Math.max(at, a.created_at + 30 * MIN),
          by,
          reason: pick(CANCEL_REASONS),
        });
      } else if (noShow) {
        a.steps.push({
          command: "no_show",
          status: "no_show",
          at: a.startsAt + ri(15, 30) * MIN,
          by,
          reason: null,
        });
      } else {
        a.steps.push({
          command: "check_in",
          status: "checked_in",
          at: a.startsAt - ri(4, 15) * MIN,
          by,
          reason: null,
        });
        a.steps.push({
          command: "complete",
          status: "completed",
          at: a.endsAt + ri(2, 15) * MIN,
          by: staff[a.provider],
          reason: null,
        });
      }
    } else if (a.startsAt <= NOW + 10 * MIN) {
      a.steps.push({
        command: "check_in",
        status: "checked_in",
        at: Math.min(NOW - MIN, a.startsAt - ri(3, 12) * MIN),
        by,
        reason: null,
      });
    } else if (chance(0.035) && a.startsAt - NOW > 2 * DAY) {
      const at = a.created_at + (NOW - a.created_at) * rnd();
      a.steps.push({
        command: "cancel",
        status: "cancelled",
        at: Math.max(at, a.created_at + 20 * MIN),
        by,
        reason: pick(CANCEL_REASONS),
      });
    }
    for (const s of a.steps) if (s.at > NOW) s.at = NOW - ri(1, 5) * MIN;
    const last = a.steps.at(-1);
    a.status = last.status;
    a.reason = last.reason;
  }

  // Infusion patients: IBD on infliximab or vedolizumab every 4–8 weeks.
  for (let i = 0; i < 30; i++) {
    const p = people.makePatient({ cond: chance(0.6) ? "crohns" : "uc", established: true });
    p.drug = chance(0.6) ? "infliximab" : "vedolizumab";
    p.interval = p.drug === "infliximab" ? pick([8, 8, 8, 6, 4]) : 8;
    p.physician = pick(PHYS);
    p.dose = p.drug === "infliximab" ? pick(["5 mg/kg", "5 mg/kg", "10 mg/kg"]) : "300 mg";
    let date = addDays(START, ri(0, p.interval * 7 - 1));
    let n = ri(4, 30);
    while (date <= END) {
      let placed = null;
      for (let s = 0; s < 6 && !placed; s++) {
        const d = addDays(date, s % 2 ? Math.ceil(s / 2) : -Math.ceil(s / 2));
        if (d < START || d > END) continue;
        placed = place({
          patient: p,
          provider: infusionKey,
          date: d,
          type: TYPES.INF,
          createdBy: staff[infusionKey],
          createdAt: ny(addDays(d, -p.interval * 7), 600 + ri(0, 300)),
        });
      }
      if (placed) placed.infusionNumber = n++;
      date = addDays(date, p.interval * 7);
    }
  }

  const queue = [];
  function enqueueNext(a) {
    const p = a.patient;
    const c = CONDITIONS[p.cond];
    const fromVisit = Math.min(a.endsAt + ri(5, 20) * MIN, NOW - ri(5, 60) * MIN);
    const follow = (type, lo, hi, providers) =>
      queue.push({
        patient: p,
        providers,
        type,
        earliest: addDays(a.date, lo),
        latest: addDays(a.date, hi),
        createdAt: fromVisit,
      });
    const phys = PHYS.includes(a.provider) ? a.provider : (p.physician ?? pick(PHYS));
    p.physician ??= phys;
    if (a.status === "no_show" || a.status === "cancelled") {
      if (chance(0.7)) follow(a.type, 5, 21, [a.provider]);
      return;
    }
    if (a.type === TYPES.NEW) {
      if (c.scope && PHYS.includes(a.provider)) follow(TYPES.PROC, 9, 24, [a.provider]);
      else follow(TYPES.FU, 35, 63, chance(0.5) ? [a.provider] : [...(npFor[phys] ?? NPS)]);
    } else if (a.type === TYPES.PROC) {
      follow(TYPES.RES, 18, 35, chance(0.6) ? [a.provider] : [...npFor[a.provider]]);
    } else if (a.type === TYPES.RES && c.fu && chance(0.35)) {
      follow(TYPES.FU, 75, 120, [...npFor[phys]]);
    }
  }

  /** Visits per provider-day: full in the past and next two weeks, thinning further out. */
  function target(date) {
    const d = daysBetween(TODAY, date);
    if (d < -21) return ri(4, 6);
    if (d <= 14) return ri(5, 8);
    if (d <= 21) return ri(3, 5);
    if (d <= 28) return ri(2, 4);
    return ri(0, 2);
  }

  function newCondition(provider) {
    if (NPS.includes(provider))
      return weighted([
        ["gerd", 4],
        ["ibs", 4],
        ["masld", 3],
        ["dyspepsia", 1],
        ["bleeding", 1],
      ]);
    return weighted(
      people.conditionWeights
        .filter(([k]) => k !== "crohns" && k !== "uc")
        .concat([
          ["crohns", 1],
          ["uc", 1],
        ]),
    );
  }

  const followUpConditions = people.conditionWeights.filter(([k]) => CONDITIONS[k].fu);
  const establishedPool = [];
  for (let date = START; date <= END; date = addDays(date, 1)) {
    for (const prov of [...PHYS, ...NPS]) {
      if (!worksOn(prov, date)) continue;
      const want = target(date);
      let count = 0;
      const due = queue
        .filter((q) => q.providers.includes(prov) && q.earliest <= date && !q.done)
        .sort((x, y) => (x.latest < y.latest ? -1 : 1));
      for (const q of due) {
        if (count >= want + (q.latest <= date ? 1 : 0)) break;
        if (date > q.latest && daysBetween(q.latest, date) > 14) {
          q.done = true;
          continue;
        }
        const a = place({
          patient: q.patient,
          provider: prov,
          date,
          type: q.type,
          createdAt: q.createdAt,
        });
        if (!a) continue;
        q.done = true;
        count++;
        settle(a);
        enqueueNext(a);
      }
      let guard = 0;
      while (count < want && guard++ < 30) {
        const isNP = NPS.includes(prov);
        let a;
        if (chance(isNP ? 0.35 : 0.42)) {
          const created = ny(date, 480) - ri(4, 26) * DAY - ri(0, 9) * HOUR;
          const p = people.makePatient({
            cond: newCondition(prov),
            established: false,
            createdAt: Math.min(created, NOW - 2 * HOUR) - ri(2, 9) * MIN,
          });
          p.physician = isNP ? null : prov;
          a = place({
            patient: p,
            provider: prov,
            date,
            type: TYPES.NEW,
            createdAt: p.created_at + ri(2, 9) * MIN,
          });
          if (!a) {
            people.discard(p);
            continue;
          }
        } else {
          const reuse = establishedPool.filter(
            (p) =>
              !p.days.has(date) &&
              p.lastSeen &&
              daysBetween(p.lastSeen, date) > 45 &&
              (p.physician === prov || isNP),
          );
          const p =
            reuse.length && chance(0.45)
              ? pick(reuse)
              : people.makePatient({ cond: weighted(followUpConditions), established: true });
          if (!establishedPool.includes(p)) {
            p.physician = isNP ? pick(PHYS) : prov;
            establishedPool.push(p);
          }
          const scope = CONDITIONS[p.cond].scope;
          const type =
            PHYS.includes(prov) && chance(0.12) && scope
              ? TYPES.PROC
              : chance(0.15)
                ? TYPES.RES
                : TYPES.FU;
          a = place({
            patient: p,
            provider: prov,
            date,
            type,
            createdAt: ny(date, 480) - ri(10, 80) * DAY,
          });
          if (!a) continue;
          p.lastSeen = date;
        }
        count++;
        settle(a);
        enqueueNext(a);
      }
    }
  }
  for (const a of appts) if (!a.steps.length) settle(a);
  appts.sort((x, y) => x.startsAt - y.startsAt);
  return appts;
}
