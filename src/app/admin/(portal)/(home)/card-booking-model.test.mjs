import assert from "node:assert/strict";
import test from "node:test";

import {
  closedReasons,
  dayAccessibleName,
  dayIsOpen,
  daySummary,
  fullyBooked,
  longDay,
  nearestOpen,
  openBlocks,
  squeezeOptions,
} from "./card-booking-days.ts";
import {
  addMonths,
  bookCommandFor,
  bookingReadout,
  bookingReducer,
  bookingStripLine,
  defaultTypeId,
  initialBooking,
  monthHasNoOpen,
  startWasTaken,
} from "./card-booking-model.ts";

const TYPE = { id: "type-new", name: "New patient", version: 3 };
const RICARDO = "prov-ricardo";
const AWAD = "prov-awad";
const LUTZ = "loc-lutz";
const TAMPA = "loc-tampa";

function start(time) {
  return { startsAt: `2026-09-22T${time}:00-04:00`, time };
}

const BUSY_DAY = {
  date: "2026-09-22",
  past: false,
  open: 4,
  booked: 10,
  capacity: 14,
  providers: [
    {
      providerId: RICARDO,
      providerName: "Yanessa Ricardo, APRN",
      locationId: LUTZ,
      locationName: "Lutz",
      open: [start("09:00"), start("10:30"), start("15:30")],
      booked: 4,
      capacity: 7,
      reason: null,
    },
    {
      providerId: AWAD,
      providerName: "Dr. Amir Awad",
      locationId: TAMPA,
      locationName: "Tampa",
      open: [],
      booked: 6,
      capacity: 6,
      reason: "booked_out",
    },
    {
      providerId: "prov-lee",
      providerName: "Dr. Lee",
      locationId: TAMPA,
      locationName: "Tampa",
      open: [start("11:00")],
      booked: 0,
      capacity: 1,
      reason: null,
    },
  ],
};

const CLOSED_DAY = {
  date: "2026-09-25",
  past: false,
  open: 0,
  booked: 0,
  capacity: 0,
  providers: [
    {
      providerId: RICARDO,
      providerName: "Yanessa Ricardo, APRN",
      locationId: null,
      locationName: null,
      open: [],
      booked: 0,
      capacity: 0,
      reason: "no_hours",
    },
    {
      providerId: AWAD,
      providerName: "Dr. Amir Awad",
      locationId: TAMPA,
      locationName: "Tampa",
      open: [],
      booked: 0,
      capacity: 0,
      reason: "time_off",
    },
  ],
};

const AVAILABILITY = {
  ok: true,
  observedAt: "2026-09-21T12:00:00Z",
  today: "2026-09-21",
  month: "2026-09",
  timeZone: "America/New_York",
  appointmentType: {
    ...TYPE,
    durationMinutes: 30,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
  },
  locations: [
    { id: LUTZ, name: "Lutz", requestLocation: "lutz" },
    { id: TAMPA, name: "Tampa", requestLocation: "tampa" },
  ],
  providers: [
    { id: RICARDO, name: "Yanessa Ricardo, APRN", locations: [{ id: LUTZ, name: "Lutz" }] },
    { id: AWAD, name: "Dr. Amir Awad", locations: [{ id: TAMPA, name: "Tampa" }] },
  ],
  days: [
    { date: "2026-09-20", past: true, open: 0, booked: 0, capacity: 0, providers: [] },
    BUSY_DAY,
    CLOSED_DAY,
  ],
};

const REQUEST = { id: "req-1", version: 7, patientId: "pat-1" };

test("the default type is the new-patient visit by name, otherwise the first", () => {
  assert.equal(
    defaultTypeId([
      { id: "a", name: "Follow-up" },
      { id: "b", name: "New Patient Consult" },
    ]),
    "b",
  );
  assert.equal(defaultTypeId([{ id: "a", name: "Follow-up" }]), "a");
  assert.equal(defaultTypeId([]), null);
});

test("months step across the year", () => {
  assert.equal(addMonths("2026-12", 1), "2027-01");
  assert.equal(addMonths("2026-01", -1), "2025-12");
  assert.equal(addMonths("2026-09", 0), "2026-09");
});

test("a day reads long, summarized, and named for assistive tech", () => {
  assert.equal(longDay("2026-09-22"), "Tuesday, September 22");
  assert.equal(daySummary(BUSY_DAY), "4 open · 10 of 14 booked");
  assert.equal(dayAccessibleName("2026-09-22", BUSY_DAY), "Tuesday, September 22, 4 open times");
  assert.equal(dayAccessibleName("2026-09-25", CLOSED_DAY), "Friday, September 25, no open times");
  assert.equal(
    dayAccessibleName("2026-09-22", { ...BUSY_DAY, open: 1 }),
    "Tuesday, September 22, 1 open time",
  );
  assert.equal(dayAccessibleName("2026-09-26", null), "Saturday, September 26");
});

