variable "name" {
  type        = string
  description = "Role name."
}

variable "description" {
  type        = string
  description = "What the role is for and which GitHub context may assume it."
}

variable "oidc_provider_arn" {
  type        = string
  description = "ARN of the token.actions.githubusercontent.com OIDC provider."
}

variable "subjects" {
  type        = list(string)
  description = "Exact OIDC subject claims allowed to assume the role, for example repo:OWNER/REPO:environment:production."

  validation {
    condition     = length(var.subjects) > 0 && alltrue([for s in var.subjects : startswith(s, "repo:") && !strcontains(s, "*")])
    error_message = "Subjects must be exact repo: claims without wildcards."
  }
}

variable "denied_actor_ids" {
  type        = list(string)
  description = "GitHub account IDs (the token's actor_id claim) refused a session even when the subject matches, for example Dependabot's."
  default     = []
}

variable "permissions_boundary" {
  type        = string
  description = "ARN of a managed policy that caps the role's permissions, or null for none."
  default     = null
}

variable "policy_json" {
  type        = string
  description = "Inline permissions policy for the role."
}

variable "managed_policy_arns" {
  type        = map(string)
  description = "Customer managed policies to attach, keyed by a static name so plans stay predictable."
  default     = {}
}

variable "tags" {
  type        = map(string)
  description = "Tags merged over the provider default tags. Resources that belong to one environment set env, which the account guardrails key on."
  default     = {}
}
