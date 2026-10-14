# Contingency plan: backup and restore

Satisfies the contingency plan standard,
[45 CFR 164.308(a)(7)](https://www.ecfr.gov/current/title-45/section-164.308#p-164.308(a)(7)),
with its data backup, disaster recovery, emergency mode, testing and criticality specifications,
together with contingency operations
([164.310(a)(2)(i)](https://www.ecfr.gov/current/title-45/section-164.310#p-164.310(a)(2)(i)))
and data backup and storage
([164.310(d)(2)(iv)](https://www.ecfr.gov/current/title-45/section-164.310#p-164.310(d)(2)(iv))).

The security official owns this plan. The database and its backups are built in INIT-1 step 3;
until then the production data lives on Supabase (risk R-01 in the
[risk analysis](../risk-analysis.md#risk-register)).

## Applications and data criticality analysis

164.308(a)(7)(ii)(E), addressable, implemented.

| Component | What depends on it | Criticality | Restore order |
| --- | --- | --- | --- |
| KMS customer-managed keys | Every encrypted store: database, backups, logs, secrets, Terraform state | Critical: without the key the data cannot be read | 1 |
| VPC, subnets and security groups | Private database access and the application's network path | Critical | 2 |
| RDS PostgreSQL (production) | All ePHI: requests, appointments, notes, history, audit and access rows | Critical: the only system of record for portal data | 3 |
| Secrets Manager | Database credentials, HMAC secrets, the Resend API key | Critical for the application to start | 4 |
| Cognito user pool (production) | Staff sign-in and two-step login | Critical for portal access | 5 |
| ECS service, load balancer, WAF and container image in ECR | The patient website, the intake API and the portal | High: patients and staff can fall back to the phone | 6 |
| Route 53 | The site's DNS records, including the records that validate its TLS certificates | High | 7 |
| Email through Resend, and the Cognito custom email sender | New-request alerts, temporary passwords for new staff, password-reset codes | Medium: sign-in with an authenticator app or passkey needs no email, and staff can check the portal for new requests | 8 |
| CloudTrail, GuardDuty, CloudWatch and SNS | Detection, alarms and evidence | High for security, not needed to serve patients | Restored with the account |
| EventBridge Scheduler (data lifecycle) | Scheduled deletion under the retention policy | Low: a missed run only delays deletion | Last |
| GitHub and the pipeline | Shipping a fix | Needed to change production, not to run it | Independent |

## Data backup plan

164.308(a)(7)(ii)(A), required.

- **What is backed up.** The production database, the only store of ePHI. Container images are
  rebuilt from the repository; infrastructure is recreated from Terraform; secrets are recreated
  at their source. None of those needs a backup of its own.
- **How.** RDS automated backups with point-in-time recovery: a daily snapshot plus transaction
  logs, which let RDS restore to any second inside the retention period
  ([RDS backups](https://docs.aws.amazon.com/AmazonRDS/latest/gettingstartedguide/managing-backup-restore.html)).
  RDS uploads transaction logs every five minutes, so the recovery point is about five minutes
  ([point-in-time recovery](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html))
  (step 3).
- **Retention.** The backup retention period is set in Terraform (step 3). RDS allows 1 to 35
  days. Backups are recovery copies, not archives
  ([ARCHITECTURE.md](../../../ARCHITECTURE.md)). Once the lifecycle schedule is activated (it is
  created disabled in step 4; risk R-19), records it deletes from the live database age out of
  the backups at the end of the backup retention period.
- **Protection.** Backups and snapshots are encrypted with the database's customer-managed key.
  The instance has deletion protection, and deleting it takes a final snapshot (step 3). KMS waits
  7 to 30 days before deleting a key, so a scheduled deletion can be cancelled
  ([KMS key deletion](https://docs.aws.amazon.com/kms/latest/cryptographic-details/key-deletion.html);
  risk R-20).
- **Limits.** The backups live in the same AWS account and Region as the database. An
  administrator session can remove them, and a Region-wide outage affects both. Those are part of
  risks R-11 and R-18, and the security official reviews them at each periodic evaluation.
- **Non-production.** Staging and previews hold fictional data. Their backups exist for
  convenience and are not part of this plan.

## Disaster recovery plan

164.308(a)(7)(ii)(B), required.

The recovery time objective is an initial figure: the portal serving staff again within 4 hours
of the decision to restore. The restore rehearsal measures the real time, and the security
official confirms or changes the objective from that measurement. The recovery point objective
is about five minutes, set by RDS's transaction-log interval.

| Event | Recovery |
| --- | --- |
| Rows deleted or corrupted (bad migration, mistaken action, malicious change) | Restore to a point in time just before the event, into a new instance. RDS leaves the original instance intact. Compare the two, then either point the application at the restored instance through a pipeline change or copy the affected rows back with a reviewed migration |
| Availability Zone failure (the database is single-AZ; risk R-12) | Restore to the latest restorable time into a new instance in another zone of us-east-2, then point the application at it through the pipeline |
| A bad deploy | Redeploy the previous image through the pipeline. A schema change is reversed by its rollback script, or by a point-in-time restore when the data changed too |
| KMS key scheduled for deletion or disabled | Cancel the deletion or re-enable the key during the waiting period. Investigate under [incident response](incident-response.md) |
| Account compromise or ransomware | Follow [incident response](incident-response.md) first: contain, preserve evidence, then restore from a point in time before the compromise |
| Region-wide outage of us-east-2 | Run in emergency mode until the Region recovers. No copy of the data exists in another Region |
| Resend unavailable | Staff check the portal directly for new requests. Temporary passwords and password-reset codes wait until Resend returns; signing in with an authenticator app or passkey is unaffected |

Every restore is done by the security official or under his direction, through the pipeline
where it changes production configuration, and is recorded as an incident or a rehearsal.

## Emergency mode operation plan

164.308(a)(7)(ii)(C), required, and contingency operations, 164.310(a)(2)(i).

- **The clinic keeps operating without the portal.** Patients call the clinic, and the front desk
  books in the clinic's own scheduling system. The portal is a work queue in front of that system,
  not the clinic's medical record.
- **The website degrades safely.** When a request cannot be saved, the intake form tells the
  patient it was not saved and to call or text the office (in place). The write freeze that shows
  the "please call us" state and makes the portal read-only is built for the cut-over (step 5) and
  is reused in an outage.
- **Security stays on in emergency mode.** Encryption, sign-in, audit and access logging are
  never switched off to speed recovery. A restored database comes back with the same roles,
  grants and audit tables as the original.
- **Who decides.** The security official declares and ends emergency mode and tells the Practice
  Manager by phone at both points.
- **Emergency access to data** follows the
  [emergency access procedure](access-control.md#emergency-access-procedure).

## Testing and revision

164.308(a)(7)(ii)(D), addressable, implemented.

- **Before cut-over (step 5).** A restore of the staging database is rehearsed: a point-in-time
  restore into a new instance, the application pointed at it, and the row counts and the portal
  checked. The write-up records the measured restore time, the gaps found and the fixes. INIT-1
  "What done looks like" requires this rehearsal.
- **Every year**, at the periodic evaluation, and after any change to the database, its keys or
  its backup settings, the rehearsal is repeated and this plan updated.
- **Data in rehearsals.** Rehearsals use staging, which holds fictional data. Restoring the
  production database outside a real recovery requires the security official's decision, and the
  restored instance gets the same private network placement, encryption and grants as production.

## Exports

Data backup and storage, 164.310(d)(2)(iv), addressable, implemented.

A database export (`pg_dump`, a snapshot export or a copy) is ePHI in its most portable form.

- An export of production data is made only for a stated purpose: the cut-over copy (step 5), the
  final export before decommissioning (step 6), a restore, or a request from the covered entity.
- It is written only to AWS storage in the `wgi` account, encrypted with a customer-managed key
  and closed to public access; never to a workstation, email, chat, GitHub or a vendor without a
  BAA.
- Each export is recorded in the export register (purpose, date, location, who made it and when
  it is deleted), kept outside this repository.
- It is deleted when its purpose ends. The final export from step 6 is kept as the record of the
  old stack for the retention period the security official sets in the register.
- When the covered entity asks for a copy of its data, the security official agrees the format and
  the channel with the Practice Manager, and the transfer uses an encrypted channel the covered
  entity controls.
