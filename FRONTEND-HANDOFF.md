# Staff portal frontend handoff

The backend supports patient registration, appointment scheduling, contact completion, complete
worklists, optional billing, and optional clinical records. The agent that connects one of these
capabilities to a staff control verifies the complete screen interaction and also makes any
server contract or enforcement change the control needs ([AGENTS.md](AGENTS.md#task-ownership)).
Follow the [component adoption workflow](DESIGN.md#adoption) for the UI.

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
| Finish a contact without another call | One contact-and-close save, combined history, and a database Undo | Connected: both Home No call choices use completion; regression coverage includes history, replay, stale input, and reload. No portal surface offers request Undo | [Contact completion](#contact-completion) |
| Manage patients | Registration, search, demographics, reviewed request links, archive/restore, and history | Connected on the Schedule: one search over patients and unlinked open requests (`findSchedulePeople`), the patient's record with visits and read-only clinical lists, and registration when a request is booked. Remaining: demographic edits, identity review, and administrator archive/restore | [Patients](#patients), [Schedule search and records](#schedule-search-and-records) |
| Set up scheduling | Providers, locations, appointment types, hours, time off, closed days, and preparation buffers | Connected: the Settings window's Schedule group (`/admin/settings/providers`, `/appointment-types`, `/locations`) applies each change as it is made, warns before time off or a closed day covers bookings and lists them to rebook after, and offers Undo. Staff read every pane with no edit controls. The Day view's Hours sheet changes one day's hours, or a weekday's from that day on, and offers Undo | [Settings window](#settings-window), [Day hours](#day-hours) |
| See month availability | One summary per practice date: open count, booked share, seen visits, closed days, and per-provider openings | Connected: `/admin/schedule` month view with the day preview, the week view (`week_schedule`), and the Day view (`day_schedule`): one column per working provider, open time that books, and the no-providers empty state | [Scheduling](#scheduling) |
| Book and manage appointments | Availability, conflict checks, booking, rescheduling, cancellation, arrival/outcomes, and Undo | Connected on the week and Day views: the appointment card checks in, reschedules, cancels and marks no-show or complete, and the open-time card books a found patient. On the Day view a visit also moves by dragging it to open time (`can_place` while it is in the air, then `reschedule`). On both views every landed command, and the Day view's booking, move and Check in, offer Undo in a toast that stays 8 seconds (`undoAppointmentChange`; the server accepts an undo for 15 minutes). Remaining: appointment history | [Scheduling](#scheduling) |
| Schedule from an intake request | One operation updates both the reservation and its reviewed request | Connected: the Home record card and the Schedule's request record book from the card's month (`month_availability`, then one `book` with `sourceRequestId`). Both cards also book an unlinked requester, who is registered and linked as the booking lands. A Book the server refuses for good (the request moved on, the visit type changed, the patient is booked then) says why on the card's strip and offers Reload instead of Try again, and while the month's open times are loading or failed to load the squeeze-in row still books from the type's last read. The Day view's appointment card cancels a request's visit to Call again or Request closed and Undoes it; its drag reschedules both. Remaining: the Home card's own reschedule and cancel | [Requests and appointments](#requests-and-appointments) |
| Run the practice's accounts and alerts | Staff invites and roles, notification addresses with a test send, and website maintainers, each audited and admin-only (#355) | Connected: the Settings window's Practice and About groups (`/admin/settings/staff`, `/notifications`, `/software`). Staff read all three panes with no edit controls, and the server refuses their writes | [Settings: Practice and About](#settings-practice-and-about) |
| See what staff did | One newest-first Activity log over appointment, schedule, request, patient, sign-in and settings history, with chip, provider, date and search filters and role scoping (#357) | Connected: `/admin/audit` reads `readActivityPage` with the category and appointment chips, provider, date range and search, scrolls into the next page, phrases every row, and expands a row into its detail; front desk gets no Settings chip and no Technical record. Settings history includes tour dismissals (`staff.tour_dismiss`), and setting or recovering a password records a sign-in | [Activity log](#activity-log) |
| Learn the portal | One tour record per account and tour (`staff_tours`) written through `portal_set_staff_tour`, refused by role and audited, and a session read that names the tour to start (#358) | Connected: the first sign-in runs the role's tour (front desk from Home, an admin from Settings › Providers), Done or Skip tour is recorded, Help (`/admin/help`) restarts either tour and opens topics by address, and `ui/help-button` answers on a screen and opens its topic in Help | [Help and tours](#help-and-tours) |
| Read the request queue | Complete filtered results, counts, attention order, and Previous/Next | Home reads the complete open set; use these reads when Home adds server paging | [Worklists](#worklists) |
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
contains one `contact_completed` decision with the contact result and finished state. The database
Undo command restores the prior state and callback within 15 minutes and keeps the original
evidence; no portal surface issues it.
This operation does not create, cancel, or change an appointment.

The [Home completion browser regression](e2e/portal/home-contact-completion.spec.ts) exercises
both contact outcomes from New and Contacted, including the disabled calendar, persisted closure
and callback, one completion history decision, identical replay, stale input, and reload.
[The card save model](src/app/admin/(portal)/(home)/record-card-save.ts) keeps both explicit
callback mappings and the separate ordinary Close request action.

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
[scheduling/read-contracts.ts](src/lib/portal/scheduling/read-contracts.ts); the week and day grid
reads are in [scheduling/grid-contracts.ts](src/lib/portal/scheduling/grid-contracts.ts). Practice date/time rules
are in [scheduling/time.ts](src/lib/portal/scheduling/time.ts).

| Action | Purpose |
| --- | --- |
| `configure` | Administrator save with `idempotencyKey` and `save_location`, `save_provider`, or `save_appointment_type`. |
| `catalog` | Search/page providers, locations, or appointment types with exact totals and name/ID cursors. |
| `read_config` | Read one configuration record and its paged change history. |
| `availability` | Read one day's available starts for a provider, location, type or existing appointment, and optional patient. |
| `appointments` | Read a calendar range or a patient's appointments, with filters, totals, and start/ID cursors. |
| `read_appointment` | Read one appointment, current linked-request summary, history, and current Undo expiry. |
| `month_summary` | Read one practice month (`month: "YYYY-MM"`, optional `locationId`) as one row per date with open counts and per-provider openings. |
| `month_availability` | Read one practice month's bookable starts for one appointment type (`month`, `appointmentTypeId`, request `location`, optional `patientId`): per date and provider, every open start and, when none, the reason. |
| `command` | Write with `idempotencyKey` and `book`, `reschedule`, `cancel`, `check_in`, `complete`, `no_show`, or `undo`. |
| `can_place` | Ask whether a scheduled, future appointment (`appointmentId`) could move to `providerId`, `locationId` and `startsAt` without saving. Returns `placeable: true` with the new `startsAt`/`endsAt`, or `placeable: false` with one `refusal`: `in_past`, `closed_day`, `type_not_offered`, `outside_hours`, or `slot_booked` with the `conflictId` holding the time (buffers included). A card that cannot move answers `illegal_transition`. The drop still sends `reschedule`, which checks every rule again. |

Configuration creates omit both `id` and `expectedVersion`; updates send both. Provider saves
replace the full `hours` and `exceptions` arrays, so load all current values before editing.
Hours use weekday 0–6, minute offsets, location, and validity dates. Unavailable exceptions take
precedence over availability. A null-location unavailable exception blocks that provider across
locations. Provider edits cannot invalidate future scheduled or checked-in appointments.

`month_summary` returns `observedAt`, the practice `today`, the `referenceType` it counted, and
one row per date with `status` `open`, `full`, `past`, or `closed`. Working time is hours plus
available exceptions less unavailable exceptions; a date with none is closed. A past date carries
`seen` (checked in or completed). Today and later dates carry `open`, `booked`, `capacity`
(`booked + open`), `bookedShare` (`booked` over `booked + open`, 1 when no opening is left: the share the month cell's tint and its "N of M booked" both read), and `providers`, each with
location names, its own `open` count, and up to two `firstOpen` starts. `open` places the
shortest active appointment type under the availability rules, including buffers, on the practice
clock (Settings › Appointment types › Openings start; on the hour by default): an opening starts
only on a mark of the booking interval counted from midnight, at most one per provider per
interval, and a booked appointment holds only its own time, so a visit that runs past a mark moves
the next opening to the mark after it and booking an opening leaves the later openings in place.
The week and Day grids draw each opening from its start to the next opening, visit or end of
hours, so a free stretch reads as a run of tiles on the hour lines. The week and Day views
and `month_availability` offer the same openings. The provider counts sum to the day's count. Only starts after `observedAt` count, so today reads
`full` with zero capacity once its hours have passed. The summary is a planning signal; booking
still reads `availability`.

`month_availability` returns `observedAt`, `today`, the `month`, the `appointmentType` with the
`version` a `book` sends as `expectedTypeVersion`, the provider and location names, and one row
per date with `past`, `open`, `booked`, `capacity`, and `providers`. Each provider entry lists its
`open` starts (`startsAt`, `time`) at the request's location, or a `reason` of `booked_out`,
`no_hours`, or `time_off` when it has none. The Home record card reads it through
`readCardMonth` in `src/app/admin/(portal)/(home)/booking-actions.ts`, which also returns the
active appointment types; a failed read is offered as Try again, never drawn as an empty month.

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
| `cancel` | Scheduled or checked-in; requires a reason. Coordinated requests also need `requestVersion` and a `requestOutcome` (next section). |
| `check_in` | Scheduled only, on the appointment's practice date. |
| `complete` | Requires checked-in status. |
| `no_show` | Scheduled only, after the start time. |
| `week_schedule` | Read one practice week (`weekStart`, a Sunday; one to three `providerIds`; optional `locationId`, `appointmentTypeId`) as seven days per provider: working ranges, appointments (no cancelled), open starts from the same SQL as `month_summary`, and seen/open counts. |
| `day_schedule` | Read one practice date (`date`; optional `appointmentTypeId`) as one column per provider working it, in name order: each location window with its office name, the visits with their `version` (no cancelled), open starts from the same SQL as `month_summary`, and seen (past) or open (today and later) counts. A provider with visits but no working time still gets a column; every other active provider is listed in `off`. `activeProviderCount` of zero means no providers exist yet. Both roles read it. |
| `week_provider` | Read the staff member's remembered week provider, or none. |
| `remember_week_provider` | Remember `providerId` as the provider the week opens on. |
| `undo` | Send appointment ID/version. Only the latest eligible change within 15 minutes; restoring a slot checks conflicts again. Undo of initial booking cancels it. A compensation cannot itself be undone. |

Command success returns `entity`, `id`, and `version`, with a request summary when applicable.
Refresh appointment detail and the calendar. Appointment statuses are `scheduled`, `checked_in`,
`completed`, `no_show`, and `cancelled`. Calendar ranges are limited to 93 days and use interval
overlap; a patient history can omit the range. Catalogs and appointment lists allow 100 rows per
page; history reads return 50. Follow cursors instead of treating the first page as complete.

Handle `provider_conflict`, `patient_conflict`, `time_unavailable`, `schedule_in_use`, resource
unavailability, and `type_changed` distinctly. Preserve the chosen values and refresh the relevant
availability or configuration. A failed read must not display an apparently empty calendar.

### Schedule search and records

The Schedule's toolbar search, the record sheets it opens, and the Add request it starts live in
`src/app/admin/(portal)/schedule/` (`schedule-search.tsx`, `schedule-people.tsx`,
`patient-record-sheet.tsx`, `request-record-sheet.tsx`). Every action below requires a staff
session; the database functions refuse an anonymous caller.

| Server Function (`week-actions.ts`) | Input, result, and failures |
| --- | --- |
| `findSchedulePeople(query)` | Up to 254 characters. The field searches from two characters (`SEARCH_MIN`). Matches a prefix of any word of the name, or two or more digits of the phone in any format, across registry patients and the open requests no patient is linked to (`portal_find_people`). Returns `anyone` (false on the portal's first day), `total`, and up to 20 `people`, patients first, each with `kind`, `id`, `name`, `phone`, and `status`: today's or the next appointment, the request's state, or none with the last visit. `{ ok: false }` is a failed search: say so and keep the typed text. |
| `readSchedulePatient(patientId)` | The patient, their visits latest first without cancelled ones (`portal_read_patient`'s `appointments`), the latest linked request as Home's line, and the clinical notes and documents, read-only. `not_found` for an unknown or malformed ID; `unavailable` for a failed read, offered as Try again. A clinical list carries `forbidden` when the role cannot read it. |
| `readWeekRecordLine(requestId)` | The request as Home's line, or null when it is gone, malformed, or unreadable. A line with a `patientId` opens that patient's record instead. |

The search is a POST; the typed name or number never reaches the address, telemetry, or storage.
`/` focuses the field, the arrows move through the results, Enter opens the highlighted one, and
Escape clears the field and then leaves it. Enter waits while the rows on screen still answer an
earlier term. The open record is in the address: `?patient=<id>` for a patient and
`?request=<id>` for a person known only by a request. Opening pushes a history entry and closing
replaces it, so reload, Back, and a pasted link reopen it. An address naming a record that cannot
be read shows the toast "That record couldn't be opened." and clears the parameter. Home's
full-record sheet uses the same `?request=` parameter.

The patient record's Book another books through `bookFromCard` with the patient and no source
request; Book appointment on a request record sends the request's `sourceRequestId` and
`requestVersion`, and the server registers the requester from the request row and links them
before the `book` (`patientForRequest`). After that booking the record becomes the patient's and
the address switches to `?patient=`. A search with no match offers Add request with the typed name
or phone filled in; Add request without a prefill is unchanged.

Acceptance (`e2e/portal/schedule-people.spec.ts`, `e2e/boundaries/find-people.spec.ts`): find by
a name prefix and by a phone in several formats, ordering, each status summary, a request with no
patient, open from the keyboard, reload into the record, book a request-only person into a
patient, Book another, start a prefilled request, and a signed-out visit refused.

### Settings window

The Settings window's Schedule group does not call `POST /api/admin/scheduling`. Its server action
`applySettingsCommand` in
[settings/schedule-actions.ts](src/app/admin/(portal)/settings/schedule-actions.ts) takes one
`SchedulingSettingsCommandInput` (`idempotencyKey` plus one granular `command`) from
[scheduling/settings-contracts.ts](src/lib/portal/scheduling/settings-contracts.ts), and each pane
reads `readSchedulingSettings` on the server. The client hook `useSettingsCommand` in
[settings/use-settings-command.ts](src/app/admin/(portal)/settings/use-settings-command.ts) mints
the key, shows the result as a toast, and registers Undo by sending the inverse command.

`expectedVersion` is the version of the part a command changes: a provider's `profileVersion`,
`hoursVersion` or `typesVersion`, an office's `detailsVersion`, a type's `version`, or the
practice's. An edit to one part never makes another stale. The result's `version` is that part's
new version. Time off and closed days are rows of their own and carry no version.

| Command | Inputs beyond `id` |
| --- | --- |
| `add_provider` | `name`, `credentials`, weekly `hours`; creates without `id`. The pane starts a new provider Monday to Friday for the office's hours, and the database gives them every active type. |
| `set_provider_profile` | `expectedVersion`, `name`, `credentials`, `bookable`. |
| `retire_provider` / `restore_provider` | `expectedVersion`. Retiring refuses `schedule_in_use` with `conflicts` while anything is booked with them; hours, time off and types are kept for a restore. |
| `set_provider_weekly_hours` | `expectedVersion`, `startsOn`, the full weekly `hours`, `keepBooked`, `dryRun`. The week applies from `startsOn` (today to a year out); earlier rows end the day before, and a week matching the one ending then joins it. |
| `add_time_off` / `remove_time_off` | `startsOn`, `endsOn`, `allDay` (or one day's `startMinute`/`endMinute`), `reason`, `dryRun`; removal takes `timeOffId`. |
| `set_provider_types` | `expectedVersion`, the full `typeIds` the provider sees. |
| `save_appointment_type` | `expectedVersion`, `name`, `durationMinutes`, `bufferBeforeMinutes`, `bufferAfterMinutes`, `icon`, `description`, `providerIds`; a new type sends null `id` and `expectedVersion` and joins the end of the booking order. |
| `reorder_appointment_types` | `expectedVersion`, the 1-based `position` in the booking order. |
| `set_appointment_type_active` / `delete_appointment_type` | `expectedVersion`, `active`; deletion takes no more. |
| `save_location_details` | `expectedVersion`, `name`, address, `mapsQuery`, the office's open `hours`, `keepBooked`, `dryRun`. Providers' hours there follow from today and the answer names them in `adjusted`. |
| `retire_location` / `restore_location` | `expectedVersion`. Retiring refuses `last_location` for the only open office and `schedule_in_use` with `conflicts` while anything is booked there; it ends every provider's hours there and names them in `adjusted`. |
| `add_location_closure` / `remove_location_closure` | `closedOn`, `closedThrough` (up to 61 days), `note`, `dryRun`; removal takes `closureIds`. |
| `set_booking_interval` | `expectedVersion`, `minutes`: a multiple of 15 from 15 to 480. `id` and `expectedVersion` are the read's `practice` row; the result's `entity` is `practice`. It spaces the openings the schedule offers; booking, moving and `availability` still accept any start the type fits, and booked appointments keep their times. |

The action refuses a staff session with `forbidden`, and the database refuses it again. No change
cancels a booking. A change that would leave booked appointments outside a provider's hours
(weekly hours, office hours) answers `schedule_in_use` with those `conflicts`; the sheet lists
them and resends with `keepBooked: true` when the admin chooses to keep them. A dry run
(`dryRun: true`) saves nothing and returns the same `conflicts` (and `adjusted` for an office).
Time off and closed days always save and return the bookings they cover.

The read lists every upcoming appointment the current hours, time off or closed days no longer
cover in `needsNewTime`, each with its `reason` (`outside_hours`, `time_off`,
`office_closed`). The provider's page and the office's card show a count, and its menu links
each to its day. Retired providers and offices are listed apart in `retiredProviders` and
`retiredLocations`. A turned-off type leaves `portal_scheduling_catalog`, so it is no longer
offered for booking; booked appointments keep it.

| Code | Meaning in the Settings window |
| --- | --- |
| `outside_office_hours` | Provider hours would leave the office's hours. |
| `schedule_in_use` | Booked appointments are in the way; `conflicts` lists them. |
| `provider_not_bookable` / `provider_not_eligible` | `book` and `reschedule` refuse a provider who is not bookable or not offered the type. |
| `location_closed` | `book` and `reschedule` refuse a closed day; its open counts read zero. |
| `type_in_use` | A type that appointments have used can only be turned off, not deleted. |
| `already_closed` | Every day in the run is already closed. |
| `last_location` | The only open office cannot retire. |
| `stale_version` | Another change to the same part landed first; the pane refreshes and an open editor keeps its draft. |

Acceptance: [e2e/portal/settings-schedule.spec.ts](e2e/portal/settings-schedule.spec.ts) covers
weekly hours that leave a booking out and a change planned from a later day and cancelled, time
off over a booking and its need-a-new-time line, a type turned off and back on with Undo, a
keyboard reorder with Undo, a closed day and its reopening, the booking interval with Undo, and
staff reading every pane without edit controls.
[e2e/boundaries/scheduling-settings.spec.ts](e2e/boundaries/scheduling-settings.spec.ts) covers
each refusal, the separate versions, office hours moving providers' hours, closed-day runs, and
retiring and restoring against the database.

### Settings: Practice and About

Staff access, Notifications and Software call the server actions in
[settings/actions.ts](src/app/admin/(portal)/settings/actions.ts). Each requires an administrator
session; [settings/mutations/route.ts](src/app/admin/(portal)/settings/mutations/route.ts) is the
same set behind one JSON `POST` with an `action` name. Every write lands one audit row.

| Pane | Action (`route` name) | Inputs and result |
| --- | --- | --- |
| Staff access | `inviteStaff` (`staff.invite`) | `email`, `role`; `displayName` is optional and defaults to the address's local part. Without a deliverable mailbox the result carries a one-time setup link, which the pane shows once. |
| Staff access | `resendStaffInvite` (`staff.invite.resend`) | `id` (the account's user id); replaces the pending link and invalidates the earlier one. |
| Staff access | `changeStaffRole` (`staff.role`) | `userId`, `role`. |
| Staff access | `deactivateStaff` (`staff.deactivate`) | `id`. An onboarded account is signed out and refused; a pending invite is cancelled, its account deleted, and the address can be invited again. |
| Notifications | `addNotificationRecipient` (`recipient.add`), `removeNotificationRecipient` (`recipient.remove`) | `email`, optional `label` and `active`; removal takes `id`. |
| Notifications | `toggleNotificationRecipient` (`recipient.toggle`), `updateRecipientLabel` | `recipientId` with `active` or `label`. Pausing an address offers Undo by sending the opposite `active`. |
| Notifications | `sendTestNotification` (`recipient.test`) | Optional `{ recipientId }` sends to that one address, on or paused; with no input it sends to every address that is on. Returns `recipientCount` and the provider's `accepted` count. The audit row (`recipients.test_send`) records the count and recipient ids, never the addresses. |
| Software | `inviteMaintainer`, `cancelMaintainerInvite`, `revokeMaintainer` (`maintainer.*`) | Unchanged; the facts on the pane come from [website-custody.ts](src/lib/portal/website-custody.ts). |

| Code | Status | Meaning |
| --- | --- | --- |
| `invalid` | 400 | The input failed its contract. |
| `forbidden` | 403 | A staff session; the panes render read-only for staff and the server refuses anyway. |
| `not_found` | 404 | The address or account is gone; the pane refreshes. |
| `conflict` | 409 | The address is already on the list, or a staff account already uses it. |
| `none_on` | 409 | The test send has no address that is on. The pane disables the button and says why. |
| `limit` | 429 | Three test sends per administrator per 10 minutes. |
| `unavailable` | 503 | The provider or database failed; the pane keeps its state and says so. |

A test send the provider does not accept (`accepted: 0`) is a success with nothing delivered; the
pane says the email couldn't be sent and that requests still arrive on Home.

Acceptance: [e2e/portal/admin-ux.spec.ts](e2e/portal/admin-ux.spec.ts) covers the dialogs,
pausing and Undo, the test send, inviting, resending, cancelling and re-inviting a pending account,
and deactivation. [e2e/portal/admin-server.spec.ts](e2e/portal/admin-server.spec.ts) covers the
staff refusals and the audit rows.
[e2e/boundaries/notification-test.spec.ts](e2e/boundaries/notification-test.spec.ts) covers the
test send's recipients, `none_on`, the rate limit and its audit row, and
[e2e/boundaries/recipients.spec.ts](e2e/boundaries/recipients.spec.ts) the recipient list's
database refusals.

### Day hours

The Day view's Hours sheet (`day-hours-sheet.tsx`, admins only, today and later) changes a
provider's hours for the day on screen, or for that weekday from the day on. Its Server Functions
are in [schedule/day-hours-actions.ts](src/app/admin/(portal)/schedule/day-hours-actions.ts) and
take the shapes in [scheduling/day-hours-contracts.ts](src/lib/portal/scheduling/day-hours-contracts.ts).
Each refuses a staff session with `forbidden`, and the database refuses it again.

| Server Function | Input, result, and failures |
| --- | --- |
| `readDayHoursFor(date)` | Every bookable provider that day: the day's `windows` (weekly hours plus one-off hours, less a day's reasonless removals), the weekday's `weekly` windows, `homeLocationId`, `usualWeekdays`, `timeOff` with its reason, and the day's `bookings`; each office's hours that weekday and whether it is `closed`. Time off is listed, not edited: it stays in Settings. |
| `setDayHours({ idempotencyKey, command })` | `command` is `providerId`, `date`, `scope` (`date` or `weekday_from`), the whole day's `windows` (office, open and close minute on the 15-minute grid, no two overlapping, none touching at one office), `expectedVersion`, and `dryRun`. Success returns the provider's `version`, the day's `openCount`, and, unless a dry run, the `changeId` Undo sends. A dry run writes nothing. |
| `undoDayHours({ idempotencyKey, changeId, expectedVersion })` | Puts the provider's hours and one-off hours back as they were before that change, when nothing has changed the provider since. |

`date` rewrites only that day; other weeks keep their weekly hours. `weekday_from` ends the
weekday's weekly rows the day before and starts the new windows on the day, clearing that day's
one-off hours; earlier weeks are unchanged. Neither reaches the part of today that has passed
(`hours_in_past`).

| Code | Meaning in the Hours sheet |
| --- | --- |
| `schedule_in_use` | The change would strand a scheduled, checked-in or completed visit. The `conflicts` list names each; the sheet offers Keep (the old end) or Reschedule (the visit's card on its Reschedule face). A dry run answers the same. |
| `outside_office_hours` | A window would leave the office's hours that weekday. |
| `location_closed` | A `date` window falls on an office's closed day. |
| `provider_not_bookable` / `location_unavailable` | The provider or office was turned off meanwhile. |
| `stale_version` | Another change landed first, with `currentVersion`; Undo refuses the same way once the provider has moved on. |

The sheet sends a dry run per row while dragging and one command per changed row on Save, then
raises one toast whose Undo sends each `undoDayHours` in reverse.

Acceptance: [e2e/portal/schedule-day-hours.spec.ts](e2e/portal/schedule-day-hours.spec.ts) drags
an end past a visit, keeps it, shortens it, switches on a provider who was off, saves both, and
undoes. [e2e/boundaries/day-hours.spec.ts](e2e/boundaries/day-hours.spec.ts) covers shorten,
extend, add, remove, the stranded-visit refusal, the office-hours bound, `weekday_from` leaving
earlier weeks unchanged, a dry run that writes nothing, the staff refusal, and a stale undo.

## Requests and appointments

The home sheet calls `readFullRecord(requestId)` from
`src/app/admin/(portal)/requests/record-actions.ts` with a UUID and receives
`FullRecord` from `src/lib/portal/request-record/contracts.ts`. Null means the request no
longer exists; a rejection is a failed read to treat as `unavailable`: offer retry and do not
render an empty record. Invalid IDs reject before any database access. This staff-authorized
Server Function returns private, uncached responses by construction; the read adds no cache
or revalidation. It carries patient contact details and notes: keep them out of URLs, telemetry,
and persistent browser storage, and render name, phone, and email under `data-ui-redact`.
History retains notes and creation origin; resolve actor names using trimmed, lowercased email
keys in `actorNames`, falling back to the original email. Frontend acceptance: open a card →
open the sheet → see the composed record; save an outcome on the card → re-read → see the new
history entry and version. Sheet wiring and visual verification remain frontend work.

The scheduling endpoint coordinates a reservation and its intake request in one save. First
review/select or register the patient and explicitly link the request through the patient API.
The older request-only Scheduled action does not reserve provider capacity.

| Staff action | Coordinated input and result |
| --- | --- |
| Book a linked request | Add `sourceRequestId` and the current `requestVersion` to `book`. Both must be present together. New/Contacted becomes Booked as the appointment is reserved. |
| Reschedule | Send appointment `expectedVersion` and current `requestVersion`. Both appointment times and both versions change together. |
| Cancel | Send appointment `expectedVersion`, `requestVersion`, a reason, and a `requestOutcome`. `call_again` needs an absolute `callAgainOn`: capacity is released and the request returns to Contacted at 8 a.m. practice time on the chosen day, which must still be in the future. `close` takes no date and closes the request as won't schedule. A command with `callAgainOn` and no outcome means call again. Undo restores the visit and the Booked request either way. |
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

Cancellation must display the chosen Call again day, or that the request closes, before saving. Missing request version or
follow-up produces `request_version_required` or `request_follow_up_required`. Handle
`request_stale_version`, `request_not_actionable`, `request_already_booked`, `request_link_conflict`,
`request_undo_unavailable`, and `request_transition_rejected` by explaining the conflict and fetching
current data. Preserve the same body/key for an uncertain retry, including after midnight.

Historical request-only bookings remain historical; do not infer a provider, patient match, or
reservation from them. Older source associations can be unmanaged. Use current read metadata to
choose the applicable contract. Intake cleanup removes source references while retaining the
patient and appointment. Undo cannot recreate a deleted request.

The Home record card books requests with or without a linked patient (Figma
Ypf9ohpRcGWF5C9T9bSvWW, 09d–09f): choosing Appointment scheduled draws the month from `month_availability`, a day's
popover lists its open starts, and Book sends `book` with `sourceRequestId` and `requestVersion`
through `bookFromCard`. `time_unavailable` or `provider_conflict` re-reads the month under a new
idempotency key and reopens the day with the nearest start; any other failure keeps the same key
for Try again. When no patient is linked, `bookFromCard` registers the requester from the stored
request and links them before saving the reservation, using the same path as Schedule. The month
shows mint discs only for days whose live read returned openings; callback dates use the plain calendar.

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
set in bounded pages for its existing local filters; its 60-row closed tail is intentional. If Home
becomes server-paged, use this contract. Offset pages reflect current data; refresh the visible
slice after actions change ordering. A service failure is not an empty result.

Acceptance when these controls change: filter counts, empty and deep pages, Previous/Next under
the same filters, changed ordering after saves, and a read failure. Existing
[worklist evidence](https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/pull/224#issuecomment-5563545212)
covers the complete-read integration in the current screens.

## Activity log

The read is the Server Function `readActivityPage(filters, cursor)` in
`src/app/admin/(portal)/audit/activity-actions.ts`; its contract is
[activity-contracts.ts](src/lib/portal/activity-contracts.ts) and the database function is
`portal_read_activity`. It requires a staff session (a signed-out call throws the usual 401) and
takes the viewer's role from their staff profile in the database, never from the caller.

| Input | Meaning |
| --- | --- |
| `filters.categories` | Chips: `appointments`, `requests`, `schedule`, `sign_ins`, `settings`. Absent or empty means all the viewer may see. |
| `filters.appointmentActions` | `booked`, `moved`, `cancelled`, `checked_in`, `no_show`, `completed`. Narrows only Appointments rows; an undo counts as the action it undid. |
| `filters.providerId` | Rows whose provider, or prior provider for a move, is this one. |
| `filters.from`, `filters.to` | Inclusive practice-local dates (`YYYY-MM-DD`, America/New_York); `to` before `from` is invalid. |
| `filters.query` | Up to 200 characters and eight words; every word must start a word of the actor, patient or request name, provider, location, appointment type, staff member or recipient a Settings row is about, or the action's words. Sent in the POST body only. |
| `cursor` | `null` for the first page, then the page's `nextCursor` (`{ occurredAt, id }`). |

A page is `{ ok: true, rows, nextCursor, counts }`: up to 50 rows newest first, ordered by
`(occurredAt, id)`, `nextCursor` null on the last page, and `counts.hidden` (how many rows the
viewer could see that the filters leave out) on the first page only. Front desk sees
appointments, requests, the schedule and their own sign-ins; an admin also sees every sign-in and
the Settings category (staff, recipients, maintainers and exports). Print packets are request
work and read under Requests. A Settings
chip sent by front desk returns no rows rather than an error.

Failures are `invalid_command` (filters or cursor the contract refuses: keep the controls and say
the filter could not be applied), `unauthorized` (session handling), and `unavailable` (a failed
read; offer Try again and never show it as an empty log).

Phrase a row with `activityActor(row)` followed by `phraseActivityRow(row, now).sentence` from
`activity-model.ts` ("Maria Lopez moved Dana Walsh to Thu, Sep 17 at 2:00 PM with Dr. Awad");
audit rows reuse Recent work's `describeAction`. `technical: true` marks a row the log has no
words for. `via` is `"undo"` for an undo and `"system"` for the retention job; whether a change
came from the Schedule or the appointment card is not recorded, so the log never says. `before`,
`after` and `detail` carry the source record for an expanded Technical record.

The page address holds the filters, never the search: `parseActivitySearchParams` and
`activityHref` read and write `/admin/audit?category=&action=&provider=&from=&to=` with
comma-separated lists, dropping unknown values. A successful sign-in writes the `auth.sign_in`
row; a refused one writes nothing.

Acceptance (`e2e/boundaries/activity.spec.ts`): merge order across the three histories, cursor
paging across days, every category and appointment chip, provider, date and search filters,
front-desk versus admin scoping, the sign-in row, and anonymous and signed-in Data API calls
refused.

The page is connected and verified in `e2e/portal/activity-log.spec.ts`: provider, chip and date
filters written to the address and kept across a reload, Clear all, a row opening its appointment
on the Schedule, front desk without the Settings chip or the Technical record, and an
`unavailable` read shown as "The log could not be loaded" with Try again. The same spec downloads
a review flyer's PDF and its .zip from `/admin/review-flyers/zip/[key]` and checks every entry's
name, size and CRC against `private/review-flyers`.

## Help and tours

The staff session (`resolveStaffAuthState` in [auth.ts](src/lib/portal/auth.ts)) carries
`pendingTour`: the tour the portal layout's tour runner starts, or null. An unreadable record
starts no tour. `pendingTourFor` picks it
from the account's `staff_tours` records: a tour started from Help (`pending`) runs first, the
role's own tour when both are pending; otherwise the role's tour runs until it has any record.
Sign-in and a completed password change redirect to `landingHref(pendingTour)`, the tour's first
screen, so an admin's first tour opens on Settings › Providers; a run that begins elsewhere waits
for its first screen.
Front desk takes `front_desk`; an admin takes `admin` by default and may take both
(`toursForRole`). The steps, their screens and their targets live in
[tours.ts](src/lib/portal/tours.ts).

| Server Function (`tour-actions.ts`) | Input, result, and failures |
| --- | --- |
| `startTourAction(tour)` | Help's Start buttons. Records the tour `pending` and redirects to its first step's screen. A tour the role cannot take, or an inactive account, throws. |
| `endTourAction({ tour, outcome })` | The runner's Done (`finished`), Skip tour, Close or Esc (`skipped`). Returns `{ ok: true }`, or `{ ok: false }` for refused input or a refused write; the tip still closes, and the tour may start again on the next sign-in. |

`portal_set_staff_tour(p_user_id, p_tour, p_status)` is service-role only and returns whether the
record changed. It refuses an unknown tour or status (`22023`), an account without an active
profile (`P0002`) and the admin tour for front desk (`42501`), and audits each change as
`staff.tour_restart`, `staff.tour_complete` or `staff.tour_dismiss`. The records go with the
account. The single `portal_tour_dismissed_at` column they replaced is dropped; each dismissal
became a record for the role's tour, `finished` when the old tour was completed and `skipped`
otherwise.

Help topics live in [help-topics.ts](src/lib/portal/help-topics.ts). Each has an id that is its
address (`helpTopicHref(id)`, `/admin/help#<id>`), a group, and a role; `helpTopicVisible` hides
Practice settings topics from front desk. A screen adds help with
`<HelpButton topic="<id>" />` from [help-button.tsx](src/components/ui/help-button.tsx): a tooltip
names the topic, the popover shows its answer, and "Open in Help ›" opens it in place. Every
signed-in staff member can open Help; "Request a website change" stays `WEBSITE_CHANGE_HREF`.

Acceptance: `e2e/boundaries/tours.spec.ts` (records per account and tour, role refusal, audit
rows, cascade on account removal, Data API refusal, the dropped column), `e2e/portal/tours.spec.ts`
(both tours from first sign-in, worked from the keyboard; Done and Skip tour recorded and not
restarted; Help restarting either tour) and `e2e/portal/help.spec.ts` (search, topic addresses,
the role's groups and the Hours sheet's help button through to Help).

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
`clinical.spec.ts`, `worklists.spec.ts`, `find-people.spec.ts`, `schedule-people.spec.ts`,
`admin-ux.spec.ts`, `notification-test.spec.ts`, `tours.spec.ts`, and `help.spec.ts`. Read them with the matching contracts. A real
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
