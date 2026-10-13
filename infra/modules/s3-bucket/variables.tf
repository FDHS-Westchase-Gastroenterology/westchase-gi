variable "name" {
  type        = string
  description = "Bucket name. With bucket_namespace = account-regional it must end in -<account id>-<region>-an."
}

variable "bucket_namespace" {
  type        = string
  description = "global for a globally unique name, or account-regional to reserve the name in this account's namespace."
  default     = "global"

  validation {
    condition     = contains(["global", "account-regional"], var.bucket_namespace)
    error_message = "Use global or account-regional."
  }
}

variable "kms_key_arn" {
  type        = string
  description = "ARN of the customer managed key used for default encryption."
}

variable "policy_documents" {
  type        = list(string)
  description = "Additional bucket policy statements (JSON policy documents) merged with the transport and encryption guards."
  default     = []
}
