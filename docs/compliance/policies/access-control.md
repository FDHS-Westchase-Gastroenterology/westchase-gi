# Access control

Satisfies, for the Westchase GI website and staff portal:

- [45 CFR 164.308(a)(1)(ii)(C)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(a)(1)(ii)(C))
  sanction policy and
  [(a)(1)(ii)(D)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(a)(1)(ii)(D))
  information system activity review;
- [164.308(a)(3)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(a)(3))
  workforce security;
- [164.308(a)(4)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(a)(4))
  information access management;
- [164.308(a)(5)(ii)(C)–(D)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(a)(5)(ii)(C))
  log-in monitoring and password management;
- [164.312(a)](https://www.ecfr.gov/current/title-45/section-164.312#p-164.312(a)(1)) access
  control, [164.312(b)](https://www.ecfr.gov/current/title-45/section-164.312#p-164.312(b)) audit
  controls and [164.312(d)](https://www.ecfr.gov/current/title-45/section-164.312#p-164.312(d))
  person or entity authentication.

The security official owns this policy. Where a control is not built yet, the INIT-1 step that
delivers it is named.

## Principles

- Every person has their own identity. Nothing that reaches ePHI is shared.
- Access is the least a role needs. Staff reach ePHI through the portal; the system reaches it
  through the application's own database role. No person or agent reads production rows from a
  shell as routine work; that is an emergency action under
  [Emergency access procedure](#emergency-access-procedure).
- Authorization is decided on the server for every request, never by the browser, a token claim
  or user-editable metadata.
- Every grant, change and removal of access is recorded.

## Who has access

| Who | What they reach | How they authenticate | Who authorizes |
| --- | --- | --- | --- |
| Clinic staff (the covered entity's workforce) | The `/admin` portal, with the `staff` or `admin` role | Today: Supabase Auth password. Target: the production Cognito user pool with two-step login (step 3) | The Practice Manager asks; a portal admin invites |
| Business associate workforce (the security official) | The AWS `wgi` account, the GitHub repository, the vendor consoles in [vendors.md](../vendors.md) and approval of production deploys | `aws login` to AWS; MFA on GitHub and every vendor console | The security official, recorded in the access register |
| AI coding agents | Non-production resources and the repository, under the session of the workforce member who runs them | That member's session; agents have no identity or standing credential of their own | The workforce member running the agent ([AI coding agents](#ai-coding-agents)) |
| The CI/CD pipeline (GitHub Actions) | Deploys, migrations and Terraform plans; production only from the protected `aws-production` environment | OpenID Connect to an IAM role, no stored keys (step 4) | The security official approves each production deploy (step 4) |
| The application | Production database through a least-privilege app role; its own secrets | ECS task role; database credentials from Secrets Manager (step 3) | Terraform, reviewed through [change management](change-management.md) |
| The AWS root user | Everything in the account | Password plus a passkey; no access keys | Emergency use only ([Emergency access procedure](#emergency-access-procedure)) |

## Workforce security

**Authorization and supervision** (164.308(a)(3)(ii)(A), addressable, implemented).

- The security official authorizes every business associate workforce member's access to AWS,
  GitHub, the vendor consoles and production, and records the person, the access, the reason
  and the date in the access register. The register is kept outside this repository because it
  holds identities and account details.
- A workforce member other than the security official changes code, schema and infrastructure
  only through pull requests that the security official reviews
  ([change management](change-management.md)).

**Workforce clearance** (164.308(a)(3)(ii)(B), addressable, implemented).

- Before granting access that could reach production ePHI, the security official confirms the
  person's identity and need, and has the person read this directory and agree in writing to
  keep PHI confidential and follow these policies
  ([training](../security-official.md#security-awareness-and-training)).
- Clinic staff are cleared by the covered entity. The portal grants a clinic account only at the
  Practice Manager's request.

## Access authorization

Access authorization and access establishment and modification
(164.308(a)(4)(ii)(B)–(C), addressable, implemented), and access control (164.312(a)(1)).

- **Portal.** Two roles exist, `staff` and `admin` (`STAFF_ROLES` in
  `src/lib/portal/contracts.ts`). `staff_profiles` is the source of role and active state; every
  protected page, route handler and Server Action calls `requireRole`
  (`src/lib/portal/auth.ts`), which reads the profile on the server (in place). Admins also
  manage staff, settings and the technical activity record.
- **Granting portal access.** A portal admin invites the staff member from Settings at the
  Practice Manager's request, choosing the role. Role changes and deactivation are admin actions
  that write metadata-only audit rows (in place). From step 3 the invitation creates the user in
  the production Cognito pool together with the `staff_profiles` row.
- **Database.** Three roles replace Supabase's built-in ones: a migration owner, a
  least-privilege app role and a read-only reporting role. The app role cannot update or delete
  audit or access rows (step 3). The database accepts connections only from inside the VPC
  (step 3).
- **AWS.** People sign in with `aws login`; there are no IAM users and no access keys. Every
  workforce or agent session signed in to `wgi` has administrator rights. That is risk R-02 in
  the [risk analysis](../risk-analysis.md#risk-register), accepted by the security official with
  the compensating controls listed there.
- **Production changes.** Production infrastructure, schema and code change only through the
  GitHub Actions pipeline after the security official approves the deploy in the protected
  `aws-production` environment (step 4). No one runs `terraform apply` against production state, or
  writes to the production user pool, database or hosting, from a shell.
- **Secrets.** Production secrets are readable by the production application and pipeline roles.
  No person or agent retrieves a secret value; values are moved into Secrets Manager without being
  displayed (steps 2 and 3).
- **Non-production.** Staging and previews hold fictional data only and have their own user pool,
  database server and secrets (steps 2 to 4). Production credentials never exist outside
  production.

## Unique user identification

164.312(a)(2)(i), required.

- Each clinic staff member has their own portal account (in place), moving to their own
  Cognito user in the production pool (step 3). Shared or role accounts are not created.
- The shared preview sign-in (`src/app/admin/actions.ts`) fails closed
  (`src/lib/portal/dev-sign-in.ts`): `APP_ENV=production` or `VERCEL_ENV=production` turns it off,
  and off Vercel Preview and Development it needs `PORTAL_DEV_SIGN_IN=enabled`. Step 3 moves it to
  a preset developer sign-in that exists only in the non-production user pool; production's pool
  never has it (risk R-03).
- Each workforce member signs in to AWS, GitHub and vendor consoles as themselves. An agent acts
  under the session of the person running it, so CloudTrail attributes its actions to that
  person.

## Authentication

Person or entity authentication (164.312(d)) and password management (164.308(a)(5)(ii)(D),
addressable, implemented).

- **Staff.** Every staff account requires two-step login with an authenticator app or a passkey,
  and the user pool applies per-account throttling and lockout (step 3). The Cognito password
  policy is set in Terraform (step 3). Until step 3, staff sign in with a Supabase Auth password
  only (risk R-05).
- **Sign-in emails.** Reset codes and temporary passwords reach staff through Cognito's custom
  email sender Lambda and Resend; they carry no PHI (step 3).
- **Workforce.** The AWS root user has a password plus a passkey and no access keys. Every human
  sign-in to AWS, GitHub and the vendor consoles uses MFA, phishing-resistant where the service
  offers it.
- **Machines.** The pipeline authenticates to AWS with OpenID Connect and short-lived credentials
  (step 4). The application authenticates to the database with credentials from Secrets Manager
  over TLS with server-certificate verification (`verify-full` against the RDS CA bundle;
  step 3).
- **Passwords.** Each password is unique to its service, kept in a password manager, never shared
  and never written into the repository, an issue, a pull request or a chat with an agent.

## Sessions and automatic logoff

164.312(a)(2)(iii), addressable, implemented.

- Portal sessions end after 8 hours idle and 24 hours absolute, and the portal locks the screen
  after inactivity (step 3).
- Deactivation applies on the next request. `requireRole` already reads active state on every
  protected request (in place); step 3 keeps that with Cognito and also disables the user in the
  pool. Invite and recovery links already refuse deactivated staff (in place).
- End-to-end tests cover session limits, lockout and deactivation (step 3, INIT-1 "What done looks
  like").
- Workstations lock after inactivity ([workstation security](workstation-security.md#workstation-security)).

## Termination

Termination procedures (164.308(a)(3)(ii)(C), addressable, implemented).

- **Clinic staff.** The Practice Manager tells a portal admin or the security official when a
  staff member leaves or changes duties. An admin deactivates the account in Settings the same
  day; access ends on the next request.
- **Business associate workforce.** On the last day, the security official removes the person's
  AWS sign-in, GitHub access, vendor console accounts and shared password-manager items, confirms
  no access keys or tokens exist for them, and records the removal in the access register. Any
  credential the person could have seen is rotated.
- **Agents.** An agent's access ends with the session that runs it. Agents hold no standing
  credentials to revoke.

## AI coding agents

AI coding agents (Claude Code, Codex and similar) are tools operated by a workforce member, who
answers for what the agent does. Their providers have no BAA with the business associate
([vendors.md](../vendors.md#vendors)), so nothing an agent reads may contain ePHI.

Agents:

- work in non-production environments, on fictional data, and never read production patient
  data;
- never retrieve secret values (`get-secret-value` and `batch-get-secret-value` are forbidden;
  `.claude/rules/aws-agent-rules.md` "Secret Safety");
- never put PHI, AWS account IDs, IAM Identity Center identifiers or secret values into the
  repository, issues, pull requests or comments;
- change production only by opening a pull request that the pipeline deploys after the security
  official's approval;
- stop when the repository's destructive-command guard (`.claude/hooks/guard-destructive.sh`,
  wired in `.claude/settings.json`) asks for approval before destroying infrastructure, deleting
  cloud resources or data, or rewriting `main`, and never route around it with another tool or a
  split command.

These are procedural controls: IAM does not stop an administrator session. CloudTrail records
every call an agent makes under the operator's identity, and GuardDuty flags anomalous use
(step 2). The residual risk is R-02.

## Emergency access procedure

164.312(a)(2)(ii), required.

- **The clinic keeps working without the portal.** The front desk takes calls and schedules in
  the clinic's own system ([emergency mode](contingency-plan.md#emergency-mode-operation-plan)).
- **Reading ePHI in an emergency.** When the portal cannot serve a record that the clinic needs
  for patient care, the security official signs in to AWS as himself and reads the record from
  inside the VPC (for example, through a one-off task in the production cluster), or restores the
  database ([disaster recovery](contingency-plan.md#disaster-recovery-plan)). The data stays in
  AWS, CloudTrail records the access, and the security official writes it up in the incident
  record afterwards.
- **Root.** The root user is the last resort when no administrator sign-in works. Every root
  sign-in is reviewed afterwards.
- **Gap.** The security official is the only person with AWS administrator access. Until a second
  person is authorized and recorded in the access register, emergency access to AWS depends on
  him; the clinic's emergency mode does not.

## Audit controls

164.312(b), required.

| Record | What it captures | Where | Status |
| --- | --- | --- | --- |
| `audit_log` | Every staff-initiated state change and external operation: identifiers, staff identity, state changes and counts, never patient text; kept six years unless a legal hold applies | Production database | In place |
| Access log | Every view of a patient, request or appointment, naming the staff member | Production database | Step 3 |
| Append-only grants | App roles cannot update or delete audit or access rows | Production database | Step 3 |
| CloudTrail | Every AWS API call, including Cognito user pool sign-in actions ([Cognito CloudTrail logging](https://docs.aws.amazon.com/cognito/latest/developerguide/logging-using-cloudtrail.html)); log file validation; encrypted S3 under a customer-managed key | `wgi` account | Step 2 (Cognito events from step 3) |
| GuardDuty | Findings on anomalous account, network and credential activity | `wgi` account | Step 2 |
| Application logs | Request identifiers and error codes, never patient detail | CloudWatch Logs, customer-managed key | Step 4 |

## Activity review

Information system activity review (164.308(a)(1)(ii)(D), required) and log-in monitoring
(164.308(a)(5)(ii)(C), addressable, implemented).

- **As it happens.** GuardDuty findings and CloudWatch alarms reach the security official by email
  through the SNS alert topic (topic and GuardDuty in step 2, alarms in step 4). Each is triaged
  under [incident response](incident-response.md).
- **Monthly.** The security official reviews:
  - GuardDuty findings, including archived ones;
  - CloudTrail for root sign-ins, IAM and KMS key policy changes, Secrets Manager value reads,
    security group changes and any database access from outside the application;
  - failed sign-ins and lockouts in the production user pool (step 3);
  - the portal's activity log (`/admin/audit`, technical record) for staff account changes and
    unusual access volume, and the access log once it exists (step 3).
- **Records.** Each review records its date, the reviewer, what was checked and the findings in
  the access register, kept six years. Findings that need action follow
  [incident response](incident-response.md) or become GitHub issues that carry no PHI.
- **On request.** When the covered entity asks who viewed a patient's record, the security
  official answers from the access log (step 3) and `audit_log`.

## Sanctions

164.308(a)(1)(ii)(C), required.

- **Business associate workforce.** A breach of these policies is documented by the security
  official. The sanction fits the intent and the harm: retraining, reduced access, removal of
  access, or ending the person's engagement. Any violation that involves the covered entity's PHI
  is also handled as a security incident and reported to the covered entity under the BAA.
- **AI coding agents.** When an agent breaks a rule, its session is stopped, the operator reviews
  everything it did, and the rule or the guard is tightened. The operator is sanctioned as above
  when the operator's own conduct breached the policy.
- **Clinic staff.** The covered entity's sanction policy applies. The business associate reports
  portal misuse it observes to the Practice Manager.
- **Records.** Sanctions are recorded and kept six years, outside this repository.
