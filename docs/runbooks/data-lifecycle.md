# Patient-request data lifecycle operations

Load this runbook only when activating retention, restoring a backup, placing or removing a
legal hold, or performing exceptional deletion. The policy and data interface live in
[`ARCHITECTURE.md`](../../ARCHITECTURE.md#patient-request-data-lifecycle); migrations and RPCs
are the executable sources.

## Activation

The lifecycle migrations deliberately schedule nothing. Do not create or enable the hourly
job until all of the following are recorded:

1. FDHS privacy/records authority has confirmed the `converted` / `unconverted`
   classifications and the authoritative handoff destination.
2. Practice-controlled Supabase custody, organization MFA, the required plan/HIPAA add-on and
   BAA, SSL/network controls, logging, and recovery posture have been verified.
3. The forward migration, permission boundaries, holds, repeated lifecycle runs, and exact
   rollback have passed against disposable Supabase.
4. A count-only preflight finds no existing patient value over a new database cap. Never
   truncate patient-supplied data during migration.
5. Development has passed the same preview and verification first.
6. The first Production count-only preview has been reviewed without patient content and
   explicitly approved.

Only after those gates may Supabase Cron call
`portal_run_data_lifecycle('system@westchasegi.com', now())` hourly. Production migration and
environment changes still require the authorization and evidence described in
[`CONTRIBUTING.md`](../../CONTRIBUTING.md#shipping-to-production).

## Recovery and restore

Backups and point-in-time recovery are recovery copies, not archives. Confirm the actual
retention available under the clinic's current Supabase plan; do not assume a window from an
old note or target.

Restore only into an isolated, access-restricted environment. Before returning a restore to
service:

1. Reapply any exceptional deletions that occurred after the restore point.
2. Run a lifecycle preview without exposing patient content.
3. Verify legal holds, eligible-row counts, and audit continuity.
4. Obtain explicit approval for the restored environment to serve traffic.

## Exceptional operations

- `portal_set_request_legal_hold` requires a short non-patient reason and records an audit
  event. A hold blocks scheduled and exceptional deletion.
- `portal_delete_request_early` requires a non-PHI authorization reference from the
  privacy/records custodian, refuses held requests, writes minimized audit evidence, and then
  deletes the request and cascading events.
- Never put patient names, contact details, intake messages, or staff note text in operator
  arguments, audit metadata, tickets, or command transcripts.
