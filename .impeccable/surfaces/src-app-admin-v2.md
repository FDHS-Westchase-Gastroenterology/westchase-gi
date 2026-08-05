---
version: 1
slug: "src-app-admin-v2"
primary_target: "src/app/admin/v2"
related_targets: ["src/app/admin/v2/page.tsx","src/app/admin/v2/requests/page.tsx"]
---

# Staff portal v2 — Appointments workbench prototype

Scope: `src/app/admin/v2/` — the prototype portal shell, Today (day sheet), All
appointments (the book), and the request page. Mode: Operate.

Audience and scene: front-desk staff and the practice manager, between patient
interactions, on the front-desk computer or a hallway phone. Not software people.

Job: make the settled appointment-request machine (NEW → CONTACTED → BOOKED/CLOSED,
append-only contact attempts, classified closure — docs/appointment-request-workflow-
specification.md) legible and operable. Staff act with the four real verbs: Log a
call, Scheduled (confirms booking handoff), Close (typed reason), Reopen. Undo is a
bounded correction; a colleague's concurrent change surfaces as a truthful conflict,
never a silent overwrite.

Chosen direction: The Day Sheet (see DESIGN.md, committed portal world). Memorable
moment: the terminal stamp settling onto the page; the strike-through Undo.

Constraints: synthetic data only, clearly framed; the pure machine in
`src/lib/portal/appointment-request-machine.ts` is the single transition authority;
no schema, migration, or server mutation ships in the prototype.

Unresolved decisions (graduate via #221): whether Today replaces Home; how the other
portal jobs join the shell; queue ordering within sections; Booked-list retention view.
