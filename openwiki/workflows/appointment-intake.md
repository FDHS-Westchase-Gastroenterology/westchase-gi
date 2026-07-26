---
type: Workflow Guide
title: Appointment Intake and Staff Triage
description: End-to-end callback-request workflow from multilingual form submission through guarded persistence, notifications, portal triage, closure, and audit.
resource: src/lib/portal/intake.ts
tags: [workflow, intake, appointments, portal, audit]
---

# Appointment intake and staff triage

## Purpose

The intake workflow exists because the former vendor queue accumulated requests without staff awareness. The replacement makes a durable Postgres queue authoritative and gives staff a visible lifecycle in `/admin`. It supports callback requests, not live scheduling or a clinical record (`README.md`, `docs/PORTAL-PRODUCT.md`).

This workflow connects the [patient product](../domain/product-and-content.md) to the portal and relies on the controls in [data and security](../data-and-security.md).

## Submission paths

```text
AppointmentForm
├── hydrated JSON POST ──> /api/requests
└── native form POST ────> /api/requests/form
                              │
                              └── 303 /{locale}/appointment/received?receipt=<opaque token>
Both ──> processIntake ──> validate ─> rate-limit ─> insert request ─> notify
```

The same form also appears on localized contact pages. `src/lib/portal/contracts.ts` pins the wire format and limits: required name, callback phone, optional practical mailbox, office/time preferences, optional brief reason, locale, and source path. The browser, server, and database enforce compatible caps.

The honeypot field is deliberately outside the Zod schema. A filled honeypot returns a success-shaped decoy while persisting nothing, so bots do not learn the filter.

## Processing sequence

`processIntake` in `src/lib/portal/intake.ts` executes these steps:

1. **Honeypot check.** Filled submissions receive a decoy success and optional decoy receipt.
2. **Schema validation.** Invalid data returns bounded field errors without entering privileged storage code.
3. **Privileged client creation.** Missing server configuration fails as unavailable.
4. **Shared rate limit.** A Postgres RPC atomically allows five requests per ten minutes. It is keyed by an HMAC of the edge-provided client address, not a raw address or reversible plain digest. Storage failure fails closed.
5. **Durable insert.** The validated request is inserted into `requests`. Only after this succeeds can the API return an accepted request.
6. **Optional no-JS receipt.** The server stores a SHA-256 hash in a request event and returns an opaque `<event UUID>.<secret>` token. The receipt is locale-bound, single-use, and valid for 15 minutes.
7. **Notification fan-out.** Active recipients receive parallel PHI-free notices and one event is recorded per accepted/failed attempt. Notification failure never invalidates an already durable request.

Operational logs contain stable codes, IDs, status codes, and counts only. They must not include request payloads, recipient addresses, provider errors, message bodies, or bearer links.

## Truthful patient outcomes

The hydrated form distinguishes:

- **success** — the durable insert completed;
- **failure** — the request was not saved; and
- **unknown** — a timeout or ambiguous client outcome.

Failure and unknown states always present the staffed call/text fallback. The no-JS route uses POST/redirect/GET and puts only an opaque receipt or unsigned failure marker in the URL. The dynamic receipt page consumes the token; a guessed, expired, locale-mismatched, or reused token cannot prove success.

Never simplify these states into a generic confirmation. They are the patient-visible expression of the durable-persistence invariant.

## Staff triage

Authenticated staff work the queue under `src/app/admin/(portal)/requests/`:

1. New requests enter `new`.
2. Staff mark them `contacted` and then `scheduled` as work progresses.
3. Closing requires an explicit disposition:
   - `unconverted`: did not become an appointment;
   - `converted`: transferred to the authoritative FDHS record.
4. Reopening clears the closure classification and retention clock.

Staff can add attributed notes, filter/search/paginate the queue, and export the current filter set. CSV export neutralizes spreadsheet formulas and fails closed on invalid filters or inconsistent counts. Administrators can place/release legal holds; see [data and security](../data-and-security.md).

Every status change, note, closure, hold, and staff-visible management mutation is audited. Audit metadata may carry request IDs, actor identities, state transitions, and counts, but not patient fields or note text.

## Email is a signal, not the record

New-request email contains a stable notice and portal link with zero patient fields. “Accepted” means the configured provider returned a message ID; it does not prove inbox delivery. There are no automatic retries on the request path. The queue remains authoritative even if every notification fails. Provider ownership and email-path separation are documented in [integrations](../integrations.md).

## Change and verification guidance

When changing intake, update all affected boundaries together:

- wire contract: `src/lib/portal/contracts.ts`;
- hydrated UI: `src/components/AppointmentForm.tsx`;
- API routes: `src/app/api/requests/`;
- processor and receipts: `src/lib/portal/intake.ts`;
- database caps/RPCs: committed migrations;
- portal lifecycle/actions: `src/app/admin/(portal)/requests/`;
- tests: `e2e/intake-api.spec.ts`, `e2e/intake-form.spec.ts`, `e2e/portal-requests.spec.ts`, `e2e/portal-lifecycle.spec.ts`, and leak-hygiene coverage.

Do not run the full suite until you understand its database target. The safe layers and explicit Development/local guard are in [testing and source map](../testing-and-source-map.md).
