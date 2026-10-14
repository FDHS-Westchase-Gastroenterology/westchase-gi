# Service control policies for `wgi`

Two SCPs keep production's control plane with production's own roles. Every principal in the `wgi`
account is denied the changes in the SCP table of the hosting-pipeline design (§5, rows L413 to
L425) unless the statement exempts it by role ARN. Each statement's `Sid` names the row it enforces.

Jason creates and attaches them from the management account. No agent calls
`organizations create-policy` or `attach-policy`, and Terraform does not manage them.

## Upload

- The 5,120-character limit counts whitespace when a policy is sent through the CLI or API, so
  upload the minified form: `jq -c . scp-wgi-production-1.json` is 4,459 characters and
  `jq -c . scp-wgi-production-2.json` is 4,993.

  ```sh
  aws organizations create-policy --type SERVICE_CONTROL_POLICY \
    --name wgi-production-1 --description "Production control plane, part 1" \
    --content "$(jq -c . infra/scp/scp-wgi-production-1.json)"
  ```

- They need two of the five SCP slots on `wgi`; FullAWSAccess counts if it is attached there
  directly. `organizations:ListPoliciesForTarget` is denied inside `wgi`, so count from the
  management account.

## Sequencing

1. Attach after the shared root's apply of the apply policies (`shared/apply_policies.tf`) and the
   service-linked roles, so the deploy, plan and break-glass roles and the state-bucket policy are
   in their final form. If a change to a `wgi-github-*-production` or `wgi-breakglass-production`
   policy is still waiting to be applied, attach after it lands.
2. Once attached, an apply of `bootstrap/` or `shared/` fails until a routine-change window is open
   if it touches:
   - the trail, GuardDuty's detector settings, or the Config recorder or delivery channel (L425);
   - the GitHub OIDC provider or the state-bucket policy (L414);
   - `wgi-github-*-production`, `wgi-breakglass-production` or any `wgi-production-*` role (L413).
3. A window follows the design: the change merges, Jason adds
   `arn:aws:iam::*:role/managed/AccountFullAccessRole` to the `ArnNotLike` list of only the
   statements the change hits, an agent applies, Jason reverts, and the change and window are
   recorded. The role sits at path `/managed/`; a pattern without the path does not match it. An
   exemption costs 52 characters in an existing list and 100 in a statement with no condition, and
   SCP 2 has 127 characters of headroom.

## Recovery

SCPs never bind the management account. If an attached SCP blocks something it should not, Jason
detaches or edits it from the management account at any time; no role in `wgi` can prevent that.

## Adding L419

`rds-db:connect` on the production database (L419) is added to SCP 1 once that instance exists.
Replace the placeholder with the production instance's `DbiResourceId`. The statement is about 450
characters minified, which leaves SCP 1 about 210 characters of headroom.

```json
{"Sid":"L419RdsConnect","Effect":"Deny","Action":["rds-db:connect"],"Resource":["arn:aws:rds-db:us-east-2:*:dbuser:<production DbiResourceId>/*"],"Condition":{"ArnNotLike":{"aws:PrincipalArn":["arn:aws:iam::*:role/wgi-production-web-task","arn:aws:iam::*:role/wgi-production-migrate-task","arn:aws:iam::*:role/wgi-production-cutover-task","arn:aws:iam::*:role/wgi-production-retention-task","arn:aws:iam::*:role/wgi-production-reporting-task"]}}}
```
