import { nyDate, nyMinute, weekday } from "./context.mjs";
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

/** Mirrors the scheduling settings booking enforces: who sees each type, office hours and
    closed days. */
function settings({ rows }, problem) {
  const eligible = new Set(
    rows.appointment_type_providers.map((x) => `${x.appointment_type_id}/${x.provider_id}`),
  );
  const officeHours = groupBy(rows.location_hours, "location_id");
  const closed = new Set(rows.location_closures.map((c) => `${c.location_id}/${c.closed_on}`));
  for (const a of rows.appointments) {
    if (!eligible.has(`${a.appointment_type_id}/${a.provider_id}`))
      problem(`appointment ${a.id} has a provider who does not see its type`);
    if (closed.has(`${a.location_id}/${nyDate(ms(a.starts_at))}`))
      problem(`appointment ${a.id} falls on a closed day`);
  }
  for (const h of rows.provider_hours) {
    const office = officeHours.get(h.location_id);
    if (
      office &&
      !office.some(
        (o) =>
          o.weekday === h.weekday &&
          o.open_minute <= h.open_minute &&
          o.close_minute >= h.close_minute,
      )
    )
      problem(`provider hours ${h.id} fall outside the office's hours`);
  }
  for (const t of rows.appointment_types)
    if (!rows.appointment_type_providers.some((x) => x.appointment_type_id === t.id))
      problem(`appointment type ${t.name} has no provider`);
  if (!rows.location_closures.some((c) => /Thanksgiving/.test(c.note)))
    problem("no Thanksgiving closed day");
  if (!rows.provider_time_exceptions.some((e) => e.reason)) problem("no time off carries a reason");
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

/** The Schedule's Day view on the reference day, read back from the rows. While the clinic is
    open and its first 45 minutes have passed, today shows at least three providers working,
    someone off, a checked-in visit, a finished one and, while one still fits, an open time. After the last provider
    closes, the finished day still shows who was seen. */
function dayView({ rows, meta }, problem) {
  const now = Date.parse(meta.now);
  const date = meta.today;
  const clock = nyMinute(now);
  const minute = (v) => nyMinute(Date.parse(v));
  const away = new Set(
    rows.provider_time_exceptions
      .filter((e) => e.kind === "unavailable" && nyDate(Date.parse(e.starts_at)) <= date)
      .filter((e) => date < nyDate(Date.parse(e.ends_at)))
      .map((e) => e.provider_id),
  );
  const closed = new Set(
    rows.location_closures.filter((c) => c.closed_on === date).map((c) => c.location_id),
  );
  const hours = rows.provider_hours.filter(
    (h) => h.weekday === weekday(date) && !away.has(h.provider_id) && !closed.has(h.location_id),
  );
  if (hours.length === 0) return;
  const opens = Math.min(...hours.map((h) => h.open_minute));
  const closes = Math.max(...hours.map((h) => h.close_minute));
  const visits = rows.appointments.filter(
    (a) => a.status !== "cancelled" && nyDate(Date.parse(a.starts_at)) === date,
  );
  const statuses = new Set(visits.map((a) => a.status));
  if (clock >= closes) {
    if (!statuses.has("completed")) problem(`day view ${date}: nobody was seen today`);
    return;
  }
  if (clock < opens + 45) return;
  const working = new Set(hours.map((h) => h.provider_id));
  if (working.size < 3) problem(`day view ${date}: ${working.size} providers working`);
  if (rows.scheduling_providers.length === working.size) problem(`day view ${date}: nobody off`);
  for (const status of ["checked_in", "completed"])
    if (!statuses.has(status)) problem(`day view ${date}: no ${status} visit`);
  /* An open time starts on a quarter hour after the clock and fits the hours and the visits,
     while the day still has room for one. */
  const reserve = (t) => t.buffer_before_minutes + t.duration_minutes + t.buffer_after_minutes;
  const shortestFor = (provider) =>
    Math.min(
      ...rows.appointment_types
        .filter((t) =>
          rows.appointment_type_providers.some(
            (x) => x.appointment_type_id === t.id && x.provider_id === provider,
          ),
        )
        .map(reserve),
    );
  if (
    clock - (clock % 15) + 15 + Math.min(...hours.map((h) => shortestFor(h.provider_id))) >
    closes
  )
    return;
  const hasOpen = hours.some((h) => {
    const shortest = shortestFor(h.provider_id);
    const taken = visits
      .filter((a) => a.provider_id === h.provider_id)
      .map((a) => [minute(a.reserved_from), minute(a.reserved_until)]);
    for (let m = h.open_minute; m + shortest <= h.close_minute; m += 15)
      if (m > clock && !taken.some(([a, b]) => m < b && m + shortest > a)) return true;
    return false;
  });
  if (!hasOpen) problem(`day view ${date}: no open time after ${meta.now}`);
}

/** The Activity log (issue #357) has rows under every chip, and each undo is one Undo allowed. */
function activity({ history, staff }, problem) {
  const commands = new Set(history.appointmentSteps.map((s) => s.command));
  for (const command of ["book", "reschedule", "cancel", "check_in", "complete", "no_show", "undo"])
    if (!commands.has(command)) problem(`no appointment ${command} in the history`);
  if (!history.settingsChanges.length) problem("no schedule change in the history");
  const signedIn = new Set(history.signIns.map((s) => s.user_id));
  for (const who of [staff.operator, ...staff.clinicians])
    if (!signedIn.has(who.id)) problem(`${who.email} never signs in`);
  const steps = new Map(
    history.appointmentSteps.map((s) => [`${s.appointment_id}/${s.version}`, s]),
  );
  for (const undo of history.appointmentSteps.filter((s) => s.command === "undo")) {
    const undone = steps.get(`${undo.appointment_id}/${undo.version - 1}`);
    const gap = undone ? ms(undo.occurred_at) - ms(undone.occurred_at) : -1;
    if (!undone || undone.command === "undo" || gap <= 0 || gap > 15 * 60_000)
      problem(`appointment ${undo.appointment_id} has an undo Undo would refuse`);
  }
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
  settings(data, problem);
  quality(data, problem);
  dayView(data, problem);
  activity(data, problem);
  return problems;
}
