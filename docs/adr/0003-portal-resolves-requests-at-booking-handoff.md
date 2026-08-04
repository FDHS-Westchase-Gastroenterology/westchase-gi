---
status: accepted
---

# The portal resolves requests at booking handoff

The portal owns the Appointment Request through a verified booking handoff or an unbooked
closure; it does not own or materialize the resulting Appointment. The request machine is
`NEW → CONTACTED → BOOKED/CLOSED`, with direct `NEW → BOOKED` and guarded direct
`NEW → CLOSED` paths. Contact attempts remain append-only evidence, and BOOKED/CLOSED are
terminal for ordinary work while explicit Reopen and bounded Undo remain correction paths.

This boundary avoids inventing visit dates or duplicating the practice scheduling system while
still giving the portal a truthful successful resolution. **Scheduled** remains the staff-facing
action label for confirming the handoff; `BOOKED` is the domain and persisted request state.
Current state plus an append-only transition log, optimistic versioning, idempotent semantic
commands, and a transactional notification outbox are specified in
[`docs/appointment-request-workflow-specification.md`](../appointment-request-workflow-specification.md).
This decision supersedes ADR-0002's local point-in-time Appointment record.
