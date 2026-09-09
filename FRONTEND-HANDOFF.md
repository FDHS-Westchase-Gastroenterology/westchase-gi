# Staff portal frontend handoff

The backend supports patient registration, appointment scheduling, contact completion, complete
worklists, optional billing, and optional clinical records. Claude Code connects these capabilities
to staff controls and verifies the complete screen interactions. Codex owns changes to the server
contracts and enforcement. Follow [AGENTS.md](AGENTS.md#agent-responsibilities) and the
[component adoption workflow](DESIGN.md#adoption) when implementing the frontend.

This is the shared integration checklist. Keep it current when a frontend path is connected and
verified. The linked source files define exact fields and results; [ARCHITECTURE.md](ARCHITECTURE.md)
explains the domain rules. Report a disagreement between them so the implementation and documentation
can be corrected together. Local audit folders are not required to use this handoff.

Integrate the current PR #224 backend commits into the frontend checkout before testing these
actions. Preserve any unpushed frontend commits when reconciling the branches; the latest backend
contracts are not yet on `main`.

## Integration map

| Staff work | Backend available | Frontend work to complete | Contract |
| --- | --- | --- | --- |
| Finish a contact without another call | One contact-and-close save, combined history, and Undo | Connected: both Home No call choices use completion; regression coverage includes history, replay, stale input, reload, and Undo | [Contact completion](#contact-completion) |
| Manage patients | Registration, search, demographics, reviewed request links, archive/restore, and history | Patient search, registration, detail, identity review, and administrator controls | [Patients](#patients) |
| Set up scheduling | Providers, locations, appointment types, hours, exceptions, and preparation buffers | Administrator configuration screens with complete reads and validation | [Scheduling](#scheduling) |
| Book and manage appointments | Availability, conflict checks, booking, rescheduling, cancellation, arrival/outcomes, and Undo | Staff scheduling controls and appointment detail/history | [Scheduling](#scheduling) |
| Schedule from an intake request | One operation updates both the reservation and its reviewed request | Patient selection/linking, a single booking save, paired rescheduling/cancellation/Undo | [Requests and appointments](#requests-and-appointments) |
| Read the request queue | Complete filtered results, counts, attention order, and Previous/Next | Existing screens already use the complete reads; preserve them when changing filters or paging | [Worklists](#worklists) |
| Record billing, when used | Patient-owned charges, payments recorded elsewhere, refunds, adjustments, and corrections | Optional ledger screens, role-aware actions, and reconciliation | [Billing](#billing) |
| Keep clinical records, when used | Notes, external document references, drafts, signing, amendments, and corrections | Optional clinical screens, signer administration, and protected record history | [Clinical records](#clinical-records) |

Continue with patient selection/registration, scheduling configuration, and the
request-to-appointment path. Billing and clinical records remain optional: intake, patient
registration, and booking must work when neither module contains records. An intake request can
exist without a registered patient. A new appointment requires an explicitly selected patient.

## Shared integration rules

Call the application endpoints with the current staff session. JSON POSTs must be same-origin and
use `Content-Type: application/json`. These APIs return private, uncached responses and recheck active,
onboarded staff authority on every call, including retries. The browser never receives service
credentials or calls the protected database tables/functions directly. Import public contracts;
keep `service.ts`, `rows.ts`, database adapters, and raw database snapshots on the server.

Each deliberate write gets one UUID `idempotencyKey`. Keep the same submitted body and key while
its result is uncertain; a timeout does not prove that the save failed. A different decision gets
a new key. Refresh affected records and lists after success. Keep unsaved form input on recoverable
failures. Do not automatically resubmit changed intent after refreshing a stale record.

Use each record's version from its latest read. Patient, appointment, request, billing account,
clinical record, and signer-permission versions are separate. A billing account or signer permission
can start at version zero; existing patient, appointment, request, and clinical records use positive
versions. A hidden or disabled button is a presentation choice; the server still checks permission.

| Result | Frontend handling |
| --- | --- |
| `ok: true` | Apply the returned identifiers/versions, then refresh the relevant detail, list, and history. |
| `invalid_command`, `invalid_query`, `invalid_local_time` | Preserve the draft and identify the invalid choice. Do not show success. |
| `unauthorized`, `forbidden` | Use the existing session/permission handling. Do not retry with another actor or role. |
| `stale_version`, `request_stale_version`, `type_changed` | Fetch current records, retain the draft, and let staff review before another deliberate save. |
| `idempotency_conflict` | The key belongs to different input. Check the original result and refresh before offering a new decision. |
| A missing record, ownership conflict, or domain restriction | Explain the specific code and refresh the selected record; do not silently select another patient or slot. |
| `unavailable` or a network interruption | Treat a write outcome as uncertain. Retry the identical body/key and refresh history. A failed read is an error, not an empty successful list. |

The error unions linked below are exhaustive for their modules. HTTP status alone is insufficient
to distinguish a booking conflict, changed record, or invalid relationship. Keep names, contact
searches, notes, clinical content, and billing descriptions out of API URLs, telemetry, and persistent
browser storage. Use the defined opaque ID/cursor parameters for detail reads.

## Contact completion

Entry point: [workflow-actions.ts](src/app/admin/(portal)/requests/workflow-actions.ts).
Read [workflow contracts](src/lib/portal/workflow/contracts.ts) and the
[completion input schema](src/lib/portal/workflow/contact-completion.ts).

The Home card uses this mapping from both New and Contacted requests:

| Card choice | Action |
| --- | --- |
| No answer + No call | `recordContactAndClose({ requestId, expectedVersion, idempotencyKey, outcome: "no_answer" })` |
| Contacted + No call | `recordContactAndClose({ requestId, expectedVersion, idempotencyKey, outcome: "reached" })` |
| A contact result + Call again | Keep `recordContactAttempt` with an explicit callback choice. |

Completion also accepts an optional trimmed note of at most 2,000 characters. `voicemail` is a
supported completion outcome if an approved UI exposes it. The action is unavailable from Scheduled
or Closed. A null callback on the older contact-attempt action is invalid and does not express
completion. Do not substitute a separate `closeRequest` call.

Success uses the existing `CommandOutcome`: state `closed`, a new version, null callback and
appointment times, and an Undo descriptor. The closure reason is `no_further_contact`. History
contains one `contact_completed` decision with the contact result and finished state. Its original
evidence remains after Undo, which restores the prior state and callback within 15 minutes.
This operation does not create, cancel, or change an appointment.

The [Home completion browser regression](e2e/portal/home-contact-completion.spec.ts) exercises
both contact outcomes from New and Contacted, including the disabled calendar, persisted closure
and callback, one completion history decision, identical replay, stale input, reload, and Undo.
[Card save tests](src/app/admin/(portal)/(home)/record-card-save.test.mjs) also retain both explicit
callback mappings and the separate ordinary Close request action. Undo remains available from the
full request record after the Home card closes.

## Patients

Use [patients/contracts.ts](src/lib/portal/patients/contracts.ts) for `PatientCommandInput`,
`PatientSearchInput`, and the command/search/detail results.

| Endpoint | Input and result |
| --- | --- |
| `POST /api/admin/patients` | `{ idempotencyKey, command }`; success returns `{ ok: true, patientId, version }`. |
| `POST /api/admin/patients/search` | `query`, `archived`, `limit`, and `after`; returns `patients`, exact `total`, and `next`. |
| `GET /api/admin/patients/:id` | Optional `historyBefore` and `linksAfter`; returns `patient`, `history`, and `requests` with independent totals/cursors. |

Commands are `create`, `update`, `link_request`, `unlink_request`, and `set_archived`. Registration
requires a name. Birth date, phone, and email are optional; use the shared field limits and real
calendar-date validation. `create` can include a reviewed `requestId` to register and link together.
Staff must choose the demographics; no name, phone, or email match silently creates a link or merge.

`update` supplies `patientId`, `expectedVersion`, and the complete demographic object. Omitted
optional fields become null, so submit the whole reviewed form. Link/unlink commands supply the
patient ID/version and request ID. A request has at most one patient; an existing link must be
explicitly removed before linking another. Only administrators can archive/restore. Archive retains
history and blocks demographic edits and new links until restored.

Search defaults to 50 rows, allows 100, and uses the returned name/ID cursor. Detail history and
linked-request lists each page in groups of 50. Continue each cursor independently and preserve
the same filters. Patient identity and history survive intake cleanup. Request state `booked` is
rendered as Scheduled; it is distinct from the appointment status vocabulary.

Acceptance: register with only a name, edit without clearing untouched fields, inspect multiple
search/history pages, review a link, reject a conflicting link, handle stale edits, and verify
administrator archive/restore. Scheduling must remain available without clinical or billing records.

## Scheduling

Use `POST /api/admin/scheduling` with
[scheduling/contracts.ts](src/lib/portal/scheduling/contracts.ts) for `SchedulingInput` and command
results. Public calendar/detail/availability shapes are in
[scheduling/read-contracts.ts](src/lib/portal/scheduling/read-contracts.ts). Practice date/time rules
are in [scheduling/time.ts](src/lib/portal/scheduling/time.ts).

| Action | Purpose |
| --- | --- |
| `configure` | Administrator save with `idempotencyKey` and `save_location`, `save_provider`, or `save_appointment_type`. |
| `catalog` | Search/page providers, locations, or appointment types with exact totals and name/ID cursors. |
| `read_config` | Read one configuration record and its paged change history. |
| `availability` | Read one day's available starts for a provider, location, type or existing appointment, and optional patient. |
| `appointments` | Read a calendar range or a patient's appointments, with filters, totals, and start/ID cursors. |
| `read_appointment` | Read one appointment, current linked-request summary, history, and current Undo expiry. |
| `command` | Write with `idempotencyKey` and `book`, `reschedule`, `cancel`, `check_in`, `complete`, `no_show`, or `undo`. |

Configuration creates omit both `id` and `expectedVersion`; updates send both. Provider saves
replace the full `hours` and `exceptions` arrays, so load all current values before editing.
Hours use weekday 0–6, minute offsets, location, and validity dates. Unavailable exceptions take
precedence over availability. A null-location unavailable exception blocks that provider across
locations. Provider edits cannot invalidate future scheduled or checked-in appointments.

Appointment types hold duration and before/after preparation buffers. A booking saves those values;
later type edits do not rewrite existing reservations. Scheduling providers and locations are
separate from the public website's biographies and content. Administrators supply actual practice
configuration; do not infer working hours from website copy.

`book` needs `patientId`, `providerId`, `locationId`, `appointmentTypeId`, `expectedTypeVersion`,
and `start: { date: "YYYY-MM-DD", time: "HH:mm" }`. The start is an absolute local choice in
America/New_York. The server rejects missing or repeated daylight-saving times; do not guess an
offset from the browser's timezone. New bookings and reschedules must start in the future.

Include the selected `patientId` in availability reads so patient conflicts are checked. For a
move, supply `appointmentId` and omit the type to preserve its booked duration. Display intervals
of 5, 10, 15, 30, or 60 minutes change the displayed choices, not the booking rules. Read
`patientChecked`, `preservesBookedDuration`, and `observedAt`; an available start is not a reservation.
Saving checks provider and patient conflicts again.

Provider conflicts apply across locations and include preparation buffers. Patient conflicts apply
across providers to the actual visit interval. Exact end/start boundaries can be back-to-back.
Cancelled appointments release capacity; completed and no-show records retain their historical slots.

| Command after booking | Additional rules |
| --- | --- |
| `reschedule` | Send appointment `id`/`expectedVersion`, provider, location, and start. Scheduled only. Omit type ID/version to retain duration/buffers; send both to choose a current type. Patient ownership cannot change. |
| `cancel` | Scheduled or checked-in; requires a reason. Coordinated requests also need the fields in the next section. |
| `check_in` | Scheduled only, on the appointment's practice date. |
| `complete` | Requires checked-in status. |
| `no_show` | Scheduled only, after the start time. |
| `undo` | Send appointment ID/version. Only the latest eligible change within 15 minutes; restoring a slot checks conflicts again. Undo of initial booking cancels it. A compensation cannot itself be undone. |

Command success returns `entity`, `id`, and `version`, with a request summary when applicable.
Refresh appointment detail and the calendar. Appointment statuses are `scheduled`, `checked_in`,
`completed`, `no_show`, and `cancelled`. Calendar ranges are limited to 93 days and use interval
overlap; a patient history can omit the range. Catalogs and appointment lists allow 100 rows per
page; history reads return 50. Follow cursors instead of treating the first page as complete.

Handle `provider_conflict`, `patient_conflict`, `time_unavailable`, `schedule_in_use`, resource
unavailability, and `type_changed` distinctly. Preserve the chosen values and refresh the relevant
availability or configuration. A failed read must not display an apparently empty calendar.

## Requests and appointments

The scheduling endpoint coordinates a reservation and its intake request in one save. First
review/select or register the patient and explicitly link the request through the patient API.
The older request-only Scheduled action does not reserve provider capacity.

| Staff action | Coordinated input and result |
| --- | --- |
| Book a linked request | Add `sourceRequestId` and the current `requestVersion` to `book`. Both must be present together. New/Contacted becomes Booked as the appointment is reserved. |
| Reschedule | Send appointment `expectedVersion` and current `requestVersion`. Both appointment times and both versions change together. |
| Cancel | Send appointment `expectedVersion`, `requestVersion`, a reason, and absolute `callAgainOn`. Capacity is released and the request returns to Contacted at 8 a.m. practice time on the chosen day. That callback time must still be in the future. |
| Undo a paired change | Send appointment `expectedVersion` and current `requestVersion`. The latest eligible change restores both; a later request version blocks that Undo. |
| Check in, complete, or no-show | Use the appointment command. These outcomes preserve the completed intake handoff; their Undo also leaves it intact. |
| Book without a request | Omit both source fields. No intake request is created. Ordinary cancellation needs a reason but no intake callback. |

Do not issue a separate request booking, reopening, or request Undo to reproduce these changes.
Use the one scheduling command, then refresh the appointment and request views. Active paired
handoffs reject separate request commands that would leave inconsistent states or times.

The command's optional `request` result and detail read's nullable request summary contain `id`,
`state`, `version`, `callAgainAt`, and `appointmentAt`. `appointment.requestWorkflowManaged` identifies
this coordination. History includes `requestChange` with the prior request state/times, resulting
request version, and transition ID. These public summaries exclude patient contact details and notes.

Cancellation must display the chosen Call again day before saving. Missing request version or
follow-up produces `request_version_required` or `request_follow_up_required`. Handle
`request_stale_version`, `request_not_actionable`, `request_already_booked`, `request_link_conflict`,
`request_undo_unavailable`, and `request_transition_rejected` by explaining the conflict and fetching
current data. Preserve the same body/key for an uncertain retry, including after midnight.

Historical request-only bookings remain historical; do not infer a provider, patient match, or
reservation from them. Older source associations can be unmanaged. Use current read metadata to
choose the applicable contract. Intake cleanup removes source references while retaining the
patient and appointment. Undo cannot recreate a deleted request.

Acceptance: reviewed patient link → availability → one booking save → refresh both views →
reschedule → cancel with a Call again day → eligible Undo → reload. Also test a competing booking,
stale request, stale appointment, repeated save, expired/conflicting Undo, and an unlinked booking.
An appointment that exists only in eCW is outside this application's conflict checks.

## Worklists

Use `POST /api/admin/request-worklist` and
[request-worklist/contracts.ts](src/lib/portal/request-worklist/contracts.ts). The `page` action
accepts search, statuses, attention buckets, location, received dates, offset, and limit. `neighbors`
uses the same filters plus `requestId`. The server supplies one clock for attention ordering.

Search is a literal case-insensitive name/phone/email substring of up to 100 characters. Dates use
inclusive `receivedFrom` and exclusive `receivedTo`. `location: "any"` means an Any location
preference; null means all locations. Empty status/bucket arrays are invalid. Keep API search
terms in the JSON body.

Results contain `items`, full `total`, status `counts`, `nextOffset`, and `neighbors`. Status counts
share search/location/date filters but precede status/bucket selection so they can populate chips.
Pages default to 50 and allow 200. There is no 500-row candidate cutoff. Neighbors use the same
ordered scope and return `prevId`, `nextId`, and a one-based position, or nulls outside that scope.

Preserve the established attention order and latest-activity fields. Home reads the complete open
set in bounded pages for its existing local filters; its 60-row closed tail is intentional. The
Requests page already uses complete page/count reads, and detail uses complete neighbors. If Home
becomes server-paged, use this contract. Offset pages reflect current data; refresh the visible
slice after actions change ordering. A service failure is not an empty result.

Acceptance when these controls change: filter counts, empty and deep pages, Previous/Next under
the same filters, changed ordering after saves, and a read failure. Existing
[worklist evidence](https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/pull/224#issuecomment-5563545212)
covers the complete-read integration in the current screens.

## Billing

Use `POST /api/admin/billing` and [billing/contracts.ts](src/lib/portal/billing/contracts.ts).
Reads use `{ action: "read", patientId, beforeVersion }`. Writes use
`{ action: "command", idempotencyKey, command }` with the current **billing account** version.
Every command needs `patientId`, `expectedVersion`, and a description of 1–500 characters.

| Kind | Fields beyond the shared command fields | Authority |
| --- | --- | --- |
| `charge` | Positive integer `amountCents`, `serviceDate`; optional appointment/reference | Staff |
| `payment` | Positive integer `amountCents`, `method`; optional appointment/reference | Staff |
| `refund` | Positive integer `amountCents`, original `paymentId`; optional reference | Administrator |
| `adjustment` | Signed nonzero integer `amountCents`; optional appointment/reference | Administrator |
| `reverse` | Original `entryId`; appends the correction and retains the original | Administrator |

Use the schema's field names `appointmentId` and `externalReference` for optional associations.
Payment methods are `cash`, `check`, `card`, `transfer`, `external`, and `other`. Amounts are USD cents
within the safe integer range. Positive balance means owed; negative balance means credit. A read
with no ledger returns zero balance/version and empty history without creating an account.

Reads return `patientId`, `currency`, `balanceCents`, `version`, and `entries: { items, total,
nextVersion }`. Entries page in groups of 100, newest version first. Pass `nextVersion` as
`beforeVersion`. Write success returns `patientId`, `entryId`, and `version`; refresh the ledger.
Any appointment or source-entry association must belong to this patient. An archived patient's
balance can still be settled.

Refunds cannot exceed the original payment's remaining amount. Correct outstanding refunds before
reversing their payment. Entries remain in history; a reversal cannot be reversed. Handle
`appointment_patient_mismatch`, `entry_reversed`, `payment_has_refunds`, `refund_exceeds_payment`, and
`amount_out_of_range` explicitly. A stale balance requires a fresh read and staff review.

Label actions Record charge, Record payment, Record refund, and Correct entry. This ledger records
transactions handled elsewhere; it does not charge a card or send a refund. Never place card
credentials in descriptions. Billing stays optional; appointment cancellation and intake cleanup
retain its records.

Acceptance: empty ledger, charge/payment, allowed and rejected refunds, permanent correction
history, administrator restrictions, cross-patient rejection, stale balance, retry, and paging.

## Clinical records

Use `POST /api/admin/clinical` and [clinical/contracts.ts](src/lib/portal/clinical/contracts.ts).
Actions are `command`, `list`, `read`, and `signers`. A command supplies one `idempotencyKey` and a
`create`, `update_draft`, `sign`, `amend`, `enter_in_error`, or `set_signer` command.

`create` requires `patientId`, optional same-patient `appointmentId`, and `content`. Content has
`kind: "note"` or `"document_reference"`, a title up to 120 characters, and optional service date.
Notes allow 20,000 characters; an empty draft is valid but cannot be signed. Document references
name their source and identifier, with an optional supplied SHA-256. A reference or hash does not
prove the document was copied, fetched, verified, or backed up here.

Existing-record commands use `recordId`/`expectedVersion`; draft updates and amendments supply the
complete content object. Entered-in-error requires an explicit reason. Drafts can be edited by
their author. Signing requires the author and explicitly enabled signing permission; administrator
status alone does not grant it. `set_signer` is an administrator action using `userId`, the current
permission version (initially zero), and `enabled`.

Signing retains the content, author, and signature. Amendments create a new draft linked to the
signed source and visibly identify it. Entered-in-error retains the record and history. There is
no delete or clinical Undo action. Surface `signing_not_enabled`, `not_record_author`,
`record_not_draft`, `record_not_signed`, `amendment_exists`, `amendment_source_changed`, and
`already_entered_in_error` as specific restrictions. Preserve draft text on failure.

Lists return summaries, `canSign`, exact `total`, and `next`, up to 100 per page. Detail returns
`record`, `canSign`, and `history` with up to 20 revisions and `nextVersion`. Signer administration
pages through `nextUserId`. `canSign` describes permission; the author/state rules still apply.
Reload after stale versions or permission changes. Revoked permission may reject a replay, so read
the current record before describing what was saved.

Acceptance: optional empty records, author-controlled draft/edit, explicit signer assignment,
signing, immutable signed content, amendment, entered-in-error history, revoked permission,
cross-patient rejection, stale input, retry, and complete paging. External document access remains
a separate integration.

## Verification and delivery

The automated examples live in [e2e/portal](e2e/portal) and [e2e/boundaries](e2e/boundaries):
`patients.spec.ts`, `scheduling.spec.ts`, `appointment-handoff.spec.ts`, `billing.spec.ts`,
`clinical.spec.ts`, and `worklists.spec.ts`. Read them with the matching contracts. A real
staff-session API test establishes server behavior; a completed frontend still needs its authored
screen path tested. Do not treat opening a dialog or receiving an API success as full UI acceptance.

For each completed frontend path:

1. Apply the approved design and [visual baseline](ui-reference/README.md), including desktop and
   mobile where authored. Use the browser workflow assigned to the implementing agent.
2. Exercise the staff action, success, relevant failures, history/Undo when provided, and a fresh
   reload with fictional Preview data. Verify the patient and request/appointment relationships.
3. Test uncertain retries and concurrent/stale edits without losing the form or duplicating work.
4. Run the [standing and change-specific checks](CONTRIBUTING.md#verification): repository-wide
   oxlint, oxfmt, React Doctor 100, production build, and appropriate unit/browser tests. Do not run
   another database-backed browser suite while CI is using the same Preview Branch.
5. Post before/after images for still changes and a video for an authored multi-step workflow in
   the PR conversation. Use fictional identity, redact account labels, and start videos after
   sign-in. Request-detail evidence stays outside the atlas. Name the source commits and verify
   the posted media renders, following [AGENTS.md](AGENTS.md#visual-evidence).
6. Verify quality, React Doctor, Vercel, and supabase-integration on the exact head being shared.
   Retain the branch-setup evidence and verify the selected database reference under
   [the Preview Branch workflow](CONTRIBUTING.md#how-to-contribute-with-a-supabase-preview-branch);
   branches feeding PR #224 inherit its database. Update this checklist and link the frontend
   evidence in the PR conversation.

## Practice setup and rollout work

The basic backend and a finished frontend are separate from an operational clinic cutover. Keep
these decisions explicit:

- Configure and validate actual providers, locations, appointment types, hours, exceptions, and
  signing permissions with the practice.
- Agree which system owns each provider/date during coexistence. This application cannot detect
  a conflicting appointment that exists only in eCW; avoid independently booking the same schedule
  in both systems without reconciliation.
- Review any authorized source export, patient matching, duplicate handling, imported appointments,
  balances, and document custody. An external patient-ID mapping and import API are not implemented.
  Imports need stable source IDs, reviewed matches, repeat-safe batches, rejected-row reporting,
  and count/relationship reconciliation before they can support cutover.
- Define retained patient, appointment, billing, and clinical record policies. Intake cleanup does
  not delete these records. Rehearse backup restoration and reconciliation; a guarded migration
  rollback is not a backup restore drill and refuses to discard populated domain records.
- Set clinic load/response targets, confirm actual workflow coverage during the pilot, and agree
  on the cutover owner, schedule reconciliation, and recovery procedure before switching ownership.
- Keep PR #224 open until Jason authorizes merging. Production migrations, scheduler activation,
  and clinic cutover each require separate explicit authorization. After an authorized rollout,
  verify the matching deployment, schema, staff access, and complete clinic workflows.
