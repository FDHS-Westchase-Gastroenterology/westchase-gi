import assert from "node:assert/strict";
import test from "node:test";

import {
  addDays,
  canSave,
  cardNoteFor,
  cardReducer,
  cardRowsFor,
  comingFriday,
  dayHorizon,
  commandFor,
  failureFor,
  followUpFor,
  followUpsFor,
  INITIAL_DRAFT,
  needsDay,
  savedMessage,
  timeWithinDay,
} from "./record-card-model.ts";

const TODAY = "2026-09-08"; // A Tuesday

test("a new line offers the two contact outcomes, booking, and the not-actionable close", () => {
  assert.deepEqual(cardRowsFor("new"), ["no_answer", "contacted", "booked", "not_actionable"]);
});

test("a contacted line offers the same four answers; won't schedule lives under Contacted as No call", () => {
  assert.deepEqual(cardRowsFor("contacted"), [
    "no_answer",
    "contacted",
    "booked",
    "not_actionable",
  ]);
  assert.deepEqual(followUpsFor("contacted", "contacted"), ["call", "none"]);
  assert.deepEqual(followUpsFor("contacted", "new"), ["call"], "a first contact cannot close");
  assert.deepEqual(followUpsFor("no_answer", "contacted"), ["call"], "no workflow home yet");
  assert.deepEqual(followUpsFor("booked", "contacted"), []);
  assert.deepEqual(followUpsFor(null, "new"), []);
});

test("a contact answer presumes Call again; No call quiets the calendar and closes", () => {
  const contacted = cardReducer(INITIAL_DRAFT, {
    type: "answer",
    answer: "contacted",
    today: TODAY,
  });
  assert.equal(contacted.followUp, "call");
  assert.equal(needsDay(contacted.answer, contacted.followUp), true);
  const noCall = cardReducer(contacted, { type: "followUp", followUp: "none" });
  assert.equal(needsDay(noCall.answer, noCall.followUp), false);
  assert.equal(noCall.day, "2026-09-11", "the day waits in case they change their mind");
  assert.deepEqual(commandFor(noCall, TODAY), { kind: "close", reason: "wont_schedule" });
  const close = cardReducer(noCall, { type: "answer", answer: "not_actionable", today: TODAY });
  assert.equal(close.followUp, null);
  assert.equal(needsDay(null, null), false);
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
  assert.equal(canSave({ ...timed, time: "07:45" }, TODAY), false, "before the practice day");
  assert.equal(canSave({ ...timed, time: "16:30" }, TODAY), true, "the last slot");
  assert.equal(timeWithinDay("9:30"), false, "the field's own zero-padded form only");
});

test("the calendar reaches 400 days until an answer narrows it, and a day past a call-again's reach gives way", () => {
  assert.equal(dayHorizon(null), 400);
  assert.equal(dayHorizon("booked"), 400);
  assert.equal(dayHorizon("no_answer"), 90);
  const far = cardReducer(INITIAL_DRAFT, { type: "day", day: addDays(TODAY, 200) });
  const booked = cardReducer(far, { type: "answer", answer: "booked", today: TODAY });
  assert.equal(booked.day, addDays(TODAY, 200), "a booking can reach the picked day");
  const noAnswer = cardReducer(far, { type: "answer", answer: "no_answer", today: TODAY });
  assert.equal(noAnswer.day, "2026-09-09", "a call-again cannot, so tomorrow takes over");
  assert.equal(noAnswer.dayTouched, false, "and the calendar follows the next answer again");
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
    answer: "not_actionable",
    today: TODAY,
  });
  assert.equal(canSave(close, TODAY), true);
});

test("today means this afternoon; any other day is that day's morning", () => {
  assert.deepEqual(followUpFor(TODAY, TODAY), { kind: "this_afternoon" });
  assert.deepEqual(followUpFor("2026-09-09", TODAY), { kind: "day", date: "2026-09-09" });
});

test("the saved line names the outcome and the return", () => {
  const now = new Date("2026-09-08T14:00:00Z");
  const attempt = {
    kind: "attempt",
    outcome: "no_answer",
    callAgain: { kind: "day", date: "2026-09-09" },
  };
  assert.equal(
    savedMessage(attempt, "Sample Patient", "2026-09-09T13:00:00.000Z", now),
    "No answer recorded for Sample Patient — back tomorrow morning.",
  );
  const book = { kind: "book", appointment: { date: "2026-09-11", hour: 9, minute: 0 } };
  assert.equal(savedMessage(book, "Sample Patient", null, now), "Sample Patient is Scheduled.");
  const close = { kind: "close", reason: "wont_schedule" };
  assert.equal(savedMessage(close, "Sample Patient", null, now), "Sample Patient is Closed.");
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
