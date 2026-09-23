import assert from "node:assert/strict";
import test from "node:test";

import { attemptsLabel, detailsSummary, recordSections } from "./full-record-sheet-model.ts";

const MARIA = "maria@example.test";

/* A fictional record, newest first, the way the read returns it: two
   calls on Sep 16 (one with its own self-transition), a note on Sep 16,
   an undone close on Sep 15, and the website receipt on Sep 13. */
function record(history) {
  return {
    id: "r",
    version: 1,
    state: "contacted",
    name: "Test Patient",
    phone: "8135550100",
    email: null,
    location: "any",
    preferredTime: "morning",
    message: null,
    createdAt: "2026-09-13T14:00:00.000Z",
    locale: "en",
    sourcePath: "/contact",
    callAgainAt: null,
    bookingConfirmedAt: null,
    appointmentAt: null,
    closedAt: null,
    closureReason: null,
    legacyReviewRequired: false,
    history,
    actorNames: { [MARIA]: "Maria R." },
  };
}

const HISTORY = [
  {
    kind: "contact_attempt",
    id: "a2",
    outcome: "voicemail",
    callAgainAt: "2026-09-17T13:00:00.000Z",
    actor: MARIA,
    at: "2026-09-16T19:30:00.000Z",
  },
  {
    kind: "transition",
    id: "t2",
    command: "record_contact_attempt",
    from: "contacted",
    to: "contacted",
    closureReason: null,
    callAgainAt: "2026-09-17T13:00:00.000Z",
    appointmentAt: null,
    undone: false,
    actor: MARIA,
    at: "2026-09-16T19:30:00.000Z",
  },
  {
    kind: "note",
    id: "n1",
    text: "Asked for a callback after 3pm.\nPrefers Dr. Example.",
    actor: MARIA,
    at: "2026-09-16T15:00:00.000Z",
  },
  {
    kind: "contact_attempt",
    id: "a1",
    outcome: "no_answer",
    callAgainAt: null,
    actor: "unknown@example.test",
    at: "2026-09-16T14:00:00.000Z",
  },
  {
    kind: "transition",
    id: "t1",
    command: "close_request",
    from: "contacted",
    to: "closed",
    closureReason: "wont_schedule",
    callAgainAt: null,
    appointmentAt: null,
    undone: true,
    actor: MARIA,
    at: "2026-09-15T16:00:00.000Z",
  },
  { kind: "created", origin: "website", at: "2026-09-13T14:00:00.000Z" },
];

test("the history groups under practice-local days, newest first, with notes interleaved", () => {
  const { days, rowCount } = recordSections(record(HISTORY));
  assert.deepEqual(
    days.map((day) => day.label),
    ["Wed, Sep 16", "Tue, Sep 15", "Sun, Sep 13"],
  );
  assert.deepEqual(
    days[0].rows.map((row) => row.id),
    ["a2", "n1", "a1"],
  );
  assert.equal(rowCount, 5);
});

test("a call attempt leads with its outcome and says the next call in short", () => {
  const [voicemail, , noAnswer] = recordSections(record(HISTORY)).days[0].rows;
  assert.equal(voicemail.lead, "Left a voicemail");
  assert.equal(voicemail.strong, true);
  assert.equal(voicemail.rest, " · next call Sep 17");
  assert.equal(voicemail.icon, "voicemail");
  assert.deepEqual(voicemail.detail.facts, [
    { key: "Next call", value: "Thursday, September 17 morning" },
    { key: "By", value: "Maria R." },
    { key: "When", value: "Wed, Sep 16, 3:30 PM" },
  ]);
  assert.equal(noAnswer.rest, " · no call-again day");
  assert.equal(noAnswer.icon, "no-answer");
  assert.equal(noAnswer.detail.facts[1].value, "unknown@example.test");
});

test("a note shows its first line in the row and its whole text in the popover", () => {
  const note = recordSections(record(HISTORY)).days[0].rows[1];
  assert.equal(note.lead, "Asked for a callback after 3pm.");
  assert.equal(note.detail.body, "Asked for a callback after 3pm.\nPrefers Dr. Example.");
  assert.equal(note.detail.note, true);
  assert.equal(note.icon, "note");
});

test("an undone event keeps the request page's wording and says it was undone", () => {
  const [closed] = recordSections(record(HISTORY)).days[1].rows;
  assert.equal(closed.lead, "Closed — patient won't schedule");
  assert.equal(closed.undone, true);
  assert.equal(closed.icon, "closed");
  assert.equal(closed.system, false);
});

test("system entries are marked as the system's; a failed delivery escalates", () => {
  const created = recordSections(record(HISTORY)).days[2].rows[0];
  assert.equal(created.system, true);
  assert.equal(created.icon, "dot");
  const failed = recordSections(
    record([
      { kind: "delivery", id: "d", recipient: "", accepted: false, at: "2026-09-13T14:01:00.000Z" },
    ]),
  ).days[0].rows[0];
  assert.equal(failed.system, false);
  assert.equal(failed.attention, true);
  assert.equal(failed.icon, "alert");
  assert.equal(failed.lead, "Notification email failed");
  assert.equal(failed.strong, true);
  assert.equal(failed.rest, " · recipient unavailable");
  const [named, accepted] = recordSections(
    record([
      {
        kind: "delivery",
        id: "d2",
        recipient: "front-desk@example.test",
        accepted: false,
        at: "2026-09-13T14:02:00.000Z",
      },
      {
        kind: "delivery",
        id: "d3",
        recipient: "front-desk@example.test",
        accepted: true,
        at: "2026-09-13T14:01:00.000Z",
      },
    ]),
  ).days[0].rows;
  assert.equal(named.rest, " · front-desk@example.test");
  assert.equal(accepted.system, true);
  assert.equal(accepted.attention, false);
  assert.equal(accepted.icon, "dot");
});

test("the header counts the recorded attempts and the newest note is lifted out", () => {
  const sections = recordSections(record(HISTORY));
  assert.equal(sections.attempts, 2);
  assert.equal(attemptsLabel(sections.attempts), "2 attempts");
  assert.equal(attemptsLabel(1), "1 attempt");
  assert.equal(attemptsLabel(0), null);
  assert.deepEqual(sections.latestNote, {
    id: "n1",
    text: "Asked for a callback after 3pm.\nPrefers Dr. Example.",
    byline: "Maria R. · Wed, Sep 16, 11:00 AM",
  });
  assert.equal(recordSections(record([])).latestNote, null);
});

test("the closed request details say origin, language and the day received", () => {
  assert.equal(detailsSummary(record(HISTORY)), "Website · English · received Sun, Sep 13");
  assert.equal(detailsSummary(record([])), "English · received Sun, Sep 13");
});

test("an attempt whose recorded move was undone reads as undone", () => {
  /* The database stamps the attempt a moment after the decision's time. */
  const history = HISTORY.map((entry) =>
    entry.id === "t2" ? { ...entry, undone: true, at: "2026-09-16T19:29:59.400Z" } : entry,
  );
  const sections = recordSections(record(history));
  const [voicemail, , noAnswer] = sections.days[0].rows;
  assert.equal(voicemail.undone, true);
  assert.equal(noAnswer.undone, false);
  assert.equal(sections.attempts, 1, "an undone attempt is not counted");
});
