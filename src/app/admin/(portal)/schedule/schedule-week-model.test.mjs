import assert from "node:assert/strict";
import test from "node:test";

import { scheduleWeekFor } from "./schedule-week-model.ts";
import {
  appointmentWhen,
  initialsOf,
  parseProviderIds,
  parseWeekStart,
  practiceMinute,
  practiceWeekStart,
  shiftWeek,
  surnameOf,
  timeRange,
  weekHref,
  weekProviderIds,
  weekRange,
} from "./week-calendar.ts";
import { nowOffset } from "./week-hours.ts";

const chang = "98092b3a-2747-4d10-933e-b3f06dd5f8d9";
const awad = "3f1c2b8e-6c1d-4a51-9a3e-0e6b2e9b8a11";
const ricardo = "c7a1d2e3-4b5c-4d6e-8f90-1a2b3c4d5e6f";

/* September 13–19, 2026 (EDT, -04:00). Weekdays run 8–12 and 1–4; the
   weekend has no hours. Today is Wednesday the 16th at 11:45. */
function weekday(date, overrides = {}) {
  return {
    date,
    working: [
      { from: `${date}T12:00:00Z`, until: `${date}T16:00:00Z` },
      { from: `${date}T17:00:00Z`, until: `${date}T20:00:00Z` },
    ],
    appointments: [],
    open: [],
    seen: null,
    openCount: null,
    ...overrides,
  };
}

function weekend(date) {
  return { date, working: [], appointments: [], open: [], seen: null, openCount: null };
}

function appointment(id, date, from, until, status, overrides = {}) {
  return {
    id,
    startsAt: `${date}T${from}:00Z`,
    endsAt: `${date}T${until}:00Z`,
    status,
    appointmentType: "Follow-up",
    patientName: "TEST Ellen Byrne",
    patientListName: "Byrne",
    ...overrides,
  };
}

function provider(id, name, days) {
  return { id, name, days };
}

function changWeek() {
  return [
    weekend("2026-09-13"),
    weekday("2026-09-14", {
      seen: 8,
      appointments: [
        appointment(
          "a0000000-0000-4000-8000-000000000001",
          "2026-09-14",
          "12:00",
          "13:00",
          "no_show",
        ),
        appointment(
          "a0000000-0000-4000-8000-000000000002",
          "2026-09-14",
          "13:00",
          "13:30",
          "completed",
        ),
      ],
    }),
    weekday("2026-09-15", { seen: 10 }),
    weekday("2026-09-16", {
      openCount: 2,
      appointments: [
        appointment(
          "a0000000-0000-4000-8000-000000000003",
          "2026-09-16",
          "15:00",
          "16:00",
          "checked_in",
          {
            appointmentType: "New patient",
            patientName: "TEST Ravi Patel",
            patientListName: "Patel",
          },
        ),
        appointment(
          "a0000000-0000-4000-8000-000000000004",
          "2026-09-16",
          "17:00",
          "17:30",
          "scheduled",
        ),
        appointment(
          "a0000000-0000-4000-8000-000000000005",
          "2026-09-16",
          "12:00",
          "12:30",
          "scheduled",
        ),
        appointment(
          "a0000000-0000-4000-8000-000000000006",
          "2026-09-16",
          "15:00",
          "15:30",
          "no_show",
        ),
      ],
      open: [
        {
          startsAt: "2026-09-16T17:30:00Z",
          endsAt: "2026-09-16T18:00:00Z",
          locationId: "b0000000-0000-4000-8000-000000000001",
          locationName: "Tampa office",
        },
      ],
    }),
    weekday("2026-09-17", { openCount: 0 }),
    weekday("2026-09-18", { openCount: 7 }),
    weekend("2026-09-19"),
  ];
}

function schedule(providers) {
  return {
    ok: true,
    observedAt: "2026-09-16T15:45:00Z",
    today: "2026-09-16",
    weekStart: "2026-09-13",
    timeZone: "America/New_York",
    activeProviderCount: 8,
    referenceType: { id: chang, name: "Follow-up", durationMinutes: 30, version: 1 },
    providers,
  };
}

test("a week is a Sunday in range, and moves a week at a time", () => {
  assert.equal(parseWeekStart("2026-09-13"), "2026-09-13");
  assert.equal(parseWeekStart("2026-09-14"), null);
  assert.equal(parseWeekStart("1999-12-26"), null);
  assert.equal(parseWeekStart(["2026-09-13"]), null);
  assert.equal(shiftWeek("2026-09-27", 1), "2026-10-04");
  assert.equal(shiftWeek("2026-09-13", -1), "2026-09-06");
  assert.equal(practiceWeekStart(new Date("2026-09-17T02:00:00Z")), "2026-09-13");
  // Saturday 11 PM in Tampa is already Sunday in UTC.
  assert.equal(practiceWeekStart(new Date("2026-09-20T03:30:00Z")), "2026-09-13");
});

test("the range names both months across a boundary", () => {
  assert.equal(weekRange("2026-09-13"), "September 13 – 19");
  assert.equal(weekRange("2026-09-27"), "September 27 – October 3");
});

