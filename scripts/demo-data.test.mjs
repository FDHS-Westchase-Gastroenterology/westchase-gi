import assert from "node:assert/strict";
import test from "node:test";

import { infusionNurse, nursePractitioners, physicians } from "@/lib/providers";

import { checkDemoData } from "./demo-data/checks.mjs";
import { nyDate, nyMinute, weekday } from "./demo-data/context.mjs";
import { generateDemoData } from "./demo-data/generate.mjs";
import { clinicianRoster } from "./demo-data/roster.mjs";
import { resetSql } from "./demo-data/sql.mjs";

const staff = {
  operator: {
    id: "00000000-0000-4000-8000-000000000000",
    email: "front.desk@preview.westchase.test",
  },
  clinicians: Object.fromEntries(
    clinicianRoster().map((c, i) => [
      c.key,
      `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    ]),
  ),
};
const generate = (seed, now) => generateDemoData({ seed, now: Date.parse(now), staff });
const data = generate("westchase-demo-v1", "2026-10-02T20:46:08Z");
const clone = () => structuredClone(data);

test("the dataset meets the bar at different reference times", () => {
  assert.deepEqual(checkDemoData(data), []);
  // A Monday morning, a Saturday, the day before Thanksgiving, and a clock months later.
  for (const now of [
    "2026-10-05T12:05:00Z",
    "2026-10-10T15:00:00Z",
    "2026-11-25T21:30:00Z",
    "2027-03-15T16:00:00Z",
  ])
    assert.deepEqual(checkDemoData(generate("westchase-demo-v1", now)), [], now);
});

/** What the Schedule's day view shows for the reference day, read back from the rows. */
function today(d, now) {
  const ms = Date.parse(now);
  const date = nyDate(ms);
  const minute = (v) => nyMinute(Date.parse(v));
  const away = new Set(
    d.rows.provider_time_exceptions
      .filter((e) => e.kind === "unavailable" && nyDate(Date.parse(e.starts_at)) <= date)
      .filter((e) => date < nyDate(Date.parse(e.ends_at)))
      .map((e) => e.provider_id),
  );
  const hours = new Map(
    d.rows.provider_hours
      .filter((h) => h.weekday === weekday(date) && !away.has(h.provider_id))
      .map((h) => [h.provider_id, h]),
  );
  const visits = d.rows.appointments.filter(
    (a) => a.status !== "cancelled" && nyDate(Date.parse(a.starts_at)) === date,
  );
  const shortest = Math.min(...d.rows.appointment_types.map((t) => t.duration_minutes));
  // An open time starts on the quarter hour after the clock and fits the hours and the visits.
  const hasOpen = [...hours.values()].some((h) => {
    const taken = visits
      .filter((a) => a.provider_id === h.provider_id)
      .map((a) => [minute(a.reserved_from), minute(a.reserved_until)]);
    for (let m = h.open_minute; m + shortest <= h.close_minute; m += 15)
      if (m > nyMinute(ms) && !taken.some(([a, b]) => m < b && m + shortest > a)) return true;
    return false;
  });
  return {
    working: hours.size,
    off: d.rows.scheduling_providers.length - hours.size,
    statuses: new Set(visits.map((a) => a.status)),
    hasOpen,
  };
}

test("today, while the clinic is open, has every state the day view shows", () => {
  /* Wednesday late morning (the Figma day) and over lunch, Thursday's second hour, a Monday's
     first hour and a Friday afternoon. Nobody has finished a visit in the first 45 minutes. */
  for (const now of [
    "2026-09-16T15:45:00Z",
    "2026-09-16T16:05:00Z",
    "2026-09-17T13:05:00Z",
    "2026-10-05T12:50:00Z",
    "2026-10-02T18:20:00Z",
  ]) {
    const d = generate("westchase-demo-v1", now);
    const day = today(d, now);
    assert.ok(day.working >= 3, `${now}: ${day.working} working`);
    assert.ok(day.off >= 1, `${now}: nobody off`);
    for (const status of ["checked_in", "completed"])
      assert.ok(day.statuses.has(status), `${now}: no ${status} visit`);
    assert.ok(day.hasOpen, `${now}: no open time`);
    assert.deepEqual(checkDemoData(d), [], now);
  }
  // After the last provider closes, the finished day still shows who was seen.
  assert.ok(today(data, "2026-10-02T20:46:08Z").statuses.has("completed"));
});

test("a seed and reference time always produce the same reset", () => {
  const again = generate("westchase-demo-v1", "2026-10-02T20:46:08Z");
  assert.equal(resetSql(again), resetSql(data));
  assert.notEqual(resetSql(generate("another-seed", "2026-10-02T20:46:08Z")), resetSql(data));
});

test("clinicians are the practice's roster from providers.ts", () => {
  const names = data.rows.staff_profiles.map((p) => p.display_name);
  for (const p of physicians) assert.ok(names.includes(`Dr. ${p.name}`), p.name);
  for (const p of nursePractitioners.individuals)
    assert.ok(names.includes(`${p.name}, APRN`), p.name);
  assert.ok(names.includes(`${infusionNurse.name}, RN`));
  assert.equal(data.rows.scheduling_providers.length, names.length);
  const authors = new Set(data.rows.patient_clinical_records.map((r) => r.author_email));
  assert.ok([...authors].every((email) => data.staff.clinicians.some((c) => c.email === email)));
});

test("the dataset covers every state a demo walks through", () => {
  const statuses = new Set(data.rows.appointments.map((a) => a.status));
  for (const status of ["scheduled", "completed", "cancelled", "no_show"])
    assert.ok(statuses.has(status), status);
  const requests = new Set(data.rows.requests.map((r) => r.status));
  for (const status of ["new", "contacted", "booked", "closed"])
    assert.ok(requests.has(status), status);
  assert.ok(new Set(data.rows.requests.map((r) => r.locale)).size >= 3);
  assert.ok(data.rows.patient_clinical_records.some((r) => r.status === "draft"));
  assert.ok(data.rows.patient_billing_accounts.some((a) => a.balance_cents > 0));
  assert.ok(data.rows.patients.length >= 600);
});

test("the bar catches data a demo audience would not believe", () => {
  const cases = [
    ["fixture name", (d) => (d.rows.patients[0].name = "TEST Patient"), /placeholder|real name/],
    ["real email", (d) => (d.rows.patients[1].email = "maria.santos@gmail.com"), /non-mock email/],
    ["real phone", (d) => (d.rows.patients[2].phone = "8139724410"), /phone outside/],
    ["staff surname", (d) => (d.rows.patients[3].name = "Rosa Chang"), /staff surname/],
    ["duplicate name", (d) => (d.rows.patients[4].name = d.rows.patients[5].name), /share a name/],
    [
      "filler note",
      (d) => (d.rows.request_events.find((e) => e.type === "note").meta.text = "Lorem ipsum"),
      /placeholder/,
    ],
    [
      "gendered note",
      (d) => (d.rows.request_events.find((e) => e.type === "note").meta.text = "Reached her."),
      /assumes a gender/,
    ],
  ];
  for (const [name, mutate, expected] of cases) {
    const d = clone();
    mutate(d);
    assert.match(checkDemoData(d).join("\n"), expected, name);
  }
});

test("the bar catches data the database or portal would never write", () => {
  const cases = [
    [
      "double booking",
      (d) => {
        const [a, b] = d.rows.appointments.filter(
          (x) =>
            x.status === "scheduled" &&
            x.provider_id === d.rows.appointments.find((y) => y.status === "scheduled").provider_id,
        );
        Object.assign(b, {
          starts_at: a.starts_at,
          reserved_from: a.reserved_from,
          reserved_until: a.reserved_until,
        });
      },
      /double-booked/,
    ],
    [
      "running balance",
      (d) => (d.rows.patient_billing_entries[0].resulting_balance_cents += 1),
      /running balance/,
    ],
    [
      "partial signature",
      (d) => (d.rows.patient_clinical_records.find((r) => r.signed_at).signed_by = null),
      /partly signed/,
    ],
    [
      "request version",
      (d) => (d.rows.requests.find((r) => r.status === "booked").version += 1),
      /version disagrees/,
    ],
    [
      "millisecond timestamp",
      (d) => (d.rows.patients[0].created_at = "2026-09-01T12:00:00.123Z"),
      /whole-second/,
    ],
  ];
  for (const [name, mutate, expected] of cases) {
    const d = clone();
    mutate(d);
    assert.match(checkDemoData(d).join("\n"), expected, name);
  }
});
