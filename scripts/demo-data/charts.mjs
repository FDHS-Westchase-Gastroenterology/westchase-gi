/* Clinical notes written by the visit's clinician, and copay and deductible ledgers. */
import { CONDITIONS } from "./content.mjs";
import { DAY, HOUR, MIN, daysBetween } from "./context.mjs";

export function createCharts(g, appts) {
  const { ri, pick, chance, weighted, uuid, rnd } = g.random;
  const { NOW, TODAY, TYPES, staff } = g;

  const vitals = () =>
    `BP ${ri(108, 146)}/${ri(66, 92)} · HR ${ri(58, 96)} · Wt ${ri(118, 248)} lb`;

  function infusionNote(a, c) {
    const p = a.patient;
    const drugName = p.drug === "infliximab" ? "Infliximab" : "Vedolizumab";
    const given =
      p.drug === "infliximab"
        ? `Infliximab ${p.dose} IV over 2 hours`
        : "Vedolizumab 300 mg IV over 30 minutes";
    const premed = chance(0.4)
      ? " Premedicated with acetaminophen 650 mg and loratadine 10 mg per protocol."
      : "";
    const trough = chance(0.3)
      ? `; trough level and CBC to be drawn before the next dose per ${staff[p.physician].short}`
      : "";
    return {
      title: `Infusion — ${drugName} ${p.dose}`,
      text: [
        `Infusion #${a.infusionNumber ?? 1} for ${c.label.toLowerCase()}.`,
        `Pre-infusion: ${vitals()} · T ${(97.6 + rnd() * 1.2).toFixed(1)}°F. Denies fever, active infection, or new symptoms since last infusion.${premed}`,
        `Administered: ${given} via ${pick(["right", "left"])} forearm peripheral IV, 22G. Vitals checked every 30 minutes, stable throughout.`,
        "Post-infusion: no infusion reaction. IV removed, site clean. Tolerated well.",
        `Next infusion due in ${p.interval} weeks${trough}.`,
      ].join("\n\n"),
    };
  }

  function noteFor(a) {
    const c = CONDITIONS[a.patient.cond];
    if (a.type === TYPES.INF) return infusionNote(a, c);
    const title = `${a.type.label} — ${c.label}`;
    if (a.type === TYPES.NEW) {
      const exam = chance(0.7) ? "non-tender" : "mild epigastric tenderness";
      return {
        title,
        text: [
          `Reason for visit: ${c.label}.`,
          `History of present illness: ${pick(c.hpi)}`,
          `Vitals: ${vitals()}`,
          `Exam: Abdomen soft, ${exam}, non-distended, normal bowel sounds. No hepatosplenomegaly.`,
          `Assessment: ${c.assess}`,
          `Plan: ${pick(c.plan)}`,
        ].join("\n\n"),
      };
    }
    if (a.type === TYPES.PROC)
      return {
        title,
        text: `${pick(c.proc ?? c.plan)}\n\nVitals: ${vitals()}\n\nASA class ${pick(["I", "II", "II", "III"])}. Consent discussed; patient's questions answered.`,
      };
    if (a.type === TYPES.RES)
      return {
        title,
        text: `${pick(c.res ?? c.fu ?? c.plan)}\n\nReviewed with patient${chance(0.3) ? " by video" : " in clinic"}; questions answered.`,
      };
    return {
      title,
      text: `Interval update: ${pick(c.fu ?? c.res ?? c.plan)}\n\nVitals: ${vitals()}`,
    };
  }

  // Most completed visits have a note; recent ones may still be unsigned drafts.
  const records = [];
  for (const a of appts) {
    if (a.status !== "completed") continue;
    if (!chance(a.type === TYPES.INF ? 0.85 : 0.75)) continue;
    const created = a.endsAt + ri(4, 45) * MIN;
    if (created > NOW - 5 * MIN) continue;
    const signAt = created + ri(10, 6 * 60) * MIN;
    const recent = daysBetween(a.date, TODAY) <= 2;
    const signed = signAt < NOW - 5 * MIN && !(recent && chance(0.45));
    const n = noteFor(a);
    records.push({
      id: uuid(),
      patient_id: a.patient.id,
      appointment_id: a.id,
      title: n.title,
      service_date: a.date,
      note_text: n.text,
      status: signed ? "signed" : "draft",
      version: signed ? 2 : 1,
      author: staff[a.provider],
      created_at: created,
      signed_at: signed ? signAt : null,
    });
  }

  // About a third of recent clinic patients carry a copay; some new patients owe a deductible.
  const entries = [];
  const copays = [3000, 4000, 4000, 5000, 5000, 7500];
  const ledgers = new Map();
  for (const a of appts) {
    if (a.status !== "completed" || a.type === TYPES.INF || daysBetween(a.date, TODAY) > 45)
      continue;
    const p = a.patient;
    if (!ledgers.has(p.id))
      ledgers.set(p.id, chance(0.35) ? { copay: pick(copays), entries: [], balance: 0 } : null);
    const ledger = ledgers.get(p.id);
    if (!ledger) continue;
    const checkIn = a.steps.find((s) => s.command === "check_in").at;
    const post = (kind, amount, at, extra) => {
      ledger.balance += amount;
      const entry = {
        id: uuid(),
        patient_id: p.id,
        appointment_id: a.id,
        kind,
        amount_cents: amount,
        resulting_balance_cents: ledger.balance,
        version: ledger.entries.length + 1,
        at,
        ...extra,
      };
      ledger.entries.push(entry);
      entries.push(entry);
    };
    post("charge", ledger.copay, checkIn + MIN, {
      description: `Copay — ${a.type.name}`,
      service_date: a.date,
    });
    if (chance(0.82))
      post("payment", -ledger.copay, checkIn + 3 * MIN, {
        description: "Copay paid at check-in",
        payment_method: weighted([
          ["card", 8],
          ["cash", 1],
          ["check", 1],
        ]),
      });
    if (a.type === TYPES.NEW && chance(0.25)) {
      const amount = ri(85, 260) * 100 + pick([0, 0, 40, 75]);
      const at = Math.min(a.endsAt + ri(9, 20) * DAY, NOW - DAY);
      if (at > a.endsAt) {
        post("charge", amount, at, {
          description: "Patient responsibility after insurance — deductible",
          service_date: a.date,
        });
        if (chance(0.4))
          post("payment", -amount, Math.min(at + ri(3, 10) * DAY, NOW - HOUR), {
            description: "Online payment",
            payment_method: "card",
            appointment_id: null,
          });
      }
    }
  }
  /* A deductible posts weeks after its visit, so later visits' copays can land first. The ledger
     keeps entries in the order they were posted. */
  for (const ledger of ledgers.values()) {
    if (!ledger) continue;
    ledger.entries.sort((x, y) => x.at - y.at);
    ledger.balance = 0;
    ledger.entries.forEach((e, i) => {
      ledger.balance += e.amount_cents;
      e.resulting_balance_cents = ledger.balance;
      e.version = i + 1;
    });
  }
  entries.sort((x, y) => x.at - y.at);
  const accounts = [...ledgers.entries()]
    .filter(([, v]) => v?.entries.length)
    .map(([patient_id, v]) => ({
      patient_id,
      balance_cents: v.balance,
      version: v.entries.length,
      created_at: v.entries[0].at,
      updated_at: v.entries.at(-1).at,
    }));
  return { records, entries, accounts };
}
