import { expect, test } from "@playwright/test";
import {
  createEmailSender,
  type PortalEmailMessage,
  type PortalEmailTransport,
} from "../src/lib/portal/email";
import { createAppointmentNotificationEvents } from "../src/lib/portal/intake-notification";
import {
  sendRecipientConfirmation,
  sendStaffSetupLink,
} from "../src/lib/portal/management-email";

const MESSAGE: PortalEmailMessage = {
  purpose: "recipient_confirmation",
  to: "private-recipient@example.test",
  subject: "Private subject",
  text: "Private body https://portal.example.test/#bearer-secret",
  idempotencyKey: "private-idempotency-key",
};

function fakeTransport(
  send: PortalEmailTransport["send"],
): PortalEmailTransport {
  return { provider: "recording-fake", send };
}

test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "Pure email contract runs once without browser or provider calls.",
  );
});

test("normalizes provider acceptance, rejection, rate limits, and missing configuration", async () => {
  const accepted = await createEmailSender(
    fakeTransport(async () => ({ providerMessageId: "message-123" })),
  )(MESSAGE);
  expect(accepted).toEqual({
    status: "accepted",
    provider: "recording-fake",
    providerMessageId: "message-123",
  });

  for (const [reason, providerStatusCode] of [
    ["rejected", 422],
    ["rate_limited", 429],
    ["unconfigured", null],
  ] as const) {
    const outcome = await createEmailSender(
      fakeTransport(async () => ({ reason, providerStatusCode })),
    )(MESSAGE);
    expect(outcome).toEqual({
      status: "failed",
      provider: "recording-fake",
      reason,
      providerStatusCode,
    });
  }
});

test("normalizes transport throws and deadline expiry without leaking message data", async () => {
  const logs: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => logs.push(args);

  try {
    const thrown = await createEmailSender(
      fakeTransport(async () => {
        throw new Error("provider-secret-error-body");
      }),
    )(MESSAGE);
    expect(thrown).toMatchObject({
      status: "failed",
      reason: "transport_failure",
    });

    const timedOut = await createEmailSender(
      fakeTransport(() => new Promise(() => undefined)),
      5,
    )(MESSAGE);
    expect(timedOut).toEqual({
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
    expect(serializedLogs).not.toContain(secret);
  }
});

test("fans out stable PHI-free appointment messages with one event per recipient", async () => {
  const messages: PortalEmailMessage[] = [];
  const send = createEmailSender(
    fakeTransport(async (message) => {
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

  expect(events).toEqual([
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
      meta: {
        provider: "recording-fake",
        reason: "rejected",
        provider_status_code: 422,
      },
    },
  ]);
  expect(messages.map((message) => message.idempotencyKey)).toEqual([
    "appointment-notification/request-123/recipient-a",
    "appointment-notification/request-123/recipient-b",
  ]);
  expect(new Set(messages.map((message) => message.text))).toEqual(
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
    expect(serializedMessages).not.toContain(patientValue);
  }

  const unconfigured = await createAppointmentNotificationEvents(
    send,
    "request-456",
    recipients,
    null,
  );
  expect(unconfigured).toHaveLength(2);
  expect(unconfigured.every((event) => event.status === "failed")).toBe(true);
  expect(unconfigured[0]?.meta).toEqual({
    provider: "application",
    reason: "unconfigured",
    provider_status_code: null,
  });
  expect(messages).toHaveLength(2);
});

test("preserves management success and fallback behavior behind the same sender", async () => {
  const messages: PortalEmailMessage[] = [];
  const acceptedSender = createEmailSender(
    fakeTransport(async (message) => {
      messages.push(message);
      return { providerMessageId: `accepted-${messages.length}` };
    }),
  );
  const failedSender = createEmailSender(
    fakeTransport(async () => ({
      reason: "transport_failure",
      providerStatusCode: null,
    })),
  );

  expect(
    await sendRecipientConfirmation(acceptedSender, {
      id: "recipient-1",
      email: "recipient@example.test",
    }),
  ).toBe("accepted");
  expect(
    await sendRecipientConfirmation(failedSender, {
      id: "recipient-1",
      email: "recipient@example.test",
    }),
  ).toBe("failed");
  expect(messages[0]?.text).not.toContain("Messages are sent from");

  const setup = {
    email: "staff@example.test",
    confirmationUrl: "https://portal.example.test/admin/auth/confirm",
    tokenHash: "one-time-token-hash",
    type: "invite" as const,
    userId: "user-1",
  };
  expect(await sendStaffSetupLink(acceptedSender, setup)).toEqual({
    ok: true,
    delivery: "accepted",
  });
  const fallback = await sendStaffSetupLink(failedSender, setup);
  expect(fallback).toMatchObject({ ok: true, delivery: "failed" });
  if (fallback.delivery !== "failed") throw new Error("Expected fallback link");
  expect(fallback.fallbackSetupUrl).toContain(
    "#token_hash=one-time-token-hash&type=invite",
  );
  expect(messages[1]?.idempotencyKey).toMatch(
    /^staff-setup\/invite\/user-1\/[a-f0-9]{32}$/,
  );
});
