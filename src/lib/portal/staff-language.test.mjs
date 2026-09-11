import assert from "node:assert/strict";
import test from "node:test";

import {
  FORBIDDEN_ABSOLUTE_CLAIMS,
  HELP_ACTIVITY_TRUTH,
  HELP_CONTACTED_STATUS,
  HELP_LINKS,
  HELP_NOTIFICATION_TRUTH,
  HELP_QUEUE_RECORD,
  NEW_REQUESTS_HREF,
  OPEN_NEW_REQUESTS_LABEL,
  RECIPIENT_CONFIRMATION_BODY,
  RECIPIENTS_INTRO,
  START_OLDEST_REQUEST_LABEL,
  allStaffLanguageText,
  greetingName,
  helpOutageCopy,
  oldestNewRequestAction,
  signInIdentifierField,
  staffGreeting,
  staffLanguageHasForbiddenClaim,
} from "./staff-language.ts";

test("sign-in identifier names only the credential accepted in each environment", () => {
  assert.deepEqual(signInIdentifierField(true), {
    label: "Email or username",
    type: "text",
    inputMode: undefined,
  });
  assert.deepEqual(signInIdentifierField(false), {
    label: "Email",
    type: "email",
    inputMode: "email",
  });
});

test("greeting uses a human first name and never greets Portal", () => {
  assert.equal(greetingName("Juliet Oliva"), "Juliet");
  assert.equal(greetingName("  Maria Santos  "), "Maria");
  assert.equal(staffGreeting("Good morning", "Juliet Oliva"), "Good morning, Juliet.");

  assert.equal(greetingName("Portal administrator"), null);
  assert.equal(greetingName("Portal"), null);
  assert.equal(greetingName("Administrator"), null);
  assert.equal(greetingName("admin@example.test"), null);
  assert.equal(greetingName(""), null);
  assert.equal(staffGreeting("Good evening", "Portal administrator"), "Good evening.");
  assert.doesNotMatch(staffGreeting("Good evening", "Portal administrator"), /Portal/);
});

test("Start with oldest request opens the exact oldest New request", () => {
  const action = oldestNewRequestAction({
    newCount: 3,
    oldestRequestId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  });
  assert.deepEqual(action, {
    kind: "open-oldest",
    href: "/admin/requests/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    label: START_OLDEST_REQUEST_LABEL,
  });
});

test("no New request replaces the oldest action with an honest empty destination", () => {
  assert.deepEqual(oldestNewRequestAction({ newCount: 0, oldestRequestId: null }), {
    kind: "empty",
    href: NEW_REQUESTS_HREF,
    label: OPEN_NEW_REQUESTS_LABEL,
  });
  assert.deepEqual(
    oldestNewRequestAction({
      newCount: 2,
      oldestRequestId: "  ",
    }),
    {
      kind: "empty",
      href: NEW_REQUESTS_HREF,
      label: OPEN_NEW_REQUESTS_LABEL,
    },
  );
  assert.deepEqual(oldestNewRequestAction({ newCount: null, oldestRequestId: null }), {
    kind: "none",
  });
});

test("Help, email, and activity copy drop unsupported absolute claims", () => {
  const text = allStaffLanguageText("(813) 920-8882", "(813) 564-0315");
  assert.equal(staffLanguageHasForbiddenClaim(text), false);
  for (const claim of FORBIDDEN_ABSOLUTE_CLAIMS) {
    assert.equal(text.toLowerCase().includes(claim), false, claim);
  }

  assert.match(HELP_QUEUE_RECORD, /appointment requests, not booked appointments/);
  assert.match(HELP_CONTACTED_STATUS, /Staff set a call-again time/);
  assert.match(HELP_CONTACTED_STATUS, /Home flags Contacted requests that are missing a time/);
  assert.doesNotMatch(HELP_CONTACTED_STATUS, /carries a call-again time/);
  assert.match(HELP_NOTIFICATION_TRUTH, /heads-up/);
  assert.match(HELP_NOTIFICATION_TRUTH, /portal is the record/);
  assert.doesNotMatch(HELP_NOTIFICATION_TRUTH, /inbox/);
  assert.match(HELP_ACTIVITY_TRUTH, /log shows who made the change/);
  assert.doesNotMatch(HELP_ACTIVITY_TRUTH, /always/);
  assert.match(
    helpOutageCopy("(813) 920-8882", "(813) 564-0315"),
    /website lists the office call number \(813\) 920-8882 and the text number \(813\) 564-0315/,
  );
  assert.doesNotMatch(helpOutageCopy("(813) 920-8882", "(813) 564-0315"), /always/);
  assert.match(RECIPIENTS_INTRO, /heads-up/);
  assert.match(RECIPIENTS_INTRO, /portal is the record/);
  assert.match(RECIPIENT_CONFIRMATION_BODY, /heads-up/);
  assert.match(RECIPIENT_CONFIRMATION_BODY, /portal is the record/);
});

test("Help links still name their destinations", () => {
  assert.equal(HELP_LINKS.appointments.href, "/admin/requests");
  assert.equal(HELP_LINKS.appointments.label, "Appointments");
  assert.equal(HELP_LINKS.printPacket.href, "/admin/requests/print");
  assert.equal(HELP_LINKS.openAppointments.href, "/admin/requests");
  assert.equal(HELP_LINKS.home.href, "/admin");
  assert.equal(HELP_LINKS.settings.href, "/admin/settings");
  assert.equal(HELP_LINKS.activity.href, "/admin/audit");
  assert.equal(HELP_LINKS.website.href, "/admin/settings/software");
});
