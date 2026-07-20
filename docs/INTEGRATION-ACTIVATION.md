# Integration activation and custody runbook

The staff portal's Website page lists the owner, current Write maintainers, and pending
invitations for the one canonical repository through a clinic-owned GitHub App. Portal
administrators can invite a maintainer, cancel an invitation, or revoke a maintainer after the
App's Repository Administration permission is active. It records Vercel hosting custody as a
static fact and does not connect to or manage Vercel.

## Current custody (verified 2026-07-19)

- The clinic-controlled personal GitHub account `FDHS-Westchase-Gastroenterology` owns
  `FDHS-Westchase-Gastroenterology/westchase-gi`. The old `ASTXRTYS/westchase-gi` URL redirects.
- GitHub retained `ASTXRTYS` as a **Write** collaborator. That is sufficient for implementation;
  Admin is granted only when a specific repository-settings task requires it.
- The clinic owns the Vercel Hobby account and replacement project `westchase-gi`. Required
  application variables were moved to their intended targets; the GitHub App private key remains
  Production-only. The `westchase-gi.vercel.app` alias moved, an ASTXRTYS-authored probe commit
  deployed READY, and the former consultant-owned project was deleted.
- `westchasegi.com` cut over on 2026-07-18. Porkbun now serves its DNS, the apex is the canonical
  patient origin, `www` redirects to the apex, TLS is live, and the Vercel alias remains attached.
