# AWS access for agents

## What exists today

- **Account:** an AWS Organization in the new AWS experience (`FeatureSet: ALL`), with advanced
  features active since 2026-10-06. Jason's management account owns it; AWS added an Identity
  Delegated Admin account for IAM Identity Center. Agents work in the member project "Whimsical
  Whiteboard" (`wgi`, Paid plan, $120 in credits). It is the only account: production, staging
  and previews all run in it (Jason, 2026-10-13), kept apart by separate sign-in pools, database
  servers and secrets. Production's resources will hold patient data.
- **BAA:** the AWS Organizations BAA is active (accepted 2026-10-06 by Jason in Artifact; effective
  start 00:53 UTC on 2026-10-07). It covers the management account and every current and future
  member account, all designated HIPAA accounts, and opts them out of AWS using their content for
  service improvement. The Healthcare and Life Sciences addendum stays unaccepted, because it lets
  AWS de-identify data for service improvement.
- **Region:** us-east-2 for the project. The Organization's Region policy
  (`AdvancedModeRegionRestrictionSecurityControlPolicy`) allows us-east-1 and us-east-2 in full,
  limits us-west-2 to Bedrock (`UsWest2Partitional`), and denies all other Regions (`RegionFloor`).
  Its `UsEast1Partitional` statement was removed on 2026-10-06.
- **Rules:** `.claude/rules/aws-agent-rules.md`, AWS's advanced ruleset (PR #389). It requires the
  `aws-secrets-manager` skill and `asm-exec`, both installed; the `aws-core` secret hook is not.
- **Sign-in:** `aws login` with profile `wgi`. There is no IAM user and there are no access keys.
- **Who gets the profile:** Claude Code sessions receive `AWS_PROFILE=wgi` from
  `~/.claude/settings.json` `env`, and interactive shells from `~/.zshrc`.
- **AWS MCP:** the user-scope `aws-mcp` server runs
  `uvx mcp-proxy-for-aws-cli@1.7.0 … --profile wgi --metadata AWS_REGION=us-east-2`. The endpoint
  is `aws-mcp.us-east-1.api.aws`, because the Agent Toolkit service runs only in us-east-1. It
  acts with the signed-in role.
- **Skills:** 28 AWS Agent Toolkit skills are installed in `~/.claude/skills/` with shared links in
  `~/.agents/skills/`. That is the `aws-core` set plus `rds-oss`, `amazon-ses`, `route53` and
  `creating-secrets-using-best-practices`, plus `aws-secrets-manager` from the toolkit repo's
  `plugins/aws-core/skills/` (not in the CLI catalog; `asm-exec` is linked into `~/.local/bin`).
  Update a catalog skill with
  `aws agent-toolkit add-skill --skill-name <name> --agent claude-code --region us-east-1`; the
  link follows it.

## When credentials expire

Credentials last 12 hours and refresh automatically for up to 90 days. After that, AWS calls fail
with a credentials error. Run:

```bash
aws login --region us-east-2 --profile wgi
```

```bash
aws sts get-caller-identity --profile wgi
```

If AWS MCP calls still fail after that, reconnect the server from `/mcp` or start a new session.

## What Jason does next

1. **Secure the management account:** done 2026-10-06. Root has a password and one passkey MFA
   device (`jason-root-passkey`), and no access keys. Use root only for root-only tasks.
2. **Region for INIT-1:** done 2026-10-06. `UsEast1Partitional` is removed, so INIT-1 keeps
   us-east-1. Probe: `aws ec2 describe-availability-zones --region us-east-1 --profile wgi` lists
   six zones.
3. **BAA:** done 2026-10-06. Probe:
   `aws artifact list-customer-agreements --region us-east-1 --profile wgi` lists the AWS
   Organizations Business Associate Addendum as `ACTIVE`.
4. **Accounts:** cancelled 2026-10-13. No separate production or non-production accounts will be
   created; everything runs in `wgi`. The placeholder `wgi-nonprod`, `wgi-prod-readonly` and
   `wgi-prod` SSO profiles in `~/.aws/config` are dead and can be deleted.
