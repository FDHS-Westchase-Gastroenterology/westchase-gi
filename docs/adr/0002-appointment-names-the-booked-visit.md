---
status: superseded by ADR-0003
---

# "Appointment" names the booked visit, never the request

The staff destination renames from "Appointment requests" to "Appointments," and the
model gains a second concept (2026-08-01): an **appointment** is the booked visit a
request produces, recorded at scheduling with the visit date and, when known, the time.
It is deliberately a point-in-time record — staff already enter the booking in the
practice's real scheduling system in the same act, that system remains the system of
record, and the portal only ever claims "what we booked." Its job is day-of visibility
(e.g. "booked for today"); it informs and never generates work, because the portal does
not learn about reschedules. The date is asked for insistently but never blocks a save:
a required date fails as invented data or stalled status, while a missing one stays
honest ("Scheduled — no date recorded"), and pre-existing Scheduled rows carry no date
anyway.

The rejected alternative was the CRM-style umbrella, where every queue item is an
"appointment" ("appointments requested," "appointments closed"). In this practice the
word already has one concrete referent — the real schedule — so umbrella usage would
make "3 appointments today" permanently ambiguous, and a request closed without booking
would become a "closed appointment" that never existed. "Appointment" is therefore a
reserved word: the destination is named for what the work produces, but on every
surface a request is "a request" until it is booked. This is also why "Request
activity" became "Request history" rather than "Appointment history." This decision
supersedes the unadopted draft product brief's invariant pinning the destination name
to "Appointment requests."
