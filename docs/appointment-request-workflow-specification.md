# Appointment Request Workflow Specification

**Decision date:** 2026-08-04
**Scope:** Appointment-request intake, staff resolution, history, concurrency, notifications,
and migration
**Status:** Normative build-era specification; no production implementation is authorized by
this document alone

This specification defines the appointment-request workflow that the staff portal is to
implement before that workflow is substantially refactored. It preserves the current system as
the as-is model, defines the intended machine separately, and makes the repair boundary
explicit. Until an approved migration and application release implement the to-be model, the
running code and schema remain the production behavior.

The binding decision chain is:

- [Method and architecture baseline: minimum sufficient formalism](https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/issues/211)
  defines the brownfield method, formalism boundary, and architecture baseline.
- [Extract the as-is appointments state machine](https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/issues/212)
  supplies the evidence model. Its full cited findings remain on the preserved
  [`research/as-is-appointments-machine` branch](https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/blob/research/as-is-appointments-machine/docs/research/2026-08-04-as-is-appointments-machine.md).
- [To-be appointments state machine: canonical decision record](https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/issues/216)
  decides the states, entity boundary, invariants, migration mapping, and label/state split.

This document compiles those decisions. It does not reopen them.

## 1. Scope and non-goals

The machine owns the portal's handling of an inbound appointment request from durable intake
through a verified booking handoff or an unbooked closure. It also specifies the supporting
contact-attempt evidence, transition history, concurrency contract, and notification ordering
needed to keep that workflow correct.

This specification does **not**:

- model the lifecycle of a real appointment after booking;
- create a portal `Appointment` entity, calendar, schedule, reschedule, cancellation, check-in,
  completion, or no-show workflow;
- make the portal authoritative for the practice's scheduling system;
- introduce staff assignment or ownership;
- authorize a generic status setter, direct client database writes, event sourcing, CQRS,
  actors, CRDTs, a workflow engine, or a new distributed system;
- decide the visual design of the Appointments workbench; or
- authorize a schema migration, hosted Supabase change, deployment, or Production data write.

Patient data remains subject to the repository's PHI-minimal posture. No patient-supplied value
may enter a notification, transition log, audit detail, idempotency record, URL, application log,
telemetry payload, or provider diagnostic.

## 2. Domain boundary and vocabulary

### 2.1 Entities and records

| Concept | Ownership and lifecycle |
|---|---|
| **Appointment request** | The primary state machine and the portal's unit of work. It begins at intake and resolves as `BOOKED` or `CLOSED`. |
| **Appointment** | The real booked visit in the practice scheduling system. The portal neither creates a local Appointment entity nor owns its post-booking lifecycle. |
| **Booking handoff** | Evidence that staff confirmed the booking in the practice scheduling system. It resolves the request as `BOOKED`; it is not an Appointment record. |
| **Contact attempt** | Append-only evidence of one staff attempt to reach the patient. Repeated attempts do not overwrite prior attempts. |
| **Appointment request note** | Staff-authored request context. Notes remain distinct from contact attempts and state transitions and continue to appear in Request history. |
| **Request transition** | Immutable metadata describing one accepted lifecycle command: prior state, resulting state, command, actor, version, and time. It supports accountability but is not the source used to reconstruct current state. |
| **Notification delivery** | An independent asynchronous outbox lifecycle. Delivery failure does not roll back or change appointment-request state. |
| **Audit entry** | The metadata-only technical record of a staff or system operation. It remains distinct from staff-facing Request history. |

### 2.2 Staff language and domain language

- **Appointments** remains the staff-surface/workbench label.
- **Appointment request** remains the unit staff work.
- **Appointment** means only the real booked visit in the practice scheduling system.
- **Scheduled** remains the staff-facing action label that confirms a booking handoff.
- **BOOKED** is the domain and persisted request state reached by that action. `SCHEDULED` is
  not a to-be request state.
- **Booked** is how the resulting `BOOKED` state renders in staff-facing badges, filters,
  summaries, and Request history. Only the confirming action uses **Scheduled**.
- **Request history** remains the staff-facing history name. It must not become Appointment
  history because a request has history before any appointment exists.
- **Booking handoff** replaces record handoff as the converted-request concept.

The action/state split is deliberate: the control uses the word staff already use, while the
domain records what became true. An implementation must not translate the `Scheduled` action
back into a persisted `SCHEDULED` state.

## 3. The as-is model

The as-is model records what the current application permits, including behavior that the UI
hides and behavior the to-be machine rejects. It is evidence, not authority for the redesign.

### 3.1 Current state and entangled sub-state

The current request state is:

```text
new ───────────────► contacted
 │                       │
 ├────────► scheduled ◄──┤
 └────────► closed    ◄──┘

Any state can in practice reach any other state through a service-role RPC.
Deletion removes the row and cascades child request events.
```

One `public.requests` row currently combines:

- status: `new | contacted | scheduled | closed`;
- closure disposition and closure clock;
- record-handoff clock;
- call-again timestamp (`follow_up_at` at the storage boundary); and
- legal-hold state.

Child `request_events` rows currently carry call outcomes, notes, notification outcomes,
receipts, and Undo evidence. There is no materialized Appointment record or visit date/time;
every current `scheduled` row is undated.

