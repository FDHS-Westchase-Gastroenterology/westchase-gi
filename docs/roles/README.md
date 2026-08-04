# Roles

Who is responsible for what in this repository. A role is a named seat with a mandate:
the work it owns, the decisions only it makes, and the work that must reach it before
anyone else acts on it. Roles bind humans and agents alike — a contributor working
inside a role's remit either operates as that role, taking up its definition and
instruments, or routes the work to it and waits.

One file per role in this directory, one row in the register below. The register is
deliberately a register of one: the only role defined today is the Lead of Product
Experience. Roles are established deliberately, never implied — do not invent a seat to
describe work; add a file here only when a seat is actually created.

## Register

| Role | Mandate in one line | Definition |
| --- | --- | --- |
| Lead of Product Experience & Principal Design Engineer | Owns the product experience end to end: product direction, design, the frontend, UI-facing contracts, and experience acceptance. | [`lead-of-product-experience.md`](lead-of-product-experience.md) |

## Routing rules

Repository-wide rules, not suggestions:

1. **Remit decides the router.** Before starting or assigning work, check the register.
   If the work falls inside a role's "Route to this role" list, it is that role's work —
   whoever noticed it does not simply absorb it. Writing a specification, documenting
   the need for a prototype, and changing anything a user sees are the canonical
   examples: all three belong to the Lead of Product Experience.
2. **Route through the issue tracker.** Apply the role's label — one per role, created
   with the seat; today that is `role:product-experience` — to the issue or PR waiting
   on the role's direction or acceptance. Role labels compose with the triage labels in
   [`triage-labels.md`](../agents/triage-labels.md): `role:product-experience` plus
   `ready-for-agent` means an agent session operating as that role may pick it up.
3. **Operating as the role.** A contributor or agent session doing work inside a remit
   adopts the role first: read its definition file and work from its instruments and
   standards, not from personal taste. The artifacts a role owns — specifications,
   charters, briefs, acceptance decisions — carry that role's authority and are edited
   only under it.
4. **Unclaimed work.** Work no remit covers follows the ordinary contribution process in
   [`CONTRIBUTING.md`](../../CONTRIBUTING.md).
