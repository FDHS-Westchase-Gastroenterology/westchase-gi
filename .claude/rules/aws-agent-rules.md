# AWS Agent Toolkit rules (advanced features)

The WGI AWS Organization has advanced features active, so AWS's advanced ruleset below
(`rules/aws-agent-rules.md` in aws/agent-toolkit-for-aws, commit `65dce74`) applies to AWS work in
this repository. AGENTS.md "AWS access" holds the account facts and recovery steps.

Repository decisions that take precedence over the ruleset:

- Infrastructure is Terraform, as INIT-1 decided, not AWS CDK or CloudFormation.
- The `aws-secrets-manager` skill and `asm-exec` are installed once on the development Mac
  (`~/.claude/skills/aws-secrets-manager/`, `asm-exec` on `PATH`). The `aws-core` plugin and its
  `PreToolUse` secret hook are not installed, so the Secret Safety rules below are enforced by the
  agent, not by a hook.

<!-- BEGIN AWS Agent Toolkit rules -->
# AWS Guidance

- Where these AWS rules conflict with the project's own instructions, the
  project's instructions take precedence.
- Prefer the AWS MCP Server for AWS interactions — it provides sandboxed
  execution, observability, and audit logging. If unavailable, use the
  AWS CLI directly.
- Before starting a task, check whether a relevant AWS skill is available.
  Load the skill with `retrieve_skill` and prefer its guidance over
  general knowledge.
- When uncertain about specific AWS details (API parameters, permissions,
  limits, error codes), verify against documentation rather than guessing.
  State uncertainty explicitly if you cannot confirm.
- When creating infrastructure, prefer infrastructure-as-code (AWS CDK or
  CloudFormation) over direct CLI commands.
- When working with infrastructure, follow AWS Well-Architected Framework
  principles.
- Do not use em dashes in AWS resource names or descriptions. Use
  hyphens instead.

## Secret Safety

- MUST load the `aws-secrets-manager` skill first for any secret,
  credential, API key, token, or password task. MUST NOT call
  `secretsmanager get-secret-value` or `batch-get-secret-value`, and MUST
  NOT hit the Secrets Manager Agent daemon directly. MUST use
  `{{resolve:secretsmanager:secret-id:SecretString:json-key}}` with
  `asm-exec` so the secret resolves at runtime without entering context.
<!-- END AWS Agent Toolkit rules -->