### 3.2 Current mutation paths

| Path | Current behavior | Atomicity and side effects |
|---|---|---|
| Intake | Validated anonymous intake inserts `requests.status = 'new'`. | The request insert commits before in-band notification fan-out. Notification events are written later. |
| Call-outcome save | Seven outcomes derive `contacted`, `scheduled`, or `closed` without reading the origin state. | Request fields, outcome event, optional note, and audit row commit in one RPC transaction. |
| Undo | Restores the snapshot on the latest still-current call-outcome event. | Request, event status, Undo evidence, and audit commit together. The RPC has no time bound; the UI exposes Undo only in the current browser session. |
| Add note | Appends a note without changing status. | Note and audit commit together. |
| Generic status set | `portal_update_request_status` accepts every status from every status, clears closure fields, can produce unclassified closures, and writes no request event. | Request and technical audit commit together; the RPC has no application UI caller but remains callable by the service role. |
| Semantic close | `portal_close_request` closes from any state with a converted/unconverted disposition. | Request and technical audit commit together; it leaves a pre-existing call-again timestamp intact. |
| Legal hold / deletion / retention | Privileged RPCs manage holds, exceptional deletion, and retention deletion. | Each operation and audit effect is atomic. The retention RPC exists, but nothing in the repository schedules it. |
| Direct service-role write | Any CHECK-valid request shape can be inserted, updated, or deleted directly. | It bypasses transition and audit policy. |

### 3.3 Current call-outcome transition matrix

The current database RPC accepts all 28 origin-state × outcome combinations. The client
composer exposes a smaller, inconsistent subset because it excludes the current status as a
destination.

| Origin | Contact-implying outcome → `contacted` | `booked` → `scheduled` | Closing outcome → `closed` |
|---|---|---|---|
| `new` | UI and database allow | UI and database allow | UI and database allow |
| `contacted` | UI rejects the self-transition; database allows | UI and database allow | UI and database allow |
| `scheduled` | UI rejects; database allows reopening | UI rejects; database allows another event | UI and database allow |
| `closed` | UI and database allow reopening | UI and database allow reopening | UI rejects; database allows re-closing |

The generic setter separately permits all ordered status pairs. Consequently, there is no
server-side legal-transition machine today.

### 3.4 Current enforcement and failure behavior

The current implementation does enforce several important properties:

- browser database access is closed and staff application actions reauthorize server-side;
- combined call-outcome saves and Undo operations are transactional;
- closure-field shape, field caps, legal-hold shape, and status vocabulary have database
  constraints;
- Undo rejects a changed snapshot or a later outcome;
- audit insertion failure rolls back the associated RPC mutation; and
- intake durability precedes the patient-visible success state.

It does not enforce:

- legal origin-state → command transitions at a server or database authority;
- optimistic versions on staff commands;
- idempotency for repeated saves or notes;
- authenticated actor identity inside the database operation;
- repeat contact attempts through the UI;
- terminal-state clearing for every call-again path;
- a temporal Undo bound;
- notification dispatch through an outbox; or
- execution of the retention motor.

### 3.5 As-is concurrency and notification ordering

Concurrent saves lock the request row and serialize, but both succeed: the last writer wins and
the earlier action survives only in history. No stale-state error tells the second staff member
that the page was old. Duplicate save requests create duplicate outcome events.

Intake currently follows this order:

```text
insert request → commit → read recipients → send pings → write delivery events → respond
```

A crash after the request commit but before fan-out leaves a durable request with no ping and no
evidence that fan-out failed to begin. A successful send followed by an event-write failure loses
the delivery evidence. This is the failure window the transactional outbox must close.

## 4. The to-be state machine

The appointment request is a finite, guarded state-transition system:

\[
M = (S, C, E, \delta, I)
\]

where \(S\) is the state set, \(C\) the command set, \(E\) the resulting domain-event set,
\(\delta\) a partial transition function, and \(I\) the invariants. A command either returns a
complete decision—next current state plus events—or a typed domain error. Undefined transitions
are rejected without mutation.

### 4.1 States

| State | Meaning | Terminal for ordinary commands? |
|---|---|---|
| `NEW` | Patient-created and not yet worked by staff. Staff owes the next action. | No |
| `CONTACTED` | Staff-worked and unresolved. The name does not claim the patient was reached. Staff may record another attempt or resolve the request. | No |
| `BOOKED` | Staff confirmed booking handoff in the practice scheduling system. The request is successfully resolved. | Yes |
| `CLOSED` | The request was resolved without booking. | Yes |

The graph is:

```text
                    ConfirmBookingHandoff
              ┌────────────────────────────────► BOOKED
              │                                    │
              │                                    │ ReopenRequest
              │                                    ▼
NEW ──────────┼── RecordContactAttempt ───────► CONTACTED
 │            │                                  │  │
 │            │     RecordContactAttempt         │  │ ConfirmBookingHandoff
 │            │          (self)                  │  └────────────────────► BOOKED
 │            │                                  │
 │            │                                  └── CloseRequest ───────► CLOSED
 │            │                                                               │
 └── CloseRequest(non-contact reason) ────────────────────────────────────────►│
                                                                              │
                                                        ReopenRequest ─────────┘

UndoLatestTransition is a guarded compensating transition to the saved prior snapshot.
```

