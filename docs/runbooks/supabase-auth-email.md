# Supabase Auth email and recovery

Load this runbook only for Supabase Auth SMTP, recovery-template, redirect, or password-flow
work. Application-owned portal email is a separate interface described in
[`ARCHITECTURE.md`](../../ARCHITECTURE.md#email).

## Configuration ownership

Supabase Auth owns password-recovery generation, rate limits, templates, and delivery through
hosted custom SMTP. These settings are project configuration, not migrations, so Development
and Production must be managed and verified separately.

For each project:

- configure the approved SMTP sender;
- set the Auth site URL to that environment's trusted portal origin; and
- allow the exact `/admin/auth/confirm` redirect without a wildcard.

Do not route recovery through the application's email adapter or add an Auth Send Email Hook
without an explicit architecture change.

## Manual recovery verification

Run this against Development by default. Production verification changes a real credential
and is an explicitly authorized maintenance action.

1. Use an active Development-only staff identity whose password may be changed. Do not use a
   patient address or copy a Production identity into Development.
2. Submit its address through `/admin/forgot-password`. The visible response must remain the
   same generic response shown for unknown or inactive addresses.
3. Confirm the delivered message has the approved sender and copy and links to the trusted
   origin. The bearer values must be in the URL fragment as `token_hash` and `type=recovery`,
   never in the query string.
4. Open the link and verify the confirmation page removes the fragment before the deliberate
   **Continue** action consumes the token. Never paste or capture the complete recovery link
   in logs, screenshots, issues, or PR text.
5. Complete password setup. Verify the new password signs in, the old password does not, and
   the staff role remains unchanged.
6. Verify the Activity record contains only the staff identity and operation metadata—no
   bearer link, password, or message content.
7. Restore or retire the Development test identity so later E2E runs retain their documented
   seed state.

Automated Auth/RLS coverage still runs as specified in
[`CONTRIBUTING.md`](../../CONTRIBUTING.md#verification); this manual check proves the hosted
template, SMTP, and redirect configuration that migrations cannot exercise.