test("only a future day with an open start wears the disc; an unread day looks closed", () => {
  assert.equal(dayIsOpen(BUSY_DAY), true);
  assert.equal(dayIsOpen(CLOSED_DAY), false);
  assert.equal(dayIsOpen(null), false);
  assert.equal(dayIsOpen({ ...BUSY_DAY, past: true }), false);
});

test("the day popover lists providers with open starts and names the fully booked", () => {
  const blocks = openBlocks(BUSY_DAY);
  assert.deepEqual(
    blocks.map((block) => [block.providerName, block.locationName, block.times.map((t) => t.time)]),
    [
      ["Yanessa Ricardo, APRN", "Lutz", ["09:00", "10:30", "15:30"]],
      ["Dr. Lee", "Tampa", ["11:00"]],
    ],
  );
  assert.deepEqual(fullyBooked(BUSY_DAY), ["Dr. Amir Awad"]);
});

test("a start taken by someone else stays in its block, struck", () => {
  const taken = { day: "2026-09-22", providerId: RICARDO, locationId: LUTZ, time: "10:00" };
  const [ricardo] = openBlocks(BUSY_DAY, taken);
  assert.deepEqual(ricardo.times, [
    { time: "09:00", taken: false },
    { time: "10:00", taken: true },
    { time: "10:30", taken: false },
    { time: "15:30", taken: false },
  ]);
});

test("a closed day gives one reason per provider", () => {
  assert.deepEqual(closedReasons(CLOSED_DAY), [
    { providerId: RICARDO, name: "Yanessa Ricardo, APRN", reason: "Not in on Fridays" },
    { providerId: AWAD, name: "Dr. Amir Awad", reason: "Time off" },
  ]);
  assert.deepEqual(
    closedReasons(BUSY_DAY).find((line) => line.providerId === AWAD),
    { providerId: AWAD, name: "Dr. Amir Awad", reason: "Fully booked" },
  );
});

test("the nearest open start prefers the same provider, then the closest minute", () => {
  const taken = { day: "2026-09-22", providerId: RICARDO, locationId: LUTZ, time: "10:00" };
  assert.deepEqual(nearestOpen(BUSY_DAY, taken), {
    providerId: RICARDO,
    locationId: LUTZ,
    time: "10:30",
  });
  const lone = { ...taken, providerId: AWAD, locationId: TAMPA, time: "11:15" };
  assert.deepEqual(nearestOpen(BUSY_DAY, lone), {
    providerId: "prov-lee",
    locationId: TAMPA,
    time: "11:00",
  });
  assert.equal(nearestOpen(CLOSED_DAY, taken), null);
});

test("squeeze-in offers each provider and office, naming the office when there are several", () => {
  assert.deepEqual(
    squeezeOptions(AVAILABILITY).map((option) => option.label),
    ["Yanessa Ricardo, APRN · Lutz", "Dr. Amir Awad · Tampa"],
  );
  const single = { ...AVAILABILITY, locations: [AVAILABILITY.locations[0]] };
  assert.deepEqual(
    squeezeOptions(single).map((option) => option.label),
    ["Yanessa Ricardo, APRN"],
  );
});

test("a month with nothing open from today on reads as none this month", () => {
  assert.equal(monthHasNoOpen(AVAILABILITY), false);
  assert.equal(monthHasNoOpen({ ...AVAILABILITY, days: [CLOSED_DAY] }), true);
});

test("picking an open start fills the draft and folds the squeeze-in row", () => {
  let draft = bookingReducer(initialBooking("2026-09-21"), { type: "typeId", typeId: TYPE.id });
  draft = bookingReducer(draft, { type: "squeeze", day: "2026-09-22" });
  assert.equal(draft.squeeze, true);
  draft = bookingReducer(draft, {
    type: "open",
    day: "2026-09-22",
    providerId: RICARDO,
    locationId: LUTZ,
    time: "10:30",
  });
  assert.equal(draft.squeeze, false);
  assert.deepEqual(bookingReadout(draft, AVAILABILITY), {
    value: "Tue, Sep 22 · 10:30 AM",
    detail: "Yanessa Ricardo, APRN · Lutz",
  });
});

test("Book waits for a day, a time, a provider and the read's type", () => {
  let draft = bookingReducer(initialBooking("2026-09-21"), { type: "typeId", typeId: TYPE.id });
  assert.equal(bookCommandFor(draft, AVAILABILITY, REQUEST), null);
  draft = bookingReducer(draft, { type: "squeeze", day: "2026-09-22" });
  draft = bookingReducer(draft, { type: "squeezeProvider", providerId: AWAD, locationId: TAMPA });
  assert.equal(bookCommandFor(draft, AVAILABILITY, REQUEST), null);
  draft = bookingReducer(draft, { type: "squeezeTime", time: "16:15" });
  assert.deepEqual(bookCommandFor(draft, AVAILABILITY, REQUEST), {
    patientId: "pat-1",
    providerId: AWAD,
    locationId: TAMPA,
    appointmentTypeId: TYPE.id,
    expectedTypeVersion: 3,
    start: { date: "2026-09-22", time: "16:15" },
    sourceRequestId: "req-1",
    requestVersion: 7,
  });
  assert.equal(bookCommandFor(draft, null, REQUEST), null);
  const otherType = bookingReducer(draft, { type: "typeId", typeId: "type-follow" });
  assert.equal(bookCommandFor(otherType, AVAILABILITY, REQUEST), null);
});