`BOOKED` and `CLOSED` reject ordinary contact, booking, and close commands. `ReopenRequest`, an
eligible `UndoLatestTransition`, and the migration-only legacy review command are explicit
exceptions rather than proof that the terminal states are non-terminal.

### 4.2 Orthogonal state

The request state is intentionally not a Cartesian product of unrelated concerns:

- a call-again timestamp is attention data and is valid only on `CONTACTED`;
- contact attempts are append-only evidence, not states;
- notification delivery has its own outbox state;
- legal hold belongs to the data lifecycle, not request resolution;
- notes do not move the machine; and
- staff assignment does not exist in this model.

## 5. Commands

Every accepted staff lifecycle command receives the authenticated actor from server context,
the request identifier, the caller's expected request version, and an idempotency key. Command
payloads contain only the fields needed for that intent.

### 5.1 `RecordContactAttempt`

Records one attempt and leaves unresolved work in `CONTACTED`.

Payload:

- contact outcome: `reached_follow_up | voicemail | no_answer`;
- optional call-again day for `reached_follow_up`;
- required call-again day for `voicemail` and `no_answer`; and
- optional appointment request note, if the UI preserves the existing one-action combined save.

Guards:

- origin is `NEW` or `CONTACTED`;
- call-again input follows the outcome policy and the existing practice-local, present-to-90-day
  boundary;
- an optional note satisfies the existing 1–2,000-character trimmed boundary; and
- the common authorization, version, and idempotency guards pass.

Result:

- state is `CONTACTED` (including a legal `CONTACTED → CONTACTED` self-transition);
- the current call-again value is replaced by this command's value;
- one contact-attempt fact is appended; and
- one request transition and one technical audit entry are appended.

### 5.2 `ConfirmBookingHandoff`

Confirms that staff booked the visit in the practice scheduling system. The staff control for
this command is labeled **Scheduled**.

Guards:

- origin is `NEW` or `CONTACTED`;
- staff explicitly confirms the booking handoff; and
- the common authorization, version, and idempotency guards pass.

Result:

- state is `BOOKED`;
- current call-again data is cleared;
- booking-handoff evidence and its retention clock are recorded;
- no portal Appointment entity or visit date/time is created; and
- one request transition and one technical audit entry are appended.

The current `booked` and `scheduled_transferred` call outcomes both compile into this command.
`scheduled_transferred` is retired as a closure outcome: in the to-be model, evidence of a
booking resolves the request as `BOOKED`, never `CLOSED`.

### 5.3 `CloseRequest`

Resolves the request without a booking.

Payload:

- typed unbooked closure reason `not_actionable | wont_schedule`; and
- optional appointment request note if supplied by the same staff action.

Guards:

- origin `CONTACTED` permits either reason;
- origin `NEW` permits only `not_actionable`, the non-contact closure reason;
- `wont_schedule` is rejected from `NEW` because it asserts a contact-dependent outcome;
- no booking handoff is present; and
- the common authorization, version, and idempotency guards pass.

Result:

- state is `CLOSED`;
- current call-again data is cleared;
- typed closure evidence and the closure clock are recorded; and
- one request transition and one technical audit entry are appended.

### 5.4 `ReopenRequest`

Returns a resolved request to staff work without pretending it is new.

Guards:

- origin is `BOOKED` or `CLOSED`;
- the row is not awaiting legacy-closure review; and
- the common authorization, version, and idempotency guards pass.

Result:

- state is `CONTACTED`;
- terminal booking/closure clocks and terminal reason fields are cleared from current state;
- call-again data starts empty until staff explicitly records it; and
- one request transition and one technical audit entry preserve the prior resolution.

Clearing current terminal fields never erases prior transition or audit evidence.

### 5.5 `UndoLatestTransition`

Compensates for the latest eligible human lifecycle transition by restoring its complete prior
request snapshot. It never deletes or rewrites history.

Guards:

- the referenced transition is the request's latest reversible transition;
- current state and version still equal that transition's recorded result;
- no later lifecycle or attention mutation has committed;
- the caller supplies the current expected version and a fresh idempotency key; and
- the command is received no later than 15 minutes after the transition's durable
  `occurred_at` time.

Result:

- current state and orthogonal lifecycle fields are restored from the saved prior snapshot;
- version advances again rather than moving backward;
- an Undo transition referencing the compensated transition is appended; and
- a technical audit entry is appended.

Intake creation, migration backfills, legacy classification, legal-hold operations, retention,
and deletion are not reversible through this staff command.

The 15-minute window is a correction boundary, not a retention or business-time setting. After
it closes, staff use `ReopenRequest`; administrators do not extend the window per request. A
retry of an Undo that already committed remains recoverable through its idempotency key even if
the retry reaches the server after the window.

### 5.6 `ClassifyLegacyClosure` (migration-only repair path)

Resolves a migrated `CLOSED` row whose historic closure outcome is unknown. This is a dedicated
review operation, not a general status editor.

Guards:

- state is `CLOSED` with `legacy_review_required = true`;
- staff supplies the reviewed outcome: booked or unbooked, with a typed closure reason where
  the evidence supports one;
