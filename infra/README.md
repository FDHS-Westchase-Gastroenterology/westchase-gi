# infra

Terraform for everything westchase-gi runs on in AWS. A fresh environment is rebuilt from this
directory alone, plus the human steps listed under [Human steps](#human-steps).

Everything lives in one AWS account, the `wgi` project in **us-east-2**, which holds production,
staging and previews. The Organization's Region policy also allows us-east-1, so the account
baseline (GuardDuty, IAM Access Analyzer, EBS default encryption) runs there too, and the trail is
multi-Region.

## Layout

| Path | What it manages | State key |
| --- | --- | --- |
| `bootstrap/` | The state bucket `westchase-gi-tfstate-use2` and its key `alias/wgi-tfstate` | `bootstrap/terraform.tfstate` |
| `shared/` | Account baseline, audit trail, KMS keys, VPC, GitHub OIDC roles, ECR, alerts, DNS zone and records | `shared/terraform.tfstate` |
| `modules/kms-key/` | A customer managed key with rotation and a guard that admits IAM principals only through named services | |
| `modules/s3-bucket/` | A private, versioned, CMK-encrypted, TLS-only bucket | |
| `modules/github-oidc-role/` | An IAM role that trusts exact GitHub Actions token subjects | |
| `scripts/dns-mirror-diff.sh` | Compares the Porkbun and Route 53 answers for every mirrored name | |

Environment roots under `environments/` (`staging`, `production`, previews) come in later pull
requests and read `shared/` through its outputs. `environments/production/` also creates
production's data and secrets keys, and only the pipeline applies it, under
`wgi-github-deploy-production`.

Versions: Terraform `>= 1.10` (CI pins 1.16.4), AWS provider `~> 6.68`. Both roots commit
`.terraform.lock.hcl`. The backend uses S3 native locking (`use_lockfile = true`); there is no
DynamoDB table.

## What `shared/` creates

- **Audit trail.** One multi-Region CloudTrail trail with log file validation, written to the
  audit bucket (`wgi-audit-<account>-us-east-2-an`, account-regional namespace) and streamed to
  the `/wgi/audit/cloudtrail` log group (365 days). It records all management events, object reads
  and writes on the state bucket, and object reads on the audit bucket. Only CloudTrail, AWS Config
  and VPC flow log delivery may write to the bucket, each under its own prefix; nobody may delete a
  record version. CloudTrail and Config records are kept six years (45 CFR 164.316(b)(2)); flow
  logs one year.
- **Security alarms.** Metric filters on the trail page the alerts topic on root user activity, a
  trail change, a KMS key disabled or scheduled for deletion, an IAM user, access key or console
  password being created, any change to the state or audit bucket's policy, lifecycle,
  replication, versioning, public access block, ACL or CORS configuration, any of the three roles
  that read production state (`wgi-github-deploy-production`, `wgi-github-plan-production`,
  `wgi-breakglass-production`) being created, deleted, or having its trust, policies or
  permissions boundary changed, a new default version of `wgi-terraform-read`, and every attempt
  to assume the break-glass role.
- **Account baseline.** S3 account-level public access block, EBS default encryption, GuardDuty
  and an IAM Access Analyzer in both Regions. GuardDuty runs S3, RDS login and Lambda network
  protection, and Runtime Monitoring with GuardDuty managing the agent on ECS Fargate; EKS and EBS
  malware scans are off. us-east-1 findings are forwarded to the us-east-2 event bus. GuardDuty
  findings of Medium severity and above, and every new active Access Analyzer finding, go to the
  alerts topic. A GuardDuty email names the finding's type, severity, Region, resource, first and
  last sighting and ID, with a console link; the finding's JSON stays in GuardDuty.
- **Runtime Monitoring on Fargate.** GuardDuty adds a sidecar running its security agent to each
  new Fargate task, and creates a `guardduty-data` VPC endpoint and its security group in each VPC
  that hosts a cluster. GuardDuty owns that endpoint and group; Terraform does not manage them, and
  they cost nothing. Environment roots give each task execution role ECR pull permissions (the
  sidecar image comes from an AWS-owned registry) and each task security group 443 egress. A
  cluster tagged `GuardDutyManaged: false` gets no agent, so no environment root sets that tag.
- **AWS Config.** Continuous recording of every supported resource in us-east-2 plus global IAM
  resources, delivered to the audit bucket. No rules or conformance packs; see
  [Config and Security Hub](#config-and-security-hub).
- **KMS keys, one per purpose.** `wgi-audit-logs`, `wgi-alerts`, `wgi-artifacts` (ECR),
  `wgi-staging-data`, `wgi-staging-secrets`; `wgi-tfstate` is in `bootstrap/`. All rotate yearly
  and are protected from `terraform destroy`. Each key denies this account's IAM principals any
  cryptographic call that does not arrive through the services the key is for (`kms:ViaService`),
  so a role with broad KMS permissions still cannot decrypt directly. Production's data and secrets
  keys are not here; see [Production keys](#production-keys). Staging and production never share a
  key.
- **Network.** VPC `10.20.0.0/16` across us-east-2a and us-east-2b:

  | Tier | Subnets | Route out | Holds |
  | --- | --- | --- | --- |
  | public | `10.20.0.0/24`, `10.20.1.0/24` | internet gateway | the load balancer, the NAT gateway |
  | app | `10.20.16.0/20`, `10.20.32.0/20` | one NAT gateway in zone a; S3 gateway endpoint; interface endpoints | ECS services and one-off tasks; the interface endpoints |
  | db | `10.20.64.0/24`, `10.20.65.0/24` | none | RDS only |

  Interface endpoints for `ecr.api`, `ecr.dkr`, `secretsmanager`, `kms` and `logs` sit in both app
  subnets with private DNS, so image pulls, secret reads, KMS calls and log delivery from the VPC
  stay on the AWS network. Each has its own security group (`wgi-vpce-<service>`) that admits
  HTTPS from the VPC CIDR and nothing else. Production's secrets can therefore require
  `aws:SourceVpce` (the `vpc_endpoint_ids` output), which no call from outside the VPC, a laptop
  included, satisfies. Endpoint policies stay at the default; IAM and the key and secret policies
  do the narrowing.

  The database tier also has a network ACL that admits PostgreSQL from the app tier and nothing
  else. The default security group admits nothing. VPC flow logs (all traffic) go to the audit
  bucket. The S3 endpoint policy reaches only this account's buckets and the bucket ECR serves
  image layers from.
- **GitHub OIDC and break glass.** The `token.actions.githubusercontent.com` provider, four GitHub
  roles and the production break-glass role; see [Who can change what](#who-can-change-what).
- **ECR.** Repository `westchase-gi`: immutable tags, scan on push, encrypted with `wgi-artifacts`.
  Lifecycle: untagged images expire after 14 days, `production-*` tags keep the newest 30, and the
  repository keeps the newest 200 images overall.
- **Alerts.** SNS topic `wgi-alerts`, encrypted with `wgi-alerts`, with one email subscription
  whose address is `var.alarm_email` (no default; never committed). A monthly cost budget
  (`var.monthly_budget_usd`, default $200) alerts at 80% of actual and 100% of forecast spend.
  Each environment root that adds standing cost raises it in the same pull request.
- **DNS.** Public hosted zone `westchasegi.com`. It mirrors the five records Porkbun serves (apex
  and `www` to Vercel, Resend's DKIM key, and the `send` MX and SPF records for Resend's return
  path) and nothing else. It is not authoritative until the Porkbun nameservers change; see
  [Moving DNS to Route 53](#moving-dns-to-route-53).
- **Tags.** Every resource carries `env`: `shared` from the provider default tags, `staging` on
  staging's keys and deploy role, or `production` on the production deploy, plan and break-glass
  roles. Guardrails that
  protect production key on `env = production`, so no other resource may carry it.

## Before the first apply

Two conditions hold before anyone applies `shared/`:

1. **The `aws-production` GitHub environment exists and is protected.** The production deploy
   role trusts only `repo:FDHS-Westchase-Gastroenterology/westchase-gi:environment:aws-production`.
   A workflow that names an environment that does not exist creates it with no protection, so the
   environment must exist with its rules before the role does. Jason creates it at
   <https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/settings/environments> with:
   - **Required reviewers:** Jason.
   - **Allow administrators to bypass configured protection rules:** off.
   - **Deployment branches and tags:** selected branches only, naming the branch production
     deploys from.

   The existing `Production` environment belongs to Vercel, which records the live site's
   deployments in it until the cut-over. Leave it alone. GitHub environment names are
   case-insensitive, so a new `production` environment would be that same environment.
2. **The `aws-production-plan` GitHub environment exists**, for the same reason: the production
   plan role trusts only `...:environment:aws-production-plan`. It has no reviewers, because a
   plan changes nothing, and **Deployment branches and tags** names only
   `portal/appointment-workflow-experience`, so a pull request job that names it is refused before
   GitHub issues a token. Administrator bypass is off.
3. **The red-team review has passed** for this pull request.

`terraform plan` does not evaluate service control policies or resource control policies. The
first apply is where a policy denial would show up; the likeliest places are the AWS Config
service-linked role, the GuardDuty detector in us-east-1 and the IAM OIDC provider. If one fails,
fix the cause and apply again; Terraform keeps what was already created.

## Apply order

Both roots are applied by hand with administrator credentials. No GitHub role can write
`bootstrap/` or `shared/` state, by design.

Terraform cannot use `aws login` sessions directly, so export them into the shell first:

```sh
eval "$(aws configure export-credentials --profile wgi --format env)"
aws sts get-caller-identity
```

### 1. bootstrap

`bootstrap/` creates the bucket and key that its own backend names, so its first apply runs on a
local backend and then moves its state into the bucket:

```sh
cd infra/bootstrap
cat > backend_override.tf <<'EOF'
terraform {
  backend "local" {}
}
EOF
terraform init
terraform apply
rm backend_override.tf
terraform init -migrate-state   # answer yes; the local state moves to bootstrap/terraform.tfstate
```

`*_override.tf` and `*.tfstate` are gitignored. After the migration, delete the local
`terraform.tfstate` and its backup; the bucket now holds the state, with versioning.

### 2. shared

```sh
cd infra/shared
export TF_VAR_alarm_email='<the address that receives alerts>'
terraform init
terraform apply
```

Then complete the [after-apply steps](#human-steps).

### 3. Environment roots

Later pull requests, under `environments/`. Each reads `shared/` through `terraform_remote_state`
(below) and stores its state under its own prefix: `staging/`, `production/`, `preview/`. Nobody
applies `environments/production/` by hand: only the pipeline does, under
`wgi-github-deploy-production`, because no other principal can write `production/` state or
administer production's keys.

## Outputs contract

Environment roots read the shared root like this:

```hcl
data "terraform_remote_state" "shared" {
  backend = "s3"
  config = {
    bucket = "westchase-gi-tfstate-use2"
    key    = "shared/terraform.tfstate"
    region = "us-east-2"
  }
}
```

| Output | Value |
| --- | --- |
| `vpc_id`, `vpc_cidr` | The VPC |
| `subnet_ids` | Map of tier (`public`, `app`, `db`) to subnet IDs sorted by zone |
| `route_table_ids` | Map of tier to route table ID |
| `vpc_endpoint_ids` | Map of service (`s3`, `ecr.api`, `ecr.dkr`, `secretsmanager`, `kms`, `logs`) to VPC endpoint ID, for `aws:SourceVpce` conditions |
| `kms_key_arns`, `kms_key_aliases` | Maps keyed `audit`, `alerts`, `artifacts`, `staging_data`, `staging_secrets`; production's keys are outputs of `environments/production/` |
| `alerts_topic_arn` | Where environment alarms publish |
| `audit_bucket`, `state_bucket` | Bucket names |
| `ecr_repository_url` | The image repository |
| `github_role_arns` | Map with `plan`, `plan_production`, `deploy_staging`, `deploy_production` |
| `breakglass_production_role_arn` | The break-glass role, for production key policies |
| `terraform_read_policy_arn` | The read-only policy the plan and deploy roles share |
| `route53_zone_id`, `route53_name_servers` | The public zone |

Renaming or removing an output breaks every environment root that reads it.

## Who can change what

| Role | Trusted subject | State | AWS permissions |
| --- | --- | --- | --- |
| `wgi-github-plan` | `repo:FDHS-Westchase-Gastroenterology/westchase-gi:pull_request` | reads `bootstrap/`, `shared/`, `staging/`, `preview/`; never `production/`; writes nothing | `wgi-terraform-read`: metadata reads only, no object, log, secret or finding contents |
| `wgi-github-plan-production` | `...:environment:aws-production-plan` (`var.production_plan_environment`) | reads `shared/` and `production/`; writes only saved plans under `production-plans/` | `wgi-terraform-read`, with explicit denies on every content read (below) |
| `wgi-github-deploy-staging` | `...:ref:refs/heads/portal/appointment-workflow-experience` (`var.staging_branch`) | reads `shared/`, reads and writes `staging/` and `preview/` | push to ECR; register task definitions; run, describe and stop tasks and update services in `wgi-staging*` clusters; pass `wgi-staging-*` roles to ECS tasks; read `/wgi/staging/*` task logs |
| `wgi-github-deploy-production` | `...:environment:aws-production` (`var.production_environment`) | reads `shared/`, reads and writes `production/`, reads `production-plans/` | the same for `wgi-production*`, except that it can pull and tag existing images but not upload layers, and reads no logs |
| `wgi-breakglass-production` | the management account, with MFA | exempt from the `production/` read deny | none of its own; see [Break glass](#break-glass) |

- Every role session lasts at most one hour. Fork pull requests never receive an OIDC token.
- The state bucket policy denies, to every principal not named, the account root and
  administrators included:

  | Prefix | Read | Write, delete, replicate |
  | --- | --- | --- |
  | `production/` | deploy-production, plan-production, break-glass | deploy-production |
  | `production-plans/` | deploy-production, plan-production | plan-production |

  Saved plans hold cleartext values, so a lifecycle rule expires `production-plans/` objects,
  current and noncurrent, after 7 days. An administrator can still get around the denies by
  changing the bucket policy, its lifecycle, versioning or public access block, by changing one of
  the three roles' trust, policies or permissions boundary (or deleting one and recreating it
  under the same name, which keeps every ARN-based grant), or by publishing a new default version
  of `wgi-terraform-read`. Each of those pages the alerts topic (`protected-bucket-policy-changed`,
  `production-deploy-role-changed`, `terraform-read-policy-changed`); none is prevented. Terraform
  refuses to destroy any GitHub role or the break-glass role (`prevent_destroy`). The sanctioned
  path is [Break glass](#break-glass).
- `wgi-github-plan-production` reads production metadata through `wgi-terraform-read` and nothing
  else. Explicit denies, which no later allow can lift, cover secret values
  (`secretsmanager:GetSecretValue`, `BatchGetSecretValue`), `kms:Decrypt` on any key but the state
  key, object reads in the state bucket outside `production/`, `production-plans/` and `shared/`,
  log contents (`GetLogEvents`, `FilterLogEvents`, `StartQuery`, `GetQueryResults`,
  `StartLiveTail`, `GetLogRecord`), `rds-db:connect`, Cognito user reads (`ListUsers`,
  `ListUsersInGroup`, `AdminGetUser`, `AdminListGroupsForUser`), SSM parameter values and
  `ecs:ExecuteCommand`.
- The pull request that adds `environments/production/` also extends `wgi-github-deploy-production`
  with the permissions to create and administer production's KMS keys. No administrator or agent
  shell creates or administers a production key.
- The staging deploy job must not name a GitHub environment: a job that names one gets an
  environment subject, which the staging role does not trust.
- The staging role is exactly as trustworthy as the staging branch. Anyone who can push to
  `portal/appointment-workflow-experience` can run a workflow there that assumes it.
- The deploy roles carry deploy primitives only. The pull request that adds an environment root
  adds the permissions its `terraform apply` needs, and extends `wgi-terraform-read` with the
  services that root refreshes.
- CI plans run with `-lock=false`, because neither plan role can write a lock file.

### Break glass

This is the emergency access procedure for production (45 CFR 164.312(a)(2)(ii)). Use it only
when production must be read or repaired and the pipeline cannot do it: the production deploy role
or its trust is broken, a production key policy lost an administrator or a key is pending
deletion, a lock is stuck, a state version is corrupt, or GitHub is unavailable. Jason decides to
break glass; an agent never does.

`wgi-breakglass-production` trusts only the Organization's management account, and only a session
authenticated with MFA. Its account ID comes from the Organization at plan time, so it is written
nowhere in the repository. The role has no IAM policy. The state bucket exempts it from the
`production/` read deny, and every production key policy must name it as a second administrator,
so an emergency adds only the permission that emergency needs. Every attempt to assume it pages the
alerts topic (`breakglass-production-assumed`), and so does any policy attached to it
(`production-deploy-role-changed`).

1. For a key administration repair (`PutKeyPolicy`, `CancelKeyDeletion`), Jason assumes the role
   from the management account; the key policy is the grant.
2. To read production state, an administrator attaches an inline policy to the role granting
   `s3:GetObject` and `s3:ListBucket` on the state bucket's `production/` prefix and `kms:Decrypt`
   on the `wgi-tfstate` key, and Jason assumes it. To write production state, also edit the bucket
   policy of `westchase-gi-tfstate-use2`: add the role's ARN to the `ArnNotEquals` list of
   `DenyProductionStateWritesExceptProductionDeployRole`. That change fires
   `protected-bucket-policy-changed`.
3. Do the repair. CloudTrail records every object read and write on the state bucket.
4. Remove the inline policy, and restore the bucket policy with
   `terraform -chdir=infra/bootstrap apply`. `bootstrap/` owns the bucket policy, so the apply puts
   the committed statements back. The alarms fire again.
5. Record who broke glass, when, why, what was read or changed and when access was removed, with
   the CloudTrail event IDs of the assumption and of every policy change, in the security incident
   records.

### Naming contract

The deploy role policies match these names. An environment root that names things differently
gets access denied.

| Resource | Name |
| --- | --- |
| ECS clusters | `wgi-<env>*` |
| ECS services | any service in a `wgi-<env>*` cluster |
| Task definition families | `wgi-<env>*` |
| Task and execution roles | `wgi-<env>-*` |
| Application log groups | `/wgi/<env>/*` (the `wgi-<env>-data` key may encrypt only these, RDS exports and the WAF log group) |
| WAF log group | `aws-waf-logs-wgi-<env>` (WAF logs only to a group whose name starts with `aws-waf-logs-`) |
| RDS instances and clusters | `wgi-<env>-*` |

`<env>` is `staging` or `production`. Previews either live inside the staging names
(`wgi-staging-pr-<n>`) or get their own role in the pull request that adds them; the plan role
already reads `preview/` state.

## Decisions

### Config and Security Hub

AWS Config records; Security Hub is deferred. Config's configuration history is what a HIPAA
review asks for (what a security group or bucket policy looked like on a given day) and costs a
few dollars a month at this size. Security Hub's value is its CIS and AWS Foundational checks,
billed per check and per finding, about $10 to $30 a month here, and most of what those checks
would flag is already enforced in this code and scanned by checkov in CI. Because Config is
already recording, enabling Security Hub later is one small pull request. Revisit it when the
environments exist and there is more surface to check.

### One VPC for every environment

Staging, previews and production share one VPC. A second VPC would add a second NAT gateway
(about $37 a month) and the plumbing between them, for isolation that security groups, separate
IAM roles, separate KMS keys, separate secrets and separate database servers already provide. The
deploy roles are scoped by name to their own environment, and each environment's data has its own
key.

### One NAT gateway, five interface endpoints

One NAT gateway in zone a. If zone a fails, tasks in zone b lose outbound internet, but S3 still
works through the gateway endpoint, and ECR, Secrets Manager, KMS and CloudWatch Logs through the
interface endpoints, which run in both zones. A second NAT gateway costs about $36.50 a month; add
it when the app's availability target justifies it.

The five interface endpoints cost about $73 a month ($0.01 an hour per zone each, plus $0.01 per
GB processed). They are there for security, not traffic: production's secrets require
`aws:SourceVpce`, so a stolen credential used from a laptop cannot read them. Image pulls and log
delivery also stop paying NAT processing. STS is not among them; tasks reach it through the NAT
gateway, which only matters during a zone a outage.

### How the e2e suite reaches the private database

The database tier has no route to the internet, so a GitHub-hosted runner cannot reach it.

| Option | How | Fixed cost |
| --- | --- | --- |
| **A. One-off Fargate task (recommended)** | The workflow runs the suite as an ECS task in the app subnets: `aws ecs run-task`, then wait for it to stop and fail the job on a non-zero container exit code. | about $0; a 15-minute run on 2 vCPU and 4 GB costs a few cents |
| B. Session Manager port forwarding | A `t4g.nano` instance in the app tier with no inbound ports; the runner forwards a local port to RDS through Session Manager. | about $3.70 a month |
| C. Client VPN or a self-hosted runner in the VPC | A VPN endpoint association, or an always-on runner instance. | $73 a month and up |

Option A uses the same primitive as migrations (a one-off task that must succeed before a deploy
continues), keeps database credentials inside the VPC, and adds no standing infrastructure. The
deploy roles already allow `RunTask`, `DescribeTasks` and `StopTask` on `wgi-<env>*`, and the
staging role can read the task's logs. `aws ecs wait tasks-stopped` gives up after about ten
minutes, so a longer suite polls `describe-tasks` in a loop.

### Production keys

`wgi-production-data` and `wgi-production-secrets` are not in `shared/`. The
`environments/production/` root creates them, and only the pipeline applies it, under
`wgi-github-deploy-production`. Their key policy grants the account root no `kms:*`, so no IAM
policy, an administrator's included, reaches a production key on its own; only the principals the
key policy names do. The `shared/` keys keep the root statement, because administrators apply
`shared/`. The red-team gate checks the production key policy (G4) before that root's first apply.

### Other choices

- **Default VPCs** in us-east-1 and us-east-2 are left in place. Nothing launches into them; removing
  them is optional hardening.
- **DNSSEC and query logging** wait until the zone is authoritative. Both need us-east-1 resources,
  and DNSSEC needs a DS record at the registrar.
- **Container images.** Tags are immutable, but the staging role can push any tag, including
  `production-*`. Production deploys therefore pin the image digest that passed staging; a tag
  proves nothing about where an image came from. Images referenced by an image index cannot expire
  under the lifecycle policy.
- **Secrets.** Environment roots create empty `aws_secretsmanager_secret` containers and never
  manage `aws_secretsmanager_secret_version`, so no secret value reaches state. RDS uses
  `manage_master_user_password`.

## Known properties

- **The alarm address is in `shared/` state in clear text**, as the SNS subscription endpoint.
  Anyone who can read that state can read it: administrators and all four GitHub roles. The CI
  plan summary redacts it, along with every 12-digit number.
- **Expect IAM Access Analyzer findings** for the four GitHub roles, which trust an external
  identity provider, and for the break-glass role, which trusts the management account. Jason
  reviews each and archives it once he agrees it is intended.
- **The management account's ID and email address are in `shared/` state and plans**, from the
  Organization data source the break-glass trust reads. The CI plan summary redacts every 12-digit
  number; it prints no attribute values.
- **Bucket names.** The state bucket name is global and fixed in every backend block. To rebuild in
  another account, choose a new name, set `state_bucket_name` in both roots and edit each backend
  block. The audit bucket name includes the account ID and follows automatically.
- **A bucket that will hold patient data** adds a CloudTrail data-event selector for its objects in
  the same pull request that creates it.
- **Audit records are protected by a deny and an alarm, not by Object Lock.** The audit bucket
  denies record deletion, but an administrator can add a lifecycle rule that expires records
  without a delete call. `protected-bucket-policy-changed` pages on it; nothing prevents it.
  S3 Object Lock in COMPLIANCE mode with six-year retention is the preventive control, a G5
  follow-up outside this foundation.

## Human steps

Before `shared/` is applied:

1. Create and protect the `aws-production` and `aws-production-plan` environments, as in
   [Before the first apply](#before-the-first-apply).

After `shared/` is applied:

2. Click the confirmation link that AWS emails to the alarm address. Until then no alert arrives.
3. At <https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/settings/secrets/actions>,
   add the repository secrets:
   - `TF_PLAN_ROLE_ARN`: `terraform -chdir=infra/shared output -json github_role_arns`, the `plan`
     value.
   - `ALARM_EMAIL`: the same address as `TF_VAR_alarm_email`, so the CI plan matches.

   In the `aws-production-plan` environment, add the environment secret
   `PLAN_PRODUCTION_ROLE_ARN`: the `plan_production` value of the same output.

   Then, at <https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/settings/variables/actions>,
   add the repository variable `TF_PLAN_ENABLED` with the value `true`. Role ARNs are secrets, not
   variables, because this repository is public and Actions prints step inputs in its logs; the
   deploy role ARNs follow the same rule.
4. Protect `portal/appointment-workflow-experience` (require pull requests, block force pushes and
   deletion) at <https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/settings/branches>
   before the staging deploy pipeline goes live. Today only `main` is protected.
5. Review the IAM Access Analyzer findings for the GitHub and break-glass roles and archive the
   intended ones.

DNS, after the mirror in `shared/dns.tf` is applied:

6. Move the domain's nameservers to Route 53, as in
   [Moving DNS to Route 53](#moving-dns-to-route-53).

### Moving DNS to Route 53

`shared/dns.tf` mirrors the records Porkbun served on 2026-10-13. They were read through two public
resolvers because the Porkbun export was not yet available, so the export is checked against this
table before the nameservers change.

| Name | Type | TTL | Value |
| --- | --- | --- | --- |
| `westchasegi.com` | A | 600 | `76.76.21.21` (Vercel) |
| `www.westchasegi.com` | A | 600 | `76.76.21.21` (Vercel) |
| `resend._domainkey.westchasegi.com` | TXT | 600 | Resend's DKIM public key |
| `send.westchasegi.com` | MX | 600 | `10 feedback-smtp.us-east-1.amazonses.com` |
| `send.westchasegi.com` | TXT | 600 | `v=spf1 include:amazonses.com ~all` |

The mirror matches Porkbun exactly, so the comparison before the nameserver change has no
expected differences. Porkbun serves no CAA record, which lets any certificate authority issue,
and the mirror keeps it that way: a CAA policy now would also govern the certificate Vercel renews
for apex and `www`, and Vercel chooses that authority. The hosting cut-over adds `0 issue
"amazon.com"` once ACM is the only issuer.

Public DNS shows no apex MX, SPF or DMARC record, so the domain receives no mail and publishes no
DMARC policy. The mirror does not add them; a DMARC record is a later change to the zone.

1. Export the zone from Porkbun and compare every record with the table. A record the table lacks
   is added to `shared/dns.tf` and to the names in `scripts/dns-mirror-diff.sh`, and applied,
   before the next step.
2. Run `infra/scripts/dns-mirror-diff.sh <nameserver>` for each of the four `route53_name_servers`
   from a network that reaches nameservers directly, such as a GitHub-hosted runner. Each run must
   exit 0. A network that answers port 53 itself makes the script exit 2.
3. In Porkbun (Domain Management, westchasegi.com, Authoritative Nameservers), replace the four
   nameservers with the `route53_name_servers` output. The `.com` delegation can take up to 48
   hours to expire; ACM validation of the staging certificate waits for it.

## CI

`.github/workflows/infra.yml` runs on pull requests that touch `infra/` or the workflow itself.

- **static** needs no AWS credentials: `terraform fmt -check -recursive`, `init -backend=false`
  and `validate` for each root, and a checkov scan. Each checkov skip is written inline next to its
  resource with the reason.
- **plan** runs once `TF_PLAN_ENABLED` is `true` and only for pull requests from this repository.
  It assumes `wgi-github-plan`, plans `bootstrap/` and `shared/` without the lock, and lists each
  resource address with its planned action in the job summary. Attribute values stay on the
  runner, because the repository is public. Plan errors reach the log with every ARN and account
  ID replaced.

Local checks before pushing:

```sh
terraform fmt -check -recursive infra
for root in bootstrap shared; do
  terraform -chdir="infra/$root" init -backend=false && terraform -chdir="infra/$root" validate
done
uvx checkov@3.3.28 --directory infra --framework terraform --compact --quiet
```

To plan against the account without the CI role, add a gitignored `backend_override.tf` pointing
at a local backend, export credentials as above and run `terraform plan`. Never commit the
override, a state file or a plan file.

## Monthly cost

Estimated for the foundation alone in us-east-2, before any environment exists.

| Item | Monthly |
| --- | --- |
| NAT gateway (one, hourly charge) | $32.85 |
| NAT gateway public IPv4 address | $3.65 |
| Interface endpoints (5 across two zones, hourly charge) | $73.00 |
| KMS keys (6 at $1) | $6.00 |
| GuardDuty, two Regions, at this volume | $2 to $5 |
| GuardDuty Runtime Monitoring (no tasks yet; then $1.50 per monitored vCPU, first 500 vCPUs) | $0 |
| AWS Config recording | $1 to $3 |
| ECR storage | $1 to $4 |
| CloudWatch Logs (CloudTrail stream, 365 days) | $0.50 to $1 |
| CloudWatch alarms (8) | $0.80 |
| Route 53 hosted zone | $0.50 |
| VPC flow logs to S3 | about $0.50 |
| S3 (state, audit) | under $1 |
| CloudTrail management events (first trail), IAM Access Analyzer external access, Budgets, SNS email | free |
| **Total** | **about $121 to $131** |

Runtime Monitoring bills per vCPU of the Fargate tasks it watches, averaged over the month, so
an always-on 1 vCPU task adds about $1.50; the endpoint GuardDuty creates for its agent is free.
Production's two keys add $2 when `environments/production/` creates them. Options that would add to
this: a second NAT gateway (about $36.50), Security Hub (about $10 to $30).
