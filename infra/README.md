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
| `shared/` | Account baseline, audit trail, KMS keys, VPC, GitHub OIDC roles, ECR, alerts, DNS zone | `shared/terraform.tfstate` |
| `modules/kms-key/` | A customer managed key with rotation and a guard that admits IAM principals only through named services | |
| `modules/s3-bucket/` | A private, versioned, CMK-encrypted, TLS-only bucket | |
| `modules/github-oidc-role/` | An IAM role that trusts exact GitHub Actions token subjects | |

Environment roots (`staging/`, `production/`, previews) come in later pull requests and read
`shared/` through its outputs. `production/` also creates production's data and secrets keys, and
only the pipeline applies it, under `wgi-github-deploy-production`.

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
  password being created, and any change to the state or audit bucket policy.
- **Account baseline.** S3 account-level public access block, EBS default encryption, GuardDuty
  and an IAM Access Analyzer in both Regions. GuardDuty runs S3, RDS login and Lambda network
  protection, and Runtime Monitoring with GuardDuty managing the agent on ECS Fargate; EKS and EBS
  malware scans are off. us-east-1 findings are forwarded to the us-east-2 event bus. GuardDuty
  findings of Medium severity and above, and every new active Access Analyzer finding, go to the
  alerts topic.
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
- **GitHub OIDC.** The `token.actions.githubusercontent.com` provider and three roles; see
  [Who can change what](#who-can-change-what).
- **ECR.** Repository `westchase-gi`: immutable tags, scan on push, encrypted with `wgi-artifacts`.
  Lifecycle: untagged images expire after 14 days, `production-*` tags keep the newest 30, and the
  repository keeps the newest 200 images overall.
- **Alerts.** SNS topic `wgi-alerts`, encrypted with `wgi-alerts`, with one email subscription
  whose address is `var.alarm_email` (no default; never committed). A monthly cost budget
  (`var.monthly_budget_usd`, default $200) alerts at 80% of actual and 100% of forecast spend.
  Each environment root that adds standing cost raises it in the same pull request.
- **DNS.** Public hosted zone `westchasegi.com` with no records beyond the zone's own NS and SOA.
  It is not authoritative until the Porkbun nameservers change.
- **Tags.** Every resource carries `env`: `shared` from the provider default tags, `staging` on
  staging's keys and deploy role, or `production` on the production deploy role. Guardrails that
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
2. **The red-team review has passed** for this pull request.

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

Later pull requests. Each reads `shared/` through `terraform_remote_state` (below) and stores its
state under its own prefix: `staging/`, `production/`, `preview/`. Nobody applies `production/` by
hand: only the pipeline does, under `wgi-github-deploy-production`, because no other principal can
read or write `production/` state or administer production's keys.

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
| `kms_key_arns`, `kms_key_aliases` | Maps keyed `audit`, `alerts`, `artifacts`, `staging_data`, `staging_secrets`; production's keys are outputs of `production/` |
| `alerts_topic_arn` | Where environment alarms publish |
| `audit_bucket`, `state_bucket` | Bucket names |
| `ecr_repository_url` | The image repository |
| `github_role_arns` | Map with `plan`, `deploy_staging`, `deploy_production` |
| `terraform_read_policy_arn` | The read-only policy the plan and deploy roles share |
| `route53_zone_id`, `route53_name_servers` | The public zone |

Renaming or removing an output breaks every environment root that reads it.

## Who can change what

| Role | Trusted subject | State | AWS permissions |
| --- | --- | --- | --- |
| `wgi-github-plan` | `repo:FDHS-Westchase-Gastroenterology/westchase-gi:pull_request` | reads `bootstrap/`, `shared/`, `staging/`, `preview/`; never `production/`; writes nothing | `wgi-terraform-read`: metadata reads only, no object, log, secret or finding contents |
| `wgi-github-deploy-staging` | `...:ref:refs/heads/portal/appointment-workflow-experience` (`var.staging_branch`) | reads `shared/`, reads and writes `staging/` | push to ECR; register task definitions; run, describe and stop tasks and update services in `wgi-staging*` clusters; pass `wgi-staging-*` roles to ECS tasks; read `/wgi/staging/*` task logs |
| `wgi-github-deploy-production` | `...:environment:aws-production` (`var.production_environment`) | reads `shared/`, reads and writes `production/` | the same for `wgi-production*`, except that it can pull and tag existing images but not upload layers, and reads no logs |

- Every role session lasts at most one hour. Fork pull requests never receive an OIDC token.
- The state bucket policy denies reads, writes and deletes under `production/` to every principal
  except `wgi-github-deploy-production`, the account root and administrators included. The only
  way around it is [Break glass](#break-glass).
- The pull request that adds `production/` also extends `wgi-github-deploy-production` with the
  permissions to create and administer production's KMS keys. No administrator or agent shell
  creates or administers a production key.
- The staging deploy job must not name a GitHub environment: a job that names one gets an
  environment subject, which the staging role does not trust.
- The staging role is exactly as trustworthy as the staging branch. Anyone who can push to
  `portal/appointment-workflow-experience` can run a workflow there that assumes it.
- The deploy roles carry deploy primitives only. The pull request that adds an environment root
  adds the permissions its `terraform apply` needs, and extends `wgi-terraform-read` with the
  services that root refreshes.
- CI plans run with `-lock=false`, because `wgi-github-plan` cannot write the lock file.

### Break glass

This is the emergency access procedure for production state (45 CFR 164.312(a)(2)(ii)). Use it
only when production state must be read or repaired and the pipeline cannot do it: the production
deploy role or its trust is broken, a lock is stuck, or a state version is corrupt. Jason decides
to break glass; an agent never does.

1. With administrator credentials, edit the bucket policy of `westchase-gi-tfstate-use2`: remove
   `DenyProductionStateReadsExceptProductionDeployRole` and, if a write is needed,
   `DenyProductionStateWritesExceptProductionDeployRole`, or add your role's ARN to their
   `ArnNotEquals` list. The change fires the `protected-bucket-policy-changed` alarm, which pages
   the alerts topic.
2. Do the repair. CloudTrail records every object read and write on the state bucket.
3. Restore the policy with `terraform -chdir=infra/bootstrap apply`. `bootstrap/` owns the bucket
   policy, so the apply puts the committed statements back. The alarm fires again.
4. Record who broke glass, when, why, what was read or changed and when the policy was restored,
   with the CloudTrail event IDs of both policy changes, in the security incident records.

### Naming contract

The deploy role policies match these names. An environment root that names things differently
gets access denied.

| Resource | Name |
| --- | --- |
| ECS clusters | `wgi-<env>*` |
| ECS services | any service in a `wgi-<env>*` cluster |
| Task definition families | `wgi-<env>*` |
| Task and execution roles | `wgi-<env>-*` |
| Application log groups | `/wgi/<env>/*` (the `wgi-<env>-data` key may encrypt only these and RDS exports) |
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

`wgi-production-data` and `wgi-production-secrets` are not in `shared/`. The `production/` root
creates them, and only the pipeline applies it, under `wgi-github-deploy-production`. Their key
policy grants the account root no `kms:*`, so no IAM policy, an administrator's included, reaches
a production key on its own; only the principals the key policy names do. The `shared/` keys keep
the root statement, because administrators apply `shared/`. The red-team gate checks the
production key policy (G4) before that root's first apply.

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
  Anyone who can read that state can read it: administrators and all three GitHub roles. The CI
  plan summary redacts it, along with every 12-digit number.
- **Expect IAM Access Analyzer findings** for the three GitHub roles, which trust an external
  identity provider. Jason reviews each and archives it once he agrees it is intended.
- **Bucket names.** The state bucket name is global and fixed in every backend block. To rebuild in
  another account, choose a new name, set `state_bucket_name` in both roots and edit each backend
  block. The audit bucket name includes the account ID and follows automatically.
- **A bucket that will hold patient data** adds a CloudTrail data-event selector for its objects in
  the same pull request that creates it.

## Human steps

Before `shared/` is applied:

1. Create and protect the `aws-production` environment, as in
   [Before the first apply](#before-the-first-apply).

After `shared/` is applied:

2. Click the confirmation link that AWS emails to the alarm address. Until then no alert arrives.
3. At <https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/settings/secrets/actions>,
   add the repository secrets:
   - `TF_PLAN_ROLE_ARN`: `terraform -chdir=infra/shared output -json github_role_arns`, the `plan`
     value.
   - `ALARM_EMAIL`: the same address as `TF_VAR_alarm_email`, so the CI plan matches.

   Then, at <https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/settings/variables/actions>,
   add the repository variable `TF_PLAN_ENABLED` with the value `true`. Role ARNs are secrets, not
   variables, because this repository is public and Actions prints step inputs in its logs; the
   deploy role ARNs follow the same rule.
4. Protect `portal/appointment-workflow-experience` (require pull requests, block force pushes and
   deletion) at <https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/settings/branches>
   before the staging deploy pipeline goes live. Today only `main` is protected.
5. Review the IAM Access Analyzer findings for the GitHub roles and archive the intended ones.

DNS, when the records are ready:

6. Export the zone from Porkbun. A later pull request adds the verified records to Route 53. Then
   swap the four nameservers in Porkbun (Domain Management, westchasegi.com, Authoritative
   Nameservers) to the `route53_name_servers` output.

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
| CloudWatch alarms (5) | $0.50 |
| Route 53 hosted zone | $0.50 |
| VPC flow logs to S3 | about $0.50 |
| S3 (state, audit) | under $1 |
| CloudTrail management events (first trail), IAM Access Analyzer external access, Budgets, SNS email | free |
| **Total** | **about $121 to $131** |

Runtime Monitoring bills per vCPU of the Fargate tasks it watches, averaged over the month, so
an always-on 1 vCPU task adds about $1.50; the endpoint GuardDuty creates for its agent is free.
Production's two keys add $2 when `production/` creates them. Options that would add to this: a
second NAT gateway (about $36.50), Security Hub (about $10 to $30).