- no historical visit date, booking time, or contact fact is invented; and
- the common authorization, version, and idempotency guards pass.

Result:

- booked review → `BOOKED` with legacy-review provenance;
- unbooked review → normal `CLOSED` with legacy-review provenance;
- the legacy-review flag clears;
- the retention clock starts no earlier than the review, so migration cannot cause premature
  deletion; and
- one immutable classification transition and one technical audit entry are appended.

Until classification, the row remains visible for review and ineligible for automatic deletion.

### 5.7 Operations outside the transition function

- **Intake creation** creates a new request in `NEW`; there is no existing version to compare.
  Its request insert, initial history evidence, and new-request-ping outbox records must commit
  together before the patient sees success. Duplicate-patient-request policy is outside this
  state machine and must not be inferred from lifecycle idempotency.
- **Add appointment request note** appends a note and audit entry without moving request state.
  Notes do not advance the request's lifecycle version or stale an otherwise eligible Undo.
  They stay out of transition metadata because they may contain patient-supplied context.
- **Legal hold, retention, and exceptional deletion** remain privileged data-lifecycle
  operations with their existing approval and audit rules. They do not masquerade as lifecycle
  commands.

## 6. Domain events and durable evidence

The pure transition decision returns domain facts. The imperative shell persists those facts in
the appropriate append-only record within the same transaction as current state.

| Accepted command/operation | Required fact |
|---|---|
| Intake creation | `AppointmentRequestCreated` |
| `RecordContactAttempt` | `ContactAttemptRecorded` |
| `ConfirmBookingHandoff` | `BookingHandoffConfirmed` |
| `CloseRequest` | `AppointmentRequestClosed` |
| `ReopenRequest` | `AppointmentRequestReopened` |
| `UndoLatestTransition` | `AppointmentRequestTransitionUndone` referencing the compensated transition |
| `ClassifyLegacyClosure` | `LegacyClosureClassified` |

Each accepted lifecycle command also appends exactly one request-transition envelope containing:

- request ID;
- from-state and to-state (equal for a repeat contact attempt);
- semantic command name;
- authenticated actor ID;
- idempotency key or command ID;
- resulting request version;
- occurred-at time supplied explicitly by the shell;
- non-PHI reason/outcome code where applicable; and
- a reference to the compensated transition for Undo.

Transition metadata never contains a patient name, contact detail, intake reason, note text,
email destination, or provider response. Request history may compose contact attempts, notes,
transitions, and relevant delivery outcomes for staff, but their storage and privacy boundaries
remain separate.

The transition log is not an event store: current state is read from the request row, startup
does not replay transitions, and schema evolution does not require rebuilding requests from
history.

## 7. Guards and invariants

### 7.1 Common command guards

Every staff lifecycle command must prove all of the following before it can commit:

1. The caller is an active, onboarded staff member authorized by the server-owned role source.
2. Actor identity comes from authenticated application context, never a caller-provided email or
   request field.
3. The request exists and is visible to that authorized operation.
4. The command payload is structurally and semantically valid.
5. The command is legal from the current state.
6. The idempotency key is either new or belongs to the same already-accepted command payload.
7. The expected version equals the durable current version, unless guard 6 recovers that
   command's already-accepted result.
8. Database constraints admit the complete resulting row shape.

Failure returns a typed result such as `unauthorized`, `not_found`, `invalid_command`,
`illegal_transition`, `stale_version`, `idempotency_conflict`, or `undo_unavailable`. No rejected
command writes current state, transition history, audit evidence, or outbox work.

### 7.2 State-shape invariants

- Exactly one current state exists.
- `NEW` carries no current call-again, booking-handoff, closure, or legacy-review data.
- Only `CONTACTED` may carry current call-again/attention data.
- Normal `BOOKED` carries booking-handoff evidence and no current call-again or closure data.
- Normal `CLOSED` carries typed closure evidence and no booking-handoff or current call-again
  data.
- Migrated unclassified closures are the sole temporary exception: `CLOSED` plus an explicit
  legacy-review flag and no invented closure fact.
- `BOOKED` and `CLOSED` reject ordinary contact, booking, and close commands.
- Booking handoff never creates, moves, cancels, or completes an Appointment.
- Every accepted lifecycle command advances version exactly once.
- Every accepted lifecycle command has one transition envelope and one metadata-only technical
  audit entry in the same commit.
- Transition history is append-only. Undo appends a compensating fact.
- A request has at most one accepted result for an idempotency key.
- Notifications are dispatched only from committed outbox work.

### 7.3 Enforcement layers

| Invariant type | Required enforcement |
|---|---|
| Legal state × command transition | Pure domain transition function, called by every mutation adapter |
| Role and active-staff policy | Server application policy before the command; database interface unavailable to public roles |
| State vocabulary and coherent terminal/attention shape | Postgres CHECK constraints |
| One accepted command key and one resulting version | Postgres UNIQUE constraints |
| Atomic current state + transition + audit + outbox | One short Postgres transaction / atomic RPC |
| Stale staff view | Conditional optimistic version update |
| Actor attribution | Authenticated server context passed through the sole command authority |
| Immutable history | No UPDATE/DELETE capability for ordinary application roles; corrective facts append |
| Commit before notify | Transactional outbox; workers can claim only committed rows |
| PHI-free external effects | Application payload construction plus database caps/allowlists where representable |

