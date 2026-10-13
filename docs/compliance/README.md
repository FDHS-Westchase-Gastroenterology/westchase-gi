# HIPAA compliance record: Westchase GI website and staff portal

This directory is the written security program for the Westchase GI patient website and staff
portal: the risk analysis, the policies, the security official designation, the vendor list, the
AWS service eligibility evidence and the business associate agreement template. It is the
documentation that [45 CFR 164.316](https://www.ecfr.gov/current/title-45/section-164.316)
requires for the system.

## Parties and scope

- **Covered entity:** FDHS Westchase Gastroenterology (WGI), part of Florida Digestive Health
  Specialists. The patient website collects appointment requests for it, and its staff use the
  portal.
- **Business associate:** `[BUSINESS ASSOCIATE LEGAL NAME]`, the implementation company that
  builds and operates the system and owns the AWS Organization. It creates, receives, maintains
  and transmits protected health information (PHI) on the covered entity's behalf, which makes it
  a business associate under
  [45 CFR 160.103](https://www.ecfr.gov/current/title-45/section-160.103).
- **Subcontractor:** Amazon Web Services, under the AWS Organizations BAA
  ([45 CFR 164.502(e)(1)(ii)](https://www.ecfr.gov/current/title-45/section-164.502#p-164.502(e)(1)(ii)),
  [164.308(b)(2)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(b)(2))). Every
  other vendor is in [vendors.md](vendors.md).
- **System in scope:** the Next.js application in this repository (patient website, intake API,
  `/admin` staff portal), its database, its sign-in, its email, its infrastructure in the AWS
  `wgi` account (Region us-east-2), its CI/CD pipeline, and the workstations used to build and
  operate it.
- **Not in scope:** the covered entity's own HIPAA program (its Notice of Privacy Practices, its
  EHR, its offices, its staff training and its own policies). This record supplements that
  program for the system the business associate operates; it does not replace it.

## Documents

| Document | What it holds |
| --- | --- |
| [security-official.md](security-official.md) | The designated security official, responsibilities, training and periodic evaluation |
| [risk-analysis.md](risk-analysis.md) | Risk analysis and risk management plan: assets, ePHI flows, threats, likelihood, impact, controls, residual risk |
| [policies/access-control.md](policies/access-control.md) | Access control, workforce security, authentication, audit and activity review, sanctions |
| [policies/change-management.md](policies/change-management.md) | How code, schema and infrastructure change reach production |
| [policies/incident-response.md](policies/incident-response.md) | Security incident response and breach notification |
| [policies/contingency-plan.md](policies/contingency-plan.md) | Backup, restore, disaster recovery and emergency mode operation |
| [policies/workstation-security.md](policies/workstation-security.md) | Workstation use and security, device and media controls |
| [vendors.md](vendors.md) | Every vendor the system touches, its BAA status and the data it may receive |
| [aws-hipaa-eligible-services.md](aws-hipaa-eligible-services.md) | Each AWS service the system uses, checked against AWS's HIPAA Eligible Services Reference |
| [baa-template.md](baa-template.md) | Business associate agreement template between FDHS and the business associate (requires legal review) |

## Conventions

- **Present tense describes the operating model.** Where a control is not built yet, the
  document names the INIT-1 step that delivers it, using the step numbers in
  [`docs/initiatives/INIT-1-aws-migration.md`](../initiatives/INIT-1-aws-migration.md):
  1. strip deleted features and map dependencies;
  2. AWS foundation;
  3. database, sign-in, data access and email;
  4. hosting and the pipeline;
  5. cut-over;
  6. decommission the old stack.
- **Production** means the production resources inside the `wgi` account: its own Cognito user
  pool, its own RDS server and its own secrets. Staging and previews are non-production resources
  in the same account and hold fictional data only.
- **Citations** point at primary sources: the eCFR for 45 CFR, hhs.gov for HHS guidance, and
  aws.amazon.com or docs.aws.amazon.com for AWS.
- **No sensitive values.** These documents contain no PHI, no AWS account IDs, no IAM Identity
  Center identifiers, no secret values and no personal contact details.

## Document control

- **Record.** The Git history of `docs/compliance/` is the record of every version, its author
  and its date. A policy takes effect when its change merges into the staging trunk and is
  approved by the security official.
- **Retention.** Each version is kept for six years from the date it was created or the date it
  was last in effect, whichever is later
  ([164.316(b)(2)(i)](https://www.ecfr.gov/current/title-45/section-164.316#p-164.316(b)(2)(i))).
  Deleting this directory or rewriting its history is prohibited for that period. The repository
  blocks force pushes and branch deletion.
- **Availability.** The documents are available to everyone responsible for implementing them
  through the repository
  ([164.316(b)(2)(ii)](https://www.ecfr.gov/current/title-45/section-164.316#p-164.316(b)(2)(ii))).
  The covered entity's Practice Manager receives a copy on request.
- **Review.** The security official reviews every document at least once a year and whenever an
  environmental or operational change affects ePHI security
  ([164.316(b)(2)(iii)](https://www.ecfr.gov/current/title-45/section-164.316#p-164.316(b)(2)(iii)),
  [164.308(a)(8)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(a)(8))). The
  triggers are listed in [security-official.md](security-official.md#periodic-evaluation).
- **Retention of actions and assessments.** Incident records, breach risk assessments, access
  reviews and evaluation results are written records under the same six-year rule. They are kept
  outside this repository when they contain PHI or account identifiers (see
  [incident-response.md](policies/incident-response.md#records)).

## Security Rule crosswalk

Every standard and implementation specification in the Security Rule's administrative, physical,
technical, organizational and documentation sections, with the document that satisfies it. "R"
is required and "A" is addressable, as labelled in the regulation
([164.306(d)](https://www.ecfr.gov/current/title-45/section-164.306#p-164.306(d))). For each
addressable specification the business associate assesses whether it is reasonable and
appropriate; where it implements an equivalent alternative, the rationale is stated
([164.306(d)(3)](https://www.ecfr.gov/current/title-45/section-164.306#p-164.306(d)(3))).

Status values: **In place** (exists today), **Adopted** (a procedure that applies from the
merge of this record), **Step N** (an INIT-1 step delivers the technical control), and **N/A**
(with the reason).

### Administrative safeguards: [164.308](https://www.ecfr.gov/current/title-45/section-164.308)

| Citation | Standard or specification | R/A | Where it is met | Status |
| --- | --- | --- | --- | --- |
| 164.308(a)(1)(i) | Security management process | | [risk-analysis.md](risk-analysis.md) | Adopted |
| 164.308(a)(1)(ii)(A) | Risk analysis | R | [risk-analysis.md](risk-analysis.md) | Adopted |
| 164.308(a)(1)(ii)(B) | Risk management | R | [risk-analysis.md §Risk management plan](risk-analysis.md#risk-management-plan) | Adopted; controls in steps 2 to 6 |
| 164.308(a)(1)(ii)(C) | Sanction policy | R | [access-control.md §Sanctions](policies/access-control.md#sanctions) | Adopted |
| 164.308(a)(1)(ii)(D) | Information system activity review | R | [access-control.md §Activity review](policies/access-control.md#activity-review) | Adopted; CloudTrail and GuardDuty in step 2, access log in step 3 |
| 164.308(a)(2) | Assigned security responsibility | | [security-official.md](security-official.md) | Adopted |
| 164.308(a)(3)(i) | Workforce security | | [access-control.md §Workforce security](policies/access-control.md#workforce-security) | Adopted |
| 164.308(a)(3)(ii)(A) | Authorization and/or supervision | A | [access-control.md §Workforce security](policies/access-control.md#workforce-security): implemented | Adopted |
| 164.308(a)(3)(ii)(B) | Workforce clearance procedure | A | [access-control.md §Workforce security](policies/access-control.md#workforce-security): implemented | Adopted |
| 164.308(a)(3)(ii)(C) | Termination procedures | A | [access-control.md §Termination](policies/access-control.md#termination): implemented | Adopted; next-request deactivation in step 3 |
| 164.308(a)(4)(i) | Information access management | | [access-control.md §Access authorization](policies/access-control.md#access-authorization) | Adopted |
| 164.308(a)(4)(ii)(A) | Isolating health care clearinghouse functions | R | Not applicable: neither party performs clearinghouse functions in this system | N/A |
| 164.308(a)(4)(ii)(B) | Access authorization | A | [access-control.md §Access authorization](policies/access-control.md#access-authorization): implemented | In place (portal roles); Step 2 (AWS) |
| 164.308(a)(4)(ii)(C) | Access establishment and modification | A | [access-control.md §Access authorization](policies/access-control.md#access-authorization): implemented | In place (portal roles); Step 3 (Cognito) |
| 164.308(a)(5)(i) | Security awareness and training | | [security-official.md §Training](security-official.md#security-awareness-and-training) | Adopted |
| 164.308(a)(5)(ii)(A) | Security reminders | A | [security-official.md §Training](security-official.md#security-awareness-and-training): implemented | Adopted |
| 164.308(a)(5)(ii)(B) | Protection from malicious software | A | [workstation-security.md](policies/workstation-security.md#malicious-software); GuardDuty and image scanning in [change-management.md](policies/change-management.md): implemented | Adopted; Step 2 (GuardDuty), Step 4 (scan) |
| 164.308(a)(5)(ii)(C) | Log-in monitoring | A | [access-control.md §Activity review](policies/access-control.md#activity-review): implemented | Step 3 (Cognito events), Step 4 (alarms) |
| 164.308(a)(5)(ii)(D) | Password management | A | [access-control.md §Authentication](policies/access-control.md#authentication), [workstation-security.md](policies/workstation-security.md#workstation-security): implemented | Adopted; Step 3 (Cognito password policy and MFA) |
| 164.308(a)(6)(i) | Security incident procedures | | [incident-response.md](policies/incident-response.md) | Adopted |
| 164.308(a)(6)(ii) | Response and reporting | R | [incident-response.md](policies/incident-response.md) | Adopted; alert routing in steps 2 and 4 |
| 164.308(a)(7)(i) | Contingency plan | | [contingency-plan.md](policies/contingency-plan.md) | Adopted |
| 164.308(a)(7)(ii)(A) | Data backup plan | R | [contingency-plan.md §Backup](policies/contingency-plan.md#data-backup-plan) | Step 3 (RDS backups and PITR) |
| 164.308(a)(7)(ii)(B) | Disaster recovery plan | R | [contingency-plan.md §Disaster recovery](policies/contingency-plan.md#disaster-recovery-plan) | Step 3; rehearsal before step 5 |
| 164.308(a)(7)(ii)(C) | Emergency mode operation plan | R | [contingency-plan.md §Emergency mode](policies/contingency-plan.md#emergency-mode-operation-plan) | Adopted |
| 164.308(a)(7)(ii)(D) | Testing and revision procedures | A | [contingency-plan.md §Testing](policies/contingency-plan.md#testing-and-revision): implemented | Rehearsal before step 5, then annual |
| 164.308(a)(7)(ii)(E) | Applications and data criticality analysis | A | [contingency-plan.md §Criticality](policies/contingency-plan.md#applications-and-data-criticality-analysis): implemented | Adopted |
| 164.308(a)(8) | Evaluation | | [security-official.md §Periodic evaluation](security-official.md#periodic-evaluation) | Adopted |
| 164.308(b)(1) | Business associate contracts and other arrangements | | [vendors.md](vendors.md), [baa-template.md](baa-template.md) | FDHS agreement unsigned (Jason); gates the cut-over (R-23) |
| 164.308(b)(2) | Subcontractor assurances | | [vendors.md §AWS](vendors.md#vendors) | In place (AWS Organizations BAA) |
| 164.308(b)(3) | Written contract or other arrangement | R | [baa-template.md](baa-template.md); AWS BAA in AWS Artifact | AWS in place; FDHS unsigned |

### Physical safeguards: [164.310](https://www.ecfr.gov/current/title-45/section-164.310)

| Citation | Standard or specification | R/A | Where it is met | Status |
| --- | --- | --- | --- | --- |
| 164.310(a)(1) | Facility access controls | | AWS data centers under the AWS BAA and shared responsibility model; [workstation-security.md](policies/workstation-security.md) for the operator's workspace | In place (AWS); Adopted |
| 164.310(a)(2)(i) | Contingency operations | A | [contingency-plan.md](policies/contingency-plan.md): implemented; data-center access during an emergency is AWS's | Adopted |
| 164.310(a)(2)(ii) | Facility security plan | A | AWS for its facilities. The operator's workspace stores no ePHI ([workstation-security.md](policies/workstation-security.md#no-ephi-at-rest-on-workstations)), so a separate facility plan is not reasonable; the alternative is the workstation controls | AWS in place; alternative adopted |
| 164.310(a)(2)(iii) | Access control and validation procedures | A | AWS for its facilities; same rationale as above for the workspace | AWS in place; alternative adopted |
| 164.310(a)(2)(iv) | Maintenance records | A | AWS for its facilities. The workspace has no physical security components that protect ePHI; not reasonable | AWS in place; N/A for the workspace |
| 164.310(b) | Workstation use | | [workstation-security.md §Workstation use](policies/workstation-security.md#workstation-use) | Adopted |
| 164.310(c) | Workstation security | | [workstation-security.md §Workstation security](policies/workstation-security.md#workstation-security) | Adopted |
| 164.310(d)(1) | Device and media controls | | [workstation-security.md §Device and media](policies/workstation-security.md#device-and-media-controls) | Adopted |
| 164.310(d)(2)(i) | Disposal | R | AWS media sanitization for cloud storage; [workstation-security.md §Device and media](policies/workstation-security.md#device-and-media-controls) | Adopted; Step 6 for Supabase and Vercel |
| 164.310(d)(2)(ii) | Media re-use | R | AWS for cloud media; [workstation-security.md §Device and media](policies/workstation-security.md#device-and-media-controls) | Adopted |
| 164.310(d)(2)(iii) | Accountability | A | [workstation-security.md §Device and media](policies/workstation-security.md#device-and-media-controls): implemented as a device inventory | Adopted |
| 164.310(d)(2)(iv) | Data backup and storage | A | No ePHI on workstations; before an export is moved, it is held only in encrypted AWS storage ([contingency-plan.md](policies/contingency-plan.md#exports)) | Adopted |

### Technical safeguards: [164.312](https://www.ecfr.gov/current/title-45/section-164.312)

| Citation | Standard or specification | R/A | Where it is met | Status |
| --- | --- | --- | --- | --- |
| 164.312(a)(1) | Access control | | [access-control.md](policies/access-control.md) | In place (server-owned roles); Steps 2 to 4 |
| 164.312(a)(2)(i) | Unique user identification | R | [access-control.md §Unique identification](policies/access-control.md#unique-user-identification) | In place (portal); Step 3 (Cognito) |
| 164.312(a)(2)(ii) | Emergency access procedure | R | [access-control.md §Emergency access](policies/access-control.md#emergency-access-procedure) | Adopted |
| 164.312(a)(2)(iii) | Automatic logoff | A | [access-control.md §Sessions](policies/access-control.md#sessions-and-automatic-logoff): implemented (8 h idle, 24 h absolute, screen lock) | Step 3 |
| 164.312(a)(2)(iv) | Encryption and decryption | A | [risk-analysis.md](risk-analysis.md); KMS customer-managed keys on RDS, backups, logs and secrets: implemented | Steps 2 and 3 |
| 164.312(b) | Audit controls | | [access-control.md §Audit](policies/access-control.md#audit-controls): `audit_log`, access log, CloudTrail | In place (`audit_log`); Step 2 (CloudTrail); Step 3 (access log, append-only grants) |
| 164.312(c)(1) | Integrity | | [risk-analysis.md](risk-analysis.md); database constraints, version checks, revision history, append-only audit | In place (constraints); Step 3 (grants) |
| 164.312(c)(2) | Mechanism to authenticate ePHI | A | Implemented: revision tables, idempotency receipts, HMAC-signed workflow commands, storage checksums and encryption | In place; Step 3 (dedicated HMAC secret) |
| 164.312(d) | Person or entity authentication | | [access-control.md §Authentication](policies/access-control.md#authentication): Cognito with MFA | Step 3 |
| 164.312(e)(1) | Transmission security | | TLS at the load balancer, and to RDS with server-certificate verification (`verify-full`) | Step 3 (RDS TLS), Step 4 (ALB, HSTS) |
| 164.312(e)(2)(i) | Integrity controls | A | Implemented: TLS integrity on every hop; WAF in front of the load balancer | Step 4 |
| 164.312(e)(2)(ii) | Encryption | A | Implemented: HTTPS only with HSTS; TLS with server-certificate verification (`verify-full` against the RDS CA bundle) on database connections | Steps 3 and 4 |

### Organizational requirements: [164.314](https://www.ecfr.gov/current/title-45/section-164.314)

| Citation | Standard or specification | R/A | Where it is met | Status |
| --- | --- | --- | --- | --- |
| 164.314(a)(1) | Business associate contracts or other arrangements | | [baa-template.md](baa-template.md); [vendors.md](vendors.md) | FDHS unsigned; AWS in place |
| 164.314(a)(2)(i)(A) | Comply with the Security Rule | R | [baa-template.md §2(b)](baa-template.md#2-obligations-and-activities-of-business-associate) | Template |
| 164.314(a)(2)(i)(B) | Subcontractors agree to the same requirements | R | [baa-template.md §2(d)](baa-template.md#2-obligations-and-activities-of-business-associate); AWS BAA | Template; AWS in place |
| 164.314(a)(2)(i)(C) | Report security incidents and breaches | R | [baa-template.md §2(c)](baa-template.md#2-obligations-and-activities-of-business-associate); [incident-response.md](policies/incident-response.md) | Template |
| 164.314(a)(2)(ii) | Other arrangements | R | Not applicable: neither party is a governmental entity | N/A |
| 164.314(a)(2)(iii) | Business associate contracts with subcontractors | R | The AWS BAA; no other subcontractor receives ePHI once step 6 completes ([vendors.md](vendors.md)) | AWS in place; Supabase and Vercel gap until step 6 |
| 164.314(b) | Requirements for group health plans | | Not applicable: no group health plan is involved | N/A |

### Policies, procedures and documentation: [164.316](https://www.ecfr.gov/current/title-45/section-164.316)

| Citation | Standard or specification | R/A | Where it is met | Status |
| --- | --- | --- | --- | --- |
| 164.316(a) | Policies and procedures | | This directory | Adopted |
| 164.316(b)(1) | Documentation | | This directory and its Git history | Adopted |
| 164.316(b)(2)(i) | Time limit (six years) | R | [Document control](#document-control) | Adopted |
| 164.316(b)(2)(ii) | Availability | R | [Document control](#document-control) | Adopted |
| 164.316(b)(2)(iii) | Updates | R | [Document control](#document-control); [security-official.md](security-official.md#periodic-evaluation) | Adopted |

## Sources

- 45 CFR Part 164, Subpart C (Security Rule):
  [164.302](https://www.ecfr.gov/current/title-45/section-164.302) to
  [164.318](https://www.ecfr.gov/current/title-45/section-164.318).
- 45 CFR Part 164, Subpart D (Breach Notification):
  [164.400](https://www.ecfr.gov/current/title-45/section-164.400) to
  [164.414](https://www.ecfr.gov/current/title-45/section-164.414).
- HHS, [Guidance on Risk Analysis](https://www.hhs.gov/hipaa/for-professionals/security/guidance/guidance-risk-analysis/index.html).
- AWS, [HIPAA Eligible Services Reference](https://aws.amazon.com/compliance/hipaa-eligible-services-reference/)
  and [HIPAA compliance](https://aws.amazon.com/compliance/hipaa-compliance/).
