import assert from "node:assert/strict";
import test from "node:test";

import { openLength, scheduleDayFor } from "./schedule-day-model.ts";
import { appointmentAt, dayHref, dayTitle, parseDay, weekStartOf } from "./week-calendar.ts";

const chang = "98092b3a-2747-4d10-933e-b3f06dd5f8d9";
const awad = "3f1c2b8e-6c1d-4a51-9a3e-0e6b2e9b8a11";
const tampa = "5b0e7c1a-2d3f-4a5b-8c6d-7e8f9a0b1c2d";

/* Wednesday, September 16, 2026 (EDT, -04:00). Dr. Chang works 8–12 and
   1–4 in Tampa; Dr. Awad works 9–3 in Tampa. Today is the 16th at 11:45. */
function visit(id, from, until, status, version = 1) {
  return {
    id,
    startsAt: `2026-09-16T${from}:00-04:00`,
    endsAt: `2026-09-16T${until}:00-04:00`,
    status,
    appointmentType: "Follow-up",
    patientName: `Patient ${id.slice(0, 4)}`,
    patientListName: `${id.slice(0, 4)}, Patient`,
    version,
  };
}

function day(overrides = {}) {
  return {
    observedAt: "2026-09-16T15:45:00.000Z",
    today: "2026-09-16",
    date: "2026-09-16",
    timeZone: "America/New_York",
    activeProviderCount: 3,
    referenceType: {
      id: "0d1e2f3a-4b5c-4d6e-8f90-a1b2c3d4e5f6",
      name: "Consultation",
      durationMinutes: 30,
      version: 2,
    },
    providers: [
      {
        id: chang,
        name: "Dr. John Chang",
        working: [
          {
            from: "2026-09-16T08:00:00-04:00",
            until: "2026-09-16T12:00:00-04:00",
            locationId: tampa,
            locationName: "Tampa",
          },
          {
            from: "2026-09-16T13:00:00-04:00",
            until: "2026-09-16T16:00:00-04:00",
            locationId: tampa,
            locationName: "Tampa",
          },
        ],
        appointments: [
          visit("a1a1a1a1-0000-4000-8000-000000000001", "08:00", "09:00", "completed"),
          visit("a2a2a2a2-0000-4000-8000-000000000002", "11:00", "11:30", "checked_in"),
          visit("a3a3a3a3-0000-4000-8000-000000000003", "13:00", "14:00", "scheduled", 4),
        ],
        open: [
          {
            startsAt: "2026-09-16T14:00:00-04:00",
            endsAt: "2026-09-16T15:00:00-04:00",
            locationId: tampa,
            locationName: "Tampa",
          },
        ],
        seen: null,
        openCount: 2,
      },
      {
        id: awad,
        name: "Dr. Mariam Awad",
        working: [
          {
            from: "2026-09-16T09:00:00-04:00",
            until: "2026-09-16T15:00:00-04:00",
            locationId: tampa,
            locationName: "Tampa",
          },
        ],
        appointments: [],
        open: [],
        seen: null,
        openCount: 0,
      },
    ],
    off: [{ id: "e1e2e3e4-0000-4000-8000-0000000000aa", name: "Dr. Alfredo Mendoza" }],
    ...overrides,
  };
}

test("the day's title, links and hours come from the read", () => {
  const view = scheduleDayFor(day());
  assert.equal(view.title, "Wed, September 16");
  assert.equal(view.isToday, true);
  assert.equal(view.previous, "/admin/schedule?view=day&date=2026-09-15");
  assert.equal(view.next, "/admin/schedule?view=day&date=2026-09-17");
  assert.equal(view.todayHref, "/admin/schedule?view=day");
  assert.equal(view.weekHref, "/admin/schedule?view=week&week=2026-09-13");
  assert.equal(view.monthHref, "/admin/schedule?month=2026-09");
  assert.equal(view.start, 8 * 60);
  assert.equal(view.end, 16 * 60);
  assert.deepEqual(
    view.hours.map((hour) => hour.label),
    ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM"],
  );
});