RLS remains enabled on application tables in exposed schemas. Public, anonymous, and ordinary
authenticated roles receive no direct mutation path. Atomic functions remain narrowly granted
and `SECURITY INVOKER` unless a separately reviewed privilege boundary proves otherwise.

## 8. Transition matrix

`✓` means the command may proceed if all payload and common guards pass. `—` means a typed
`illegal_transition` with no writes. `guarded` means the command is exceptional and must satisfy
its dedicated guards.

| Current state | Record contact attempt | Scheduled / confirm booking handoff | Close: not actionable | Close: will not schedule | Reopen | Undo latest | Classify legacy closure |
|---|---|---|---|---|---|---|---|
| `NEW` | ✓ → `CONTACTED` | ✓ → `BOOKED` | ✓ → `CLOSED` | — | — | guarded | — |
| `CONTACTED` | ✓ → `CONTACTED` | ✓ → `BOOKED` | ✓ → `CLOSED` | ✓ → `CLOSED` | — | guarded | — |
| `BOOKED` | — | — | — | — | ✓ → `CONTACTED` | guarded | — |
| `CLOSED` | — | — | — | — | ✓ → `CONTACTED` | guarded | — |
| `CLOSED` + legacy review | — | — | — | — | — | — | guarded → `BOOKED` or normal `CLOSED` |

The initial creation edge is `∅ → NEW`. Deletion is a data-lifecycle operation, not a request
state. Legal hold does not add a state or alter this matrix.

## 9. Transactional effects and temporal ordering

### 9.1 Functional core / imperative shell

The domain core is deterministic and side-effect free:

```text
transition(current request, command, actor capabilities, explicit time)
  → accepted(next request, facts)
  | rejected(domain error)
```

It does not query Supabase, read an implicit clock, send email, mutate global state, or call an
external provider. The imperative shell authenticates, loads state, supplies time and actor
context, persists an accepted decision, and returns the durable result.

### 9.2 Command transaction

For an existing request, the shell performs one short transaction:

1. Resolve an already-accepted idempotency key before treating a retry as stale.
2. Read the request and verify the expected version.
3. Run the pure transition and reject an undefined or invalid command.
4. Conditionally update current state where request ID and version both match.
5. Append command-specific evidence and the request-transition envelope.
6. Append the metadata-only technical audit entry.
7. Insert any PHI-free outbox work caused by the accepted command.
8. Record the idempotent result.
9. Commit once.

External network calls never occur while the transaction or a request-row lock is open. Any
write count other than one on the conditional current-state update becomes `stale_version` and
rolls back all sibling effects.

### 9.3 Intake transaction

Intake must move from the current split writes to one atomic persistence boundary:

```text
validate + throttle
  → insert NEW request
  → append creation evidence
  → snapshot required PHI-free new-request-ping work into outbox
  → commit
  → render patient success
```

Notification delivery remains non-blocking for patient success: success means the request is
durable and required outbox work is durable, not that an inbox received a message.

### 9.4 Outbox processing

The notification outbox has an independent operational lifecycle such as:

```text
PENDING → PROCESSING → DELIVERED
                     └→ FAILED → RETRY_PENDING → PROCESSING
```

Workers atomically claim available rows with a short lease using non-blocking queue semantics
(`FOR UPDATE SKIP LOCKED` or an equivalent atomic claim). They commit the claim before calling
the provider, send outside a database transaction, and then record the normalized result.

Each send uses a stable provider idempotency key derived from the outbox item. If a worker dies
after provider acceptance but before recording delivery, a retry reuses that key. Retry limits,
backoff, exhausted state, and operator-facing visibility are operational policy, but no failure
may disappear or alter the already-committed request transition.

The outbox payload is PHI-free. It references a request only to say that queue work exists; it
does not copy patient fields or staff notes. Provider errors, message IDs, destinations, bearer
links, and idempotency keys remain out of application logs.

The mandatory temporal property is:

```text
request state + transition + audit + outbox commit
  happens before
notification dispatch begins
```

## 10. Concurrency and idempotency semantics

### 10.1 Optimistic versioning

The current request row carries a monotonic version. Every staff lifecycle command supplies the
version the staff member viewed. The persistence adapter accepts the mutation only if that value
still matches.

If two staff members act on version \(v\):

- one command may commit version \(v + 1\);
- the other receives `stale_version` with no partial writes; and
- the UI reloads current legal actions and asks the staff member to reconsider rather than
  silently overwriting a colleague.

Row locks may still protect the atomic implementation, but serialization without a version
conflict is insufficient; last-writer-wins behavior is forbidden.

### 10.2 Idempotency

Idempotency scope is the appointment request plus caller-supplied command key.

- First accepted use stores a canonical fingerprint and the durable command result in the same
  transaction as the mutation.
- A retry with the same key and fingerprint returns the original accepted result without
  advancing version or appending duplicate evidence.
- Reuse of the key with a different fingerprint returns `idempotency_conflict`.
- A rejected command does not create a false success receipt.
- The idempotency lookup precedes stale-version rejection so a response lost after commit can be
  recovered as success.

