/* Builds the whole demo dataset as table rows: `generateDemoData({ seed, now, staff })`.
   Pure apart from its inputs. `staff.operator` is the front-desk actor (an existing admin
   profile); `staff.clinicians` maps roster keys to their auth user ids. */
import { addAppointmentActivity, printPackets, settingsChanges, signIns } from "./activity.mjs";
import { createCharts } from "./charts.mjs";
import { DAY, HOUR, MIN, addDays, createRandom, iso, ny, nyDate } from "./context.mjs";
import { createPeople } from "./people.mjs";
import { createRequests } from "./requests.mjs";
import {
  HORIZON_DAYS,
  LOCATIONS,
  OFFICE_DAYS,
  TYPES,
  clinic,
  clinicianRoster,
  historyStart,
  holidays,
  setupAt,
} from "./roster.mjs";
import { createSchedule } from "./schedule.mjs";

const ts = (v) => (v == null ? null : iso(v));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function generateDemoData({ seed, now, staff: identities }) {
  const NOW = Math.floor(now / 1000) * 1000;
  const random = createRandom(seed);
  const roster = clinicianRoster();
  if (!UUID.test(identities.operator?.id ?? "")) throw new Error("The operator id is not a uuid");
  const staff = { operator: identities.operator };
  for (const c of roster) {
    const id = identities.clinicians[c.key];
    if (!UUID.test(id ?? "")) throw new Error(`Missing auth user for ${c.email}`);
    staff[c.key] = { ...c, id };
  }
  const TODAY = nyDate(NOW);
  const START = historyStart(TODAY);
  const SETUP_AT = setupAt(START);
  const g = {
    seed: String(seed),
    random,
    NOW,
    TODAY,
    START,
    END: addDays(TODAY, HORIZON_DAYS),
    staff,
    clinic: clinic(roster),
    TYPES: Object.fromEntries(
      Object.entries(TYPES).map(([k, t]) => [k, { ...t, id: random.uuid() }]),
    ),
  };
  const locations = Object.fromEntries(
    Object.entries(LOCATIONS).map(([k, l]) => [k, { ...l, id: random.uuid() }]),
  );
  const providers = Object.fromEntries(
    roster.map((c) => [c.key, { id: random.uuid(), name: c.name, credentials: c.credentials }]),
  );

  const people = createPeople(g);
  const appts = createSchedule(g, people);
  const { requests, transitions, events, links } = createRequests(g, people, appts);
  const { records, entries, accounts } = createCharts(g, appts);
  addAppointmentActivity(g, appts);

  const used = new Set([...appts.map((a) => a.patient.id), ...links.map((l) => l.patient_id)]);
  const patients = people.patients.filter((p) => used.has(p.id));
  const operator = staff.operator;
  const config = (row) => ({
    ...row,
    active: true,
    version: 1,
    created_at: iso(SETUP_AT),
    updated_at: iso(SETUP_AT),
    created_by: operator.id,
    updated_by: operator.id,
  });
  const awayKey = Object.keys(g.clinic.away)[0];
  const awayDates = [...g.clinic.away[awayKey]].sort();
  const closedDays = [];
  for (let year = Number(START.slice(0, 4)); year <= Number(g.END.slice(0, 4)); year++)
    closedDays.push(...holidays(year).filter(([day]) => day >= START));

  const rows = {
    staff_profiles: roster.map((c) => ({
      user_id: staff[c.key].id,
      email: c.email,
      display_name: c.name,
      role: "staff",
      active: true,
      created_at: iso(SETUP_AT),
      updated_at: iso(SETUP_AT),
      onboarded_at: iso(SETUP_AT + DAY),
      portal_tour_dismissed_at: iso(SETUP_AT + DAY),
    })),
    clinical_signers: roster.map((c) => ({
      user_id: staff[c.key].id,
      enabled: true,
      version: 1,
      configured_by: operator.id,
      configured_at: iso(SETUP_AT + 2 * HOUR),
    })),
    scheduling_locations: Object.values(locations).map((l) =>
      config({
        id: l.id,
        name: l.name,
        request_location: l.request_location,
        street: l.street,
        city: l.city,
        region: l.region,
        postal: l.postal,
        maps_query: l.maps_query,
      }),
    ),
    scheduling_providers: Object.values(providers).map((p, i) =>
      config({
        id: p.id,
        name: p.name,
        credentials: p.credentials,
        bookable: true,
        sort_order: i + 1,
      }),
    ),
    appointment_types: Object.values(g.TYPES).map((t, i) =>
      config({
        id: t.id,
        name: t.name,
        duration_minutes: t.dur,
        buffer_before_minutes: 0,
        buffer_after_minutes: t.after,
        sort_order: i + 1,
        icon: t.icon,
        description: t.description,
      }),
    ),
    appointment_type_providers: Object.entries(g.TYPES).flatMap(([type, t]) =>
      Object.keys(providers)
        .filter((k) => (k === g.clinic.infusionKey) === (type === "INF"))
        .map((k) => ({ appointment_type_id: t.id, provider_id: providers[k].id })),
    ),
    location_hours: Object.values(locations).flatMap((l) =>
      OFFICE_DAYS.map((wd) => ({
        location_id: l.id,
        weekday: wd,
        open_minute: l.open,
        close_minute: l.close,
      })),
    ),
    location_closures: closedDays.flatMap(([day, note]) =>
      Object.values(locations).map((l) => ({
        id: random.uuid(),
        location_id: l.id,
        closed_on: day,
        note,
        created_at: iso(SETUP_AT),
        created_by: operator.id,
      })),
    ),
    provider_hours: Object.entries(g.clinic.hours).flatMap(([k, days]) =>
      Object.entries(days).map(([wd, [loc, open, close]]) => ({
        id: random.uuid(),
        provider_id: providers[k].id,
        location_id: locations[loc].id,
        weekday: +wd,
        open_minute: open,
        close_minute: close,
        valid_from: "2026-01-05",
      })),
    ),
    provider_time_exceptions: [
      {
        id: random.uuid(),
        provider_id: providers[awayKey].id,
        location_id: null,
        kind: "unavailable",
        reason: "conference",
        starts_at: iso(ny(awayDates[0], 0)),
        ends_at: iso(ny(addDays(awayDates.at(-1), 1), 0)),
      },
    ],
    patients: patients.map((p) => ({
      id: p.id,
      name: p.name,
      date_of_birth: p.dob,
      phone: p.phone,
      email: p.email,
      version: 1,
      created_at: iso(p.created_at),
      updated_at: iso(p.created_at),
      created_by: p.by.id,
      updated_by: p.by.id,
    })),
    requests: requests.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      location: r.location,
      preferred_time: r.preferred_time,
      message: r.message,
      locale: r.locale,
      source_path: r.source_path,
      status: r.status,
      created_at: iso(r.created_at),
      updated_at: iso(r.updated_at),
      follow_up_at: ts(r.follow_up_at),
      record_handoff_at: ts(r.record_handoff_at),
      closed_at: ts(r.closed_at),
      closure_reason: r.closure_reason,
      appointment_at: ts(r.appointment_at),
      version: r.version,
    })),
    request_transitions: transitions.map((t) => ({
      ...t,
      occurred_at: iso(t.occurred_at),
      appointment_at: ts(t.appointment_at),
      provenance: "staff",
    })),
    request_events: events.map((e) => ({
      id: e.id,
      request_id: e.request_id,
      type: e.type,
      status: "recorded",
      meta: e.meta,
      created_at: iso(e.at),
      updated_at: iso(e.at),
    })),
    patient_request_links: links.map((l) => ({ ...l, linked_at: iso(l.linked_at) })),
    appointments: appts.map((a) => ({
      id: a.id,
      patient_id: a.patient.id,
      provider_id: providers[a.provider].id,
      location_id: locations[a.loc].id,
      appointment_type_id: a.type.id,
      source_request_id: a.request?.r.id ?? null,
      starts_at: iso(a.startsAt),
      ends_at: iso(a.endsAt),
      duration_minutes: a.type.dur,
      buffer_before_minutes: 0,
      buffer_after_minutes: a.type.after,
      reserved_from: iso(a.startsAt),
      reserved_until: iso(a.endsAt + a.type.after * MIN),
      status: a.status,
      reason: a.reason,
      version: a.steps.length,
      created_at: iso(a.created_at),
      updated_at: iso(a.steps.at(-1).at),
      created_by: a.created_by.id,
      updated_by: a.steps.at(-1).by.id,
      request_workflow_managed: Boolean(a.request),
    })),
    patient_clinical_records: records.map((r) => ({
      id: r.id,
      patient_id: r.patient_id,
      appointment_id: r.appointment_id,
      record_kind: "note",
      title: r.title,
      service_date: r.service_date,
      note_text: r.note_text,
      status: r.status,
      version: r.version,
      author_id: r.author.id,
      author_email: r.author.email,
      signed_by: r.signed_at ? r.author.id : null,
      signed_by_email: r.signed_at ? r.author.email : null,
      signed_at: ts(r.signed_at),
      created_at: iso(r.created_at),
      updated_at: iso(r.signed_at ?? r.created_at),
      updated_by: r.author.id,
    })),
    patient_billing_accounts: accounts.map((a) => ({
      ...a,
      currency: "USD",
      created_at: iso(a.created_at),
      updated_at: iso(a.updated_at),
    })),
    patient_billing_entries: entries.map((e) => ({
      id: e.id,
      patient_id: e.patient_id,
      appointment_id: e.appointment_id,
      kind: e.kind,
      amount_cents: e.amount_cents,
      resulting_balance_cents: e.resulting_balance_cents,
      version: e.version,
      description: e.description,
      service_date: e.service_date ?? null,
      payment_method: e.payment_method ?? null,
      actor_id: operator.id,
      actor_email: operator.email,
      occurred_at: iso(e.at),
    })),
  };

  // History the database derives from the inserted rows (see sql.mjs).
  const history = {
    patientRequests: patients
      .filter((p) => p.requestId)
      .map((p) => ({ patient_id: p.id, request_id: p.requestId })),
    appointmentSteps: appts.flatMap((a) =>
      a.steps.map((s, i) => {
        const first = i === 0 && a.request;
        return {
          appointment_id: a.id,
          version: i + 1,
          command: s.command,
          actor_id: s.by.id,
          actor_email: s.by.email,
          occurred_at: iso(s.at),
          patch: {
            status: s.status,
            reason: s.reason,
            version: i + 1,
            updated_at: iso(s.at),
            updated_by: s.by.id,
            ...s.slot,
          },
          request_id: first ? a.request.r.id : null,
          request_before: first ? a.request.before : null,
          request_after_version: first ? a.request.version : null,
          request_transition_id: first ? a.request.transitionId : null,
        };
      }),
    ),
    settingsChanges: settingsChanges(g, rows),
    signIns: signIns(g),
    printPackets: printPackets(g),
    staffRequests: requests
      .filter((r) => r.staffOrigin)
      .map((r) => ({ id: r.id, creator_email: r.creator.email, created_at: iso(r.created_at) })),
  };

  return {
    meta: { seed: String(seed), now: iso(NOW), today: TODAY, start: g.START, end: g.END },
    staff: { operator, clinicians: roster.map((c) => staff[c.key]) },
    rows,
    history,
  };
}

/** Counts that describe a dataset; `reset` compares them with the live branch. */
export function summarize(data) {
  const { rows, meta } = data;
  const countBy = (list, field) =>
    list.reduce((acc, row) => ({ ...acc, [row[field]]: (acc[row[field]] ?? 0) + 1 }), {});
  const now = Date.parse(meta.now);
  return {
    ...meta,
    tables: Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, v.length])),
    appointmentsByStatus: countBy(rows.appointments, "status"),
    appointmentsToday: rows.appointments.filter(
      (a) => nyDate(Date.parse(a.starts_at)) === meta.today,
    ).length,
    appointmentsNext7Days: rows.appointments.filter((a) => {
      const t = Date.parse(a.starts_at);
      return t > now && t < now + 7 * DAY;
    }).length,
    requestsByStatus: countBy(rows.requests, "status"),
    signedNotes: rows.patient_clinical_records.filter((r) => r.status === "signed").length,
    activity: {
      appointmentCommands: countBy(data.history.appointmentSteps, "command"),
      settingsChanges: countBy(data.history.settingsChanges, "command"),
      signIns: data.history.signIns.length,
      printPackets: data.history.printPackets.length,
    },
  };
}