- Production is deployed through `1b2f142` (PR #42). The task-first portal,
  Website/maintainer controls, and integrated review-flyer printer are live in the application;
  their remaining external acceptance work is listed below and in `docs/PORTAL-OPS.md`.
- The private GitHub App `wgi-portal` is registered on the clinic account with Repository
  Administration read/write and Metadata read permissions, and no webhook. Every portal request
  verifies the exact account and repository by numeric ID, scopes a short-lived token to that one
  repository, and exposes only the three maintainer commands above. A manual rehearsal proved the
  full server-to-server authentication chain.
- App identifiers and private-key material remain outside git. The private key is the only secret
  in this connection; never paste any of these values into source, documentation, issues, or
  command-line arguments.
- The three App variables are configured only in the clinic-owned Vercel project's Production
  environment. They are deliberately absent from Preview: mutable preview code must not inherit
  an App key whose registration includes Repository Administration permission. The provider's
  configured and unconfigured states were rehearsed locally against the real App before release.

These verified clinic-custody statements cover GitHub, Vercel, the GitHub App, and Porkbun.
They do not prove account-level custody of Supabase or Resend. Supabase organization transfer,
Resend account custody, and email-path acceptance remain explicit items in
`docs/PORTAL-OPS.md`; do not summarize them as complete without dated evidence.

Two owner-only defense-in-depth follow-ups remain open. Neither is a portal readiness gate:

1. Enable two-factor authentication on `FDHS-Westchase-Gastroenterology`.
2. Change the App installation from **All repositories** to **Only select repositories**, selecting
   only `westchase-gi`.

The portal cannot prove the two-factor-authentication control. It reads the approved App permission
on every request and enables maintainer mutations when GitHub reports Administration write. Every
read and write token is independently pinned to the numeric ID of `westchase-gi`, so installation
scope does not withhold the staff interface and can be narrowed separately. If GitHub still shows
an updated-permission request, the owner must approve it before mutations can work.

## Trust model

No personal access token is ever wired into this portal. The sanctioned connection is the
clinic-owned GitHub App, and every GitHub request stays server-side. Installation tokens are
short-lived and minted only from the App credentials at request time.

The decided owner is a clinic-controlled **personal account**, not an organization. GitHub Apps
can be registered and installed on personal accounts, so an organization is not a prerequisite.

## GitHub connection

The deployment needs these server-only variables in Production. Verify integration changes
locally with the ignored credential store; do not copy the Administration-capable private key to
Preview or browser-visible configuration:

| Name | Value shape |
|---|---|
| `PORTAL_GITHUB_APP_ID` | GitHub App ID |
| `PORTAL_GITHUB_APP_INSTALLATION_ID` | Installation ID for the clinic account |
| `PORTAL_GITHUB_APP_PRIVATE_KEY` | PEM private key, either base64-encoded or with escaped newlines |

Set them through the Vercel environment store without placing values in shell history. Never
prefix one with `NEXT_PUBLIC_`. The provider in `src/lib/portal/integrations.ts` normalizes the
two supported private-key encodings, signs an RS256 App JWT, exchanges it for an installation
token, and reads the canonical repository through GitHub's server API.

After changing the variables, redeploy and verify:

1. Sign in as an active portal administrator and open `/admin/settings/software`.
2. Confirm the owner and current maintainers match the live repository. If Administration write is
   not approved, confirm the page names that exact owner action and renders no mutation controls.
3. After Administration write is active, use a controlled throwaway GitHub account to exercise
   invite, cancel, accept as a Write maintainer, and revoke. Confirm each final state on GitHub and
   in the portal, and confirm the Activity log records the administrator, target, and outcome.
4. Run `npm run build` and `node scripts/verify-no-secrets.mjs`.
5. Locally, run once without the three App variables and confirm the panel returns the safe **Not
   configured** state instead of failing the page. A partial or invalid local configuration must
   report **Connection unavailable** without exposing its input. Do not copy Production secrets
   into Preview just to exercise these states.

The ready-state controls have been seen in authenticated Production, but the full controlled
throwaway-account lifecycle in step 3 is not yet recorded complete. Keep that acceptance item open
until invite, cancel, accept, revoke, and Activity-log evidence all pass.

## Transfer and hosting deviations worth preserving

- The original plan assumed a GitHub organization. The accepted model is the clinic's personal
  account because it preserves GitHub branch protection and Vercel Hobby compatibility without
  organization-plan restrictions.
- The old Vercel project could not simply be relinked. On Hobby, a project cannot connect to a
  repository owned by a different GitHub account than the account linked to that Vercel login.
  The working path was a new clinic-owned project imported from the transferred repository,
  followed by environment and alias migration and deletion of the old project.
- The transfer acceptance criterion originally requested ASTXRTYS Admin access. The verified
  working state is Write access; do not expand it without a settings-level need.

## Hosting custody

The clinic-owned Vercel project is `westchase-gi`. The portal displays that application-owned
custody fact without a provider panel, token, deployment control, or configuration action. It
serves canonical `https://westchasegi.com`; `westchase-gi.vercel.app` remains an attached alias.
The repository's GitHub homepage metadata still points to retired
`new-westchase-gi.vercel.app` and must be corrected separately to the apex.

## Remaining integration acceptance

1. Complete the controlled maintainer invite/cancel/accept/revoke lifecycle and verify Activity
   log rows.
2. Complete the Production schema retirement/verifier and authenticated Website/review-flyer
   smoke described in `docs/PORTAL-OPS.md`.
3. Establish Resend team/account custody and run clinic-approved application-email canaries. The
   Resend domain and Production application `RESEND_FROM` are configured, but Supabase Auth's hosted
   SMTP sender is still the sandbox identity; change it before the arbitrary-clinic-inbox
   password-reset canary.
4. After the integrated flyer printer passes Production acceptance, verify and retire the
   standalone flyer deployment.
5. Record owner 2FA and repo-only App-installation scope only after the clinic owner verifies them;
   keep them classified as independent defense-in-depth controls rather than UI readiness gates.

## Do not

- Do not use a personal access token as a shortcut.
- Do not call GitHub from a client component or add a browser/server Vercel call without a
  commissioned workflow.
- Do not log JWTs, installation tokens, environment values, or private-key parsing errors that
  contain input.
- Do not claim the two owner-only controls are complete until the clinic account owner verifies
  them.
- Do not treat a code revert as a complete privilege rollback. Reverting disables the portal
  controls, but an approved Administration grant remains active until the clinic owner reduces the
  App permission or uninstalls the App.
