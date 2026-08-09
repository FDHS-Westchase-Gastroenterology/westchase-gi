# Westchase GI

One deployment, two products for FDHS Westchase Gastroenterology: the five-language
patient site where patients reach the practice, and the staff portal where the
practice works what the site brings in.

## Language

### Products

**Patient site**:
The public five-locale website where patients reach the practice and prepare for visits.
_Avoid_: public site

**Staff portal**:
The authenticated tool where practice staff do their web-adjacent jobs, centered on the
appointment-request queue.
_Avoid_: dashboard

### Appointments

**Appointment request**:
A patient's ask for a callback to schedule a visit, submitted from the patient site. The
portal's unit of work.
_Avoid_: lead, booking, appointment, submission

**Appointment**:
The real booked visit in the practice scheduling system. The portal confirms a booking
handoff but does not create an Appointment or own its post-booking lifecycle. A reserved
word: never the request itself.
_Avoid_: booking

**Intake**:
The pipeline that accepts an appointment request from the patient site and durably stores
it in the queue before the patient sees success.

**Queue**:
The durable collection of appointment requests staff work and later reference; the system of
record for those requests. The staff-facing surface is called Appointments.
_Avoid_: inbox

**Receipt**:
The short-lived confirmation a patient sees after a no-JavaScript submission, backed by a
one-time token.

### Appointment-request lifecycle

**Request status**:
NEW, CONTACTED, BOOKED, or CLOSED. NEW and CONTACTED are unresolved; BOOKED and CLOSED
are terminal for ordinary work.
_Avoid_: stage

**BOOKED**:
The terminal appointment-request state meaning staff confirmed the booking handoff in the
practice scheduling system. It describes the request's resolution, not the Appointment's
status.

**Scheduled**:
The staff-facing action label for confirming a booking handoff. The action moves a request
to BOOKED; Scheduled is not a request state.

**Closure reason**:
The staff-recorded reason an appointment request reached CLOSED without a booking.
_Avoid_: closure disposition, closure classification

**Contact attempt**:
Append-only evidence of one staff attempt to reach a patient. Repeated attempts preserve
their own outcomes; CONTACTED does not claim the patient was reached.

**Call-again day**:
The staff-chosen day a contacted request should resurface for another attempt. Patient
content uses "follow-up" in its medical sense (a follow-up visit or procedure). That is
a different concept.
_Avoid_: callback date, follow-up date

**Undo**:
The immediate correction that restores the latest eligible request transition's previous
position without erasing that transition from Request history.

**Appointment request notes**:
The single per-request surface where staff read and leave context for the next person.
_Avoid_: comments

**Request history**:
A request's staff-visible history: notes, contact attempts, transitions, notification
results, and Undo evidence. Named for the request: a history exists before any appointment
does. "Event stream" remains correct for the storage layer beneath it, never for this
staff-facing surface.
_Avoid_: timeline, request activity, appointment history

**Booking handoff**:
The staff-confirmed fact that a visit was booked in the practice scheduling system. It moves
the appointment request to BOOKED and starts its resolved-request retention clock; it does
not create a portal Appointment.

### Retention and privacy

**Data lifecycle**:
The retention-and-deletion schedule for patient-request data. Say "data lifecycle" for
retention and "appointment-request lifecycle" for status movement. Plain "lifecycle" is
ambiguous in this project.

**Legal hold**:
A block on every deletion path for a request, scheduled or exceptional, until explicitly
released.
_Avoid_: retention hold

**Exceptional early deletion**:
Privileged deletion of a request ahead of its schedule, authorized by the privacy/records
custodian with a non-PHI reference.

**PHI-free**:
Carrying no patient-supplied data: no name, contact detail, reason text, or note. The bar
for everything that leaves the queue: notifications, logs, telemetry, audit metadata.

**Telemetry**:
Software-recorded usage evidence; every payload is PHI-free. On the patient site:
aggregate counts and funnels, never per-visitor journeys. In the staff portal:
staff-usage telemetry, disclosed to the practice and recorded to improve the product
for staff.
_Avoid_: tracking

### People and access

**Staff member**:
A person who can sign in to the staff portal. "Staff" doubles as the collective and the
non-administrator role; say "staff role" when the distinction matters.

**Administrator**:
The staff role that manages staff access and maintainers and reads the technical
audit.
_Avoid_: owner

**Notification recipient**:
A destination chosen to receive new-request pings, managed independently of sign-in
access.

**New-request ping**:
The PHI-free email telling notification recipients that an appointment request arrived.
Staff-facing surfaces call it a "notification email"; "ping" is the developer register.
_Avoid_: alert

**Maintainer**:
A person who can edit and publish the website. This is the practice's word for website
access, never expressed to staff as repository topology.
_Avoid_: collaborator

### Portal surfaces

**Activity log**:
The staff page that holds both audit layers: Recent work on top, the technical record
beneath it.

**Recent work**:
The plain-language, work-linked view of what staff did; the human layer of the Activity
log.

**Audit log**:
The exact, metadata-only technical record beneath Recent work: identifiers, action
codes, and closure outcomes, never patient text. Labeled "Technical record" on the Activity
log; for administrators.

**Release briefing**:
An application-owned announcement of a portal release, offered to each staff member for a
bounded window with per-person engagement state.

**Review flyer**:
An approved printable page carrying a review QR code for one destination. Printing one is
front-desk work; changing the artwork is not portal work.

**New-request print packet**:
An oldest-first paper snapshot of every appointment request that is durably NEW when the packet
is prepared. It supports a manager's physical handoff, carries patient data, and must stay inside
the clinic. Preparing or printing it records metadata-only audit evidence but never changes
request status, attention, version, or Request history; staff record every outcome in the portal.
_Avoid_: export, batch update, assignment queue

### Design

**Register**:
The voice a product speaks in. The patient site speaks in the brand register; the staff
portal speaks in the product register.

**Anchor**:
A practice-owned design commitment every visual world composes around. Amending one is a
practice decision, never a design judgment.
_Avoid_: constraint, brand rule

**Incumbent surface**:
A surface whose implementation predates the latest committed visual world. Maintenance
matches the surface itself until a rebuild replaces it.

### Patient site

**Locale**:
One of the five first-class language modes: English, Spanish, Vietnamese, Korean, Arabic.
Every patient surface exists in all five; none is a partial translation.

**Text line**:
The staffed human text channel patients can message. A person answers, never a bot.
