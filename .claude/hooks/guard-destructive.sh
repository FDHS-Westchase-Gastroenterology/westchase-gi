#!/usr/bin/env bash
# PreToolUse guard for Bash and MCP calls. Asks Jason before anything that destroys
# cloud resources or deletes data, and refuses force-pushes or deletes of main.
# Permission rules in settings.json match command prefixes only; this reads the
# whole command, so chained commands, `git -C dir push`, `terraform -chdir=x destroy`
# and the AWS MCP's scripts are covered too.
#
# Check it:  echo '{"tool_name":"Bash","tool_input":{"command":"terraform destroy"}}' | .claude/hooks/guard-destructive.sh
set -euo pipefail

input=$(cat)
tool=$(jq -r '.tool_name // ""' <<<"$input")
if [[ $tool == Bash ]]; then
  text=$(jq -r '.tool_input.command // ""' <<<"$input")
else
  text="$tool $(jq -c '.tool_input // {}' <<<"$input")"
fi

decide() {
  jq -n --arg decision "$1" --arg reason "$2" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: $decision,
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

has() { grep -Eiq -- "$1" <<<"$text"; }

# Git: force-push, mirror, or branch deletion. Never against main; ask otherwise.
git_push='\bgit([[:space:]]+(-C|-c)[[:space:]]+[^[:space:]]+|[[:space:]]+--[^[:space:]]+)*[[:space:]]+push\b'
rewrite='[[:space:]](--force(-with-lease|-if-includes)?\b|-[a-z]*f[a-z]*\b|--mirror\b|--delete\b|-d\b|\+[^[:space:]]+|:[^[:space:]]+)'
if has "$git_push" && has "$git_push.*$rewrite"; then
  if has "$git_push.*\b(main|master)\b"; then
    decide deny "Force-pushing or deleting main is never done from an agent session. main is protected; open a pull request instead."
  fi
  decide ask "This push rewrites or deletes a remote branch."
fi

# Terraform and OpenTofu: destroy, or removing resources from state.
if has '\b(terraform|tofu|terragrunt)\b.*[[:space:]](-?destroy\b|state[[:space:]]+(rm|push)\b|workspace[[:space:]]+delete\b|force-unlock\b)'; then
  decide ask "Terraform would destroy infrastructure or rewrite its state."
fi

# AWS CLI, and the AWS MCP's call_aws and run_script inputs.
if has '\baws\b.*[[:space:]"](delete-[a-z0-9-]+|terminate-[a-z0-9-]+|deregister-[a-z0-9-]+|close-account|leave-organization|remove-account-from-organization|schedule-key-deletion|purge-queue)\b' \
  || has '\baws[[:space:]]+s3[[:space:]]+(rb|rm)\b' \
  || has '\baws[[:space:]]+s3[[:space:]]+sync\b.*--delete\b' \
  || has '--no-deletion-protection|--skip-final-snapshot|--delete-automated-backups' \
  || has '\.(delete|terminate|deregister)_[a-z0-9_]+\(|DeletionProtection\W+(false|False)\b'; then
  decide ask "This would delete or terminate AWS resources or data."
fi

# Databases: dropping or emptying them.
if has '\b(dropdb|dropuser|pg_dropcluster)\b' \
  || has '\bdrop[[:space:]]+(database|schema|table|role|user)\b' \
  || has '\btruncate[[:space:]]+(table[[:space:]]+)?["a-z_]' \
  || has '\bdelete[[:space:]]+from[[:space:]]+["a-z_.]+[[:space:]]*(;|"|$)'; then
  decide ask "This drops or empties database objects."
fi

# Supabase, Vercel, GitHub: deleting projects, branches, deployments, repos.
if has '\bsupabase\b.*\b(projects|branches|orgs|functions|secrets)[[:space:]]+(delete|unset)\b' \
  || has '\bsupabase\b.*\bdb[[:space:]]+reset\b.*--(linked|db-url)\b' \
  || has '\bvercel\b.*[[:space:]](remove|rm)\b' \
  || has '\bgh\b.*\b(repo|release|environment|secret|variable|ruleset|cache)[[:space:]]+delete\b' \
  || has '\bgh[[:space:]]+api\b.*(-X|--method)[[:space:]]*DELETE\b'; then
  decide ask "This deletes a hosted project, branch, deployment, secret, or repository."
fi

# Any MCP tool whose name says it deletes, drops, resets, or pauses something.
if [[ $tool == mcp__* ]] && grep -Eiq '(delete|destroy|drop|remove|reset|pause|terminate)' <<<"${tool##*__}"; then
  decide ask "This MCP tool deletes, resets, or pauses a resource."
fi

exit 0
