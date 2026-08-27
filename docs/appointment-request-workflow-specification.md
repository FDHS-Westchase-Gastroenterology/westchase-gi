# Appointment Request Workflow Specification

This document defines the current appointment-request workflow used by the authenticated staff
portal. It is a present-tense contract for product decisions, implementation, and verification.
Historical research, superseded behavior, branch instructions, and completed migration steps do
not belong here.

## How to use this specification

Read this document when changing appointment-request states, commands, queue behavior, history,
notifications, printing, or UI-facing workflow contracts.

Use the following sources with it:

| Source | Authority |
| --- | --- |
| [`PRODUCT.md`](../PRODUCT.md#staff-portal-admin) | Users, product boundaries, principles, and staff language |
| [`DESIGN.md`](../DESIGN.md#staff-portal-guardrails-product-register) | Staff-portal design system and interaction guardrails |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md#architectural-invariants) | Privacy, security, data custody, lifecycle, and external systems |
| [`src/lib/portal/workflow/`](../src/lib/portal/workflow) | Executable state, command, read, and result contracts |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md#verification) | Required local, hosted, and visual verification |

If prose and executable behavior disagree, stop and reconcile them. Do not silently describe a
known defect as the intended workflow or change product behavior by editing this document alone.

## 1. Scope and non-goals

The portal owns an appointment request from durable intake until staff either confirm its booking
handoff or close it without a booking. The workflow includes contact attempts, call-again work,
request notes, transition history, concurrency, Undo, and notification outcomes.

The portal does not:

- create or own a patient chart;
- create a second patient record;
- own the practice's scheduling system or the post-booking appointment lifecycle;
- model rescheduling, cancellation, check-in, completion, or no-show;
- assign requests to individual staff members;
- expose a generic status editor;
- allow direct browser access to the database; or
- place patient fields in email, logs, audit details, telemetry, URLs, or provider diagnostics.

The appointment date and time recorded at booking are a scheduling fact attached to the request.
They do not turn the request into a portal-owned Appointment entity.

## 2. Domain boundary and language

| Term | Meaning |
| --- | --- |
| **Appointment request** | The portal's unit of work and state machine |
| **Appointment** | The real booked visit in the practice scheduling system |
| **Booking handoff** | Staff confirmation that the visit was booked in the scheduling system |
| **Contact attempt** | Append-only evidence of one attempt to reach the patient |
| **Call-again time** | The current time when a `CONTACTED` request should return to attention |
| **Request note** | Staff-authored context, separate from contact and transition evidence |
| **Request transition** | Immutable metadata for one accepted lifecycle command |
| **Request history** | The staff view combining creation, notes, contact, transitions, Undo, and delivery outcomes |
| **Audit entry** | Metadata-only technical evidence, separate from Request history |

Staff surfaces use these labels:

- **Appointments** names the destination and workbench.
- **Appointment request** names the record being worked.
- **Scheduled** labels the action and result of a confirmed booking handoff.
- `BOOKED` is the durable domain state behind **Scheduled**.
- `SCHEDULED` is not a workflow state and must never be written by the current command path.
- **Call-again day** is the staff term. Storage uses `follow_up_at`.
- **Request history** remains distinct from technical audit records.

## 3. Portal workflow boundaries

Home and Appointments use the same shared queue. Home supports orientation, intake, printing, and
entry into current work. Appointments owns the complete request lifecycle. Every read distinguishes
empty work from a partial, unavailable, stale, unauthorized, or failed result.

## 4. Request state

### 4.1 States

The normal durable states are:

| State | Meaning | Ordinary next work |
| --- | --- | --- |
| `NEW` | Intake is durable and no contact attempt is recorded | Contact, confirm booking, or close as not actionable |
| `CONTACTED` | At least one attempt is recorded and the request remains open | Contact again, confirm booking, or close |
| `BOOKED` | Staff confirmed the booking handoff | Reopen only when the request must return to call work |
| `CLOSED` | Staff resolved the request without an active booking | Reopen only when the request must return to call work |

`BOOKED` and `CLOSED` are terminal for ordinary contact, booking, and close commands. Reopen is an
explicit correction path.

### 4.2 State fields

The request row stores the current state and current workflow facts:

- `version` for optimistic concurrency;
- `follow_up_at` for current call-again attention;
- `record_handoff_at` for booking confirmation;
- `appointment_at` for the booked visit time when known;
- `closed_at` and `closure_reason` for an unbooked closure; and
- `legacy_review_required` for unresolved migrated closures.

Only `CONTACTED` may carry `follow_up_at`. Only `BOOKED` may carry `record_handoff_at` or
`appointment_at`. Only `CLOSED` may carry closure facts.

A current booking command requires `appointment_at`. An older booking or a legacy closure later
classified as booked may have no recoverable appointment time. The UI presents that as unknown;
it never invents a date or says that no appointment exists.

## 5. Commands

All lifecycle writes use semantic commands. Each command includes the request ID, expected
version, actor, and an opaque idempotency key.

### 5.1 `RecordContactAttempt`

Allowed from `NEW` and `CONTACTED`.

Required input:

- outcome: `reached_follow_up`, `voicemail`, or `no_answer`; and
- a valid call-again time chosen by staff.

The command moves the request to `CONTACTED`, replaces the current call-again time, clears
booking and closure fields, appends contact evidence, and appends a transition.

Repeated contact attempts append evidence. They do not overwrite earlier attempts.

### 5.2 `ConfirmBookingHandoff`

Allowed from `NEW` and `CONTACTED`.

The command requires the appointment date and time. It moves the request to `BOOKED`, records the
booking confirmation and appointment time, clears call-again and closure fields, and appends a
transition. It does not create an Appointment record.

### 5.3 `CloseRequest`

Allowed from `NEW` and `CONTACTED`.

| Origin | Allowed reason |
| --- | --- |
| `NEW` | `not_actionable` |
| `CONTACTED` | `not_actionable` or `wont_schedule` |

The command moves the request to `CLOSED`, records the close time and typed reason, clears
call-again and booking fields, and appends a transition.

### 5.4 `ReopenRequest`

Allowed from resolved `BOOKED` or `CLOSED` requests that do not need legacy review.

The command requires a staff-chosen call-again time. It moves the request to `CONTACTED`, clears
booking, appointment, and closure fields, and appends a transition. Reopening a booked request
voids the appointment fact held by this workflow because the request has returned to call work.

### 5.5 `SetCallAgain`

Allowed only for a `CONTACTED` request whose call-again time is missing.

The command records the staff-chosen time without adding a contact attempt. It is a repair path,
not a general editor for existing call-again times.

### 5.6 `UndoLatestTransition`

Undo is a bounded correction, not a second workflow.

Undo is accepted only when:

- the target is the latest transition for the request;
- the transition is reversible and has not already been compensated;
- no later write changed the request version;
- the request is still within the fixed 15-minute window; and
- restoring the saved prior snapshot produces a coherent state.

Undo restores the prior workflow fields, increments the version, appends an Undo transition, and
marks the compensated transition in history. It never deletes evidence.

### 5.7 `ClassifyLegacyClosure`

Allowed only for a `CLOSED` row with `legacy_review_required = true`.

Staff classify it as booked or choose an allowed closure reason. A booked classification keeps
the appointment time unknown because no historical time can be recovered. This command is a
bounded legacy repair and is not shown on ordinary closed requests.

## 6. Durable evidence and history

Each accepted lifecycle command appends one immutable request transition. It records the request,
prior and resulting state, command, actor, resulting version, occurrence time, idempotency key,
and prior snapshot. It also records the reason, call-again time, appointment time, compensation,
or migration provenance owned by that command.

Request history keeps creation, contact attempts, notes, transitions, Undo, legacy
classification, and delivery outcomes distinct.

History is append-only and renders newest first. A note does not masquerade as a contact attempt,
a print action does not enter Request history, and a technical audit code is not staff language.

## 7. Guards and invariants

### 7.1 Common command guards

The server rejects a command when the actor is unauthorized, the request is missing, input is
invalid, the transition is illegal, the expected version is stale, the idempotency key conflicts,
or Undo is unavailable. Infrastructure failure returns `unavailable`; the UI must not present it
as a successful or known-unsaved result.

UI controls derive from the same legal-action policy as the server, but hidden controls are not
authorization. The command boundary and database enforce every rule again.

### 7.2 State-shape invariants

- `NEW` has no call-again, booking, appointment, closure, or legacy-review fields.
- `CONTACTED` has no booking, appointment, closure, or legacy-review fields.
- New contact and reopen commands always give `CONTACTED` a call-again time.
- `BOOKED` has a booking confirmation and no call-again or closure fields.
- Only an older or reclassified booking may have an unknown appointment time.
- Normal `CLOSED` requests have a close time and an allowed reason.
- A legacy-review closure has no invented close reason or appointment fact.
- A request never carries active facts from two states at once.

Database constraints protect these shapes even if application code is bypassed.

## 8. Transition matrix

| Current state | Command | Result |
| --- | --- | --- |
| `NEW` | `RecordContactAttempt` | `CONTACTED` with call-again time |
| `NEW` | `ConfirmBookingHandoff` | `BOOKED` with appointment time |
| `NEW` | `CloseRequest(not_actionable)` | `CLOSED` |
| `CONTACTED` | `RecordContactAttempt` | `CONTACTED` with new evidence and call-again time |
| `CONTACTED` | `ConfirmBookingHandoff` | `BOOKED` with appointment time |
| `CONTACTED` | `CloseRequest(not_actionable)` | `CLOSED` |
| `CONTACTED` | `CloseRequest(wont_schedule)` | `CLOSED` |
| `CONTACTED` without a call-again time | `SetCallAgain` | `CONTACTED` with call-again time |
| `BOOKED` | `ReopenRequest` | `CONTACTED` with call-again time |
| resolved `CLOSED` | `ReopenRequest` | `CONTACTED` with call-again time |
| legacy-review `CLOSED` | `ClassifyLegacyClosure` | `BOOKED` or resolved `CLOSED` |
| eligible latest transition | `UndoLatestTransition` | Restored prior state |

Every other state-command pair is illegal.

## 9. Transaction order

The workflow separates decision logic from database effects:

1. Reauthorize the staff actor.
2. Validate the command and parse all dates and reason codes.
3. Read the request and current version.
4. Decide the legal result using the pure state machine.
5. Call the service-only command RPC with the decision, expected version, and idempotency key.
6. Lock and re-check durable state inside the transaction.
7. Update the request and increment its version.
8. Append command-specific evidence and one transition.
9. Append any submitted note and metadata-only audit evidence owned by the operation.
10. Commit before returning success.

A database error rolls back the whole command. Notification delivery is not part of a lifecycle
command and cannot change the accepted request state.

## 10. Concurrency and idempotency

Each work surface reads the current version. Every command submits that version. If another write
wins first, the command returns `stale_version` with the current state and version. The UI reloads
truth, explains the conflict, and derives legal actions again. It does not replay the stale choice
against new state.

Each idempotency key is bound to the actor, request, and command fingerprint. An exact retry
returns the original result. Reusing the key for different input returns `idempotency_conflict`
without mutation.

Ambiguous network results are retried with the same key. A new user action gets a new key.

## 11. Intake and notifications

Website intake validates and rate-limits on the server. One database transaction creates the
`NEW` request and snapshots active notification recipients into outbox rows. The success response
is not returned until the request is durable.

Notification messages are PHI-free. They tell staff that a new request exists and link to the
authenticated portal. Delivery runs after the intake transaction. Accepted, failed, timed-out,
and unavailable outcomes are recorded separately and never roll back the request.

Staff-authored intake uses the same request field contract and writes the `NEW` request,
staff-origin event, metadata-only audit entry, and idempotency receipt together. It does not create
website-submission notification work.

## 12. Queue, attention, and printing

Attention is derived from durable request facts:

- `NEW` requests need a first call;
- `CONTACTED` requests whose call-again time is due need another call;
- `CONTACTED` requests missing a call-again time need repair; and
- future call-again work remains visible without being presented as due now.

Counts and rows come from the same filtered truth. A partial or failed read names the failure and
does not substitute zero.

Preparing a New-request print packet uses one database statement to snapshot the exact durable
`NEW` set, oldest first, and write one metadata-only audit entry. The packet contains the patient
details staff need for the call and a paper routing area.

Preparing, viewing, printing, cancelling, reloading, or closing a packet never changes request
state, version, attention, or Request history. Paper may distribute work; the live queue remains
authoritative.

## 13. Implementation rules

Keep decisions in `workflow/machine.ts`, shared vocabulary in `workflow/contracts.ts`, and writes
behind `executeRequestCommand` and the service-only RPC. Parse database results at the boundary.
Derive controls from `legalActionsFor`, then enforce the same policy on the server and database.

Browser code never receives service-role credentials or direct database access. The presentation
layer renders `booked` as **Scheduled**, uses practice-local time for labels, and treats an unknown
legacy appointment time as unknown. Patient fields stay out of logs, email, telemetry, audit
details, URLs, and idempotency receipts. Retired generic status and close mutations stay retired.

## 14. Legacy data

Current reads normalize the retired stored value `scheduled` to `booked` but current commands
never write `scheduled`. Legacy closed rows without a trustworthy outcome stay marked for review
until staff classify them.

Migration provenance remains durable. Do not guess a closure reason, appointment time, or staff
actor. Cleanup may remove compatibility code only after the hosted schema and all retained rows no
longer need it.

## 15. Verification

Workflow changes must cover all legal and illegal transitions, state shapes, repeated contact,
call-again replacement, booking, close, reopen, legacy classification, and bounded Undo. They must
also cover stale versions, idempotent replay, changed-payload conflicts, transaction atomicity,
intake boundaries, PHI-free notifications, delivery failure, queue and print membership, and
honest UI states. Visible changes also cover desktop, mobile, keyboard, focus, reduced motion, and
print where applicable.

Use the repository commands and hosted checks in `CONTRIBUTING.md`. Database work requires the
exact-head Supabase Preview and `supabase-integration` checks. A visible change also requires the
visual evidence defined in `AGENTS.md`.

## 16. Acceptance

Staff can enter a request, understand its truth, perform only legal actions, recover from stale or
unavailable results, and see the durable outcome. Implementation, merge, deployment, database
promotion, scheduler activation, and operational use remain separate facts.
