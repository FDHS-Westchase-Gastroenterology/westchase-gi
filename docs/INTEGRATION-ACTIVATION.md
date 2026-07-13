# Integration activation runbook

The staff portal's registry page shows two connection panels — GitHub and
Vercel — that are deliberately inert. This document is the complete recipe
for activating them later. It is written for whoever maintains this
repository at that time; no other context is required.

## Why the seams are inert

Until the practice owns its own GitHub organization and Vercel team, any
credential the portal held would belong to an individual's personal
account. That is the wrong trust shape for a medical practice's
infrastructure: it couples the clinic's operations to one person's
identity, and personal access tokens are broad, long-lived, and hard to
scope. The decision on record: **no personal access token is ever wired
into this portal.** The sanctioned integration is a **GitHub App owned by
the practice's own organization**, created only after the ownership
transfer completes.

## Preconditions (in order)

1. **The practice owns its accounts.**
   - A GitHub organization created by the practice, with the practice's
     email as owner and two-factor authentication enforced.
   - A Vercel team owned by the practice (the website project transferred
     into it, or redeployed from the transferred repository).
   - This repository transferred into (or forked to) the practice's
     GitHub organization; the deploy pipeline verified green afterward.
2. **A maintainer with admin access to both.**

## Activating the GitHub connection

1. In the practice's GitHub organization, create a **GitHub App**
   (Settings → Developer settings → GitHub Apps → New):
   - Name it clearly (for example `wgi-portal`).
   - Permissions, least privilege: Repository → **Administration:
     read-and-write** (collaborator management) and **Metadata: read**.
     Add nothing else until a feature needs it.
   - No webhook is required for the first iteration.
2. Install the App on the organization, scoped to only the website
   repository.
3. Generate a **private key** for the App. Store it — along with the App
   ID and installation ID — in the deployment platform's environment
   variables (`vercel env add`). Never commit any of them. Suggested
   names: `PORTAL_GITHUB_APP_ID`, `PORTAL_GITHUB_APP_INSTALLATION_ID`,
   `PORTAL_GITHUB_APP_PRIVATE_KEY`.
4. Implement a live provider in `src/lib/portal/integrations.ts`:
   replace the static `status()` for `github` with an implementation that
   authenticates as the App installation (exchange the App JWT for an
   installation token server-side; tokens are short-lived by design).
   Keep every call server-only — the portal's browser bundle must never
   hold credentials.
5. Wire the registry's grant actions to the App where appropriate
   (adding/removing repository collaborators), keeping the audit-log
   writes exactly as they are.

## Activating the Vercel connection

1. From the practice's Vercel team, create an **access token scoped to
   the team** (Team Settings → Tokens) with the narrowest available
   scope. Prefer a token that can read deployments and manage
   environment variables, nothing broader.
2. Store it as `PORTAL_VERCEL_TOKEN` (plus `PORTAL_VERCEL_TEAM_ID`) via
   `vercel env add` — server-side only, never `NEXT_PUBLIC_*`.
3. Implement the live `vercel` provider in
   `src/lib/portal/integrations.ts`: deployment visibility first
   (list/inspect), configuration management second. All calls
   server-side.

## Verifying after activation

- The registry page's connection panels flip to "Connected" with the
  organization/team name, rendered from live server-side calls.
- `npm run build` then a scan of `.next/static` for credential material
  comes back clean (the repository's secret-scan script covers this).
- The audit log records every access change made through the portal.

## What NOT to do

- Do not wire a personal access token "temporarily." That is the exact
  failure mode this seam was designed to prevent.
- Do not call GitHub or Vercel from client components; the panels render
  server-provided state only.
- Do not widen App permissions speculatively; add scopes when a shipped
  feature requires them.