test("provider ids are well-formed, distinct and in order", () => {
  assert.deepEqual(parseProviderIds(`${awad},${chang},${awad},nope`), [awad, chang]);
  assert.deepEqual(parseProviderIds(undefined), []);
  assert.equal(
    weekHref("2026-09-13", [chang, awad]),
    `/admin/schedule?view=week&week=2026-09-13&providers=${chang},${awad}`,
  );
  assert.equal(weekHref(null, [chang]), `/admin/schedule?view=week&provider=${chang}`);
});

test("names give surnames and initials", () => {
  assert.equal(surnameOf("Dr. John Chang"), "Chang");
  assert.equal(surnameOf("Yanessa Ricardo, APRN"), "Ricardo");
  assert.equal(initialsOf("Dr. John Chang"), "JC");
  assert.equal(initialsOf("Dana Whitfield, PA-C"), "DW");
});

test("times read in the practice's zone, across the November clock change", () => {
  assert.equal(practiceMinute("2026-09-16T15:45:00Z"), 11 * 60 + 45);
  // Sunday November 1, 2026 falls back: 9 AM is 14:00Z after the change.
  assert.equal(practiceMinute("2026-11-02T14:00:00Z"), 9 * 60);
  assert.equal(practiceMinute("2026-10-30T13:00:00Z"), 9 * 60);
  assert.equal(timeRange("2026-09-16T17:00:00Z", "2026-09-16T17:30:00Z"), "1:00 – 1:30 PM");
  assert.equal(timeRange("2026-09-16T15:30:00Z", "2026-09-16T16:00:00Z"), "11:30 AM – 12:00 PM");
  assert.equal(
    appointmentWhen("2026-09-16T17:00:00Z", "2026-09-16T17:30:00Z"),
    "Wed, Sep 16 · 1:00 – 1:30 PM",
  );
});

test("one provider: strips, hours, lunch, counts and the title", () => {
  const view = scheduleWeekFor(schedule([provider(chang, "Dr. John Chang", changWeek())]));
  assert.equal(view.compare, false);
  assert.equal(view.title, "Dr. John Chang");
  assert.equal(view.subtitle, null);
  assert.equal(view.triggerLabel, "Dr. John Chang provider, change");
  assert.equal(view.range, "September 13 – 19");
  assert.equal(view.start, 8 * 60);
  assert.equal(view.end, 16 * 60);
  assert.deepEqual(
    view.hours.map((hour) => hour.label),
    ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM"],
  );
  assert.deepEqual(
    view.columns.map((column) => column.kind),
    ["strip", "day", "day", "day", "day", "day", "strip"],
  );
  const [sunday, monday, tuesday, wednesday, thursday, friday] = view.columns;
  assert.equal(sunday.kind === "strip" && sunday.hint, "No hours Sunday");
  assert.deepEqual(monday.count, { value: "8", word: "seen" });
  assert.deepEqual(tuesday.count, { value: "10", word: "seen" });
  assert.deepEqual(wednesday.count, { value: "2", word: "open" });
  assert.deepEqual(thursday.count, { value: null, word: "Full" });
  assert.deepEqual(friday.count, { value: "7", word: "open" });
  assert.equal(wednesday.today, true);
  assert.equal(wednesday.label, "Wednesday, September 16, today: 2 open");
  // Lunch, 12 to 1, is the only shade inside the day.
  assert.deepEqual(monday.lanes[0].shades, [{ top: 240, height: 60 }]);
});

test("cells take their state from the read's clock and read as one sentence", () => {
  const view = scheduleWeekFor(schedule([provider(chang, "Dr. John Chang", changWeek())]));
  const monday = view.columns[1];
  const wednesday = view.columns[3];
  assert.equal(monday.kind, "day");
  assert.equal(wednesday.kind, "day");
  const [noShow, completed] = monday.cells;
  assert.equal(noShow.state, "past");
  assert.equal(noShow.status, "No-show");
  assert.equal(completed.state, "past");
  assert.equal(completed.status, null);

  // Reading order: by time, the 8 AM visit first.
  const kinds = wednesday.cells.map((cell) =>
    cell.kind === "open" ? `open ${cell.time}` : `${cell.state} ${cell.top}`,
  );
  assert.deepEqual(kinds, ["past 0", "here 180", "past 180", "upcoming 300", "open 1:30 PM"]);
  const here = wednesday.cells[1];
  assert.equal(here.kind, "appointment");
  assert.equal(here.status, "Here");
  assert.equal(here.short, false);
  assert.equal(here.label, "TEST Ravi Patel, new patient, 11:00 AM to 12:00 PM, here");
  assert.deepEqual(here.tooltip, [
    "TEST Ravi Patel · Checked in",
    "11:00 AM – 12:00 PM · New patient",
  ]);
  const shortNoShow = wednesday.cells[2];
  assert.equal(shortNoShow.short, true);
  const open = wednesday.cells[4];
  assert.equal(open.kind, "open");
  assert.equal(open.label, "Open, 1:30 PM, 30 minutes");
  assert.deepEqual({ top: open.top, height: open.height }, { top: 330, height: 30 });
});