test("each provider is a column with their office and count", () => {
  const [changColumn, awadColumn] = scheduleDayFor(day()).columns;
  assert.equal(changColumn.place, "Tampa");
  assert.deepEqual(changColumn.count, { value: "2", word: "open" });
  assert.deepEqual(changColumn.shades, [{ top: 240, height: 60 }]);
  assert.equal(changColumn.label, "Dr. John Chang, Tampa, 2 open");
  assert.deepEqual(awadColumn.count, { value: null, word: "Full" });
  assert.deepEqual(awadColumn.shades, [
    { top: 0, height: 60 },
    { top: 420, height: 60 },
  ]);
});

test("a block's tone, tag and Check in window follow its status", () => {
  const cells = scheduleDayFor(day()).cells.filter((cell) => cell.kind === "appointment");
  const [done, here, booked] = cells;
  assert.equal(done.tone, "done");
  assert.equal(done.tag, "Done");
  assert.equal(done.checkIn, null);
  assert.equal(here.tone, "here");
  assert.equal(here.tag, "Checked in");
  assert.equal(booked.tone, "booked");
  assert.equal(booked.tag, null);
  assert.equal(booked.version, 4);
  assert.equal(booked.line, "1:00 – 2:00 PM · Follow-up");
  assert.deepEqual(booked.checkIn, {
    from: Date.parse("2026-09-16T12:00:00-04:00"),
    until: Date.parse("2026-09-16T14:00:00-04:00"),
  });
  assert.equal(booked.detail, "Wed, Sep 16 at 1:00 PM · Dr. John Chang, Tampa");
  assert.equal(done.label, "Patient a1a1, follow-up, 8:00 AM to 9:00 AM, done, Dr. John Chang");
});

test("open time reads its real length and books with its detail", () => {
  const open = scheduleDayFor(day()).cells.find((cell) => cell.kind === "open");
  assert.equal(open.time, "2:00 PM");
  assert.equal(open.length, "1 hour open");
  assert.equal(open.top, 360);
  assert.equal(open.height, 60);
  assert.equal(open.detail, "Wed, Sep 16 at 2:00 PM · Dr. John Chang, Tampa");
  assert.equal(open.label, "Open, 2:00 PM, 1 hour, Dr. John Chang");
});

test("cells read top to bottom, then by column", () => {
  const cells = scheduleDayFor(day()).cells;
  for (let index = 1; index < cells.length; index += 1)
    assert.ok(
      cells[index - 1].top < cells[index].top ||
        (cells[index - 1].top === cells[index].top && cells[index - 1].lane <= cells[index].lane),
    );
});

test("providers off the day are named once", () => {
  assert.equal(scheduleDayFor(day()).offLine, "Dr. Alfredo Mendoza is not scheduled today");
  const two = scheduleDayFor(
    day({
      date: "2026-09-17",
      off: [
        { id: chang, name: "Dr. John Chang" },
        { id: awad, name: "Dr. Mariam Awad" },
      ],
    }),
  );
  assert.equal(two.offLine, "Dr. John Chang and Dr. Mariam Awad are not scheduled this day");
  assert.equal(scheduleDayFor(day({ off: [] })).offLine, null);
});

test("a day nobody works keeps the default hours", () => {
  const view = scheduleDayFor(day({ providers: [], activeProviderCount: 0, off: [] }));
  assert.equal(view.start, 8 * 60);
  assert.equal(view.end, 17 * 60);
  assert.deepEqual(view.columns, []);
  assert.deepEqual(view.cells, []);
});

test("open lengths read in hours and minutes", () => {
  assert.equal(openLength(30), "30 min open");
  assert.equal(openLength(60), "1 hour open");
  assert.equal(openLength(120), "2 hours open");
  assert.equal(openLength(90), "1 hour 30 min open");
});

test("the day's calendar helpers", () => {
  assert.equal(parseDay("2026-09-16"), "2026-09-16");
  assert.equal(parseDay("1999-09-16"), null);
  assert.equal(parseDay("2026-02-30"), null);
  assert.equal(parseDay(undefined), null);
  assert.equal(dayTitle("2026-09-16"), "Wed, September 16");
  assert.equal(dayHref("2026-09-16"), "/admin/schedule?view=day&date=2026-09-16");
  assert.equal(weekStartOf("2026-09-16"), "2026-09-13");
  assert.equal(weekStartOf("2026-09-13"), "2026-09-13");
  assert.equal(appointmentAt("2026-09-16T18:00:00Z"), "Wed, Sep 16 at 2:00 PM");
});
