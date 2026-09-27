import assert from "node:assert/strict";
import test from "node:test";

import { createEmailSender } from "./email.ts";
import { createAppointmentNotificationEvents } from "./intake-notification.ts";
import { sendRecipientConfirmation, sendStaffSetupLink } from "./management-email.ts";

/* The email delivery contract, with a recording transport in place of the
   provider: what a send reports back, what it never logs, and how the
   notification and management senders build on it. */

const MESSAGE = {
  purpose: "recipient_confirmation",
  to: "private-recipient@example.test",
  subject: "Private subject",
  text: "Private body https://portal.example.test/#bearer-secret",
  idempotencyKey: "private-idempotency-key",
};

function fakeTransport(send) {
  return { provider: "recording-fake", send };
}

test("a send reports acceptance, or the provider's reason for refusing", async () => {
  const accepted = await createEmailSender(
    fakeTransport(async () => Promise.resolve({ providerMessageId: "message-123" })),
  )(MESSAGE);
  assert.deepEqual(accepted, {
    status: "accepted",
    provider: "recording-fake",
    providerMessageId: "message-123",
  });

  for (const [reason, providerStatusCode] of [
    ["rejected", 422],
    ["rate_limited", 429],
    ["unconfigured", null],
  ]) {
    const outcome = await createEmailSender(
      fakeTransport(async () => Promise.resolve({ reason, providerStatusCode })),
    )(MESSAGE);
    assert.deepEqual(outcome, {
      status: "failed",
      provider: "recording-fake",
      reason,
      providerStatusCode,
    });
  }
});

test("a transport that throws or stalls fails without logging the message", async () => {
  const logs = [];
  const originalError = console.error;
  console.error = (...args) => {
    logs.push([...args]);
  };

  try {
    const thrown = await createEmailSender(
      fakeTransport(() => {
        throw new Error("provider-secret-error-body");
      }),
    )(MESSAGE);
    assert.equal(thrown.status, "failed");
    assert.equal(thrown.reason, "transport_failure");

    const timedOut = await createEmailSender(
      fakeTransport(async () => new Promise(() => undefined)),
      5,
    )(MESSAGE);
    assert.deepEqual(timedOut, {
      status: "failed",
      provider: "recording-fake",
      reason: "timed_out",
      providerStatusCode: null,
    });
  } finally {
    console.error = originalError;
  }

  const serializedLogs = JSON.stringify(logs);
  for (const secret of [
    MESSAGE.to,
    MESSAGE.subject,
    MESSAGE.text,
    MESSAGE.idempotencyKey,
    "bearer-secret",
    "provider-secret-error-body",
  ]) {
    assert.equal(serializedLogs.includes(secret), false, `log leaked ${secret}`);
  }
});

test("a new request pings every recipient once with a PHI-free message and one event each", async () => {
  const messages = [];
  const send = createEmailSender(
    fakeTransport(async (message) => {
      await Promise.resolve();
      messages.push(message);
      return message.to.startsWith("first")
        ? { providerMessageId: "accepted-1" }
        : { reason: "rejected", providerStatusCode: 422 };
    }),
  );
  const recipients = [
    { id: "recipient-a", email: "first@example.test" },
    { id: "recipient-b", email: "second@example.test" },
  ];

  const events = await createAppointmentNotificationEvents(
    send,
    "request-123",
    recipients,
    "https://portal.example.test/admin",
  );

  assert.deepEqual(events, [
    {
      request_id: "request-123",
      type: "notification",
      recipient: "first@example.test",
      provider_message_id: "accepted-1",
      status: "accepted",
      meta: { provider: "recording-fake" },
    },
    {
      request_id: "request-123",
      type: "notification",
      recipient: "second@example.test",
      provider_message_id: null,
      status: "failed",
      meta: { provider: "recording-fake", reason: "rejected", provider_status_code: 422 },
    },
  ]);
  assert.deepEqual(
    messages.map((message) => message.idempotencyKey),
    [
      "appointment-notification/request-123/recipient-a",
      "appointment-notification/request-123/recipient-b",
    ],
  );
  assert.deepEqual(
    new Set(messages.map((message) => message.text)),
    new Set([
      "A new appointment request is waiting in the Westchase GI portal.\n\nOpen the portal: https://portal.example.test/admin",
    ]),
  );

  const serializedMessages = JSON.stringify(messages);
  for (const patientValue of [
    "Patient Name",
    "8135550101",
    "patient@example.test",
    "medical reason",
  ]) {
    assert.equal(
      serializedMessages.includes(patientValue),
      false,
      `message carried ${patientValue}`,
    );
  }

  const unconfigured = await createAppointmentNotificationEvents(
    send,
    "request-456",
    recipients,
    null,
  );
  assert.equal(unconfigured.length, 2);
  assert.equal(
    unconfigured.every((event) => event.status === "failed"),
    true,
  );
  assert.deepEqual(unconfigured[0].meta, {
    provider: "application",
    reason: "unconfigured",
    provider_status_code: null,
  });
  assert.equal(messages.length, 2, "an unconfigured portal URL sends nothing");
});

test("management email reports delivery, and a failed setup link still hands back the one-time URL", async () => {
  const messages = [];
  const acceptedSender = createEmailSender(
    fakeTransport(async (message) => {
      await Promise.resolve();
      messages.push(message);
      return { providerMessageId: `accepted-${messages.length}` };
    }),
  );
  const failedSender = createEmailSender(
    fakeTransport(async () =>
      Promise.resolve({ reason: "transport_failure", providerStatusCode: null }),
    ),
  );

  const recipient = { id: "recipient-1", email: "recipient@example.test" };
  assert.equal(await sendRecipientConfirmation(acceptedSender, recipient), "accepted");
  assert.equal(await sendRecipientConfirmation(failedSender, recipient), "failed");
  assert.equal(messages[0].text.includes("Messages are sent from"), false);

  const setup = {
    email: "staff@example.test",
    confirmationUrl: "https://portal.example.test/admin/auth/confirm",
    tokenHash: "one-time-token-hash",
    type: "invite",
    userId: "user-1",
  };
  assert.deepEqual(await sendStaffSetupLink(acceptedSender, setup), {
    ok: true,
    delivery: "accepted",
  });
  const fallback = await sendStaffSetupLink(failedSender, setup);
  assert.equal(fallback.ok, true);
  assert.equal(fallback.delivery, "failed");
  assert.match(fallback.fallbackSetupUrl, /#token_hash=one-time-token-hash&type=invite/);
  assert.match(messages[1].idempotencyKey, /^staff-setup\/invite\/user-1\/[a-f0-9]{32}$/);
});
