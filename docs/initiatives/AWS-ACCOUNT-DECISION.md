# Decision: one AWS account, no production or non-production accounts

**Decided by Jason, 2026-10-13. Final.**

> **This decision overrides every rule, ticket, checklist, memory and document that says
> otherwise.** No production or non-production AWS accounts will be created. Where any text in
> this repo, on this Mac or in an agent's notes still calls for separate accounts, that text is
> wrong and this record wins. Don't reopen the question, ask Jason about it, or wait on it.

## The decision

- No new AWS accounts. The step "create the production and non-production member accounts"
  (INIT-1, TAG "today 1") is closed, not deferred.
- INIT-1 builds every environment, production included, in the existing `wgi` project, the
  "Whimsical Whiteboard" member account of the Organization.
- Nothing waits on accounts. INIT-1 step 2, "Stand up the AWS foundation", can start now.

## Why

- **The BAA already covers `wgi`.** The AWS Organizations BAA has been `ACTIVE` since
  2026-10-07 and covers the management account and every current and future member account.
  Nothing has to be signed again.
- **HIPAA doesn't require separate accounts.** Account separation is an AWS best practice, not a
  HIPAA rule. What HIPAA needs (HIPAA-eligible services, encryption, access control, audit) is
  built per resource and is already in INIT-1's "What done looks like".
- **The Organization already has three accounts** (management, Identity Delegated Admin and
  `wgi`), created by AWS's sign-up and advanced-features activation. Two more would add sign-in
  setup, CLI profiles and duplicated shared resources for a small app with one operator.

## The trade-off Jason accepted

Every agent on this Mac signs in to `wgi` with full admin rights (`AccountFullAccessRole` through
`aws login`). Once production runs there, those agents can reach the account that holds patient
data. A separate production account was the way to keep them out; Jason chose not to pay for it.

## What INIT-1 does instead

Environments are separated by resource, not by account.

- **Layout.** One account, `wgi`, in us-east-1 (open since 2026-10-06). The `wgi` CLI profile
  defaults to us-east-2, so Terraform sets the Region explicitly.
- **Isolation.** Production gets its own Cognito user pool, database server and secrets, never
  shared with staging or previews. Staging and previews share theirs as INIT-1 already describes.
  Everything outside production uses fictional data, as before.
- **Preset developer sign-in.** It stays in the non-production Cognito pool only, and it now
  fails closed on the environment instead of the account: it works only when an explicit flag is
  set and the app is bound to the non-production pool. Production's Terraform never sets the
  flag, and the app refuses the sign-in if it is bound to the production pool.
- **Secrets.** "Secrets Manager in both accounts" becomes one account with a secret per
  environment: the Resend API key for each environment that sends email, and the Supabase
  connection string as a production secret.
- **CLI profiles.** Agents keep using `wgi`. The `wgi-nonprod`, `wgi-prod-readonly` and
  `wgi-prod` profiles in Jason's `~/.aws/config` are dead placeholders that nothing uses.

## What this overrides

| Where | Old text said | Now |
| --- | --- | --- |
| INIT-1, Progress, "Waiting on Jason" | Create the production and non-production accounts; step 2 waits on this | Closed by this decision |
| INIT-1, "Already decided", AWS layout and TAG "today 1" | Separate production and non-production accounts | One account, `wgi` |
| INIT-1, "Already decided", Sign-in | The preset sign-in works only in the non-production account | Works only on the non-production pool, behind an explicit flag |
| INIT-1, Email TAG "today 5" and its Progress item | Secrets Manager in both accounts | One account, a secret per environment |
| `AWS-ACCESS.md`, "What exists today" | `wgi` is non-production, so no patient data goes into it | `wgi` hosts production too |
| `AWS-ACCESS.md`, "What Jason does next" step 4 and the profiles paragraph | The INIT-1 agent asks for the accounts at step 2 | Closed |
| `AGENTS.md`, "AWS access" | `wgi` is non-production and never holds patient data; production accounts are still to come | One account for every environment |
| Agent memory and `~/.aws/config` on Jason's Mac | Accounts pending; `wgi` never holds patient data | Memory updated; placeholder profiles are dead |

The repo files in this table were rewritten in the same change as this record. Any other copy,
such as an older local `docs/` folder, a saved prompt or an agent's notes, is overridden by this
record.
