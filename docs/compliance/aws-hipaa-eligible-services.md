# AWS services and HIPAA eligibility

Each AWS service the system uses, what it holds, and whether it appears on AWS's
[HIPAA Eligible Services Reference](https://aws.amazon.com/compliance/hipaa-eligible-services-reference/)
(the version marked "Last Updated: September 3, 2026"). INIT-1 "What done looks like" requires
this list.

AWS states on that page that:

- the listed services may create, receive, process, maintain or transmit ePHI, subject to the
  shared responsibility model, and every feature of a listed service is eligible unless the list
  notes otherwise;
- the customer must still configure each listed service consistently with HIPAA;
- services not on the list may still be used in a HIPAA account, provided they do not process or
  store ePHI.

The AWS BAA itself is described in [AWS HIPAA compliance](https://aws.amazon.com/compliance/hipaa-compliance/).
Eligibility is necessary, not sufficient: the configuration each service needs is in the
[risk analysis](risk-analysis.md#risk-register) and the policies.

## Account and Region

- Every resource is in the `wgi` account, a member of the business associate's AWS Organization,
  which the AWS BAA covers ([vendors.md](vendors.md#vendors)). Production has its own Cognito user
  pool, RDS server and secrets; staging and previews hold fictional data only.
- Every resource that holds or carries ePHI is in **us-east-2**. The Organization's Region policy
  also allows us-east-1, where step 2 runs threat detection and forwards its findings to the alert
  topic in us-east-2, so activity in either Region is seen. It allows us-west-2 for Amazon Bedrock
  only, which the system does not use.

## Services that can hold or carry ePHI

Every one of these is on the list.

| Service, as the list names it | What the system uses it for | ePHI | Step |
| --- | --- | --- | --- |
| Amazon Relational Database Service (Amazon RDS) | The PostgreSQL database, its automated backups and snapshots. The list covers the PostgreSQL engine | Stores all ePHI | 3 |
| Amazon Elastic Container Service (ECS) and AWS Fargate | Runs the Next.js application, and one-off tasks for migrations and the data-lifecycle job. The list covers Fargate under the ECS engine | Processes ePHI in memory | 4 |
| Elastic Load Balancing | The Application Load Balancer that terminates HTTPS for the website, the intake API and the portal | Transmits ePHI | 4 |
| AWS Web Application Firewall (WAF) | Filters requests in front of the load balancer | Inspects requests that carry ePHI | 4 |
| Amazon Virtual Private Cloud (VPC) | Private subnets for the database and tasks, security groups, network ACLs, the NAT gateway, the S3 endpoint and flow logs | Transmits ePHI inside the account | 2 |
| Amazon Simple Storage Service (S3) | Terraform state; the audit bucket for CloudTrail logs and VPC flow logs; the database exports in [contingency-plan.md](policies/contingency-plan.md#exports). Each bucket is encrypted with a customer-managed key, and public access is blocked for the whole account | Stores ePHI in export buckets only | 2; exports in 5 and 6 |
| Amazon CloudWatch Logs | A copy of CloudTrail (step 2), the email sender's logs (step 3) and the application's logs (step 4), encrypted with a customer-managed key | Not by design: logs carry identifiers and codes, never patient fields ([R-09](risk-analysis.md#risk-register)). Treated as able to hold ePHI | 2 to 4 |

## Services that hold no ePHI

These support the system but never receive patient data. The list includes each of them as well,
so a mistake that put ePHI into one would still be inside the BAA.

| Service, as the list names it | What the system uses it for | Step |
| --- | --- | --- |
| AWS Key Management Service (KMS) | Customer-managed keys for the database, backups, logs, secrets, Terraform state and exports. Holds keys, not data | 2 |
| Amazon Cognito | Staff sign-in for the portal, with two-step login; a separate user pool for production. Holds staff identities, not patient data | 3 |
| AWS Lambda | The Cognito custom email sender, which hands sign-in emails to Resend ([vendors.md](vendors.md#vendors)) | 3 |
| AWS Secrets Manager | Database credentials, HMAC secrets, the Resend API key and the GitHub App key, created empty by Terraform | 2 and 3 |
| Amazon Elastic Container Registry (ECR) | The repository for the application's container images. Images hold code and configuration, never data or secret values | 2 (repository) and 4 (images) |
| AWS Certificate Manager | TLS certificates for the load balancer | 4 |
| Amazon Route 53 | The `westchasegi.com` DNS zone and certificate validation records | 2 |
| AWS CloudTrail | A record of every API call in the account, kept in S3 and CloudWatch Logs | 2 |
| Amazon GuardDuty | Threat detection from CloudTrail events, VPC flow logs and DNS queries, with S3 data-event, RDS sign-in and Lambda network protection. Runs in us-east-2 and us-east-1 | 2 |
| Amazon Elastic Block Store (Amazon EBS) | Default encryption is on in us-east-2 and us-east-1, so any volume created later is encrypted. Fargate tasks use no EBS volumes | 2 |
| AWS Config | A record of resource configuration changes | 2 |
| Amazon CloudWatch | Metrics and alarms: error rate, 5xx responses, latency and database health | 2 and 4 |
| Amazon EventBridge | Rules that route security findings and alarms to the alert topic | 2 |
| Amazon Simple Notification Service (SNS) | The alert topic that emails the security official. Alert text names resources and findings, never patient data | 2 |
| AWS Organizations | The Organization that holds the `wgi` account and its Region policy | In place |
| AWS IAM Identity Center | Set up in the Organization through its Identity Center delegated administrator account. Holds workforce identities only; workforce sessions in `wgi` come from `aws login` | In place |

## Services not on the list

None of these processes or stores ePHI, which is the condition AWS sets for using a service that
is not on the list.

| Service | What the system uses it for | Why it holds no ePHI |
| --- | --- | --- |
| AWS Identity and Access Management (IAM), including IAM Access Analyzer | Roles and policies for the application, the pipeline and agents; the GitHub OpenID Connect identity provider; Access Analyzer findings about resources shared outside the account, in us-east-2 and us-east-1 | Holds permissions and identities only |
| AWS Security Token Service (STS) | Short-lived credentials for `aws login` sessions and for GitHub Actions through OpenID Connect | Issues credentials only |
| Amazon EventBridge Scheduler | The data-lifecycle schedule, created disabled (step 4; [R-19](risk-analysis.md#risk-register)). The list names Amazon EventBridge without naming Scheduler separately | The schedule only starts the lifecycle task. The deletion runs inside the database, and the schedule's input carries no patient data |
| AWS Artifact | Accepting the AWS BAA and checking that it is active | Holds agreements only |
| AWS Budgets | A spending alert for the account (step 2) | Holds cost data only |

## Adding a service

Before the system uses another AWS service, the change that introduces it adds a row here. A
service that will hold, process or transmit ePHI must be on the current list, and any exception
the list notes for it must not apply to the way it is used. A service that is not on the list
may be used only if no ePHI reaches it, with the reason recorded in the table above. The security
official checks this file against the current list at each
[periodic evaluation](security-official.md#periodic-evaluation), because AWS adds services and
notes to the list over time.
