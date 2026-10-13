# Change management

The Security Rule has no standard named "change management". This policy is how the business
associate meets the standards that changes put at risk:

- risk management, [45 CFR 164.308(a)(1)(ii)(B)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(a)(1)(ii)(B)):
  a change must not raise a risk above the level the [risk analysis](../risk-analysis.md)
  accepts;
- protection from malicious software,
  [164.308(a)(5)(ii)(B)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(a)(5)(ii)(B));
- evaluation after environmental or operational changes,
  [164.308(a)(8)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(a)(8));
- integrity, [164.312(c)(1)](https://www.ecfr.gov/current/title-45/section-164.312#p-164.312(c)(1));
- documentation updates,
  [164.316(b)(2)(iii)](https://www.ecfr.gov/current/title-45/section-164.316#p-164.316(b)(2)(iii)).

The security official owns this policy.

## Scope

Every change to:

- application code, dependencies and the container image;
- database schema, functions, roles, grants and migrations;
- infrastructure: every AWS resource, DNS record, IAM role and policy, and key policy;
- configuration and secrets;
- the vendors and AWS services the system uses;
- the documents in this directory.

## Everything lives in the repository

- Infrastructure is Terraform in this repository. A fresh environment can be created from the
  repository alone, and nothing exists only in the AWS console (steps 2 to 4; INIT-1 "What done
  looks like").
- Terraform state is stored in S3, encrypted with a customer-managed KMS key, with S3 native
  locking (`use_lockfile`) (step 2).
- Drizzle owns the schema and migrations. The database functions and the double-booking guard
  stay as SQL migrations inside Drizzle's history (step 3).
- Secret values never enter the repository. Terraform creates empty secret containers; values are
  moved in without being displayed (steps 2 and 3).
- Drift found in AWS is fixed by a pull request that brings the repository and the account back
  into line, never by a console edit that leaves them apart.

## How a change reaches production

1. **Pull request.** Every change is a pull request. `main` is branch-protected: force pushes and
   branch deletion are blocked, and merging requires the required checks on the current head and
   resolved conversations.
2. **Checks on every pull request.** Today the required checks run the production build and type
   check, the local-only path guard, React Doctor, the public and staff-portal browser specs, and
   the database integration suite (migration lineage, schema and row-level security
   verification, trust-boundary tests). The author also runs lint and format locally, as
   `AGENTS.md` "Contribution loop" requires. From step 4 every pull request also runs lint, a
   migration dry run, a Terraform plan and a vulnerability scan of the dependencies and the
   container image. A failing required check blocks the merge.
3. **Review.** The security official, or a reviewer the security official names, reviews the
   change. A change that affects how ePHI is stored, sent, logged, accessed or deleted, adds an AWS
   service or a vendor, or changes sign-in, keys, network exposure or audit, updates this
   directory in the same pull request: the [risk register](../risk-analysis.md#risk-register),
   [vendors.md](../vendors.md) or [aws-hipaa-eligible-services.md](../aws-hipaa-eligible-services.md).
4. **Preview.** Each pull request gets a preview environment with fictional data: at most two at
   once, destroyed when the pull request merges or closes, sharing staging's load balancer and
   database server with a throwaway database each (step 4).
5. **Staging.** Merging to `main` deploys to staging automatically (step 4).
6. **Production.** A production deploy waits for the security official's approval in the
   protected GitHub `aws-production` environment. Migrations run as a pipeline step that stops the
   deploy on failure (step 4).
7. **Verification.** Production smoke tests run after each deploy (step 4).

Until step 4, merging to `main` deploys the Vercel production project automatically, and
production database migrations are applied separately after a production decision
(`CONTRIBUTING.md` "Shipping to production").

## Database migrations

- Migrations are reviewed SQL. Every new schema-changing migration ships with a rollback script
  (in place: `supabase/rollbacks/`).
- The pipeline dry-runs each migration on the pull request (step 4).
- Production migrations run as a one-off task inside the VPC, started by the pipeline after
  approval (step 4). They are never run from a workstation or an agent session.
- GitHub-hosted runners have no network path and no credential that can read production rows,
  because GitHub's terms do not allow PHI without its written consent
  ([vendors.md](../vendors.md#vendors)). Migration output in job logs carries no rows.

## Infrastructure changes

- Every pull request that touches Terraform shows its plan (step 4).
- Production state is applied only by the pipeline, after approval. No person or agent runs
  `terraform apply` against production state from a shell.
- Non-production state may be applied by the pipeline or by a workforce member working on
  staging or a preview.
- The repository's destructive-command guard asks for approval before an agent destroys
  infrastructure or deletes cloud resources or data ([access control](access-control.md#ai-coding-agents)).

## Dependencies and malicious software

- Installs use the committed lockfile.
- Dependabot opens update pull requests. A manifest-only update may merge through the guarded
  automatic lane in `CONTRIBUTING.md` "Automated dependency updates": the deterministic checks
  are authoritative, a read-only Codex review can veto, and a merge controller merges at most one
  update at a time. From step 4, a merged update reaches production only after the security
  official approves the deploy.
- The vulnerability scan runs on every pull request (step 4). GuardDuty watches the account for
  malicious activity (step 2); see [activity review](access-control.md#activity-review).
- GitHub Actions authenticate to AWS through OpenID Connect, with trust limited to this repository
  and, for production, to the protected environment (step 4).

## Emergency changes

When an active incident needs a fix faster than the normal review allows, the security official
may shorten the review. The fix still goes through a pull request, the pipeline and the
production approval. The incident record names the change and why the review was shortened, and
the change gets a full review afterwards. No emergency justifies a console edit or a shell apply
against production.

## Records

The pull request is the change record: the diff, the checks, the review and the merge. GitHub's
deployment history records each production approval (step 4). CloudTrail records what the
pipeline did in AWS (step 2). These records are kept for six years
([164.316(b)(2)(i)](https://www.ecfr.gov/current/title-45/section-164.316#p-164.316(b)(2)(i))).