test("compare: lanes keep their order, an off provider keeps a lane, counts add up", () => {
  const awadWeek = changWeek().map((day) => ({
    ...day,
    appointments: [],
    open: [],
    seen: day.seen === null ? null : 9,
    openCount: day.openCount === null ? null : 3,
  }));
  const ricardoWeek = changWeek().map((day) =>
    day.date === "2026-09-18"
      ? { ...weekend(day.date), openCount: 0 }
      : {
          ...day,
          appointments: [],
          open: [],
          seen: day.seen === null ? null : 0,
          openCount: day.openCount === null ? null : 0,
        },
  );
  const view = scheduleWeekFor(
    schedule([
      provider(chang, "Dr. John Chang", changWeek()),
      provider(awad, "Dr. Amir Awad", awadWeek),
      provider(ricardo, "Yanessa Ricardo, APRN", ricardoWeek),
    ]),
  );
  assert.equal(view.compare, true);
  assert.equal(view.title, "3 providers");
  assert.equal(view.subtitle, "Chang, Awad +1");
  assert.equal(
    view.triggerLabel,
    "Comparing Dr. John Chang, Dr. Amir Awad and Yanessa Ricardo, APRN, providers, change",
  );
  assert.equal(
    view.previous,
    `/admin/schedule?view=week&week=2026-09-06&providers=${chang},${awad},${ricardo}`,
  );
  const monday = view.columns[1];
  const friday = view.columns[5];
  assert.deepEqual(monday.count, { value: "17", word: "seen" });
  assert.deepEqual(friday.count, { value: "10", word: "open" });
  assert.deepEqual(
    friday.lanes.map((lane) => lane.surname),
    ["Chang", "Awad", "Ricardo"],
  );
  assert.equal(friday.lanes[2].off, true);
  assert.equal(friday.lanes[2].offLabel, "Yanessa Ricardo, APRN is off Friday");
  assert.match(friday.label, /Yanessa Ricardo, APRN is off Friday$/u);
  // The weekend is a strip only because every compared provider is off.
  assert.equal(view.columns[0].kind, "strip");
  const wednesday = view.columns[3];
  assert.equal(wednesday.cells[0].label.endsWith(", Dr. John Chang"), true);

  const two = scheduleWeekFor(
    schedule([
      provider(chang, "Dr. John Chang", changWeek()),
      provider(awad, "Dr. Amir Awad", awadWeek),
    ]),
  );
  assert.equal(two.title, "2 providers");
  assert.equal(two.subtitle, "Chang, Awad");
});

test("the now line sits on today's column only", () => {
  const now = Date.parse("2026-09-16T15:45:00Z");
  assert.equal(nowOffset(now, "2026-09-16", 8 * 60, 16 * 60), 225);
  assert.equal(nowOffset(now, "2026-09-15", 8 * 60, 16 * 60), null);
  assert.equal(nowOffset(Date.parse("2026-09-16T21:30:00Z"), "2026-09-16", 8 * 60, 16 * 60), null);
});

test("the week shows two or three compared providers, in the order picked", () => {
  const activeIds = [chang, awad, ricardo];
  assert.deepEqual(
    weekProviderIds({
      activeIds,
      providers: `${ricardo},${chang}`,
      provider: undefined,
      remembered: null,
    }),
    [ricardo, chang],
  );
  assert.deepEqual(
    weekProviderIds({
      activeIds: [chang, awad, ricardo, "0b9e6a52-5f0e-4f1f-9d7c-3c2a1b0e9f88"],
      providers: `${awad},${ricardo},${chang},0b9e6a52-5f0e-4f1f-9d7c-3c2a1b0e9f88`,
      provider: undefined,
      remembered: null,
    }),
    [awad, ricardo, chang],
  );
});

test("a compare list with one active provider falls back to a single week", () => {
  const retired = "0b9e6a52-5f0e-4f1f-9d7c-3c2a1b0e9f88";
  assert.deepEqual(
    weekProviderIds({
      activeIds: [chang, awad],
      providers: `${retired},${awad}`,
      provider: undefined,
      remembered: chang,
    }),
    [chang],
  );
});

test("one provider comes from the link, then the remembered choice, then the first", () => {
  const activeIds = [chang, awad, ricardo];
  assert.deepEqual(
    weekProviderIds({ activeIds, providers: undefined, provider: awad, remembered: ricardo }),
    [awad],
  );
  assert.deepEqual(
    weekProviderIds({ activeIds, providers: undefined, provider: "nobody", remembered: ricardo }),
    [ricardo],
  );
  assert.deepEqual(
    weekProviderIds({
      activeIds,
      providers: undefined,
      provider: undefined,
      remembered: "0b9e6a52-5f0e-4f1f-9d7c-3c2a1b0e9f88",
    }),
    [chang],
  );
  assert.deepEqual(
    weekProviderIds({ activeIds: [], providers: undefined, provider: undefined, remembered: null }),
    [],
  );
});
