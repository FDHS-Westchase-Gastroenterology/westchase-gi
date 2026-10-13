variable "name" {
  type        = string
  description = "Alias name without the alias/ prefix, for example wgi-audit-logs."

  validation {
    condition     = can(regex("^wgi-[a-z0-9-]+$", var.name))
    error_message = "Key aliases start with wgi- and use lowercase letters, digits and hyphens."
  }
}

variable "description" {
  type        = string
  description = "What the key protects. Shown in the KMS console."
}

variable "via_services" {
  type        = list(string)
  description = "Service endpoints (for example s3.us-east-2.amazonaws.com) through which IAM principals may use the key. Direct calls by IAM principals are denied."

  validation {
    condition     = length(var.via_services) > 0
    error_message = "List at least one service; a key nobody can use through a service has no purpose."
  }
}

variable "policy_documents" {
  type        = list(string)
  description = "Additional key policy statements (JSON policy documents) merged into the key policy, for AWS service principals."
  default     = []
}

variable "deletion_window_in_days" {
  type        = number
  description = "Waiting period before a scheduled deletion takes effect."
  default     = 30

  validation {
    condition     = var.deletion_window_in_days >= 7 && var.deletion_window_in_days <= 30
    error_message = "KMS accepts 7 to 30 days."
  }
}

variable "tags" {
  type        = map(string)
  description = "Tags merged over the provider default tags. Resources that belong to one environment set env, which the account guardrails key on."
  default     = {}
}