test("a day change drops an open start but keeps a squeeze-in", () => {
  const picked = bookingReducer(initialBooking("2026-09-21"), {
    type: "open",
    day: "2026-09-22",
    providerId: RICARDO,
    locationId: LUTZ,
    time: "10:30",
  });
  const moved = bookingReducer(picked, { type: "day", day: "2026-09-23" });
  assert.deepEqual([moved.day, moved.providerId, moved.time], ["2026-09-23", "", ""]);
  const squeezed = bookingReducer(
    bookingReducer(bookingReducer(picked, { type: "squeeze", day: "2026-09-22" }), {
      type: "squeezeTime",
      time: "16:00",
    }),
    { type: "day", day: "2026-09-23" },
  );
  assert.equal(squeezed.time, "16:00");
});

test("a taken start is remembered, cleared from the draft, and Book dims", () => {
  const picked = bookingReducer(
    bookingReducer(initialBooking("2026-09-21"), { type: "typeId", typeId: TYPE.id }),
    { type: "open", day: "2026-09-22", providerId: RICARDO, locationId: LUTZ, time: "10:00" },
  );
  const taken = bookingReducer(picked, { type: "taken" });
  assert.deepEqual(taken.taken, {
    day: "2026-09-22",
    providerId: RICARDO,
    locationId: LUTZ,
    time: "10:00",
  });
  assert.equal(taken.time, "");
  assert.equal(bookCommandFor(taken, AVAILABILITY, REQUEST), null);
  assert.equal(bookingReadout(taken, AVAILABILITY), null);
});

test("only a lost start re-reads; every other refusal retries the same command", () => {
  assert.equal(startWasTaken("time_unavailable"), true);
  assert.equal(startWasTaken("provider_conflict"), true);
  assert.equal(startWasTaken("stale_version"), false);
  assert.equal(startWasTaken("unavailable"), false);
});

test("a type change drops a picked start but keeps a squeeze-in", () => {
  const picked = bookingReducer(initialBooking("2026-09-21"), {
    type: "open",
    day: "2026-09-22",
    providerId: RICARDO,
    locationId: LUTZ,
    time: "10:30",
  });
  const retyped = bookingReducer(picked, { type: "typeId", typeId: "type-follow" });
  assert.deepEqual([retyped.day, retyped.providerId, retyped.time], ["2026-09-22", "", ""]);
  assert.equal(retyped.typeId, "type-follow");
  const squeezed = bookingReducer(
    bookingReducer(bookingReducer(picked, { type: "squeeze", day: "2026-09-22" }), {
      type: "squeezeTime",
      time: "16:00",
    }),
    { type: "typeId", typeId: "type-follow" },
  );
  assert.equal(squeezed.time, "16:00");
});

test("the strip says what Book sends, or what it still waits for", () => {
  const blank = initialBooking("2026-09-21");
  const line = (draft, extra = {}) =>
    bookingStripLine({
      draft,
      availability: AVAILABILITY,
      status: "ready",
      bookFailed: false,
      ...extra,
    });
  assert.deepEqual([line(blank).value, line(blank).tone], ["Choose a time", "muted"]);
  assert.equal(line(blank, { availability: null, status: "loading" }).value, "Finding open times…");
  assert.deepEqual(
    [
      line(blank, { availability: null, status: "failed" }).value,
      line(blank, { availability: null, status: "failed" }).action,
    ],
    ["Couldn't load open times", "retry-read"],
  );
  assert.equal(
    line(blank, { availability: { ...AVAILABILITY, days: [CLOSED_DAY] } }).action,
    "next-month",
  );
  const closed = bookingReducer(blank, { type: "day", day: "2026-09-25" });
  assert.deepEqual(
    [line(closed).label, line(closed).value],
    ["No open times", "Fri, Sep 25 · Enter a time"],
  );
  const open = bookingReducer(blank, { type: "day", day: "2026-09-22" });
  assert.equal(line(open).value, "Tue, Sep 22 · Choose a time");
  const picked = bookingReducer(open, {
    type: "open",
    day: "2026-09-22",
    providerId: RICARDO,
    locationId: LUTZ,
    time: "10:30",
  });
  assert.deepEqual(
    [line(picked).value, line(picked).detail, line(picked).tone],
    ["Tue, Sep 22 · 10:30 AM", "Yanessa Ricardo, APRN · Lutz", "strong"],
  );
  assert.deepEqual(
    [line(picked, { bookFailed: true }).value, line(picked, { bookFailed: true }).action],
    ["Couldn't book", "retry-book"],
  );
});
