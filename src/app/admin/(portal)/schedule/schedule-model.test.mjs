import assert from "node:assert/strict";
import test from "node:test";

import {
  parseMonth,
  practiceMonth,
  scheduleMonthFor,
  shiftMonth,
  toneFor,
} from "./schedule-model.ts";

const id = "98092b3a-2747-4d10-933e-b3f06dd5f8d9";

function summary(days) {
  return {
    ok: true,
    observedAt: "2026-09-16T13:00:00+00:00",
    today: "2026-09-16",
    month: "2026-09",
    timeZone: "America/New_York",
    referenceType: {
      id,
      name: "TEST Follow-up",
      version: 1,
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
    },
    days,
  };
}

/* September 2026 starts on a Tuesday. Weekends are closed, the 7th is a
   closed Monday, days before the 16th are past, the 17th is full. */
function september() {
  return Array.from({ length: 30 }, (_, index) => {
    const date = `2026-09-${String(index + 1).padStart(2, "0")}`;
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (weekday === 0 || weekday === 6 || index === 6)
      return { date, status: "closed", open: null, bookedShare: null, seen: null };
    if (index < 15)
      return { date, status: "past", open: null, bookedShare: null, seen: index === 1 ? 0 : 11 };
    if (index === 16)
      return {
        date,
        status: "full",
        open: 0,
        bookedShare: 1,
        seen: null,
        booked: 14,
        capacity: 14,
        providers: [{ id, name: "TEST Chang", locations: ["Tampa"], open: 0, firstOpen: [] }],
      };
    return {
      date,
      status: "open",
      open: 4,
      bookedShare: 10 / 14,
      seen: null,
      booked: 10,
      capacity: 14,
      providers: [
        {
          id,
          name: "TEST Chang",
          locations: ["Tampa", "Lutz"],
          open: 2,
          firstOpen: [`${date}T13:30:00+00:00`, `${date}T18:00:00+00:00`],
        },
        { id, name: "TEST Awad", locations: ["Tampa"], open: 0, firstOpen: [] },
      ],
    };
  });
}

test("the month view lays the practice month out Sunday first with closed weekends narrowed", () => {
  const view = scheduleMonthFor(summary(september()));
  assert.equal(view.title, "September 2026");
  assert.equal(view.previous, "2026-08");
  assert.equal(view.next, "2026-10");
  assert.deepEqual(
    view.columns.map((column) => [column.label, column.narrow]),
    [
      ["Sun", true],
      ["Mon", false],
      ["Tue", false],
      ["Wed", false],
      ["Thu", false],
      ["Fri", false],
      ["Sat", true],
    ],
  );
  assert.equal(view.weeks.length, 5);
  assert.deepEqual(
    view.weeks[0].slice(0, 3).map((cell) => cell.kind),
    ["blank", "blank", "past"],
  );
  assert.equal(view.weeks[4].at(-1).kind, "blank");
  assert.ok(view.weeks.every((week) => week.length === 7));
});

test("each day names its date and state in the words staff hear", () => {
  const cells = scheduleMonthFor(summary(september())).weeks.flat();
  const on = (day) => cells.find((cell) => cell.kind !== "blank" && cell.day === day);
  assert.equal(on(1).label, "Tuesday, September 1: 11 seen");
  assert.equal(on(2).text, "No visits");
  assert.equal(on(2).label, "Wednesday, September 2: no visits");
  assert.equal(on(7).label, "Monday, September 7: closed");
  assert.equal(on(16).label, "Wednesday, September 16, today: 4 open");
  assert.equal(on(16).today, true);
  assert.equal(on(17).label, "Thursday, September 17: full");
  assert.equal(on(17).tone, "full");
  assert.equal(on(18).tone, "mid");
});

test("the day preview reads the open count, the booked share and each provider's first openings, and opens the day", () => {
  const cells = scheduleMonthFor(summary(september())).weeks.flat();
  const day = cells.find((cell) => cell.kind === "future" && cell.day === 22);
  assert.deepEqual(day.preview, {
    heading: "Tuesday, September 22",
    href: "/admin/schedule?view=day&date=2026-09-22",
    summary: "4 open · 10 of 14 booked",
    providers: [
      {
        id,
        name: "TEST Chang",
        locations: "Tampa, Lutz",
        status: "2 open",
        full: false,
        times: "9:30 AM · 2:00 PM",
      },
      { id, name: "TEST Awad", locations: "Tampa", status: "Full", full: true, times: "" },
    ],
  });
  const full = cells.find((cell) => cell.kind === "future" && cell.day === 17);
  assert.equal(full.preview.summary, "Full · 14 of 14 booked");
});

test("tints step at half and three quarters booked", () => {
  assert.equal(toneFor("open", 0), "low");
  assert.equal(toneFor("open", 0.49), "low");
  assert.equal(toneFor("open", 0.5), "mid");
  assert.equal(toneFor("open", 0.75), "high");
  assert.equal(toneFor("full", 0.96), "full");
});

test("month parameters outside the schedule's range fall back", () => {
  assert.equal(parseMonth("2026-09"), "2026-09");
  for (const value of ["2026-13", "2026-9", "1999-12", ["2026-09"], undefined])
    assert.equal(parseMonth(value), null);
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2000-01", -1), null);
  // 23:30 on September 30 in New York is already October in UTC.
  assert.equal(practiceMonth(new Date("2026-10-01T03:30:00Z")), "2026-09");
});
