# Working in this repo

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
