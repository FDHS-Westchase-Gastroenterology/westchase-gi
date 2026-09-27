import assert from "node:assert/strict";
import test from "node:test";

import { THIS_CALL_OUTCOMES, printedLine, printedPage } from "./printed-page-model.ts";

const MARIA = "maria@example.test";

/* A fictional record, newest first, the way the read returns it. */
function record(overrides) {
  return {
    id: "r",
    version: 1,
    state: "new",
    name: "Test Patient",
    phone: "8135550100",
    email: null,
    location: "any",
    preferredTime: "morning",
    message: null,
    createdAt: "2026-09-13T14:00:00.000Z",
    locale: "en",
    sourcePath: "/en/appointment",
    callAgainAt: null,
    bookingConfirmedAt: null,
    appointmentAt: null,
    closedAt: null,
    closureReason: null,
    legacyReviewRequired: false,
    history: [{ kind: "created", origin: "website", at: "2026-09-13T14:00:00.000Z" }],
    actorNames: { [MARIA]: "Maria R." },
    ...overrides,
  };
}

const CALLED = [
  {
    kind: "contact_attempt",
    id: "a2",
    outcome: "voicemail",
    callAgainAt: "2026-09-17T13:00:00.000Z",
    actor: MARIA,
    at: "2026-09-16T19:30:00.000Z",
  },
  {
    kind: "delivery",
    id: "d1",
    recipient: "desk@example.test",
    accepted: true,
    at: "2026-09-16T16:00:00.000Z",
  },
  {
    kind: "note",
    id: "n1",
    text: "  Asked for a callback after 3pm.  ",
    actor: MARIA,
    at: "2026-09-16T15:00:00.000Z",
  },
  { kind: "note", id: "n0", text: "   ", actor: MARIA, at: "2026-09-16T14:00:00.000Z" },
  {
    kind: "contact_attempt",
    id: "a1",
    outcome: "no_answer",
    callAgainAt: null,
    actor: "unknown@example.test",
    at: "2026-09-15T13:00:00.000Z",
  },
  { kind: "created", origin: "staff", at: "2026-09-13T14:00:00.000Z" },
];

test("a new request before any call names the exact time it came in and where from", () => {
  const page = printedPage(record());

  assert.equal(page.name, "Test Patient");
  assert.equal(page.status, "New");
  assert.match(page.standing, /^Not called yet · received .+ from the website$/);
  assert.equal(page.phone, "(813) 555-0100");
  assert.equal(page.office, "Either office");
  assert.equal(page.time, "Morning");
  assert.equal(page.language, "English");
  assert.equal(page.languageStands, false);
  assert.deepEqual(page.notes, []);
  assert.deepEqual(page.history, []);
});

test("an absent or blank email and message are left for the page to say so", () => {
  const blank = printedPage(record({ email: "  ", message: "\n " }));
  assert.equal(blank.email, null);
  assert.equal(blank.message, null);

  const given = printedPage(record({ email: " pat@example.test ", message: " Mornings. " }));
  assert.equal(given.email, "pat@example.test");
  assert.equal(given.message, "Mornings.");
});

test("a language other than English stands out", () => {
  const page = printedPage(record({ locale: "es" }));
  assert.equal(page.languageStands, true);
  assert.notEqual(page.language, "es");
});

test("notes print trimmed with a byline, blank notes are left out", () => {
  const page = printedPage(record({ state: "contacted", history: CALLED }));

  assert.equal(page.notes.length, 1);
  assert.equal(page.notes[0].id, "n1");
  assert.equal(page.notes[0].text, "Asked for a callback after 3pm.");
  assert.match(page.notes[0].byline, /^Maria R\. · /);
});

test("call history keeps the calls, newest first, and leaves notes and deliveries to their own places", () => {
  const page = printedPage(record({ state: "contacted", history: CALLED }));

  assert.deepEqual(
    page.history.map((row) => row.id),
    ["a2", "a1"],
  );
  assert.match(page.history[0].event, /^Left a voicemail · call again /);
  assert.equal(page.history[0].who, "Maria R.");
  assert.match(page.history[1].event, / · no call-again day$/);
  // An actor without a display name reads as the email.
  assert.equal(page.history[1].who, "unknown@example.test");
  assert.ok(page.history.every((row) => !row.undone));
});

test("a called request says what is next, how many tries, and that staff added it", () => {
  const page = printedPage(
    record({ state: "contacted", callAgainAt: "2026-09-17T13:00:00.000Z", history: CALLED }),
  );

  assert.equal(page.status, "Call again");
  assert.match(page.standing, /^Next call .+ · 2 attempts so far · added by staff .+$/);
  assert.match(
    printedPage(record({ state: "contacted", history: CALLED })).standing,
    /^No call-again day · /,
  );
});

test("a closed request prints when and why it closed", () => {
  const page = printedPage(
    record({
      state: "closed",
      closedAt: "2026-09-18T15:00:00.000Z",
      closureReason: "not_actionable",
    }),
  );
  assert.equal(page.status, "Closed");
  assert.match(page.standing, /^Closed .+ — .+ · Not called yet · /);
});

test("the call box offers six outcomes, and the footer names who printed it", () => {
  assert.equal(THIS_CALL_OUTCOMES.length, 6);
  assert.equal(new Set(THIS_CALL_OUTCOMES).size, 6);

  const at = "2026-09-15T23:40:00.000Z";
  assert.match(printedLine(at, "Maria R."), /^Printed .+ by Maria R\.$/);
  assert.doesNotMatch(printedLine(at, null), / by /);
  assert.doesNotMatch(printedLine(at, ""), / by /);
});