The database enforces uniqueness. UI pending states and disabled buttons are usability aids,
never the correctness mechanism.

### 10.3 Undo under concurrency

Undo compares both the current version and the latest transition identity. A later note may
remain independently append-only, but any later lifecycle or attention mutation makes the prior
lifecycle transition stale for Undo. Two concurrent Undo attempts cannot both succeed. The
accepted Undo receives its own new version and idempotency record.

## 11. Scoped correctness analysis

### 11.1 Reachability

- `NEW` is reachable only through successful intake or migration of current `new` rows.
- `CONTACTED` is reachable from `NEW`, from itself through another contact attempt, and from a
  terminal state through explicit reopen.
- `BOOKED` is reachable directly from `NEW`, from `CONTACTED`, through legacy review, or through
  migration of known booked records.
- `CLOSED` is reachable directly from `NEW` only for a non-contact reason, from `CONTACTED` for
  either allowed reason, through legacy review, or through migration of known unbooked records.
- Every unresolved state has a legal path to a resolution.
- Terminal states have no outgoing ordinary work command; only explicit correction/reopen paths
  leave them.

No declared state is orphaned, and there is no `SCHEDULED` state to accumulate indefinitely.

### 11.2 Safety

The implementation must make these statements invariant:

- A resolved request cannot be contacted, booked again, or closed again through an ordinary
  command.
- A `NEW` request cannot close with a reason that asserts patient contact.
- A request cannot be both booked and closed in current state.
- Only `CONTACTED` can carry a current call-again value.
- A booking command creates booking-handoff evidence exactly once and no Appointment entity.
- Unauthorized, stale, invalid, or duplicate-conflicting commands make no write.
- Every accepted lifecycle command has matching transition and audit evidence.
- Undo cannot erase evidence or overwrite a later change.
- No external notification begins before the state transaction commits.
- Notification failure cannot reverse a committed request.
- No patient-supplied value crosses the queue's privacy boundary.

### 11.3 Liveness as operational visibility

The application cannot guarantee that staff eventually resolve every request. It must make lack
of progress visible:

- unresolved `NEW` and due/silent `CONTACTED` requests remain queryable as attention work;
- no read failure may present as zero work;
- pending, failed, retrying, and exhausted outbox work is observable to authorized operators;
- a scheduled retention motor is provisioned and monitored before retention is described as
  operational; and
- legacy-review rows remain visible and excluded from automatic deletion until classified.

These are operational liveness obligations, not automatic state transitions or invented SLAs.

### 11.4 Temporal ordering

For every command that creates an external effect:

1. authorize and validate;
2. decide the transition;
3. persist current state and all durable evidence;
4. commit;
5. dispatch from the outbox; and
6. record delivery outcome.

The inverse order—notify before commit—is forbidden.

## 12. Architecture baseline

The build uses complementary, deliberately conservative patterns:

| Concern | Required baseline |
|---|---|
| Domain behavior | Explicit finite state machine |
| Domain implementation | Functional core |
| Application orchestration | Imperative shell |
| Boundaries | Lightweight hexagonal ports and adapters |
| Current reads | Ordinary relational queries |
| Persistence | Postgres current-state request row |
| History | Append-only request-transition log plus existing typed evidence |
| Concurrency | Optimistic versioning, backed by atomic database writes |
| Atomicity | Short Postgres transaction / atomic RPC |
| Retries | Durable per-request command idempotency |
| External effects | Transactional outbox |
| Authorization | Server application policy plus closed database privileges and constraints |

### 12.1 Ports and adapters

Inbound adapters include staff server actions/routes, approved administrative repair commands,
intake, background lifecycle work, and tests. Every adapter that mutates request lifecycle calls
the same domain authority; repair scripts do not receive an escape hatch around it.

Outbound ports are limited to the responsibilities the core needs: request repository,
transition/evidence writer, transaction boundary, audit writer, clock, actor/authorization
context, idempotency receipt store, and notification outbox. Supabase/Postgres and the email
provider remain adapters.

### 12.2 Logical storage responsibilities

The physical migration may evolve existing relations, but the resulting schema must represent:

- **current request:** state, monotonic version, attention data, terminal resolution data,
  legacy-review marker, retention/legal-hold fields, and existing patient fields;
- **append-only transition:** from/to state, command, authenticated actor ID, resulting version,
  idempotency/command ID, time, and non-PHI domain codes;
- **idempotency receipt:** request/key uniqueness, command fingerprint, and durable result needed
  to answer a retry; any fingerprint covering an optional note is a private, domain-separated
  keyed HMAC rather than stored note text or a reversible digest;
- **outbox item:** PHI-free notification intent, stable delivery identity, lease/retry state, and
  normalized outcome; and
- **typed request evidence:** contact attempts, notes, receipts, and staff-visible delivery
  history without collapsing them into the transition relation.

Database constraints enforce vocabulary and coherent row shapes. Foreign keys used by worker
and history queries receive supporting indexes. Relations in exposed schemas keep RLS enabled
and closed client privileges. Outbox claim and request command transactions stay short; no HTTP
call occurs while a database lock is held.

## 13. Build-era implementation rules

1. **No generic status mutation.** Remove `portal_update_request_status` and every equivalent
   direct setter after migration compatibility no longer requires it. Public interfaces expose
   semantic commands, never `{ status: ... }`.
