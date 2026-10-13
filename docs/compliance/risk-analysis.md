# Risk analysis and risk management plan

Satisfies [45 CFR 164.308(a)(1)(ii)(A)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(a)(1)(ii)(A))
(Risk analysis, Required) and
[164.308(a)(1)(ii)(B)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(a)(1)(ii)(B))
(Risk management, Required) for the Westchase GI website and staff portal.

The method follows HHS's
[Guidance on Risk Analysis](https://www.hhs.gov/hipaa/for-professionals/security/guidance/guidance-risk-analysis/index.html):
scope, data collection, threats and vulnerabilities, current security measures, likelihood,
impact, risk level, documentation and periodic review. Security measures are chosen with the
flexibility factors in
[164.306(b)(2)](https://www.ecfr.gov/current/title-45/section-164.306#p-164.306(b)(2)): the
business associate is a small operator with one security official, the system is one web
application with one database, and the cost of each measure is weighed against the probability
and criticality of the risk.

## Scope

All ePHI the system creates, receives, maintains or transmits for the covered entity, in every
location it passes through: patient and staff browsers up to the network edge, the application,
the database and its backups, logs, email, the CI/CD pipeline, the AWS account, the transition
vendors (Supabase and Vercel) until they are decommissioned, and the workstations used to build
and operate the system. [README.md](README.md#parties-and-scope) defines the parties.

## Assets that hold or carry ePHI

The intake form asks patients not to send medical details, but a name and phone number tied to a
request for gastroenterology care is PHI, and the free-text message can contain anything. Every
asset below is treated as holding ePHI unless it says otherwise.

| Asset | ePHI it holds | Where it runs | Notes |
| --- | --- | --- | --- |
| Appointment requests (`public.requests`) | Name (up to 120 characters), phone (32), optional email (254), location, preferred time, message (2000), locale, source path | Production database | Created by the public intake API (`src/lib/portal/contracts.ts`, `src/lib/portal/intake.ts`) |
| Request history (`request_events`, `request_transitions`) | Staff notes, workflow history | Production database | Notes follow the parent request's retention |
| Patients and revisions (`patients`, `patient_revisions`, `patient_request_links`) | Patient identity and contact details | Production database | |
| Appointments and scheduling history (`appointments`, `scheduling_changes`) | Who is booked when, with which provider | Production database | |
| Clinical records and revisions (`patient_clinical_records`, `patient_clinical_revisions`) | Clinical notes, when used | Production database | Optional feature |
| Billing ledger (`patient_billing_accounts`, `patient_billing_entries`) | Balances and entries | Production database | Removal is deferred in INIT-1 step 1 |
| Command receipts (`*_command_receipts`, `staff_request_receipts`) | Identifiers and outcomes | Production database | Replay protection |
| `audit_log` | Metadata only: identifiers, staff identity, state changes, counts | Production database | Must never hold patient names, contact details or intake text (ARCHITECTURE.md, "Patient-request data lifecycle") |
| Access log (new) | Which staff member viewed which patient, request or appointment | Production database | INIT-1 step 3 (data-layer step 2c) |
| Database backups and snapshots | Everything in the database | RDS automated backups in the `wgi` account | INIT-1 step 3 |
| Cut-over copy and final export | Everything in the database | AWS only | INIT-1 steps 5 and 6 |
| Printed request packets | Full request records | Clinic printers and paper | The covered entity's physical safeguards; the print writes an audit row before rendering |
| Application logs | Identifiers and error codes only | CloudWatch Logs | Must hold no patient detail |
| Staff identities | Staff names, emails, roles; not PHI | Cognito production user pool | INIT-1 step 3; 10 production staff accounts are recreated |
| Patient-site analytics (`private.analytics_daily`) | None: allowlisted event, route template, locale and device class counts | Production database | |
| Transition: Supabase Production project | Everything in the database today | Supabase | No BAA (see R-01) |
| Transition: Vercel Production deployment | Request bodies in transit through its functions | Vercel | No BAA (see R-01) |

## ePHI flows

| # | Flow | Path | Protection |
| --- | --- | --- | --- |
| F1 | Patient submits an appointment request | Patient browser → Route 53 → WAF → load balancer → ECS Fargate task → RDS | HTTPS with HSTS (step 4); WAF (step 4); private RDS with TLS (step 3); honeypot field and HMAC-keyed IP throttle (in place) |
| F2 | Staff work requests, patients and appointments | Staff browser → WAF → load balancer → ECS task → RDS | Cognito with MFA (step 3); server-owned roles (in place); access log (step 3); private, `no-store` caching and `Referrer-Policy: no-referrer` on authenticated portal responses (in place, `src/proxy.ts`) |
| F3 | New-request alert | ECS task → Resend → staff inbox | Fixed text plus the `/admin` URL; no patient field or request link (in place) |
| F4 | Sign-in emails (reset codes, temporary passwords) | Cognito → custom email sender Lambda → Resend → staff inbox | Credentials, not PHI; Cognito encrypts the code with a KMS key before the Lambda sees it (step 3) |
| F5 | Backups | RDS → automated backups and snapshots | Encrypted with the database's KMS customer-managed key (step 3) |
| F6 | Logs | ECS task and Lambda → CloudWatch Logs | Identifiers and codes only; log group encrypted with a customer-managed key (steps 2 to 4) |
| F7 | Audit trail of AWS activity | AWS APIs → CloudTrail → S3 | API metadata, no ePHI; customer-managed key (step 2) |
| F8 | Deploys and migrations | GitHub Actions → OIDC → AWS; migrations run as a task inside the VPC | No ePHI leaves AWS: runners get no network path or credential to read production rows (step 4) |
| F9 | Cut-over copy | Supabase → RDS, once | TLS; run from inside AWS; row counts and checksums compared (step 5) |
| F10 | Print packet | Staff browser → printer | Read-only route; audit row written before patient detail renders (in place) |
| F11 | Transition: today's path | Patient and staff browsers → Vercel → Supabase | TLS; no BAA (R-01) |

## Rating method

- **Likelihood:** Low (1), not expected within a year with the controls named; Medium (2), could
  happen within a year; High (3), expected within a year or already the case.
- **Impact:** Low (1), no ePHI exposed and under a day of disruption; Medium (2), a small number
  of records exposed or altered, or a business day of disruption; High (3), many records exposed
  or lost, or an event that requires breach notification.
- **Risk level** is likelihood times impact: 1 to 2 Low, 3 to 4 Medium, 6 to 9 High. A residual
  Low risk is within tolerance. A residual Medium or High risk needs a recorded decision by the
  security official.
- **Current** rates the risk with the controls in place today. For a risk that only arises in
  the AWS setup (for example R-02 and R-20), it rates that setup without the controls its INIT-1
  steps add. **Residual** rates the risk once the named INIT-1 step and the policies in this
  record are in effect.

## Risk register

| ID | Threat and vulnerability | Current (L × I) | Controls (in place, or the INIT-1 step that delivers them) | Residual (L × I) | Treatment |
| --- | --- | --- | --- | --- | --- |
| R-01 | ePHI is stored on Supabase and processed by Vercel, neither of which has a BAA with the business associate ([164.502(e)](https://www.ecfr.gov/current/title-45/section-164.502#p-164.502(e)), [164.308(b)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(b))) | High (3 × 3) | Steps 2 to 5 move all ePHI into the BAA-covered `wgi` account; step 6 stores a final encrypted export in AWS and then deletes the Supabase and Vercel projects. The Vercel project kept for the printed review flyers serves only a redirect with no app code and no patient data | Low (1 × 1) after step 6 | Mitigate. **Legal review:** whether the period of storage without a BAA requires a breach risk assessment under [164.402](https://www.ecfr.gov/current/title-45/section-164.402) |
| R-02 | Every AI coding agent signed in to `wgi` has administrator rights over the account that holds production ePHI; a mistaken or manipulated agent could read, change or delete production data or weaken controls | High (2 × 3) | Production changes ship only through the GitHub Actions pipeline after the security official's approval in the protected `aws-production` environment (step 4; [change management](policies/change-management.md); R-24 covers the threats to that approval). Agents never read production patient data and never retrieve secret values ([access control](policies/access-control.md#ai-coding-agents)). The repository's destructive-command guard stops for approval before infrastructure destruction, AWS or database deletes and history rewrites. The production database is private (step 3). CloudTrail records every API call and GuardDuty alerts on anomalous use (step 2). No IAM users or long-lived keys exist; sign-in is short-lived `aws login` credentials | Medium (1 × 3) | **Accept** at Medium. The security official accepted this trade-off for the one-account layout (owner decision, 2026-10-13). The controls are procedural; IAM does not technically stop an agent. Revisit at each evaluation, and before the eCW connection (INIT-2) adds clinical data |
| R-03 | The preset developer sign-in lets anyone with the non-production credential sign in as a seeded staff member. Today's preview sign-in is off only where `VERCEL_ENV` is `"production"` (`src/app/admin/actions.ts`, `src/app/admin/login/page.tsx`). AWS never sets `VERCEL_ENV`, so the check fails open in any AWS task that receives the `PORTAL_PREVIEW_*` variables | Medium (1 × 3) | Planned (step 3, branch `init-1/dev-sign-in-fail-closed`): a fail-closed check replaces the `VERCEL_ENV` test. Off Vercel it needs `PORTAL_DEV_SIGN_IN=enabled`, and `APP_ENV=production` turns it off whatever else is set. The seeded user exists only in the non-production Cognito user pool; production's pool has no such user and production never sets the flag. Non-production holds fictional data only, which is not PHI ([160.103](https://www.ecfr.gov/current/title-45/section-160.103)), and the Security Rule's authentication requirements apply to systems that maintain ePHI ([164.302](https://www.ecfr.gov/current/title-45/section-164.302), [164.312](https://www.ecfr.gov/current/title-45/section-164.312)) | Low (1 × 1) once the explicit flag replaces the `VERCEL_ENV` check | Mitigate, then accept at Low, conditional on R-04's controls. If real data ever reached non-production, this sign-in would become a High risk and must be removed first |
| R-04 | Production ePHI reaches staging, a preview or a developer machine through a data copy, a debugging session or a misdirected test | High (2 × 3) | Production and non-production have separate database servers, user pools and secrets (steps 2 and 3). Demo and test data come only from the fictional generator (`npm run demo:data`). The e2e target guard refuses the production database (in place; rewritten for RDS in step 3). No production credential exists in non-production or on workstations | Medium (1 × 3) | Mitigate |
| R-05 | A staff password is phished, guessed or reused, giving an attacker portal access to ePHI | High (2 × 3) | Two-step login with an authenticator app or passkey for every staff account; per-account throttling and lockout; sessions end after 8 hours idle and 24 hours absolute; deactivation applies on the next request (step 3). WAF rate rules (step 4). Authorization comes from `staff_profiles`, never from the token (in place) | Medium (1 × 3) | Mitigate |
| R-06 | A web vulnerability (injection, cross-site scripting, request forgery, broken object-level authorization) exposes or alters ePHI | High (2 × 3) | Every protected interface calls `requireRole`; database access is server-only; every HTTP boundary decodes input with its contract; database functions run with an empty search path (in place). Content-Security-Policy, `frame-ancestors 'none'`, HSTS and a strict referrer policy on every response; WAF managed rules; a vulnerability scan on every PR (step 4) | Medium (1 × 3) | Mitigate |
| R-07 | The database is reachable from the internet and attacked directly | High (2 × 3) | RDS in private subnets with no public endpoint; its security group admits only the application tasks; TLS with server-certificate verification (`verify-full` against the RDS CA bundle; step 3) | Medium (1 × 3). Until INIT-1 step 3 (data-layer step 2c), the application's database privilege ceiling is `postgres` or `service_role`, both of which bypass row-level security. No policies exist, so this grants no access today, but nothing in the database narrows it | Mitigate |
| R-08 | A secret leaks (database credential, HMAC key, Resend key, GitHub App key) through code, logs, CI output or an agent transcript | High (2 × 3) | Secrets live in Secrets Manager under a customer-managed key, and Terraform creates empty containers whose values are moved in without being displayed (steps 2 and 3). Agents never call `get-secret-value` or `batch-get-secret-value`. The service-role key that today doubles as four HMAC secrets is replaced by a dedicated secret for each use (step 3). `scripts/verify-no-secrets.mjs` scans the repository (in place; extended to AWS shapes in step 3). GitHub App keys are production-only (in place) | Low (1 × 2) | Mitigate |
| R-09 | Patient details leak into logs, error reports, URLs, emails, analytics or GitHub. On AWS the paths are query parameters and `detail` in Drizzle and `pg` errors; ALB access logs (the full URL and client IP, encrypted with SSE-S3 only); WAF logs (cookies and headers unless redacted); the RDS log groups; the print route's request `ids` in `searchParams`; and Cognito sign-in emails | Medium (2 × 2) | The trust boundary forbids patient fields in emails, URLs, logs, audit metadata, analytics, GitHub and provider diagnostics; logs carry identifiers and codes; email logs exclude recipients and content; telemetry accepts allowlisted values only (in place). Database errors are scrubbed of parameters and `detail` before they leave the server; an RDS parameter group keeps errors terse and does not log statement parameters; WAF, ALB and Lambda logs are redacted (steps 3 and 4; red-team gates G2.4, G2.11 and G4.9 to G4.11). A written review and a log sample prove it before cut-over (INIT-1 "What done looks like"; step 4) | Low (1 × 2) | Mitigate |
| R-10 | ePHI reaches a vendor without a BAA (Resend, GitHub, OpenAI, an AI coding agent's provider) | High (2 × 3) | Resend carries only PHI-free email (F3, F4). GitHub's terms forbid PHI without its written consent ([GitHub DPA §12.B](https://github.com/customer-terms/github-data-protection-agreement)), so runners have no network path or credential to production rows, migrations run inside the VPC, and their logs carry no rows (step 4). Agents never read production patient data. Issues, PRs and commits carry no patient data ([vendors.md](vendors.md)) | Medium (1 × 3) | Mitigate |
| R-11 | Data is lost or corrupted by a bad migration, an accidental delete, a compromised credential or ransomware | High (2 × 3) | Automated backups with point-in-time recovery, deletion protection and encryption (step 3). Migrations get a dry run on every PR and run as a pipeline step that stops on failure (step 4); every new schema-changing migration ships with a rollback script in `supabase/rollbacks/` (in place). Version checks, idempotency keys and exclusion constraints in the database (in place). A restore is rehearsed before cut-over ([contingency plan](policies/contingency-plan.md)) | Medium (1 × 3) | Mitigate |
| R-12 | The portal is unavailable (Availability Zone failure on the single-AZ database, a failed deploy, a DNS or certificate error) | Medium (2 × 2) | CloudWatch alarms on error rate, 5xx, latency and database health reach the security official through SNS (step 4). Point-in-time restore can create a new instance in another zone. The clinic's phones and its own scheduling system are the emergency mode ([contingency plan](policies/contingency-plan.md#emergency-mode-operation-plan)) | Medium (2 × 2) | Accept. Multi-AZ can be switched on later (INIT-1 "Already decided") |
| R-13 | Intake abuse: spam, flooding or rate-limit evasion by forging `X-Forwarded-For` behind the load balancer | Medium (2 × 2) | Honeypot `company` field and an HMAC-keyed IP throttle of 5 requests per 600 seconds (in place). Behind an ALB the first `X-Forwarded-For` entry is client-supplied, so the application must read the entry the load balancer appended (step 4). WAF rate-based rules (step 4) | Low (1 × 2) | Mitigate |
| R-14 | A staff member views or changes records without a work reason | Medium (2 × 2) | Role-based portal access (in place). Every view of a patient, request or appointment writes an append-only access row naming the staff member, and app roles cannot update or delete audit or access rows (step 3). Activity review ([access control](policies/access-control.md#activity-review)) | Low (1 × 2) | Mitigate; sanctions for staff are the covered entity's |
| R-15 | An operator workstation is lost, stolen or infected, exposing AWS sessions, GitHub credentials or the agent environment | High (2 × 3) | [Workstation security](policies/workstation-security.md): full-disk encryption, screen lock, updates, malware protection, firewall, phishing-resistant MFA on vendor consoles, no ePHI at rest on workstations. AWS credentials are short-lived; there are no IAM users or access keys | Medium (1 × 3) | Mitigate |
| R-16 | A compromised dependency, GitHub Action or base image runs code in the application or the pipeline | High (2 × 3) | Lockfile installs; Dependabot update PRs reviewed before merge; a vulnerability scan of code and image on every PR; OIDC trust scoped to this repository and environment; production deploys need approval (step 4) | Medium (2 × 2) | Mitigate |
| R-17 | Audit evidence is altered or lost, so misuse cannot be shown | Medium (2 × 2) | Append-only grants on audit and access rows (step 3); CloudTrail with log file validation to encrypted S3 (step 2); audit rows kept 6 years unless under legal hold (in place) | Low (1 × 2) | Mitigate |
| R-18 | The AWS account itself is compromised (root or administrator sign-in) | Medium (1 × 3) | Root uses a password plus a passkey and has no access keys; no IAM users or keys; the Organization's Region policy allows only us-east-1 and us-east-2 (us-west-2 for Bedrock only); GuardDuty and CloudTrail (step 2) | Medium (1 × 3) | Mitigate |
| R-19 | ePHI is kept longer than the retention policy because the lifecycle scheduler is off | Medium (3 × 1) | Retention rules and the lifecycle function exist (in place). Terraform creates the EventBridge Scheduler schedule disabled (step 4); it starts when the security official authorizes activation | Low (1 × 1) after activation | Mitigate; activation is the security official's decision |
| R-20 | A KMS customer-managed key is deleted or disabled, making the database, backups or logs unreadable | Medium (1 × 3) | KMS enforces a waiting period before key deletion; key policies limit administration; the destructive-command guard stops for approval before AWS deletes; CloudTrail records key use (step 2) | Medium (1 × 3) | Mitigate |
| R-21 | A database export (`pg_dump`) or copy is left on a laptop, in email or in an unencrypted bucket | High (2 × 3) | Exports go only to encrypted AWS storage under a customer-managed key, are listed in the export register and are deleted when their purpose ends ([contingency plan](policies/contingency-plan.md#exports)) | Medium (1 × 3) | Mitigate |
| R-22 | A sign-in email (reset code or temporary password) sent through Resend is intercepted | Low (1 × 2) | Codes are short-lived; two-step login still protects the account (step 3); no PHI in the email | Low (1 × 1) | Accept |
| R-23 | No signed BAA between FDHS (covered entity) and the business associate, while ePHI already sits with subcontractors (Supabase and Vercel have no BAA) ([164.502(a)(3)](https://www.ecfr.gov/current/title-45/section-164.502#p-164.502(a)(3)), [164.504(e)](https://www.ecfr.gov/current/title-45/section-164.504#p-164.504(e)), [164.308(b)(1)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(b)(1)), [164.314(a)(2)](https://www.ecfr.gov/current/title-45/section-164.314#p-164.314(a)(2))) | High (3 × 3) | Sign the FDHS BAA ([baa-template.md](baa-template.md)) before the cut-over, and confirm that the legal entity that accepted the AWS BAA is the one signing with FDHS. Owner: the security official (Jason). Gate: the cut-over go/no-go (red-team gate G5; [risk management plan](#risk-management-plan) item 2) | Low (1 × 1) once signed | Mitigate. Real patient data does not move to AWS until the BAA is signed |
| R-24 | An agent holding the production reviewer's token, or an admin token, approves the protected deploy through the REST "review pending deployments" endpoint, or an admin bypasses protection. That approval is R-02's main control | High (2 × 3) | In place (2026-10-13): the `aws-production` environment requires a reviewer, prevents self-review, sets `can_admins_bypass: false` and deploys only from `portal/appointment-workflow-experience`, whose branch protection requires `quality`, `react-doctor`, `supabase-integration` and `Vercel` on an up-to-date head and applies to admins. Step 4: a reviewer identity whose credentials no agent holds; no owner or admin token in agent keyrings; Vercel's `Preview` and `Production` environments deleted or protected | Medium (1 × 3) | Mitigate. The residual is part of R-02's accepted risk: a bypassed approval leads to the same production harm |

## Risk management plan

1. **Implement the controls by INIT-1 step.** The security official tracks each control above to
   the step that delivers it, and the step's PR proves it with evidence, as INIT-1 "What done
   looks like" requires.
2. **Gate the cut-over on the controls.** Real patient data moves to AWS (step 5) only after
   steps 2 to 4 have landed, which is INIT-1's go/no-go condition, and after the FDHS BAA is
   signed (R-23). Every control this register assigns to those steps is therefore in place and
   proven first, and the restore rehearsal is written up. The security official re-runs this
   analysis as part of the go/no-go.
3. **Close R-01** by finishing step 6: a final encrypted export stored in AWS, then deletion of
   the Supabase and Vercel projects, recorded in [vendors.md](vendors.md).
4. **Decide every residual risk that is not Low.** R-02 and R-12 rest on owner decisions already
   made: the one-account layout (2026-10-13) and the single-zone database (INIT-1 "Already
   decided"). R-24's residual is part of R-02's. The other residual Medium risks are put to the security official at the
   pre-cut-over evaluation, and the decision is recorded in this file. Residual Low risks are
   within tolerance; R-03 also rests on the developer sign-in decision in INIT-1.
5. **Review** this register at every [periodic evaluation](security-official.md#periodic-evaluation)
   and after every incident. A change in likelihood, impact or controls is a change to this file.
