# Westchase GI

One deployment, two products for FDHS Westchase Gastroenterology: the five-language
patient site through which patients reach the practice, and the staff portal where the
practice works what the site brings in.

## Language

### Products

**Patient site**:
The public five-locale website where patients reach the practice and prepare for visits.
_Avoid_: public site, marketing site

**Staff portal**:
The authenticated tool where practice staff do their web-adjacent jobs, centered on the
appointment-request queue.
_Avoid_: admin panel, dashboard, back office

### Appointment requests

**Appointment request**:
A patient's ask for a callback to schedule a visit, submitted from the patient site. The
portal's unit of work.
_Avoid_: lead, booking, appointment, submission

**Intake**:
The pipeline that accepts an appointment request from the patient site and durably stores
it in the queue before the patient sees success.

**Queue**:
The durable collection of appointment requests awaiting or under staff work; the system of
record for them. The staff-facing surface is called Requests.
_Avoid_: inbox

**Receipt**:
The short-lived confirmation a patient sees after a no-JavaScript submission, backed by a
one-time token.

### Request lifecycle

**Request status**:
Where a request sits in its working life: new, contacted, scheduled, or closed. Not a
linear funnel — new → scheduled is the normal successful path.
_Avoid_: stage

**Closure disposition**:
The outcome recorded when a request closes: converted (an appointment was booked) or
unconverted (closed without one). Classifying a closure assigns it; staff answer a plain
question and never see this term.
_Avoid_: closure classification

**Call outcome**:
The staff-recorded result of one phone interaction with a patient — the real unit of
front-desk work. The status change, callback date, and closure disposition it implies
belong to the same record.

**Callback date**:
The staff-chosen day a contacted request should resurface for another attempt.
_Avoid_: snooze, follow-up date

**Undo**:
The action that restores a request's previous lifecycle position after a saved call
outcome, without erasing that outcome from Request activity.

**Appointment request notes**:
The single per-request surface where staff read and leave context for the next person.
_Avoid_: comments

**Request activity**:
A request's staff-visible history: notes, call outcomes, notification results, and Undo
evidence.
_Avoid_: event stream, timeline

**Record handoff**:
The staff-recorded moment a booked appointment is considered captured in the practice's
real scheduling record. Starts a converted request's retention clock.

### Retention and privacy

**Data lifecycle**:
The retention-and-deletion schedule for patient-request data. Say "data lifecycle" for
retention and "request lifecycle" for status movement — plain "lifecycle" is ambiguous
in this project.

**Legal hold**:
A block on every deletion path for a request, scheduled or exceptional, until explicitly
released.
_Avoid_: retention hold

**Exceptional early deletion**:
Privileged deletion of a request ahead of its schedule, authorized by the privacy/records
custodian with a non-PHI reference.

**PHI-free**:
Carrying no patient-supplied data: no name, contact detail, reason text, or note. The bar
for everything that leaves the queue — notifications, logs, telemetry, audit metadata.

**Telemetry**:
The patient site's aggregate, PHI-free usage counts. Directional evidence — counts and
funnels, never per-visitor journeys.
_Avoid_: tracking

### People and access

**Staff member**:
A person who can sign in to the staff portal. "Staff" doubles as the collective and the
non-administrator role; say "staff role" when the distinction matters.

**Administrator**:
The elevated staff role: manages staff access and maintainers and reads the technical
audit.
_Avoid_: superuser, owner

**Notification recipient**:
A destination chosen to receive new-request pings, managed independently of sign-in
access.
_Avoid_: subscriber

**New-request ping**:
The PHI-free email telling notification recipients that an appointment request arrived.
_Avoid_: alert

**Maintainer**:
A person who can edit and publish the website — the practice's vocabulary for website
access, never expressed to staff as repository topology.
_Avoid_: collaborator, developer

### Portal surfaces

**Recent work**:
The plain-language, work-linked view of what staff did; the human layer of the two audit
layers.

**Audit log**:
The exact, metadata-only technical record beneath Recent work — identifiers, action
codes, and dispositions, never patient text. Administrator territory.

**Release briefing**:
An application-owned announcement of a portal release, offered to each staff member for a
bounded window with per-person engagement state.

**Review flyer**:
An approved printable page carrying a review QR code for one destination. Printing one is
front-desk work; changing the artwork is not portal work.

### Patient site

**Locale**:
One of the five first-class language modes: English, Spanish, Vietnamese, Korean, Arabic.
Every patient surface exists in all five; none is a partial translation.

**Text line**:
The staffed human text channel patients can message. A person answers — never a bot.