2. **One domain authority.** Staff UI, server actions, APIs, background work, repair tools, tests,
   and migration follow-ups share the transition policy. Service-role custody is not permission
   to bypass it.
3. **Invariants live at the correct layers.** Domain policy decides behavior; Postgres protects
   durable shape, uniqueness, and atomicity; server authorization protects actor capability;
   the outbox protects temporal ordering.
4. **The UI derives legal actions.** Controls come from current state plus actor capability. A
   hidden button is not authorization, and a free-form status dropdown is forbidden.
5. **Keep the staff/domain label split.** The control that confirms booking is **Scheduled**;
   the command is `ConfirmBookingHandoff`; the durable state is `BOOKED`, rendered to staff as
   **Booked**.
6. **Keep Request history.** Staff-visible history stays named for the request and preserves
   notes, contact attempts, transitions, relevant delivery outcomes, and Undo evidence without
   merging their storage boundaries.
7. **Exhaust the small state space in tests.** Every state × command pair has an explicit success
   or typed rejection assertion.
8. **Treat migration and deployment as separate axes.** Development verification precedes any
   Production migration decision. Merging application code does not authorize a hosted schema
   change.

## 14. Migration plan

Migration is forward-only, staged for old/new application overlap, and independently reversible
through the repository's required rollback sibling. It never guesses patient or appointment
facts.

### 14.1 State mapping

| Existing row | To-be row | Migration treatment |
|---|---|---|
| `new` | `NEW` | Preserve request and creation time; clear impossible terminal/attention combinations under reviewed repair rules. |
| `contacted` | `CONTACTED` | Preserve valid current call-again data and append-only historic outcomes. |
| `scheduled` | `BOOKED` | Treat existing status as known booking resolution. Do not invent a visit date/time or historical booking-handoff timestamp. Append booking-handoff evidence marked as migration provenance at migration time; that evidence satisfies the BOOKED shape invariant while making no claim about when the historic booking occurred. Start the conservative retention clock no earlier than migration. |
| `closed` + converted | `BOOKED` | Preserve known record-handoff evidence as booking-handoff/retention evidence; preserve historic closure facts as migration provenance, not current closure state. |
| `closed` + unconverted | `CLOSED` | Preserve closure time and typed unbooked evidence. |
| `closed` + no classification | `CLOSED` + legacy review | Preserve the row, add an explicit review warning/flag, and exclude it from automatic deletion until `ClassifyLegacyClosure` succeeds. |

All non-`CONTACTED` rows finish migration without live call-again data. Existing request notes,
contact outcomes, receipts, notification evidence, legal holds, and technical audits remain
preserved under their current retention rules.

### 14.2 Delivery sequence

1. **Inventory and rehearsal:** run aggregate, PHI-free preflight counts for every mapping and
   invalid combination; rehearse against disposable seeded and synthetic legacy fixtures.
2. **Expand schema:** add versioning, transition/idempotency/outbox responsibilities, new-state
   support, constraints that are safe during overlap, and rollback support without yet deleting
   old interfaces.
3. **Deploy compatible authority:** release code that understands legacy and to-be values but
   sends every new lifecycle mutation through semantic, versioned, idempotent commands.
4. **Backfill atomically in bounded batches:** map rows, mark provenance, clear impossible
   call-again data, seed versions, and create only the migration evidence the specification
   requires. Never synthesize appointments, visit dates, patient contact, or historical times.
5. **Verify before contract:** compare exact aggregate counts, validate every state shape and
   legal hold, exercise command concurrency/idempotency, and prove legacy-review rows remain
   visible and retention-ineligible.
6. **Contract old paths:** remove `SCHEDULED` acceptance, generic status RPCs, caller-attested
   actor inputs, and obsolete converted/unconverted write paths only after no overlapping app can
   call them.
7. **Activate motors deliberately:** provision and observe outbox processing and, under its
   separate approval gates, scheduled data lifecycle. A deployed function without a scheduler
   and alerting is not operational.
8. **Promote separately:** Development migration and application acceptance do not authorize
   Production. Record the exact approved migration, rollback, application SHA, and post-deploy
   verification when that later decision occurs.

### 14.3 Rollback posture

Before Production promotion, the build-era migration must define:

- the forward-only rollback sibling required by repository policy;
- how old and new application versions behave during rollback;
- how already-appended transition/idempotency/outbox evidence is preserved;
- how `BOOKED` maps without reintroducing ambiguous appointment claims; and
- how workers are paused before any outbox schema rollback.

Rollback never deletes audit or transition evidence to recreate a pre-migration appearance.

## 15. Repair list: as-is → to-be

