import assert from "node:assert/strict";
import test from "node:test";

import {
  addDays,
  canSave,
  cardNoteFor,
  cardReducer,
  cardRowsFor,
  comingFriday,
  commandFor,
  failureFor,
  dayLabel,
  followUpFor,
  INITIAL_DRAFT,
  rowHint,
  savedMessage,
} from "./record-card-model.ts";

const TODAY = "2026-09-08"; // A Tuesday

test("a new line offers the two contact outcomes, booking, and the not-actionable close", () => {
  assert.deepEqual(cardRowsFor("new"), ["no_answer", "contacted", "booked", "not_actionable"]);
});

test("a contacted line adds the won't-schedule close", () => {
  assert.deepEqual(cardRowsFor("contacted"), [
    "no_answer",
    "contacted",
    "booked",
    "wont_schedule",
    "not_actionable",
  ]);
});

test("scheduled and closed lines get a sentence instead of rows", () => {
  assert.deepEqual(cardRowsFor("scheduled"), []);
  assert.deepEqual(cardRowsFor("closed"), []);
  assert.match(cardNoteFor("scheduled"), /Scheduled/u);
  assert.match(cardNoteFor("closed"), /Closed/u);
  assert.equal(cardNoteFor("new"), null);
});

test("the coming Friday is never today", () => {
  assert.equal(comingFriday("2026-09-08"), "2026-09-11");
  assert.equal(comingFriday("2026-09-11"), "2026-09-18");
  assert.equal(comingFriday("2026-09-12"), "2026-09-18");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

test("no answer prefills tomorrow and contacted prefills Friday; the day stays adjustable", () => {
  const noAnswer = cardReducer(INITIAL_DRAFT, {
    type: "answer",
    answer: "no_answer",
    today: TODAY,
  });
  assert.equal(noAnswer.day, "2026-09-09");
  const contacted = cardReducer(noAnswer, { type: "answer", answer: "contacted", today: TODAY });
  assert.equal(contacted.day, "2026-09-11");
  const moved = cardReducer(contacted, { type: "day", day: "2026-09-15" });
  assert.equal(moved.dayTouched, true);
  const back = cardReducer(moved, { type: "answer", answer: "no_answer", today: TODAY });
  assert.equal(back.day, "2026-09-15", "a hand-picked day survives a change of answer");
});

test("booking keeps whatever day is already on the calendar and asks for a time", () => {
  const contacted = cardReducer(INITIAL_DRAFT, {
    type: "answer",
    answer: "contacted",
    today: TODAY,
  });
  const booked = cardReducer(contacted, { type: "answer", answer: "booked", today: TODAY });
  assert.equal(booked.day, "2026-09-11");
  assert.equal(canSave(booked, TODAY), false);
  const timed = cardReducer(booked, { type: "time", time: "09:30" });
  assert.equal(canSave(timed, TODAY), true);
  assert.equal(rowHint("booked", booked, TODAY), "Friday · pick a time");
  assert.equal(rowHint("booked", timed, TODAY), "Friday · 9:30 AM");
});

test("Save waits for a complete, in-bounds decision", () => {
  assert.equal(canSave(INITIAL_DRAFT, TODAY), false);
  const noAnswer = cardReducer(INITIAL_DRAFT, {
    type: "answer",
    answer: "no_answer",
    today: TODAY,
  });
  assert.equal(canSave(noAnswer, TODAY), true);
  const past = cardReducer(noAnswer, { type: "day", day: "2026-09-07" });
  assert.equal(canSave(past, TODAY), false);
  const far = cardReducer(noAnswer, { type: "day", day: addDays(TODAY, 91) });
  assert.equal(canSave(far, TODAY), false);
  const farBooking = cardReducer(far, { type: "answer", answer: "booked", today: TODAY });
  assert.equal(canSave({ ...farBooking, time: "08:00" }, TODAY), true);
  const close = cardReducer(INITIAL_DRAFT, {
    type: "answer",
    answer: "wont_schedule",
    today: TODAY,
  });
  assert.equal(canSave(close, TODAY), true);
});

test("today means this afternoon; any other day is that day's morning", () => {
  assert.deepEqual(followUpFor(TODAY, TODAY), { kind: "this_afternoon" });
  assert.deepEqual(followUpFor("2026-09-09", TODAY), { kind: "day", date: "2026-09-09" });
});

test("row hints read as the presumption until chosen, then as the draft", () => {
  assert.equal(rowHint("no_answer", INITIAL_DRAFT, TODAY), "call again tomorrow");
  assert.equal(rowHint("contacted", INITIAL_DRAFT, TODAY), "call again Friday");
  const contacted = cardReducer(INITIAL_DRAFT, {
    type: "answer",
    answer: "contacted",
    today: TODAY,
  });
  assert.equal(rowHint("contacted", contacted, TODAY), "call again Friday");
  const moved = cardReducer(contacted, { type: "day", day: "2026-09-22" });
  assert.equal(rowHint("contacted", moved, TODAY), "call again Sep 22");
  assert.equal(rowHint("no_answer", moved, TODAY), "call again tomorrow");
});

test("day labels use the queue's relative words", () => {
  assert.equal(dayLabel(TODAY, TODAY), "today");
  assert.equal(dayLabel("2026-09-09", TODAY), "tomorrow");
  assert.equal(dayLabel("2026-09-11", TODAY), "Friday");
  assert.equal(dayLabel("2026-09-14", TODAY), "Monday");
  assert.equal(dayLabel("2026-09-15", TODAY), "Sep 15");
});

test("the saved line names the outcome and the return", () => {
  const now = new Date("2026-09-08T14:00:00Z");
  assert.equal(
    savedMessage("no_answer", "Sample Patient", "2026-09-09T13:00:00.000Z", now),
    "No answer recorded for Sample Patient — back tomorrow morning.",
  );
  assert.equal(savedMessage("booked", "Sample Patient", null, now), "Sample Patient is Scheduled.");
  assert.equal(
    savedMessage("not_actionable", "Sample Patient", null, now),
    "Sample Patient is Closed.",
  );
});

test("a saveable draft maps to exactly one server command", () => {
  assert.equal(commandFor(INITIAL_DRAFT, TODAY), null);
  const noAnswer = cardReducer(INITIAL_DRAFT, {
    type: "answer",
    answer: "no_answer",
    today: TODAY,
  });
  assert.deepEqual(commandFor(noAnswer, TODAY), {
    kind: "attempt",
    outcome: "no_answer",
    callAgain: { kind: "day", date: "2026-09-09" },
  });
  const sameDay = cardReducer(noAnswer, { type: "day", day: TODAY });
  assert.deepEqual(commandFor(sameDay, TODAY).callAgain, { kind: "this_afternoon" });
  const contacted = cardReducer(INITIAL_DRAFT, {
    type: "answer",
    answer: "contacted",
    today: TODAY,
  });
  assert.equal(commandFor(contacted, TODAY).outcome, "reached_follow_up");
  const close = cardReducer(INITIAL_DRAFT, {
    type: "answer",
    answer: "not_actionable",
    today: TODAY,
  });
  assert.deepEqual(commandFor(close, TODAY), { kind: "close", reason: "not_actionable" });
  const booked = cardReducer(contacted, { type: "answer", answer: "booked", today: TODAY });
  assert.equal(commandFor(booked, TODAY), null);
  const timed = cardReducer(booked, { type: "time", time: "14:00" });
  assert.deepEqual(commandFor(timed, TODAY), {
    kind: "book",
    appointment: { date: "2026-09-11", hour: 14, minute: 0 },
  });
});

test("failures keep the key only when the outcome is uncertain", () => {
  assert.equal(failureFor("unavailable").uncertain, true);
  assert.equal(failureFor("unavailable").refresh, false);
  assert.equal(failureFor("stale_version").refresh, true);
  assert.equal(failureFor("illegal_transition").refresh, true);
  assert.equal(failureFor("invalid_command").uncertain, false);
  assert.equal(failureFor("invalid_command").refresh, false);
});
