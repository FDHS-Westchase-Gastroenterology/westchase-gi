# Working in this repo

@AGENTS.md

AGENTS.md holds the hard rules and the ramp-up order. Claude Code reads CLAUDE.md only,
so it is imported here rather than duplicated.

## Frontend ownership

Claude Code handles all frontend work for the patient site and staff portal: components,
layout, styling, motion, interactions, accessibility, frontend dependencies, and visual checks.
Codex handles the backend. Follow AGENTS.md "Agent responsibilities" for shared work and
explicit assignments. Implement the approved Claude Design system under the existing
`DESIGN.md` adoption workflow.

Before connecting staff-portal controls, read [FRONTEND-HANDOFF.md](FRONTEND-HANDOFF.md). It names
the available backend actions, required inputs, failure behavior, and frontend acceptance paths
for contact completion, patients, scheduling, worklists, optional billing, and clinical records.

For conditional classes, use `import { cn } from "cn";`. The local `@/lib/utils` module is a
compatibility re-export. Follow AGENTS.md "Class-name helper" and CONTRIBUTING.md
"Class-name helper updates" when syncing or migrating registry code; keep the brand palette
and existing component behavior intact.

## Browser: use the in-app Browser pane

For anything that needs a page on screen (checking the portal, measuring computed
styles, taking before/after screenshots), use the in-app Browser pane
(`mcp__Claude_Browser__*`). Do not reach for the Chrome extension
(`mcp__claude-in-chrome__*`), macOS `screencapture`, or desktop computer-use.

**Why.** The Browser pane is already logged into the local portal, its
`javascript_tool` and `computer` screenshot work on the first try, and the loop
is seconds. The Chrome extension route cost most of an hour on 2026-09-06:
`save_to_disk` wrote nothing, `screencapture` returned only wallpaper without a
Screen Recording grant, and the Chrome window was not in the window list.

**How.** `.claude/launch.json` (local-only, not committed) attaches to the dev
server the owner already runs on http://localhost:3000 under the name
`portal-dev`; open it with `preview_start`. Never start a second Next dev server
and never kill the owner's. Local dev credentials are for the owner to type, not
you; if the pane is signed out, say so and wait.
