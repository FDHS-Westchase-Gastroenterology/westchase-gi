import assert from "node:assert/strict";
import test from "node:test";

import {
  addDays,
  canSave,
  cardNoteFor,
  cardReducer,
  cardRowsFor,
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

test("a contacted line offers the same four answers and both follow-up choices", () => {
  assert.deepEqual(cardRowsFor("contacted"), [
    "no_answer",
    "contacted",
    "booked",
    "not_actionable",
  ]);
  assert.deepEqual(followUpsFor("contacted"), ["call", "none"]);
  assert.deepEqual(followUpsFor("no_answer"), ["call", "none"], "the same pair on every line");
  assert.deepEqual(followUpsFor("booked"), []);
  assert.deepEqual(followUpsFor("not_actionable"), []);
  assert.deepEqual(followUpsFor(null), []);
});

test("a contact answer presumes Call again; No call quiets the calendar and closes", () => {
  const contacted = cardReducer(INITIAL_DRAFT, {
    type: "answer",
    answer: "contacted",
    today: TODAY,
  });
  assert.equal(contacted.followUp, "call");
  assert.equal(needsDay(contacted.answer, contacted.followUp), true);
  const picked = cardReducer(contacted, { type: "day", day: "2026-09-11" });
  const noCall = cardReducer(picked, { type: "followUp", followUp: "none" });
  assert.equal(needsDay(noCall.answer, noCall.followUp), false);
  assert.equal(noCall.day, "2026-09-11", "the day waits in case they change their mind");
  assert.deepEqual(commandFor(noCall, TODAY), { kind: "complete_contact", outcome: "reached" });
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

test("days add across a year boundary", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

test("no answer presumes nothing: the calendar stays blank until staff pick, and a picked day survives a change of answer", () => {
  const noAnswer = cardReducer(INITIAL_DRAFT, {
    type: "answer",
    answer: "no_answer",
    today: TODAY,
  });
  assert.equal(noAnswer.day, "", "no tomorrow is presumed");
  const contacted = cardReducer(noAnswer, { type: "answer", answer: "contacted", today: TODAY });
  assert.equal(contacted.day, "", "no Friday is presumed either");
  const moved = cardReducer(contacted, { type: "day", day: "2026-09-15" });
  assert.equal(moved.day, "2026-09-15");
  const back = cardReducer(moved, { type: "answer", answer: "no_answer", today: TODAY });
  assert.equal(back.day, "2026-09-15", "a hand-picked day survives a change of answer");
});

test("booking keeps whatever day is already on the calendar and asks for a time", () => {
  const contacted = cardReducer(INITIAL_DRAFT, {
    type: "answer",
    answer: "contacted",
    today: TODAY,
  });
  const picked = cardReducer(contacted, { type: "day", day: "2026-09-11" });
  const booked = cardReducer(picked, { type: "answer", answer: "booked", today: TODAY });
  assert.equal(booked.day, "2026-09-11");
  assert.equal(canSave(booked, TODAY), false);
  const timed = cardReducer(booked, { type: "time", time: "09:30" });
  assert.equal(canSave(timed, TODAY), true);
  assert.equal(canSave({ ...timed, time: "07:45" }, TODAY), true, "an early arrival");
  assert.equal(canSave({ ...timed, time: "19:05" }, TODAY), true, "a late add-on");
  assert.equal(canSave({ ...timed, time: "00:00" }, TODAY), true, "the first minute of the day");
  assert.equal(canSave({ ...timed, time: "23:59" }, TODAY), true, "the last minute of the day");
  assert.equal(timeWithinDay("24:00"), false, "no hour past the clock");
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
  assert.equal(noAnswer.day, "", "a call-again cannot, so the calendar goes blank again");
});

test("Save waits for a complete, in-bounds decision", () => {
  assert.equal(canSave(INITIAL_DRAFT, TODAY), false);
  const blank = cardReducer(INITIAL_DRAFT, {
    type: "answer",
    answer: "no_answer",
    today: TODAY,
  });
  assert.equal(canSave(blank, TODAY), false, "a call-again with no day picked yet");
  const noAnswer = cardReducer(blank, { type: "day", day: "2026-09-09" });
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
  for (const [outcome, label] of [
    ["no_answer", "No answer"],
    ["reached", "Contacted"],
  ]) {
    assert.equal(
      savedMessage({ kind: "complete_contact", outcome }, "Sample Patient", null, now),
      `${label} recorded for Sample Patient. Request closed.`,
    );
  }
  const book = { kind: "book", appointment: { date: "2026-09-11", hour: 9, minute: 0 } };
  assert.equal(savedMessage(book, "Sample Patient", null, now), "Sample Patient is Scheduled.");
  const close = { kind: "close", reason: "wont_schedule" };
  assert.equal(savedMessage(close, "Sample Patient", null, now), "Sample Patient is Closed.");
});

test("a saveable draft maps to exactly one server command", () => {
  assert.equal(commandFor(INITIAL_DRAFT, TODAY), null);
  const blank = cardReducer(INITIAL_DRAFT, {
    type: "answer",
    answer: "no_answer",
    today: TODAY,
  });
  assert.equal(commandFor(blank, TODAY), null, "Call again waits for a day");
  const noAnswer = cardReducer(blank, { type: "day", day: "2026-09-09" });
  assert.deepEqual(commandFor(noAnswer, TODAY), {
    kind: "attempt",
    outcome: "no_answer",
    callAgain: { kind: "day", date: "2026-09-09" },
  });
  const sameDay = cardReducer(noAnswer, { type: "day", day: TODAY });
  assert.deepEqual(commandFor(sameDay, TODAY).callAgain, { kind: "this_afternoon" });
  const noCall = cardReducer(noAnswer, { type: "followUp", followUp: "none" });
  assert.deepEqual(
    commandFor(noCall, TODAY),
    { kind: "complete_contact", outcome: "no_answer" },
    "No call after No answer completes contact without a callback",
  );
  const reached = cardReducer(INITIAL_DRAFT, {
    type: "answer",
    answer: "contacted",
    today: TODAY,
  });
  const contacted = cardReducer(reached, { type: "day", day: "2026-09-11" });
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
