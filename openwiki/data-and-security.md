---
type: Security and Data Guide
title: Data Model and Security Boundaries
description: Portal entities, role enforcement, closed Data API posture, sensitive-data handling, retention rules, legal holds, and lifecycle activation state.
resource: supabase/migrations
tags: [data-model, security, rls, retention, supabase]
---

# Data model and security boundaries

## Data model

Committed migrations under `supabase/migrations/` are the schema history. The active operational entities are:

| Entity | Purpose |
|---|---|
| `requests` | Sensitive callback leads, queue status, closure classification, handoff, and legal-hold state |
| `request_events` | Notes, notification outcomes, and receipt events tied to a request; cascade with the parent |
| `notification_recipients` | Addresses eligible for PHI-free new-request notices |
| `staff_profiles` | Authoritative portal role, active/onboarded state, display identity, and tour state |
| `audit_log` | Minimized actor/action/entity history for staff-visible mutations |
| intake rate-limit storage | Shared atomic HMAC buckets for public intake throttling |

Early registry tables were removed by later migrations. Current website custody and maintainers are read from the GitHub provider, not maintained as a local software registry.

The model supports the [appointment workflow](workflows/appointment-intake.md) and is accessed through the server architecture described in [architecture overview](architecture/overview.md).

## Sensitive-data posture

The portal is **PHI-minimal, not PHI-free**. Intake has no dedicated clinical fields and asks patients not to provide medical detail, but names, phone/email, optional reasons, and staff notes remain potentially sensitive.

Required boundaries from `AGENTS.md`, `docs/PORTAL-OPS.md`, and source:

- patient fields never appear in URLs, notification email, operational logs, or audit detail;
- the queue is authoritative; inboxes are only alerts;
- field caps exist at browser, server, and database layers;
- legacy patient-bearing query strings are removed before page resources load;
- receipt secrets are stored only as hashes;
- CSV exports become clinic-controlled sensitive copies once downloaded;
- no service, email, GitHub, or Auth credentials enter client bundles.

## Authentication and authorization

Supabase Auth establishes identity. `src/proxy.ts` refreshes and checks the cookie session at the `/admin` perimeter, but operation-level enforcement is authoritative:

1. `serverClient()` verifies the cookie-bound user.
2. `resolveStaffAuthState()` uses the server-only service client to read `staff_profiles`.
3. `getSessionUser()` requires an active, onboarded profile.
4. `requireRole("staff" | "admin")` enforces the role next to each protected operation.

Never authorize from user-editable metadata. Auth metadata may be synchronized for provider consistency, but `staff_profiles` is the source of truth.

Both roles can work requests, add notes, export, inspect operational views, and pause/resume recipients. Administrators additionally manage recipients and staff, change roles, manage GitHub maintainers, place/release legal holds, and access review flyers. Self-deactivation and self-demotion are blocked.

Invite/recovery password setup requires a recently verified one-time flow plus a ten-minute HMAC-signed, HTTP-only, strict same-site `/admin` cookie. Reset requests use an enumeration-resistant visible response.

## Database and API posture

RLS remains enabled on every portal table, with zero anonymous grants. Later hardening closes authenticated Data API reads and writes: application data operations use the service role from server-only modules after identity and role checks. RPC execution is limited to the privileged role. No authenticated write policy is an acceptable shortcut.

Database functions make state changes and audit writes atomic where required. Every staff-visible mutation must create an audit row. Audit detail may include UUIDs, actors, transitions, dispositions, authorization references, and counts; it must not copy patient values or note bodies.

Public intake is the controlled privileged exception. It validates first, applies an atomic database rate limit keyed by HMAC, fails closed when throttling cannot be established, and only then inserts.

## Request lifecycle

Migration `20260725170000_add_request_data_lifecycle.sql` adds classification, legal holds, preview/run functions, and guarded early deletion.

| Data | Policy |
|---|---|
| Open request | No automatic deletion |
| Closed, unconverted | 180 days after classified closure |
| Closed, converted with verified FDHS handoff | 12 months after classification/handoff |
| Request notes/events | Follow parent request |
| Receipt token hash | Remove after one hour; receipt valid for 15 minutes |
| Expired limiter bucket | Remove on next lifecycle run |
| Audit row | Six years unless protected by related legal hold |
| Recovery copies | Target 14 days, subject to verified Supabase plan/PITR capability |

Reopening clears classification and its clock. Pre-policy closed rows remain unclassified and cannot expire automatically; the migration does not guess. A legal hold blocks scheduled and exceptional deletion. Only admins place/release one, with a short non-patient reason, and every change is audited.

Exceptional early deletion has no portal UI. A database operator may call the guarded function only with a non-PHI authorization reference from the designated custodian. Rollback cannot recreate already deleted rows.

## Activation boundary

Authoritative docs record schema parity through the lifecycle migration, but **the migration schedules and deletes nothing**. No Cron exists and no retention deletion has run. Production activation remains blocked until records/privacy approval, practice-controlled Supabase custody and compliance posture, disposable and Development verification, cap preflights, and an approved count-only Production preview are recorded (`docs/PORTAL-OPS.md`).

Do not create a Cron, run the lifecycle function, or reinterpret the migration as activation. The procedure for migrations, previews, rollback, and recovery belongs to [operations and governance](operations-and-governance.md).

## Change checklist

- Add a field: update client, Zod contract, insert/read mapping, migration constraints, export policy, lifecycle implications, and E2E coverage together.
- Add a mutation: authenticate first, apply the narrow role, make state/audit atomic, minimize audit detail, and test staff/admin/anonymous cases.
- Change role rules: update `auth.ts`, management operation checks, UI visibility, and authorization tests; do not rely on hidden controls.
- Change retention: requires approved policy evidence, forward/rollback migrations, preview semantics, repeated-run tests, and operational activation review.
- Change privileged access: preserve `server-only`, closed Data API/RLS, no client credentials, and the exact target protections in [testing and source map](testing-and-source-map.md).
