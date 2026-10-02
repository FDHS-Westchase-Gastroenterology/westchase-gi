import { nyDate } from "./context.mjs";
import { MOCK_EMAIL_DOMAIN } from "./people.mjs";
/* The demo-data bar, as checks over a generated dataset. `checkDemoData(data)` returns a list
   of problems; an empty list means the dataset may go on a shared Preview branch.
   Integrity checks mirror the database's own constraints and the portal's write paths.
   Quality checks hold the content to what a demo audience would believe. */
import { STAFF_EMAIL_DOMAIN } from "./roster.mjs";

const FICTIONAL_PHONE = /^\d{3}55501\d{2}$/;
// Clinical text legitimately says "testing" and "sample"; filler and fixture vocabulary does not.
const PLACEHOLDER =
  /\b(seed|seeded|example|lorem|ipsum|fictional|placeholder|dummy|fake|foo|asdf|qwerty|todo|tbd|xxx)\b|\btest (patient|user|request|note|data|account)\b/i;
const FIXTURE_MARK = /\bTEST\b/;
const GENDERED = /\b(he|him|his|himself|she|her|hers|herself|mr|mrs|ms|miss|sir|ma'am)\b/i;
const WHOLE_SECOND = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\+00:00$/;

const groupBy = (list, column) => {
  const map = new Map();
  for (const row of list) {
    if (!map.has(row[column])) map.set(row[column], []);
    map.get(row[column]).push(row);
  }
  return map;
};
const ms = (v) => Date.parse(v);

function integrity({ rows }, problem) {
  const patients = new Set(rows.patients.map((p) => p.id));
  const appointmentsById = new Map(rows.appointments.map((a) => [a.id, a]));

  for (const a of rows.appointments) {
    if (!patients.has(a.patient_id)) problem(`appointment ${a.id} has no patient row`);
    if (ms(a.ends_at) <= ms(a.starts_at)) problem(`appointment ${a.id} ends before it starts`);
    if (ms(a.created_at) > ms(a.starts_at))
      problem(`appointment ${a.id} was booked after it started`);
  }
  // Mirrors the database's exclusion constraint on live provider reservations.
  const live = rows.appointments.filter((a) => a.status !== "cancelled");
  for (const [provider, list] of groupBy(live, "provider_id")) {
    const sorted = [...list].sort((x, y) => ms(x.reserved_from) - ms(y.reserved_from));
    for (let i = 1; i < sorted.length; i++)
      if (ms(sorted[i].reserved_from) < ms(sorted[i - 1].reserved_until))
        problem(`provider ${provider} is double-booked at ${sorted[i].starts_at}`);
  }
  for (const [patient, list] of groupBy(live, "patient_id")) {
    const days = list.map((a) => nyDate(ms(a.starts_at)));
    if (new Set(days).size !== days.length) problem(`patient ${patient} has two visits on one day`);
  }

  for (const r of rows.patient_clinical_records) {
    const signed = [r.signed_by, r.signed_by_email, r.signed_at].filter((v) => v != null).length;
    if (signed !== 0 && signed !== 3) problem(`clinical record ${r.id} is partly signed`);
    if ((r.status === "signed") !== (signed === 3))
      problem(`clinical record ${r.id} status disagrees with its signature`);
    const appointment = appointmentsById.get(r.appointment_id);
    if (appointment?.status !== "completed")
      problem(`clinical record ${r.id} is not on a completed visit`);
  }

  const accounts = new Map(rows.patient_billing_accounts.map((a) => [a.patient_id, a]));
  for (const [patient, list] of groupBy(rows.patient_billing_entries, "patient_id")) {
    const sorted = [...list].sort((x, y) => x.version - y.version);
    let balance = 0;
    sorted.forEach((e, i) => {
      if (e.version !== i + 1) problem(`billing entry ${e.id} breaks the version chain`);
      if (e.kind === "charge" ? e.amount_cents <= 0 : e.amount_cents >= 0)
        problem(`billing entry ${e.id} has the wrong sign for a ${e.kind}`);
      balance += e.amount_cents;
      if (e.resulting_balance_cents !== balance)
        problem(`billing entry ${e.id} has a wrong running balance`);
      if (i && ms(e.occurred_at) < ms(sorted[i - 1].occurred_at))
        problem(`billing entry ${e.id} is out of order`);
    });
    const account = accounts.get(patient);
    if (!account) problem(`patient ${patient} has billing entries but no account`);
    else if (account.balance_cents !== balance || account.version !== sorted.length)
      problem(`billing account ${patient} disagrees with its entries`);
  }

  const transitions = groupBy(rows.request_transitions, "request_id");
  for (const r of rows.requests) {
    const chain = [...(transitions.get(r.id) ?? [])].sort(
      (x, y) => x.resulting_version - y.resulting_version,
    );
    let state = "new";
    chain.forEach((t, i) => {
      if (t.from_state !== state)
        problem(`request ${r.id} transition ${t.command} starts from the wrong state`);
      if (t.resulting_version !== i + 2) problem(`request ${r.id} has a gap in its versions`);
      state = t.to_state;
    });
    if (state !== r.status) problem(`request ${r.id} status disagrees with its transitions`);
    if (r.version !== chain.length + 1)
      problem(`request ${r.id} version disagrees with its transitions`);
    const fitsStatus = {
      new: !r.closed_at && !r.appointment_at,
      contacted: !r.closed_at && !r.appointment_at && r.follow_up_at,
      booked: !r.closed_at && r.appointment_at && !r.follow_up_at,
      closed: r.closed_at && r.closure_reason && !r.follow_up_at,
    };
    if (!fitsStatus[r.status]) problem(`request ${r.id} fields do not fit status ${r.status}`);
  }
  const managed = rows.appointments.filter((a) => a.request_workflow_managed);
  const booked = rows.requests.filter((r) => r.status === "booked");
  for (const r of booked) {
    const a = managed.find((m) => m.source_request_id === r.id);
    if (!a) problem(`booked request ${r.id} has no managed appointment`);
    else if (a.starts_at !== r.appointment_at)
      problem(`booked request ${r.id} disagrees with its appointment time`);
  }
  for (const a of managed)
    if (!booked.some((r) => r.id === a.source_request_id))
      problem(`managed appointment ${a.id} has no booked request`);

  for (const [table, list] of Object.entries(rows))
    for (const row of list)
      for (const [column, value] of Object.entries(row))
        if (
          /(_at|^reserved_from|^reserved_until)$/.test(column) &&
          value != null &&
          !WHOLE_SECOND.test(value)
        )
          problem(`${table}.${column} is not a whole-second UTC timestamp: ${value}`);
}

function quality({ rows, staff }, problem) {
  const staffSurnames = new Set(
    staff.clinicians.map((c) =>
      c.name
        .replace(/^Dr\. /, "")
        .split(",")[0]
        .split(" ")
        .at(-1),
    ),
  );
  const people = [...rows.patients, ...rows.requests];
  const names = rows.patients.map((p) => p.name);
  if (new Set(names).size !== names.length) problem("two patients share a name");
  const emails = rows.patients.map((p) => p.email).filter(Boolean);
  if (new Set(emails).size !== emails.length) problem("two patients share an email");
  for (const p of people) {
    if (p.email && !p.email.endsWith(`@${MOCK_EMAIL_DOMAIN}`))
      problem(`${p.name} has a non-mock email ${p.email}`);
    if (p.phone && !FICTIONAL_PHONE.test(p.phone))
      problem(`${p.name} has a phone outside 555-0100–0199`);
    if (!/^[\p{Lu}][\p{L}'’-]+( [\p{Lu}][\p{L}'’-]+)+$/u.test(p.name))
      problem(`"${p.name}" does not read as a real name`);
    if (staffSurnames.has(p.name.split(" ").at(-1)))
      problem(`patient ${p.name} shares a staff surname`);
  }
  for (const c of staff.clinicians)
    if (!c.email.endsWith(`@${STAFF_EMAIL_DOMAIN}`))
      problem(`clinician ${c.name} has a non-Preview email`);

  const staffText = [
    ...rows.request_events
      .filter((e) => e.type === "note")
      .map((e) => ["request note", e.meta.text]),
    ...rows.requests
      .filter((r) => r.source_path.startsWith("/admin"))
      .map((r) => ["staff-entered request", r.message]),
    ...rows.patient_clinical_records.map((r) => ["clinical note", `${r.title}\n${r.note_text}`]),
    ...rows.appointments.filter((a) => a.reason).map((a) => ["cancel reason", a.reason]),
  ];
  const patientText = rows.requests
    .filter((r) => !r.source_path.startsWith("/admin"))
    .map((r) => ["patient message", r.message]);
  for (const [kind, text] of [...staffText, ...patientText, ...people.map((p) => ["name", p.name])])
    for (const pattern of [PLACEHOLDER, FIXTURE_MARK])
      if (text && pattern.test(text))
        problem(`${kind} reads as placeholder text: "${text.match(pattern)[0]}"`);
  // Staff never assume a patient's gender; patients may describe their own family.
  for (const [kind, text] of staffText)
    if (text && GENDERED.test(text)) problem(`${kind} assumes a gender: "${text.slice(0, 80)}"`);
}

/** The content bar alone; `audit` runs it over the live branch. */
export function checkQuality(data) {
  const problems = [];
  quality(data, (message) => problems.push(message));
  return problems;
}

export function checkDemoData(data) {
  const problems = [];
  const problem = (message) => problems.push(message);
  integrity(data, problem);
  quality(data, problem);
  return problems;
}