| As-is defect | Required repair |
|---|---|
| Transition policy exists only in the client composer | Put the partial transition function in one server-invoked domain core and cover every matrix cell. |
| All outcome × origin combinations are accepted by the RPC | Reject illegal origin/command pairs before persistence and back them with coherent database shapes. |
| `CONTACTED → CONTACTED` is hidden in the UI | Make repeated contact attempts a first-class legal command with append-only evidence. |
| `SCHEDULED` claims a request state but no Appointment exists | Map it to `BOOKED`; keep Scheduled only as the staff action label; create no portal Appointment. |
| `scheduled_transferred` closes a request despite proving a booking | Retire the outcome as a closure path; compile both current booking outcomes into `ConfirmBookingHandoff → BOOKED` while preserving historic evidence. |
| Generic status RPC can create unclassified closures | Retire it; expose only semantic commands and a dedicated legacy review path. |
| Terminal rows may retain call-again data | Enforce the CONTACTED-only invariant in domain policy and database constraints; clear it during migration. |
| Concurrent saves are last-writer-wins | Require expected version and fail the stale command without partial effects. |
| Repeated commands duplicate events | Store durable idempotent command results under a database uniqueness constraint. |
| RPC actor is caller-attested email | Bind actor ID from authenticated server context at the sole mutation boundary. |
| Undo is session-local and temporally unbounded | Make latest-transition eligibility durable and enforce the decided Undo bound; append compensation rather than rewriting history. |
| Intake notifications have a crash window | Insert PHI-free outbox intent in the same transaction as request creation and send only after commit. |
| Delivery evidence can disappear after provider acceptance | Use stable provider idempotency and a durable outbox result/retry lifecycle. |
| Legacy unclassified closures never age and lack a safe resolution | Migrate as visible review-required CLOSED rows; classify through one versioned, idempotent command. |
| Retention RPC has no motor | Provision, authorize, monitor, and verify scheduled execution before calling retention operational. |
| Direct service-role writes bypass history | Restrict ordinary tools to semantic interfaces; reserve tightly reviewed migration/repair paths that append provenance. |

## 16. Verification contract for the build era

Because the state space is small, correctness is demonstrated exhaustively rather than by a few
happy-path examples.

### 16.1 Domain tests

- Every row in §8 succeeds or rejects with the named typed error.
- Every valid transition preserves every invariant in §7.
- `CONTACTED → CONTACTED` appends another attempt and replaces current attention without erasing
  history.
- `NEW → CLOSED` accepts only the non-contact reason.
- terminal ordinary commands reject.
- reopen clears current terminal data but preserves history.
- Undo restores the exact saved prior snapshot, advances version, and appends compensation.
- Undo is accepted at the 15-minute boundary, rejected after it, and an already-committed Undo
  retry still returns its idempotent result after expiry.
- the Scheduled label maps to `ConfirmBookingHandoff → BOOKED` and never emits `SCHEDULED`.

### 16.2 Persistence and concurrency tests

- Two commands with one expected version yield exactly one commit and one `stale_version`.
- Same idempotency key + same fingerprint returns one durable result and one transition.
- Same idempotency key + different fingerprint rejects without writes.
- Lost-response retry returns the accepted result before stale-version evaluation.
- Forced transition, audit, idempotency, or outbox insertion failure rolls back current state and
  every sibling effect.
- Constraints reject every incoherent state/attention/terminal shape.
- ordinary roles cannot select or mutate protected relations directly; privileged interfaces are
  narrowly granted.
- actor attribution comes from the authenticated session and cannot be replaced by payload data.

### 16.3 Outbox tests

- no worker can observe an outbox item from an uncommitted/rolled-back request transaction;
- a committed intake remains successful when delivery later fails;
- multiple workers claim different available rows without double processing;
- lease expiry recovers abandoned work;
- retry after provider acceptance reuses the stable provider idempotency key;
- exhausted delivery remains visible for intervention; and
- payloads, logs, audit details, and provider diagnostics contain no patient fields.

### 16.4 Migration tests

- Synthetic fixtures cover every row in §14.1 plus illegal cross-field combinations.
- Mapping counts are exact before and after; no request disappears.
- Scheduled fixtures become `BOOKED` without invented visit or historic handoff times.
- Converted closures become `BOOKED`; unconverted closures become `CLOSED`.
- Unclassified closures remain visible, review-required, and retention-ineligible.
- Legacy classification is versioned, idempotent, audited, and cannot delete early.
- legal holds survive every mapping and continue to block deletion.
- non-CONTACTED call-again values are cleared with migration provenance.
- rollback rehearsal preserves transition, audit, and outbox evidence.

### 16.5 Application and operational tests

- UI actions derive from the same legal-action policy as the backend.
- stale state reloads current truth and never reports false success.
- Request history stays distinct from notes and technical audit.
- failed reads never render as an empty/caught-up queue.
- staff controls preserve the Scheduled action / BOOKED state split.
- Development/disposable Supabase verification, full credentialed portal E2E, migration rollback,
  outbox worker operation, and scheduled-motor observation follow `CONTRIBUTING.md` before any
  Production decision.

## 17. Exit criteria

The workflow is ready to enter implementation planning when build tickets can trace every change
to this document without inventing another state, transition, entity, or mutation path. The
implementation is not complete until:

- the to-be matrix is the sole lifecycle authority;
- current state, immutable transition evidence, audit, idempotency, and outbox effects agree
  transactionally;
- stale and duplicate commands are safe;
- notification dispatch is post-commit and operationally visible;
- all existing rows have a verified mapping or an explicit legacy review path;
- the generic setter and caller-attested actor path are gone;
- migration and rollback have passed Development/disposable verification; and
- Production promotion and scheduler activation receive their own explicit authorization.
