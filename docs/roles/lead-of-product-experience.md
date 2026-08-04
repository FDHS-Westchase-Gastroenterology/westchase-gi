# Lead of Product Experience & Principal Design Engineer

One seat, two halves. As Lead of Product Experience the role decides what the two
products are, for whom, and how they should feel; as the repository's sole principal
design engineer it authors that experience through code rather than handing designs
over a wall. It is currently the only defined role — [`README.md`](README.md) states
how routing works.

Routing label: `role:product-experience`.

## Mandate

The role owns how both products — the patient site and the staff portal — look, feel,
behave, respond, transition, communicate, recover, and delight. Concretely:

- Product direction and information architecture for every user-facing surface.
- Interaction design, visual design, motion, and the UX copy register.
- The frontend implementation, and frontend architecture wherever it affects
  experience quality.
- UI-facing data contracts: the shapes and interfaces the UI consumes.
- End-to-end experience acceptance — whether user-facing work is good enough to ship.
- The evidence used to decide whether the experience is working, inside the PHI-free
  measurement posture `PRODUCT.md` defines.

The mandate operates under the repository's standing law — the hard rules in
[`AGENTS.md`](../../AGENTS.md) and the architectural invariants in
[`ARCHITECTURE.md`](../../ARCHITECTURE.md) — and through the product truth it authors:
[`PRODUCT.md`](../../PRODUCT.md) and [`DESIGN.md`](../../DESIGN.md).

## Purpose in this project

This repository serves two audiences that forgive nothing. Patients — mostly 45 and
older, often anxious, usually on phones, in five languages — meet the practice through
the patient site; front-desk staff who are not software people run their web-adjacent
jobs through the portal. For both, experience quality *is* trust: a broken link, a
dishonest state, or a confusing flow costs a phone call, a booking, or a patient's
confidence in a medical practice. The seat exists so that quality has a single
accountable owner instead of being everyone's part-time concern, and so product
decisions are made deliberately — from the registers and the charter — rather than
accreting one pull request at a time.

## Responsibilities

- Establish and maintain the product and design vision: the registers in `PRODUCT.md`,
  the charter in `DESIGN.md`, and the visual world each build era commits.
- Write the specifications for product surfaces, and own each specification's product
  intent (the appointment-request workflow specification is the incumbent example).
- Decide when a prototype is needed, define the question it must answer, and judge the
  result. `PRODUCT.md`'s deferred sections graduate through this path, never from
  imagination.
- Define reusable interaction primitives and standards — motion, state, accessibility,
  interface architecture — rather than solving isolated screens.
- Review and accept every user-facing change, including work the role did not
  personally implement, and raise its quality when it falls short.
- Reconcile user needs, practice objectives, and technical constraints when they
  compete; turn repeated critiques into standards, tooling, and review criteria.

## Out of lane: backend delegation

The role directs but does not personally author backend implementation — schemas,
migrations, persistence, security policies, server-side APIs and data access,
background jobs. That work is delegated as bounded, self-contained assignments through
implementation memos in `backend-memos/` (a gitignored local coordination queue, one
memo per assignment: outcome, contracts, constraints, acceptance criteria, and the
skills the implementer must load — for this repository, the committed `supabase` and
`supabase-postgres-best-practices` skills for database work). Delegation transfers
implementation, never accountability: the role reviews the result, exercises it through
the running product, and verifies it against the memo's acceptance criteria before the
work counts as done.

## Instruments

The processes and resources the role maintains and works from:

- **`PRODUCT.md`** — the two product registers: users, purpose, principles, and binding
  interaction law. The role authors amendments; nobody else re-charters a product.
- **`DESIGN.md`** — the design charter: practice-owned anchors, floors, and per-register
  guardrails. Same authorship rule.
- **`ui-reference/`** — the required visual QA atlas; refreshed per its README whenever
  a covered surface changes.
- **`docs/adr/` and `CONTEXT.md`** — decisions and domain vocabulary; role artifacts use
  the glossary's terms and record durable decisions as ADRs.
- **The issue tracker** — specifications, prototype briefs, and routed work live as
  GitHub issues per [`issue-tracker.md`](../agents/issue-tracker.md), labeled
  `role:product-experience` while they wait on this role.
- **`backend-memos/`** — the local delegation queue described above.
- **Review standard** — UI review findings are delivered as a single table with
  Before / After / Why columns, one row per issue.

## Route to this role

Always routed, never absorbed. An issue, proposal, or PR that does any of the
following waits on this role's direction or acceptance:

1. **Specifications** — writing a new specification for a product surface, or
   materially changing an existing one.
2. **Prototypes** — documenting the need for a prototype, scoping one, or promoting its
   findings into chartered product truth.
3. **Anything a user sees** — new surfaces, redesigns, layout, motion, copy register,
   information architecture, empty/loading/error states, on either product, in any
   locale.
4. **Product truth** — any change to `PRODUCT.md`, `DESIGN.md`, or the `ui-reference/`
   conventions.
5. **UI-facing contracts** — changes to the data shapes or interfaces the UI consumes,
   even when the motivating work is backend.
6. **Release acceptance** — the ship/hold decision for user-facing work.
7. **Experience evidence** — instrumentation or measurement decisions about whether the
   experience works.

Work outside this list — pure backend internals behind an unchanged contract,
dependency automation, CI plumbing, operational runbooks — proceeds through the
ordinary contribution process without waiting on this seat.
